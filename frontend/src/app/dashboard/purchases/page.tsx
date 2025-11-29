'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Purchase {
  id: string;
  purchase_number: string;
  nomenclature_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  purchase_date: string;
  supplier_name?: string;
  invoice_number?: string;
  status: 'ordered' | 'received' | 'cancelled';
  nomenclature?: {
    id: string;
    name: string;
    sku: string;
    unit_of_measure_code: string;
  };
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ordered' | 'received' | 'cancelled'>('all');

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:3000/purchase-history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPurchases(response.data);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    if (filter === 'all') {return true;}
    return p.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ordered':
        return <Badge variant="warning">Заказано</Badge>;
      case 'received':
        return <Badge variant="success">Получено</Badge>;
      case 'cancelled':
        return <Badge variant="default">Отменено</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getTotalAmount = () => {
    return filteredPurchases
      .reduce((sum, p) => sum + p.total_amount, 0)
      .toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">История закупок</h1>
          <p className="text-gray-600 mt-1">
            Учет всех закупок товаров и ингредиентов
          </p>
        </div>
        <Link href="/purchases/create">
          <Button>+ Добавить закупку</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          Все ({purchases.length})
        </Button>
        <Button
          variant={filter === 'ordered' ? 'primary' : 'secondary'}
          onClick={() => setFilter('ordered')}
        >
          Заказано ({purchases.filter((p) => p.status === 'ordered').length})
        </Button>
        <Button
          variant={filter === 'received' ? 'primary' : 'secondary'}
          onClick={() => setFilter('received')}
        >
          Получено ({purchases.filter((p) => p.status === 'received').length})
        </Button>
        <Button
          variant={filter === 'cancelled' ? 'primary' : 'secondary'}
          onClick={() => setFilter('cancelled')}
        >
          Отменено ({purchases.filter((p) => p.status === 'cancelled').length})
        </Button>
      </div>

      {/* Summary Card */}
      {filteredPurchases.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-gray-600">Всего закупок:</span>
              <p className="text-lg font-bold text-gray-900">
                {filteredPurchases.length}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Общее количество:</span>
              <p className="text-lg font-bold text-gray-900">
                {filteredPurchases
                  .reduce((sum, p) => sum + p.quantity, 0)
                  .toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Общая сумма:</span>
              <p className="text-lg font-bold text-blue-600">
                {getTotalAmount()} UZS
              </p>
            </div>
          </div>
        </div>
      )}

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
                  № Закупки
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Номенклатура
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Поставщик
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Количество
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Цена за ед.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
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
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Нет данных для отображения
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {purchase.purchase_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(purchase.purchase_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{purchase.nomenclature?.name || '-'}</div>
                      {purchase.nomenclature?.sku && (
                        <div className="text-xs text-gray-500">
                          {purchase.nomenclature.sku}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {purchase.supplier_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.quantity} {purchase.nomenclature?.unit_of_measure_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.unit_price.toLocaleString()} UZS
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {purchase.total_amount.toLocaleString()} UZS
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(purchase.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/purchases/${purchase.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Просмотр
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
