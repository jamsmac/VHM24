'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';

export default function CreateProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category_code: 'snacks',
    unit_of_measure_code: 'pcs',
    description: '',
    purchase_price: '',
    selling_price: '',
    is_ingredient: false,
    is_active: true,
    min_stock_level: '0',
    max_stock_level: '1000',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        'http://localhost:3000/nomenclature',
        {
          ...formData,
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
          selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
          min_stock_level: parseInt(formData.min_stock_level),
          max_stock_level: parseInt(formData.max_stock_level),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      router.push('/products');
    } catch (error: unknown) {
      console.error('Failed to create product:', error);
      alert(getErrorMessage(error, 'Ошибка при создании'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Создать товар/ингредиент</h1>
        <p className="text-gray-600 mt-1">
          Добавьте новую позицию номенклатуры в систему
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип номенклатуры *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={!formData.is_ingredient}
                onChange={() => setFormData({ ...formData, is_ingredient: false })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Товар для продажи</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={formData.is_ingredient}
                onChange={() => setFormData({ ...formData, is_ingredient: true })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Ингредиент для производства</span>
            </label>
          </div>
        </div>

        {/* SKU */}
        <FormInput
          label="SKU (артикул)"
          id="sku"
          type="text"
          required
          value={formData.sku}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          placeholder="PROD-001"
        />

        {/* Name */}
        <FormInput
          label="Наименование"
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Кофе арабика в зернах"
        />

        {/* Category */}
        <FormSelect
          label="Категория"
          id="category_code"
          required
          value={formData.category_code}
          onChange={(e) => setFormData({ ...formData, category_code: e.target.value })}
          options={[
            { value: 'snacks', label: 'Снеки' },
            { value: 'beverages', label: 'Напитки' },
            { value: 'coffee', label: 'Кофе' },
            { value: 'tea', label: 'Чай' },
            { value: 'milk', label: 'Молочные продукты' },
            { value: 'syrups', label: 'Сиропы' },
            { value: 'ingredients', label: 'Ингредиенты' },
            { value: 'other', label: 'Прочее' },
          ]}
        />

        {/* Unit of Measure */}
        <FormSelect
          label="Единица измерения"
          id="unit_of_measure_code"
          required
          value={formData.unit_of_measure_code}
          onChange={(e) => setFormData({ ...formData, unit_of_measure_code: e.target.value })}
          options={[
            { value: 'pcs', label: 'шт (штуки)' },
            { value: 'kg', label: 'кг (килограммы)' },
            { value: 'g', label: 'г (граммы)' },
            { value: 'l', label: 'л (литры)' },
            { value: 'ml', label: 'мл (миллилитры)' },
            { value: 'pack', label: 'уп (упаковки)' },
          ]}
        />

        {/* Prices */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Цена закупки (UZS)"
            id="purchase_price"
            type="number"
            step="0.01"
            value={formData.purchase_price}
            onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
            placeholder="10000"
          />
          <FormInput
            label="Цена продажи (UZS)"
            id="selling_price"
            type="number"
            step="0.01"
            value={formData.selling_price}
            onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
            placeholder="15000"
          />
        </div>

        {/* Stock Levels */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Мин. уровень запаса"
            id="min_stock_level"
            type="number"
            value={formData.min_stock_level}
            onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
          />
          <FormInput
            label="Макс. уровень запаса"
            id="max_stock_level"
            type="number"
            value={formData.max_stock_level}
            onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
          />
        </div>

        {/* Description */}
        <FormTextarea
          label="Описание"
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Дополнительная информация о товаре..."
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Создать'}
          </Button>
        </div>
      </form>
    </div>
  );
}
