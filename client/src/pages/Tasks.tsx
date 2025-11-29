import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, User, Calendar, Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Task {
  id: number;
  title: string;
  machine: string;
  type: string;
  priority: string;
  status: string;
  assignee: string;
  dueDate: string;
}

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Refill Snack Machine #04",
    machine: "Lobby Snack #04",
    type: "Refill",
    priority: "high",
    status: "pending",
    assignee: "John Doe",
    dueDate: "Today, 2:00 PM",
  },
  {
    id: 2,
    title: "Fix Coin Acceptor",
    machine: "Gym Drink #02",
    type: "Repair",
    priority: "urgent",
    status: "in-progress",
    assignee: "Mike Smith",
    dueDate: "Today, 4:00 PM",
  },
  {
    id: 3,
    title: "Monthly Cleaning",
    machine: "Office Coffee #01",
    type: "Maintenance",
    priority: "medium",
    status: "completed",
    assignee: "Sarah Johnson",
    dueDate: "Yesterday",
  },
  {
    id: 4,
    title: "Restock Cola Zero",
    machine: "Station Drink #05",
    type: "Refill",
    priority: "low",
    status: "pending",
    assignee: "John Doe",
    dueDate: "Tomorrow, 9:00 AM",
  },
  {
    id: 5,
    title: "Inspect Cooling System",
    machine: "Mall Snack #08",
    type: "Inspection",
    priority: "medium",
    status: "pending",
    assignee: "Mike Smith",
    dueDate: "Tomorrow, 11:00 AM",
  },
];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as number;
    const newStatus = over.id as string;

    // Find the task being dragged
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // If status hasn't changed, do nothing
    if (task.status === newStatus) return;

    // Update task status
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );

    // Show success toast
    const statusLabels: Record<string, string> = {
      pending: "Pending",
      "in-progress": "In Progress",
      completed: "Completed",
    };

    toast.success(`Task moved to ${statusLabels[newStatus]}`);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-white tracking-tight">Tasks</h1>
            <p className="text-muted-foreground mt-1">Operational workflow and assignments</p>
          </div>
          <button 
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
            onClick={() => toast.info("Task creation dialog coming soon")}
          >
            + Create Task
          </button>
        </div>

        {/* Task Columns with Drag & Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending Column */}
            <TaskColumn
              id="pending"
              title="Pending"
              color="bg-amber-400"
              count={pendingTasks.length}
              tasks={pendingTasks}
            />

            {/* In Progress Column */}
            <TaskColumn
              id="in-progress"
              title="In Progress"
              color="bg-blue-400"
              count={inProgressTasks.length}
              tasks={inProgressTasks}
            />

            {/* Completed Column */}
            <TaskColumn
              id="completed"
              title="Completed"
              color="bg-emerald-400"
              count={completedTasks.length}
              tasks={completedTasks}
            />
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </Layout>
  );
}

interface TaskColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  tasks: Task[];
}

function TaskColumn({ id, title, color, count, tasks }: TaskColumnProps) {
  const { setNodeRef } = useSortable({
    id: id,
    data: {
      type: 'column',
    },
  });

  return (
    <div ref={setNodeRef} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-white flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          {title}
        </h3>
        <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
          {count}
        </span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {tasks.map(task => (
            <DraggableTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function DraggableTaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, isDragging = false }: { task: Task; isDragging?: boolean }) {
  return (
    <Card className={`border-white/10 bg-white/5 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all duration-300 group cursor-grab active:cursor-grabbing ${isDragging ? 'rotate-3 scale-105' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <Badge 
              variant="outline" 
              className={`
                ${task.priority === 'urgent' ? 'border-rose-500/50 text-rose-400 bg-rose-500/10' : ''}
                ${task.priority === 'high' ? 'border-orange-500/50 text-orange-400 bg-orange-500/10' : ''}
                ${task.priority === 'medium' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' : ''}
                ${task.priority === 'low' ? 'border-gray-500/50 text-gray-400 bg-gray-500/10' : ''}
              `}
            >
              {task.priority}
            </Badge>
          </div>
          <Badge variant="secondary" className="bg-white/10 text-white border-none">
            {task.type}
          </Badge>
        </div>
        
        <div>
          <h4 className="font-bold text-white group-hover:text-primary transition-colors">{task.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{task.machine}</p>
        </div>

        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {task.assignee}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {task.dueDate}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
