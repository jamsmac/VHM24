import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, AlertTriangle, Calendar, CheckCircle2, Clock, History, MapPin, Settings, Wrench } from "lucide-react";
import { Layout } from "../components/Layout";

export default function ComponentLifecycle() {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                <Settings className="w-5 h-5" />
              </Button>
              <h1 className="text-3xl font-bold text-white tracking-tight">Grinder Unit #402</h1>
            </div>
            <p className="text-slate-400 flex items-center gap-2">
              <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                Serial: GR-2024-X99
              </Badge>
              <span className="text-slate-600">•</span>
              <span>Model: ProGrind 5000</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="destructive" className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 mr-2" /> Report Issue
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white">
              <Wrench className="w-4 h-4 mr-2" /> Schedule Maintenance
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Status Card */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl md:col-span-1">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="text-green-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Operational
                </span>
                <span className="text-xs text-green-300/70">Since 2 days ago</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Current Location</p>
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    <span>Machine #1 - Central Station</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Installation Date</p>
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>Oct 15, 2024</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Next Service Due</p>
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Clock className="w-4 h-4" />
                    <span>Nov 30, 2024 (in 2 days)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Health Score</span>
                  <span className="text-white font-medium">85%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 w-[85%]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lifecycle History */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl md:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Lifecycle History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="relative border-l border-white/10 ml-3 space-y-8 py-2">
                  {[
                    {
                      date: "Nov 27, 2024",
                      time: "14:30",
                      type: "Maintenance",
                      title: "Routine Cleaning",
                      user: "Alex Operator",
                      note: "Cleaned burrs and calibrated grind size.",
                      status: "Completed"
                    },
                    {
                      date: "Oct 15, 2024",
                      time: "09:15",
                      type: "Installation",
                      title: "Installed in Machine #1",
                      user: "Sarah Tech",
                      note: "Replaced old unit #305. Tested OK.",
                      status: "Completed"
                    },
                    {
                      date: "Oct 14, 2024",
                      time: "16:00",
                      type: "Repair",
                      title: "Motor Brush Replacement",
                      user: "Workshop Center",
                      note: "Replaced worn brushes. Bench tested for 2 hours.",
                      status: "Completed"
                    },
                    {
                      date: "Oct 10, 2024",
                      time: "11:45",
                      type: "Removal",
                      title: "Removed from Machine #5",
                      user: "Alex Operator",
                      note: "Motor making grinding noise. Sent to workshop.",
                      status: "Issue Reported"
                    },
                    {
                      date: "Jan 12, 2024",
                      time: "08:00",
                      type: "Purchase",
                      title: "Unit Acquired",
                      user: "System",
                      note: "Batch import from Supplier A.",
                      status: "New"
                    }
                  ].map((event, i) => (
                    <div key={i} className="relative pl-8">
                      <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#0f172a] ${
                        event.type === 'Installation' ? 'bg-green-500' :
                        event.type === 'Removal' ? 'bg-red-500' :
                        event.type === 'Repair' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{event.title}</span>
                        <span className="text-xs text-slate-500">{event.date} • {event.time}</span>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-[10px] h-5 bg-white/10 text-slate-300 hover:bg-white/20">
                            {event.type}
                          </Badge>
                          <span className="text-xs text-slate-400">by {event.user}</span>
                        </div>
                        <p className="text-sm text-slate-300">{event.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
