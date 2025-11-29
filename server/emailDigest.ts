import { sendEmail } from "./email";
import * as db from "./db";

export interface DigestStats {
  totalRequests: number;
  pendingRequests: number;
  approvedToday: number;
  rejectedToday: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
}

export interface DigestConfig {
  frequency: "daily" | "weekly";
  recipients: string[];
  enabled: boolean;
}

/**
 * Generate statistics for email digest
 */
export async function generateDigestStats(period: "day" | "week"): Promise<DigestStats> {
  const now = new Date();
  const startDate = new Date(now);
  
  if (period === "day") {
    startDate.setHours(0, 0, 0, 0);
  } else {
    // Start of week (Monday)
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);
  }
  
  const allRequests = await db.getAllAccessRequests();
  const pendingRequests = await db.getPendingAccessRequests();
  const auditLogs = await db.getAllAuditLogs(startDate.toISOString(), now.toISOString());
  
  const approvedToday = auditLogs.filter(log => {
    const logDate = new Date(log.createdAt);
    return log.action === "approved" && logDate >= startDate;
  }).length;
  
  const rejectedToday = auditLogs.filter(log => {
    const logDate = new Date(log.createdAt);
    return log.action === "rejected" && logDate >= startDate;
  }).length;
  
  // For weekly stats, calculate from start of week
  const weekStart = new Date(now);
  const weekDay = weekStart.getDay();
  const weekDiff = weekStart.getDate() - weekDay + (weekDay === 0 ? -6 : 1);
  weekStart.setDate(weekDiff);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekLogs = await db.getAllAuditLogs(weekStart.toISOString(), now.toISOString());
  
  const approvedThisWeek = weekLogs.filter(log => log.action === "approved").length;
  const rejectedThisWeek = weekLogs.filter(log => log.action === "rejected").length;
  
  return {
    totalRequests: allRequests.length,
    pendingRequests: pendingRequests.length,
    approvedToday,
    rejectedToday,
    approvedThisWeek,
    rejectedThisWeek,
  };
}

/**
 * Generate HTML email template for digest
 */
export function generateDigestEmailHTML(stats: DigestStats, period: "daily" | "weekly"): string {
  const periodText = period === "daily" ? "за сегодня" : "за неделю";
  const approvedCount = period === "daily" ? stats.approvedToday : stats.approvedThisWeek;
  const rejectedCount = period === "daily" ? stats.rejectedToday : stats.rejectedThisWeek;
  
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VendHub - Отчет ${periodText}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">VendHub Manager</h1>
      <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Отчет по заявкам ${periodText}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">Статистика</h2>
      
      <!-- Stats Grid -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td style="padding: 20px; background-color: #f8fafc; border-radius: 8px; width: 48%;">
            <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">Всего заявок</div>
            <div style="font-size: 32px; font-weight: bold; color: #1e293b;">${stats.totalRequests}</div>
          </td>
          <td style="width: 4%;"></td>
          <td style="padding: 20px; background-color: #fef3c7; border-radius: 8px; width: 48%;">
            <div style="font-size: 14px; color: #92400e; margin-bottom: 8px;">На рассмотрении</div>
            <div style="font-size: 32px; font-weight: bold; color: #b45309;">${stats.pendingRequests}</div>
          </td>
        </tr>
      </table>
      
      <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Обработано ${periodText}</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px; background-color: #dcfce7; border-radius: 8px; width: 48%;">
            <div style="font-size: 14px; color: #166534; margin-bottom: 8px;">✓ Одобрено</div>
            <div style="font-size: 32px; font-weight: bold; color: #15803d;">${approvedCount}</div>
          </td>
          <td style="width: 4%;"></td>
          <td style="padding: 20px; background-color: #fee2e2; border-radius: 8px; width: 48%;">
            <div style="font-size: 14px; color: #991b1b; margin-bottom: 8px;">✗ Отклонено</div>
            <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${rejectedCount}</div>
          </td>
        </tr>
      </table>
      
      ${stats.pendingRequests > 0 ? `
      <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Внимание:</strong> У вас ${stats.pendingRequests} ${stats.pendingRequests === 1 ? 'заявка' : 'заявок'} на рассмотрении. 
          Пожалуйста, проверьте и обработайте их.
        </p>
      </div>
      ` : ''}
    </div>
    
    <!-- Footer -->
    <div style="padding: 30px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        Это автоматическое уведомление от VendHub Manager
      </p>
      <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
        ${new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send digest email to administrators
 */
export async function sendDigestEmail(config?: DigestConfig): Promise<void> {
  const digestConfig = config || await getDigestConfigFromDB();
  
  if (!digestConfig.enabled || digestConfig.recipients.length === 0) {
    console.log("📧 Email digest is disabled or no recipients configured");
    return;
  }
  
  const period = digestConfig.frequency === "daily" ? "day" : "week";
  const stats = await generateDigestStats(period);
  
  const subject = digestConfig.frequency === "daily" 
    ? `VendHub - Ежедневный отчет (${new Date().toLocaleDateString('ru-RU')})`
    : `VendHub - Еженедельный отчет (${new Date().toLocaleDateString('ru-RU')})`;
  
  const html = generateDigestEmailHTML(stats, digestConfig.frequency);
  
  for (const recipient of digestConfig.recipients) {
    try {
      await sendEmail({ to: recipient, subject, html });
      console.log(`📧 Digest email sent to ${recipient}`);
    } catch (error) {
      console.error(`❌ Failed to send digest email to ${recipient}:`, error);
    }
  }
}

/**
 * Get default digest configuration
 * In production, this should be stored in database
 */
export async function getDigestConfigFromDB(): Promise<DigestConfig> {
  const config = await db.getDigestConfig();
  
  if (config) {
    return {
      enabled: config.enabled,
      frequency: config.frequency as "daily" | "weekly",
      recipients: JSON.parse(config.recipients),
    };
  }
  
  // Return default if no config in database
  return getDefaultDigestConfig();
}

export function getDefaultDigestConfig(): DigestConfig {
  return {
    frequency: "daily",
    recipients: process.env.DIGEST_RECIPIENTS?.split(',') || [],
    enabled: process.env.DIGEST_ENABLED === "true",
  };
}
