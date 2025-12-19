/**
 * VendHub Mobile - Client Navigator
 *
 * Navigation for client (consumer) app with bottom tabs
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Client Screens
import QrScanScreen from '../screens/Client/QrScanScreen';
import LocationsScreen from '../screens/Client/LocationsScreen';
import OrdersScreen from '../screens/Client/OrdersScreen';
import LoyaltyScreen from '../screens/Client/LoyaltyScreen';
import ClientProfileScreen from '../screens/Client/ClientProfileScreen';
import ClientMenuScreen from '../screens/Client/ClientMenuScreen';

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
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'QrScan':
              iconName = focused ? 'qr-code' : 'qr-code-outline';
              break;
            case 'Locations':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'Orders':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Loyalty':
              iconName = focused ? 'star' : 'star-outline';
              break;
            case 'ClientProfile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
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
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="ClientTabs"
        component={ClientTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClientMenu"
        component={ClientMenuScreen}
        options={({ route }) => ({
          title: `${route.params.machineNumber} - ${route.params.machineName}`,
          headerBackTitle: 'Назад',
        })}
      />
    </Stack.Navigator>
  );
}
