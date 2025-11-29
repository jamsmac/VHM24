// Equipment Module Types

export enum ComponentType {
  HOPPER = 'hopper',
  GRINDER = 'grinder',
  BREWER = 'brewer',
  MIXER = 'mixer',
  COOLING_UNIT = 'cooling_unit',
  PAYMENT_TERMINAL = 'payment_terminal',
  DISPENSER = 'dispenser',
  PUMP = 'pump',
  WATER_FILTER = 'water_filter',
  COIN_ACCEPTOR = 'coin_acceptor',
  BILL_ACCEPTOR = 'bill_acceptor',
  DISPLAY = 'display',
  OTHER = 'other',
}

export enum ComponentStatus {
  ACTIVE = 'active',
  NEEDS_MAINTENANCE = 'needs_maintenance',
  NEEDS_REPLACEMENT = 'needs_replacement',
  REPLACED = 'replaced',
  BROKEN = 'broken',
}

export enum ComponentLocationType {
  MACHINE = 'machine',
  WAREHOUSE = 'warehouse',
  WASHING = 'washing',
  DRYING = 'drying',
  REPAIR = 'repair',
}

export enum MovementType {
  INSTALL = 'install',
  REMOVE = 'remove',
  SEND_TO_WASH = 'send_to_wash',
  RETURN_FROM_WASH = 'return_from_wash',
  SEND_TO_DRYING = 'send_to_drying',
  RETURN_FROM_DRYING = 'return_from_drying',
  MOVE_TO_WAREHOUSE = 'move_to_warehouse',
  MOVE_TO_MACHINE = 'move_to_machine',
  SEND_TO_REPAIR = 'send_to_repair',
  RETURN_FROM_REPAIR = 'return_from_repair',
}

export enum MaintenanceType {
  CLEANING = 'cleaning',
  INSPECTION = 'inspection',
  REPAIR = 'repair',
  REPLACEMENT = 'replacement',
  CALIBRATION = 'calibration',
  SOFTWARE_UPDATE = 'software_update',
  PREVENTIVE = 'preventive',
  OTHER = 'other',
}

export enum WashingFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export interface EquipmentComponent {
  id: string
  machine_id: string | null
  component_type: ComponentType
  name: string
  model?: string | null
  serial_number?: string | null
  manufacturer?: string | null
  status: ComponentStatus
  current_location_type: ComponentLocationType
  current_location_ref?: string | null
  installation_date?: Date | null
  last_maintenance_date?: Date | null
  next_maintenance_date?: Date | null
  maintenance_interval_days?: number | null
  working_hours: number
  expected_lifetime_hours?: number | null
  replacement_date?: Date | null
  replaced_by_component_id?: string | null
  replaces_component_id?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  warranty_expiration_date?: Date | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
  machine?: { id: string; machine_number: string; name?: string } | null // Optional relation
}

export interface ComponentMovement {
  id: string
  component_id: string
  from_location_type: ComponentLocationType
  from_location_ref?: string | null
  to_location_type: ComponentLocationType
  to_location_ref?: string | null
  movement_type: MovementType
  related_machine_id?: string | null
  task_id?: string | null
  performed_by_user_id?: string | null
  moved_at: Date
  comment?: string | null
  metadata?: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
  component?: EquipmentComponent
  related_machine?: { id: string; machine_number: string } | null
  task?: { id: string; type_code: string } | null
  performed_by?: { id: string; full_name: string; username?: string } | null
}

