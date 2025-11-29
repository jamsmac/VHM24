/**
 * Task Detail Screen
 *
 * Displays detailed task information with status updates and photo gallery
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Task, TaskStatus, TaskPriority } from '../../types';
import apiClient from '../../services/api';
import { RootStackParamList } from '../../navigation/AppNavigator';

type TaskDetailRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TaskDetailScreen() {
  const route = useRoute<TaskDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { taskId } = route.params;

  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  // Fetch task details
  const { data: task, isLoading, isError, refetch } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const response = await apiClient.getTask(taskId);
      return response.data as Task;
    },
    staleTime: 30000,
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: TaskStatus) => apiClient.updateTaskStatus(taskId, status),
    onMutate: async (newStatus) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['task', taskId] });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData(['task', taskId]);

      // Optimistically update
      queryClient.setQueryData(['task', taskId], (old: any) => ({
        ...old,
        status: newStatus,
      }));

      return { previousTask };
    },
    onError: (err, newStatus, context) => {
      // Rollback on error
      queryClient.setQueryData(['task', taskId], context?.previousTask);
      Alert.alert('Ошибка', 'Не удалось обновить статус задачи');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: (notes: string) => apiClient.completeTask(taskId, notes),
    onSuccess: () => {
      setCompleteModalVisible(false);
      setCompletionNotes('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      Alert.alert('Успешно', 'Задача выполнена');
    },
    onError: () => {
      Alert.alert('Ошибка', 'Не удалось завершить задачу');
    },
  });

  const handleStatusUpdate = (newStatus: TaskStatus) => {
    if (task && task.status !== newStatus) {
      updateStatusMutation.mutate(newStatus);
    }
  };

  const handleCompleteTask = () => {
    if (task?.status === TaskStatus.COMPLETED) {
      Alert.alert('Информация', 'Задача уже завершена');
      return;
    }
    setCompleteModalVisible(true);
  };

  const handleConfirmComplete = () => {
    completeTaskMutation.mutate(completionNotes);
  };

  const handleEquipmentPress = () => {
    if (task?.equipment_id) {
      // Navigate to equipment details (to be implemented)
      Alert.alert('Информация', `Оборудование: ${task.equipment?.name || task.equipment_id}`);
    }
  };

  const handleAddPhoto = () => {
    // Navigate to camera screen
    navigation.navigate('TaskCamera', { taskId });
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  // Error state
  if (isError || !task) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Ошибка загрузки</Text>
        <Text style={styles.errorText}>Не удалось загрузить детали задачи</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const canUpdateStatus = task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.priorityText}>{getPriorityLabel(task.priority)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
            </View>
          </View>
          <Text style={styles.title}>{task.title}</Text>
          {task.description && (
            <Text style={styles.description}>{task.description}</Text>
          )}
        </View>

        {/* Task Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Информация о задаче</Text>

          {/* Due Date */}
          {task.due_date && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={styles.infoLabel}>Срок выполнения:</Text>
              <Text style={styles.infoValue}>{formatDateTime(task.due_date)}</Text>
            </View>
          )}

          {/* Location */}
          {task.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#6b7280" />
              <Text style={styles.infoLabel}>Место:</Text>
              <Text style={styles.infoValue}>{task.location}</Text>
            </View>
          )}

          {/* Assigned To */}
          {task.assigned_to && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <Text style={styles.infoLabel}>Исполнитель:</Text>
              <Text style={styles.infoValue}>{task.assigned_to.name}</Text>
            </View>
          )}

          {/* Created Date */}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#6b7280" />
            <Text style={styles.infoLabel}>Создана:</Text>
            <Text style={styles.infoValue}>{formatDateTime(task.created_at)}</Text>
          </View>

          {/* Completed Date */}
          {task.completed_at && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
              <Text style={styles.infoLabel}>Завершена:</Text>
              <Text style={styles.infoValue}>{formatDateTime(task.completed_at)}</Text>
            </View>
          )}
        </View>

        {/* Equipment */}
        {task.equipment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Оборудование</Text>
            <TouchableOpacity
              style={styles.equipmentCard}
              onPress={handleEquipmentPress}
              activeOpacity={0.7}
            >
              <View style={styles.equipmentInfo}>
                <Ionicons name="hardware-chip" size={32} color="#3b82f6" />
                <View style={styles.equipmentDetails}>
                  <Text style={styles.equipmentName}>{task.equipment.name}</Text>
                  <Text style={styles.equipmentType}>{getEquipmentTypeLabel(task.equipment.type)}</Text>
                  {task.equipment.serial_number && (
                    <Text style={styles.equipmentSerial}>S/N: {task.equipment.serial_number}</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Фотографии ({task.photos?.length || 0})</Text>
            <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
              <Ionicons name="camera" size={20} color="#3b82f6" />
              <Text style={styles.addPhotoText}>Добавить</Text>
            </TouchableOpacity>
          </View>

          {task.photos && task.photos.length > 0 ? (
            <FlatList
              horizontal
              data={task.photos}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.photoItem}>
                  <Image source={{ uri: item.url }} style={styles.photoImage} />
                  {item.caption && (
                    <Text style={styles.photoCaption} numberOfLines={2}>
                      {item.caption}
                    </Text>
                  )}
                </View>
              )}
              contentContainerStyle={styles.photoList}
            />
          ) : (
            <View style={styles.emptyPhotos}>
              <Ionicons name="images-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyPhotosText}>Нет фотографий</Text>
            </View>
          )}
        </View>

        {/* Status Update Buttons */}
        {canUpdateStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Обновить статус</Text>
            <View style={styles.statusButtons}>
              {task.status !== TaskStatus.IN_PROGRESS && (
                <TouchableOpacity
                  style={[styles.statusButton, { backgroundColor: '#3b82f6' }]}
                  onPress={() => handleStatusUpdate(TaskStatus.IN_PROGRESS)}
                  disabled={updateStatusMutation.isPending}
                >
                  <Ionicons name="play-circle-outline" size={20} color="#fff" />
                  <Text style={styles.statusButtonText}>Начать работу</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: '#10b981' }]}
                onPress={handleCompleteTask}
                disabled={completeTaskMutation.isPending}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.statusButtonText}>Завершить</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Completed Message */}
        {task.status === TaskStatus.COMPLETED && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.completedText}>Задача выполнена</Text>
          </View>
        )}
      </ScrollView>

      {/* Complete Task Modal */}
      <Modal
        visible={completeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Завершить задачу</Text>
            <Text style={styles.modalSubtitle}>
              Добавьте заметки о выполнении (необязательно)
            </Text>

            <TextInput
              style={styles.notesInput}
              placeholder="Заметки..."
              placeholderTextColor="#9ca3af"
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setCompleteModalVisible(false)}
                disabled={completeTaskMutation.isPending}
              >
                <Text style={styles.modalButtonTextCancel}>Отмена</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmComplete}
                disabled={completeTaskMutation.isPending}
              >
                {completeTaskMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Завершить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Helper functions
function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return '#f59e0b';
    case TaskStatus.IN_PROGRESS:
      return '#3b82f6';
    case TaskStatus.COMPLETED:
      return '#10b981';
    case TaskStatus.CANCELLED:
      return '#6b7280';
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

function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.URGENT:
      return '#ef4444';
    case TaskPriority.HIGH:
      return '#f59e0b';
    case TaskPriority.MEDIUM:
      return '#3b82f6';
    case TaskPriority.LOW:
      return '#6b7280';
    default:
      return '#9ca3af';
  }
}

function getPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.URGENT:
      return 'Срочно';
    case TaskPriority.HIGH:
      return 'Высокий';
    case TaskPriority.MEDIUM:
      return 'Средний';
    case TaskPriority.LOW:
      return 'Низкий';
    default:
      return priority;
  }
}

function getEquipmentTypeLabel(type: string): string {
  switch (type) {
    case 'vending_machine':
      return 'Вендинговый автомат';
    case 'coffee_machine':
      return 'Кофемашина';
    case 'terminal':
      return 'Терминал';
    default:
      return type;
  }
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return `Сегодня в ${time}`;
  } else if (isYesterday) {
    return `Вчера в ${time}`;
  } else {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
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
    paddingBottom: 24,
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
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  equipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  equipmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  equipmentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  equipmentType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  equipmentSerial: {
    fontSize: 12,
    color: '#9ca3af',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 4,
  },
  photoList: {
    paddingVertical: 8,
  },
  photoItem: {
    marginRight: 12,
    width: 200,
  },
  photoImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  photoCaption: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  emptyPhotos: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyPhotosText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  statusButtons: {
    gap: 12,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    gap: 8,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 120,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonConfirm: {
    backgroundColor: '#10b981',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
