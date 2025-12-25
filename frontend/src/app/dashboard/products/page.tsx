'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Nomenclature {
  id: string;
  sku: string;
  name: string;
  category_code: string;
  unit_of_measure_code: string;
  purchase_price: number;
  selling_price: number;
  is_ingredient: boolean;
  is_active: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Nomenclature[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'products' | 'ingredients'>('all');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        const response = await axios.get('http://localhost:3000/nomenclature', {
          headers: { Authorization: `Bearer ${token}` },
          params: filter !== 'all' ? { is_ingredient: filter === 'ingredients' } : {},
        });
        setProducts(response.data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [filter]);

  const filteredProducts = products.filter((p) => {
    if (filter === 'all') {return true;}
    if (filter === 'products') {return !p.is_ingredient;}
    if (filter === 'ingredients') {return p.is_ingredient;}
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Товары и ингредиенты</h1>
          <p className="text-gray-600 mt-1">
            Управление номенклатурой для продажи и производства
          </p>
        </div>
        <Link href="/products/create">
          <Button>+ Создать</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          Все ({products.length})
        </Button>
        <Button
          variant={filter === 'products' ? 'primary' : 'secondary'}
          onClick={() => setFilter('products')}
        >
          Товары ({products.filter((p) => !p.is_ingredient).length})
        </Button>
        <Button
          variant={filter === 'ingredients' ? 'primary' : 'secondary'}
          onClick={() => setFilter('ingredients')}
        >
          Ингредиенты ({products.filter((p) => p.is_ingredient).length})
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Наименование
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ед. изм.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Цена закупки
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Цена продажи
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Нет данных для отображения
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant={product.is_ingredient ? 'warning' : 'success'}>
                        {product.is_ingredient ? 'Ингредиент' : 'Товар'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.unit_of_measure_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.purchase_price
                        ? `${product.purchase_price.toLocaleString()} UZS`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.selling_price
                        ? `${product.selling_price.toLocaleString()} UZS`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant={product.is_active ? 'success' : 'default'}>
                        {product.is_active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/products/${product.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Редактировать
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
