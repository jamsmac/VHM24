import React from 'react';
import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function InventoryWarehouse() {
  return (
    <PlaceholderPage
      title="Warehouse Inventory"
      description="Manage central warehouse inventory, track stock levels, and process transfers."
      icon="🏭"
      backLink="/dashboard/inventory"
    />
  );
}
