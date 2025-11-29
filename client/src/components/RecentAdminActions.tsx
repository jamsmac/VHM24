import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export function RecentAdminActions() {
  const { data: auditLogs, isLoading } = trpc.auditLogs.list.useQuery({});
  const { data: allRequests } = trpc.accessRequests.list.useQuery();

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "только что";
    if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ч назад`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} дн назад`;
  };

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Последние действия администраторов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentLogs = auditLogs?.slice(0, 5) || [];

  if (recentLogs.length === 0) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Последние действия администраторов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Нет записей</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Последние действия администраторов</CardTitle>
        <Link href="/access-requests">
          <a className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            Все записи
            <ArrowRight className="w-3 h-3" />
          </a>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentLogs.map((log) => {
            const request = allRequests?.find(r => r.id === log.accessRequestId);
            const userName = request?.firstName || request?.username || "Неизвестно";
            
            return (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    log.action === "approved" 
                      ? "bg-green-500/20" 
                      : "bg-red-500/20"
                  }`}>
                    {log.action === "approved" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white truncate">
                        {log.performedByName}
                      </p>
                      <Badge
                        variant={log.action === "approved" ? "default" : "destructive"}
                        className={`text-xs ${
                          log.action === "approved"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {log.action === "approved" ? "Одобрил" : "Отклонил"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Заявку от {userName}
                      {log.assignedRole && log.action === "approved" && (
                        <span className="ml-1">
                          • {log.assignedRole === "operator" ? "Оператор" : log.assignedRole === "manager" ? "Менеджер" : "Администратор"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(log.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
