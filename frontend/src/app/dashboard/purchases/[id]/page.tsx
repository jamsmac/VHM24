'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getErrorMessage } from '@/lib/utils';
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
  notes?: string;
  status: 'ordered' | 'received' | 'cancelled';
  nomenclature?: {
    id: string;
    name: string;
    sku: string;
    unit_of_measure_code: string;
  };
}

interface WeightedAverageCost {
  weighted_average_cost: number;
  total_quantity: number;
  total_cost: number;
  purchase_count: number;
  oldest_purchase_date: string | null;
  latest_purchase_date: string | null;
}

export default function PurchaseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [wac, setWac] = useState<WeightedAverageCost | null>(null);
  const [loadingWac, setLoadingWac] = useState(false);

  const fetchWeightedAverageCost = useCallback(async (nomenclatureId: string) => {
    try {
      setLoadingWac(true);
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `http://localhost:3000/purchase-history/weighted-average-cost/${nomenclatureId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setWac(response.data);
    } catch (error) {
      console.error('Failed to fetch WAC:', error);
    } finally {
      setLoadingWac(false);
    }
  }, []);

  const fetchPurchase = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `http://localhost:3000/purchase-history/${params.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPurchase(response.data);

      // Fetch WAC for this nomenclature
      if (response.data.nomenclature_id) {
        fetchWeightedAverageCost(response.data.nomenclature_id);
      }
    } catch (error) {
      console.error('Failed to fetch purchase:', error);
      alert('Ошибка при загрузке закупки');
    } finally {
      setFetching(false);
    }
  }, [params.id, fetchWeightedAverageCost]);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  const handleStatusChange = async (newStatus: 'ordered' | 'received' | 'cancelled') => {
    if (!purchase) {return;}

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(
        `http://localhost:3000/purchase-history/${params.id}`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPurchase({ ...purchase, status: newStatus });
      alert('Статус закупки обновлен');
    } catch (error: unknown) {
      console.error('Failed to update status:', error);
      alert(getErrorMessage(error, 'Ошибка при обновлении статуса'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены что хотите удалить эту закупку?')) {return;}

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`http://localhost:3000/purchase-history/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/purchases');
    } catch (error: unknown) {
      console.error('Failed to delete purchase:', error);
      alert(getErrorMessage(error, 'Ошибка при удалении'));
    }
  };

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

  if (!purchase) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600">Закупка не найдена</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Закупка {purchase.purchase_number}
            </h1>
            <p className="text-gray-600 mt-1">
              Детальная информация о закупке
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.back()}
            >
              Назад
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Удалить
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Information */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Основная информация
          </h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Номенклатура
              </label>
              <p className="text-base font-medium text-gray-900">
                {purchase.nomenclature?.name || '-'}
              </p>
              {purchase.nomenclature?.sku && (
                <p className="text-sm text-gray-500">
                  SKU: {purchase.nomenclature.sku}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Статус
              </label>
              <div className="flex items-center gap-2">
                {getStatusBadge(purchase.status)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Дата закупки
              </label>
              <p className="text-base text-gray-900">
                {new Date(purchase.purchase_date).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Поставщик
              </label>
              <p className="text-base text-gray-900">
                {purchase.supplier_name || '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                № Накладной
              </label>
              <p className="text-base text-gray-900">
                {purchase.invoice_number || '-'}
              </p>
            </div>
          </div>

          {purchase.notes && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Примечания
              </label>
              <p className="text-base text-gray-900">{purchase.notes}</p>
            </div>
          )}
        </div>

        {/* Purchase Details */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Детали закупки
          </h2>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Количество
              </label>
              <p className="text-2xl font-bold text-gray-900">
                {purchase.quantity} {purchase.nomenclature?.unit_of_measure_code}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Цена за единицу
              </label>
              <p className="text-2xl font-bold text-gray-900">
                {purchase.unit_price.toLocaleString()} UZS
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Общая сумма
              </label>
              <p className="text-2xl font-bold text-blue-600">
                {purchase.total_amount.toLocaleString()} UZS
              </p>
            </div>
          </div>
        </div>

        {/* Weighted Average Cost */}
        {wac && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Средневзвешенная стоимость (WAC)
              <span className="ml-2 text-sm font-normal text-gray-500">
                для {purchase.nomenclature?.name}
              </span>
            </h2>

            {loadingWac ? (
              <p className="text-gray-500">Загрузка...</p>
            ) : (
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    WAC (Средневзвешенная)
                  </label>
                  <p className="text-2xl font-bold text-indigo-600">
                    {wac.weighted_average_cost.toLocaleString()} UZS
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Всего закуплено
                  </label>
                  <p className="text-xl font-bold text-gray-900">
                    {wac.total_quantity.toLocaleString()} {purchase.nomenclature?.unit_of_measure_code}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Общая стоимость
                  </label>
                  <p className="text-xl font-bold text-gray-900">
                    {wac.total_cost.toLocaleString()} UZS
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Количество закупок
                  </label>
                  <p className="text-xl font-bold text-gray-900">
                    {wac.purchase_count}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-600">
              <p>
                Формула: WAC = SUM(Quantity × Unit Price) / SUM(Quantity)
              </p>
              {wac.oldest_purchase_date && wac.latest_purchase_date && (
                <p className="mt-1">
                  Период: {new Date(wac.oldest_purchase_date).toLocaleDateString('ru-RU')} —{' '}
                  {new Date(wac.latest_purchase_date).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Status Actions */}
        {purchase.status !== 'cancelled' && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Действия со статусом
            </h2>

            <div className="flex gap-3">
              {purchase.status !== 'received' && (
                <Button
                  onClick={() => handleStatusChange('received')}
                  disabled={loading}
                >
                  Отметить как получено
                </Button>
              )}
              {purchase.status !== 'ordered' && (
                <Button
                  variant="secondary"
                  onClick={() => handleStatusChange('ordered')}
                  disabled={loading}
                >
                  Вернуть в "Заказано"
                </Button>
              )}
              <Button
                variant="danger"
                onClick={() => handleStatusChange('cancelled')}
                disabled={loading}
              >
                Отменить закупку
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
