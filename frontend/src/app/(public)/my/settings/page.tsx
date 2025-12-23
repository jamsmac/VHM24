'use client'

import { useEffect, useState } from 'react'
import { User, Phone, Mail, Send, Save, Loader2, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { clientAuthApi } from '@/lib/client-api'
import { formatDate } from '@/lib/utils'
import type { ClientUser, ClientProfile } from '@/types/client'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [user, setUser] = useState<ClientUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState<ClientProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await clientAuthApi.getMe()
        setUser(userData)
        setFormData({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          phone: userData.phone || '',
          email: userData.email || '',
        })
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      const updatedUser = await clientAuthApi.updateProfile(formData)
      setUser(updatedUser)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="pt-6">
            <div className="h-48 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Настройки профиля</h1>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Личные данные</CardTitle>
          <CardDescription>
            Обновите информацию о себе для персонализации сервиса
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium">
                  Имя
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ваше имя"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium">
                  Фамилия
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ваша фамилия"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Телефон
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="+998 XX XXX XX XX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="example@email.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Сохранено
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Сохранить
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Telegram info */}
      {user?.telegram_username && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Telegram</CardTitle>
            <CardDescription>
              Ваш аккаунт привязан к Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="p-3 bg-blue-100 rounded-full">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">@{user.telegram_username}</p>
                <p className="text-sm text-muted-foreground">
                  Привязан {user.created_at ? formatDate(user.created_at) : 'недавно'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Информация об аккаунте</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">ID пользователя</dt>
              <dd className="font-mono text-sm mt-1">{user?.id?.slice(0, 8)}...</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Дата регистрации</dt>
              <dd className="text-sm mt-1">
                {user?.created_at ? formatDate(user.created_at) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Язык</dt>
              <dd className="text-sm mt-1">
                {user?.language_code === 'ru' ? 'Русский' : user?.language_code || 'Не указан'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Последнее обновление</dt>
              <dd className="text-sm mt-1">
                {user?.updated_at ? formatDate(user.updated_at) : '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
