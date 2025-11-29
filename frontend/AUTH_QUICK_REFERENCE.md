# Authentication System - Quick Reference Card

**VendHub Frontend | Version 2.0 | Updated: 2025-11-22**

---

## 🚀 Token Refresh (Automatic)

### Making API Calls

```typescript
import apiClient from '@/lib/axios'

// That's it! Token refresh is automatic
const data = await apiClient.get('/machines')
```

**What happens automatically:**
1. ✅ Token checked before request
2. ✅ Refreshed if < 5 min to expiry
3. ✅ Injected into Authorization header
4. ✅ Retried on 401 error
5. ✅ Redirects to login on failure

---

## 🎯 Auth Events

### Quick Examples

**Auto-redirect on logout:**

```typescript
import { useAuthEvent } from '@/hooks/useAuthEvents'

useAuthEvent('logout', () => {
  router.push('/login')
})
```

**Show toast notifications:**

```typescript
import { useAuthEvents } from '@/hooks/useAuthEvents'

useAuthEvents((event) => {
  if (event === 'login') toast.success('Welcome!')
  if (event === 'logout') toast.info('Goodbye!')
})
```

**Update UI on profile change:**

```typescript
useAuthEvent('user-updated', (data) => {
  setUser(data?.user)
})
```

---

## 📋 Event Types

| Event | When | Data | Use For |
|-------|------|------|---------|
| `login` | User logs in | `{ accessToken }` | Redirect to dashboard, analytics |
| `logout` | User logs out | None | Redirect to login, cleanup |
| `token-refreshed` | Token refreshed | `{ accessToken }` | Debug logging, metrics |
| `token-expired` | Refresh failed | None | Show modal, save work |
| `user-updated` | Profile updated | `{ user }` | Update UI, sync data |

---

## 🛠️ Common Patterns

### Pattern 1: Root Layout Handler

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  const router = useRouter()

  useAuthEvent('logout', () => router.push('/login'))
  useAuthEvent('token-expired', () => router.push('/login?expired=true'))

  return children
}
```

### Pattern 2: User Display

```typescript
const [user, setUser] = useState(authStorage.getUser())

useAuthEvent('login', () => setUser(authStorage.getUser()))
useAuthEvent('logout', () => setUser(null))
useAuthEvent('user-updated', (data) => setUser(data?.user))
```

### Pattern 3: Analytics

```typescript
useAuthEvents((event, data) => {
  gtag('event', event, { category: 'Auth' })
})
```

---

## 🧪 Testing

```bash
# Type check
npm run type-check

# Run tests
npm run test

# Lint
npm run lint
```

---

## 📚 Full Documentation

- **Token Refresh**: [AUTH_STORAGE_USAGE.md](docs/AUTH_STORAGE_USAGE.md)
- **Events Guide**: [AUTH_EVENTS_GUIDE.md](docs/AUTH_EVENTS_GUIDE.md)
- **Examples**: [src/examples/auth-events-demo.tsx](src/examples/auth-events-demo.tsx)
- **Changelog**: [CHANGELOG_TOKEN_REFRESH.md](CHANGELOG_TOKEN_REFRESH.md)

---

## ⚡ Key Features

✅ **Automatic token refresh** - No manual management needed
✅ **Race condition safe** - 10 requests → 1 refresh
✅ **Real-time events** - React to auth state instantly
✅ **Type-safe** - Full TypeScript support
✅ **Zero config** - Works out of the box
✅ **100% backward compatible** - No breaking changes

---

## 🎯 Quick Tips

1. **Use `apiClient`** instead of direct `fetch()`
2. **Add event listeners** in root layout for global handling
3. **Use `useCallback`** with `useAuthEvents` to avoid re-subscriptions
4. **Don't forget cleanup** - hooks do this automatically
5. **Check the examples** - 8 ready-to-use components available

---

**Need Help?** Check the full documentation or contact the dev team.

---

*This is a quick reference. For complete details, see the full documentation.*
