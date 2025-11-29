import React from 'react';
import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function InventoryMachines() {
  return (
    <PlaceholderPage
      title="Machine Inventory"
      description="View inventory levels in all vending machines and track consumption patterns."
      icon="🎰"
      backLink="/dashboard/inventory"
    />
  );
}
