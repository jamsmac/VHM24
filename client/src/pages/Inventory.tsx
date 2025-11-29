import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  Warehouse,
  User,
  Monitor,
  Search,
  AlertTriangle,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StockTransferModal } from "@/components/StockTransferModal";
import { InventoryAdjustmentModal } from "@/components/InventoryAdjustmentModal";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<"all" | "warehouse" | "operator" | "machine">("all");
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);

  // Fetch inventory data
  const { data: inventoryData, isLoading, refetch: refetchInventory } = trpc.inventory.getAll.useQuery();
  const { data: stats, refetch: refetchStats } = trpc.inventory.getStats.useQuery();
  const { data: lowStockAlerts, refetch: refetchAlerts } = trpc.inventory.getLowStockAlerts.useQuery({ threshold: 10 });

  // Group inventory by product
  const groupedInventory = inventoryData?.reduce((acc, item) => {
    const productId = item.productId;
    if (!acc[productId]) {
      acc[productId] = {
        productId,
        productName: item.productName || "Unknown Product",
        productSku: item.productSku,
        productCategory: item.productCategory,
        levels: {
          warehouse: null,
          operator: null,
          machine: null,
        },
      };
    }
    acc[productId].levels[item.level as 'warehouse' | 'operator' | 'machine'] = item;
    return acc;
  }, {} as Record<number, any>);

  const products = Object.values(groupedInventory || {});

  // Filter products based on search and level
  const filteredProducts = products.filter((product: any) => {
    const matchesSearch =
      product.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.productSku?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel =
      selectedLevel === "all" ||
      product.levels[selectedLevel] !== null;

    return matchesSearch && matchesLevel;
  });

  const toggleProductExpansion = (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const getStockLevelColor = (quantity: number, max: number = 100) => {
    const percentage = (quantity / max) * 100;
    if (percentage < 20) return "text-rose-400";
    if (percentage < 50) return "text-amber-400";
    return "text-emerald-400";
  };

  const getProgressColor = (quantity: number, max: number = 100) => {
    const percentage = (quantity / max) * 100;
    if (percentage < 20) return "[&>div]:bg-rose-500";
    if (percentage < 50) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-emerald-500";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading inventory...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-white tracking-tight">
              Inventory
            </h1>
            <p className="text-muted-foreground mt-1">3-Level Stock Tracking System</p>
          </div>
          <div className="flex gap-3">
            <StockTransferModal />
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              onClick={() => toast.info("Order supplies feature coming soon")}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Order Supplies
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
                <Warehouse className="w-4 h-4" />
                Warehouse Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.warehouseQuantity || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total items in central storage</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Operator Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.operatorQuantity || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Items with operators</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Machine Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.machineQuantity || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active inventory deployed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">
                {stats?.lowStockCount || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Items below threshold</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedLevel === "all" ? "default" : "outline"}
              onClick={() => setSelectedLevel("all")}
              size="sm"
              className={selectedLevel === "all" ? "" : "bg-transparent border-white/10 text-white hover:bg-white/10"}
            >
              All Levels
            </Button>
            <Button
              variant={selectedLevel === "warehouse" ? "default" : "outline"}
              onClick={() => setSelectedLevel("warehouse")}
              size="sm"
              className={selectedLevel === "warehouse" ? "" : "bg-transparent border-white/10 text-white hover:bg-white/10"}
            >
              <Warehouse className="w-4 h-4 mr-2" />
              Warehouse
            </Button>
            <Button
              variant={selectedLevel === "operator" ? "default" : "outline"}
              onClick={() => setSelectedLevel("operator")}
              size="sm"
              className={selectedLevel === "operator" ? "" : "bg-transparent border-white/10 text-white hover:bg-white/10"}
            >
              <User className="w-4 h-4 mr-2" />
              Operator
            </Button>
            <Button
              variant={selectedLevel === "machine" ? "default" : "outline"}
              onClick={() => setSelectedLevel("machine")}
              size="sm"
              className={selectedLevel === "machine" ? "" : "bg-transparent border-white/10 text-white hover:bg-white/10"}
            >
              <Monitor className="w-4 h-4 mr-2" />
              Machine
            </Button>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockAlerts && lowStockAlerts.length > 0 && (
          <Card className="border-rose-500/50 bg-rose-500/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                Low Stock Alerts ({lowStockAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockAlerts.slice(0, 5).map((alert: any) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-rose-400" />
                      <div>
                        <p className="text-sm font-medium text-white">{alert.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.level} • SKU: {alert.productSku}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-rose-500/50 text-rose-400">
                      {alert.quantity} left
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product List with 3-Level Hierarchy */}
        <div className="space-y-4">
          {filteredProducts.length === 0 ? (
            <Card className="border-white/10 bg-white/5 backdrop-blur-md">
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products found</p>
              </CardContent>
            </Card>
          ) : (
            filteredProducts.map((product: any) => {
              const isExpanded = expandedProducts.has(product.productId);
              const totalStock =
                (product.levels.warehouse?.quantity || 0) +
                (product.levels.operator?.quantity || 0) +
                (product.levels.machine?.quantity || 0);

              return (
                <Card
                  key={product.productId}
                  className="border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all"
                >
                  <CardContent className="p-6">
                    {/* Product Header */}
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleProductExpansion(product.productId)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white">{product.productName}</h3>
                          <p className="text-sm text-muted-foreground">
                            SKU: {product.productSku} • Category: {product.productCategory || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">{totalStock}</p>
                          <p className="text-xs text-muted-foreground">Total Stock</p>
                        </div>
                      </div>
                    </div>

                    {/* 3-Level Breakdown */}
                    {isExpanded && (
                      <div className="mt-6 space-y-4 pl-9">
                        {/* Warehouse Level */}
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <Warehouse className="w-6 h-6 text-blue-400" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-white">Warehouse</p>
                              <p className={`text-lg font-bold ${getStockLevelColor(product.levels.warehouse?.quantity || 0)}`}>
                                {product.levels.warehouse?.quantity || 0}
                              </p>
                            </div>
                            <Progress
                              value={((product.levels.warehouse?.quantity || 0) / 100) * 100}
                              className={`h-2 bg-white/10 ${getProgressColor(product.levels.warehouse?.quantity || 0)}`}
                            />
                          </div>
                          {product.levels.warehouse && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInventoryItem({
                                  id: product.levels.warehouse.id,
                                  productId: product.productId,
                                  productName: product.productName,
                                  level: "warehouse" as const,
                                  locationId: product.levels.warehouse.locationId,
                                  currentQuantity: product.levels.warehouse.quantity,
                                });
                                setAdjustmentModalOpen(true);
                              }}
                              className="bg-transparent border-blue-400/50 text-blue-400 hover:bg-blue-400/10"
                            >
                              Adjust Stock
                            </Button>
                          )}
                        </div>

                        {/* Operator Level */}
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <User className="w-6 h-6 text-purple-400" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-white">Operator</p>
                              <p className={`text-lg font-bold ${getStockLevelColor(product.levels.operator?.quantity || 0)}`}>
                                {product.levels.operator?.quantity || 0}
                              </p>
                            </div>
                            <Progress
                              value={((product.levels.operator?.quantity || 0) / 100) * 100}
                              className={`h-2 bg-white/10 ${getProgressColor(product.levels.operator?.quantity || 0)}`}
                            />
                          </div>
                          {product.levels.operator && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInventoryItem({
                                  id: product.levels.operator.id,
                                  productId: product.productId,
                                  productName: product.productName,
                                  level: "operator" as const,
                                  locationId: product.levels.operator.locationId,
                                  currentQuantity: product.levels.operator.quantity,
                                });
                                setAdjustmentModalOpen(true);
                              }}
                              className="bg-transparent border-purple-400/50 text-purple-400 hover:bg-purple-400/10"
                            >
                              Adjust Stock
                            </Button>
                          )}
                        </div>

                        {/* Machine Level */}
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <Monitor className="w-6 h-6 text-emerald-400" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-white">Machine</p>
                              <p className={`text-lg font-bold ${getStockLevelColor(product.levels.machine?.quantity || 0)}`}>
                                {product.levels.machine?.quantity || 0}
                              </p>
                            </div>
                            <Progress
                              value={((product.levels.machine?.quantity || 0) / 100) * 100}
                              className={`h-2 bg-white/10 ${getProgressColor(product.levels.machine?.quantity || 0)}`}
                            />
                          </div>
                          {product.levels.machine && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInventoryItem({
                                  id: product.levels.machine.id,
                                  productId: product.productId,
                                  productName: product.productName,
                                  level: "machine" as const,
                                  locationId: product.levels.machine.locationId,
                                  currentQuantity: product.levels.machine.quantity,
                                });
                                setAdjustmentModalOpen(true);
                              }}
                              className="bg-transparent border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10"
                            >
                              Adjust Stock
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Inventory Adjustment Modal */}
      <InventoryAdjustmentModal
        open={adjustmentModalOpen}
        onOpenChange={setAdjustmentModalOpen}
        inventoryItem={selectedInventoryItem}
        onSuccess={() => {
          refetchInventory();
          refetchStats();
          refetchAlerts();
        }}
      />
    </Layout>
  );
}
