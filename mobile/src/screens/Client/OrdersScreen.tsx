/**
 * Orders Screen - View order history
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clientApi, ClientOrder } from '../../services/clientApi';

const ORDER_STATUS_LABELS: Record<string, string> = {
  created: 'Создан',
  pending_payment: 'Ожидает оплаты',
  paid: 'Оплачен',
  preparing: 'Готовится',
  ready: 'Готов',
  completed: 'Завершён',
  cancelled: 'Отменён',
  refunded: 'Возврат',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  created: '#9ca3af',
  pending_payment: '#f59e0b',
  paid: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#10b981',
  completed: '#10b981',
  cancelled: '#ef4444',
  refunded: '#ef4444',
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const result = await clientApi.getOrders();
      setOrders(result.data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const renderOrder = ({ item }: { item: ClientOrder }) => {
    const statusColor = ORDER_STATUS_COLORS[item.status] || '#9ca3af';
    const statusLabel = ORDER_STATUS_LABELS[item.status] || item.status;

    return (
      <TouchableOpacity style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>
              Заказ #{item.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {item.machine && (
          <View style={styles.machineInfo}>
            <Ionicons name="cafe-outline" size={16} color="#6b7280" />
            <Text style={styles.machineText}>
              {item.machine.machine_number} - {item.machine.name}
            </Text>
          </View>
        )}

        <View style={styles.orderItems}>
          {item.items.slice(0, 3).map((orderItem: any, index: number) => (
            <Text key={index} style={styles.orderItem}>
              {orderItem.quantity}x {orderItem.name}
            </Text>
          ))}
          {item.items.length > 3 && (
            <Text style={styles.orderItemMore}>
              +{item.items.length - 3} ещё
            </Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.orderTotal}>
            <Text style={styles.orderTotalLabel}>Итого:</Text>
            <Text style={styles.orderTotalValue}>
              {item.final_amount.toLocaleString()} {item.currency}
            </Text>
          </View>

          {item.points_earned > 0 && (
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.pointsText}>+{item.points_earned}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Заказов пока нет</Text>
            <Text style={styles.emptyText}>
              Сканируйте QR-код на автомате, чтобы сделать первый заказ
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
  listContent: {
    padding: 16,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  machineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  machineText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  orderItemMore: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderTotal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTotalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  orderTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginLeft: 4,
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
