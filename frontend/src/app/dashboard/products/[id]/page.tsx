'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category_code: '',
    unit_of_measure_code: '',
    description: '',
    purchase_price: '',
    selling_price: '',
    is_ingredient: false,
    is_active: true,
    min_stock_level: '0',
    max_stock_level: '1000',
  });

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`http://localhost:3000/nomenclature/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      setFormData({
        sku: data.sku,
        name: data.name,
        category_code: data.category_code,
        unit_of_measure_code: data.unit_of_measure_code,
        description: data.description || '',
        purchase_price: data.purchase_price?.toString() || '',
        selling_price: data.selling_price?.toString() || '',
        is_ingredient: data.is_ingredient,
        is_active: data.is_active,
        min_stock_level: data.min_stock_level?.toString() || '0',
        max_stock_level: data.max_stock_level?.toString() || '1000',
      });
    } catch (error) {
      console.error('Failed to fetch product:', error);
      alert('Ошибка при загрузке данных');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(
        `http://localhost:3000/nomenclature/${params.id}`,
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
    } catch (error: any) {
      console.error('Failed to update product:', error);
      alert(error.response?.data?.message || 'Ошибка при обновлении');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены что хотите удалить этот товар?')) {return;}

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`http://localhost:3000/nomenclature/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/products');
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      alert(error.response?.data?.message || 'Ошибка при удалении');
    }
  };

  if (fetching) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Редактировать товар/ингредиент</h1>
        <p className="text-gray-600 mt-1">Обновите информацию о позиции номенклатуры</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Same form fields as create page */}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
          <input
            type="text"
            required
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Наименование *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Категория *
          </label>
          <select
            value={formData.category_code}
            onChange={(e) => setFormData({ ...formData, category_code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="snacks">Снеки</option>
            <option value="beverages">Напитки</option>
            <option value="coffee">Кофе</option>
            <option value="tea">Чай</option>
            <option value="milk">Молочные продукты</option>
            <option value="syrups">Сиропы</option>
            <option value="ingredients">Ингредиенты</option>
            <option value="other">Прочее</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Единица измерения *
          </label>
          <select
            value={formData.unit_of_measure_code}
            onChange={(e) => setFormData({ ...formData, unit_of_measure_code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="pcs">шт (штуки)</option>
            <option value="kg">кг (килограммы)</option>
            <option value="g">г (граммы)</option>
            <option value="l">л (литры)</option>
            <option value="ml">мл (миллилитры)</option>
            <option value="pack">уп (упаковки)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цена закупки (UZS)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цена продажи (UZS)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Мин. уровень запаса
            </label>
            <input
              type="number"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Макс. уровень запаса
            </label>
            <input
              type="number"
              value={formData.max_stock_level}
              onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Активен</span>
          </label>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
          >
            Удалить
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
