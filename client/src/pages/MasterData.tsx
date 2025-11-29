import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Box, Coffee, MapPin, Plus, Search, Settings, Truck, Upload } from "lucide-react";
import { useState } from "react";
import { Layout } from "../components/Layout";

export default function MasterData() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Master Data</h1>
            <p className="text-slate-400 mt-2">Single Source of Truth for your vending empire.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
              <Upload className="w-4 h-4 mr-2" /> Import Excel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add New
            </Button>
          </div>
        </div>

        <Tabs defaultValue="products" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="products" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Coffee className="w-4 h-4 mr-2" /> Products & Recipes
            </TabsTrigger>
            <TabsTrigger value="locations" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <MapPin className="w-4 h-4 mr-2" /> Locations
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Truck className="w-4 h-4 mr-2" /> Suppliers
            </TabsTrigger>
            <TabsTrigger value="components" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" /> Components
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder={`Search ${activeTab}...`} 
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500/50"
                />
              </div>
            </div>

            <TabsContent value="products" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  { name: "Cappuccino Classic", type: "Drink", cost: "$0.45", price: "$2.50", ingredients: 3 },
                  { name: "Espresso Intenso", type: "Drink", cost: "$0.20", price: "$1.80", ingredients: 2 },
                  { name: "Snickers Bar", type: "Snack", cost: "$0.60", price: "$1.50", ingredients: 1 },
                  { name: "Coca Cola 0.5L", type: "Drink", cost: "$0.55", price: "$1.50", ingredients: 1 },
                  { name: "Latte Macchiato", type: "Drink", cost: "$0.50", price: "$2.80", ingredients: 3 },
                  { name: "Hot Chocolate", type: "Drink", cost: "$0.40", price: "$2.20", ingredients: 4 },
                ].map((item, i) => (
                  <Card key={i} className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer group">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                          {item.type}
                        </Badge>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardTitle className="text-white mt-2">{item.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-slate-500">Cost</p>
                          <p className="text-white font-medium">{item.cost}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Price</p>
                          <p className="text-white font-medium">{item.price}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 p-2 rounded">
                        <Box className="w-3 h-3" />
                        {item.ingredients} Ingredients linked
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="locations">
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y divide-white/5">
                      {[
                        { name: "Central Station Hall A", type: "Public Transport", machines: 4, status: "Active" },
                        { name: "Tech Park Building 3", type: "Office", machines: 2, status: "Active" },
                        { name: "University Library", type: "Education", machines: 3, status: "Maintenance" },
                        { name: "City Mall Food Court", type: "Retail", machines: 5, status: "Active" },
                      ].map((loc, i) => (
                        <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">{loc.name}</h4>
                              <p className="text-sm text-slate-400">{loc.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm text-white font-medium">{loc.machines} Machines</p>
                              <p className="text-xs text-slate-500">Deployed</p>
                            </div>
                            <Badge variant="outline" className={
                              loc.status === "Active" 
                                ? "border-green-500/30 text-green-400 bg-green-500/10" 
                                : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                            }>
                              {loc.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
