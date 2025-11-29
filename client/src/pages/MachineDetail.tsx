import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Edit,
  MapPin,
  Wrench,
  TrendingUp,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function MachineDetail() {
  const [, params] = useRoute("/machines/:id");
  const [, navigate] = useLocation();
  const machineId = params?.id ? parseInt(params.id) : null;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [maintenanceData, setMaintenanceData] = useState({
    description: "",
    cost: "",
    nextServiceDue: "",
  });

  // Mock machine data (replace with real API call)
  const mockMachine = {
    id: machineId || 1,
    name: "Lobby Snack #04",
    serialNumber: "VM-001",
    model: "VendMax 3000",
    location: "Main Entrance, Building A",
    status: "active",
    totalRevenue: 124000,
    totalSales: 856,
    lastMaintenance: new Date("2024-11-15"),
    nextServiceDue: new Date("2024-12-15"),
    installationDate: new Date("2023-06-10"),
    notes: "High-traffic location, excellent performance",
    photo: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=400",
  };

  const mockMaintenanceHistory = [
    {
      id: 1,
      date: new Date("2024-11-15"),
      type: "Preventive Maintenance",
      description: "Regular cleaning and restocking",
      cost: 5000,
      performedBy: "John Smith",
    },
    {
      id: 2,
      date: new Date("2024-10-20"),
      type: "Repair",
      description: "Fixed coin dispenser mechanism",
      cost: 15000,
      performedBy: "Mike Johnson",
    },
    {
      id: 3,
      date: new Date("2024-09-10"),
      type: "Preventive Maintenance",
      description: "Quarterly inspection and cleaning",
      cost: 5000,
      performedBy: "John Smith",
    },
    {
      id: 4,
      date: new Date("2024-08-05"),
      type: "Repair",
      description: "Replaced cooling unit",
      cost: 45000,
      performedBy: "Sarah Williams",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-300";
      case "offline":
        return "bg-red-100 text-red-800 border-red-300";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "retired":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const handleEditSave = () => {
    toast.success("Machine information updated successfully");
    setIsEditOpen(false);
  };

  const handleMaintenanceLog = () => {
    toast.success("Maintenance record added successfully");
    setIsMaintenanceOpen(false);
    setMaintenanceData({ description: "", cost: "", nextServiceDue: "" });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/machines")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Machines
          </Button>
        </div>

        {/* Machine Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{mockMachine.name}</h1>
              <Badge className={getStatusColor(mockMachine.status)}>
                {mockMachine.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-gray-600">Serial: {mockMachine.serialNumber}</p>
          </div>

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Machine
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Machine Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Machine Name</label>
                  <Input
                    defaultValue={mockMachine.name}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    defaultValue={mockMachine.location}
                    onChange={(e) =>
                      setEditData({ ...editData, location: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select defaultValue={mockMachine.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    defaultValue={mockMachine.notes}
                    onChange={(e) =>
                      setEditData({ ...editData, notes: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleEditSave} className="w-full">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(mockMachine.totalRevenue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockMachine.totalSales}</div>
              <p className="text-xs text-gray-500 mt-1">Transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Revenue/Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(mockMachine.totalRevenue / 12)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Average monthly</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Transaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(mockMachine.totalRevenue / mockMachine.totalSales)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Per sale</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { month: 'Jan', revenue: 8500 },
                  { month: 'Feb', revenue: 9200 },
                  { month: 'Mar', revenue: 10100 },
                  { month: 'Apr', revenue: 9800 },
                  { month: 'May', revenue: 11200 },
                  { month: 'Jun', revenue: 10500 },
                  { month: 'Jul', revenue: 12000 },
                  { month: 'Aug', revenue: 11800 },
                  { month: 'Sep', revenue: 10900 },
                  { month: 'Oct', revenue: 11500 },
                  { month: 'Nov', revenue: 12400 },
                  { month: 'Dec', revenue: 10300 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="month" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Machine Information */}
        <Card>
          <CardHeader>
            <CardTitle>Machine Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Model
                </label>
                <p className="text-lg font-semibold mt-1">{mockMachine.model}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Serial Number
                </label>
                <p className="text-lg font-semibold mt-1">
                  {mockMachine.serialNumber}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Location
                  </label>
                  <p className="text-lg font-semibold mt-1">
                    {mockMachine.location}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Installation Date
                </label>
                <p className="text-lg font-semibold mt-1">
                  {mockMachine.installationDate.toLocaleDateString()}
                </p>
              </div>
            </div>

            {mockMachine.notes && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-600">
                  Notes
                </label>
                <p className="text-base mt-2 text-gray-700">
                  {mockMachine.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Last Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-lg font-semibold">
                  {mockMachine.lastMaintenance.toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {Math.floor(
                  (Date.now() - mockMachine.lastMaintenance.getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{" "}
                days ago
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Next Service Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span className="text-lg font-semibold">
                  {mockMachine.nextServiceDue.toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-orange-600">
                {Math.ceil(
                  (mockMachine.nextServiceDue.getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )}{" "}
                days remaining
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance History */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Maintenance History</CardTitle>
            <Dialog open={isMaintenanceOpen} onOpenChange={setIsMaintenanceOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Wrench className="w-4 h-4" />
                  Log Maintenance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Maintenance Record</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Describe the maintenance work performed..."
                      value={maintenanceData.description}
                      onChange={(e) =>
                        setMaintenanceData({
                          ...maintenanceData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cost (UZS)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={maintenanceData.cost}
                      onChange={(e) =>
                        setMaintenanceData({
                          ...maintenanceData,
                          cost: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Next Service Due
                    </label>
                    <Input
                      type="date"
                      value={maintenanceData.nextServiceDue}
                      onChange={(e) =>
                        setMaintenanceData({
                          ...maintenanceData,
                          nextServiceDue: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Button onClick={handleMaintenanceLog} className="w-full">
                    Save Maintenance Record
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockMaintenanceHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No maintenance records yet
                </p>
              ) : (
                mockMaintenanceHistory.map((record) => (
                  <div
                    key={record.id}
                    className="border-l-4 border-blue-400 pl-4 py-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{record.type}</h4>
                        <p className="text-sm text-gray-600">
                          {record.date.toLocaleDateString()} • By{" "}
                          {record.performedBy}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        {formatCurrency(record.cost)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{record.description}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
