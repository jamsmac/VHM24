/**
 * Locations Screen - Browse vending machine locations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { clientApi, PublicLocation } from '../../services/clientApi';

export default function LocationsScreen() {
  const [locations, setLocations] = useState<PublicLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    loadLocations();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      loadLocations();
    }
  };

  const loadLocations = async () => {
    try {
      const result = await clientApi.getLocations({
        search: search || undefined,
        lat: userLocation?.lat,
        lng: userLocation?.lng,
      });
      setLocations(result.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLocations();
  };

  const handleSearch = () => {
    setLoading(true);
    loadLocations();
  };

  const renderLocation = ({ item }: { item: PublicLocation }) => (
    <TouchableOpacity style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <Text style={styles.locationName}>{item.name}</Text>
        {item.distance_km !== undefined && (
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate-outline" size={14} color="#3b82f6" />
            <Text style={styles.distanceText}>{item.distance_km} км</Text>
          </View>
        )}
      </View>

      {item.address && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.locationAddress}>{item.address}</Text>
        </View>
      )}

      {item.city && (
        <Text style={styles.locationCity}>{item.city}</Text>
      )}

      <View style={styles.locationFooter}>
        <View style={styles.machineCount}>
          <Ionicons name="cafe-outline" size={16} color="#3b82f6" />
          <Text style={styles.machineCountText}>
            {item.machine_count}{' '}
            {item.machine_count === 1
              ? 'автомат'
              : item.machine_count < 5
                ? 'автомата'
                : 'автоматов'}
          </Text>
        </View>

        {item.working_hours && (
          <Text style={styles.workingHours}>{item.working_hours}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по названию или адресу"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Locations list */}
      <FlatList
        data={locations}
        renderItem={renderLocation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Локации не найдены</Text>
            <Text style={styles.emptyText}>
              Попробуйте изменить параметры поиска
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    color: '#3b82f6',
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
    flex: 1,
  },
  locationCity: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  locationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  machineCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  machineCountText: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 4,
  },
  workingHours: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
