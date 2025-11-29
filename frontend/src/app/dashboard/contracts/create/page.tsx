'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '@/lib/contracts-api'
import { counterpartiesApi } from '@/lib/counterparties-api'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect } from '@/components/ui/form-field'
import { ArrowLeft, Calculator, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CommissionType, ContractStatus, CreateContractDto, TieredCommissionTier } from '@/types/contract'
import { toast } from 'react-toastify'

export default function CreateContractPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const counterpartyIdParam = searchParams.get('counterparty_id')

  const [formData, setFormData] = useState<CreateContractDto>({
    contract_number: '',
    start_date: new Date().toISOString().split('T')[0],
    counterparty_id: counterpartyIdParam || '',
    commission_type: CommissionType.PERCENTAGE,
    currency: 'UZS',
    payment_term_days: 30,
    payment_type: 'postpayment',
    status: ContractStatus.DRAFT,
  })

  const [calculatorRevenue, setCalculatorRevenue] = useState<number>(10000000) // 10M UZS
  const [calculatedCommission, setCalculatedCommission] = useState<number>(0)

  // Get all counterparties for selection
  const { data: counterparties } = useQuery({
    queryKey: ['counterparties'],
    queryFn: () => counterpartiesApi.getAll({ is_active: true }),
  })

  // Commission calculator
  useEffect(() => {
    let commission = 0
    if (formData.commission_type === 'percentage' && formData.commission_rate) {
      commission = (calculatorRevenue * formData.commission_rate) / 100
    } else if (formData.commission_type === 'fixed' && formData.commission_fixed_amount) {
      commission = formData.commission_fixed_amount
    } else if (formData.commission_type === 'tiered' && formData.commission_tiers) {
      formData.commission_tiers.forEach((tier) => {
        const from = tier.from
        const to = tier.to || Infinity
        if (calculatorRevenue > from) {
          const tierRevenue = Math.min(calculatorRevenue, to) - from
          commission += (tierRevenue * tier.rate) / 100
        }
      })
    } else if (formData.commission_type === 'hybrid') {
      const fixed = formData.commission_hybrid_fixed || 0
      const percentage = formData.commission_hybrid_rate || 0
      commission = fixed + (calculatorRevenue * percentage) / 100
    }
    setCalculatedCommission(commission)
  }, [formData, calculatorRevenue])

  const createMutation = useMutation({
    mutationFn: contractsApi.create,
    onSuccess: (data) => {
      toast.success('Договор успешно создан')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      router.push(`/dashboard/contracts/${data.id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при создании договора')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleChange = (field: keyof CreateContractDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addTier = () => {
    const tiers = formData.commission_tiers || []
    const lastTier = tiers[tiers.length - 1]
    const newTier: TieredCommissionTier = {
      from: lastTier ? (lastTier.to || 0) : 0,
      to: null,
      rate: 0,
    }
    handleChange('commission_tiers', [...tiers, newTier])
  }

  const updateTier = (index: number, field: keyof TieredCommissionTier, value: any) => {
    const tiers = [...(formData.commission_tiers || [])]
    tiers[index] = { ...tiers[index], [field]: value }
    handleChange('commission_tiers', tiers)
  }

  const removeTier = (index: number) => {
    const tiers = formData.commission_tiers?.filter((_, i) => i !== index) || []
    handleChange('commission_tiers', tiers)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/contracts">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Создать договор</h1>
          <p className="mt-2 text-gray-600">Заполните данные нового договора</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Номер договора"
                id="contract_number"
                type="text"
                required
                value={formData.contract_number}
                onChange={(e) => handleChange('contract_number', e.target.value)}
                placeholder="№123/2025"
              />

              <FormSelect
                label="Контрагент"
                id="counterparty_id"
                required
                value={formData.counterparty_id}
                onChange={(e) => handleChange('counterparty_id', e.target.value)}
                options={[
                  { value: '', label: 'Выберите контрагента' },
                  ...(counterparties?.map((cp) => ({
                    value: cp.id,
                    label: `${cp.name} (${cp.inn})`,
                  })) || []),
                ]}
              />

              <FormInput
                label="Дата начала"
                id="start_date"
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
              />

              <FormInput
                label="Дата окончания"
                id="end_date"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => handleChange('end_date', e.target.value || null)}
              />

              <FormSelect
                label="Статус"
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as ContractStatus)}
                options={[
                  { value: 'draft', label: 'Черновик' },
                  { value: 'active', label: 'Активный' },
                ]}
              />
            </div>
          </div>

          {/* Commission Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Настройка комиссии</h3>
            <div className="space-y-4">
              <FormSelect
                label="Тип комиссии"
                id="commission_type"
                required
                value={formData.commission_type}
                onChange={(e) => handleChange('commission_type', e.target.value as CommissionType)}
                options={[
                  { value: 'percentage', label: 'Процент от оборота' },
                  { value: 'fixed', label: 'Фиксированная сумма' },
                  { value: 'tiered', label: 'Ступенчатая' },
                  { value: 'hybrid', label: 'Гибридная (фиксированная + процент)' },
                ]}
              />

              {/* PERCENTAGE */}
              {formData.commission_type === 'percentage' && (
                <FormInput
                  label="Процент комиссии"
                  id="commission_rate"
                  type="number"
                  required
                  step="0.01"
                  min={0}
                  max={100}
                  value={formData.commission_rate || ''}
                  onChange={(e) => handleChange('commission_rate', parseFloat(e.target.value))}
                  placeholder="15"
                />
              )}

              {/* FIXED */}
              {formData.commission_type === 'fixed' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Сумма (UZS)"
                    id="commission_fixed_amount"
                    type="number"
                    required
                    min={0}
                    value={formData.commission_fixed_amount || ''}
                    onChange={(e) => handleChange('commission_fixed_amount', parseFloat(e.target.value))}
                    placeholder="500000"
                  />
                  <FormSelect
                    label="Период"
                    id="commission_fixed_period"
                    required
                    value={formData.commission_fixed_period || 'monthly'}
                    onChange={(e) => handleChange('commission_fixed_period', e.target.value)}
                    options={[
                      { value: 'daily', label: 'Ежедневно' },
                      { value: 'weekly', label: 'Еженедельно' },
                      { value: 'monthly', label: 'Ежемесячно' },
                      { value: 'quarterly', label: 'Ежеквартально' },
                    ]}
                  />
                </div>
              )}

              {/* TIERED */}
              {formData.commission_type === 'tiered' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Уровни комиссии</label>
                    <Button type="button" size="sm" onClick={addTier}>
                      <Plus className="h-3 w-3 mr-1" />
                      Добавить уровень
                    </Button>
                  </div>
                  {formData.commission_tiers?.map((tier, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 items-center p-3 bg-gray-50 rounded">
                      <div>
                        <label className="text-xs text-gray-600">От (UZS)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={tier.from}
                          onChange={(e) => updateTier(index, 'from', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">До (UZS)</label>
                        <input
                          type="number"
                          min="0"
                          value={tier.to || ''}
                          onChange={(e) => updateTier(index, 'to', e.target.value ? parseFloat(e.target.value) : null)}
                          className="w-full px-2 py-1 text-sm border rounded"
                          placeholder="∞"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Ставка (%)</label>
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0"
                          max="100"
                          value={tier.rate}
                          onChange={(e) => updateTier(index, 'rate', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTier(index)}
                        className="text-red-600 hover:text-red-800 mt-5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* HYBRID */}
              {formData.commission_type === 'hybrid' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Фиксированная часть (UZS)"
                    id="commission_hybrid_fixed"
                    type="number"
                    required
                    min={0}
                    value={formData.commission_hybrid_fixed || ''}
                    onChange={(e) => handleChange('commission_hybrid_fixed', parseFloat(e.target.value))}
                    placeholder="200000"
                  />
                  <FormInput
                    label="Процентная часть (%)"
                    id="commission_hybrid_rate"
                    type="number"
                    required
                    step="0.01"
                    min={0}
                    max={100}
                    value={formData.commission_hybrid_rate || ''}
                    onChange={(e) => handleChange('commission_hybrid_rate', parseFloat(e.target.value))}
                    placeholder="10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Payment Terms */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Условия оплаты</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Срок оплаты (дней)"
                id="payment_term_days"
                type="number"
                min={1}
                value={formData.payment_term_days || 30}
                onChange={(e) => handleChange('payment_term_days', parseInt(e.target.value))}
              />
              <FormSelect
                label="Тип оплаты"
                id="payment_type"
                value={formData.payment_type || 'postpayment'}
                onChange={(e) => handleChange('payment_type', e.target.value)}
                options={[
                  { value: 'prepayment', label: 'Предоплата' },
                  { value: 'postpayment', label: 'Постоплата' },
                  { value: 'on_delivery', label: 'При доставке' },
                ]}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={createMutation.isPending} className="flex-1 md:flex-none">
              {createMutation.isPending ? 'Создание...' : 'Создать договор'}
            </Button>
            <Link href="/dashboard/contracts">
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </Link>
          </div>
        </div>

        {/* Right column: Commission Calculator */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-medium text-gray-900">Калькулятор комиссии</h3>
            </div>

            <div className="space-y-4">
              <FormInput
                label="Тестовый оборот (UZS)"
                id="calculator_revenue"
                type="number"
                min={0}
                value={calculatorRevenue}
                onChange={(e) => setCalculatorRevenue(parseFloat(e.target.value) || 0)}
              />

              <div className="border-t border-indigo-200 pt-4">
                <div className="text-sm text-gray-600 mb-2">Рассчитанная комиссия:</div>
                <div className="text-3xl font-bold text-indigo-600">
                  {calculatedCommission.toLocaleString('ru-RU')} <span className="text-lg">UZS</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {calculatorRevenue > 0
                    ? `${((calculatedCommission / calculatorRevenue) * 100).toFixed(2)}% от оборота`
                    : ''}
                </div>
              </div>

              <div className="bg-white rounded p-3 text-xs text-gray-600">
                <p className="font-medium mb-1">Пример расчета:</p>
                {formData.commission_type === 'percentage' && formData.commission_rate && (
                  <p>{calculatorRevenue.toLocaleString()} × {formData.commission_rate}% = {calculatedCommission.toLocaleString()} UZS</p>
                )}
                {formData.commission_type === 'fixed' && formData.commission_fixed_amount && (
                  <p>Фиксированная сумма: {formData.commission_fixed_amount.toLocaleString()} UZS / {formData.commission_fixed_period}</p>
                )}
                {formData.commission_type === 'tiered' && formData.commission_tiers && (
                  <div>
                    {formData.commission_tiers.map((tier, i) => (
                      <p key={i}>
                        {tier.from.toLocaleString()} - {tier.to ? tier.to.toLocaleString() : '∞'}: {tier.rate}%
                      </p>
                    ))}
                  </div>
                )}
                {formData.commission_type === 'hybrid' && (
                  <p>
                    {formData.commission_hybrid_fixed?.toLocaleString()} + ({calculatorRevenue.toLocaleString()} × {formData.commission_hybrid_rate}%)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
