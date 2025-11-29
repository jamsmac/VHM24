/**
 * Equipment Map Screen
 *
 * Interactive map showing equipment locations with filtering
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { Equipment, EquipmentStatus, EquipmentType } from '../../types';
import apiClient from '../../services/api';

// Tashkent, Uzbekistan coordinates
const TASHKENT_REGION = {
  latitude: 41.2995,
  longitude: 69.2401,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function EquipmentMapScreen() {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all');

  // Fetch equipment
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['equipment', statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await apiClient.getEquipment(params);
      return (response.data || []) as Equipment[];
    },
    staleTime: 60000, // 1 minute
  });

  const handleMarkerPress = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
  };

  const handleCloseDetails = () => {
    setSelectedEquipment(null);
  };

  const handleNavigate = (equipment: Equipment) => {
    if (equipment.lat && equipment.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${equipment.lat},${equipment.lng}`;
      Alert.alert(
        'Навигация',
        `Открыть навигацию к ${equipment.name} в Google Maps?`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Открыть',
            onPress: () => {
              // In production, use Linking.openURL(url)
              console.log('Navigate to:', url);
              Alert.alert('Навигация', 'Навигация будет доступна в релизе');
            },
          },
        ]
      );
    }
  };

  const getMarkerColor = (status: EquipmentStatus): string => {
    switch (status) {
      case EquipmentStatus.ACTIVE:
        return '#10b981'; // green
      case EquipmentStatus.INACTIVE:
        return '#6b7280'; // gray
      case EquipmentStatus.MAINTENANCE:
        return '#f59e0b'; // orange
      case EquipmentStatus.BROKEN:
        return '#ef4444'; // red
      default:
        return '#9ca3af';
    }
  };

  const getMarkerIcon = (type: EquipmentType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case EquipmentType.VENDING_MACHINE:
        return 'cube';
      case EquipmentType.COFFEE_MACHINE:
        return 'cafe';
      case EquipmentType.TERMINAL:
        return 'card';
      default:
        return 'location';
    }
  };

  const getStatusLabel = (status: EquipmentStatus): string => {
    switch (status) {
      case EquipmentStatus.ACTIVE:
        return 'Активен';
      case EquipmentStatus.INACTIVE:
        return 'Неактивен';
      case EquipmentStatus.MAINTENANCE:
        return 'Обслуживание';
      case EquipmentStatus.BROKEN:
        return 'Сломан';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: EquipmentType): string => {
    switch (type) {
      case EquipmentType.VENDING_MACHINE:
        return 'Вендинговый автомат';
      case EquipmentType.COFFEE_MACHINE:
        return 'Кофемашина';
      case EquipmentType.TERMINAL:
        return 'Терминал';
      default:
        return type;
    }
  };

  // Filter equipment with valid coordinates
  const equipmentWithCoords = (data || []).filter(
    (item) => item.lat != null && item.lng != null
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Загрузка карты...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Ошибка загрузки</Text>
        <Text style={styles.errorText}>Не удалось загрузить оборудование</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={TASHKENT_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {equipmentWithCoords.map((equipment) => (
          <Marker
            key={equipment.id}
            coordinate={{
              latitude: equipment.lat!,
              longitude: equipment.lng!,
            }}
            onPress={() => handleMarkerPress(equipment)}
            pinColor={getMarkerColor(equipment.status)}
          />
        ))}
      </MapView>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === item.value && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(item.value as EquipmentStatus | 'all')}
            >
              <View
                style={[
                  styles.filterDot,
                  { backgroundColor: item.color },
                ]}
              />
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Equipment Count */}
      <View style={styles.countBadge}>
        <Ionicons name="hardware-chip" size={16} color="#fff" />
        <Text style={styles.countText}>{equipmentWithCoords.length}</Text>
      </View>

      {/* Selected Equipment Details */}
      {selectedEquipment && (
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <View style={styles.detailsTitle}>
              <Ionicons
                name={getMarkerIcon(selectedEquipment.type)}
                size={24}
                color="#3b82f6"
              />
              <Text style={styles.equipmentName}>{selectedEquipment.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseDetails}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.detailsContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Тип:</Text>
              <Text style={styles.detailValue}>
                {getTypeLabel(selectedEquipment.type)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Статус:</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getMarkerColor(selectedEquipment.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {getStatusLabel(selectedEquipment.status)}
                </Text>
              </View>
            </View>

            {selectedEquipment.serial_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>S/N:</Text>
                <Text style={styles.detailValue}>
                  {selectedEquipment.serial_number}
                </Text>
              </View>
            )}

            {selectedEquipment.location && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Адрес:</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {selectedEquipment.location}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.detailsActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleNavigate(selectedEquipment)}
            >
              <Ionicons name="navigate" size={20} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Навигация</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Empty State */}
      {equipmentWithCoords.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="map-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>
            {statusFilter !== 'all'
              ? 'Нет оборудования с выбранным фильтром'
              : 'Нет оборудования на карте'}
          </Text>
          {statusFilter !== 'all' && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => setStatusFilter('all')}
            >
              <Text style={styles.clearFilterText}>Сбросить фильтр</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const STATUS_FILTERS = [
  { label: 'Все', value: 'all', color: '#9ca3af' },
  { label: 'Активен', value: EquipmentStatus.ACTIVE, color: '#10b981' },
  { label: 'Неактивен', value: EquipmentStatus.INACTIVE, color: '#6b7280' },
  { label: 'Обслуживание', value: EquipmentStatus.MAINTENANCE, color: '#f59e0b' },
  { label: 'Сломан', value: EquipmentStatus.BROKEN, color: '#ef4444' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
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
  filtersContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
  },
  filtersList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  countBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    gap: 6,
  },
  countText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  equipmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  detailsContent: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 60,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  detailsActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  emptyCard: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    width: 200,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  clearFilterButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
