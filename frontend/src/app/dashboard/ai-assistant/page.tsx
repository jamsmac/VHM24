'use client';

/**
 * AI Integration Assistant Page
 *
 * Dashboard for AI-powered integration and documentation generation.
 * Features:
 * - Chat interface for code assistance
 * - API documentation analysis
 * - Module generation
 * - Code fix suggestions
 * - Proposal management with approval workflow
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  aiAssistantApi,
  IntegrationProposal,
  IntegrationProposalStatus,
  AiChatResponse,
  PROPOSAL_TYPE_LABELS,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_COLORS,
  PROPOSAL_TYPE_ICONS,
} from '@/lib/ai-assistant-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Send,
  Bot,
  User,
  FileCode,
  FolderPlus,
  FileText,
  Link,
  Wrench,
  Check,
  X,
  Trash2,
  Eye,
  Loader2,
  Sparkles,
  Copy,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeSuggestions?: Array<{
    language: string;
    code: string;
    description: string;
  }>;
  proposalId?: string;
}

export default function AiAssistantPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<IntegrationProposal | null>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form states
  const [apiUrl, setApiUrl] = useState('');
  const [apiName, setApiName] = useState('');
  const [apiContext, setApiContext] = useState('');
  const [docPath, setDocPath] = useState('src/modules/');
  const [moduleName, setModuleName] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [fixFilePath, setFixFilePath] = useState('');
  const [fixIssue, setFixIssue] = useState('');

  // Fetch proposals
  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['ai-proposals'],
    queryFn: () => aiAssistantApi.getProposals(),
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      aiAssistantApi.chat({
        message,
        conversation_id: conversationId || undefined,
      }),
    onSuccess: (data: AiChatResponse) => {
      setConversationId(data.conversation_id);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          codeSuggestions: data.code_suggestions,
          proposalId: data.proposal_id,
        },
      ]);
    },
    onError: () => {
      toast.error('Ошибка при отправке сообщения');
    },
  });

  // API Analysis mutation
  const analyzeApiMutation = useMutation({
    mutationFn: () =>
      aiAssistantApi.analyzeApi({
        documentation_url: apiUrl,
        api_name: apiName || undefined,
        context: apiContext || undefined,
      }),
    onSuccess: (data) => {
      toast.success('API проанализирован успешно');
      setSelectedProposal(data);
      setShowProposalDialog(true);
      queryClient.invalidateQueries({ queryKey: ['ai-proposals'] });
      setApiUrl('');
      setApiName('');
      setApiContext('');
    },
    onError: () => {
      toast.error('Ошибка при анализе API');
    },
  });

  // Documentation generation mutation
  const generateDocsMutation = useMutation({
    mutationFn: () =>
      aiAssistantApi.generateDocumentation({
        target_path: docPath,
        format: 'markdown',
        include_examples: true,
      }),
    onSuccess: (data) => {
      toast.success('Документация сгенерирована');
      setSelectedProposal(data);
      setShowProposalDialog(true);
      queryClient.invalidateQueries({ queryKey: ['ai-proposals'] });
    },
    onError: () => {
      toast.error('Ошибка при генерации документации');
    },
  });

  // Module generation mutation
  const generateModuleMutation = useMutation({
    mutationFn: () =>
      aiAssistantApi.generateModule({
        module_name: moduleName,
        description: moduleDescription,
        include_crud: true,
      }),
    onSuccess: (data) => {
      toast.success('Модуль сгенерирован');
      setSelectedProposal(data);
      setShowProposalDialog(true);
      queryClient.invalidateQueries({ queryKey: ['ai-proposals'] });
      setModuleName('');
      setModuleDescription('');
    },
    onError: () => {
      toast.error('Ошибка при генерации модуля');
    },
  });

  // Code fix mutation
  const fixCodeMutation = useMutation({
    mutationFn: () =>
      aiAssistantApi.fixCode({
        file_path: fixFilePath,
        issue_description: fixIssue,
      }),
    onSuccess: (data) => {
      toast.success('Исправление предложено');
      setSelectedProposal(data);
      setShowProposalDialog(true);
      queryClient.invalidateQueries({ queryKey: ['ai-proposals'] });
      setFixFilePath('');
      setFixIssue('');
    },
    onError: () => {
      toast.error('Ошибка при анализе кода');
    },
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      aiAssistantApi.reviewProposal(id, { decision }),
    onSuccess: (data) => {
      if (data.status === IntegrationProposalStatus.IMPLEMENTED) {
        toast.success('Изменения успешно применены!');
      } else if (data.status === IntegrationProposalStatus.REJECTED) {
        toast.info('Предложение отклонено');
      }
      queryClient.invalidateQueries({ queryKey: ['ai-proposals'] });
      setShowProposalDialog(false);
    },
    onError: () => {
      toast.error('Ошибка при обработке предложения');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiAssistantApi.deleteProposal(id),
    onSuccess: () => {
      toast.success('Предложение удалено');
      queryClient.invalidateQueries({ queryKey: ['ai-proposals'] });
    },
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: chatInput, timestamp: new Date() },
    ]);
    chatMutation.mutate(chatInput);
    setChatInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано в буфер обмена');
  };

  const pendingProposals = proposals.filter(
    (p) => p.status === IntegrationProposalStatus.PENDING,
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            AI Ассистент
          </h1>
          <p className="text-muted-foreground mt-1">
            Интеллектуальное создание интеграций и документации
          </p>
        </div>
        {pendingProposals.length > 0 && (
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {pendingProposals.length} ожидают подтверждения
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Чат
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Документация
          </TabsTrigger>
          <TabsTrigger value="module" className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4" />
            Модуль
          </TabsTrigger>
          <TabsTrigger value="proposals" className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            Предложения
            {pendingProposals.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingProposals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Помощник
              </CardTitle>
              <CardDescription>
                Задавайте вопросы о коде, просите создать функции или исправить ошибки
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Начните диалог с AI ассистентом</p>
                      <p className="text-sm mt-2">
                        Примеры: &quot;Создай сервис для отправки email&quot;, &quot;Как добавить новое поле в Machine?&quot;
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-purple-600" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.codeSuggestions?.map((code, j) => (
                          <div key={j} className="mt-3">
                            <div className="flex items-center justify-between bg-gray-800 text-white px-3 py-1 rounded-t text-sm">
                              <span>{code.language}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(code.code)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <pre className="bg-gray-900 text-green-400 p-3 rounded-b overflow-x-auto text-sm">
                              <code>{code.code}</code>
                            </pre>
                          </div>
                        ))}
                        {msg.proposalId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              const proposal = proposals.find(
                                (p) => p.id === msg.proposalId,
                              );
                              if (proposal) {
                                setSelectedProposal(proposal);
                                setShowProposalDialog(true);
                              }
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Просмотреть предложение
                          </Button>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <Separator className="my-4" />
              <div className="flex gap-2">
                <Textarea
                  placeholder="Введите сообщение... (Enter для отправки)"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="min-h-[60px]"
                  disabled={chatMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || chatMutation.isPending}
                  size="lg"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Analysis Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Анализ внешнего API
              </CardTitle>
              <CardDescription>
                Укажите URL документации API (OpenAPI/Swagger или HTML) для автоматического
                создания интеграции
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL документации *</label>
                <Input
                  placeholder="https://api.example.com/openapi.json"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Название API</label>
                  <Input
                    placeholder="Payment Gateway"
                    value={apiName}
                    onChange={(e) => setApiName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Контекст использования</label>
                  <Input
                    placeholder="Для обработки платежей..."
                    value={apiContext}
                    onChange={(e) => setApiContext(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={() => analyzeApiMutation.mutate()}
                disabled={!apiUrl || analyzeApiMutation.isPending}
                className="w-full"
              >
                {analyzeApiMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Анализирую API...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Проанализировать и создать интеграцию
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Генерация документации
              </CardTitle>
              <CardDescription>
                Автоматическое создание документации для существующего кода
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Путь к модулю/файлу *</label>
                <Input
                  placeholder="src/modules/machines"
                  value={docPath}
                  onChange={(e) => setDocPath(e.target.value)}
                />
              </div>
              <Button
                onClick={() => generateDocsMutation.mutate()}
                disabled={!docPath || generateDocsMutation.isPending}
                className="w-full"
              >
                {generateDocsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Генерирую документацию...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Сгенерировать документацию
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Исправление кода
              </CardTitle>
              <CardDescription>
                AI проанализирует код и предложит исправление
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Путь к файлу *</label>
                <Input
                  placeholder="src/modules/tasks/tasks.service.ts"
                  value={fixFilePath}
                  onChange={(e) => setFixFilePath(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Описание проблемы *</label>
                <Textarea
                  placeholder="TypeError: Cannot read property 'x' of undefined..."
                  value={fixIssue}
                  onChange={(e) => setFixIssue(e.target.value)}
                />
              </div>
              <Button
                onClick={() => fixCodeMutation.mutate()}
                disabled={!fixFilePath || !fixIssue || fixCodeMutation.isPending}
                className="w-full"
              >
                {fixCodeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Анализирую код...
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 mr-2" />
                    Предложить исправление
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Generation Tab */}
        <TabsContent value="module" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5" />
                Генерация нового модуля
              </CardTitle>
              <CardDescription>
                Создание полного NestJS модуля с entity, service, controller и тестами
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Название модуля *</label>
                <Input
                  placeholder="notifications, reports, analytics..."
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Описание функциональности *</label>
                <Textarea
                  placeholder="Система push-уведомлений с поддержкой FCM и WebPush. Должна включать шаблоны сообщений, планирование отправки и аналитику доставки..."
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <Button
                onClick={() => generateModuleMutation.mutate()}
                disabled={!moduleName || !moduleDescription || generateModuleMutation.isPending}
                className="w-full"
              >
                {generateModuleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Генерирую модуль...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Сгенерировать модуль
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Предложения от AI</CardTitle>
              <CardDescription>
                Управление сгенерированными интеграциями и кодом
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProposals ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет предложений</p>
                  <p className="text-sm mt-2">
                    Используйте другие вкладки для создания интеграций
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedProposal(proposal);
                        setShowProposalDialog(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {PROPOSAL_TYPE_ICONS[proposal.type]}
                        </span>
                        <div>
                          <div className="font-medium">{proposal.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {PROPOSAL_TYPE_LABELS[proposal.type]} &bull;{' '}
                            {proposal.proposed_files.length} файлов
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={PROPOSAL_STATUS_COLORS[proposal.status]}>
                          {PROPOSAL_STATUS_LABELS[proposal.status]}
                        </Badge>
                        {proposal.confidence_score && (
                          <Badge variant="outline">
                            {Math.round(proposal.confidence_score * 100)}%
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(proposal.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Proposal Detail Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProposal && (
                <>
                  <span className="text-2xl">
                    {PROPOSAL_TYPE_ICONS[selectedProposal.type]}
                  </span>
                  {selectedProposal.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedProposal?.description}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {selectedProposal && (
              <div className="space-y-4">
                {/* AI Reasoning */}
                {selectedProposal.ai_reasoning && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="font-medium mb-2 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Пояснение от AI
                    </div>
                    <p className="text-sm">{selectedProposal.ai_reasoning}</p>
                  </div>
                )}

                {/* Discovered Endpoints */}
                {selectedProposal.discovered_endpoints.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">
                      Обнаруженные эндпоинты ({selectedProposal.discovered_endpoints.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedProposal.discovered_endpoints.slice(0, 5).map((ep, i) => (
                        <div
                          key={i}
                          className="text-sm p-2 bg-muted rounded flex items-center gap-2"
                        >
                          <Badge variant="outline">{ep.method}</Badge>
                          <code>{ep.path}</code>
                          <span className="text-muted-foreground">- {ep.description}</span>
                        </div>
                      ))}
                      {selectedProposal.discovered_endpoints.length > 5 && (
                        <p className="text-sm text-muted-foreground">
                          ... и еще {selectedProposal.discovered_endpoints.length - 5} эндпоинтов
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Proposed Files */}
                <div>
                  <h4 className="font-medium mb-2">
                    Предлагаемые файлы ({selectedProposal.proposed_files.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedProposal.proposed_files.map((file, i) => (
                      <div key={i} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                file.action === 'create'
                                  ? 'default'
                                  : file.action === 'modify'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {file.action}
                            </Badge>
                            <code className="text-sm">{file.path}</code>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(file.content)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <pre className="p-3 bg-gray-900 text-green-400 overflow-x-auto text-xs max-h-[200px]">
                          <code>{file.content}</code>
                        </pre>
                        <div className="px-3 py-2 text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800">
                          {file.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generated Documentation */}
                {selectedProposal.generated_documentation && (
                  <div>
                    <h4 className="font-medium mb-2">Сгенерированная документация</h4>
                    <div className="prose dark:prose-invert max-w-none p-4 bg-muted rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">
                        {selectedProposal.generated_documentation}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="mt-4">
            {selectedProposal?.status === IntegrationProposalStatus.PENDING && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    reviewMutation.mutate({
                      id: selectedProposal.id,
                      decision: 'reject',
                    })
                  }
                  disabled={reviewMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Отклонить
                </Button>
                <Button
                  onClick={() =>
                    reviewMutation.mutate({
                      id: selectedProposal.id,
                      decision: 'approve',
                    })
                  }
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Применить изменения
                </Button>
              </>
            )}
            {selectedProposal?.status !== IntegrationProposalStatus.PENDING && (
              <Button variant="outline" onClick={() => setShowProposalDialog(false)}>
                Закрыть
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
