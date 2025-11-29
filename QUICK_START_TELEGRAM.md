# 🚀 Telegram Module Quick Start Guide

Get your Telegram bot up and running in 5 minutes!

## ⚡ Quick Setup (5 Minutes)

### Step 1: Install Dependencies (1 min)

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Run Database Migration (1 min)

```bash
cd backend
npm run migration:run
```

**Expected output:**
```
Migration CreateTelegramTables1731600000001 has been executed successfully.
```

### Step 3: Create Telegram Bot (2 min)

1. Open Telegram and find [@BotFather](https://t.me/BotFather)
2. Send: `/newbot`
3. Enter bot name: `VendHub Manager`
4. Enter username: `vendhub_manager_bot` (must end with `_bot`)
5. **Copy the bot token** (looks like: `1234567890:ABCdef...`)

### Step 4: Configure Bot (1 min)

1. Start your backend: `npm run start:dev`
2. Start your frontend: `npm run dev`
3. Navigate to: `http://localhost:3000/telegram/settings`
4. Paste bot token
5. Enter bot username (without @)
6. Click toggle to **Activate bot**
7. Click **Save Settings**

**✅ Done!** Your bot is now running.

## 🎯 Test Your Bot (2 Minutes)

### Link Your Account

1. Go to: `http://localhost:3000/telegram/link`
2. See QR code and 6-digit verification code
3. Open Telegram on your phone
4. **Method A:** Scan QR code
   - OR -
5. **Method B:**
   - Open `https://t.me/vendhub_manager_bot`
   - Click "Start"
   - Bot shows verification instructions

### Test Commands

Try these commands in Telegram:

```
/start    - See welcome menu
/menu     - Show main menu
/help     - List all commands
/language - Switch to English
```

### Send Test Notification

1. Go to: `http://localhost:3000/telegram/link`
2. Click **"Send Test Notification"**
3. Check Telegram - you should receive a test message! 🎉

## 📱 User Interface Tour

### Main Dashboard
**URL:** `/telegram`

Shows:
- ✅ Bot status (Active/Inactive)
- 🔗 Your account status
- 📊 User statistics
- 🚀 Quick start guide

### Link Account
**URL:** `/telegram/link`

Features:
- 📸 QR code for instant linking
- 🔢 6-digit verification code
- ⚙️ Notification preferences (12 types)
- 🧪 Test notification button

### Bot Settings
**URL:** `/telegram/settings`

Configure:
- 🔑 Bot token
- 📝 Bot username
- 🔄 Mode (Polling/Webhook)
- ✅ Activation toggle
- 🔔 Default notification settings

## 🎨 Bot Interface Preview

### Welcome Message
```
👋 Welcome back, John!

What would you like to do?

[🖥 Machines] [🔔 Alerts]
[📊 Stats] [⚙️ Settings]
```

### Machines List
```
🖥 Machines

🟢 Machine #1
   📍 Office A
   Status: Online

🔴 Machine #2
   📍 Office B
   Status: Offline

[« Back]
```

### Statistics
```
📊 Statistics

🖥 Total machines: 10
🟢 Online: 8
🔴 Offline: 2

💰 Today revenue: ₽52,500
☕ Today sales: 1,250

📋 Pending tasks: 5

[🔄 Refresh] [« Back]
```

## 🔔 Notification Examples

### Machine Offline
```
🔴 Machine offline

Machine "Office A" went offline

Machine ID: abc-123
Last seen: 2 min ago

[🔍 View Details] [Dismiss]
```

### Low Stock
```
📦 Low stock

Low stock level on machine "Office A"

Remaining: 15%

[📦 Refill Stock] [View Machine]
```

### Task Assigned
```
📋 New task

You have been assigned: "Refill machine #42"

[📋 Open Task]
```

## 🎯 Customization

### Enable/Disable Notifications

Users can toggle 12 notification types:

1. 🔴 Machine offline
2. 🟢 Machine online
3. 📦 Low stock
4. 🎉 Sales milestones
5. 🔧 Maintenance due
6. ⚠️ Equipment needs maintenance
7. 📦 Equipment low stock
8. 🧼 Equipment washing due
9. 💳 Payment failed
10. 📋 Task assigned
11. ✅ Task completed
12. 🔔 Custom notifications

**Location:** `/telegram/link` (when account is linked)

### Change Language

In Telegram bot, send:
```
/language
```

Choose:
- 🇷🇺 Русский
- 🇬🇧 English

## 🔗 Integration Examples

### Send Notification from Your Code

```typescript
// Inject the service
constructor(
  private telegramNotificationsService: TelegramNotificationsService,
) {}

// Send notification
await this.telegramNotificationsService.sendNotification({
  userId: 'user-uuid',
  type: 'custom',
  title: 'Hello from VendHub!',
  message: 'This is a custom notification',
  actions: [
    {
      text: '👀 View',
      url: 'https://vendhub.com/...',
    },
  ],
});
```

### Machine Offline Example

```typescript
await this.telegramNotificationsService.notifyMachineOffline(
  userId,
  machineId,
  machineName
);
```

### Broadcast to All Users

```typescript
await this.telegramNotificationsService.sendNotification({
  broadcast: true,
  type: 'custom',
  title: 'System Announcement',
  message: 'Important update for all users',
});
```

## 🐛 Troubleshooting

### Bot Not Responding

**Problem:** Bot doesn't respond to `/start`

**Solution:**
1. Check bot is **Active** in `/telegram/settings`
2. Verify bot token is correct
3. Restart backend: `npm run start:dev`
4. Check logs for: `"Telegram bot initialized successfully"`

### QR Code Not Showing

**Problem:** QR code doesn't display

**Solution:**
1. Check browser console for errors
2. Verify: `npm list qrcode` (should show v1.5.3)
3. Ensure bot username is set in settings
4. Try refreshing the page

### Verification Failed

**Problem:** Code doesn't work

**Solution:**
1. Generate new code (codes expire in 24h)
2. Copy-paste exact code (avoid typos)
3. Ensure bot is active
4. Try `/start` in bot first

### No Notifications Received

**Problem:** Not receiving notifications

**Solution:**
1. Check "Send notifications" is ON in settings
2. Verify your notification preferences in `/telegram/link`
3. Ensure you haven't blocked the bot
4. Try test notification button
5. Check backend logs for errors

## 📚 Next Steps

1. ✅ **Basic Setup** - You completed this!
2. 📖 Read [TELEGRAM_MODULE_README.md](./TELEGRAM_MODULE_README.md) for full documentation
3. 💻 See [TELEGRAM_INTEGRATION_EXAMPLES.md](./TELEGRAM_INTEGRATION_EXAMPLES.md) for code examples
4. 🎨 Customize notification types for your needs
5. 🚀 Deploy to production

## 🎉 Success Checklist

- ✅ Dependencies installed
- ✅ Database migration ran
- ✅ Bot created in @BotFather
- ✅ Bot configured in VendHub
- ✅ Bot status shows "Active"
- ✅ Account linked successfully
- ✅ Test notification received
- ✅ Bot commands working (`/start`, `/menu`)
- ✅ Notification preferences customized

## 💡 Pro Tips

1. **Use Polling mode** for development and small deployments
2. **Customize notification preferences** - Don't spam users
3. **Test notifications** before going live
4. **Check message logs** - Monitor in `telegram_message_logs` table
5. **Use action buttons** - Make notifications actionable
6. **Keep messages short** - Mobile-friendly text
7. **Add emojis** - Visual indicators improve UX
8. **Respect language** - Bot auto-adapts to user language

## 🆘 Getting Help

- 📖 **Full Documentation:** [TELEGRAM_MODULE_README.md](./TELEGRAM_MODULE_README.md)
- 💻 **Code Examples:** [TELEGRAM_INTEGRATION_EXAMPLES.md](./TELEGRAM_INTEGRATION_EXAMPLES.md)
- 🐛 **Issues:** Check troubleshooting section above
- 📝 **Logs:** Check backend console for errors

## 🌟 Features at a Glance

✨ **User-Friendly Interface**
- Menu-driven navigation (no typing!)
- Emoji-rich messages
- Interactive buttons
- QR code linking

🔔 **Smart Notifications**
- 12 notification types
- Customizable per user
- Action buttons
- Real-time delivery

🌐 **Multi-Language**
- Russian
- English
- Easy switching

📊 **Analytics**
- User statistics
- Message logs
- Delivery status
- Error tracking

🎨 **Beautiful Design**
- Glass morphism UI
- Visual feedback
- Responsive layout
- Loading states

---

**Congratulations!** 🎉 Your Telegram bot is ready to use!

Need more help? Check the full documentation in [TELEGRAM_MODULE_README.md](./TELEGRAM_MODULE_README.md).
