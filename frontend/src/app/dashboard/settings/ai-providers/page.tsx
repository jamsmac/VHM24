'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  Star,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react'
import {
  aiProvidersApi,
  AiProvider,
  AiProviderKeyResponse,
  AiProviderKeyStatus,
  ProviderStatus,
  CreateAiProviderKeyRequest,
  PROVIDER_INFO,
} from '@/lib/ai-providers-api'

export default function AiProvidersPage() {
  const [keys, setKeys] = useState<AiProviderKeyResponse[]>([])
  const [providersStatus, setProvidersStatus] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateAiProviderKeyRequest>({
    provider: AiProvider.OPENAI,
    name: '',
    api_key: '',
    api_endpoint: '',
    model_preference: '',
    is_default: false,
    description: '',
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [keysData, statusData] = await Promise.all([
        aiProvidersApi.getAll(),
        aiProvidersApi.getProvidersStatus(),
      ])
      setKeys(keysData)
      setProvidersStatus(statusData)
      setError(null)
    } catch (err) {
      setError('Не удалось загрузить данные')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await aiProvidersApi.update(editingId, formData)
      } else {
        await aiProvidersApi.create(formData)
      }
      resetForm()
      await loadData()
    } catch (err) {
      console.error(err)
      setError('Не удалось сохранить ключ')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот ключ?')) return
    try {
      await aiProvidersApi.delete(id)
      await loadData()
    } catch (err) {
      console.error(err)
      setError('Не удалось удалить ключ')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await aiProvidersApi.setDefault(id)
      await loadData()
    } catch (err) {
      console.error(err)
      setError('Не удалось установить ключ по умолчанию')
    }
  }

  const handleTestKey = async (id: string) => {
    try {
      setTesting(id)
      setTestResult(null)
      const result = await aiProvidersApi.testKey(id)
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Ключ работает!' : 'Ошибка'),
      })
    } catch {
      setTestResult({ success: false, message: 'Ошибка при тестировании' })
    } finally {
      setTesting(null)
    }
  }

  const handleTestNewKey = async () => {
    if (!formData.api_key) return
    try {
      setTesting('new')
      setTestResult(null)
      const result = await aiProvidersApi.testNewKey(
        formData.provider,
        formData.api_key,
        formData.api_endpoint || undefined
      )
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Ключ работает!' : result.error || 'Ошибка'),
      })
    } catch {
      setTestResult({ success: false, message: 'Ошибка при тестировании' })
    } finally {
      setTesting(null)
    }
  }

  const handleEdit = (key: AiProviderKeyResponse) => {
    setEditingId(key.id)
    setFormData({
      provider: key.provider,
      name: key.name,
      api_key: '', // Don't show the actual key
      api_endpoint: key.api_endpoint || '',
      model_preference: key.model_preference || '',
      is_default: key.is_default,
      description: key.description || '',
    })
    setShowForm(true)
    setTestResult(null)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      provider: AiProvider.OPENAI,
      name: '',
      api_key: '',
      api_endpoint: '',
      model_preference: '',
      is_default: false,
      description: '',
    })
    setShowApiKey(false)
    setTestResult(null)
  }

  const getStatusBadge = (status: AiProviderKeyStatus) => {
    switch (status) {
      case AiProviderKeyStatus.ACTIVE:
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Активен</span>
      case AiProviderKeyStatus.INACTIVE:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Неактивен</span>
      case AiProviderKeyStatus.ERROR:
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Ошибка</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Провайдеры</h1>
          <p className="mt-2 text-gray-600">Управление API ключами для AI сервисов</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить ключ
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Provider Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.values(AiProvider).map((provider) => {
          const info = PROVIDER_INFO[provider]
          const status = providersStatus.find(s => s.provider === provider)
          const hasKey = status?.has_key || false
          const hasFallback = status?.has_env_fallback || false

          return (
            <div
              key={provider}
              className={`p-4 rounded-lg border ${hasKey || hasFallback ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="text-2xl mb-2">{info.icon}</div>
              <div className="font-medium">{info.name}</div>
              <div className="text-xs text-gray-500 mb-2">{info.description}</div>
              <div className="flex gap-1">
                {hasKey && <span className="text-xs px-1 py-0.5 bg-green-200 text-green-800 rounded">DB</span>}
                {hasFallback && <span className="text-xs px-1 py-0.5 bg-blue-200 text-blue-800 rounded">ENV</span>}
                {!hasKey && !hasFallback && <span className="text-xs px-1 py-0.5 bg-gray-200 text-gray-600 rounded">Не настроен</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Редактировать ключ' : 'Добавить новый ключ'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Провайдер</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({...formData, provider: e.target.value as AiProvider})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={!!editingId}
                >
                  {Object.values(AiProvider).map((p) => (
                    <option key={p} value={p}>{PROVIDER_INFO[p].icon} {PROVIDER_INFO[p].name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Например: Production Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Ключ</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.api_key}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                  placeholder={editingId ? 'Оставьте пустым, чтобы не менять' : 'sk-...'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md pr-20"
                  required={!editingId}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestNewKey}
                    disabled={!formData.api_key || testing === 'new'}
                    className="p-1 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                  >
                    {testing === 'new' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {testResult && (
                <p className={`text-sm mt-1 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.success ? '✓' : '✗'} {testResult.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Endpoint <span className="text-gray-400">(опционально)</span>
                </label>
                <input
                  type="url"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({...formData, api_endpoint: e.target.value})}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Предпочитаемая модель <span className="text-gray-400">(опционально)</span>
                </label>
                <input
                  type="text"
                  value={formData.model_preference}
                  onChange={(e) => setFormData({...formData, model_preference: e.target.value})}
                  placeholder="gpt-4-turbo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание <span className="text-gray-400">(опционально)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Для чего используется этот ключ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
              />
              <span className="text-sm font-medium">Использовать по умолчанию для этого провайдера</span>
            </label>

            <div className="flex gap-3">
              <Button type="submit">
                <Check className="w-4 h-4 mr-2" />
                {editingId ? 'Сохранить' : 'Добавить'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" />
                Отмена
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Сохранённые ключи</h3>
        </div>
        {keys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Нет сохранённых ключей. Добавьте первый ключ для AI провайдера.
          </div>
        ) : (
          <div className="divide-y">
            {keys.map((key) => {
              const info = PROVIDER_INFO[key.provider]
              return (
                <div key={key.id} className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${info.color} flex items-center justify-center text-white text-lg`}>
                    {info.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {key.is_default && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {getStatusBadge(key.status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {info.name} • {key.api_key_masked}
                      {key.model_preference && ` • ${key.model_preference}`}
                    </div>
                    {key.last_error && (
                      <div className="text-sm text-red-500 mt-1">{key.last_error}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      Использований: {key.usage_count}
                      {key.last_used_at && ` • Последнее: ${new Date(key.last_used_at).toLocaleDateString('ru')}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestKey(key.id)}
                      disabled={testing === key.id}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-50"
                      title="Тестировать"
                    >
                      {testing === key.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                    </button>
                    {!key.is_default && (
                      <button
                        onClick={() => handleSetDefault(key.id)}
                        className="p-2 text-yellow-500 hover:bg-yellow-50 rounded"
                        title="Сделать по умолчанию"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(key)}
                      className="p-2 text-gray-500 hover:bg-gray-50 rounded"
                      title="Редактировать"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
