import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Plus,
  MapPin,
  Wrench,
  TrendingUp,
  Clock,
  Edit,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

interface Machine {
  id: number;
  name: string;
  serialNumber: string;
  model: string;
  location: string;
  status: "active" | "offline" | "maintenance" | "retired";
  totalRevenue: number;
  totalSales: number;
  lastMaintenance: Date;
  nextServiceDue: Date;
  photo?: string;
}

const mockMachines: Machine[] = [
  {
    id: 1,
    name: "Lobby Snack #04",
    serialNumber: "VM-001",
    model: "VendMax 3000",
    location: "Main Entrance, Building A",
    status: "active",
    totalRevenue: 124000,
    totalSales: 856,
    lastMaintenance: new Date("2024-11-15"),
    nextServiceDue: new Date("2024-12-15"),
  },
  {
    id: 2,
    name: "Cafeteria Drinks",
    serialNumber: "VM-002",
    model: "CoolMax 2500",
    location: "Cafeteria, Building B",
    status: "active",
    totalRevenue: 98500,
    totalSales: 642,
    lastMaintenance: new Date("2024-11-10"),
    nextServiceDue: new Date("2024-12-10"),
  },
  {
    id: 3,
    name: "Gym Snacks",
    serialNumber: "VM-003",
    model: "VendMax 3000",
    location: "Gym, Building C",
    status: "maintenance",
    totalRevenue: 156000,
    totalSales: 1024,
    lastMaintenance: new Date("2024-11-20"),
    nextServiceDue: new Date("2024-12-20"),
  },
  {
    id: 4,
    name: "Parking Level 2",
    serialNumber: "VM-004",
    model: "CompactMax 1500",
    location: "Parking Level 2",
    status: "offline",
    totalRevenue: 45000,
    totalSales: 312,
    lastMaintenance: new Date("2024-10-15"),
    nextServiceDue: new Date("2024-11-15"),
  },
];

export default function MachinesModule() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMachine, setNewMachine] = useState({
    name: "",
    serialNumber: "",
    model: "",
    location: "",
    status: "active",
  });

  const filteredMachines = useMemo(() => {
    return mockMachines.filter((machine) => {
      const matchesSearch =
        machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        machine.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || machine.status === statusFilter;

      const matchesLocation =
        locationFilter === "all" ||
        machine.location.toLowerCase().includes(locationFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [searchQuery, statusFilter, locationFilter]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return "✓";
      case "offline":
        return "✕";
      case "maintenance":
        return "⚙";
      case "retired":
        return "−";
      default:
        return "?";
    }
  };

  const handleCreateMachine = () => {
    if (!newMachine.name || !newMachine.serialNumber) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Machine created successfully");
    setIsCreateOpen(false);
    setNewMachine({
      name: "",
      serialNumber: "",
      model: "",
      location: "",
      status: "active",
    });
  };

  const stats = {
    total: mockMachines.length,
    active: mockMachines.filter((m) => m.status === "active").length,
    offline: mockMachines.filter((m) => m.status === "offline").length,
    maintenance: mockMachines.filter((m) => m.status === "maintenance").length,
    totalRevenue: mockMachines.reduce((sum, m) => sum + m.totalRevenue, 0),
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Machines</h1>
            <p className="text-gray-600 mt-1">
              Manage your vending machines and track their performance
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Machine
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Machine</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Machine Name *</label>
                  <Input
                    placeholder="e.g., Lobby Snack #05"
                    value={newMachine.name}
                    onChange={(e) =>
                      setNewMachine({ ...newMachine, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Serial Number *
                  </label>
                  <Input
                    placeholder="e.g., VM-005"
                    value={newMachine.serialNumber}
                    onChange={(e) =>
                      setNewMachine({
                        ...newMachine,
                        serialNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Model</label>
                  <Input
                    placeholder="e.g., VendMax 3000"
                    value={newMachine.model}
                    onChange={(e) =>
                      setNewMachine({ ...newMachine, model: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="e.g., Main Entrance, Building A"
                    value={newMachine.location}
                    onChange={(e) =>
                      setNewMachine({
                        ...newMachine,
                        location: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={newMachine.status}
                    onValueChange={(value) =>
                      setNewMachine({ ...newMachine, status: value })
                    }
                  >
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
                <Button onClick={handleCreateMachine} className="w-full">
                  Create Machine
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Machines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.maintenance}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">
                Offline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.offline}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <Input
                  placeholder="Search by name or serial number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Location
                </label>
                <Input
                  placeholder="Filter by location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Machines List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Machines ({filteredMachines.length})
          </h2>

          {filteredMachines.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No machines found matching your filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMachines.map((machine) => (
                <Card
                  key={machine.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/machines/${machine.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {machine.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {machine.serialNumber}
                        </p>
                      </div>
                      <Badge className={getStatusColor(machine.status)}>
                        {getStatusIcon(machine.status)}{" "}
                        {machine.status.charAt(0).toUpperCase() +
                          machine.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="font-medium">Model:</span>
                        <span>{machine.model}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{machine.location}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Revenue</span>
                        <span className="font-semibold">
                          {formatCurrency(machine.totalRevenue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Sales</span>
                        <span className="font-semibold">
                          {machine.totalSales}
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Last: {machine.lastMaintenance.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span className="text-gray-600">
                          Next: {machine.nextServiceDue.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/machines/${machine.id}`);
                        }}
                      >
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
