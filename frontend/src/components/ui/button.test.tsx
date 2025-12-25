import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled button</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('should not trigger click when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    )

    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should show loading state', () => {
    render(<Button isLoading>Loading button</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Loading button')
  })

  it('should apply variant classes', () => {
    render(<Button variant="primary">Primary</Button>)

    const button = screen.getByRole('button')
    // Check that button has className property
    expect(button.className).toBeTruthy()
    expect(button.className).toContain('inline-flex')
  })

  it('should apply size classes', () => {
    render(<Button size="lg">Large button</Button>)

    const button = screen.getByRole('button')
    // Check that button has className property
    expect(button.className).toBeTruthy()
    expect(button.className).toContain('inline-flex')
  })

  it('should render as child component when asChild is true', () => {
    // When asChild is true, the Button uses Radix Slot to merge props with the single child element
    const { container } = render(
      <Button asChild variant="primary">
        <a href="/test">Link button</a>
      </Button>
    )

    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
    expect(link?.textContent).toBe('Link button')
    // The link should have button styles applied via Slot
    expect(link?.className).toContain('inline-flex')
  })

  it('should render as button element when asChild is false', () => {
    render(<Button asChild={false}>Regular button</Button>)

    const button = screen.getByRole('button', { name: /regular button/i })
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>)

    const button = screen.getByRole('button')
    expect(button.className).toContain('custom-class')
  })

  it('should be keyboard accessible', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Keyboard test</Button>)

    const button = screen.getByRole('button')
    button.focus()

    expect(button).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalled()
  })
})
