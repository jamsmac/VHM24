import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, User, Calendar, Search, ChevronDown, MessageSquare, History, Download } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";

function RoleChangesTab() {
  const { data: roleChanges } = trpc.roleChanges.list.useQuery();
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  const getRoleName = (role: string) => {
    switch (role) {
      case "operator": return "Оператор";
      case "manager": return "Менеджер";
      case "admin": return "Администратор";
      case "user": return "Пользователь";
      default: return role;
    }
  };
  
  if (!roleChanges || roleChanges.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Нет изменений ролей</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {roleChanges.map((change) => (
        <div key={change.id} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-white">
                  {change.userName || `User #${change.userId}`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                  {getRoleName(change.oldRole)}
                </Badge>
                <span className="text-slate-400">→</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  {getRoleName(change.newRole)}
                </Badge>
              </div>
              {change.reason && (
                <div className="mt-2 text-sm text-slate-400">
                  <span className="font-medium">Причина:</span> {change.reason}
                </div>
              )}
              <div className="mt-2 text-xs text-slate-500">
                Изменено: {change.changedByName || `Admin #${change.changedBy}`} • {formatDate(change.createdAt)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditLogList() {
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [selectedPreset, setSelectedPreset] = useState<string>("all");
  const [actionType, setActionType] = useState<"approved" | "rejected" | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const { data: auditLogs } = trpc.auditLogs.list.useQuery({
    ...dateRange,
    actionType: actionType === "all" ? undefined : actionType,
  });
  const { data: allRequests } = trpc.accessRequests.list.useQuery();
  
  // Client-side search filtering
  const filteredLogs = auditLogs?.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const request = allRequests?.find(r => r.id === log.accessRequestId);
    const userName = (request?.firstName || request?.username || "").toLowerCase();
    const adminName = (log.performedByName || "").toLowerCase();
    return userName.includes(query) || adminName.includes(query);
  }) || [];
  
  // Calculate statistics
  const stats = {
    approved: filteredLogs.filter(log => log.action === "approved").length,
    rejected: filteredLogs.filter(log => log.action === "rejected").length,
    total: filteredLogs.length,
  };
  
  // CSV export function
  const exportToCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error("Нет данных для экспорта");
      return;
    }
    
    const headers = ["Дата", "Администратор", "Действие", "Пользователь", "Роль"];
    const rows = filteredLogs.map(log => {
      const request = allRequests?.find(r => r.id === log.accessRequestId);
      const userName = request?.firstName || request?.username || "Неизвестно";
      const action = log.action === "approved" ? "Одобрено" : "Отклонено";
      const role = log.assignedRole ? 
        (log.assignedRole === "operator" ? "Оператор" : 
         log.assignedRole === "manager" ? "Менеджер" : "Администратор") : "-";
      const date = new Date(log.createdAt).toLocaleString("ru-RU");
      return [date, log.performedByName, action, userName, role];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Экспортировано ${filteredLogs.length} записей`);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const now = new Date();
    
    switch (preset) {
      case "today":
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        setDateRange({ 
          startDate: todayStart.toISOString(), 
          endDate: new Date().toISOString() 
        });
        break;
      case "7days":
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
        setDateRange({ 
          startDate: sevenDaysAgo.toISOString(), 
          endDate: new Date().toISOString() 
        });
        break;
      case "30days":
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        setDateRange({ 
          startDate: thirtyDaysAgo.toISOString(), 
          endDate: new Date().toISOString() 
        });
        break;
      case "all":
      default:
        setDateRange({});
        break;
    }
  };

  if (!filteredLogs || filteredLogs.length === 0) {
    return (
      <>
        <div className="space-y-3 mb-4">
          <div className="flex flex-wrap gap-2">
          {["all", "today", "7days", "30days"].map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant={selectedPreset === preset ? "default" : "outline"}
              onClick={() => handlePresetChange(preset)}
              className={selectedPreset === preset ? "bg-primary" : "bg-slate-800/50 border-slate-700 hover:bg-slate-700"}
            >
              {preset === "all" && "Все время"}
              {preset === "today" && "Сегодня"}
              {preset === "7days" && "7 дней"}
              {preset === "30days" && "30 дней"}
            </Button>
          ))}
          <DateRangePicker 
            onRangeChange={setDateRange}
            onPresetChange={setSelectedPreset}
            selectedPreset={selectedPreset}
          />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Тип действия:</span>
            <Select value={actionType} onValueChange={(value: any) => setActionType(value)}>
              <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-white">Все действия</SelectItem>
                <SelectItem value="approved" className="text-white">Одобренные</SelectItem>
                <SelectItem value="rejected" className="text-white">Отклоненные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-center py-8 text-slate-400">
          <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Нет записей в журнале</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {["all", "today", "7days", "30days"].map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant={selectedPreset === preset ? "default" : "outline"}
              onClick={() => handlePresetChange(preset)}
              className={selectedPreset === preset ? "bg-primary" : "bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-white"}
            >
              {preset === "all" && "Все время"}
              {preset === "today" && "Сегодня"}
              {preset === "7days" && "7 дней"}
              {preset === "30days" && "30 дней"}
            </Button>
          ))}
          <DateRangePicker 
            onRangeChange={setDateRange}
            onPresetChange={setSelectedPreset}
            selectedPreset={selectedPreset}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Тип действия:</span>
          <Select value={actionType} onValueChange={(value: any) => setActionType(value)}>
            <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">Все действия</SelectItem>
              <SelectItem value="approved" className="text-white">Одобренные</SelectItem>
              <SelectItem value="rejected" className="text-white">Отклоненные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-4">
        {/* Statistics and Export */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">{stats.approved}</span>
              <span className="text-xs text-slate-400">одобрено</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <X className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">{stats.rejected}</span>
              <span className="text-xs text-slate-400">отклонено</span>
            </div>
            <div className="text-sm text-slate-400">
              Всего: {stats.total}
            </div>
          </div>
          <Button
            onClick={exportToCSV}
            size="sm"
            variant="outline"
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Экспорт CSV
          </Button>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по имени администратора или пользователя..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
      
      <div className="grid gap-4">
      {filteredLogs.slice(0, 10).map((log) => {
        const request = allRequests?.find(r => r.id === log.accessRequestId);
        return (
          <div key={log.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
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
                <div className="text-sm text-slate-300">
                  <span className="font-medium">{log.performedByName}</span>
                  {" "}
                  {log.action === "approved" ? "одобрил(а)" : "отклонил(а)"} заявку
                  {" "}
                  {request && (
                    <span className="text-slate-400">
                      от {request.firstName || request.username || "Неизвестно"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(log.createdAt)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </>
  );
}

export default function AccessRequests() {
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [roleOverrides, setRoleOverrides] = useState<Map<number, string>>(new Map());
  const [bulkRole, setBulkRole] = useState<string>("operator");
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesText, setNotesText] = useState<string>("");

  const { data: allRequests, refetch } = trpc.accessRequests.list.useQuery();
  const { data: pendingRequests } = trpc.accessRequests.pending.useQuery();

  // Filter requests based on search query
  const filterRequests = (requests: typeof allRequests) => {
    if (!requests) return [];
    if (!searchQuery.trim()) return requests;

    const query = searchQuery.toLowerCase();
    return requests.filter((request) => {
      const name = (request.firstName || request.username || "").toLowerCase();
      const username = (request.username || "").toLowerCase();
      const telegramId = request.telegramId.toString();
      
      return (
        name.includes(query) ||
        username.includes(query) ||
        telegramId.includes(query)
      );
    });
  };

  const filteredAllRequests = filterRequests(allRequests);
  const filteredPendingRequests = filterRequests(pendingRequests);

  const updateNotesMutation = trpc.accessRequests.updateNotes.useMutation({
    onSuccess: () => {
      toast.success("Заметка сохранена");
      refetch();
      setEditingNotes(null);
      setNotesText("");
    },
    onError: () => {
      toast.error("Ошибка при сохранении заметки");
    },
  });

  const approveMutation = trpc.accessRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Заявка одобрена", {
        description: "Пользователь получил уведомление в Telegram",
      });
      refetch();
      setSelectedRequest(null);
      setAction(null);
    },
    onError: (error) => {
      toast.error("Ошибка при одобрении", {
        description: error.message,
      });
    },
  });

  const rejectMutation = trpc.accessRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Заявка отклонена", {
        description: "Пользователь получил уведомление в Telegram",
      });
      refetch();
      setSelectedRequest(null);
      setAction(null);
    },
    onError: (error) => {
      toast.error("Ошибка при отклонении", {
        description: error.message,
      });
    },
  });

  const handleApprove = (id: number) => {
    setSelectedRequest(id);
    setAction("approve");
  };

  const handleReject = (id: number) => {
    setSelectedRequest(id);
    setAction("reject");
  };

  const confirmAction = () => {
    if (!selectedRequest) return;

    // TODO: Get actual user ID from auth context
    const approvedBy = 1;

    if (action === "approve") {
      // Use role override if set, otherwise use requested role
      const role = roleOverrides.get(selectedRequest);
      approveMutation.mutate({ id: selectedRequest, approvedBy, role });
    } else if (action === "reject") {
      rejectMutation.mutate({ id: selectedRequest, approvedBy });
    }
  };

  const handleRoleChange = (requestId: number, newRole: string) => {
    const newOverrides = new Map(roleOverrides);
    newOverrides.set(requestId, newRole);
    setRoleOverrides(newOverrides);
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRequests(newSelected);
  };

  const toggleSelectAll = (requests: typeof allRequests) => {
    if (!requests) return;
    const allIds = requests.map(r => r.id);
    const allSelected = allIds.every(id => selectedRequests.has(id));
    
    if (allSelected) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(allIds));
    }
  };

  const handleBulkApprove = () => {
    // Apply bulk role to all selected requests
    const newOverrides = new Map(roleOverrides);
    selectedRequests.forEach(id => {
      newOverrides.set(id, bulkRole);
    });
    setRoleOverrides(newOverrides);
    setBulkAction("approve");
  };

  const handleBulkReject = () => {
    setBulkAction("reject");
  };

  const confirmBulkAction = async () => {
    if (selectedRequests.size === 0 || !bulkAction) return;

    const approvedBy = 1; // TODO: Get actual user ID from auth context
    const promises = Array.from(selectedRequests).map(id => {
      if (bulkAction === "approve") {
        return approveMutation.mutateAsync({ id, approvedBy });
      } else {
        return rejectMutation.mutateAsync({ id, approvedBy });
      }
    });

    try {
      await Promise.all(promises);
      toast.success(
        bulkAction === "approve" ? "Заявки одобрены" : "Заявки отклонены",
        { description: `Обработано заявок: ${selectedRequests.size}` }
      );
      setSelectedRequests(new Set());
      setBulkAction(null);
      refetch();
    } catch (error) {
      toast.error("Ошибка при обработке заявок");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            На рассмотрении
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <Check className="w-3 h-3 mr-1" />
            Одобрена
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            <X className="w-3 h-3 mr-1" />
            Отклонена
          </Badge>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "operator":
        return <Badge variant="secondary">Оператор</Badge>;
      case "manager":
        return <Badge variant="default">Менеджер</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="mb-2">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Access Requests</h1>
          <p className="text-slate-600 text-sm">Manage access requests from Telegram bot</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Всего заявок</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{allRequests?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-400">На рассмотрении</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-300">{pendingRequests?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-400">Одобрено</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-300">
                {allRequests?.filter((r) => r.status === "approved").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Список заявок</CardTitle>
            <CardDescription className="text-slate-400">
              Просмотр и управление заявками на доступ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar and Bulk Actions */}
            <div className="mb-6 flex gap-4 items-center">
              <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по имени, username или Telegram ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              </div>
              
              {selectedRequests.size > 0 && (
                <div className="flex gap-3 items-center">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                    Выбрано: {selectedRequests.size}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Роль:</span>
                    <Select value={bulkRole} onValueChange={setBulkRole}>
                      <SelectTrigger className="w-[140px] h-9 bg-slate-800/50 border-slate-700 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="operator" className="text-white hover:bg-slate-700">
                          Оператор
                        </SelectItem>
                        <SelectItem value="manager" className="text-white hover:bg-slate-700">
                          Менеджер
                        </SelectItem>
                        <SelectItem value="admin" className="text-white hover:bg-slate-700">
                          Администратор
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                    onClick={handleBulkApprove}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Одобрить все
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                    onClick={handleBulkReject}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Отклонить все
                  </Button>
                </div>
              )}
            </div>

            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
                <TabsTrigger value="pending">На рассмотрении</TabsTrigger>
                <TabsTrigger value="approved">Одобренные</TabsTrigger>
                <TabsTrigger value="all">Все</TabsTrigger>
                <TabsTrigger value="roleChanges">История ролей</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-6">
                {!filteredPendingRequests || filteredPendingRequests.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Нет заявок на рассмотрении</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400 w-12">
                          <Checkbox
                            checked={filteredPendingRequests.length > 0 && filteredPendingRequests.every(r => selectedRequests.has(r.id))}
                            onCheckedChange={() => toggleSelectAll(filteredPendingRequests)}
                          />
                        </TableHead>
                        <TableHead className="text-slate-400">Пользователь</TableHead>
                        <TableHead className="text-slate-400">Telegram ID</TableHead>
                        <TableHead className="text-slate-400">Роль</TableHead>
                        <TableHead className="text-slate-400">Дата подачи</TableHead>
                        <TableHead className="text-slate-400">Заметки</TableHead>
                        <TableHead className="text-slate-400">Статус</TableHead>
                        <TableHead className="text-slate-400 text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPendingRequests.map((request) => (
                        <TableRow key={request.id} className="border-slate-800">
                          <TableCell>
                            <Checkbox
                              checked={selectedRequests.has(request.id)}
                              onCheckedChange={() => toggleSelection(request.id)}
                            />
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <div>
                                <div className="font-medium">
                                  {request.firstName || request.username || "Неизвестно"}
                                </div>
                                {request.username && (
                                  <div className="text-xs text-slate-400">@{request.username}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300 font-mono text-sm">
                            {request.telegramId}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={roleOverrides.get(request.id) || request.requestedRole}
                              onValueChange={(value) => handleRoleChange(request.id, value)}
                            >
                              <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="operator" className="text-white hover:bg-slate-700">
                                  Оператор
                                </SelectItem>
                                <SelectItem value="manager" className="text-white hover:bg-slate-700">
                                  Менеджер
                                </SelectItem>
                                <SelectItem value="admin" className="text-white hover:bg-slate-700">
                                  Администратор
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(request.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {editingNotes === request.id ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={notesText}
                                  onChange={(e) => setNotesText(e.target.value)}
                                  className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded text-white text-sm w-full"
                                  placeholder="Введите заметку..."
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    updateNotesMutation.mutate({ id: request.id, notes: notesText });
                                  }}
                                  className="text-green-400 hover:text-green-300"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingNotes(null);
                                    setNotesText("");
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white transition-colors"
                                onClick={() => {
                                  setEditingNotes(request.id);
                                  setNotesText(request.adminNotes || "");
                                }}
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span className="text-sm">
                                  {request.adminNotes || "Добавить заметку"}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                                onClick={() => handleApprove(request.id)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Одобрить
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                onClick={() => handleReject(request.id)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Отклонить
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="approved" className="mt-6">
                {!filteredAllRequests || filteredAllRequests.filter((r) => r.status === "approved").length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Нет одобренных заявок</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400">Пользователь</TableHead>
                        <TableHead className="text-slate-400">Telegram ID</TableHead>
                        <TableHead className="text-slate-400">Роль</TableHead>
                        <TableHead className="text-slate-400">Дата подачи</TableHead>
                        <TableHead className="text-slate-400">Дата одобрения</TableHead>
                        <TableHead className="text-slate-400">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAllRequests
                        .filter((r) => r.status === "approved")
                        .map((request) => (
                          <TableRow key={request.id} className="border-slate-800">
                            <TableCell className="text-white">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <div>
                                  <div className="font-medium">
                                    {request.firstName || request.username || "Неизвестно"}
                                  </div>
                                  {request.username && (
                                    <div className="text-xs text-slate-400">@{request.username}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300 font-mono text-sm">
                              {request.telegramId}
                            </TableCell>
                            <TableCell>
                            <Select
                              value={roleOverrides.get(request.id) || request.requestedRole}
                              onValueChange={(value) => handleRoleChange(request.id, value)}
                            >
                              <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="operator" className="text-white hover:bg-slate-700">
                                  Оператор
                                </SelectItem>
                                <SelectItem value="manager" className="text-white hover:bg-slate-700">
                                  Менеджер
                                </SelectItem>
                                <SelectItem value="admin" className="text-white hover:bg-slate-700">
                                  Администратор
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                            <TableCell className="text-slate-400">{formatDate(request.createdAt)}</TableCell>
                            <TableCell className="text-slate-400">
                              {request.approvedAt ? formatDate(request.approvedAt) : "—"}
                            </TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="all" className="mt-6">
                {!filteredAllRequests || filteredAllRequests.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Нет заявок</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400 w-12">
                          <Checkbox
                            checked={filteredAllRequests.length > 0 && filteredAllRequests.every(r => selectedRequests.has(r.id))}
                            onCheckedChange={() => toggleSelectAll(filteredAllRequests)}
                          />
                        </TableHead>
                        <TableHead className="text-slate-400">Пользователь</TableHead>
                        <TableHead className="text-slate-400">Telegram ID</TableHead>
                        <TableHead className="text-slate-400">Роль</TableHead>
                        <TableHead className="text-slate-400">Дата подачи</TableHead>
                        <TableHead className="text-slate-400">Заметки</TableHead>
                        <TableHead className="text-slate-400">Статус</TableHead>
                        <TableHead className="text-slate-400 text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAllRequests.map((request) => (
                        <TableRow key={request.id} className="border-slate-800">
                          <TableCell>
                            <Checkbox
                              checked={selectedRequests.has(request.id)}
                              onCheckedChange={() => toggleSelection(request.id)}
                            />
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <div>
                                <div className="font-medium">
                                  {request.firstName || request.username || "Неизвестно"}
                                </div>
                                {request.username && (
                                  <div className="text-xs text-slate-400">@{request.username}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300 font-mono text-sm">
                            {request.telegramId}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={roleOverrides.get(request.id) || request.requestedRole}
                              onValueChange={(value) => handleRoleChange(request.id, value)}
                            >
                              <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="operator" className="text-white hover:bg-slate-700">
                                  Оператор
                                </SelectItem>
                                <SelectItem value="manager" className="text-white hover:bg-slate-700">
                                  Менеджер
                                </SelectItem>
                                <SelectItem value="admin" className="text-white hover:bg-slate-700">
                                  Администратор
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-slate-400">{formatDate(request.createdAt)}</TableCell>
                          <TableCell>
                            {editingNotes === request.id ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={notesText}
                                  onChange={(e) => setNotesText(e.target.value)}
                                  className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded text-white text-sm w-full"
                                  placeholder="Введите заметку..."
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    updateNotesMutation.mutate({ id: request.id, notes: notesText });
                                  }}
                                  className="text-green-400 hover:text-green-300"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingNotes(null);
                                    setNotesText("");
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white transition-colors"
                                onClick={() => {
                                  setEditingNotes(request.id);
                                  setNotesText(request.adminNotes || "");
                                }}
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span className="text-sm">
                                  {request.adminNotes || "Добавить заметку"}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            {request.status === "pending" && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                                  onClick={() => handleApprove(request.id)}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Одобрить
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                  onClick={() => handleReject(request.id)}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Отклонить
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
              
              <TabsContent value="roleChanges" className="mt-6">
                <RoleChangesTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        {/* Audit Log Section */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5" />
              Журнал аудита
            </CardTitle>
            <CardDescription className="text-slate-400">
              История всех одобрений и отклонений заявок
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogList />
          </CardContent>
        </Card>

      {/* Single Request Confirmation Dialog */}
      <AlertDialog open={action !== null} onOpenChange={() => setAction(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {action === "approve" ? "Одобрить заявку?" : "Отклонить заявку?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {action === "approve"
                ? "Пользователь получит уведомление в Telegram и сможет войти в систему."
                : "Пользователь получит уведомление об отклонении заявки."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {action === "approve" ? "Одобрить" : "Отклонить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={bulkAction !== null} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {bulkAction === "approve" 
                ? `Одобрить ${selectedRequests.size} заявок?` 
                : `Отклонить ${selectedRequests.size} заявок?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {bulkAction === "approve"
                ? "Все выбранные пользователи получат уведомления в Telegram и смогут войти в систему."
                : "Все выбранные пользователи получат уведомления об отклонении заявок."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAction}
              className={
                bulkAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {bulkAction === "approve" ? "Одобрить все" : "Отклонить все"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Layout>
  );
}
