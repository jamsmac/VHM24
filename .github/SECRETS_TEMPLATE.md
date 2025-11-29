# GitHub Actions Secrets Template

## How to Add Secrets

1. Go to your repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

## Required Secrets

### Staging Deployment

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `STAGING_DEPLOY_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | SSH private key for staging server |
| `STAGING_DEPLOY_HOST` | `staging.example.com` | Staging server hostname or IP |
| `STAGING_DEPLOY_USER` | `vendhub` | SSH username for staging |
| `STAGING_DEPLOY_PATH` | `/home/vendhub/VHM24` | Deployment directory path on staging |

### Production Deployment

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `PROD_DEPLOY_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | SSH private key for production server |
| `PROD_DEPLOY_HOST` | `prod.example.com` | Production server hostname or IP |
| `PROD_DEPLOY_USER` | `vendhub` | SSH username for production |
| `PROD_DEPLOY_PATH` | `/home/vendhub/VHM24` | Deployment directory path on production |

### Notifications

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `TELEGRAM_BOT_TOKEN` | `123456789:ABCDEfghijklmnopqrstuvwxyz` | Telegram bot token for notifications |
| `TELEGRAM_CHAT_ID` | `-1001234567890` | Telegram chat ID for receiving notifications |

## How to Generate SSH Keys

```bash
# Generate ED25519 key (recommended)
ssh-keygen -t ed25519 -f vendhub-deploy-key -N ""

# Or generate RSA key
ssh-keygen -t rsa -b 4096 -f vendhub-deploy-key -N ""

# View private key (for GitHub secret)
cat vendhub-deploy-key

# View public key (for server)
cat vendhub-deploy-key.pub
```

## How to Get Telegram Bot Token

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow instructions to create a new bot
4. Copy the token provided

## How to Get Telegram Chat ID

### For Personal Chat
1. Send a message to your bot
2. Go to: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Find your message and copy the `chat.id`

### For Group Chat
1. Add bot to group
2. Send a message mentioning the bot
3. Go to: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find group message and copy the `chat.id` (will be negative)

## Verification

### Test SSH Connection
```bash
ssh -i vendhub-deploy-key vendhub@staging.example.com "echo 'SSH works!'"
```

### Test Telegram Bot
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>" \
  -d "text=Test message"
```

## Security Best Practices

1. **Never commit secrets** to repository
2. **Use strong SSH keys** (ED25519 or RSA 4096+)
3. **Rotate secrets regularly** (quarterly)
4. **Use separate keys** for staging and production
5. **Limit SSH key permissions** to deployment user
6. **Monitor secret usage** in Actions logs
7. **Audit secret access** regularly

## Troubleshooting

### SSH Connection Failed
- Verify key is correct
- Check server firewall rules
- Verify SSH user exists on server
- Check `.ssh/authorized_keys` on server

### Telegram Notifications Not Received
- Verify bot token is correct
- Verify chat ID is correct
- Check bot is not blocked
- Verify bot has permission to send messages

### Secrets Not Available in Workflow
- Verify secret name matches exactly (case-sensitive)
- Check workflow file uses correct secret name: `${{ secrets.SECRET_NAME }}`
- Verify secret is set in repository settings

---

**Last Updated:** 2025-11-29
