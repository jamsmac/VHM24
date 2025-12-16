import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
import { Button } from './button'
import { Badge } from './badge'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. This is a simple card example.</p>
      </CardContent>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card with Footer</CardTitle>
        <CardDescription>This card has action buttons in the footer.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Some content for the card body.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </CardFooter>
    </Card>
  ),
}

export const MachineCard: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>VM-001</CardTitle>
            <CardDescription>Кофейный автомат - Центральный офис</CardDescription>
          </div>
          <Badge variant="success">Активен</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Заполненность</span>
            <p className="font-medium">85%</p>
          </div>
          <div>
            <span className="text-gray-500">Продажи сегодня</span>
            <p className="font-medium">1,250,000 сум</p>
          </div>
          <div>
            <span className="text-gray-500">Последняя инкассация</span>
            <p className="font-medium">2 дня назад</p>
          </div>
          <div>
            <span className="text-gray-500">Последний визит</span>
            <p className="font-medium">5 часов назад</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Подробнее</Button>
      </CardFooter>
    </Card>
  ),
}

export const StatsCard: Story = {
  render: () => (
    <Card className="w-[250px]">
      <CardHeader className="pb-2">
        <CardDescription>Всего аппаратов</CardDescription>
        <CardTitle className="text-3xl">156</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-green-600">+12% с прошлого месяца</p>
      </CardContent>
    </Card>
  ),
}

export const TaskCard: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Пополнение VM-001</CardTitle>
            <CardDescription>Центральный офис, Этаж 2</CardDescription>
          </div>
          <Badge variant="warning">В работе</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Исполнитель:</span>
          <span className="font-medium text-gray-900">Иванов И.И.</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          <span>Срок:</span>
          <span className="font-medium text-gray-900">Сегодня, 18:00</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" className="flex-1">Отменить</Button>
        <Button className="flex-1">Выполнить</Button>
      </CardFooter>
    </Card>
  ),
}

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Активные аппараты</CardDescription>
          <CardTitle className="text-2xl text-green-600">142</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Требуют внимания</CardDescription>
          <CardTitle className="text-2xl text-orange-600">8</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>С ошибками</CardDescription>
          <CardTitle className="text-2xl text-red-600">3</CardTitle>
        </CardHeader>
      </Card>
    </div>
  ),
}
