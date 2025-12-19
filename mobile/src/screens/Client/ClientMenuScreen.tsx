/**
 * Client Menu Screen - View machine menu and place orders
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { clientApi, PublicMenuItem } from '../../services/clientApi';
import { ClientStackParamList } from '../../navigation/ClientNavigator';

type ClientMenuRouteProp = RouteProp<ClientStackParamList, 'ClientMenu'>;

interface CartItem {
  item: PublicMenuItem;
  quantity: number;
}

export default function ClientMenuScreen() {
  const route = useRoute<ClientMenuRouteProp>();
  const { machineId, machineName, machineNumber } = route.params;

  const [menu, setMenu] = useState<PublicMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    loadMenu();
  }, [machineId]);

  const loadMenu = async () => {
    try {
      const result = await clientApi.getMenu(machineId);
      setMenu(result.data);
    } catch (error) {
      console.error('Failed to load menu:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить меню');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: PublicMenuItem) => {
    if (!item.is_available) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      return prev.filter((c) => c.item.id !== itemId);
    });
  };

  const getCartQuantity = (itemId: string) => {
    return cart.find((c) => c.item.id === itemId)?.quantity || 0;
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, c) => sum + c.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Корзина пуста', 'Добавьте товары в корзину');
      return;
    }

    Alert.alert(
      'Оформление заказа',
      `Итого: ${getTotalAmount().toLocaleString()} UZS\nТоваров: ${getTotalItems()}`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Оплатить',
          onPress: () => {
            // TODO: Implement payment flow
            Alert.alert('В разработке', 'Оплата будет доступна в следующей версии');
          },
        },
      ]
    );
  };

  const renderMenuItem = ({ item }: { item: PublicMenuItem }) => {
    const quantity = getCartQuantity(item.id);

    return (
      <View style={[styles.menuCard, !item.is_available && styles.menuCardDisabled]}>
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.menuImage} />
        )}
        {!item.image_url && (
          <View style={styles.menuImagePlaceholder}>
            <Ionicons name="cafe-outline" size={32} color="#9ca3af" />
          </View>
        )}

        <View style={styles.menuInfo}>
          <Text style={styles.menuName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.menuDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.menuFooter}>
            <Text style={styles.menuPrice}>
              {item.price.toLocaleString()} {item.currency}
            </Text>
            {!item.is_available && (
              <Text style={styles.unavailableText}>Нет в наличии</Text>
            )}
          </View>
        </View>

        {item.is_available && (
          <View style={styles.quantityContainer}>
            {quantity > 0 ? (
              <>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => removeFromCart(item.id)}
                >
                  <Ionicons name="remove" size={20} color="#3b82f6" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => addToCart(item)}
                >
                  <Ionicons name="add" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(item)}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
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
      {/* Machine info */}
      <View style={styles.machineInfo}>
        <Ionicons name="cafe" size={24} color="#3b82f6" />
        <View style={styles.machineDetails}>
          <Text style={styles.machineName}>{machineName}</Text>
          <Text style={styles.machineNumber}>Аппарат #{machineNumber}</Text>
        </View>
      </View>

      {/* Menu list */}
      <FlatList
        data={menu}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cafe-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Меню пусто</Text>
            <Text style={styles.emptyText}>
              Товары скоро появятся
            </Text>
          </View>
        }
      />

      {/* Cart footer */}
      {cart.length > 0 && (
        <View style={styles.cartFooter}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{getTotalItems()} товаров</Text>
            <Text style={styles.cartTotal}>
              {getTotalAmount().toLocaleString()} UZS
            </Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Text style={styles.checkoutText}>Оплатить</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
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
  machineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  machineDetails: {
    marginLeft: 12,
  },
  machineName: {
    fontSize: 16,
    fontWeight: '600',
  },
  machineNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuCardDisabled: {
    opacity: 0.6,
  },
  menuImage: {
    width: 100,
    height: 100,
  },
  menuImagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuInfo: {
    flex: 1,
    padding: 12,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  menuFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  unavailableText: {
    fontSize: 12,
    color: '#ef4444',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cartInfo: {
    flex: 1,
  },
  cartCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
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
