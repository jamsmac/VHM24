import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const stockTransfersRouter = router({
  // Get pending transfers (admin only)
  getPending: protectedProcedure
    .query(async ({ ctx }: { ctx: any }) => {
      // Check if user is admin or manager
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: Admin or Manager role required");
      }
      
      return await db.getPendingStockTransfers();
    }),

  // Approve transfer (admin only)
  approve: protectedProcedure
    .input(z.object({
      transferId: z.number(),
    }))
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      // Check if user is admin or manager
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: Admin or Manager role required");
      }
      
      const result = await db.approveStockTransfer(
        input.transferId,
        ctx.user.id,
        ctx.user.name || "Unknown"
      );
      
      return result;
    }),

  // Reject transfer (admin only)
  reject: protectedProcedure
    .input(z.object({
      transferId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      // Check if user is admin or manager
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: Admin or Manager role required");
      }
      
      const result = await db.rejectStockTransfer(
        input.transferId,
        ctx.user.id,
        ctx.user.name || "Unknown",
        input.reason
      );
      
      return result;
    }),

  // Create transfer request
  create: protectedProcedure
    .input(z.object({
      productId: z.number(),
      quantity: z.number().min(1),
      priority: z.enum(["low", "normal", "urgent"]).default("normal"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      const transfer = await db.createStockTransfer({
        productId: input.productId,
        requestedBy: ctx.user.id,
        quantity: input.quantity,
        priority: input.priority,
        notes: input.notes,
      });
      
      return transfer;
    }),

  // Get all transfers with filters
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "rejected", "completed"]).optional(),
    }).optional())
    .query(async ({ input }: { input: any }) => {
      return await db.getStockTransfers(input?.status);
    }),
});
