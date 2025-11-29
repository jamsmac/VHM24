import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const notificationsRouter = router({
  // Get user notifications
  list: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getUserNotifications(ctx.user.id, input?.limit);
    }),

  // Get unread count
  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const count = await db.getUnreadNotificationCount(ctx.user.id);
      return { count };
    }),

  // Mark as read
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await db.markNotificationAsRead(input.notificationId, ctx.user.id);
    }),

  // Mark all as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await db.markAllNotificationsAsRead(ctx.user.id);
    }),
});
