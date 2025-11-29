import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, getAccessRequestApprovedEmail, getAccessRequestRejectedEmail } from "./email";

// Mock nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
      verify: vi.fn((callback) => callback(null, true)),
    })),
  },
}));

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendEmail", () => {
    it("should send email successfully", async () => {
      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result).toBe(true);
    });

    it("should include text version when not provided", async () => {
      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      });

      expect(result).toBe(true);
    });
  });

  describe("getAccessRequestApprovedEmail", () => {
    it("should generate approval email with correct content", () => {
      const html = getAccessRequestApprovedEmail({
        firstName: "Иван",
        role: "operator",
      });

      expect(html).toContain("Иван");
      expect(html).toContain("Заявка одобрена");
      expect(html).toContain("Оператор");
    });

    it("should handle manager role", () => {
      const html = getAccessRequestApprovedEmail({
        firstName: "Мария",
        role: "manager",
      });

      expect(html).toContain("Мария");
      expect(html).toContain("Менеджер");
    });

    it("should handle admin role", () => {
      const html = getAccessRequestApprovedEmail({
        firstName: "Алексей",
        role: "admin",
      });

      expect(html).toContain("Алексей");
      expect(html).toContain("Администратор");
    });
  });

  describe("getAccessRequestRejectedEmail", () => {
    it("should generate rejection email without reason", () => {
      const html = getAccessRequestRejectedEmail({
        firstName: "Петр",
      });

      expect(html).toContain("Петр");
      expect(html).toContain("отклонена");
      expect(html).not.toContain("Причина:");
    });

    it("should generate rejection email with reason", () => {
      const html = getAccessRequestRejectedEmail({
        firstName: "Ольга",
        reason: "Недостаточно информации",
      });

      expect(html).toContain("Ольга");
      expect(html).toContain("отклонена");
      expect(html).toContain("Причина:");
      expect(html).toContain("Недостаточно информации");
    });
  });
});
