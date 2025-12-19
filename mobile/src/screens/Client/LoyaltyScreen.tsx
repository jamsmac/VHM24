/**
 * Loyalty Screen - View loyalty points and history
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  clientApi,
  LoyaltyBalance,
  LoyaltyTransaction,
} from '../../services/clientApi';

export default function LoyaltyScreen() {
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balanceData, historyData] = await Promise.all([
        clientApi.getLoyaltyBalance(),
        clientApi.getLoyaltyHistory(),
      ]);
      setBalance(balanceData);
      setTransactions(historyData.data);
    } catch (error) {
      console.error('Failed to load loyalty data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'order_earned':
        return 'add-circle-outline';
      case 'order_redeemed':
        return 'remove-circle-outline';
      case 'referral_bonus':
        return 'people-outline';
      case 'promo_bonus':
        return 'gift-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'order_earned':
        return 'Начисление за покупку';
      case 'order_redeemed':
        return 'Списание за скидку';
      case 'referral_bonus':
        return 'Бонус за реферала';
      case 'promo_bonus':
        return 'Промо-бонус';
      case 'manual_adjustment':
        return 'Корректировка';
      default:
        return reason;
    }
  };

  const renderTransaction = ({ item }: { item: LoyaltyTransaction }) => {
    const isPositive = item.delta > 0;

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionIcon}>
          <Ionicons
            name={getReasonIcon(item.reason)}
            size={24}
            color={isPositive ? '#10b981' : '#ef4444'}
          />
        </View>

        <View style={styles.transactionInfo}>
          <Text style={styles.transactionReason}>
            {getReasonLabel(item.reason)}
          </Text>
          {item.description && (
            <Text style={styles.transactionDescription}>
              {item.description}
            </Text>
          )}
          <Text style={styles.transactionDate}>
            {new Date(item.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.transactionAmount}>
          <Text
            style={[
              styles.transactionDelta,
              isPositive ? styles.positive : styles.negative,
            ]}
          >
            {isPositive ? '+' : ''}
            {item.delta}
          </Text>
          <Text style={styles.transactionBalance}>
            Баланс: {item.balance_after}
          </Text>
        </View>
      </View>
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
      {/* Balance card */}
      {balance && (
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="star" size={32} color="#f59e0b" />
            <Text style={styles.balanceTitle}>Ваши баллы</Text>
          </View>

          <Text style={styles.balancePoints}>{balance.points_balance}</Text>

          <Text style={styles.balanceValue}>
            ≈ {balance.points_value_uzs.toLocaleString()} UZS
          </Text>

          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>
                {balance.lifetime_points}
              </Text>
              <Text style={styles.balanceStatLabel}>Всего заработано</Text>
            </View>
          </View>
        </View>
      )}

      {/* History */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>История операций</Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>История пуста</Text>
            <Text style={styles.emptyText}>
              Совершайте покупки, чтобы накапливать баллы
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
  balanceCard: {
    backgroundColor: '#3b82f6',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceTitle: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  balancePoints: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceValue: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  balanceStats: {
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    justifyContent: 'center',
  },
  balanceStat: {
    alignItems: 'center',
  },
  balanceStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  historyHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionReason: {
    fontSize: 16,
    fontWeight: '500',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionDelta: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  transactionBalance: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
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
  },
});
