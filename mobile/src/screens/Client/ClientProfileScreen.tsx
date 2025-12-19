/**
 * Client Profile Screen - View and manage client profile
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClientStore } from '../../store/client.store';

export default function ClientProfileScreen() {
  const { user, isAuthenticated, logout, setAppMode } = useClientStore();

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleSwitchToStaff = () => {
    Alert.alert(
      'Переключение режима',
      'Переключиться в режим сотрудника?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Переключить',
          onPress: () => setAppMode('staff'),
        },
      ]
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.guestContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#9ca3af" />
          <Text style={styles.guestTitle}>Войдите в аккаунт</Text>
          <Text style={styles.guestText}>
            Авторизуйтесь через Telegram, чтобы накапливать баллы и видеть историю заказов
          </Text>
          <TouchableOpacity style={styles.loginButton}>
            <Ionicons name="logo-telegram" size={24} color="#fff" />
            <Text style={styles.loginButtonText}>Войти через Telegram</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#3b82f6" />
        </View>
        <Text style={styles.userName}>
          {user.first_name} {user.last_name}
        </Text>
        {user.phone && (
          <Text style={styles.userPhone}>{user.phone}</Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.points_balance || 0}</Text>
          <Text style={styles.statLabel}>Баллов</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.total_orders || 0}</Text>
          <Text style={styles.statLabel}>Заказов</Text>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={24} color="#374151" />
          <Text style={styles.menuItemText}>Уведомления</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={24} color="#374151" />
          <Text style={styles.menuItemText}>Настройки</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={24} color="#374151" />
          <Text style={styles.menuItemText}>Помощь</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text-outline" size={24} color="#374151" />
          <Text style={styles.menuItemText}>Политика конфиденциальности</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Staff mode switch (for testing) */}
      <TouchableOpacity
        style={styles.switchModeButton}
        onPress={handleSwitchToStaff}
      >
        <Ionicons name="swap-horizontal-outline" size={20} color="#6b7280" />
        <Text style={styles.switchModeText}>Режим сотрудника</Text>
      </TouchableOpacity>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>VendHub v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  guestText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0088cc',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  userPhone: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  switchModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  switchModeText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    padding: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
