/**
 * VendHub Client Bottom Tab Bar - "Warm Brew" Design
 *
 * Glassmorphism-style bottom navigation with center-elevated QR button
 * Based on vhm24v2 design patterns, optimized for VHM24
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClientColors, ClientShadows } from '../../theme';

interface TabConfig {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  label: string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  QrScan: {
    name: 'QrScan',
    icon: 'qr-code-outline',
    iconFocused: 'qr-code',
    label: 'Сканер',
  },
  Locations: {
    name: 'Locations',
    icon: 'location-outline',
    iconFocused: 'location',
    label: 'Локации',
  },
  Orders: {
    name: 'Orders',
    icon: 'receipt-outline',
    iconFocused: 'receipt',
    label: 'Заказы',
  },
  Loyalty: {
    name: 'Loyalty',
    icon: 'star-outline',
    iconFocused: 'star',
    label: 'Баллы',
  },
  ClientProfile: {
    name: 'ClientProfile',
    icon: 'person-outline',
    iconFocused: 'person',
    label: 'Профиль',
  },
};

export default function ClientBottomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Reorder tabs: move QrScan to center
  const orderedRoutes = React.useMemo(() => {
    const routes = [...state.routes];
    const qrIndex = routes.findIndex((r) => r.name === 'QrScan');
    if (qrIndex > -1) {
      const [qrRoute] = routes.splice(qrIndex, 1);
      const middleIndex = Math.floor(routes.length / 2);
      routes.splice(middleIndex, 0, qrRoute);
    }
    return routes;
  }, [state.routes]);

  const orderedState = React.useMemo(
    () => ({
      ...state,
      routes: orderedRoutes,
      index: orderedRoutes.findIndex((r) => r.key === state.routes[state.index].key),
    }),
    [state, orderedRoutes]
  );

  const centerIndex = Math.floor(orderedRoutes.length / 2);

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {/* Glass background */}
      <View style={styles.glassBackground} />

      {/* Tab items */}
      <View style={styles.tabsContainer}>
        {orderedState.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const config = TAB_CONFIG[route.name];
          const isFocused = orderedState.index === index;
          const isCenter = index === centerIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Center elevated button (QR Scanner)
          if (isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.centerButtonContainer}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.centerButton,
                    isFocused && styles.centerButtonFocused,
                  ]}
                >
                  <Ionicons
                    name={isFocused ? config.iconFocused : config.icon}
                    size={28}
                    color={ClientColors.text.inverse}
                  />
                </View>
                <Text
                  style={[
                    styles.centerLabel,
                    isFocused && styles.labelFocused,
                  ]}
                >
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          }

          // Regular tab items
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconContainer}>
                <Ionicons
                  name={isFocused ? config.iconFocused : config.icon}
                  size={24}
                  color={
                    isFocused
                      ? ClientColors.primary.espresso
                      : ClientColors.text.muted
                  }
                />
                {isFocused && <View style={styles.activeIndicator} />}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.labelFocused,
                ]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  glassBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 240, 235, 0.8)',
    ...Platform.select({
      ios: {
        // iOS has better blur support
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minWidth: 60,
  },
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ClientColors.primary.espresso,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: ClientColors.text.muted,
    marginTop: 4,
  },
  labelFocused: {
    color: ClientColors.primary.espresso,
    fontWeight: '600',
  },
  centerButtonContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
    marginTop: -24,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ClientColors.primary.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    ...ClientShadows.lg,
    shadowColor: ClientColors.primary.espresso,
    shadowOpacity: 0.4,
  },
  centerButtonFocused: {
    backgroundColor: ClientColors.primary.espressoDark,
    transform: [{ scale: 1.05 }],
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: ClientColors.text.muted,
    marginTop: 6,
  },
});
