import apiClient from './axios'

export enum DomainType {
  SALES = 'sales',
  INVENTORY = 'inventory',
  MACHINES = 'machines',
  EQUIPMENT = 'equipment',
  HR = 'hr',
  BILLING = 'billing',
  LOCATIONS = 'locations',
  NOMENCLATURE = 'nomenclature',
  TASKS = 'tasks',
  TRANSACTIONS = 'transactions',
  COUNTERPARTIES = 'counterparties',
  RECIPES = 'recipes',
  OPENING_BALANCES = 'opening_balances',
  PURCHASE_HISTORY = 'purchase_history',
  UNKNOWN = 'unknown',
}

export enum ImportSessionStatus {
  PENDING = 'pending',
  PARSING = 'parsing',
  PARSED = 'parsed',
  CLASSIFYING = 'classifying',
  CLASSIFIED = 'classified',
  VALIDATING = 'validating',
  VALIDATED = 'validated',
  SUGGESTING = 'suggesting',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTING = 'executing',
  RECONCILING = 'reconciling',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AUTO_APPROVED = 'auto_approved',
}

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface ColumnMapping {
  [fileColumn: string]: {
    field: string | null
    confidence: number
    transform?: string | null
  }
}

export interface ClassificationResult {
  domain: DomainType
  confidence: number
  columnMapping: ColumnMapping
  dataTypes: Record<string, string>
  suggestedTemplate?: string | null
}

export interface ValidationError {
  rowIndex: number
  field: string
  value: unknown
  code: string
  message: string
  severity: ValidationSeverity
}

export interface ValidationReport {
  totalRows: number
  errorCount: number
  warningCount: number
  infoCount: number
  errors: ValidationError[]
  warnings: ValidationError[]
  info: ValidationError[]
  isValid: boolean
  canProceed: boolean
}

export interface ActionPlanSummary {
  insertCount: number
  updateCount: number
  mergeCount: number
  skipCount: number
  deleteCount: number
}

export interface ActionPlan {
  actions: any[]
  summary: ActionPlanSummary
  estimatedDuration: number
  risks: string[]
}

export interface ExecutionResult {
  successCount: number
  failureCount: number
  duration: number
}

export interface ImportSession {
  id: string
  domain: DomainType
  status: ImportSessionStatus
  template_id: string | null
  file_metadata: {
    filename: string
    size: number
    mimetype: string
    rowCount: number
    columnCount: number
  } | null
  classification_result: ClassificationResult | null
  validation_report: ValidationReport | null
  action_plan: ActionPlan | null
  approval_status: ApprovalStatus
  approved_by_user_id: string | null
  approved_at: string | null
  execution_result: ExecutionResult | null
  uploaded_by_user_id: string
  uploaded_by?: {
    id: string
    first_name: string
    last_name: string
  }
  started_at: string | null
  completed_at: string | null
  message: string | null
  created_at: string
  updated_at: string
}

export interface ImportTemplate {
  id: string
  name: string
  domain: DomainType
  description: string | null
  column_mappings: ColumnMapping
  use_count: number
  active: boolean
  created_at: string
}

export interface UploadResponse {
  sessionId: string
  status: ImportSessionStatus
  message: string
}

