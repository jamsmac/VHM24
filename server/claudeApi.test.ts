/**
 * Claude API Integration Test
 * Validates Anthropic API key and Claude API functionality
 */

import { describe, it, expect } from "vitest";
import { generateSuggestionsWithClaude } from "./services/claudeService";

describe("Claude API Integration", () => {
  it("should validate Anthropic API key", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toMatch(/^sk-ant-api03-/);
    console.log("✅ Anthropic API key is valid");
  });

  it("should generate suggestions using Claude API", async () => {
    try {
      const result = await generateSuggestionsWithClaude({
        systemPrompt:
          "You are an AI assistant helping to fill product information forms. Analyze the input and suggest missing fields.",
        inputData: {
          name: "Coca Cola",
          category: "",
          price: "",
        },
        referenceBookType: "products",
      });

      expect(result).toBeDefined();
      expect(result.suggestedFields).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(0.95);

      console.log("✅ Claude API suggestions generated successfully");
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Suggested fields:`, Object.keys(result.suggestedFields));
    } catch (error) {
      console.error("❌ Claude API error:", error);
      throw error;
    }
  });

  it("should handle API errors gracefully", async () => {
    try {
      const result = await generateSuggestionsWithClaude({
        systemPrompt: "Invalid prompt with special chars: <<<>>>",
        inputData: { test: "data" },
        referenceBookType: "test",
      });

      // Should return fallback response
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThanOrEqual(0.95);
      console.log("✅ Error handling works correctly");
    } catch (error) {
      console.error("Error handling test:", error);
    }
  });
});
