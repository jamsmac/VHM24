/**
 * Client Menu Screen - View machine menu and place orders
 *
 * Updated with "Warm Brew" design system
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clientApi, PublicMenuItem } from '../../services/clientApi';
import { ClientStackParamList } from '../../navigation/ClientNavigator';
import {
  ClientColors,
  ClientSpacing,
  ClientBorderRadius,
  ClientShadows,
} from '../../theme';

type ClientMenuRouteProp = RouteProp<ClientStackParamList, 'ClientMenu'>;

interface CartItem {
  item: PublicMenuItem;
  quantity: number;
}

// Category filter component
function CategoryPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.categoryPill, active && styles.categoryPillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Product card component with animations
function ProductCard({
  item,
  quantity,
  onAdd,
  onRemove,
  index,
}: {
  item: PublicMenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  index: number;
}) {
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAdd = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onAdd();
  };

  return (
    <Animated.View
      style={[
        styles.productCard,
        !item.is_available && styles.productCardDisabled,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Product Image */}
      <View style={styles.productImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="cafe" size={40} color={ClientColors.primary.caramel} />
          </View>
        )}

        {/* Unavailable overlay */}
        {!item.is_available && (
          <View style={styles.unavailableOverlay}>
            <View style={styles.unavailableBadge}>
              <Text style={styles.unavailableBadgeText}>Нет в наличии</Text>
            </View>
          </View>
        )}

        {/* Favorite button */}
        <TouchableOpacity style={styles.favoriteButton} activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={20} color={ClientColors.text.muted} />
        </TouchableOpacity>
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Footer with price and add button */}
        <View style={styles.productFooter}>
          <View>
            <Text style={styles.productPrice}>
              {item.price.toLocaleString()} {item.currency}
            </Text>
            {/* Points badge - if applicable */}
            {item.points_earned && item.points_earned > 0 && (
              <View style={styles.pointsBadge}>
                <Ionicons name="star" size={12} color={ClientColors.accent.gold} />
                <Text style={styles.pointsText}>+{item.points_earned}</Text>
              </View>
            )}
          </View>

          {/* Quantity controls or Add button */}
          {item.is_available && (
            <View style={styles.quantityContainer}>
              {quantity > 0 ? (
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={onRemove}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={18} color={ClientColors.primary.espresso} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={handleAdd}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={18} color={ClientColors.primary.espresso} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAdd}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={22} color={ClientColors.text.inverse} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function ClientMenuScreen() {
  const route = useRoute<ClientMenuRouteProp>();
  const insets = useSafeAreaInsets();
  const { machineId, machineName, machineNumber } = route.params;

  const [menu, setMenu] = useState<PublicMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart animation
  const cartScaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadMenu();
  }, [machineId]);

  // Animate cart when items change
  useEffect(() => {
    if (cart.length > 0) {
      Animated.sequence([
        Animated.timing(cartScaleAnim, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(cartScaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [cart]);

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

  const addToCart = useCallback((item: PublicMenuItem) => {
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
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      return prev.filter((c) => c.item.id !== itemId);
    });
  }, []);

  const getCartQuantity = useCallback(
    (itemId: string) => {
      return cart.find((c) => c.item.id === itemId)?.quantity || 0;
    },
    [cart]
  );

  const getTotalAmount = useCallback(() => {
    return cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  }, [cart]);

  const getTotalItems = useCallback(() => {
    return cart.reduce((sum, c) => sum + c.quantity, 0);
  }, [cart]);

  // Extract unique categories
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    menu.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return ['all', ...Array.from(cats)];
  }, [menu]);

  // Filtered menu
  const filteredMenu = React.useMemo(() => {
    if (selectedCategory === 'all') return menu;
    return menu.filter((item) => item.category === selectedCategory);
  }, [menu, selectedCategory]);

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
            Alert.alert('В разработке', 'Оплата будет доступна в следующей версии');
          },
        },
      ]
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: PublicMenuItem; index: number }) => (
      <ProductCard
        item={item}
        quantity={getCartQuantity(item.id)}
        onAdd={() => addToCart(item)}
        onRemove={() => removeFromCart(item.id)}
        index={index}
      />
    ),
    [getCartQuantity, addToCart, removeFromCart]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ClientColors.primary.espresso} />
        <Text style={styles.loadingText}>Загружаем меню...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Machine info header */}
      <View style={styles.machineHeader}>
        <View style={styles.machineIconContainer}>
          <Ionicons name="cafe" size={24} color={ClientColors.primary.espresso} />
        </View>
        <View style={styles.machineDetails}>
          <Text style={styles.machineName}>{machineName}</Text>
          <Text style={styles.machineNumber}>Аппарат #{machineNumber}</Text>
        </View>
      </View>

      {/* Category filters */}
      {categories.length > 1 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => (
              <CategoryPill
                label={item === 'all' ? 'Все' : item}
                active={selectedCategory === item}
                onPress={() => setSelectedCategory(item)}
              />
            )}
          />
        </View>
      )}

      {/* Menu list */}
      <FlatList
        data={filteredMenu}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: cart.length > 0 ? 120 : 80 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="cafe-outline" size={48} color={ClientColors.primary.caramel} />
            </View>
            <Text style={styles.emptyTitle}>Меню пусто</Text>
            <Text style={styles.emptyText}>Товары скоро появятся</Text>
          </View>
        }
      />

      {/* Cart footer */}
      {cart.length > 0 && (
        <Animated.View
          style={[
            styles.cartFooter,
            { paddingBottom: Math.max(insets.bottom, 16) },
            { transform: [{ scale: cartScaleAnim }] },
          ]}
        >
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>
              {getTotalItems()} {getTotalItems() === 1 ? 'товар' : 'товаров'}
            </Text>
            <Text style={styles.cartTotal}>{getTotalAmount().toLocaleString()} UZS</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            activeOpacity={0.8}
          >
            <Text style={styles.checkoutText}>Оплатить</Text>
            <Ionicons name="arrow-forward" size={18} color={ClientColors.text.inverse} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ClientColors.background.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ClientColors.background.cream,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: ClientColors.text.secondary,
  },

  // Machine header
  machineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ClientColors.background.milk,
    paddingHorizontal: ClientSpacing.lg,
    paddingVertical: ClientSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ClientColors.background.latte,
  },
  machineIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ClientColors.background.latte,
    justifyContent: 'center',
    alignItems: 'center',
  },
  machineDetails: {
    marginLeft: ClientSpacing.md,
  },
  machineName: {
    fontSize: 17,
    fontWeight: '600',
    color: ClientColors.text.primary,
  },
  machineNumber: {
    fontSize: 14,
    color: ClientColors.text.secondary,
    marginTop: 2,
  },

  // Categories
  categoriesContainer: {
    backgroundColor: ClientColors.background.milk,
    borderBottomWidth: 1,
    borderBottomColor: ClientColors.background.latte,
  },
  categoriesList: {
    paddingHorizontal: ClientSpacing.lg,
    paddingVertical: ClientSpacing.md,
    gap: ClientSpacing.sm,
  },
  categoryPill: {
    paddingHorizontal: ClientSpacing.lg,
    paddingVertical: ClientSpacing.sm,
    borderRadius: ClientBorderRadius.pill,
    backgroundColor: ClientColors.background.latte,
    marginRight: ClientSpacing.sm,
  },
  categoryPillActive: {
    backgroundColor: ClientColors.primary.espresso,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: ClientColors.text.secondary,
  },
  categoryPillTextActive: {
    color: ClientColors.text.inverse,
  },

  // List
  listContent: {
    padding: ClientSpacing.lg,
  },

  // Product card
  productCard: {
    backgroundColor: ClientColors.background.milk,
    borderRadius: ClientBorderRadius.card,
    marginBottom: ClientSpacing.md,
    overflow: 'hidden',
    ...ClientShadows.md,
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  productImageContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
    backgroundColor: ClientColors.background.latte,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableBadge: {
    backgroundColor: ClientColors.status.error,
    paddingHorizontal: ClientSpacing.md,
    paddingVertical: ClientSpacing.xs,
    borderRadius: ClientBorderRadius.sm,
  },
  unavailableBadgeText: {
    color: ClientColors.text.inverse,
    fontSize: 13,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: ClientSpacing.md,
    right: ClientSpacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...ClientShadows.sm,
  },
  productInfo: {
    padding: ClientSpacing.lg,
  },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    color: ClientColors.text.primary,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: ClientColors.text.secondary,
    lineHeight: 20,
    marginBottom: ClientSpacing.md,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: ClientColors.primary.espresso,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: ClientColors.accent.gold,
    marginLeft: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ClientColors.background.latte,
    borderRadius: ClientBorderRadius.md,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: ClientBorderRadius.sm,
    backgroundColor: ClientColors.background.milk,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: ClientColors.text.primary,
    minWidth: 32,
    textAlign: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: ClientBorderRadius.button,
    backgroundColor: ClientColors.primary.espresso,
    justifyContent: 'center',
    alignItems: 'center',
    ...ClientShadows.md,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ClientColors.background.latte,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ClientSpacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ClientColors.text.primary,
    marginBottom: ClientSpacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: ClientColors.text.secondary,
  },

  // Cart footer
  cartFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ClientColors.background.milk,
    paddingHorizontal: ClientSpacing.lg,
    paddingTop: ClientSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: ClientColors.background.latte,
    ...Platform.select({
      ios: {
        shadowColor: ClientColors.primary.espresso,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cartInfo: {
    flex: 1,
  },
  cartCount: {
    fontSize: 14,
    color: ClientColors.text.secondary,
  },
  cartTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: ClientColors.text.primary,
    marginTop: 2,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ClientColors.primary.espresso,
    paddingHorizontal: ClientSpacing.xl,
    paddingVertical: ClientSpacing.md,
    borderRadius: ClientBorderRadius.button,
    ...ClientShadows.md,
  },
  checkoutText: {
    color: ClientColors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginRight: ClientSpacing.sm,
  },
});
