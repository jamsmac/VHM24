/**
 * AI-Agent Improvements Management Component
 * Allows admins to review and approve/reject AI-agent improvements
 */

import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Improvement {
  id: number;
  agentId: number;
  proposedPrompt: string;
  proposedChanges: string;
  reasoning: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface AiAgentImprovementsProps {
  onImprovementApproved?: () => void;
}

export function AiAgentImprovements({ onImprovementApproved }: AiAgentImprovementsProps) {
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingImprovements, isLoading, refetch } = trpc.aiAgents.getPendingImprovements.useQuery();

  React.useEffect(() => {
    if (pendingImprovements) {
      setImprovements((pendingImprovements || []) as any);
    }
  }, [pendingImprovements]);

  const approveMutation = trpc.aiAgents.approveImprovement.useMutation();
  const rejectMutation = trpc.aiAgents.rejectImprovement.useMutation();

  const handleApprove = async (improvement: Improvement) => {
    try {
      await approveMutation.mutateAsync({ improvementId: improvement.id });
      toast.success("Improvement approved and applied");
      setImprovements(improvements.filter((i) => i.id !== improvement.id));
      onImprovementApproved?.();
      void refetch();
    } catch (error) {
      toast.error("Failed to approve improvement");
      console.error(error);
    }
  };

  const handleReject = async (improvement: Improvement) => {
    try {
      await rejectMutation.mutateAsync({
        improvementId: improvement.id,
        reason: rejectionReason || "No reason provided",
      });
      toast.success("Improvement rejected");
      setImprovements(improvements.filter((i) => i.id !== improvement.id));
      setRejectionReason("");
      void refetch();
    } catch (error) {
      toast.error("Failed to reject improvement");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  if (improvements.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pending Improvements</h3>
        <p className="text-gray-500">All AI-agent improvements have been reviewed.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Pending AI Improvements</h2>
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
          {improvements.length} pending
        </span>
      </div>

      {improvements.map((improvement) => (
        <Card key={improvement.id} className="p-4 border-l-4 border-l-yellow-500">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Agent Improvement Proposal</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(improvement.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Proposed Changes:</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {improvement.reasoning}
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">New System Prompt:</h4>
              <p className="text-sm text-blue-800 whitespace-pre-wrap line-clamp-3">
                {improvement.proposedPrompt}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => handleReject(improvement)}
                disabled={rejectMutation.isPending}
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={() => handleApprove(improvement)}
                disabled={approveMutation.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve & Apply
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
