/**
 * AI-Agents tRPC Router
 */

import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as aiAgentsDb from "../aiAgents";

export const aiAgentsRouter = router({
  /**
   * Get all active agents
   */
  list: publicProcedure.query(async () => {
    return await aiAgentsDb.getAllAgents();
  }),

  /**
   * Get agent by reference book type
   */
  getByType: publicProcedure
    .input(z.object({ referenceBookType: z.string() }))
    .query(async ({ input }: any) => {
      return await aiAgentsDb.getAgentByType(input.referenceBookType);
    }),

  /**
   * Create new agent (admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        referenceBookType: z.string(),
        displayName: z.string(),
        systemPrompt: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");

      return await aiAgentsDb.createAiAgent({
        referenceBookType: input.referenceBookType,
        displayName: input.displayName,
        systemPrompt: input.systemPrompt,
        createdBy: ctx.user.id,
      });
    }),

  /**
   * Update agent prompt (admin only)
   */
  updatePrompt: adminProcedure
    .input(
      z.object({
        agentId: z.number(),
        newPrompt: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");

      return await aiAgentsDb.updateAgentPrompt(
        input.agentId,
        input.newPrompt,
        ctx.user.id
      );
    }),

  /**
   * Generate suggestions for input
   */
  generateSuggestions: publicProcedure
    .input(
      z.object({
        agentId: z.number(),
        referenceBookId: z.number().optional(),
        inputData: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input }: any) => {
      // In a real implementation, this would call Claude API
      // For now, return mock suggestions
      const confidence = Math.random() * 0.5 + 0.5; // 0.5-1.0

      const suggestion = await aiAgentsDb.createSuggestion({
        agentId: input.agentId,
        referenceBookId: input.referenceBookId,
        inputData: input.inputData,
        suggestedFields: {
          // Mock suggestions based on input
          category: input.inputData.name?.split(" ")[0] || "General",
          status: "active",
        },
        confidence,
      });

      return {
        success: true,
        suggestion,
        confidence,
      };
    }),

  /**
   * Confirm suggestion
   */
  confirmSuggestion: publicProcedure
    .input(z.object({ suggestionId: z.number() }))
    .mutation(async ({ input, ctx }: any) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");

      return await aiAgentsDb.confirmSuggestion(input.suggestionId, ctx.user.id);
    }),

  /**
   * Reject suggestion
   */
  rejectSuggestion: publicProcedure
    .input(
      z.object({
        suggestionId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }: any) => {
      return await aiAgentsDb.rejectSuggestion(input.suggestionId, input.reason);
    }),

  /**
   * Get suggestion history
   */
  getSuggestionHistory: publicProcedure
    .input(
      z.object({
        agentId: z.number(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }: any) => {
      return await aiAgentsDb.getSuggestionHistory(input.agentId, input.limit);
    }),

  /**
   * Get pending improvements
   */
  getPendingImprovements: adminProcedure.query(async () => {
    return await aiAgentsDb.getPendingImprovements();
  }),

  /**
   * Approve improvement
   */
  approveImprovement: adminProcedure
    .input(z.object({ improvementId: z.number() }))
    .mutation(async ({ input, ctx }: any) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");

      return await aiAgentsDb.approveImprovement(input.improvementId, ctx.user.id);
    }),

  /**
   * Reject improvement
   */
  rejectImprovement: adminProcedure
    .input(
      z.object({
        improvementId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      if (!ctx.user?.id) throw new Error("Not authenticated");

      return await aiAgentsDb.rejectImprovement(
        input.improvementId,
        input.reason,
        ctx.user.id
      );
    }),

  /**
   * Get agent statistics
   */
  getStats: publicProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input }: any) => {
      return await aiAgentsDb.getAgentStats(input.agentId);
    }),
});
