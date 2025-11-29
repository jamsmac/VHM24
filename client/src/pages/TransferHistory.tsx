import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Search,
  Filter,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function TransferHistory() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: transfers, isLoading } = trpc.stockTransfers.list.useQuery();

  // Filter transfers
  const filteredTransfers = transfers?.filter((transfer: any) => {
    const matchesStatus = statusFilter === "all" || transfer.status === statusFilter;
    const matchesSearch =
      transfer.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.productSku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.requesterName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "border-emerald-500/50 text-emerald-400 bg-emerald-500/10";
      case "rejected":
        return "border-rose-500/50 text-rose-400 bg-rose-500/10";
      case "completed":
        return "border-blue-500/50 text-blue-400 bg-blue-500/10";
      case "pending":
        return "border-amber-500/50 text-amber-400 bg-amber-500/10";
      default:
        return "border-white/10 text-white bg-white/5";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return null;
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

  // Calculate statistics
  const stats = {
    total: transfers?.length || 0,
    pending: transfers?.filter((t: any) => t.status === "pending").length || 0,
    approved: transfers?.filter((t: any) => t.status === "approved").length || 0,
    rejected: transfers?.filter((t: any) => t.status === "rejected").length || 0,
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading transfer history...</div>
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
            Transfer History
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete audit trail of all stock transfer requests
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-white/10 to-transparent border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{stats.approved}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-rose-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground mt-1">Declined requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by product, SKU, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-white/10 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transfer History List */}
        <div className="space-y-4">
          {!filteredTransfers || filteredTransfers.length === 0 ? (
            <Card className="border-white/10 bg-white/5 backdrop-blur-md">
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transfers found</p>
              </CardContent>
            </Card>
          ) : (
            filteredTransfers.map((transfer: any) => (
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
                            className={`${getStatusColor(transfer.status)} flex items-center gap-1`}
                          >
                            {getStatusIcon(transfer.status)}
                            {transfer.status.toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`${getPriorityColor(transfer.priority)}`}
                          >
                            {transfer.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div className="space-y-1">
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
                          </div>
                          <div className="space-y-1">
                            <p className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Requested: <span className="text-white">{new Date(transfer.createdAt).toLocaleString()}</span>
                            </p>
                            {transfer.approvedAt && (
                              <p className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle className="w-4 h-4" />
                                Approved: {new Date(transfer.approvedAt).toLocaleString()}
                              </p>
                            )}
                            {transfer.rejectedAt && (
                              <p className="flex items-center gap-2 text-rose-400">
                                <XCircle className="w-4 h-4" />
                                Rejected: {new Date(transfer.rejectedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        {transfer.notes && (
                          <p className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                            <span className="text-white font-medium">Notes:</span> {transfer.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
