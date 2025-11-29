/**
 * Claude API Service for AI-Agent Suggestions
 * Integrates with Anthropic Claude API for intelligent field suggestions
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SuggestionRequest {
  systemPrompt: string;
  inputData: Record<string, any>;
  referenceBookType: string;
}

interface SuggestionResponse {
  suggestedFields: Record<string, any>;
  confidence: number;
  reasoning: string;
}

/**
 * Generate suggestions using Claude API
 */
export async function generateSuggestionsWithClaude(
  request: SuggestionRequest
): Promise<SuggestionResponse> {
  try {
    // Build the user message with input data
    const userMessage = `
Based on the following input data, please suggest values for missing or incomplete fields.
Return your response as a JSON object with suggested field values.

Input Data:
${JSON.stringify(request.inputData, null, 2)}

Please analyze this data and provide intelligent suggestions for completing the form.
Consider common patterns, naming conventions, and business logic for ${request.referenceBookType}.
Return ONLY valid JSON with the suggested fields, no markdown or extra text.
`;

    const response = await client.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      system: request.systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract the text content from the response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse the JSON response
    let suggestedFields: Record<string, any>;
    try {
      suggestedFields = JSON.parse(content.text);
    } catch (e) {
      console.error("Failed to parse Claude response:", content.text);
      throw new Error("Invalid JSON response from Claude");
    }

    // Calculate confidence based on response quality
    const confidence = calculateConfidence(suggestedFields, request.inputData);

    return {
      suggestedFields,
      confidence,
      reasoning: `Generated ${Object.keys(suggestedFields).length} suggestions based on input data`,
    };
  } catch (error) {
    console.error("Claude API error:", error);
    throw new Error(`Failed to generate suggestions: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Calculate confidence score for suggestions
 */
function calculateConfidence(
  suggestedFields: Record<string, any>,
  inputData: Record<string, any>
): number {
  // Base confidence: 0.5 (50%)
  let confidence = 0.5;

  // Increase confidence if we have good input data
  const filledInputFields = Object.values(inputData).filter(
    (v) => v && v !== ""
  ).length;
  const totalInputFields = Object.keys(inputData).length;

  if (totalInputFields > 0) {
    const fillRatio = filledInputFields / totalInputFields;
    confidence += fillRatio * 0.3; // Up to +30%
  }

  // Increase confidence if we generated multiple suggestions
  const suggestionCount = Object.keys(suggestedFields).length;
  if (suggestionCount > 0) {
    confidence += Math.min(suggestionCount * 0.05, 0.2); // Up to +20%
  }

  // Cap at 95% (never 100% confident)
  return Math.min(confidence, 0.95);
}

/**
 * Analyze input data for patterns
 */
export async function analyzeDataPatterns(
  referenceBookType: string,
  historicalData: Record<string, any>[]
): Promise<string> {
  try {
    const analysisPrompt = `
Analyze the following historical data for ${referenceBookType} and identify common patterns, naming conventions, and best practices.
Provide insights that can help generate better suggestions for new entries.

Historical Data:
${JSON.stringify(historicalData.slice(0, 10), null, 2)}

Provide a concise analysis of patterns and recommendations.
`;

    const response = await client.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text;
    }

    return "Unable to analyze patterns";
  } catch (error) {
    console.error("Pattern analysis error:", error);
    return "Pattern analysis failed";
  }
}

/**
 * Generate improvement suggestions for agent prompt
 */
export async function generatePromptImprovement(
  currentPrompt: string,
  suggestionHistory: Record<string, any>[],
  confirmationRate: number
): Promise<{
  improvedPrompt: string;
  reasoning: string;
}> {
  try {
    const improvementPrompt = `
You are an AI expert helping to improve a system prompt for an AI-agent that generates field suggestions.

Current Prompt:
${currentPrompt}

Recent Suggestion History (${suggestionHistory.length} suggestions):
${JSON.stringify(suggestionHistory.slice(-5), null, 2)}

Confirmation Rate: ${(confirmationRate * 100).toFixed(1)}%

Based on this information, suggest an improved version of the system prompt that would:
1. Increase the confirmation rate of suggestions
2. Better understand the domain
3. Generate more accurate and relevant suggestions

Return your response as JSON with:
{
  "improvedPrompt": "the improved prompt text",
  "reasoning": "explanation of improvements"
}
`;

    const response = await client.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: improvementPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const result = JSON.parse(content.text);
    return {
      improvedPrompt: result.improvedPrompt,
      reasoning: result.reasoning,
    };
  } catch (error) {
    console.error("Prompt improvement error:", error);
    throw new Error(
      `Failed to generate improvement: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
