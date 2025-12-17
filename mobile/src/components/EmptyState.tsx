/**
 * VendHub Mobile - Empty State Component
 *
 * Consistent empty state display across the app
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = 'folder-open-outline',
  iconColor = '#9ca3af',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={64} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Pre-configured empty states
export function NoTasksEmpty({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon="checkmark-done-outline"
      title="Нет активных задач"
      message="Все задачи выполнены!"
      actionLabel={onRefresh ? 'Обновить' : undefined}
      onAction={onRefresh}
    />
  );
}

export function NoSearchResultsEmpty({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon="search-outline"
      title="Ничего не найдено"
      message="Попробуйте изменить параметры поиска"
      actionLabel={onClear ? 'Сбросить фильтры' : undefined}
      onAction={onClear}
    />
  );
}

export function NoEquipmentEmpty() {
  return (
    <EmptyState
      icon="hardware-chip-outline"
      title="Нет оборудования"
      message="Оборудование пока не добавлено"
    />
  );
}

export function NoPhotosEmpty({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon="images-outline"
      title="Нет фотографий"
      message="Добавьте фото для этой задачи"
      actionLabel={onAdd ? 'Добавить фото' : undefined}
      onAction={onAdd}
    />
  );
}

export function OfflineEmpty() {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      iconColor="#f59e0b"
      title="Нет подключения"
      message="Данные будут загружены при восстановлении соединения"
    />
  );
}

export function ErrorEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="alert-circle-outline"
      iconColor="#ef4444"
      title="Ошибка загрузки"
      message="Не удалось загрузить данные"
      actionLabel={onRetry ? 'Повторить' : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmptyState;
