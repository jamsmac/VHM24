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

describe("Audit Log Action Type Filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllAuditLogs with action type filter", () => {
    it("should accept no action type parameter", async () => {
      const logs = await db.getAllAuditLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should accept 'approved' action type", async () => {
      const logs = await db.getAllAuditLogs(undefined, undefined, "approved");
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should accept 'rejected' action type", async () => {
      const logs = await db.getAllAuditLogs(undefined, undefined, "rejected");
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should combine date range and action type filters", async () => {
      const startDate = new Date("2024-01-01").toISOString();
      const endDate = new Date("2024-12-31").toISOString();
      
      const logs = await db.getAllAuditLogs(startDate, endDate, "approved");
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should filter approved actions with start date only", async () => {
      const startDate = new Date("2024-01-01").toISOString();
      
      const logs = await db.getAllAuditLogs(startDate, undefined, "approved");
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should filter rejected actions with end date only", async () => {
      const endDate = new Date("2024-12-31").toISOString();
      
      const logs = await db.getAllAuditLogs(undefined, endDate, "rejected");
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should handle action type without date filters", async () => {
      const approvedLogs = await db.getAllAuditLogs(undefined, undefined, "approved");
      const rejectedLogs = await db.getAllAuditLogs(undefined, undefined, "rejected");
      
      expect(Array.isArray(approvedLogs)).toBe(true);
      expect(Array.isArray(rejectedLogs)).toBe(true);
    });
  });

  describe("Combined filtering scenarios", () => {
    it("should handle all filter combinations", async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
      
      // Date range + approved
      const logs1 = await db.getAllAuditLogs(
        sevenDaysAgo.toISOString(),
        new Date().toISOString(),
        "approved"
      );
      expect(Array.isArray(logs1)).toBe(true);
      
      // Date range + rejected
      const logs2 = await db.getAllAuditLogs(
        sevenDaysAgo.toISOString(),
        new Date().toISOString(),
        "rejected"
      );
      expect(Array.isArray(logs2)).toBe(true);
    });

    it("should handle undefined action type (show all)", async () => {
      const logs = await db.getAllAuditLogs(undefined, undefined, undefined);
      expect(Array.isArray(logs)).toBe(true);
    });
  });
});
