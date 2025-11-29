import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Plus, X, Send } from "lucide-react";
import { toast } from "sonner";

export default function DigestSettings() {
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");

  const { data: config, refetch } = trpc.digestConfig.get.useQuery();
  
  const updateMutation = trpc.digestConfig.update.useMutation({
    onSuccess: () => {
      toast.success("Настройки сохранены");
      refetch();
    },
    onError: (error) => {
      toast.error("Ошибка сохранения", {
        description: error.message,
      });
    },
  });

  const testMutation = trpc.digestConfig.test.useMutation({
    onSuccess: () => {
      toast.success("Тестовое письмо отправлено");
    },
    onError: (error) => {
      toast.error("Ошибка отправки", {
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setFrequency(config.frequency);
      setRecipients(config.recipients);
    }
  }, [config]);

  const handleAddEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Неверный формат email");
      return;
    }
    if (recipients.includes(newEmail)) {
      toast.error("Email уже добавлен");
      return;
    }
    setRecipients([...recipients, newEmail]);
    setNewEmail("");
  };

  const handleRemoveEmail = (email: string) => {
    setRecipients(recipients.filter(e => e !== email));
  };

  const handleSave = () => {
    if (recipients.length === 0) {
      toast.error("Добавьте хотя бы один email");
      return;
    }
    updateMutation.mutate({ enabled, frequency, recipients });
  };

  const handleTest = () => {
    testMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
      <div className="container max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Настройки Email-отчетов</h1>
          <p className="text-slate-400">Управление автоматическими отчетами по email</p>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Конфигурация отчетов
            </CardTitle>
            <CardDescription className="text-slate-400">
              Настройте частоту и получателей автоматических email-отчетов
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div>
                <div className="font-medium text-white">Включить отчеты</div>
                <div className="text-sm text-slate-400">Автоматическая отправка email-отчетов</div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Частота отправки</label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="daily" className="text-white">Ежедневно (9:00)</SelectItem>
                  <SelectItem value="weekly" className="text-white">Еженедельно (Пн 9:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipients */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Получатели</label>
              
              {/* Add Email Input */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                  placeholder="admin@example.com"
                  className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button onClick={handleAddEmail} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Email List */}
              <div className="space-y-2">
                {recipients.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 border border-dashed border-slate-700 rounded-lg">
                    Нет получателей
                  </div>
                ) : (
                  recipients.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-white">{email}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveEmail(email)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {updateMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
              </Button>
              <Button
                onClick={handleTest}
                disabled={testMutation.isPending || recipients.length === 0}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {testMutation.isPending ? "Отправка..." : "Тест"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
