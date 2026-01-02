# Theme Switch Animation v2

Плавная анимация переключения между светлой и тёмной темами для VendHub TWA (Telegram Web App).

## Особенности

- **Плавные переходы** — 0.35с для фона, 0.25с для текста и границ
- **Оптимизация для мобильных** — webkit-префиксы для iOS Safari
- **GPU-ускорение** — `translateZ(0)` и `backface-visibility: hidden`
- **Timing function** — `ease-out` для естественного ощущения

## Файлы

- `index.css` — CSS стили с анимацией переключения тем
- `ThemeContext.tsx` — React контекст для управления темой

## Поддерживаемые платформы

- ✅ iOS Safari (iPhone, iPad)
- ✅ Android Chrome
- ✅ Telegram WebView (iOS и Android)
- ✅ Desktop браузеры

## Использование

### CSS (index.css)

```css
/* Smooth theme transition animation - optimized for mobile */
html.theme-transition,
html.theme-transition *,
html.theme-transition *::before,
html.theme-transition *::after {
  -webkit-transition: background-color 0.35s ease-out, 
                      color 0.25s ease-out, 
                      border-color 0.25s ease-out,
                      box-shadow 0.25s ease-out !important;
  transition: background-color 0.35s ease-out, 
              color 0.25s ease-out, 
              border-color 0.25s ease-out,
              box-shadow 0.25s ease-out !important;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
```

### React (ThemeContext.tsx)

```tsx
const toggleTheme = useCallback(() => {
  const root = document.documentElement;
  
  // Add transition class for smooth animation
  root.classList.add("theme-transition");
  
  // Change theme
  setTheme(prev => (prev === "light" ? "dark" : "light"));
  
  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove("theme-transition");
  }, 350);
}, []);
```

## Версия

v2.0.0 — Mobile optimized
