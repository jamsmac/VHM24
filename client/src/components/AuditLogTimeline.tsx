import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, User } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface AuditLogTimelineProps {
  requestId: number;
}

export function AuditLogTimeline({ requestId }: AuditLogTimelineProps) {
  const { data: auditLogs, isLoading } = trpc.auditLogs.byRequestId.useQuery({ requestId });

  if (isLoading) {
    return (
      <Card className="bg-slate-900/40 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            История действий
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <Card className="bg-slate-900/40 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            История действий
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Нет записей в истории</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/40 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          История действий
        </CardTitle>
        <CardDescription className="text-slate-400">
          Журнал одобрений и отклонений
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {auditLogs.map((log, index) => (
            <div
              key={log.id}
              className="relative pl-8 pb-4 border-l-2 border-slate-700/50 last:border-l-0 last:pb-0"
            >
              {/* Timeline dot */}
              <div className="absolute -left-[9px] top-0">
                {log.action === "approved" ? (
                  <div className="w-4 h-4 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                    <XCircle className="w-2.5 h-2.5 text-red-500" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={log.action === "approved" ? "default" : "destructive"}
                    className={
                      log.action === "approved"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    }
                  >
                    {log.action === "approved" ? "Одобрено" : "Отклонено"}
                  </Badge>
                  {log.assignedRole && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                      {log.assignedRole === "operator"
                        ? "Оператор"
                        : log.assignedRole === "manager"
                        ? "Менеджер"
                        : "Администратор"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <User className="w-4 h-4" />
                  <span>{log.performedByName || "Неизвестно"}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {format(new Date(log.createdAt), "dd MMMM yyyy, HH:mm", { locale: ru })}
                  </span>
                </div>

                {log.notes && (
                  <div className="mt-2 p-3 bg-slate-800/50 rounded-md border border-slate-700/30">
                    <p className="text-sm text-slate-300">{log.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
