import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferences() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [telegramNotifications, setTelegramNotifications] = useState(true);

  const { data: preferences, refetch } = trpc.users.getNotificationPreferences.useQuery();
  
  const updateMutation = trpc.users.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      toast.success("Настройки уведомлений сохранены");
      refetch();
    },
    onError: (error) => {
      toast.error("Ошибка сохранения", {
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (preferences) {
      setEmailNotifications(preferences.emailNotifications);
      setTelegramNotifications(preferences.telegramNotifications);
    }
  }, [preferences]);

  const handleSave = () => {
    updateMutation.mutate({ emailNotifications, telegramNotifications });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
      <div className="container max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Настройки уведомлений</h1>
          <p className="text-slate-400">Управление каналами уведомлений</p>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Каналы уведомлений
            </CardTitle>
            <CardDescription className="text-slate-400">
              Выберите, как вы хотите получать уведомления о статусе заявок
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-white">Email уведомления</div>
                  <div className="text-sm text-slate-400">
                    Получать уведомления на email при изменении статуса заявки
                  </div>
                </div>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            {/* Telegram Notifications */}
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="font-medium text-white">Telegram уведомления</div>
                  <div className="text-sm text-slate-400">
                    Получать уведомления в Telegram при изменении статуса заявки
                  </div>
                </div>
              </div>
              <Switch
                checked={telegramNotifications}
                onCheckedChange={setTelegramNotifications}
              />
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-700">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {updateMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-sm text-slate-400">
              <Bell className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white mb-1">О уведомлениях</p>
                <p>
                  Вы будете получать уведомления когда администратор одобрит или отклонит вашу заявку на доступ.
                  Вы можете отключить любой канал уведомлений в любое время.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
