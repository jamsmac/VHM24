import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Search, MapPin, Wrench, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

const mockMachines = [
  {
    id: 1,
    name: "Lobby Snack #04",
    serialNumber: "VM-001",
    location: "Main Entrance, Building A",
    status: "online",
    totalRevenue: 124000,
    model: "VendMax 3000",
  },
  {
    id: 2,
    name: "Gym Drink #02",
    serialNumber: "VM-002",
    location: "Fitness Center, 2nd Floor",
    status: "online",
    totalRevenue: 89000,
    model: "CoolDrink Pro",
  },
  {
    id: 3,
    name: "Office Coffee #01",
    serialNumber: "VM-003",
    location: "Break Room, 3rd Floor",
    status: "maintenance",
    totalRevenue: 210000,
    model: "CoffeeMax",
  },
  {
    id: 4,
    name: "Library Snack #02",
    serialNumber: "VM-004",
    location: "Library Entrance",
    status: "offline",
    totalRevenue: 54000,
    model: "VendMax 2000",
  },
  {
    id: 5,
    name: "Station Drink #05",
    serialNumber: "VM-005",
    location: "Train Station Platform 2",
    status: "online",
    totalRevenue: 345000,
    model: "VendMax 3000",
  },
  {
    id: 6,
    name: "Mall Snack #08",
    serialNumber: "VM-006",
    location: "Shopping Mall, East Wing",
    status: "online",
    totalRevenue: 189000,
    model: "VendMax 3000",
  },
];

export default function Machines() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const { data: machines = [], isLoading } = trpc.machines.list.useQuery();

  // Use mock data if no real data
  const displayMachines = machines.length > 0 ? machines : mockMachinesData;

  // Get unique locations for filter
  const locations = useMemo(() => {
    const uniqueLocations = new Set(displayMachines.map((m: any) => m.location));
    return Array.from(uniqueLocations).sort();
  }, [displayMachines]);

  // Filter machines based on search and filters
  const filteredMachines = useMemo(() => {
    return displayMachines.filter((machine: any) => {
      const matchesSearch =
        machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (machine.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === "all" || machine.status === statusFilter;

      const matchesLocation =
        locationFilter === "all" || machine.location === locationFilter;

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [displayMachines, searchQuery, statusFilter, locationFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: displayMachines.length,
      active: displayMachines.filter((m: any) => m.status === "active" || m.status === "online").length,
      offline: displayMachines.filter((m: any) => m.status === "offline").length,
      maintenance: displayMachines.filter((m: any) => m.status === "maintenance").length,
      totalRevenue: displayMachines.reduce((sum: number, m: any) => sum + (m.totalRevenue || 0), 0),
    };
  }, [displayMachines]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "online":
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
      case "online":
        return "🟢";
      case "offline":
        return "🔴";
      case "maintenance":
        return "🟡";
      case "retired":
        return "⚫";
      default:
        return "⚪";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Machines</h1>
            <p className="text-gray-600 mt-1">
              Manage vending machines and monitor their operational status
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Machine
          </Button>
        </div>

        {/* Statistics Cards */}
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

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {stats.active}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-700">
                Offline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {stats.offline}
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-700">
                Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">
                {stats.maintenance}
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
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or serial number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>

              {/* Location Filter */}
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location: string) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-600">
              Showing {filteredMachines.length} of {displayMachines.length} machines
            </div>
          </CardContent>
        </Card>

        {/* Machines List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Loading machines...
              </CardContent>
            </Card>
          ) : filteredMachines.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No machines found matching your filters
              </CardContent>
            </Card>
          ) : (
            filteredMachines.map((machine: any) => (
              <Card key={machine.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{machine.name}</h3>
                        <Badge className={getStatusColor(machine.status)}>
                          {getStatusIcon(machine.status)} {machine.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-3">
                        <div>
                          <span className="font-medium">Serial Number:</span>
                          <p>{machine.serialNumber || "N/A"}</p>
                        </div>

                        <div>
                          <span className="font-medium">Model:</span>
                          <p>{machine.model || "N/A"}</p>
                        </div>

                        <div className="flex items-start gap-1">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Location:</span>
                            <p>{machine.location}</p>
                          </div>
                        </div>

                        <div>
                          <span className="font-medium">Total Revenue:</span>
                          <p className="text-green-600 font-semibold">
                            {formatCurrency(machine.totalRevenue || 0)}
                          </p>
                        </div>
                      </div>

                      {machine.lastMaintenance && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                          <Wrench className="w-4 h-4" />
                          <span>
                            Last maintenance:{" "}
                            {new Date(machine.lastMaintenance).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {machine.nextServiceDue && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-orange-600">
                          <AlertCircle className="w-4 h-4" />
                          <span>
                            Next service due:{" "}
                            {new Date(machine.nextServiceDue).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/machines/${machine.id}`)}
                      >
                        View Details
                      </Button>
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

// Mock data for fallback
const mockMachinesData = mockMachines;
