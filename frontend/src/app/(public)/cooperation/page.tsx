'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building, Phone, Mail, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { clientApi } from '@/lib/client-api'
import { CooperationRequest } from '@/types/client'
import { getErrorMessage } from '@/types/common'

export default function CooperationPage() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState<CooperationRequest>({
    name: '',
    phone: '',
    email: '',
    company: '',
    message: '',
  })

  const submitMutation = useMutation({
    mutationFn: (data: CooperationRequest) =>
      clientApi.submitCooperationRequest(data),
    onSuccess: () => {
      setSubmitted(true)
      toast.success('Заявка отправлена!')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Ошибка при отправке заявки')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitMutation.mutate(formData)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Заявка отправлена!</h1>
          <p className="text-muted-foreground mb-6">
            Спасибо за ваш интерес к сотрудничеству с VendHub. Наш менеджер
            свяжется с вами в ближайшее время.
          </p>
          <Button onClick={() => setSubmitted(false)}>
            Отправить ещё заявку
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Сотрудничество</h1>
          <p className="text-xl text-muted-foreground">
            Установите автомат VendHub в своём помещении и получайте пассивный
            доход
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Benefits */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Преимущества</h2>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Дополнительный доход</h3>
                      <p className="text-sm text-muted-foreground">
                        Получайте процент от продаж автомата в вашем помещении
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-primary">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Без вложений</h3>
                      <p className="text-sm text-muted-foreground">
                        Мы берём на себя установку, обслуживание и пополнение
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-primary">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Удобство для клиентов</h3>
                      <p className="text-sm text-muted-foreground">
                        Ваши посетители смогут покупать напитки и снеки 24/7
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-primary">4</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Современные технологии</h3>
                      <p className="text-sm text-muted-foreground">
                        Безналичная оплата, QR-коды, Telegram бот
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Контакты</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span>+998 71 123 45 67</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span>partners@vendhub.uz</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <span>г. Ташкент, ул. Примерная, 123</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Оставить заявку</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ваше имя *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Иван Иванов"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+998 90 123 45 67"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ivan@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Компания / Организация</Label>
                  <Input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="ООО Компания"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Сообщение *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Расскажите о вашем помещении и пожеланиях..."
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? 'Отправка...' : 'Отправить заявку'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Нажимая кнопку, вы соглашаетесь с обработкой персональных
                  данных
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
