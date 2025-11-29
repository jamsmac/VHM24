import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, DollarSign, ShoppingCart, Activity, AlertTriangle } from "lucide-react";
import { RecentAdminActions } from "@/components/RecentAdminActions";
import { formatUZS } from "@/lib/currency";

const revenueData = [
  { name: "Mon", value: 4000 },
  { name: "Tue", value: 3000 },
  { name: "Wed", value: 5000 },
  { name: "Thu", value: 2780 },
  { name: "Fri", value: 1890 },
  { name: "Sat", value: 6390 },
  { name: "Sun", value: 3490 },
];

const machineStatusData = [
  { name: "Active", value: 85, color: "var(--chart-1)" },
  { name: "Maintenance", value: 10, color: "var(--chart-2)" },
  { name: "Offline", value: 5, color: "var(--destructive)" },
];

const recentSales = [
  { id: 1, machine: "Lobby Snack #04", product: "Cola Zero", amount: formatUZS(31250), time: "2 min ago", status: "success" },
  { id: 2, machine: "Gym Drink #02", product: "Protein Bar", amount: formatUZS(50000), time: "5 min ago", status: "success" },
  { id: 3, machine: "Office Coffee #01", product: "Latte", amount: formatUZS(43750), time: "12 min ago", status: "pending" },
  { id: 4, machine: "Lobby Snack #04", product: "Chips", amount: formatUZS(21875), time: "15 min ago", status: "success" },
];

export default function Dashboard() {
  const stats = [
    { title: "Total Revenue", value: formatUZS(155625000), change: "+12.5%", icon: DollarSign, trend: "up" },
    { title: "Active Machines", value: "142/150", change: "+2", icon: Activity, trend: "up" },
    { title: "Total Sales", value: "3,842", change: "+8.2%", icon: ShoppingCart, trend: "up" },
    { title: "Alerts", value: "5", change: "-2", icon: AlertTriangle, trend: "down", isNegative: true },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
          <div>
            <h1 className="text-4xl font-heading font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-600 mt-2 text-sm">Overview of your vending empire</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors backdrop-blur-md">
              Export Report
            </button>
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">
              + Add Machine
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {stats.map((stat, i) => (
            <Card key={i} className="border-white/10 bg-white/5 backdrop-blur-md shadow-xl hover:bg-white/10 transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">
                  {stat.title}
                </CardTitle>
                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/20 transition-colors">
                  <stat.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs flex items-center mt-1">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="w-3 h-3 mr-1 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-1 text-rose-400" />
                  )}
                  <span className={stat.trend === "up" ? "text-emerald-400" : "text-rose-400"}>
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground ml-1">from last month</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2 border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Machine Status */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Machine Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={machineStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {machineStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-white">150</span>
                  <span className="text-sm text-muted-foreground">Total Machines</span>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {machineStatusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Admin Actions & Recent Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentAdminActions />
          
          <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{sale.product}</p>
                        <p className="text-xs text-muted-foreground">{sale.machine}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{sale.amount}</p>
                      <p className="text-xs text-muted-foreground">{sale.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
