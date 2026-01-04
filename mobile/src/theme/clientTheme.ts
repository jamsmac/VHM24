/**
 * VendHub Client Theme - "Warm Brew" Design System
 *
 * Scandinavian minimalist design inspired by coffee culture
 * Integrated from vhm24v2 with improvements
 */

export const ClientColors = {
  // Primary palette - Espresso & Caramel
  primary: {
    espresso: '#5D4037',      // Rich brown - primary actions
    espressoLight: '#8D6E63', // Lighter brown
    espressoDark: '#3E2723',  // Darker brown
    caramel: '#D4A574',       // Warm accent
    caramelLight: '#E8C9A0',  // Light caramel
    caramelDark: '#B8956A',   // Dark caramel
  },

  // Background palette - Cream & Milk
  background: {
    cream: '#FBF9F7',         // Main background - milk foam
    milk: '#FFFFFF',          // Cards background
    latte: '#F5F0EB',         // Secondary background
    mocha: '#2D2926',         // Dark mode background
  },

  // Accent colors
  accent: {
    mint: '#4CAF93',          // Success - fresh mint
    mintLight: '#81C9B4',
    berry: '#C75B7A',         // Promotion - berry
    berryLight: '#E8A0B0',
    gold: '#D4AF37',          // Premium/VIP
    goldLight: '#F0D078',
  },

  // Text colors
  text: {
    primary: '#2D2926',       // Main text - dark roast
    secondary: '#6B5B54',     // Secondary text
    muted: '#9C8B82',         // Muted/placeholder
    inverse: '#FFFFFF',       // Text on dark backgrounds
    link: '#5D4037',          // Links
  },

  // Status colors
  status: {
    success: '#4CAF93',
    warning: '#F5A623',
    error: '#E74C3C',
    info: '#5D9CEC',
  },

  // Gradients (for buttons and cards)
  gradients: {
    caramel: ['#D4A574', '#B8956A'],
    espresso: ['#5D4037', '#3E2723'],
    gold: ['#D4AF37', '#B8962F'],
    mint: ['#4CAF93', '#3D9980'],
  },

  // Dark mode
  dark: {
    background: '#1A1614',
    card: '#2D2926',
    cardElevated: '#3E3632',
    border: '#4A4340',
    text: '#F5F0EB',
    textSecondary: '#A89F99',
  },
} as const;

export const ClientSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const ClientBorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
  // Card specific
  card: 16,
  button: 12,
  pill: 20,
  fab: 28,
} as const;

export const ClientTypography = {
  // Font families (will use system fonts with fallbacks)
  fontFamily: {
    display: 'System', // Would be Playfair Display if loaded
    body: 'System',    // Would be DM Sans if loaded
  },

  // Font sizes
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },

  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const ClientShadows = {
  sm: {
    shadowColor: '#2D2926',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#2D2926',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#2D2926',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#2D2926',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  // Glassmorphism shadow
  glass: {
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

// Animation timings
export const ClientAnimations = {
  fast: 150,
  normal: 250,
  slow: 350,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 0.5,
  },
} as const;

// Haptic feedback types
export const ClientHaptics = {
  light: 'light' as const,
  medium: 'medium' as const,
  heavy: 'heavy' as const,
  success: 'notificationSuccess' as const,
  warning: 'notificationWarning' as const,
  error: 'notificationError' as const,
} as const;

// Default export for easy import
const ClientTheme = {
  colors: ClientColors,
  spacing: ClientSpacing,
  borderRadius: ClientBorderRadius,
  typography: ClientTypography,
  shadows: ClientShadows,
  animations: ClientAnimations,
  haptics: ClientHaptics,
};

export default ClientTheme;
