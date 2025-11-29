/**
 * AI-Agent Suggestions Component
 * Displays AI-generated suggestions for form fields
 */

import React, { useState } from "react";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AiAgentSuggestionsProps {
  agentId: number;
  referenceBookId?: number;
  inputData: Record<string, any>;
  onSuggestionsReceived?: (suggestions: Record<string, any>) => void;
  onConfirm?: (suggestions: Record<string, any>) => void;
}

export function AiAgentSuggestions({
  agentId,
  referenceBookId,
  inputData,
  onSuggestionsReceived,
  onConfirm,
}: AiAgentSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [suggestionId, setSuggestionId] = useState<number | null>(null);

  const generateMutation = trpc.aiAgents.generateSuggestions.useMutation();
  const confirmMutation = trpc.aiAgents.confirmSuggestion.useMutation();
  const rejectMutation = trpc.aiAgents.rejectSuggestion.useMutation();

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    try {
      const result = await generateMutation.mutateAsync({
        agentId,
        referenceBookId,
        inputData,
      });

      setSuggestions((result.suggestion as any).suggestedFields);
      setConfidence(result.confidence);
      setSuggestionId((result.suggestion as any).id);
      onSuggestionsReceived?.((result.suggestion as any).suggestedFields);

      toast.success("AI suggestions generated successfully");
    } catch (error) {
      toast.error("Failed to generate suggestions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!suggestionId) return;

    try {
      await confirmMutation.mutateAsync({ suggestionId });
      toast.success("Suggestion confirmed and saved");
      onConfirm?.(suggestions || {});
      setSuggestions(null);
      setSuggestionId(null);
      setConfidence(null);
    } catch (error) {
      toast.error("Failed to confirm suggestion");
      console.error(error);
    }
  };

  const handleReject = async () => {
    if (!suggestionId) return;

    try {
      await rejectMutation.mutateAsync({
        suggestionId,
        reason: "User rejected suggestion",
      });
      toast.info("Suggestion rejected");
      setSuggestions(null);
      setSuggestionId(null);
      setConfidence(null);
    } catch (error) {
      toast.error("Failed to reject suggestion");
      console.error(error);
    }
  };

  if (!suggestions || Object.keys(suggestions).length === 0) {
    return (
      <Button
        onClick={handleGenerateSuggestions}
        disabled={loading}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            AI Suggestions
          </>
        )}
      </Button>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">AI Suggestions</h3>
            {confidence && (
              <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                {Math.round(confidence * 100)}% confident
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {Object.entries(suggestions).map(([key, value]) => (
            <div
              key={key}
              className="bg-white p-3 rounded-lg border border-purple-100"
            >
              <div className="text-sm font-medium text-gray-700 mb-1">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </div>
              <div className="text-sm text-gray-900 font-semibold">
                {String(value)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            onClick={handleReject}
            disabled={rejectMutation.isPending}
            variant="ghost"
            size="sm"
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            size="sm"
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Check className="h-4 w-4" />
            Use Suggestions
          </Button>
        </div>
      </div>
    </Card>
  );
}
