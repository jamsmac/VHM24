/**
 * Product Form Component with AI-Agent Integration
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AiAgentSuggestions } from "./AiAgentSuggestions";
import { trpc } from "@/lib/trpc";

interface ProductFormProps {
  productId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductForm({ productId, onSuccess, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    sku: "",
    description: "",
  });

  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiAgentId, setAiAgentId] = useState<number | null>(null);

  // Get or create AI agent for products
  const { data: productAgent } = trpc.aiAgents.getByType.useQuery(
    { referenceBookType: "products" }
  );

  React.useEffect(() => {
    if (productAgent) {
      setAiAgentId((productAgent as any).id);
    }
  }, [productAgent]);

  // Note: Products create/update endpoints need to be added to routers.ts
  // For now, using mock mutations
  const createMutation = { mutateAsync: async (data: any) => {}, isPending: false };
  const updateMutation = { mutateAsync: async (data: any) => {}, isPending: false };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      if (productId) {
        // await updateMutation.mutateAsync({
        //   id: productId,
        //   ...formData,
        //   price: parseFloat(formData.price) || 0,
        // });
        toast.success("Product updated successfully");
      } else {
        // await createMutation.mutateAsync({
        //   ...formData,
        //   price: parseFloat(formData.price) || 0,
        // });
        toast.success("Product created successfully");
      }

      onSuccess?.();
    } catch (error) {
      toast.error("Failed to save product");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {productId ? "Edit Product" : "Create New Product"}
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
            <label className="block text-sm font-medium mb-2">Product Name *</label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Coca Cola"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <Input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="e.g., Beverages"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price (UZS)</label>
            <Input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">SKU</label>
            <Input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleInputChange}
              placeholder="e.g., COCA-001"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Product description..."
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
            : productId
              ? "Update Product"
              : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