export const intelligentImportApi = {
  /**
   * Upload file and start intelligent import
   */
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<UploadResponse>(
      '/intelligent-import/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  /**
   * Get all import sessions with optional filters
   */
  getSessions: async (params?: {
    status?: ImportSessionStatus
    domain?: DomainType
    userId?: string
  }): Promise<ImportSession[]> => {
    const response = await apiClient.get<ImportSession[]>(
      '/intelligent-import/sessions',
      { params }
    )
    return response.data
  },

  /**
   * Get import session by ID
   */
  getSession: async (id: string): Promise<ImportSession> => {
    const response = await apiClient.get<ImportSession>(
      `/intelligent-import/sessions/${id}`
    )
    return response.data
  },

  /**
   * Approve import session
   */
  approve: async (id: string): Promise<ImportSession> => {
    const response = await apiClient.post<ImportSession>(
      `/intelligent-import/sessions/${id}/approval`,
      { action: 'approve' }
    )
    return response.data
  },

  /**
   * Reject import session
   */
  reject: async (id: string, reason: string): Promise<ImportSession> => {
    const response = await apiClient.post<ImportSession>(
      `/intelligent-import/sessions/${id}/approval`,
      { action: 'reject', reason }
    )
    return response.data
  },

  /**
   * Delete import session
   */
  deleteSession: async (id: string): Promise<void> => {
    await apiClient.delete(`/intelligent-import/sessions/${id}`)
  },

  /**
   * Get all templates
   */
  getTemplates: async (domain?: DomainType): Promise<ImportTemplate[]> => {
    const response = await apiClient.get<ImportTemplate[]>(
      '/intelligent-import/templates',
      { params: { domain } }
    )
    return response.data
  },
}

// Status helpers
export const statusLabels: Record<ImportSessionStatus, string> = {
  [ImportSessionStatus.PENDING]: 'Ожидание',
  [ImportSessionStatus.PARSING]: 'Парсинг файла',
  [ImportSessionStatus.PARSED]: 'Файл распознан',
  [ImportSessionStatus.CLASSIFYING]: 'Классификация',
  [ImportSessionStatus.CLASSIFIED]: 'Классифицировано',
  [ImportSessionStatus.VALIDATING]: 'Валидация',
  [ImportSessionStatus.VALIDATED]: 'Проверено',
  [ImportSessionStatus.SUGGESTING]: 'Подготовка плана',
  [ImportSessionStatus.AWAITING_APPROVAL]: 'Ожидает подтверждения',
  [ImportSessionStatus.APPROVED]: 'Подтверждено',
  [ImportSessionStatus.REJECTED]: 'Отклонено',
  [ImportSessionStatus.EXECUTING]: 'Выполнение',
  [ImportSessionStatus.RECONCILING]: 'Сверка',
  [ImportSessionStatus.COMPLETED]: 'Завершено',
  [ImportSessionStatus.FAILED]: 'Ошибка',
  [ImportSessionStatus.CANCELLED]: 'Отменено',
}

export const domainLabels: Record<DomainType, string> = {
  [DomainType.SALES]: 'Продажи',
  [DomainType.INVENTORY]: 'Инвентарь',
  [DomainType.MACHINES]: 'Аппараты',
  [DomainType.EQUIPMENT]: 'Оборудование',
  [DomainType.HR]: 'Кадры',
  [DomainType.BILLING]: 'Биллинг',
  [DomainType.LOCATIONS]: 'Локации',
  [DomainType.NOMENCLATURE]: 'Номенклатура',
  [DomainType.TASKS]: 'Задачи',
  [DomainType.TRANSACTIONS]: 'Транзакции',
  [DomainType.COUNTERPARTIES]: 'Контрагенты',
  [DomainType.RECIPES]: 'Рецепты',
  [DomainType.OPENING_BALANCES]: 'Начальные остатки',
  [DomainType.PURCHASE_HISTORY]: 'История закупок',
  [DomainType.UNKNOWN]: 'Неизвестно',
}

export function getStatusColor(status: ImportSessionStatus): string {
  switch (status) {
    case ImportSessionStatus.COMPLETED:
      return 'bg-green-100 text-green-700'
    case ImportSessionStatus.FAILED:
    case ImportSessionStatus.REJECTED:
      return 'bg-red-100 text-red-700'
    case ImportSessionStatus.CANCELLED:
      return 'bg-gray-100 text-gray-700'
    case ImportSessionStatus.AWAITING_APPROVAL:
      return 'bg-yellow-100 text-yellow-700'
    case ImportSessionStatus.EXECUTING:
    case ImportSessionStatus.RECONCILING:
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-indigo-100 text-indigo-700'
  }
}

export function getStatusProgress(status: ImportSessionStatus): number {
  const progressMap: Record<ImportSessionStatus, number> = {
    [ImportSessionStatus.PENDING]: 0,
    [ImportSessionStatus.PARSING]: 10,
    [ImportSessionStatus.PARSED]: 20,
    [ImportSessionStatus.CLASSIFYING]: 30,
    [ImportSessionStatus.CLASSIFIED]: 40,
    [ImportSessionStatus.VALIDATING]: 50,
    [ImportSessionStatus.VALIDATED]: 60,
    [ImportSessionStatus.SUGGESTING]: 70,
    [ImportSessionStatus.AWAITING_APPROVAL]: 80,
    [ImportSessionStatus.APPROVED]: 85,
    [ImportSessionStatus.EXECUTING]: 90,
    [ImportSessionStatus.RECONCILING]: 95,
    [ImportSessionStatus.COMPLETED]: 100,
    [ImportSessionStatus.REJECTED]: 100,
    [ImportSessionStatus.FAILED]: 100,
    [ImportSessionStatus.CANCELLED]: 100,
  }
  return progressMap[status] || 0
}
