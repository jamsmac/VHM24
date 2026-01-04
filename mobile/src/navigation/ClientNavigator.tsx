/**
 * VendHub Mobile - Client Navigator
 *
 * Navigation for client (consumer) app with bottom tabs
 * Updated with "Warm Brew" design system
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Client Screens
import QrScanScreen from '../screens/Client/QrScanScreen';
import LocationsScreen from '../screens/Client/LocationsScreen';
import OrdersScreen from '../screens/Client/OrdersScreen';
import LoyaltyScreen from '../screens/Client/LoyaltyScreen';
import ClientProfileScreen from '../screens/Client/ClientProfileScreen';
import ClientMenuScreen from '../screens/Client/ClientMenuScreen';

// Custom Components
import { ClientBottomTabBar } from '../components/client';

// Theme
import { ClientColors } from '../theme';

export type ClientStackParamList = {
  ClientTabs: undefined;
  ClientMenu: {
    machineId: string;
    machineName: string;
    machineNumber: string;
  };
};

export type ClientTabParamList = {
  QrScan: undefined;
  Locations: undefined;
  Orders: undefined;
  Loyalty: undefined;
  ClientProfile: undefined;
};

const Stack = createNativeStackNavigator<ClientStackParamList>();
const Tab = createBottomTabNavigator<ClientTabParamList>();

function ClientTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <ClientBottomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: ClientColors.background.cream,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: ClientColors.background.latte,
        },
        headerTintColor: ClientColors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
          color: ClientColors.text.primary,
        },
      }}
    >
      <Tab.Screen
        name="QrScan"
        component={QrScanScreen}
        options={{
          title: 'Сканер',
          headerTitle: 'Сканировать QR',
        }}
      />
      <Tab.Screen
        name="Locations"
        component={LocationsScreen}
        options={{
          title: 'Локации',
          headerTitle: 'Где купить',
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Заказы',
          headerTitle: 'Мои заказы',
        }}
      />
      <Tab.Screen
        name="Loyalty"
        component={LoyaltyScreen}
        options={{
          title: 'Баллы',
          headerTitle: 'Программа лояльности',
        }}
      />
      <Tab.Screen
        name="ClientProfile"
        component={ClientProfileScreen}
        options={{
          title: 'Профиль',
          headerTitle: 'Мой профиль',
        }}
      />
    </Tab.Navigator>
  );
}

export default function ClientNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: ClientColors.background.cream,
        },
        headerTintColor: ClientColors.primary.espresso,
        headerTitleStyle: {
          fontWeight: '600',
          color: ClientColors.text.primary,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: ClientColors.background.cream,
        },
      }}
    >
      <Stack.Screen
        name="ClientTabs"
        component={ClientTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClientMenu"
        component={ClientMenuScreen}
        options={({ route }) => ({
          title: route.params.machineName,
          headerBackTitle: 'Назад',
          headerRight: () => null,
        })}
      />
    </Stack.Navigator>
  );
}
