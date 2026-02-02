# VendHub OS Design System "Warm Brew"

## Color Palette

### Primary (Amber)
```
amber-50:  #fffbeb   - Background light
amber-100: #fef3c7   - Background accent
amber-200: #fde68a   - Borders, dividers
amber-400: #fbbf24   - Icons, highlights
amber-500: #f59e0b   - Primary buttons, active states
amber-600: #d97706   - Hover states
amber-800: #92400e   - Dark accent
```

### Status Colors
```
emerald-500: #10b981  - Success, online, active
red-500:     #ef4444  - Error, critical, offline
blue-500:    #3b82f6  - Info, maintenance, in_progress
purple-500:  #a855f7  - Draft, special
gray-500:    #6b7280  - Inactive, disabled
```

### Background
```
stone-900:   #1c1917  - Sidebar dark
stone-800:   #292524  - Sidebar hover
gray-50:     #f9fafb  - Page background
white:       #ffffff  - Cards, modals
```

### Gradients
```jsx
// Logo gradient
bg-gradient-to-br from-amber-500 to-amber-600

// Page background
bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50

// Stats cards
bg-gradient-to-r from-amber-500 to-orange-500
```

## Typography

### Font Sizes
```
text-xs:   12px  - Badges, hints, timestamps
text-sm:   14px  - Body text, buttons, inputs
text-base: 16px  - Large body
text-lg:   18px  - Card titles
text-xl:   20px  - Section headers
text-2xl:  24px  - Page titles, big numbers
text-3xl:  30px  - Hero metrics
```

### Font Weights
```
font-normal:   400 - Body text
font-medium:   500 - Labels, buttons
font-semibold: 600 - Titles, headers
font-bold:     700 - Emphasis, metrics
```

## Spacing

### Padding
```
p-1:  4px   - Tight (icons)
p-2:  8px   - Compact (badges)
p-3:  12px  - Default (buttons)
p-4:  16px  - Cards inner
p-5:  20px  - Large cards
p-6:  24px  - Sections
```

### Gaps
```
gap-1:  4px   - Inline elements
gap-2:  8px   - List items
gap-3:  12px  - Card sections
gap-4:  16px  - Form fields
gap-6:  24px  - Page sections
```

## Border Radius
```
rounded:     4px   - Buttons, inputs
rounded-lg:  8px   - Cards, badges
rounded-xl:  12px  - Large cards, modals
rounded-2xl: 16px  - Hero sections
rounded-full: 50%  - Avatars, icons
```

## Shadows
```
shadow-sm:  0 1px 2px    - Cards
shadow:     0 1px 3px    - Elevated
shadow-lg:  0 10px 15px  - Modals, dropdowns
```

## Icons
Use Lucide React icons exclusively:
```jsx
import {
  Coffee, Package, Users, Settings, Bell, Search,
  TrendingUp, AlertTriangle, CheckCircle, ChevronRight,
  Plus, Edit, Trash2, Eye, Download, Upload
} from 'lucide-react';
```

Icon sizes:
- `w-4 h-4` - Inline, buttons
- `w-5 h-5` - Navigation, headers
- `w-6 h-6` - Cards icons
- `w-8 h-8` - Empty states
- `w-10 h-10` - Hero icons

## Component Styling Patterns

### Card
```jsx
className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
```

### Button Primary
```jsx
className="bg-amber-500 text-white hover:bg-amber-600 px-4 py-2 rounded-lg font-medium"
```

### Button Secondary
```jsx
className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium"
```

### Input
```jsx
className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
```

### Badge
```jsx
// Status badges
className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
```

### Sidebar Active Item
```jsx
className="bg-amber-500/20 text-amber-400"
```
