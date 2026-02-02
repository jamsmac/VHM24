/**
 * UI Components Index
 *
 * Central export file for all UI components.
 * Import components from '@/components/ui' instead of individual files.
 *
 * @example
 * import { Button, Card, Badge, Tooltip } from '@/components/ui'
 */

// ============================================================================
// Core UI Primitives
// ============================================================================

export { Button, buttonVariants } from './button'
export type { ButtonProps } from './button'

export { Input } from './input'

export { Label } from './label'

export { Textarea } from './textarea'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent
} from './card'

export { Badge, badgeVariants } from './badge'

export { Alert, AlertDescription, AlertTitle } from './alert'

export { Progress } from './progress'

export { Separator } from './separator'

export { Checkbox } from './checkbox'
export type { CheckboxProps } from './checkbox'

export { LevelBar } from './level-bar'
export type { LevelBarProps } from './level-bar'

export { TrendBadge } from './trend-badge'
export type { TrendBadgeProps } from './trend-badge'

export { WarmCard } from './warm-card'
export type { WarmCardProps } from './warm-card'

// ============================================================================
// Tables
// ============================================================================

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table'

export { DataTable } from './data-table'
export { DataTableRowActions } from './data-table-row-actions'

// ============================================================================
// Select & Dropdowns
// ============================================================================

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu'

// ============================================================================
// Tabs
// ============================================================================

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './tabs'

// ============================================================================
// Dialogs & Modals
// ============================================================================

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'

export { Modal } from './Modal'

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from './sheet'
export type { SheetProps, SheetContentProps, SheetTriggerProps } from './sheet'

export {
  ConfirmDialog,
  DeleteConfirmDialog,
  LogoutConfirmDialog,
  CancelConfirmDialog,
  DiscardChangesDialog,
  BulkDeleteConfirmDialog,
  DangerousActionDialog
} from './ConfirmDialog'

// ============================================================================
// Tooltips & Popovers
// ============================================================================

export {
  Tooltip,
  TooltipText,
  InfoTooltip,
  TruncatedText,
  CopyTooltip
} from './Tooltip'

export {
  Popover,
  PopoverHeader,
  PopoverContent,
  PopoverFooter,
  UserPopover,
  ConfirmPopover
} from './Popover'

// ============================================================================
// Status & Badges
// ============================================================================

export {
  MachineStatusBadge,
  TaskStatusBadge,
  TaskTypeBadge,
  PriorityBadge,
  IncidentStatusBadge,
  RoleBadge,
  UserStatusBadge,
  PaymentStatusBadge,
  ConnectionBadge,
  DeliveryStatusBadge,
  CountBadge,
  StatusDot
} from './StatusBadge'

export {
  Tag,
  TagGroup,
  TagInput,
  SelectableTagGroup
} from './Tag'

// ============================================================================
// User Components
// ============================================================================

export {
  Avatar,
  AvatarWithName,
  AvatarGroup,
  AvatarButton,
  AvatarUpload
} from './Avatar'

export {
  UserCompact,
  UserListItem,
  UserCard,
  UserSelectOption,
  Assignee
} from './UserCard'

// ============================================================================
// Progress & Stats
// ============================================================================

export {
  ProgressBar,
  CircularProgress,
  ProgressSteps,
  LoadingProgress,
  UploadProgress
} from './ProgressExtended'

export {
  StatsCard,
  CompactStat,
  StatsGrid,
  MetricComparison,
  SparklineStat,
  PercentageStat,
  GoalProgress
} from './StatsCard'

// ============================================================================
// Pagination
// ============================================================================

export {
  Pagination,
  SimplePagination,
  PaginationWithSize,
  LoadMore,
  InfiniteScrollTrigger,
  CursorPagination,
  PageJump
} from './Pagination'

// ============================================================================
// Form Components
// ============================================================================

export {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea
} from './form-field'

// ============================================================================
// Loading & Skeletons
// ============================================================================

export { LoadingSkeleton } from './LoadingSkeleton'
export { PageLoader } from './PageLoader'

export {
  Skeleton,
  TextSkeleton,
  AvatarSkeleton,
  ButtonSkeleton,
  InputSkeleton,
  BadgeSkeleton
} from './Skeleton'

export {
  StatsCardSkeleton,
  MachineCardSkeleton,
  TaskCardSkeleton,
  IncidentCardSkeleton,
  UserCardSkeleton,
  ActivityItemSkeleton,
  NotificationItemSkeleton,
  ListItemSkeleton
} from './CardSkeleton'

export {
  TableSkeleton,
  CompactTableSkeleton,
  DataGridSkeleton
} from './TableSkeleton'

export {
  DashboardSkeleton,
  MachinesPageSkeleton,
  TasksPageSkeleton,
  TablePageSkeleton,
  DetailPageSkeleton,
  SettingsPageSkeleton
} from './PageSkeleton'

// ============================================================================
// Empty States
// ============================================================================

export {
  EmptyState,
  EmptyMachines,
  EmptyTasks,
  EmptyIncidents,
  EmptyUsers,
  EmptyNotifications,
  EmptySearchResults,
  EmptyFilterResults,
  EmptyScheduledTasks,
  EmptyLocations,
  EmptyReports,
  EmptyComplaints,
  EmptyEquipment,
  EmptyActivity,
  EmptyComingSoon
} from './EmptyState'

// ============================================================================
// Error States
// ============================================================================

export {
  ErrorState,
  InlineError,
  CardError,
  PageError,
  NotFoundPage,
  ForbiddenPage,
  ServerErrorPage
} from './ErrorState'

// ============================================================================
// Toast Notifications
// ============================================================================

export { Toast, useToast } from './Toast'
export type { ToastType } from './Toast'

// ============================================================================
// Theme Components
// ============================================================================

export {
  ThemeToggle,
  ThemeSelector,
  ThemeSelectorCompact
} from '../ThemeToggle'
