/**
 * VendHub Mobile - Loading Components
 *
 * Consistent loading indicators across the app
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  DimensionValue,
} from 'react-native';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Full screen loading indicator
 */
export function LoadingScreen({
  message = 'Загрузка...',
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color="#3b82f6" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

/**
 * Loading overlay that covers content
 */
export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color="#3b82f6" />
        {message && <Text style={styles.overlayMessage}>{message}</Text>}
      </View>
    </View>
  );
}

interface LoadingInlineProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

/**
 * Inline loading indicator
 */
export function LoadingInline({
  size = 'small',
  color = '#3b82f6',
  style,
}: LoadingInlineProps) {
  return (
    <View style={[styles.inline, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton placeholder for loading states
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        style,
      ]}
    />
  );
}

/**
 * Card skeleton for list loading
 */
export function CardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.cardSkeletonHeader}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.cardSkeletonHeaderText}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Skeleton width="100%" height={12} style={{ marginTop: 16 }} />
      <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

/**
 * List skeleton with multiple cards
 */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listSkeleton}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  overlayMessage: {
    marginTop: 16,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  inline: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
  cardSkeleton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  cardSkeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSkeletonHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  listSkeleton: {
    paddingTop: 16,
  },
});

export default LoadingScreen;
