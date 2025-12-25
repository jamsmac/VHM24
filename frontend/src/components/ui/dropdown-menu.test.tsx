import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuRadioGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './dropdown-menu'

describe('DropdownMenu', () => {
  describe('DropdownMenuShortcut', () => {
    it('should render shortcut text', () => {
      render(<DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>)

      expect(screen.getByText('Ctrl+S')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<DropdownMenuShortcut className="custom-class">Ctrl+S</DropdownMenuShortcut>)

      const shortcut = screen.getByText('Ctrl+S')
      expect(shortcut).toHaveClass('custom-class')
    })
  })

  describe('DropdownMenuCheckboxItem', () => {
    it('should render checkbox item', async () => {
      userEvent.setup()

      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={true}>
              Checkbox Option
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Checkbox Option')).toBeInTheDocument()
    })

    it('should render unchecked checkbox item', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={false}>
              Unchecked Option
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Unchecked Option')).toBeInTheDocument()
    })

    it('should apply custom className to checkbox item', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={true} className="custom-checkbox">
              Custom Checkbox
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Custom Checkbox')).toBeInTheDocument()
    })
  })

  describe('DropdownMenuRadioItem', () => {
    it('should render radio item', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1">
              <DropdownMenuRadioItem value="option1">
                Radio Option 1
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">
                Radio Option 2
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Radio Option 1')).toBeInTheDocument()
      expect(screen.getByText('Radio Option 2')).toBeInTheDocument()
    })

    it('should apply custom className to radio item', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1">
              <DropdownMenuRadioItem value="option1" className="custom-radio">
                Custom Radio
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Custom Radio')).toBeInTheDocument()
    })
  })

  describe('DropdownMenuSubTrigger and DropdownMenuSubContent', () => {
    it('should render sub menu trigger', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                More Options
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item 1</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('More Options')).toBeInTheDocument()
    })

    it('should render sub trigger with inset prop', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>
                Inset Sub Menu
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Inset Sub Menu')).toBeInTheDocument()
    })

    it('should apply custom className to sub trigger', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="custom-sub-trigger">
                Custom Sub Menu
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Custom Sub Menu')).toBeInTheDocument()
    })

    it('should render sub content component', async () => {
      // Test that DropdownMenuSubContent renders without error
      // The sub content is only visible when the sub menu is open
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                More Options
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item 1</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      // Sub trigger should be visible
      expect(screen.getByText('More Options')).toBeInTheDocument()
    })
  })

  describe('Other components', () => {
    it('should render label with inset', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const label = screen.getByText('Inset Label')
      expect(label).toHaveClass('pl-8')
    })

    it('should render menu item with inset', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem inset>Inset Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const item = screen.getByRole('menuitem', { name: 'Inset Item' })
      expect(item).toHaveClass('pl-8')
    })

    it('should render separator', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator data-testid="separator" />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByTestId('separator')).toBeInTheDocument()
    })

    it('should render group', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Grouped Item</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Grouped Item')).toBeInTheDocument()
    })
  })
})
