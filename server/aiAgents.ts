/**
 * AI-Agent Database Functions
 * Handles all database operations for AI-agents system
 */

import { getDb } from "./db";
import { eq, and } from "drizzle-orm";
import { aiAgents, aiSuggestions, aiImprovements, aiLearningData } from "../drizzle/schema";

/**
 * Create a new AI-agent for a reference book
 */
export async function createAiAgent(data: {
  referenceBookType: string;
  displayName: string;
  systemPrompt: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiAgents).values({
    referenceBookType: data.referenceBookType,
    displayName: data.displayName,
    systemPrompt: data.systemPrompt,
    status: "active",
    version: 1,
    createdBy: data.createdBy,
  });

  return result;
}

/**
 * Get agent by reference book type
 */
export async function getAgentByType(referenceBookType: string) {
  const db = await getDb();
  if (!db) return null;

  const agents = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.referenceBookType, referenceBookType));

  return agents[0] || null;
}

/**
 * Get all active agents
 */
export async function getAllAgents() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.status, "active"));
}

/**
 * Update agent system prompt (admin only)
 */
export async function updateAgentPrompt(
  agentId: number,
  newPrompt: string,
  updatedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current version
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  const current = await dbInstance
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.id, agentId));
  
  const newVersion = ((current[0] as any)?.version || 1) + 1;

  return await dbInstance
    .update(aiAgents)
    .set({
      systemPrompt: newPrompt,
      version: newVersion,
      updatedBy: updatedBy,
    })
    .where(eq(aiAgents.id, agentId));
}

/**
 * Create a suggestion from AI-agent
 */
export async function createSuggestion(data: {
  agentId: number;
  referenceBookId?: number;
  inputData: Record<string, any>;
  suggestedFields: Record<string, any>;
  confidence: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(aiSuggestions).values({
    agentId: data.agentId,
    referenceBookId: data.referenceBookId || null,
    inputData: JSON.stringify(data.inputData),
    suggestedFields: JSON.stringify(data.suggestedFields),
    confidence: data.confidence as any,
    confirmed: false,
  } as any);
}

/**
 * Confirm a suggestion (user feedback)
 */
export async function confirmSuggestion(
  suggestionId: number,
  confirmedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(aiSuggestions)
    .set({
      confirmed: true,
      confirmedBy,
      confirmedAt: new Date().toISOString(),
    })
    .where(eq(aiSuggestions.id, suggestionId));
}

/**
 * Reject a suggestion with reason
 */
export async function rejectSuggestion(
  suggestionId: number,
  reason: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(aiSuggestions)
    .set({
      confirmed: false,
      rejectedReason: reason,
    })
    .where(eq(aiSuggestions.id, suggestionId));
}

/**
 * Get suggestion history for an agent
 */
export async function getSuggestionHistory(agentId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.agentId, agentId))
    .limit(limit);
}

/**
 * Create improvement proposal for agent
 */
export async function createImprovement(data: {
  agentId: number;
  proposedPrompt: string;
  proposedChanges: Record<string, any>;
  reasoning: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(aiImprovements).values({
    agentId: data.agentId,
    proposedPrompt: data.proposedPrompt,
    proposedChanges: JSON.stringify(data.proposedChanges),
    reasoning: data.reasoning,
    status: "pending",
  } as any);
}

/**
 * Get pending improvements for admin approval
 */
export async function getPendingImprovements() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(aiImprovements)
    .where(eq(aiImprovements.status, "pending"));
}

/**
 * Approve improvement (admin only)
 */
export async function approveImprovement(
  improvementId: number,
  approvedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the improvement
  const improvements = await db
    .select()
    .from(aiImprovements)
    .where(eq(aiImprovements.id, improvementId));

  const improvement = improvements[0];
  if (!improvement) throw new Error("Improvement not found");

  // Update improvement status
  await db
    .update(aiImprovements)
    .set({
      status: "approved",
      approvedBy,
      approvedAt: new Date().toISOString(),
    })
    .where(eq(aiImprovements.id, improvementId));

  // Update agent prompt with the proposed prompt
  await updateAgentPrompt(improvement.agentId, improvement.proposedPrompt, approvedBy);

  return improvement;
}

