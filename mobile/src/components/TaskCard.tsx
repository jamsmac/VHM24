/**
 * TaskCard Component
 *
 * Displays a single task in the task list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskStatus, TaskPriority } from '../types';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
}

export default function TaskCard({ task, onPress }: TaskCardProps) {
  const statusColor = getStatusColor(task.status);
  const priorityIcon = getPriorityIcon(task.priority);
  const priorityColor = getPriorityColor(task.priority);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons
            name={priorityIcon}
            size={20}
            color={priorityColor}
            style={styles.priorityIcon}
          />
          <Text style={styles.title} numberOfLines={2}>
            {task.title}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
        </View>
      </View>

      {/* Description */}
      {task.description && (
        <Text style={styles.description} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        {/* Equipment */}
        {task.equipment && (
          <View style={styles.footerItem}>
            <Ionicons name="hardware-chip-outline" size={16} color="#6b7280" />
            <Text style={styles.footerText} numberOfLines={1}>
              {task.equipment.name}
            </Text>
          </View>
        )}

        {/* Location */}
        {task.location && (
          <View style={styles.footerItem}>
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text style={styles.footerText} numberOfLines={1}>
              {task.location}
            </Text>
          </View>
        )}

        {/* Due date */}
        {task.due_date && (
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text style={styles.footerText}>
              {formatDate(task.due_date)}
            </Text>
          </View>
        )}

        {/* Photo count */}
        {task.photos && task.photos.length > 0 && (
          <View style={styles.footerItem}>
            <Ionicons name="camera-outline" size={16} color="#6b7280" />
            <Text style={styles.footerText}>{task.photos.length}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return '#f59e0b'; // orange
    case TaskStatus.IN_PROGRESS:
      return '#3b82f6'; // blue
    case TaskStatus.COMPLETED:
      return '#10b981'; // green
    case TaskStatus.CANCELLED:
      return '#6b7280'; // gray
    default:
      return '#9ca3af';
  }
}

function getStatusLabel(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return 'Ожидает';
    case TaskStatus.IN_PROGRESS:
      return 'В работе';
    case TaskStatus.COMPLETED:
      return 'Завершена';
    case TaskStatus.CANCELLED:
      return 'Отменена';
    default:
      return status;
  }
}

function getPriorityIcon(priority: TaskPriority): keyof typeof Ionicons.glyphMap {
  switch (priority) {
    case TaskPriority.URGENT:
      return 'flash';
    case TaskPriority.HIGH:
      return 'arrow-up';
    case TaskPriority.MEDIUM:
      return 'remove';
    case TaskPriority.LOW:
      return 'arrow-down';
    default:
      return 'remove';
  }
}

function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.URGENT:
      return '#ef4444'; // red
    case TaskPriority.HIGH:
      return '#f59e0b'; // orange
    case TaskPriority.MEDIUM:
      return '#3b82f6'; // blue
    case TaskPriority.LOW:
      return '#6b7280'; // gray
    default:
      return '#9ca3af';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if it's today
  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня';
  }

  // Check if it's tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Завтра';
  }

  // Format as DD.MM
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  priorityIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    maxWidth: 120,
  },
});
