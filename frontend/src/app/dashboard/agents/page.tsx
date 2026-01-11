'use client';

/**
 * Agent Monitoring Dashboard
 *
 * Real-time monitoring of AI agent sessions from agent-deck.
 * Shows active sessions, progress feed, and statistics.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  agentBridgeApi,
  AgentSession,
  AgentSessionStatus,
  AGENT_STATUS_LABELS,
  AGENT_STATUS_COLORS,
  AGENT_STATUS_ICONS,
  AGENT_TYPE_LABELS,
  PROGRESS_CATEGORY_LABELS,
  PROGRESS_CATEGORY_COLORS,
} from '@/lib/agent-bridge-api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Bot,
  Activity,
  Cpu,
  FileCode,
  GitBranch,
  Clock,
  RefreshCw,
  Trash2,
  Eye,
  Terminal,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function AgentMonitoringPage() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch active sessions (refresh every 5 seconds)
  const { data: activeSessions = [], isLoading: loadingActive } = useQuery({
    queryKey: ['agent-sessions-active'],
    queryFn: () => agentBridgeApi.getActiveSessions(),
    refetchInterval: 5000,
  });

  // Fetch all sessions
  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['agent-sessions', statusFilter],
    queryFn: () =>
      agentBridgeApi.getSessions(
        1,
        50,
        statusFilter !== 'all' ? (statusFilter as AgentSessionStatus) : undefined,
      ),
  });

  // Fetch recent progress (refresh every 3 seconds)
  const { data: recentProgress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['agent-progress-recent'],
    queryFn: () => agentBridgeApi.getRecentProgress(50),
    refetchInterval: 3000,
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['agent-statistics'],
    queryFn: () => agentBridgeApi.getStatistics(),
    refetchInterval: 10000,
  });

  // Fetch session progress when dialog is open
  const { data: sessionProgress = [] } = useQuery({
    queryKey: ['agent-session-progress', selectedSession?.session_id],
    queryFn: () =>
      selectedSession
        ? agentBridgeApi.getSessionProgress(selectedSession.session_id, 100)
        : Promise.resolve([]),
    enabled: !!selectedSession,
    refetchInterval: 3000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => agentBridgeApi.deleteSession(sessionId),
    onSuccess: () => {
      toast.success('Сессия удалена');
      queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['agent-sessions-active'] });
    },
  });

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Нет данных';
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ru,
      });
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: AgentSessionStatus) => {
    switch (status) {
      case AgentSessionStatus.RUNNING:
        return <Loader2 className="h-4 w-4 animate-spin text-green-500" />;
      case AgentSessionStatus.WAITING:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case AgentSessionStatus.IDLE:
        return <Clock className="h-4 w-4 text-gray-400" />;
      case AgentSessionStatus.ERROR:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case AgentSessionStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Terminal className="h-8 w-8 text-green-500" />
            Agent Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Мониторинг AI-агентов из agent-deck в реальном времени
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['agent-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['agent-progress-recent'] });
            queryClient.invalidateQueries({ queryKey: ['agent-statistics'] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Активных</p>
                <p className="text-3xl font-bold text-green-600">
                  {statistics?.active_sessions || 0}
                </p>
              </div>
              <Zap className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего сессий</p>
                <p className="text-3xl font-bold">
                  {statistics?.total_sessions || 0}
                </p>
              </div>
              <Bot className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Сообщений</p>
                <p className="text-3xl font-bold">
                  {statistics?.total_progress_entries || 0}
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Файлов сегодня</p>
                <p className="text-3xl font-bold text-orange-600">
                  {statistics?.files_changed_today || 0}
                </p>
              </div>
              <FileCode className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Предложений</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {statistics?.proposals_today || 0}
                </p>
              </div>
              <GitBranch className="h-8 w-8 text-indigo-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Active Sessions */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Активные сессии
            </CardTitle>
            <CardDescription>
              Агенты, работающие прямо сейчас
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActive ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Нет активных агентов</p>
                <p className="text-xs mt-1">
                  Запустите agent-deck с VHM24 MCP
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedSession(session);
                      setShowSessionDialog(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(session.status)}
                        <span className="font-medium">{session.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {AGENT_TYPE_LABELS[session.agent_type]}
                      </Badge>
                    </div>
                    {session.current_task && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {session.current_task}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{session.messages_count} сообщ.</span>
                      <span>&bull;</span>
                      <span>{formatTime(session.last_activity_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Feed */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Лента активности
            </CardTitle>
            <CardDescription>
              Последние действия агентов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {loadingProgress ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : recentProgress.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Нет активности</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {recentProgress.map((progress) => (
                    <div
                      key={progress.id}
                      className="flex gap-3 p-2 rounded-lg hover:bg-muted/30"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {progress.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : progress.status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Cpu className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${PROGRESS_CATEGORY_COLORS[progress.category]}`}
                          >
                            {PROGRESS_CATEGORY_LABELS[progress.category]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(progress.created_at)}
                          </span>
                        </div>
                        <p className="text-sm mt-1 text-foreground">
                          {progress.message}
                        </p>
                        {progress.files_changed.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {progress.files_changed.slice(0, 3).map((file, i) => (
                              <code key={i} className="text-xs bg-muted px-1 rounded">
                                {file.split('/').pop()}
                              </code>
                            ))}
                            {progress.files_changed.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{progress.files_changed.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* All Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Все сессии</CardTitle>
              <CardDescription>
                История всех агентских сессий
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.values(AgentSessionStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {AGENT_STATUS_ICONS[status]} {AGENT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !sessionsData?.sessions.length ? (
            <div className="text-center text-muted-foreground py-8">
              <Terminal className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Нет сессий</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessionsData.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(session.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.name}</span>
                        <code className="text-xs bg-muted px-1 rounded">
                          {session.session_id}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{AGENT_TYPE_LABELS[session.agent_type]}</span>
                        <span>&bull;</span>
                        <span>{session.messages_count} сообщ.</span>
                        <span>&bull;</span>
                        <span>{session.files_changed_count} файлов</span>
                        {session.working_directory && (
                          <>
                            <span>&bull;</span>
                            <code>{session.working_directory}</code>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${AGENT_STATUS_COLORS[session.status]} text-white`}
                    >
                      {AGENT_STATUS_LABELS[session.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(session.last_activity_at)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedSession(session);
                        setShowSessionDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(session.session_id)}
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

      {/* Session Detail Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSession && getStatusIcon(selectedSession.status)}
              {selectedSession?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedSession && (
                <>
                  {AGENT_TYPE_LABELS[selectedSession.agent_type]} &bull;{' '}
                  {selectedSession.session_id}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <>
              {/* Session Info */}
              <div className="grid grid-cols-4 gap-4 py-4">
                <div>
                  <p className="text-xs text-muted-foreground">Сообщений</p>
                  <p className="font-bold">{selectedSession.messages_count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Файлов</p>
                  <p className="font-bold">{selectedSession.files_changed_count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Предложений</p>
                  <p className="font-bold">{selectedSession.proposals_count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Последняя активность</p>
                  <p className="font-bold text-sm">
                    {formatTime(selectedSession.last_activity_at)}
                  </p>
                </div>
              </div>

              {/* MCPs */}
              {selectedSession.attached_mcps.length > 0 && (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground mb-2">Подключенные MCP:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSession.attached_mcps.map((mcp, i) => (
                      <Badge key={i} variant="outline">
                        {mcp}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Progress History */}
              <div className="flex-1 overflow-hidden">
                <h4 className="font-medium mb-2">История активности</h4>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {sessionProgress.map((progress) => (
                      <div
                        key={progress.id}
                        className="p-2 border rounded text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${PROGRESS_CATEGORY_COLORS[progress.category]}`}
                          >
                            {PROGRESS_CATEGORY_LABELS[progress.category]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(progress.created_at)}
                          </span>
                        </div>
                        <p className="mt-1">{progress.message}</p>
                        {progress.files_changed.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Файлы: {progress.files_changed.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
