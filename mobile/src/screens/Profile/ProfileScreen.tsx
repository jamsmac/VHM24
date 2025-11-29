/**
 * Profile Screen
 *
 * User profile display with logout and app information
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';

import { useAuthStore } from '../../store/auth.store';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { UserRole } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, isLoading } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Выйти',
      'Вы уверены, что хотите выйти из приложения?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              await logout();
              // Navigation will be handled by AppNavigator after logout
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось выйти из системы');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Администратор';
      case UserRole.MANAGER:
        return 'Менеджер';
      case UserRole.OPERATOR:
        return 'Оператор';
      case UserRole.ACCOUNTANT:
        return 'Бухгалтер';
      default:
        return role;
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return '#ef4444'; // red
      case UserRole.MANAGER:
        return '#3b82f6'; // blue
      case UserRole.OPERATOR:
        return '#10b981'; // green
      case UserRole.ACCOUNTANT:
        return '#f59e0b'; // orange
      default:
        return '#6b7280'; // gray
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading || !user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
            <Text style={styles.roleText}>{getRoleLabel(user.role)}</Text>
          </View>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Информация</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>

          {user.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Телефон</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            </View>
          )}

          {user.telegram_id && (
            <View style={styles.infoRow}>
              <Ionicons name="paper-plane-outline" size={20} color="#6b7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Telegram</Text>
                <Text style={styles.infoValue}>Подключен</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color={user.is_active ? '#10b981' : '#ef4444'} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Статус</Text>
              <Text style={[styles.infoValue, { color: user.is_active ? '#10b981' : '#ef4444' }]}>
                {user.is_active ? 'Активен' : 'Неактивен'}
              </Text>
            </View>
          </View>
        </View>

        {/* Offline Queue Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Синхронизация</Text>

          <View style={styles.syncCard}>
            <View style={styles.syncInfo}>
              <Ionicons name="cloud-offline-outline" size={32} color="#9ca3af" />
              <View style={styles.syncDetails}>
                <Text style={styles.syncTitle}>Офлайн очередь</Text>
                <Text style={styles.syncSubtitle}>0 элементов</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.syncButton, styles.syncButtonDisabled]}
              disabled
            >
              <Ionicons name="sync" size={20} color="#9ca3af" />
              <Text style={styles.syncButtonTextDisabled}>Синхронизировать</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.syncNote}>
            Синхронизация будет доступна после подключения к интернету
          </Text>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>О приложении</Text>

          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Версия</Text>
              <Text style={styles.infoValue}>
                {Constants.expoConfig?.version || '1.0.0'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="construct-outline" size={20} color="#6b7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Сборка</Text>
              <Text style={styles.infoValue}>
                {Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="code-outline" size={20} color="#6b7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Режим</Text>
              <Text style={styles.infoValue}>
                {__DEV__ ? 'Разработка' : 'Продакшн'}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Настройки</Text>

          <TouchableOpacity
            style={styles.settingButton}
            disabled
          >
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color="#9ca3af" />
              <Text style={styles.settingTextDisabled}>Уведомления</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            disabled
          >
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={24} color="#9ca3af" />
              <Text style={styles.settingTextDisabled}>Язык</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Русский</Text>
              <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            disabled
          >
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={24} color="#9ca3af" />
              <Text style={styles.settingTextDisabled}>Темная тема</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
              <Text style={styles.logoutButtonText}>Выйти</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>VendHub Manager</Text>
          <Text style={styles.footerSubtext}>© 2025 VendHub. Все права защищены.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  syncCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  syncDetails: {
    marginLeft: 12,
    flex: 1,
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  syncSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  syncButtonTextDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  syncNote: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  settingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingTextDisabled: {
    fontSize: 16,
    color: '#9ca3af',
  },
  settingValue: {
    fontSize: 14,
    color: '#9ca3af',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fee2e2',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
