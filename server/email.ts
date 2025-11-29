import nodemailer from "nodemailer";

// SMTP Configuration
const SMTP_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "jamshidsmac@gmail.com",
    pass: "dhpj lunc pxoh wqba",
  },
};

const FROM_EMAIL = '"VendHub Manager" <jamshidsmac@gmail.com>';

// Create reusable transporter
const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection error:", error);
  } else {
    console.log("✅ SMTP server is ready to send emails");
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    });

    console.log("✅ Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error);
    return false;
  }
}

// Email Templates
export function getAccessRequestApprovedEmail(data: {
  firstName: string;
  role: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Заявка одобрена!</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${data.firstName}!</p>
          <p>Ваша заявка на доступ к системе <strong>VendHub Manager</strong> была одобрена.</p>
          <p><strong>Назначенная роль:</strong> ${getRoleNameRu(data.role)}</p>
          <p>Теперь вы можете войти в систему и начать работу.</p>
          <a href="https://3000-ijyosa6pfv3kquq2snv8q-e22a62cd.manusvm.computer" class="button">Войти в систему</a>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Если у вас возникнут вопросы, свяжитесь с администратором через Telegram бот @vhm24bot.
          </p>
        </div>
        <div class="footer">
          <p>© 2024 VendHub Manager. Все права защищены.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getAccessRequestRejectedEmail(data: {
  firstName: string;
  reason?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Заявка отклонена</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${data.firstName}!</p>
          <p>К сожалению, ваша заявка на доступ к системе <strong>VendHub Manager</strong> была отклонена.</p>
          ${data.reason ? `<p><strong>Причина:</strong> ${data.reason}</p>` : ""}
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Если вы считаете, что это ошибка, пожалуйста, свяжитесь с администратором через Telegram бот @vhm24bot.
          </p>
        </div>
        <div class="footer">
          <p>© 2024 VendHub Manager. Все права защищены.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getRoleNameRu(role: string): string {
  const roles: Record<string, string> = {
    operator: "Оператор",
    manager: "Менеджер",
    admin: "Администратор",
  };
  return roles[role] || role;
}
