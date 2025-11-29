import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Check, Clock, MessageSquare, Shield, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Layout } from "../components/Layout";

interface Request {
  id: string;
  telegramId: string;
  username: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
}

export default function TelegramOnboarding() {
  const [requests, setRequests] = useState<Request[]>([
    { id: "1", telegramId: "123456789", username: "@alex_tech", requestedAt: "2025-01-21 10:30", status: "pending" },
    { id: "2", telegramId: "987654321", username: "@maria_ops", requestedAt: "2025-01-21 11:15", status: "pending" },
    { id: "3", telegramId: "456123789", username: "@john_doe", requestedAt: "2025-01-20 09:45", status: "approved" },
  ]);

  const handleApprove = (id: string) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: "approved" } : r));
  };

  const handleReject = (id: string) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: "rejected" } : r));
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Telegram Onboarding</h1>
          <p className="text-slate-400 mt-2">Manage access requests from the Telegram bot.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pending Requests */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-400" />
                    New Requests
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Approve or reject incoming access requests
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {requests.filter(r => r.status === "pending").length} Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {requests.filter(r => r.status === "pending").map((req) => (
                    <div key={req.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{req.username}</h4>
                            <p className="text-xs text-slate-400">ID: {req.telegramId}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <span className="text-xs text-slate-500">{req.requestedAt}</span>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleReject(req.id)}
                          >
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 bg-blue-600 hover:bg-blue-500 text-white"
                            onClick={() => handleApprove(req.id)}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {requests.filter(r => r.status === "pending").length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No pending requests
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Bot Configuration & Status */}
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  Bot Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-green-400">System Online</p>
                      <p className="text-xs text-green-500/70">@VendHubManagerBot is active</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-green-500/30 text-green-400 hover:bg-green-500/20">
                    Test Connection
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300">Role Mapping</h4>
                  <div className="space-y-2">
                    {[
                      { role: "SuperAdmin", access: "Full Access + User Management" },
                      { role: "Manager", access: "Tasks, Inventory, Reports" },
                      { role: "Operator", access: "My Tasks, Stock Updates" },
                      { role: "Technician", access: "Maintenance Tasks Only" }
                    ].map((role, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded hover:bg-white/5">
                        <span className="text-white font-medium">{role.role}</span>
                        <span className="text-slate-500">{role.access}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { user: "@john_doe", action: "Approved as Operator", time: "2 hours ago" },
                    { user: "@sarah_mgr", action: "Role changed to Manager", time: "5 hours ago" },
                    { user: "@mike_tech", action: "Request Rejected", time: "1 day ago" }
                  ].map((log, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-1 h-1 rounded-full bg-slate-500" />
                      <span className="text-blue-400 font-medium">{log.user}</span>
                      <span className="text-slate-400">{log.action}</span>
                      <span className="text-slate-600 ml-auto">{log.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
