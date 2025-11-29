import cron from "node-cron";
import { sendDigestEmail, getDigestConfigFromDB } from "./emailDigest";

/**
 * Schedule daily email digest
 * Runs every day at 9:00 AM
 */
export function scheduleDailyDigest() {
  // Run at 9:00 AM every day
  const task = cron.schedule("0 9 * * *", async () => {
    console.log("📅 Running daily email digest...");
    try {
      const config = await getDigestConfigFromDB();
      if (config.frequency === "daily") {
        await sendDigestEmail(config);
      }
    } catch (error) {
      console.error("❌ Error sending daily digest:", error);
    }
  }, {
    timezone: "Asia/Tashkent" // Adjust to your timezone
  });
  
  return task;
}

/**
 * Schedule weekly email digest
 * Runs every Monday at 9:00 AM
 */
export function scheduleWeeklyDigest() {
  // Run at 9:00 AM every Monday
  const task = cron.schedule("0 9 * * 1", async () => {
    console.log("📅 Running weekly email digest...");
    try {
      const config = await getDigestConfigFromDB();
      if (config.frequency === "weekly") {
        await sendDigestEmail(config);
      }
    } catch (error) {
      console.error("❌ Error sending weekly digest:", error);
    }
  }, {
    timezone: "Asia/Tashkent" // Adjust to your timezone
  });
  
  return task;
}

/**
 * Initialize all scheduled tasks
 */
export async function initializeScheduler() {
  const config = await getDigestConfigFromDB();
  
  if (!config.enabled) {
    console.log("📧 Email digest scheduler is disabled");
    return;
  }
  
  console.log("📅 Initializing email digest scheduler...");
  
  if (config.frequency === "daily") {
    const dailyTask = scheduleDailyDigest();
    dailyTask.start();
    console.log("✅ Daily email digest scheduled for 9:00 AM");
  } else if (config.frequency === "weekly") {
    const weeklyTask = scheduleWeeklyDigest();
    weeklyTask.start();
    console.log("✅ Weekly email digest scheduled for Monday 9:00 AM");
  }
}

/**
 * Manually trigger digest email (for testing)
 */
export async function triggerDigestNow() {
  console.log("📧 Manually triggering email digest...");
  const config = await getDigestConfigFromDB();
  await sendDigestEmail(config);
}
