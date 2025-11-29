import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLocation("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/25">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">VendHub Manager</h1>
          <p className="text-slate-400 mt-2">Secure Enterprise Access</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Welcome back</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 mb-6">
                <TabsTrigger value="password" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  Password
                </TabsTrigger>
                <TabsTrigger value="2fa" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  2FA Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="password">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input 
                        id="email" 
                        placeholder="admin@vendhub.com" 
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-slate-300">Password</Label>
                      <a href="#" className="text-xs text-blue-400 hover:text-blue-300">Forgot password?</a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input 
                        id="password" 
                        type="password" 
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" disabled={isLoading}>
                    {isLoading ? "Authenticating..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="2fa">
                <div className="space-y-4 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                    <Smartphone className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    Please enter the 6-digit code from your authenticator app.
                  </p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Input 
                        key={i}
                        className="w-10 h-12 text-center text-xl font-bold bg-white/5 border-white/10 text-white focus:border-blue-500/50"
                        maxLength={1}
                      />
                    ))}
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-4">
                    Verify & Login
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-white/5 pt-6">
            <p className="text-xs text-slate-500">
              Protected by Enterprise Grade Security
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
