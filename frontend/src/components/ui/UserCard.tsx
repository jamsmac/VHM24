'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarWithName } from './Avatar'
import { RoleBadge, UserStatusBadge } from './StatusBadge'
import { UserRole } from '@/types/users'
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  MoreVertical,
  MessageSquare,
  UserPlus,
  Ban,
  Edit,
} from 'lucide-react'

interface UserData {
  id: string
  name: string
  email?: string
  phone?: string
  role?: UserRole
  status?: 'active' | 'inactive' | 'pending' | 'blocked'
  avatar?: string | null
  location?: string
  joinedAt?: string | Date
}

// Compact user display (for lists, assignments)
interface UserCompactProps {
  user: UserData
  showRole?: boolean
  showStatus?: boolean
  className?: string
}

export function UserCompact({
  user,
  showRole = false,
  showStatus = false,
  className,
}: UserCompactProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Avatar
        src={user.avatar}
        name={user.name}
        size="sm"
        status={user.status === 'active' ? 'online' : 'offline'}
        showStatus={showStatus}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground text-sm truncate">
          {user.name}
        </p>
        {showRole && user.role && (
          <RoleBadge role={user.role} className="mt-0.5" />
        )}
      </div>
    </div>
  )
}

// User list item (for tables/lists with actions)
interface UserListItemProps {
  user: UserData
  onEdit?: () => void
  onMessage?: () => void
  onBlock?: () => void
  className?: string
}

export function UserListItem({
  user,
  onEdit,
  onMessage,
  onBlock,
  className,
}: UserListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors',
        className
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <Avatar
          src={user.avatar}
          name={user.name}
          size="md"
          status={user.status === 'active' ? 'online' : 'offline'}
          showStatus
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">{user.name}</p>
            {user.role && <RoleBadge role={user.role} />}
          </div>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user.status && <UserStatusBadge status={user.status} />}

        <div className="flex items-center gap-1 ml-4">
          {onMessage && (
            <button
              onClick={onMessage}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              title="Написать"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              title="Редактировать"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onBlock && (
            <button
              onClick={onBlock}
              className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
              title="Заблокировать"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Full user card (for profile views)
interface UserCardProps {
  user: UserData
  showActions?: boolean
  onEdit?: () => void
  onMessage?: () => void
  className?: string
}

export function UserCard({
  user,
  showActions = true,
  onEdit,
  onMessage,
  className,
}: UserCardProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border overflow-hidden',
        className
      )}
    >
      {/* Header with gradient */}
      <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5" />

      {/* Avatar and name */}
      <div className="px-6 pb-6">
        <div className="-mt-10 flex items-end justify-between">
          <Avatar
            src={user.avatar}
            name={user.name}
            size="xl"
            className="ring-4 ring-card"
          />
          {showActions && (
            <div className="flex items-center gap-2 mb-2">
              {onMessage && (
                <button
                  onClick={onMessage}
                  className="px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-accent transition-colors"
                >
                  <MessageSquare className="h-4 w-4 inline mr-1.5" />
                  Написать
                </button>
              )}
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Edit className="h-4 w-4 inline mr-1.5" />
                  Изменить
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
            {user.role && <RoleBadge role={user.role} />}
            {user.status && <UserStatusBadge status={user.status} />}
          </div>

          {/* Contact info */}
          <div className="mt-4 space-y-2">
            {user.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a
                  href={`mailto:${user.email}`}
                  className="hover:text-foreground transition-colors"
                >
                  {user.email}
                </a>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <a
                  href={`tel:${user.phone}`}
                  className="hover:text-foreground transition-colors"
                >
                  {user.phone}
                </a>
              </div>
            )}
            {user.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{user.location}</span>
              </div>
            )}
            {user.joinedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  С {new Date(user.joinedAt).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// User select option (for dropdowns)
interface UserSelectOptionProps {
  user: UserData
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function UserSelectOption({
  user,
  selected = false,
  onClick,
  className,
}: UserSelectOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors',
        selected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-accent text-foreground',
        className
      )}
    >
      <Avatar src={user.avatar} name={user.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{user.name}</p>
        {user.email && (
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        )}
      </div>
      {user.role && <RoleBadge role={user.role} />}
    </button>
  )
}

// Assignee display (for tasks)
interface AssigneeProps {
  user?: UserData | null
  placeholder?: string
  onAssign?: () => void
  onRemove?: () => void
  className?: string
}

export function Assignee({
  user,
  placeholder = 'Не назначен',
  onAssign,
  onRemove,
  className,
}: AssigneeProps) {
  if (!user) {
    return (
      <button
        onClick={onAssign}
        className={cn(
          'flex items-center gap-2 px-3 py-2 border border-dashed border-muted-foreground/30 rounded-md text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors',
          className
        )}
      >
        <UserPlus className="h-4 w-4" />
        {placeholder}
      </button>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Avatar src={user.avatar} name={user.name} size="sm" />
      <span className="text-sm font-medium text-foreground">{user.name}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-0.5 text-muted-foreground hover:text-red-600 transition-colors"
          title="Удалить исполнителя"
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
