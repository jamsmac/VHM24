import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Shield, Edit } from "lucide-react";
import { toast } from "sonner";

export default function Users() {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: users, refetch } = trpc.system.users.useQuery();
  
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Роль пользователя обновлена");
      refetch();
      setIsDialogOpen(false);
      setSelectedUser(null);
      setNewRole("");
      setReason("");
    },
    onError: (error) => {
      toast.error("Ошибка при обновлении роли", {
        description: error.message,
      });
    },
  });

  const handleEditRole = (userId: number, currentRole: string) => {
    setSelectedUser(userId);
    setNewRole(currentRole);
    setIsDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!selectedUser) return;
    
    updateRoleMutation.mutate({
      userId: selectedUser,
      newRole: newRole as any,
      reason: reason || undefined,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Администратор</Badge>;
      case "manager":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Менеджер</Badge>;
      case "operator":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Оператор</Badge>;
      default:
        return <Badge variant="outline">Пользователь</Badge>;
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

  const selectedUserData = users?.find((u: any) => u.id === selectedUser);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
      <div className="container max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Управление пользователями</h1>
          <p className="text-slate-400">Управление ролями и правами доступа</p>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Список пользователей
            </CardTitle>
            <CardDescription className="text-slate-400">
              Просмотр и изменение ролей пользователей
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!users || users.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Нет пользователей</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Пользователь</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Роль</TableHead>
                    <TableHead className="text-slate-400">Последний вход</TableHead>
                    <TableHead className="text-slate-400 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id} className="border-slate-800">
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="font-medium">{user.name || "Без имени"}</div>
                            {user.telegramId && (
                              <div className="text-xs text-slate-400">Telegram: {user.telegramId}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {user.email || "—"}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-slate-400">
                        {formatDate(user.lastSignedIn)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-white"
                          onClick={() => handleEditRole(user.id, user.role)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Изменить роль
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Изменить роль пользователя
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Изменение роли пользователя {selectedUserData?.name || ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Новая роль</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="user" className="text-white">Пользователь</SelectItem>
                  <SelectItem value="operator" className="text-white">Оператор</SelectItem>
                  <SelectItem value="manager" className="text-white">Менеджер</SelectItem>
                  <SelectItem value="admin" className="text-white">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Причина изменения (опционально)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Укажите причину изменения роли..."
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveRole}
              className="bg-primary hover:bg-primary/90"
              disabled={!newRole || updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
