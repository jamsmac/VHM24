# Telegram Module

## Overview

This module provides Telegram integration infrastructure for VendHub Manager. The actual bot implementation is in the `telegram-bot` module.

## Module Structure

```
telegram/
├── telegram-bot.service.ts     # Re-exported bot service
└── telegram.module.ts          # Module configuration
```

## See Also

For complete Telegram Bot documentation, see: **[Telegram Bot Module](../telegram-bot/README.md)**

The telegram-bot module includes:
- Bot commands (`/start`, `/mytasks`, `/task`, etc.)
- Account linking
- Task notifications
- Commission management
- Interactive keyboards
- Notification methods