/**
 * Reject improvement (admin only)
 */
export async function rejectImprovement(
  improvementId: number,
  reason: string,
  rejectedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(aiImprovements)
    .set({
      status: "rejected",
      rejectionReason: reason,
      approvedBy: rejectedBy,
      approvedAt: new Date().toISOString(),
    })
    .where(eq(aiImprovements.id, improvementId));
}

/**
 * Record learning data from confirmed suggestions
 */
export async function recordLearning(data: {
  agentId: number;
  fieldName: string;
  inputPattern: string;
  suggestedValue: string;
  confirmed: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if learning data already exists
  const existing = await db
    .select()
    .from(aiLearningData)
    .where(
      and(
        eq(aiLearningData.agentId, data.agentId),
        eq(aiLearningData.fieldName, data.fieldName),
        eq(aiLearningData.inputPattern, data.inputPattern),
        eq(aiLearningData.suggestedValue, data.suggestedValue)
      )
    );

  if (existing.length > 0) {
    // Update existing learning data
    const current = existing[0];
    const currentConfRate = typeof current.confirmationRate === 'number' ? current.confirmationRate : parseFloat(current.confirmationRate as any) || 0;
    const currentRejRate = typeof current.rejectionRate === 'number' ? current.rejectionRate : parseFloat(current.rejectionRate as any) || 0;
    
    const confirmationRate = data.confirmed
      ? (currentConfRate + 1) / (currentConfRate + currentRejRate + 1)
      : currentConfRate / (currentConfRate + currentRejRate + 1);

    return await db
      .update(aiLearningData)
      .set({
        confirmationRate: confirmationRate as any,
        lastUsed: new Date().toISOString(),
      })
      .where(eq(aiLearningData.id, current.id));
  } else {
    // Create new learning data
    return await db.insert(aiLearningData).values({
      agentId: data.agentId,
      fieldName: data.fieldName,
      inputPattern: data.inputPattern,
      suggestedValue: data.suggestedValue,
      confirmationRate: (data.confirmed ? 1 : 0) as any,
      rejectionRate: (data.confirmed ? 0 : 1) as any,
      lastUsed: new Date().toISOString(),
    });
  }
}

/**
 * Get learning statistics for an agent
 */
export async function getAgentStats(agentId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get suggestion stats
  const suggestions = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.agentId, agentId));

  const confirmed = suggestions.filter((s: any) => s.confirmed).length;
  const rejected = suggestions.filter((s: any) => !s.confirmed && s.rejectedReason).length;
  const totalSuggestions = suggestions.length;

  // Get learning data
  const learningData = await db
    .select()
    .from(aiLearningData)
    .where(eq(aiLearningData.agentId, agentId));

  const avgConfidence = suggestions.length > 0
    ? suggestions.reduce((sum: number, s: any) => sum + (parseFloat(s.confidence as any) || 0), 0) / suggestions.length
    : 0;

  return {
    totalSuggestions,
    confirmed,
    rejected,
    confirmationRate: totalSuggestions > 0 ? (confirmed / totalSuggestions) * 100 : 0,
    avgConfidence,
    learningDataPoints: learningData.length,
  };
}


/**
 * Generate suggestions using Claude API
 */
export async function generateSuggestionsWithClaude(
  agentId: number,
  inputData: Record<string, any>
): Promise<{
  suggestedFields: Record<string, any>;
  confidence: number;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get agent details
    const agents = await db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.id, agentId));

    const agent = agents[0];
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Import Claude service
    const { generateSuggestionsWithClaude: claudeGenerate } = await import(
      "./services/claudeService"
    );

    // Generate suggestions using Claude
    const result = await claudeGenerate({
      systemPrompt: agent.systemPrompt,
      inputData,
      referenceBookType: agent.referenceBookType,
    });

    return {
      suggestedFields: result.suggestedFields,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error("Error generating suggestions with Claude:", error);
    // Fallback to mock suggestions if Claude fails
    return {
      suggestedFields: {},
      confidence: 0.5,
    };
  }
}
