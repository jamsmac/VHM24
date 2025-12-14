import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Edit, Trash2, Eye } from 'lucide-react'
import {
  DataTableRowActions,
  RowAction,
  RowActionGroup,
} from './data-table-row-actions'

interface TestRow {
  id: string
  name: string
  status: 'active' | 'disabled'
}

const mockRow: TestRow = {
  id: '1',
  name: 'Test Item',
  status: 'active',
}

describe('DataTableRowActions', () => {
  describe('Basic Rendering', () => {
    it('should render the menu trigger button', () => {
      const actions: RowAction<TestRow>[] = [
        {
          label: 'View',
          onClick: vi.fn(),
        },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      expect(screen.getByRole('button', { name: /действия/i })).toBeInTheDocument()
    })

    it('should render custom menu label', () => {
      const actions: RowAction<TestRow>[] = [
        {
          label: 'View',
          onClick: vi.fn(),
        },
      ]

      render(
        <DataTableRowActions
          row={mockRow}
          actions={actions}
          menuLabel="Options"
        />
      )

      expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument()
    })

    it('should not render anything if all actions are hidden', () => {
      const actions: RowAction<TestRow>[] = [
        {
          label: 'Hidden Action',
          onClick: vi.fn(),
          hidden: true,
        },
      ]

      const { container } = render(
        <DataTableRowActions row={mockRow} actions={actions} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Menu Interaction', () => {
    it('should open menu when trigger is clicked', async () => {
      const user = userEvent.setup()
      const actions: RowAction<TestRow>[] = [
        {
          label: 'View',
          onClick: vi.fn(),
        },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument()
      })
    })

    it('should display all visible actions in menu', async () => {
      const user = userEvent.setup()
      const actions: RowAction<TestRow>[] = [
        { label: 'View', onClick: vi.fn() },
        { label: 'Edit', onClick: vi.fn() },
        { label: 'Delete', onClick: vi.fn() },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
      })
    })
  })

  describe('Action Callbacks', () => {
    it('should call onClick with row data when action is clicked', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      const actions: RowAction<TestRow>[] = [
        {
          label: 'View',
          onClick: handleClick,
        },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('menuitem', { name: /view/i }))

      expect(handleClick).toHaveBeenCalledTimes(1)
      expect(handleClick).toHaveBeenCalledWith(mockRow)
    })

    it('should call correct callback for multiple actions', async () => {
      const user = userEvent.setup()
      const handleView = vi.fn()
      const handleEdit = vi.fn()
      const actions: RowAction<TestRow>[] = [
        { label: 'View', onClick: handleView },
        { label: 'Edit', onClick: handleEdit },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('menuitem', { name: /edit/i }))

      expect(handleView).not.toHaveBeenCalled()
      expect(handleEdit).toHaveBeenCalledWith(mockRow)
    })
  })

  describe('Hidden Actions', () => {
    it('should not render actions with hidden=true', async () => {
      const user = userEvent.setup()
      const actions: RowAction<TestRow>[] = [
        { label: 'Visible', onClick: vi.fn() },
        { label: 'Hidden', onClick: vi.fn(), hidden: true },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /visible/i })).toBeInTheDocument()
      })

      expect(screen.queryByRole('menuitem', { name: /hidden/i })).not.toBeInTheDocument()
    })

    it('should evaluate hidden function with row data', async () => {
      const user = userEvent.setup()
      const disabledRow: TestRow = { ...mockRow, status: 'disabled' }
      const actions: RowAction<TestRow>[] = [
        { label: 'Always Visible', onClick: vi.fn() },
        {
          label: 'Only Active',
          onClick: vi.fn(),
          hidden: (row) => row.status === 'disabled',
        },
      ]

      render(<DataTableRowActions row={disabledRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /always visible/i })).toBeInTheDocument()
      })

      expect(screen.queryByRole('menuitem', { name: /only active/i })).not.toBeInTheDocument()
    })

    it('should show action when hidden function returns false', async () => {
      const user = userEvent.setup()
      const activeRow: TestRow = { ...mockRow, status: 'active' }
      const actions: RowAction<TestRow>[] = [
        {
          label: 'Only Active',
          onClick: vi.fn(),
          hidden: (row) => row.status === 'disabled',
        },
      ]

      render(<DataTableRowActions row={activeRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /only active/i })).toBeInTheDocument()
      })
    })
  })

  describe('Disabled Actions', () => {
    it('should disable actions with disabled=true', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      const actions: RowAction<TestRow>[] = [
        { label: 'Disabled Action', onClick: handleClick, disabled: true },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        const menuItem = screen.getByRole('menuitem', { name: /disabled action/i })
        expect(menuItem).toBeInTheDocument()
        expect(menuItem).toHaveAttribute('data-disabled')
      })
    })

    it('should evaluate disabled function with row data', async () => {
      const user = userEvent.setup()
      const disabledRow: TestRow = { ...mockRow, status: 'disabled' }
      const actions: RowAction<TestRow>[] = [
        {
          label: 'Conditional',
          onClick: vi.fn(),
          disabled: (row) => row.status === 'disabled',
        },
      ]

      render(<DataTableRowActions row={disabledRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        const menuItem = screen.getByRole('menuitem', { name: /conditional/i })
        expect(menuItem).toHaveAttribute('data-disabled')
      })
    })
  })

  describe('Action Icons', () => {
    it('should render action with icon', async () => {
      const user = userEvent.setup()
      const actions: RowAction<TestRow>[] = [
        {
          label: 'View',
          icon: <Eye data-testid="view-icon" className="h-4 w-4" />,
          onClick: vi.fn(),
        },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByTestId('view-icon')).toBeInTheDocument()
      })
    })

    it('should render multiple actions with different icons', async () => {
      const user = userEvent.setup()
      const actions: RowAction<TestRow>[] = [
        {
          label: 'View',
          icon: <Eye data-testid="view-icon" className="h-4 w-4" />,
          onClick: vi.fn(),
        },
        {
          label: 'Edit',
          icon: <Edit data-testid="edit-icon" className="h-4 w-4" />,
          onClick: vi.fn(),
        },
        {
          label: 'Delete',
          icon: <Trash2 data-testid="delete-icon" className="h-4 w-4" />,
          onClick: vi.fn(),
        },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByTestId('view-icon')).toBeInTheDocument()
        expect(screen.getByTestId('edit-icon')).toBeInTheDocument()
        expect(screen.getByTestId('delete-icon')).toBeInTheDocument()
      })
    })
  })

  describe('Destructive Variant', () => {
    it('should apply destructive styling to action', async () => {
      const user = userEvent.setup()
      const actions: RowAction<TestRow>[] = [
        {
          label: 'Delete',
          onClick: vi.fn(),
          variant: 'destructive',
        },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        const menuItem = screen.getByRole('menuitem', { name: /delete/i })
        expect(menuItem).toHaveClass('text-destructive')
      })
    })
  })

  describe('Action Groups', () => {
    it('should render action groups with separators', async () => {
      const user = userEvent.setup()
      const actions: (RowAction<TestRow> | RowActionGroup<TestRow>)[] = [
        { label: 'View', onClick: vi.fn() },
        {
          label: 'Management',
          actions: [
            { label: 'Edit', onClick: vi.fn() },
            { label: 'Delete', onClick: vi.fn() },
          ],
        },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
      })

      // Check for separator (rendered as div with role=separator)
      const separators = document.querySelectorAll('[role="separator"]')
      expect(separators.length).toBeGreaterThan(0)
    })

    it('should not render empty action groups', async () => {
      const user = userEvent.setup()
      const actions: (RowAction<TestRow> | RowActionGroup<TestRow>)[] = [
        { label: 'View', onClick: vi.fn() },
        {
          label: 'Empty Group',
          actions: [
            { label: 'Hidden', onClick: vi.fn(), hidden: true },
          ],
        },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      await user.click(screen.getByRole('button', { name: /действия/i }))

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument()
      })

      // Empty group label should not be rendered
      expect(screen.queryByText('Empty Group')).not.toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should open menu with Enter key', async () => {
      const user = userEvent.setup()
      const actions: RowAction<TestRow>[] = [
        { label: 'View', onClick: vi.fn() },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      const trigger = screen.getByRole('button', { name: /действия/i })
      trigger.focus()

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument()
      })
    })

    it('should be focusable', () => {
      const actions: RowAction<TestRow>[] = [
        { label: 'View', onClick: vi.fn() },
      ]

      render(<DataTableRowActions row={mockRow} actions={actions} />)

      const trigger = screen.getByRole('button', { name: /действия/i })
      trigger.focus()

      expect(trigger).toHaveFocus()
    })
  })
})
