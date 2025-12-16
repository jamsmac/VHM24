import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Modal } from './Modal'
import {
  ConfirmDialog,
  DeleteConfirmDialog,
  DiscardChangesDialog,
  BulkDeleteConfirmDialog,
} from './ConfirmDialog'
import { Button } from './button'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Modal Title"
        >
          <p className="text-gray-600">
            This is the modal content. You can put any content here.
          </p>
        </Modal>
      </>
    )
  },
}

export const WithFooter: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Confirm Action"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpen(false)}>
                Confirm
              </Button>
            </div>
          }
        >
          <p className="text-gray-600">
            Are you sure you want to perform this action?
          </p>
        </Modal>
      </>
    )
  },
}

export const Sizes: Story = {
  render: () => {
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'full' | null>(null)
    return (
      <>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSize('sm')}>Small</Button>
          <Button variant="outline" onClick={() => setSize('md')}>Medium</Button>
          <Button variant="outline" onClick={() => setSize('lg')}>Large</Button>
          <Button variant="outline" onClick={() => setSize('xl')}>XL</Button>
          <Button variant="outline" onClick={() => setSize('full')}>Full</Button>
        </div>
        <Modal
          isOpen={size !== null}
          onClose={() => setSize(null)}
          title={`${size?.toUpperCase()} Modal`}
          size={size || 'md'}
        >
          <p className="text-gray-600">
            This is a {size} sized modal. The content will adjust to the modal size.
          </p>
        </Modal>
      </>
    )
  },
}

export const ConfirmDialogExample: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Show Confirm Dialog</Button>
        <ConfirmDialog
          isOpen={open}
          onClose={() => setOpen(false)}
          onConfirm={() => {
            alert('Confirmed!')
            setOpen(false)
          }}
          title="Подтверждение"
          description="Вы уверены, что хотите выполнить это действие?"
        />
      </>
    )
  },
}

export const DeleteConfirmExample: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Delete Item
        </Button>
        <DeleteConfirmDialog
          isOpen={open}
          onClose={() => setOpen(false)}
          onConfirm={() => {
            alert('Deleted!')
            setOpen(false)
          }}
          itemName="Кофейный автомат VM-001"
        />
      </>
    )
  },
}

export const DiscardChangesExample: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Show Discard Dialog
        </Button>
        <DiscardChangesDialog
          isOpen={open}
          onClose={() => setOpen(false)}
          onDiscard={() => {
            alert('Changes discarded!')
            setOpen(false)
          }}
          onSave={() => {
            alert('Changes saved!')
            setOpen(false)
          }}
        />
      </>
    )
  },
}

export const BulkDeleteExample: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Delete Selected (5)
        </Button>
        <BulkDeleteConfirmDialog
          isOpen={open}
          onClose={() => setOpen(false)}
          onConfirm={() => {
            alert('Bulk deleted!')
            setOpen(false)
          }}
          count={5}
          itemType="аппараты"
        />
      </>
    )
  },
}

export const FormModal: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Form</Button>
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Создать задачу"
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button onClick={() => setOpen(false)}>
                Создать
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип задачи
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option>Пополнение</option>
                <option>Инкассация</option>
                <option>Обслуживание</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Аппарат
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option>VM-001 - Центральный офис</option>
                <option>VM-002 - Торговый центр</option>
                <option>VM-003 - Бизнес-центр</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Исполнитель
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option>Иванов И.И.</option>
                <option>Петров П.П.</option>
                <option>Сидоров С.С.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Комментарий
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Введите комментарий..."
              />
            </div>
          </div>
        </Modal>
      </>
    )
  },
}
