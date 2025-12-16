'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type AvatarShape = 'circle' | 'square'

interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: AvatarSize
  shape?: AvatarShape
  status?: 'online' | 'offline' | 'busy' | 'away'
  showStatus?: boolean
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-20 w-20 text-xl',
}

const statusSizeClasses: Record<AvatarSize, string> = {
  xs: 'h-1.5 w-1.5 ring-1',
  sm: 'h-2 w-2 ring-1',
  md: 'h-2.5 w-2.5 ring-2',
  lg: 'h-3 w-3 ring-2',
  xl: 'h-3.5 w-3.5 ring-2',
  '2xl': 'h-4 w-4 ring-2',
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
}

// Generate consistent color from string
function stringToColor(str: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]

  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

// Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  shape = 'circle',
  status,
  showStatus = false,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)

  const showImage = src && !imageError
  const initials = name ? getInitials(name) : null
  const bgColor = name ? stringToColor(name) : 'bg-primary'

  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden',
          sizeClasses[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          !showImage && bgColor,
          !showImage && 'text-white font-medium'
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User className="h-1/2 w-1/2 text-white" />
        )}
      </div>

      {showStatus && status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-white dark:ring-gray-900',
            statusSizeClasses[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  )
}

// Avatar with name and optional subtitle
interface AvatarWithNameProps extends AvatarProps {
  subtitle?: string
  nameClassName?: string
  subtitleClassName?: string
}

export function AvatarWithName({
  subtitle,
  nameClassName,
  subtitleClassName,
  ...avatarProps
}: AvatarWithNameProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar {...avatarProps} />
      <div className="min-w-0">
        {avatarProps.name && (
          <p
            className={cn(
              'font-medium text-foreground truncate',
              nameClassName
            )}
          >
            {avatarProps.name}
          </p>
        )}
        {subtitle && (
          <p
            className={cn(
              'text-sm text-muted-foreground truncate',
              subtitleClassName
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

// Avatar Group (stacked avatars)
interface AvatarGroupProps {
  avatars: Array<{
    src?: string | null
    name?: string
    alt?: string
  }>
  max?: number
  size?: AvatarSize
  className?: string
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  className,
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max)
  const remainingCount = avatars.length - max

  const overlapClasses: Record<AvatarSize, string> = {
    xs: '-ml-1.5',
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
    xl: '-ml-4',
    '2xl': '-ml-5',
  }

  return (
    <div className={cn('flex items-center', className)}>
      {visibleAvatars.map((avatar, index) => (
        <div
          key={index}
          className={cn(
            'ring-2 ring-background rounded-full',
            index > 0 && overlapClasses[size]
          )}
        >
          <Avatar
            src={avatar.src}
            name={avatar.name}
            alt={avatar.alt}
            size={size}
          />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-background',
            sizeClasses[size],
            overlapClasses[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

// Clickable avatar with dropdown/menu trigger
interface AvatarButtonProps extends AvatarProps {
  onClick?: () => void
  'aria-label'?: string
}

export function AvatarButton({
  onClick,
  'aria-label': ariaLabel,
  ...avatarProps
}: AvatarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-transform hover:scale-105"
      aria-label={ariaLabel || `${avatarProps.name || 'User'} menu`}
    >
      <Avatar {...avatarProps} />
    </button>
  )
}

// Upload avatar placeholder
interface AvatarUploadProps {
  src?: string | null
  name?: string
  size?: AvatarSize
  onUpload?: (file: File) => void
  disabled?: boolean
  className?: string
}

export function AvatarUpload({
  src,
  name,
  size = 'xl',
  onUpload,
  disabled = false,
  className,
}: AvatarUploadProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onUpload) {
      onUpload(file)
    }
  }

  return (
    <label
      className={cn(
        'relative cursor-pointer group',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <Avatar src={src} name={name} size={size} />
      {!disabled && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-xs font-medium">Изменить</span>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  )
}
