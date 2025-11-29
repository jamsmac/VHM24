import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

/**
 * Parsed command from voice message
 */
export interface VoiceCommand {
  intent: 'tasks' | 'machines' | 'stats' | 'help' | 'start_task' | 'complete_task' | 'unknown';
  confidence: number;
  parameters?: {
    taskId?: string;
    machineNumber?: string;
    taskNumber?: string;
    [key: string]: string | undefined;
  };
  originalText: string;
}

/**
 * Service for handling voice messages in Telegram bot
 *
 * Uses OpenAI Whisper API for speech-to-text transcription
 * Supports Russian, English, and Uzbek languages
 */
@Injectable()
export class TelegramVoiceService {
  private readonly logger = new Logger(TelegramVoiceService.name);
  private openai: OpenAI | null = null;
  // Use /tmp directory which has proper permissions in containerized environments
  private readonly tempDir =
    process.env.NODE_ENV === 'production'
      ? '/tmp/voice'
      : path.join(process.cwd(), 'temp', 'voice');
  private tempDirAvailable = false;

  constructor() {
    this.initializeOpenAI();
    this.ensureTempDir();
  }

  /**
   * Initialize OpenAI client
   */
  private initializeOpenAI(): void {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not configured. Voice transcription will be disabled. ' +
          'Add OPENAI_API_KEY to .env to enable voice support.',
      );
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey,
      });
      this.logger.log('OpenAI Whisper API initialized for voice transcription');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI client', error);
    }
  }

  /**
   * Ensure temp directory exists for voice file storage
   */
  private ensureTempDir(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        this.logger.log(`Created temp directory for voice files: ${this.tempDir}`);
      }
      this.tempDirAvailable = true;
    } catch (error) {
      this.logger.warn(
        `Failed to create temp directory for voice files: ${this.tempDir}. ` +
          `Voice transcription will be disabled. Error: ${error.message}`,
      );
      this.tempDirAvailable = false;
    }
  }

  /**
   * Check if voice transcription is available
   */
  isAvailable(): boolean {
    return this.openai !== null && this.tempDirAvailable;
  }

  /**
   * Transcribe voice message to text using OpenAI Whisper
   *
   * @param audioBuffer - Voice message audio data (OGG format from Telegram)
   * @param language - Language code (ru, en, uz)
   * @returns Transcribed text
   */
  async transcribeVoice(audioBuffer: Buffer, language: string = 'ru'): Promise<string> {
    if (!this.openai) {
      throw new Error('Voice transcription not available. OPENAI_API_KEY not configured.');
    }

    if (!this.tempDirAvailable) {
      throw new Error('Voice transcription not available. Temporary directory not accessible.');
    }

    let tempFilePath: string | null = null;

    try {
      // Save buffer to temporary file (Whisper API requires a file)
      tempFilePath = path.join(this.tempDir, `voice_${Date.now()}.ogg`);
      await writeFileAsync(tempFilePath, audioBuffer);

      this.logger.debug(`Transcribing voice file: ${tempFilePath} (language: ${language})`);

      // Call Whisper API
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: language === 'uz' ? 'ru' : language, // Whisper doesn't have Uzbek, use Russian
        response_format: 'text',
      });

      const text = transcription.toString().trim();

      this.logger.log(`Voice transcribed successfully: "${text.substring(0, 50)}..."`);

      return text;
    } catch (error) {
      this.logger.error('Failed to transcribe voice message', error);
      throw new Error('Не удалось распознать голосовое сообщение');
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          await unlinkAsync(tempFilePath);
        } catch (err) {
          this.logger.warn(`Failed to delete temp file: ${tempFilePath}`, err);
        }
      }
    }
  }

  /**
   * Parse command intent from transcribed text using NLP
   *
   * Supports natural language commands in Russian:
   * - "покажи мои задачи" -> tasks
   * - "покажи аппараты" -> machines
   * - "статистика" -> stats
   * - "начать задачу номер 3" -> start_task
   * - "завершить задачу" -> complete_task
   *
   * @param text - Transcribed text from voice
   * @returns Parsed command with intent and parameters
   */
  parseCommand(text: string): VoiceCommand {
    const lowerText = text.toLowerCase().trim();

    // Task list commands
    if (this.matchesKeywords(lowerText, ['задач', 'task', 'список задач', 'мои задачи'])) {
      return {
        intent: 'tasks',
        confidence: 0.9,
        originalText: text,
      };
    }

    // Machine list commands
    if (
      this.matchesKeywords(lowerText, ['аппарат', 'machine', 'покажи аппараты', 'список аппаратов'])
    ) {
      return {
        intent: 'machines',
        confidence: 0.9,
        originalText: text,
      };
    }

    // Statistics commands
    if (this.matchesKeywords(lowerText, ['статистик', 'статс', 'stats', 'показатели'])) {
      return {
        intent: 'stats',
        confidence: 0.9,
        originalText: text,
      };
    }

    // Help commands
    if (this.matchesKeywords(lowerText, ['помощ', 'справк', 'help', 'что ты умеешь'])) {
      return {
        intent: 'help',
        confidence: 0.95,
        originalText: text,
      };
    }

    // Start task commands
    if (this.matchesKeywords(lowerText, ['начать', 'start', 'запустить задачу', 'приступить'])) {
      // Try to extract task number or ID
      const taskNumberMatch = lowerText.match(/номер\s*(\d+)|задач[уа]\s*(\d+)|task\s*(\d+)/);
      const taskNumber = taskNumberMatch
        ? taskNumberMatch[1] || taskNumberMatch[2] || taskNumberMatch[3]
        : undefined;

      return {
        intent: 'start_task',
        confidence: 0.85,
        parameters: taskNumber ? { taskNumber } : undefined,
        originalText: text,
      };
    }

    // Complete task commands
    if (this.matchesKeywords(lowerText, ['завершить', 'complete', 'закончить задачу', 'finish'])) {
      return {
        intent: 'complete_task',
        confidence: 0.85,
        originalText: text,
      };
    }

    // Unknown command
    return {
      intent: 'unknown',
      confidence: 0.0,
      originalText: text,
    };
  }

  /**
   * Check if text matches any of the keywords (with partial matching)
   */
  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }

  /**
   * Generate user-friendly response for voice command
   *
   * @param command - Parsed voice command
   * @param language - User's language preference
   * @returns Response message
   */
  getVoiceCommandResponse(command: VoiceCommand, language: 'ru' | 'en' = 'ru'): string {
    if (language === 'ru') {
      switch (command.intent) {
        case 'tasks':
          return '✅ Показываю ваши задачи...';
        case 'machines':
          return '✅ Показываю список аппаратов...';
        case 'stats':
          return '✅ Загружаю статистику...';
        case 'help':
          return '✅ Показываю справку...';
        case 'start_task':
          if (command.parameters?.taskNumber) {
            return `✅ Начинаю задачу номер ${command.parameters.taskNumber}...`;
          }
          return '✅ Показываю ваши задачи. Выберите задачу для начала...';
        case 'complete_task':
          return '✅ Для завершения задачи используйте кнопку "Завершить" в списке задач';
        default:
          return (
            '🤔 Не понял команду. Попробуйте:\n\n' +
            '• "Покажи мои задачи"\n' +
            '• "Покажи аппараты"\n' +
            '• "Статистика"\n' +
            '• "Помощь"'
          );
      }
    } else {
      switch (command.intent) {
        case 'tasks':
          return '✅ Showing your tasks...';
        case 'machines':
          return '✅ Showing machines...';
        case 'stats':
          return '✅ Loading statistics...';
        case 'help':
          return '✅ Showing help...';
        case 'start_task':
          if (command.parameters?.taskNumber) {
            return `✅ Starting task #${command.parameters.taskNumber}...`;
          }
          return '✅ Showing your tasks. Choose a task to start...';
        case 'complete_task':
          return '✅ To complete a task, use the "Complete" button in task list';
        default:
          return (
            '🤔 Command not recognized. Try:\n\n' +
            '• "Show my tasks"\n' +
            '• "Show machines"\n' +
            '• "Statistics"\n' +
            '• "Help"'
          );
      }
    }
  }

  /**
   * Clean up old voice files (should be called periodically)
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return;
      }

      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await unlinkAsync(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old voice files`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up voice files', error);
    }
  }
}
