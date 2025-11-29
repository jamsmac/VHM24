import * as db from "../db";

/**
 * Check inventory levels and create notifications for managers/admins
 * when products fall below their threshold
 */
export async function checkLowStockAlerts() {
  console.log("[LowStockAlerts] Running low stock alert check...");
  
  try {
    // Get all low stock items (threshold: 10)
    const lowStockItems = await db.getLowStockAlerts(10);
    
    if (lowStockItems.length === 0) {
      console.log("[LowStockAlerts] No low stock items found");
      return;
    }
    
    console.log(`[LowStockAlerts] Found ${lowStockItems.length} low stock items`);
    
    // Get all managers and admins to notify
    const managers = await db.getUsersByRole("manager");
    const admins = await db.getUsersByRole("admin");
    const usersToNotify = [...managers, ...admins];
    
    if (usersToNotify.length === 0) {
      console.log("[LowStockAlerts] No managers or admins to notify");
      return;
    }
    
    // Group low stock items by product
    const productMap = new Map<number, typeof lowStockItems>();
    lowStockItems.forEach(item => {
      const existing = productMap.get(item.productId) || [];
      productMap.set(item.productId, [...existing, item]);
    });
    
    // Create notifications for each manager/admin
    for (const user of usersToNotify) {
      // Create one notification summarizing all low stock items
      const productCount = productMap.size;
      const totalItems = lowStockItems.length;
      
      const productList = Array.from(productMap.entries())
        .slice(0, 3)
        .map(([_, items]) => {
          const item = items[0];
          const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
          return `${item.productName} (${totalQty} total)`;
        })
        .join(", ");
      
      const message = productCount > 3
        ? `${productCount} products are running low across ${totalItems} locations. Including: ${productList}, and ${productCount - 3} more.`
        : `${productCount} products are running low: ${productList}.`;
      
      await db.createNotification({
        userId: user.id,
        type: "low_stock",
        title: `Low Stock Alert: ${productCount} Products`,
        message,
        relatedType: "inventory",
      });
      
      console.log(`[LowStockAlerts] Created notification for user ${user.id} (${user.name})`);
    }
    
    console.log(`[LowStockAlerts] Successfully created ${usersToNotify.length} notifications`);
  } catch (error) {
    console.error("[LowStockAlerts] Error checking low stock alerts:", error);
  }
}

/**
 * Schedule the low stock alert job to run daily
 * This function should be called on server startup
 */
export function scheduleLowStockAlerts() {
  // Run immediately on startup
  checkLowStockAlerts();
  
  // Schedule to run daily at 8:00 AM
  const DAILY_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // Calculate time until next 8:00 AM
  const now = new Date();
  const next8AM = new Date();
  next8AM.setHours(8, 0, 0, 0);
  
  if (next8AM <= now) {
    // If 8:00 AM has passed today, schedule for tomorrow
    next8AM.setDate(next8AM.getDate() + 1);
  }
  
  const timeUntilNext8AM = next8AM.getTime() - now.getTime();
  
  // Schedule first run at 8:00 AM
  setTimeout(() => {
    checkLowStockAlerts();
    
    // Then schedule to run every 24 hours
    setInterval(checkLowStockAlerts, DAILY_INTERVAL);
  }, timeUntilNext8AM);
  
  console.log(`[LowStockAlerts] Scheduled to run daily at 8:00 AM (next run in ${Math.round(timeUntilNext8AM / 1000 / 60)} minutes)`);
}
