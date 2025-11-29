import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Package, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch notifications
  const { data: notifications, refetch } = trpc.notifications.list.useQuery(
    { limit: 20 },
    { refetchInterval: 30000 } // Poll every 30 seconds
  );

  const { data: unreadData, refetch: refetchUnread } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      refetchUnread();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      refetch();
      refetchUnread();
    },
  });

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsReadMutation.mutate({ notificationId: notification.id });
    }

    // Navigate to related page
    if (notification.relatedType === "transfer") {
      setLocation("/inventory/transfer-history");
      setOpen(false);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "transfer_approved":
        return <Check className="w-4 h-4 text-emerald-400" />;
      case "transfer_rejected":
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case "low_stock":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "task_assigned":
        return <Package className="w-4 h-4 text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = unreadData?.count || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white hover:bg-white/10"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-rose-500"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0 bg-[#0f172a]/95 border-white/10 backdrop-blur-xl"
        align="end"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs text-primary hover:text-primary/80 hover:bg-white/5"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {!notifications || notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {notifications.map((notification: any) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                    !notification.read ? "bg-white/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-white text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
