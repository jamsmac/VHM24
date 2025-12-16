import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'

interface FormFieldProps {
  label: string
  id: string
  required?: boolean
  error?: string
  helpText?: string
  children?: React.ReactNode
  className?: string
}

/**
 * Accessible form field component with proper label association
 *
 * Ensures WCAG 2.1 compliance by:
 * - Associating labels with inputs via htmlFor/id
 * - Marking required fields visually and semantically
 * - Linking error messages with aria-describedby
 * - Providing help text with proper ARIA attributes
 */
export function FormField({
  label,
  id,
  required = false,
  error,
  helpText,
  children,
  className,
}: FormFieldProps) {
  const helpTextId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = [
    helpText ? helpTextId : null,
    error ? errorId : null,
  ].filter(Boolean).join(' ')

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childProps = child.props as Record<string, unknown>
          return React.cloneElement(child, {
            id,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': describedBy || undefined,
            'aria-required': required ? true : undefined,
            ...childProps,
          } as any)
        }
        return child
      })}

      {helpText && (
        <p id={helpTextId} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helpText?: string
}

/**
 * Convenience component combining FormField with Input
 */
export function FormInput({
  label,
  id,
  required,
  error,
  helpText,
  ...inputProps
}: FormInputProps) {
  const generatedId = id || `input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <FormField
      label={label}
      id={generatedId}
      required={required}
      error={error}
      helpText={helpText}
    >
      <Input {...inputProps} />
    </FormField>
  )
}

interface FormSelectOption {
  value: string
  label: string
  group?: string
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  helpText?: string
  options: Array<FormSelectOption>
}

/**
 * Convenience component combining FormField with select element
 *
 * Supports both flat options and grouped options via the `group` property:
 *
 * @example
 * // Flat options
 * <FormSelect
 *   options={[
 *     { value: 'a', label: 'Option A' },
 *     { value: 'b', label: 'Option B' },
 *   ]}
 * />
 *
 * @example
 * // Grouped options
 * <FormSelect
 *   options={[
 *     { value: 'refill', label: 'Пополнение', group: 'Основные операции' },
 *     { value: 'collection', label: 'Инкассация', group: 'Основные операции' },
 *     { value: 'replace_hopper', label: 'Замена бункера', group: 'Замена компонентов' },
 *   ]}
 * />
 */
export function FormSelect({
  label,
  id,
  required,
  error,
  helpText,
  options,
  ...selectProps
}: FormSelectProps) {
  const generatedId = id || `select-${Math.random().toString(36).substr(2, 9)}`

  // Group options by their group property
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, FormSelectOption[]> = {}
    const ungrouped: FormSelectOption[] = []

    options.forEach((option) => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = []
        }
        groups[option.group].push(option)
      } else {
        ungrouped.push(option)
      }
    })

    return { groups, ungrouped }
  }, [options])

  return (
    <FormField
      label={label}
      id={generatedId}
      required={required}
      error={error}
      helpText={helpText}
    >
      <select
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        {...selectProps}
      >
        {/* Render ungrouped options first */}
        {groupedOptions.ungrouped.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}

        {/* Render grouped options */}
        {Object.entries(groupedOptions.groups).map(([groupName, groupOptions]) => (
          <optgroup key={groupName} label={groupName}>
            {groupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </FormField>
  )
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  helpText?: string
}

/**
 * Convenience component combining FormField with textarea element
 */
export function FormTextarea({
  label,
  id,
  required,
  error,
  helpText,
  ...textareaProps
}: FormTextareaProps) {
  const generatedId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`

  return (
    <FormField
      label={label}
      id={generatedId}
      required={required}
      error={error}
      helpText={helpText}
    >
      <textarea
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y min-h-[100px]"
        {...textareaProps}
      />
    </FormField>
  )
}
