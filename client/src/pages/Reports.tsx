import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Calendar, DollarSign, Download, FileSpreadsheet, FileText, PieChart, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Layout } from "../components/Layout";

const revenueData = [
  { name: "Mon", revenue: 4000, profit: 2400 },
  { name: "Tue", revenue: 3000, profit: 1398 },
  { name: "Wed", revenue: 2000, profit: 9800 },
  { name: "Thu", revenue: 2780, profit: 3908 },
  { name: "Fri", revenue: 1890, profit: 4800 },
  { name: "Sat", revenue: 2390, profit: 3800 },
  { name: "Sun", revenue: 3490, profit: 4300 },
];

const categoryData = [
  { name: "Coffee", value: 45, color: "#3b82f6" },
  { name: "Snacks", value: 30, color: "#8b5cf6" },
  { name: "Cold Drinks", value: 15, color: "#10b981" },
  { name: "Other", value: 10, color: "#f59e0b" },
];

const discrepancyData = [
  { machine: "Machine #1 (Central)", product: "Coca Cola 0.5L", expected: 15, actual: 14, diff: -1, value: "-$1.50" },
  { machine: "Machine #3 (Uni)", product: "Snickers", expected: 24, actual: 24, diff: 0, value: "$0.00" },
  { machine: "Machine #5 (Mall)", product: "Water 0.5L", expected: 10, actual: 8, diff: -2, value: "-$2.00" },
  { machine: "Machine #2 (Office)", product: "Espresso Beans", expected: 500, actual: 480, diff: -20, value: "-$5.00" },
  { machine: "Machine #1 (Central)", product: "Lay's Chips", expected: 8, actual: 8, diff: 0, value: "$0.00" },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState("financials");

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Analytics & Reports</h1>
            <p className="text-slate-400 mt-2">Deep dive into your business performance.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
              <Calendar className="w-4 h-4 mr-2" /> Last 30 Days
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white">
              <Download className="w-4 h-4 mr-2" /> Export All
            </Button>
          </div>
        </div>

        <Tabs defaultValue="financials" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="financials" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" /> Financials
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <AlertTriangle className="w-4 h-4 mr-2" /> Discrepancies
            </TabsTrigger>
            <TabsTrigger value="operational" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" /> Operational
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="financials" className="space-y-6">
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">$45,231.89</div>
                    <p className="text-xs text-green-400 flex items-center mt-1">
                      <ArrowUpRight className="w-3 h-3 mr-1" /> +20.1% from last month
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Net Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">$12,450.00</div>
                    <p className="text-xs text-blue-400 flex items-center mt-1">
                      <ArrowUpRight className="w-3 h-3 mr-1" /> +12.5% margin
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Avg. Ticket</CardTitle>
                    <PieChart className="h-4 w-4 text-purple-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">$2.45</div>
                    <p className="text-xs text-slate-400 flex items-center mt-1">
                      <ArrowDownRight className="w-3 h-3 mr-1" /> -0.4% from last month
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Expenses</CardTitle>
                    <ArrowDownRight className="h-4 w-4 text-red-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">$32,781.89</div>
                    <p className="text-xs text-red-400 flex items-center mt-1">
                      <ArrowUpRight className="w-3 h-3 mr-1" /> +4.1% (Procurement)
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white">Revenue vs Profit</CardTitle>
                    <CardDescription className="text-slate-400">Daily performance over the last week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                          <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white">Sales by Category</CardTitle>
                    <CardDescription className="text-slate-400">Distribution of product types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                             contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                          />
                          <Legend />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Discrepancy Report</CardTitle>
                    <CardDescription className="text-slate-400">Calculated vs. Actual stock levels from recent refills</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5">
                      <FileText className="w-4 h-4 mr-2" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5">
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-white/10 overflow-hidden">
                    <div className="grid grid-cols-6 bg-white/5 p-4 text-sm font-medium text-slate-300">
                      <div className="col-span-2">Machine / Location</div>
                      <div>Product</div>
                      <div className="text-center">Expected</div>
                      <div className="text-center">Actual</div>
                      <div className="text-right">Diff / Value</div>
                    </div>
                    <div className="divide-y divide-white/5">
                      {discrepancyData.map((item, i) => (
                        <div key={i} className="grid grid-cols-6 p-4 text-sm hover:bg-white/5 transition-colors items-center">
                          <div className="col-span-2 text-white font-medium">{item.machine}</div>
                          <div className="text-slate-400">{item.product}</div>
                          <div className="text-center text-slate-400">{item.expected}</div>
                          <div className="text-center text-white">{item.actual}</div>
                          <div className="text-right">
                            <div className={`font-bold ${item.diff < 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {item.diff > 0 ? '+' : ''}{item.diff}
                            </div>
                            <div className="text-xs text-slate-500">{item.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="operational" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Machine Uptime */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white">Fleet Uptime</CardTitle>
                    <CardDescription className="text-slate-400">Average machine availability over the last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { day: "Mon", uptime: 98.5 },
                          { day: "Tue", uptime: 99.2 },
                          { day: "Wed", uptime: 97.8 },
                          { day: "Thu", uptime: 99.5 },
                          { day: "Fri", uptime: 96.4 },
                          { day: "Sat", uptime: 98.9 },
                          { day: "Sun", uptime: 99.1 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis domain={[90, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            cursor={{ fill: '#ffffff10' }}
                          />
                          <Bar dataKey="uptime" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Technician Performance */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white">Technician Performance</CardTitle>
                    <CardDescription className="text-slate-400">Tasks completed vs. Avg resolution time (mins)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {[
                        { name: "Alex K.", tasks: 45, time: 28, rating: 4.8 },
                        { name: "Sarah M.", tasks: 38, time: 35, rating: 4.9 },
                        { name: "Mike R.", tasks: 52, time: 22, rating: 4.7 },
                        { name: "David L.", tasks: 31, time: 45, rating: 4.5 },
                      ].map((tech, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                              {tech.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{tech.name}</p>
                              <p className="text-xs text-slate-500">{tech.tasks} tasks completed</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <p className="text-white">{tech.time}m</p>
                              <p className="text-xs text-slate-500">Avg Time</p>
                            </div>
                            <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
                              ★ {tech.rating}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
