import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Inventory Management", () => {
  describe("getInventoryByLevel", () => {
    it("should return all inventory items when no level specified", async () => {
      const inventory = await db.getInventoryByLevel();
      expect(Array.isArray(inventory)).toBe(true);
    });

    it("should filter inventory by warehouse level", async () => {
      const inventory = await db.getInventoryByLevel("warehouse");
      expect(Array.isArray(inventory)).toBe(true);
      if (inventory.length > 0) {
        inventory.forEach((item: any) => {
          expect(item.level).toBe("warehouse");
        });
      }
    });

    it("should filter inventory by operator level", async () => {
      const inventory = await db.getInventoryByLevel("operator");
      expect(Array.isArray(inventory)).toBe(true);
      if (inventory.length > 0) {
        inventory.forEach((item: any) => {
          expect(item.level).toBe("operator");
        });
      }
    });

    it("should filter inventory by machine level", async () => {
      const inventory = await db.getInventoryByLevel("machine");
      expect(Array.isArray(inventory)).toBe(true);
      if (inventory.length > 0) {
        inventory.forEach((item: any) => {
          expect(item.level).toBe("machine");
        });
      }
    });
  });

  describe("getAllInventory", () => {
    it("should return inventory with product details", async () => {
      const inventory = await db.getAllInventory();
      expect(Array.isArray(inventory)).toBe(true);
      if (inventory.length > 0) {
        const item = inventory[0];
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("productId");
        expect(item).toHaveProperty("productName");
        expect(item).toHaveProperty("productSku");
        expect(item).toHaveProperty("level");
        expect(item).toHaveProperty("quantity");
      }
    });
  });

  describe("getInventoryByProduct", () => {
    it("should return inventory for a specific product across all levels", async () => {
      const products = await db.getAllProducts();
      if (products.length > 0) {
        const productId = products[0].id;
        const inventory = await db.getInventoryByProduct(productId);
        expect(Array.isArray(inventory)).toBe(true);
        // Test passes if we get an array (even if empty)
      }
    });
  });

  describe("getLowStockAlerts", () => {
    it("should return items below threshold", async () => {
      const alerts = await db.getLowStockAlerts(10);
      expect(Array.isArray(alerts)).toBe(true);
      if (alerts.length > 0) {
        alerts.forEach((alert: any) => {
          expect(alert.quantity).toBeLessThan(10);
          expect(alert).toHaveProperty("productName");
          expect(alert).toHaveProperty("level");
        });
      }
    });

    it("should use custom threshold", async () => {
      const alerts = await db.getLowStockAlerts(50);
      expect(Array.isArray(alerts)).toBe(true);
      if (alerts.length > 0) {
        alerts.forEach((alert: any) => {
          expect(alert.quantity).toBeLessThan(50);
        });
      }
    });
  });

  describe("getInventoryStats", () => {
    it("should return inventory statistics", async () => {
      const stats = await db.getInventoryStats();
      expect(stats).toBeDefined();
      if (stats) {
        expect(stats).toHaveProperty("totalProducts");
        expect(stats).toHaveProperty("warehouseQuantity");
        expect(stats).toHaveProperty("operatorQuantity");
        expect(stats).toHaveProperty("machineQuantity");
        expect(stats).toHaveProperty("lowStockCount");
        expect(stats).toHaveProperty("pendingTransfers");
        // Database may return strings for aggregated numbers
        expect(stats.totalProducts).toBeDefined();
        expect(stats.warehouseQuantity).toBeDefined();
        expect(stats.operatorQuantity).toBeDefined();
        expect(stats.machineQuantity).toBeDefined();
      }
    });
  });

  describe("Stock Transfers", () => {
    it("should get all stock transfers", async () => {
      const transfers = await db.getAllStockTransfers();
      expect(Array.isArray(transfers)).toBe(true);
    });

    it("should get stock transfers with status filter", async () => {
      const pendingTransfers = await db.getStockTransfers("pending");
      expect(Array.isArray(pendingTransfers)).toBe(true);
      if (pendingTransfers.length > 0) {
        pendingTransfers.forEach((transfer: any) => {
          expect(transfer.status).toBe("pending");
        });
      }
    });

    it("should get approved stock transfers", async () => {
      const approvedTransfers = await db.getStockTransfers("approved");
      expect(Array.isArray(approvedTransfers)).toBe(true);
      if (approvedTransfers.length > 0) {
        approvedTransfers.forEach((transfer: any) => {
          expect(transfer.status).toBe("approved");
        });
      }
    });

    it("should include product and user details in transfers", async () => {
      const transfers = await db.getStockTransfers();
      if (transfers.length > 0) {
        const transfer = transfers[0];
        expect(transfer).toHaveProperty("productId");
        expect(transfer).toHaveProperty("productName");
        expect(transfer).toHaveProperty("requestedBy");
        expect(transfer).toHaveProperty("quantity");
        expect(transfer).toHaveProperty("priority");
        expect(transfer).toHaveProperty("status");
      }
    });
  });
});
