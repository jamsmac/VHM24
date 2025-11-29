import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AdminTransfers() {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: pendingTransfers, isLoading, refetch } = trpc.stockTransfers.pending.useQuery();

  const approveMutation = trpc.stockTransfers.approve.useMutation({
    onSuccess: () => {
      toast.success("Transfer request approved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to approve transfer", {
        description: error.message,
      });
    },
  });

  const rejectMutation = trpc.stockTransfers.reject.useMutation({
    onSuccess: () => {
      toast.success("Transfer request rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedTransferId(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to reject transfer", {
        description: error.message,
      });
    },
  });

  const handleApprove = (transferId: number) => {
    approveMutation.mutate({ transferId });
  };

  const handleRejectClick = (transferId: number) => {
    setSelectedTransferId(transferId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedTransferId) {
      rejectMutation.mutate({
        transferId: selectedTransferId,
        reason: rejectReason || undefined,
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-rose-500/50 text-rose-400";
      case "normal":
        return "border-amber-500/50 text-amber-400";
      case "low":
        return "border-blue-500/50 text-blue-400";
      default:
        return "border-white/10 text-white";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertTriangle className="w-3 h-3" />;
      case "normal":
        return <Clock className="w-3 h-3" />;
      case "low":
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading pending transfers...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">
            Transfer Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve stock transfer requests
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {pendingTransfers?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Urgent Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">
                {pendingTransfers?.filter((t: any) => t.priority === "urgent").length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {pendingTransfers?.reduce((sum: number, t: any) => sum + t.quantity, 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Items pending transfer</p>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Requests List */}
        <div className="space-y-4">
          {!pendingTransfers || pendingTransfers.length === 0 ? (
            <Card className="border-white/10 bg-white/5 backdrop-blur-md">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-2">All caught up!</p>
                <p className="text-muted-foreground">No pending transfer requests at the moment</p>
              </CardContent>
            </Card>
          ) : (
            pendingTransfers.map((transfer: any) => (
              <Card
                key={transfer.id}
                className="border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white">
                            {transfer.productName}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`${getPriorityColor(transfer.priority)} flex items-center gap-1`}
                          >
                            {getPriorityIcon(transfer.priority)}
                            {transfer.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Requested by: <span className="text-white">{transfer.requesterName || "Unknown"}</span>
                          </p>
                          <p>
                            SKU: <span className="text-white">{transfer.productSku}</span>
                          </p>
                          <p>
                            Quantity: <span className="text-white font-bold">{transfer.quantity}</span>
                          </p>
                          {transfer.notes && (
                            <p className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                              <span className="text-white">Notes:</span> {transfer.notes}
                            </p>
                          )}
                          <p className="text-xs">
                            Requested: {new Date(transfer.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(transfer.id)}
                        disabled={approveMutation.isPending}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectClick(transfer.id)}
                        disabled={rejectMutation.isPending}
                        variant="outline"
                        className="bg-transparent border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#0f172a]/95 border-white/10 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Reject Transfer Request</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please provide a reason for rejecting this transfer request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason" className="text-gray-300">
                Reason (Optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain why this request is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="bg-transparent border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
