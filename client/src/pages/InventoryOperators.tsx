import React from 'react';
import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function InventoryOperators() {
  return (
    <PlaceholderPage
      title="Operator Inventory"
      description="Track inventory assigned to field operators and manage operator stock levels."
      icon="👤"
      backLink="/dashboard/inventory"
    />
  );
}
