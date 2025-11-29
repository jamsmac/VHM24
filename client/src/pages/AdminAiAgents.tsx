/**
 * AI-Agent Management Dashboard
 * Admin page for managing AI-agents for reference books
 */

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  History,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AiAgentImprovements } from "@/components/AiAgentImprovements";

export function AdminAiAgents() {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");

  // Get all agents
  const { data: agents, isLoading, refetch } = trpc.aiAgents.list.useQuery();

  // Get agent stats
  const { data: agentStats } = trpc.aiAgents.getStats.useQuery(
    { agentId: selectedAgent || 0 },
    { enabled: !!selectedAgent }
  );

  const updatePromptMutation = trpc.aiAgents.updatePrompt.useMutation();

  const handleSelectAgent = (agentId: number) => {
    setSelectedAgent(agentId);
    const agent = (agents || []).find((a: any) => a.id === agentId);
    if (agent) {
      setNewPrompt(agent.systemPrompt);
    }
  };

  const handleUpdatePrompt = async () => {
    if (!selectedAgent || !newPrompt.trim()) {
      toast.error("Please enter a valid prompt");
      return;
    }

    try {
      await updatePromptMutation.mutateAsync({
        agentId: selectedAgent,
        newPrompt,
      });
      toast.success("Agent prompt updated successfully");
      setEditingPrompt(false);
      refetch();
    } catch (error) {
      toast.error("Failed to update agent prompt");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentAgent = (agents || []).find((a: any) => a.id === selectedAgent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-600" />
            AI-Agent Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage AI-agents for reference books and review their performance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Agent List */}
        <Card className="lg:col-span-1 p-4">
          <h2 className="font-semibold mb-4">Active Agents</h2>
          <div className="space-y-2">
            {(agents || []).map((agent: any) => (
              <button
                key={agent.id}
                onClick={() => handleSelectAgent(agent.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  selectedAgent === agent.id
                    ? "border-purple-600 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-sm">{agent.displayName}</div>
                <div className="text-xs text-gray-500 mt-1">{agent.referenceBookType}</div>
                <Badge className="mt-2" variant={agent.status === "active" ? "default" : "secondary"}>
                  {agent.status}
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* Agent Details */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedAgent ? (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select an agent to view details</p>
            </Card>
          ) : (
            <>
              {/* Agent Info */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{currentAgent?.displayName}</h2>
                    <p className="text-gray-600 mt-1">
                      Type: <span className="font-semibold">{currentAgent?.referenceBookType}</span>
                    </p>
                  </div>
                  <Badge variant={currentAgent?.status === "active" ? "default" : "secondary"}>
                    {currentAgent?.status}
                  </Badge>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="prompt" className="mt-6">
                  <TabsList>
                    <TabsTrigger value="prompt" className="gap-2">
                      <Settings className="h-4 w-4" />
                      System Prompt
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Statistics
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                      <History className="h-4 w-4" />
                      History
                    </TabsTrigger>
                  </TabsList>

                  {/* System Prompt Tab */}
                  <TabsContent value="prompt" className="space-y-4 mt-4">
                    {!editingPrompt ? (
                      <>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {currentAgent?.systemPrompt}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingPrompt(true)}
                            className="gap-2"
                          >
                            <Settings className="h-4 w-4" />
                            Edit Prompt
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <textarea
                          value={newPrompt}
                          onChange={(e) => setNewPrompt(e.target.value)}
                          rows={8}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter system prompt..."
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingPrompt(false)}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUpdatePrompt}
                            disabled={updatePromptMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {updatePromptMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* Statistics Tab */}
                  <TabsContent value="stats" className="space-y-4 mt-4">
                    {agentStats ? (
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 bg-blue-50 border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Total Suggestions</p>
                              <p className="text-3xl font-bold text-blue-600">
                                {(agentStats as any).totalSuggestions || 0}
                              </p>
                            </div>
                            <Brain className="h-8 w-8 text-blue-400" />
                          </div>
                        </Card>

                        <Card className="p-4 bg-green-50 border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Confirmed</p>
                              <p className="text-3xl font-bold text-green-600">
                                {(agentStats as any).confirmedSuggestions || 0}
                              </p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-400" />
                          </div>
                        </Card>

                        <Card className="p-4 bg-purple-50 border-purple-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Avg Confidence</p>
                              <p className="text-3xl font-bold text-purple-600">
                                {((agentStats as any).averageConfidence || 0).toFixed(1)}%
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-purple-400" />
                          </div>
                        </Card>

                        <Card className="p-4 bg-orange-50 border-orange-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Accuracy Rate</p>
                              <p className="text-3xl font-bold text-orange-600">
                                {((agentStats as any).accuracyRate || 0).toFixed(1)}%
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-orange-400" />
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <p className="text-gray-600">No statistics available yet</p>
                    )}
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="space-y-4 mt-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Version {currentAgent?.version || 1} - Last updated{" "}
                      {currentAgent?.updatedAt
                        ? new Date(currentAgent.updatedAt).toLocaleDateString()
                        : "Never"}
                    </p>
                    <Card className="p-4 bg-gray-50">
                      <p className="text-sm text-gray-600">
                        Created by: {currentAgent?.createdBy}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Last modified by: {currentAgent?.updatedBy || "N/A"}
                      </p>
                    </Card>
                  </TabsContent>
                </Tabs>
              </Card>

              {/* Improvements Section */}
              <Card className="p-6">
                <AiAgentImprovements onImprovementApproved={() => refetch()} />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
