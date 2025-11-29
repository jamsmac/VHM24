import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: number;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  assignedTo: string;
  dueDate: Date;
  createdAt: Date;
  machineId?: number;
}

const mockTasks: Task[] = [
  {
    id: 1,
    title: "Refill Snacks - Lobby #04",
    description: "Restock all snack items in the lobby machine",
    status: "pending",
    priority: "high",
    assignedTo: "John Smith",
    dueDate: new Date("2024-11-30"),
    createdAt: new Date("2024-11-28"),
    machineId: 1,
  },
  {
    id: 2,
    title: "Maintenance - Gym Snacks",
    description: "Perform quarterly maintenance on gym machine",
    status: "in-progress",
    priority: "medium",
    assignedTo: "Mike Johnson",
    dueDate: new Date("2024-12-01"),
    createdAt: new Date("2024-11-27"),
    machineId: 3,
  },
  {
    id: 3,
    title: "Repair Coin Dispenser",
    description: "Fix coin dispenser mechanism in parking level 2",
    status: "pending",
    priority: "high",
    assignedTo: "Sarah Williams",
    dueDate: new Date("2024-11-29"),
    createdAt: new Date("2024-11-25"),
    machineId: 4,
  },
  {
    id: 4,
    title: "Restock Drinks - Cafeteria",
    description: "Refill beverage items in cafeteria machine",
    status: "completed",
    priority: "medium",
    assignedTo: "John Smith",
    dueDate: new Date("2024-11-28"),
    createdAt: new Date("2024-11-26"),
    machineId: 2,
  },
  {
    id: 5,
    title: "Clean Machine - Lobby #04",
    description: "Deep clean exterior and interior of lobby machine",
    status: "pending",
    priority: "low",
    assignedTo: "Mike Johnson",
    dueDate: new Date("2024-12-05"),
    createdAt: new Date("2024-11-28"),
    machineId: 1,
  },
  {
    id: 6,
    title: "Replace Cooling Unit",
    description: "Install new cooling unit in gym machine",
    status: "in-progress",
    priority: "high",
    assignedTo: "Sarah Williams",
    dueDate: new Date("2024-12-02"),
    createdAt: new Date("2024-11-24"),
    machineId: 3,
  },
];

export default function TasksModule() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    assignedTo: "",
    dueDate: "",
  });

  const tasksByStatus = useMemo(() => {
    return {
      pending: mockTasks.filter((t) => t.status === "pending"),
      "in-progress": mockTasks.filter((t) => t.status === "in-progress"),
      completed: mockTasks.filter((t) => t.status === "completed"),
    };
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="w-4 h-4" />;
      case "in-progress":
        return <Clock className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.assignedTo) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Task created successfully");
    setIsCreateOpen(false);
    setNewTask({
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      assignedTo: "",
      dueDate: "",
    });
  };

  const stats = {
    total: mockTasks.length,
    pending: tasksByStatus.pending.length,
    inProgress: tasksByStatus["in-progress"].length,
    completed: tasksByStatus.completed.length,
    overdue: mockTasks.filter((t) => t.dueDate < new Date()).length,
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm flex-1">{task.title}</h4>
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Badge>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{task.assignedTo}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">
              {task.dueDate.toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1">
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-gray-600 mt-1">
              Manage maintenance and restocking tasks
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    placeholder="Task title..."
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Task description..."
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Assigned To *</label>
                  <Select
                    value={newTask.assignedTo}
                    onValueChange={(value) =>
                      setNewTask({ ...newTask, assignedTo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="John Smith">John Smith</SelectItem>
                      <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
                      <SelectItem value="Sarah Williams">
                        Sarah Williams
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <Input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleCreateTask} className="w-full">
                  Create Task
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
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-600">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.inProgress}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.completed}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.overdue}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            onClick={() => setViewMode("kanban")}
          >
            Kanban Board
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
          >
            List View
          </Button>
        </div>

        {/* Kanban Board View */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pending Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">
                  Pending ({tasksByStatus.pending.length})
                </h2>
              </div>
              <div className="space-y-3">
                {tasksByStatus.pending.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-semibold">
                  In Progress ({tasksByStatus["in-progress"].length})
                </h2>
              </div>
              <div className="space-y-3">
                {tasksByStatus["in-progress"].map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* Completed Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold">
                  Completed ({tasksByStatus.completed.length})
                </h2>
              </div>
              <div className="space-y-3">
                {tasksByStatus.completed.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {mockTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No tasks found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {mockTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(task.status)}
                            <h4 className="font-semibold">{task.title}</h4>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{task.assignedTo}</span>
                            <span>{task.dueDate.toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
