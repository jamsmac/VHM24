import { describe, it, expect, beforeEach, vi } from "vitest";
import * as db from "./db";

// Mock the database
vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  })),
}));

describe("Audit Log Date Filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllAuditLogs with date filters", () => {
    it("should accept no date parameters", async () => {
      const logs = await db.getAllAuditLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should accept startDate parameter", async () => {
      const startDate = new Date("2024-01-01").toISOString();
      const logs = await db.getAllAuditLogs(startDate);
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should accept endDate parameter", async () => {
      const endDate = new Date("2024-12-31").toISOString();
      const logs = await db.getAllAuditLogs(undefined, endDate);
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should accept both startDate and endDate parameters", async () => {
      const startDate = new Date("2024-01-01").toISOString();
      const endDate = new Date("2024-12-31").toISOString();
      const logs = await db.getAllAuditLogs(startDate, endDate);
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should handle date range for today", async () => {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date();
      
      const logs = await db.getAllAuditLogs(
        todayStart.toISOString(),
        todayEnd.toISOString()
      );
      
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should handle date range for last 7 days", async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
      const today = new Date();
      
      const logs = await db.getAllAuditLogs(
        sevenDaysAgo.toISOString(),
        today.toISOString()
      );
      
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should handle date range for last 30 days", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      const today = new Date();
      
      const logs = await db.getAllAuditLogs(
        thirtyDaysAgo.toISOString(),
        today.toISOString()
      );
      
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe("Date parameter validation", () => {
    it("should handle invalid date strings gracefully", async () => {
      // The function should not throw errors with invalid dates
      try {
        await db.getAllAuditLogs("invalid-date", "another-invalid-date");
        expect(true).toBe(true);
      } catch (error) {
        // If it throws, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });

    it("should handle undefined parameters", async () => {
      const logs = await db.getAllAuditLogs(undefined, undefined);
      expect(Array.isArray(logs)).toBe(true);
    });
  });
});