export interface SparePart {
  id: string
  part_number: string
  name: string
  description?: string | null
  component_type: ComponentType
  manufacturer?: string | null
  model_compatibility?: string | null
  quantity_in_stock: number
  min_stock_level: number
  max_stock_level: number
  unit: string
  unit_price: number
  currency: string
  supplier_name?: string | null
  supplier_part_number?: string | null
  supplier_contact?: string | null
  lead_time_days?: number | null
  storage_location?: string | null
  shelf_number?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  image_urls?: string[] | null
  is_active: boolean
  discontinued_date?: Date | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export interface WashingSchedule {
  id: string
  machine_id: string
  name: string
  frequency: WashingFrequency
  interval_days?: number | null
  component_types: ComponentType[]
  instructions?: string | null
  last_wash_date?: Date | null
  next_wash_date: Date
  last_washed_by_user_id?: string | null
  last_wash_task_id?: string | null
  is_active: boolean
  auto_create_tasks: boolean
  notification_days_before: number
  required_materials?: string[] | null
  estimated_duration_minutes?: number | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export interface ComponentMaintenance {
  id: string
  component_id: string
  maintenance_type: MaintenanceType
  performed_by_user_id: string
  performed_at: Date
  description: string
  spare_parts_used?: Array<{
    spare_part_id: string
    quantity: number
    part_number: string
    name: string
  }> | null
  labor_cost: number
  parts_cost: number
  total_cost: number
  duration_minutes?: number | null
  result?: string | null
  is_successful: boolean
  next_maintenance_date?: Date | null
  photo_urls?: string[] | null
  document_urls?: string[] | null
  task_id?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

// DTOs for API requests
export interface CreateComponentDto {
  machine_id: string
  component_type: ComponentType
  name: string
  model?: string
  serial_number?: string
  manufacturer?: string
  status?: ComponentStatus
  installation_date?: Date
  maintenance_interval_days?: number
  expected_lifetime_hours?: number
  warranty_expiration_date?: Date
  notes?: string
}

export interface UpdateComponentDto extends Partial<CreateComponentDto> {
  working_hours?: number
  last_maintenance_date?: Date
  next_maintenance_date?: Date
}

export interface CreateSparePartDto {
  part_number: string
  name: string
  description?: string
  component_type: ComponentType
  manufacturer?: string
  quantity_in_stock: number
  min_stock_level: number
  max_stock_level?: number
  unit?: string
  unit_price: number
  currency?: string
  supplier_name?: string
  supplier_part_number?: string
  storage_location?: string
  notes?: string
}

export interface AdjustStockDto {
  quantity: number
  reason: string
}

export interface CreateWashingScheduleDto {
  machine_id: string
  name: string
  frequency: WashingFrequency
  interval_days?: number
  component_types: ComponentType[]
  instructions?: string
  next_wash_date: Date
  auto_create_tasks?: boolean
  notification_days_before?: number
  required_materials?: string[]
  estimated_duration_minutes?: number
  notes?: string
}

export interface CompleteWashingDto {
  washed_by_user_id: string
  notes?: string
}

export interface CreateMaintenanceDto {
  component_id: string
  maintenance_type: MaintenanceType
  performed_by_user_id: string
  performed_at: Date
  description: string
  spare_parts_used?: Array<{
    spare_part_id: string
    quantity: number
  }>
  labor_cost?: number
  parts_cost?: number
  duration_minutes?: number
  result?: string
  is_successful?: boolean
  next_maintenance_date?: Date
  notes?: string
}

// Statistics interfaces
export interface ComponentStats {
  total: number
  by_type: Array<{ component_type: ComponentType; count: number }>
  by_status: Array<{ status: ComponentStatus; count: number }>
  needing_maintenance: number
  nearing_lifetime: number
}

export interface SparePartStats {
  total: number
  by_type: Array<{ component_type: ComponentType; count: number }>
  low_stock_count: number
  total_inventory_value: number
}

export interface WashingStats {
  total: number
  active: number
  overdue: number
  upcoming_7_days: number
}

export interface MaintenanceStats {
  total: number
  by_type: Array<{ maintenance_type: MaintenanceType; count: number }>
  total_cost: number
  avg_duration_minutes: number
  success_rate: number
}

// Component type labels for UI
export const ComponentTypeLabels: Record<ComponentType, string> = {
  [ComponentType.HOPPER]: 'Бункер',
  [ComponentType.GRINDER]: 'Гриндер',
  [ComponentType.BREWER]: 'Варочная группа',
  [ComponentType.MIXER]: 'Миксер',
  [ComponentType.COOLING_UNIT]: 'Холодильник',
  [ComponentType.PAYMENT_TERMINAL]: 'Платежный терминал',
  [ComponentType.DISPENSER]: 'Дозатор',
  [ComponentType.PUMP]: 'Помпа',
  [ComponentType.WATER_FILTER]: 'Фильтр воды',
  [ComponentType.COIN_ACCEPTOR]: 'Монетоприемник',
  [ComponentType.BILL_ACCEPTOR]: 'Купюроприемник',
  [ComponentType.DISPLAY]: 'Дисплей',
  [ComponentType.OTHER]: 'Другое',
}

export const ComponentStatusLabels: Record<ComponentStatus, string> = {
  [ComponentStatus.ACTIVE]: 'Активен',
  [ComponentStatus.NEEDS_MAINTENANCE]: 'Требует обслуживания',
  [ComponentStatus.NEEDS_REPLACEMENT]: 'Требует замены',
  [ComponentStatus.REPLACED]: 'Заменен',
  [ComponentStatus.BROKEN]: 'Сломан',
}

export const MaintenanceTypeLabels: Record<MaintenanceType, string> = {
  [MaintenanceType.CLEANING]: 'Мойка/чистка',
  [MaintenanceType.INSPECTION]: 'Осмотр',
  [MaintenanceType.REPAIR]: 'Ремонт',
  [MaintenanceType.REPLACEMENT]: 'Замена',
  [MaintenanceType.CALIBRATION]: 'Калибровка',
  [MaintenanceType.SOFTWARE_UPDATE]: 'Обновление ПО',
  [MaintenanceType.PREVENTIVE]: 'Профилактика',
  [MaintenanceType.OTHER]: 'Другое',
}

export const WashingFrequencyLabels: Record<WashingFrequency, string> = {
  [WashingFrequency.DAILY]: 'Ежедневно',
  [WashingFrequency.WEEKLY]: 'Еженедельно',
  [WashingFrequency.BIWEEKLY]: 'Раз в 2 недели',
  [WashingFrequency.MONTHLY]: 'Ежемесячно',
  [WashingFrequency.CUSTOM]: 'Настраиваемый',
}

export const ComponentLocationTypeLabels: Record<ComponentLocationType, string> = {
  [ComponentLocationType.MACHINE]: 'В машине',
  [ComponentLocationType.WAREHOUSE]: 'На складе',
  [ComponentLocationType.WASHING]: 'На мойке',
  [ComponentLocationType.DRYING]: 'На сушке',
  [ComponentLocationType.REPAIR]: 'В ремонте',
}

export const MovementTypeLabels: Record<MovementType, string> = {
  [MovementType.INSTALL]: 'Установка',
  [MovementType.REMOVE]: 'Снятие',
  [MovementType.SEND_TO_WASH]: 'Отправка на мойку',
  [MovementType.RETURN_FROM_WASH]: 'Возврат с мойки',
  [MovementType.SEND_TO_DRYING]: 'Отправка на сушку',
  [MovementType.RETURN_FROM_DRYING]: 'Возврат с сушки',
  [MovementType.MOVE_TO_WAREHOUSE]: 'Перемещение на склад',
  [MovementType.MOVE_TO_MACHINE]: 'Перемещение к машине',
  [MovementType.SEND_TO_REPAIR]: 'Отправка в ремонт',
  [MovementType.RETURN_FROM_REPAIR]: 'Возврат из ремонта',
}

// Hopper Types (бункеры по типам ингредиентов)
export interface HopperType {
  id: string
  code: string
  name: string
  category: string // coffee, milk, sugar, cocoa, water, syrup, powder, other
  description?: string | null
  color_code?: string | null
  typical_capacity_kg?: number | null
  cleaning_interval_days?: number | null
  notes?: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
}

export interface CreateHopperTypeDto {
  code: string
  name: string
  category: string
  description?: string
  color_code?: string
  typical_capacity_kg?: number
  cleaning_interval_days?: number
  notes?: string
}

export interface UpdateHopperTypeDto extends Partial<CreateHopperTypeDto> {
  is_active?: boolean
}

export const HopperCategoryLabels: Record<string, string> = {
  coffee: 'Кофе',
  milk: 'Молоко',
  sugar: 'Сахар',
  cocoa: 'Какао',
  water: 'Вода',
  syrup: 'Сироп',
  powder: 'Порошок',
  other: 'Другое',
}
