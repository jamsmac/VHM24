/**
 * VendHub Mobile - Main App Navigator
 *
 * Supports two modes:
 * - Staff mode: For operators with task management
 * - Client mode: For consumers with QR scanning and ordering
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/auth.store';
import { useClientStore } from '../store/client.store';

// Staff Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import TaskListScreen from '../screens/Tasks/TaskListScreen';
import TaskDetailScreen from '../screens/Tasks/TaskDetailScreen';
import TaskCameraScreen from '../screens/Tasks/TaskCameraScreen';
import EquipmentMapScreen from '../screens/Equipment/EquipmentMapScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

// Client Navigator
import ClientNavigator from './ClientNavigator';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  TaskDetail: { taskId: string };
  TaskCamera: { taskId: string };
};

export type TabParamList = {
  Tasks: undefined;
  Map: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Tasks') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Tasks"
        component={TaskListScreen}
        options={{ title: 'Задачи' }}
      />
      <Tab.Screen
        name="Map"
        component={EquipmentMapScreen}
        options={{ title: 'Карта' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Профиль' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { appMode, loadAppMode } = useClientStore();

  useEffect(() => {
    loadAppMode();
    loadUser();
  }, [loadUser, loadAppMode]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Client mode - show client navigator (no staff auth required)
  if (appMode === 'client') {
    return (
      <NavigationContainer>
        <ClientNavigator />
      </NavigationContainer>
    );
  }

  // Staff mode - requires authentication
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: 'Детали задачи' }}
            />
            <Stack.Screen
              name="TaskCamera"
              component={TaskCameraScreen}
              options={{ title: 'Фото' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
