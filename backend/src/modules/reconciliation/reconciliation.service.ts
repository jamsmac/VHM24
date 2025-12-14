import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ReconciliationRun,
  ReconciliationStatus,
  ReconciliationSource,
  ReconciliationSummary,
} from './entities/reconciliation-run.entity';
import {
  ReconciliationMismatch,
  MismatchType,
  SourceData,
} from './entities/reconciliation-mismatch.entity';
import { CreateReconciliationRunDto, ResolveMismatchDto } from './dto';

/**
 * Интерфейс записи для сопоставления.
 */
interface MatchRecord {
  orderNumber: string | null;
  machineCode: string | null;
  time: Date;
  amount: number;
  paymentMethod: string | null;
  transactionId: string | null;
  source: ReconciliationSource;
  additionalData?: Record<string, any>;
}

/**
 * Результат сопоставления.
 */
interface MatchResult {
  orderNumber: string | null;
  machineCode: string | null;
  orderTime: Date | null;
  amount: number | null;
  paymentMethod: string | null;
  matchScore: number;
  sourcesData: Record<ReconciliationSource, SourceData>;
  mismatchType: MismatchType | null;
  discrepancyAmount: number | null;
  description: string | null;
}

/**
 * Сервис сверки платежей.
 *
 * Реализует алгоритм сопоставления записей из разных источников
 * по времени и сумме с настраиваемыми допусками.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(ReconciliationRun)
    private readonly runRepository: Repository<ReconciliationRun>,
    @InjectRepository(ReconciliationMismatch)
    private readonly mismatchRepository: Repository<ReconciliationMismatch>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Создать и запустить сверку.
   *
   * @param userId - ID пользователя
   * @param dto - Параметры сверки
   * @returns Созданный прогон сверки
   */
  async createAndRun(userId: string, dto: CreateReconciliationRunDto): Promise<ReconciliationRun> {
    // Создаём запись о прогоне
    const run = this.runRepository.create({
      status: ReconciliationStatus.PENDING,
      date_from: new Date(dto.date_from),
      date_to: new Date(dto.date_to),
      sources: dto.sources,
      machine_ids: dto.machine_ids || null,
      time_tolerance: dto.time_tolerance ?? 5,
      amount_tolerance: dto.amount_tolerance ?? 100,
      created_by_user_id: userId,
    });

    const savedRun = await this.runRepository.save(run);

    // Запускаем обработку асинхронно
    this.processReconciliation(savedRun.id).catch((error) => {
      this.logger.error(`Reconciliation ${savedRun.id} failed: ${error.message}`, error.stack);
    });

    return savedRun;
  }

  /**
   * Обработка сверки.
   */
  private async processReconciliation(runId: string): Promise<void> {
    const startTime = Date.now();

    try {
      await this.runRepository.update(runId, {
        status: ReconciliationStatus.PROCESSING,
        started_at: new Date(),
      });

      const run = await this.findOne(runId);

      // Загружаем данные из всех источников
      const recordsBySource = await this.loadSourceData(run);

      // Выполняем сопоставление
      const results = this.performMatching(recordsBySource, run);

      // Сохраняем несовпадения
      await this.saveMismatches(runId, results.mismatches);

      // Вычисляем сводку
      const summary = this.calculateSummary(results);

      // Обновляем статус
      await this.runRepository.update(runId, {
        status: ReconciliationStatus.COMPLETED,
        completed_at: new Date(),
        processing_time_ms: Date.now() - startTime,
        summary,
      });
    } catch (error) {
      await this.runRepository.update(runId, {
        status: ReconciliationStatus.FAILED,
        completed_at: new Date(),
        processing_time_ms: Date.now() - startTime,
        error_message: error.message,
      });
      throw error;
    }
  }

  /**
   * Загрузка данных из источников.
   *
   * В реальной реализации здесь будут запросы к соответствующим таблицам.
   * Сейчас возвращается пустой результат - требуется интеграция с данными.
   */
  private async loadSourceData(
    run: ReconciliationRun,
  ): Promise<Map<ReconciliationSource, MatchRecord[]>> {
    const result = new Map<ReconciliationSource, MatchRecord[]>();

    for (const source of run.sources) {
      const records = await this.loadFromSource(
        source,
        run.date_from,
        run.date_to,
        run.machine_ids,
      );
      result.set(source, records);
    }

    return result;
  }

  /**
   * Загрузка данных из конкретного источника.
   * Требуется реализация для каждого источника.
   */
  private async loadFromSource(
    source: ReconciliationSource,
    _dateFrom: Date,
    _dateTo: Date,
    _machineIds: string[] | null,
  ): Promise<MatchRecord[]> {
    // TODO: Интеграция с реальными источниками данных
    // - HW: Импорт из Excel (hw_reports таблица)
    // - SALES_REPORT: Таблица transactions
    // - FISCAL: Фискальные чеки
    // - PAYME/CLICK/UZUM: Данные платёжных систем

    switch (source) {
      case ReconciliationSource.SALES_REPORT:
        // Пример: загрузка из transactions
        // return await this.loadFromTransactions(dateFrom, dateTo, machineIds);
        break;
      case ReconciliationSource.HW:
        // Загрузка из hw_reports
        break;
      case ReconciliationSource.FISCAL:
        // Загрузка фискальных данных
        break;
      default:
        break;
    }

    return [];
  }

  /**
   * Алгоритм сопоставления записей.
   *
   * Использует временное окно и допуск по сумме для поиска соответствий.
   * Вычисляет score качества сопоставления (0-6).
   */
  private performMatching(
    recordsBySource: Map<ReconciliationSource, MatchRecord[]>,
    run: ReconciliationRun,
  ): {
    matched: MatchResult[];
    mismatches: MatchResult[];
  } {
    const sources = run.sources;
    const timeTolerance = run.time_tolerance * 1000; // в миллисекундах
    const amountTolerance = run.amount_tolerance;

    // Берём первый источник как основу для сравнения
    const primarySource = sources[0];
    const primaryRecords = recordsBySource.get(primarySource) || [];
    const otherSources = sources.slice(1);

    const matched: MatchResult[] = [];
    const mismatches: MatchResult[] = [];

    // Индексы использованных записей из других источников
    const usedIndices = new Map<ReconciliationSource, Set<number>>();
    for (const source of otherSources) {
      usedIndices.set(source, new Set());
    }

    for (const primaryRecord of primaryRecords) {
      const sourcesData: Record<ReconciliationSource, SourceData> = {} as any;
      let totalScore = 0;
      let allSourcesFound = true;

      // Данные из основного источника
      sourcesData[primarySource] = {
        found: true,
        amount: primaryRecord.amount,
        time: primaryRecord.time,
        transactionId: primaryRecord.transactionId,
        additionalData: primaryRecord.additionalData || null,
      };

      // Ищем соответствия в других источниках
      for (const source of otherSources) {
        const records = recordsBySource.get(source) || [];
        const used = usedIndices.get(source)!;

        let bestMatch: { index: number; record: MatchRecord; score: number } | null = null;

        for (let i = 0; i < records.length; i++) {
          if (used.has(i)) continue;

          const record = records[i];
          const score = this.calculateMatchScore(
            primaryRecord,
            record,
            timeTolerance,
            amountTolerance,
          );

          if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { index: i, record, score };
          }
        }

        if (bestMatch) {
          used.add(bestMatch.index);
          totalScore += bestMatch.score;
          sourcesData[source] = {
            found: true,
            amount: bestMatch.record.amount,
            time: bestMatch.record.time,
            transactionId: bestMatch.record.transactionId,
            additionalData: bestMatch.record.additionalData || null,
          };
        } else {
          allSourcesFound = false;
          sourcesData[source] = {
            found: false,
            amount: null,
            time: null,
            transactionId: null,
            additionalData: null,
          };
        }
      }

      // Нормализуем score
      const normalizedScore = Math.min(6, Math.round(((totalScore / otherSources.length) * 6) / 3));

      const result: MatchResult = {
        orderNumber: primaryRecord.orderNumber,
        machineCode: primaryRecord.machineCode,
        orderTime: primaryRecord.time,
        amount: primaryRecord.amount,
        paymentMethod: primaryRecord.paymentMethod,
        matchScore: normalizedScore,
        sourcesData,
        mismatchType: null,
        discrepancyAmount: null,
        description: null,
      };

      // Определяем тип несовпадения
      if (!allSourcesFound) {
        result.mismatchType = MismatchType.ORDER_NOT_FOUND;
        result.description = this.buildMismatchDescription(sourcesData, sources);
        mismatches.push(result);
      } else if (normalizedScore < 4) {
        // Проверяем характер несовпадения
        const amounts = Object.values(sourcesData)
          .map((s) => s.amount)
          .filter((a) => a !== null);
        const minAmount = Math.min(...amounts);
        const maxAmount = Math.max(...amounts);
        result.discrepancyAmount = maxAmount - minAmount;

        if (result.discrepancyAmount > amountTolerance) {
          result.mismatchType = MismatchType.AMOUNT_MISMATCH;
          result.description = `Расхождение сумм: ${result.discrepancyAmount} сум`;
        } else {
          result.mismatchType = MismatchType.TIME_MISMATCH;
          result.description = 'Несовпадение по времени';
        }
        mismatches.push(result);
      } else {
        matched.push(result);
      }
    }

    // Проверяем записи из других источников, которые не были сопоставлены
    for (const source of otherSources) {
      const records = recordsBySource.get(source) || [];
      const used = usedIndices.get(source)!;

      for (let i = 0; i < records.length; i++) {
        if (used.has(i)) continue;

        const record = records[i];
        const sourcesData: Record<ReconciliationSource, SourceData> = {} as any;

        // Отмечаем что в основном источнике не найдено
        sourcesData[primarySource] = {
          found: false,
          amount: null,
          time: null,
          transactionId: null,
          additionalData: null,
        };

        sourcesData[source] = {
          found: true,
          amount: record.amount,
          time: record.time,
          transactionId: record.transactionId,
          additionalData: record.additionalData || null,
        };

        mismatches.push({
          orderNumber: record.orderNumber,
          machineCode: record.machineCode,
          orderTime: record.time,
          amount: record.amount,
          paymentMethod: record.paymentMethod,
          matchScore: 0,
          sourcesData,
          mismatchType: MismatchType.PAYMENT_NOT_FOUND,
          discrepancyAmount: record.amount,
          description: `Запись из ${source} не найдена в ${primarySource}`,
        });
      }
    }

    return { matched, mismatches };
  }

  /**
   * Вычисление score сопоставления (0-3 для пары записей).
   */
  private calculateMatchScore(
    record1: MatchRecord,
    record2: MatchRecord,
    timeTolerance: number,
    amountTolerance: number,
  ): number {
    let score = 0;

    // Проверка времени
    const timeDiff = Math.abs(record1.time.getTime() - record2.time.getTime());
    if (timeDiff <= timeTolerance) {
      score += 1;
    } else if (timeDiff <= timeTolerance * 2) {
      score += 0.5;
    } else {
      return 0; // Слишком большая разница во времени
    }

    // Проверка суммы
    const amountDiff = Math.abs(record1.amount - record2.amount);
    if (amountDiff === 0) {
      score += 1;
    } else if (amountDiff <= amountTolerance) {
      score += 0.5;
    } else {
      return 0; // Слишком большая разница в сумме
    }

    // Проверка автомата
    if (record1.machineCode && record2.machineCode && record1.machineCode === record2.machineCode) {
      score += 1;
    }

    return score;
  }

  /**
   * Формирование описания несовпадения.
   */
  private buildMismatchDescription(
    sourcesData: Record<ReconciliationSource, SourceData>,
    sources: ReconciliationSource[],
  ): string {
    const found = sources.filter((s) => sourcesData[s]?.found);
    const notFound = sources.filter((s) => !sourcesData[s]?.found);

    return `Найдено в: ${found.join(', ')}. Не найдено в: ${notFound.join(', ')}`;
  }

  /**
   * Сохранение несовпадений в БД.
   */
  private async saveMismatches(runId: string, mismatches: MatchResult[]): Promise<void> {
    const entities = mismatches.map((m) =>
      this.mismatchRepository.create({
        run_id: runId,
        order_number: m.orderNumber,
        machine_code: m.machineCode,
        order_time: m.orderTime,
        amount: m.amount,
        payment_method: m.paymentMethod,
        mismatch_type: m.mismatchType!,
        match_score: m.matchScore,
        discrepancy_amount: m.discrepancyAmount,
        sources_data: m.sourcesData,
        description: m.description,
      }),
    );

    if (entities.length > 0) {
      await this.mismatchRepository.save(entities);
    }
  }

  /**
   * Вычисление сводки результатов.
   */
  private calculateSummary(results: {
    matched: MatchResult[];
    mismatches: MatchResult[];
  }): ReconciliationSummary {
    const all = [...results.matched, ...results.mismatches];
    const totalOrders = all.length;
    const matchedOrders = results.matched.length;
    const unmatchedOrders = results.mismatches.length;

    // Распределение по score
    const scoreDistribution = {
      '6': 0,
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0,
      '0': 0,
    };

    for (const r of all) {
      const key = r.matchScore.toString() as keyof typeof scoreDistribution;
      if (key in scoreDistribution) {
        scoreDistribution[key]++;
      }
    }

    // Суммы
    const totalRevenue = all.reduce((sum, r) => sum + (r.amount || 0), 0);
    const matchedRevenue = results.matched.reduce((sum, r) => sum + (r.amount || 0), 0);
    const discrepancyAmount = results.mismatches.reduce(
      (sum, r) => sum + Math.abs(r.discrepancyAmount || 0),
      0,
    );

    return {
      totalOrders,
      matchedOrders,
      unmatchedOrders,
      matchRate: totalOrders > 0 ? (matchedOrders / totalOrders) * 100 : 0,
      scoreDistribution,
      totalRevenue,
      matchedRevenue,
      discrepancyAmount,
      bySource: {},
      byMachine: [],
    };
  }

  /**
   * Получить все прогоны сверки.
   */
  async findAll(options?: {
    status?: ReconciliationStatus;
    date_from?: Date;
    date_to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ReconciliationRun[]; total: number }> {
    const query = this.runRepository
      .createQueryBuilder('run')
      .leftJoinAndSelect('run.created_by', 'created_by');

    if (options?.status) {
      query.andWhere('run.status = :status', { status: options.status });
    }

    if (options?.date_from && options?.date_to) {
      query.andWhere('run.created_at BETWEEN :from AND :to', {
        from: options.date_from,
        to: options.date_to,
      });
    }

    query.orderBy('run.created_at', 'DESC');

    const total = await query.getCount();

    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.offset(options.offset);
    }

    const items = await query.getMany();

    return { items, total };
  }

  /**
   * Получить прогон сверки по ID.
   */
  async findOne(id: string): Promise<ReconciliationRun> {
    const run = await this.runRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (!run) {
      throw new NotFoundException(`Прогон сверки с ID ${id} не найден`);
    }

    return run;
  }

  /**
   * Получить несовпадения прогона.
   */
  async getMismatches(
    runId: string,
    options?: {
      mismatch_type?: MismatchType;
      is_resolved?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: ReconciliationMismatch[]; total: number }> {
    // Проверяем существование прогона
    await this.findOne(runId);

    const query = this.mismatchRepository
      .createQueryBuilder('mismatch')
      .where('mismatch.run_id = :runId', { runId });

    if (options?.mismatch_type) {
      query.andWhere('mismatch.mismatch_type = :type', {
        type: options.mismatch_type,
      });
    }

    if (options?.is_resolved !== undefined) {
      query.andWhere('mismatch.is_resolved = :resolved', {
        resolved: options.is_resolved,
      });
    }

    query.orderBy('mismatch.order_time', 'DESC');

    const total = await query.getCount();

    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.offset(options.offset);
    }

    const items = await query.getMany();

    return { items, total };
  }

  /**
   * Разрешить несовпадение.
   */
  async resolveMismatch(
    mismatchId: string,
    userId: string,
    dto: ResolveMismatchDto,
  ): Promise<ReconciliationMismatch> {
    const mismatch = await this.mismatchRepository.findOne({
      where: { id: mismatchId },
    });

    if (!mismatch) {
      throw new NotFoundException(`Несовпадение с ID ${mismatchId} не найдено`);
    }

    if (mismatch.is_resolved) {
      throw new BadRequestException('Несовпадение уже разрешено');
    }

    await this.mismatchRepository.update(mismatchId, {
      is_resolved: true,
      resolved_at: new Date(),
      resolved_by_user_id: userId,
      resolution_notes: dto.resolution_notes,
    });

    const updated = await this.mismatchRepository.findOne({
      where: { id: mismatchId },
    });

    if (!updated) {
      throw new NotFoundException(`Несовпадение с ID ${mismatchId} не найдено`);
    }

    return updated;
  }

  /**
   * Отменить прогон сверки.
   */
  async cancel(id: string): Promise<ReconciliationRun> {
    const run = await this.findOne(id);

    if (run.status === ReconciliationStatus.COMPLETED) {
      throw new BadRequestException('Невозможно отменить завершённую сверку');
    }

    await this.runRepository.update(id, {
      status: ReconciliationStatus.CANCELLED,
      completed_at: new Date(),
    });

    return await this.findOne(id);
  }

  /**
   * Удалить прогон сверки.
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.runRepository.softDelete(id);
  }
}
