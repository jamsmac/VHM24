import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const inventoryRouter = router({
  /**
   * Get all inventory items grouped by level
   */
  getByLevel: protectedProcedure
    .input(z.object({
      level: z.enum(['warehouse', 'operator', 'machine']).optional(),
      locationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await db.getInventoryByLevel(input.level, input.locationId);
    }),

  /**
   * Get inventory for a specific product across all levels
   */
  getByProduct: protectedProcedure
    .input(z.object({
      productId: z.number(),
    }))
    .query(async ({ input }) => {
      return await db.getInventoryByProduct(input.productId);
    }),

  /**
   * Get all inventory items with product details
   */
  getAll: protectedProcedure
    .query(async () => {
      return await db.getAllInventory();
    }),

  /**
   * Update inventory quantity
   */
  updateQuantity: protectedProcedure
    .input(z.object({
      id: z.number(),
      quantity: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      return await db.updateInventoryQuantity(input.id, input.quantity);
    }),

  /**
   * Get low stock alerts
   */
  getLowStockAlerts: protectedProcedure
    .input(z.object({
      threshold: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      return await db.getLowStockAlerts(input.threshold);
    }),

  /**
   * Create stock transfer request
   */
  createTransfer: protectedProcedure
    .input(z.object({
      productId: z.number(),
      quantity: z.number().min(1),
      priority: z.enum(['low', 'normal', 'urgent']).default('normal'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await db.createStockTransfer({
        ...input,
        requestedBy: ctx.user.id,
      });
    }),

  /**
   * Get all stock transfers
   */
  getTransfers: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'rejected', 'completed']).optional(),
    }))
    .query(async ({ input }) => {
      return await db.getStockTransfers(input.status);
    }),

  /**
   * Update stock transfer status
   */
  updateTransferStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'approved', 'rejected', 'completed']),
    }))
    .mutation(async ({ input }) => {
      return await db.updateStockTransferStatus(input.id, input.status);
    }),

  /**
   * Get inventory statistics
   */
  getStats: protectedProcedure
    .query(async () => {
      return await db.getInventoryStats();
    }),
});
