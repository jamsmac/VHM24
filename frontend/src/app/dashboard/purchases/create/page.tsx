'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';

interface Nomenclature {
  id: string;
  name: string;
  sku: string;
  unit_of_measure_code: string;
  purchase_price?: number;
}

export default function CreatePurchasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nomenclatureList, setNomenclatureList] = useState<Nomenclature[]>([]);
  const [formData, setFormData] = useState({
    nomenclature_id: '',
    quantity: '',
    unit_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    invoice_number: '',
    notes: '',
    status: 'received' as 'ordered' | 'received' | 'cancelled',
  });

  useEffect(() => {
    fetchNomenclature();
  }, []);

  const fetchNomenclature = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:3000/nomenclature', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNomenclatureList(response.data);
    } catch (error) {
      console.error('Failed to fetch nomenclature:', error);
    }
  };

  const handleNomenclatureChange = (nomenclatureId: string) => {
    setFormData({ ...formData, nomenclature_id: nomenclatureId });

    // Auto-fill unit price if available
    const item = nomenclatureList.find((n) => n.id === nomenclatureId);
    if (item && item.purchase_price) {
      setFormData((prev) => ({
        ...prev,
        nomenclature_id: nomenclatureId,
        unit_price: item.purchase_price!.toString(),
      }));
    }
  };

  const calculateTotalAmount = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unit_price) || 0;
    return (quantity * unitPrice).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');

      await axios.post(
        'http://localhost:3000/purchase-history',
        {
          nomenclature_id: formData.nomenclature_id,
          quantity: parseFloat(formData.quantity),
          unit_price: parseFloat(formData.unit_price),
          total_amount: parseFloat(calculateTotalAmount()),
          purchase_date: formData.purchase_date,
          supplier_name: formData.supplier_name || null,
          invoice_number: formData.invoice_number || null,
          notes: formData.notes || null,
          status: formData.status,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      router.push('/purchases');
    } catch (error: any) {
      console.error('Failed to create purchase:', error);
      alert(error.response?.data?.message || 'Ошибка при создании закупки');
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = nomenclatureList.find((n) => n.id === formData.nomenclature_id);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Добавить закупку</h1>
        <p className="text-gray-600 mt-1">
          Зарегистрируйте новую закупку товаров или ингредиентов
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Nomenclature Selection */}
        <FormSelect
          label="Номенклатура"
          id="nomenclature_id"
          required
          value={formData.nomenclature_id}
          onChange={(e) => handleNomenclatureChange(e.target.value)}
          options={[
            { value: '', label: 'Выберите номенклатуру' },
            ...nomenclatureList.map((item) => ({
              value: item.id,
              label: `${item.name} (${item.sku}) - ${item.unit_of_measure_code}`,
            })),
          ]}
        />

        {/* Purchase Date */}
        <FormInput
          label="Дата закупки"
          id="purchase_date"
          type="date"
          required
          value={formData.purchase_date}
          onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
        />

        {/* Quantity and Unit Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormInput
              label="Количество"
              id="quantity"
              type="number"
              step="0.01"
              min={0}
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
            {selectedItem && (
              <span className="mt-1 px-3 py-1 bg-gray-100 rounded-md text-sm text-gray-700 inline-block">
                {selectedItem.unit_of_measure_code}
              </span>
            )}
          </div>

          <FormInput
            label="Цена за единицу (UZS)"
            id="unit_price"
            type="number"
            step="0.01"
            min={0}
            required
            value={formData.unit_price}
            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
          />
        </div>

        {/* Total Amount Display */}
        {formData.quantity && formData.unit_price && (
          <div className="p-4 bg-blue-50 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Общая сумма закупки:
              </span>
              <span className="text-lg font-bold text-blue-600">
                {calculateTotalAmount()} UZS
              </span>
            </div>
          </div>
        )}

        {/* Supplier Information */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Поставщик"
            id="supplier_name"
            type="text"
            value={formData.supplier_name}
            onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
            placeholder="Название поставщика"
          />
          <FormInput
            label="№ Накладной"
            id="invoice_number"
            type="text"
            value={formData.invoice_number}
            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            placeholder="INV-001"
          />
        </div>

        {/* Status */}
        <FormSelect
          label="Статус"
          id="status"
          required
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          options={[
            { value: 'ordered', label: 'Заказано' },
            { value: 'received', label: 'Получено' },
            { value: 'cancelled', label: 'Отменено' },
          ]}
        />

        {/* Notes */}
        <FormTextarea
          label="Примечания"
          id="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Дополнительная информация о закупке..."
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Отмена
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Создать закупку'}
          </Button>
        </div>
      </form>
    </div>
  );
}
