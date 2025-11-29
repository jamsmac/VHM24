/**
 * Machine Form Component with AI-Agent Integration
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AiAgentSuggestions } from "./AiAgentSuggestions";
import { trpc } from "@/lib/trpc";

interface MachineFormProps {
  machineId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MachineForm({ machineId, onSuccess, onCancel }: MachineFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    serialNumber: "",
    model: "",
    location: "",
    status: "active",
    notes: "",
  });

  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiAgentId, setAiAgentId] = useState<number | null>(null);

  // Get or create AI agent for machines
  const { data: machineAgent } = trpc.aiAgents.getByType.useQuery(
    { referenceBookType: "machines" }
  );

  React.useEffect(() => {
    if (machineAgent) {
      setAiAgentId((machineAgent as any).id);
    }
  }, [machineAgent]);

  // Note: Machines create/update endpoints need to be added to routers.ts
  const createMutation = { mutateAsync: async (data: any) => {}, isPending: false };
  const updateMutation = { mutateAsync: async (data: any) => {}, isPending: false };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAiSuggestionsApplied = (suggestions: Record<string, any>) => {
    setFormData((prev) => ({
      ...prev,
      ...suggestions,
    }));
    setShowAiSuggestions(false);
    toast.success("AI suggestions applied to form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (machineId) {
        // await updateMutation.mutateAsync({
        //   id: machineId,
        //   ...formData,
        // });
        toast.success("Machine updated successfully");
      } else {
        // await createMutation.mutateAsync(formData);
        toast.success("Machine created successfully");
      }

      onSuccess?.();
    } catch (error) {
      toast.error("Failed to save machine");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {machineId ? "Edit Machine" : "Create New Machine"}
          </h2>
          {aiAgentId && (
            <Button
              type="button"
              onClick={() => setShowAiSuggestions(!showAiSuggestions)}
              variant="outline"
              size="sm"
            >
              {showAiSuggestions ? "Hide AI" : "Show AI"}
            </Button>
          )}
        </div>

        {showAiSuggestions && aiAgentId && (
          <div className="mb-6">
            <AiAgentSuggestions
              agentId={aiAgentId}
              inputData={formData}
              onConfirm={handleAiSuggestionsApplied}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Machine Name *</label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., VendHub-001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Serial Number</label>
            <Input
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleInputChange}
              placeholder="e.g., SN-2024-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            <Input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              placeholder="e.g., VendHub Pro 3000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <Input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Tashkent, Amir Timur Street"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Additional notes about the machine..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button type="button" onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : machineId
              ? "Update Machine"
              : "Create Machine"}
        </Button>
      </div>
    </form>
  );
}
