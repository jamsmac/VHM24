'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Nomenclature {
  id: string;
  name: string;
  sku: string;
  unit_of_measure_code: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface OpeningBalanceRow {
  nomenclature_id: string;
  warehouse_id: string;
  quantity: number;
  unit_cost: number;
  balance_date: string;
  notes?: string;
}

export default function OpeningBalancesPage() {
  const [nomenclatureList, setNomenclatureList] = useState<Nomenclature[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [balanceRows, setBalanceRows] = useState<OpeningBalanceRow[]>([]);
  const [balanceDate, setBalanceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [defaultWarehouse, setDefaultWarehouse] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');

      // Fetch nomenclature
      const nomenclatureResponse = await axios.get(
        'http://localhost:3000/nomenclature',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNomenclatureList(nomenclatureResponse.data);

      // Fetch warehouses (assuming there's a warehouses endpoint)
      try {
        const warehousesResponse = await axios.get(
          'http://localhost:3000/warehouse',
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setWarehouses(warehousesResponse.data);
        if (warehousesResponse.data.length > 0) {
          setDefaultWarehouse(warehousesResponse.data[0].id);
        }
      } catch {
        // Warehouses endpoint not available, using default
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const addRow = () => {
    setBalanceRows([
      ...balanceRows,
      {
        nomenclature_id: '',
        warehouse_id: defaultWarehouse,
        quantity: 0,
        unit_cost: 0,
        balance_date: balanceDate,
        notes: '',
      },
    ]);
  };

  const removeRow = (index: number) => {
    setBalanceRows(balanceRows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: string, value: any) => {
    const updated = [...balanceRows];
    updated[index] = { ...updated[index], [field]: value };
    setBalanceRows(updated);
  };

  const calculateTotalValue = () => {
    return balanceRows
      .reduce((sum, row) => sum + row.quantity * row.unit_cost, 0)
      .toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (balanceRows.length === 0) {
      alert('Добавьте хотя бы одну позицию');
      return;
    }

    // Validate all rows
    const hasInvalidRows = balanceRows.some(
      (row) =>
        !row.nomenclature_id ||
        row.quantity <= 0 ||
        row.unit_cost <= 0
    );

    if (hasInvalidRows) {
      alert('Заполните все обязательные поля для каждой позиции');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');

      // Use bulk create endpoint
      const response = await axios.post(
        'http://localhost:3000/opening-balances/bulk',
        {
          balances: balanceRows.map((row) => ({
            ...row,
            quantity: parseFloat(row.quantity.toString()),
            unit_cost: parseFloat(row.unit_cost.toString()),
          })),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = response.data;

      if (result.failed > 0) {
        alert(
          `Создано: ${result.created}\nОшибок: ${result.failed}\n\nПроверьте данные и попробуйте снова.`
        );
      } else {
        alert(`Успешно создано начальных остатков: ${result.created}`);
        setBalanceRows([]);
      }
    } catch (error: any) {
      console.error('Failed to create opening balances:', error);
      alert(
        error.response?.data?.message ||
          'Ошибка при создании начальных остатков'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = () => {
    // Add 5 empty rows as a template
    const template = Array(5)
      .fill(null)
      .map(() => ({
        nomenclature_id: '',
        warehouse_id: defaultWarehouse,
        quantity: 0,
        unit_cost: 0,
        balance_date: balanceDate,
        notes: '',
      }));
    setBalanceRows([...balanceRows, ...template]);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Начальные остатки
        </h1>
        <p className="text-gray-600 mt-1">
          Массовый ввод начальных остатков товаров и ингредиентов на дату
          начала учета
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Settings Section */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Параметры ввода
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата остатков *
              </label>
              <input
                type="date"
                required
                value={balanceDate}
                onChange={(e) => {
                  setBalanceDate(e.target.value);
                  // Update all rows with new date
                  setBalanceRows(
                    balanceRows.map((row) => ({
                      ...row,
                      balance_date: e.target.value,
                    }))
                  );
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {warehouses.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Склад по умолчанию
                </label>
                <select
                  value={defaultWarehouse}
                  onChange={(e) => {
                    setDefaultWarehouse(e.target.value);
                    // Update all rows with new warehouse
                    setBalanceRows(
                      balanceRows.map((row) => ({
                        ...row,
                        warehouse_id: e.target.value,
                      }))
                    );
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={loadTemplate}
              >
                Загрузить шаблон (5 строк)
              </Button>
            </div>
          </div>
        </div>

        {/* Balances Table */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Список остатков
            </h2>
            <Button type="button" variant="secondary" onClick={addRow}>
              + Добавить позицию
            </Button>
          </div>

          {balanceRows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Нет позиций для ввода</p>
              <p className="text-sm mt-2">
                Нажмите "Добавить позицию" или "Загрузить шаблон"
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      №
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Номенклатура *
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Количество *
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Цена за единицу *
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Сумма
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Примечание
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {balanceRows.map((row, index) => {
                    const totalRowValue = row.quantity * row.unit_cost;
                    const selectedItem = nomenclatureList.find(
                      (item) => item.id === row.nomenclature_id
                    );

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.nomenclature_id}
                            onChange={(e) =>
                              updateRow(
                                index,
                                'nomenclature_id',
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Выберите...</option>
                            {nomenclatureList.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.sku})
                              </option>
                            ))}
                          </select>
                          {selectedItem && (
                            <span className="text-xs text-gray-500">
                              {selectedItem.unit_of_measure_code}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.quantity}
                            onChange={(e) =>
                              updateRow(
                                index,
                                'quantity',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.unit_cost}
                            onChange={(e) =>
                              updateRow(
                                index,
                                'unit_cost',
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 font-medium">
                          {totalRowValue.toLocaleString()} UZS
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.notes || ''}
                            onChange={(e) =>
                              updateRow(index, 'notes', e.target.value)
                            }
                            placeholder="Примечание"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => removeRow(index)}
                          >
                            Удалить
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          {balanceRows.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600">
                    Всего позиций:
                  </span>
                  <p className="text-lg font-bold text-gray-900">
                    {balanceRows.length}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">
                    Общее количество:
                  </span>
                  <p className="text-lg font-bold text-gray-900">
                    {balanceRows
                      .reduce((sum, row) => sum + row.quantity, 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">
                    Общая стоимость:
                  </span>
                  <p className="text-lg font-bold text-blue-600">
                    {calculateTotalValue()} UZS
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setBalanceRows([])}
          >
            Очистить все
          </Button>
          <Button type="submit" disabled={loading || balanceRows.length === 0}>
            {loading ? 'Сохранение...' : 'Сохранить начальные остатки'}
          </Button>
        </div>
      </form>
    </div>
  );
}
