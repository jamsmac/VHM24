import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { tasksApi } from './tasks-api'
import apiClient from './axios'
import { TaskStatus, TaskType, TaskPriority } from '@/types/tasks'
import type { Task, CreateTaskDto, CompleteTaskDto } from '@/types/tasks'

// Mock axios
vi.mock('./axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Tasks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Task CRUD Operations', () => {
    it('should get all tasks', async () => {
      const mockTasks: Task[] = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          machine_id: 'machine-1',
          created_by_user_id: 'user-1',
          scheduled_date: '2025-11-23',
          has_photo_before: false,
          has_photo_after: false,
          created_at: '2025-11-23T00:00:00Z',
          updated_at: '2025-11-23T00:00:00Z',
        },
      ]

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTasks })

      const result = await tasksApi.getAll()

      expect(apiClient.get).toHaveBeenCalledWith('/tasks', { params: undefined })
      expect(result).toEqual(mockTasks)
    })

    it('should get tasks with filters', async () => {
      const filters = {
        status: TaskStatus.IN_PROGRESS,
        type: TaskType.REFILL,
        machineId: 'machine-1',
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

      await tasksApi.getAll(filters)

      expect(apiClient.get).toHaveBeenCalledWith('/tasks', { params: filters })
    })

    it('should get task by ID', async () => {
      const mockTask: Task = {
        id: 'task-1',
        type_code: TaskType.COLLECTION,
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.HIGH,
        machine_id: 'machine-1',
        created_by_user_id: 'user-1',
        scheduled_date: '2025-11-23',
        has_photo_before: true,
        has_photo_after: true,
        actual_cash_amount: 5000,
        expected_cash_amount: 5000,
        created_at: '2025-11-23T00:00:00Z',
        updated_at: '2025-11-23T00:00:00Z',
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTask })

      const result = await tasksApi.getById('task-1')

      expect(apiClient.get).toHaveBeenCalledWith('/tasks/task-1')
      expect(result).toEqual(mockTask)
    })

    it('should create a new task', async () => {
      const createDto: CreateTaskDto = {
        type_code: TaskType.REFILL,
        priority: TaskPriority.MEDIUM,
        machine_id: 'machine-1',
        assigned_to_user_id: 'operator-1',
        scheduled_date: '2025-11-24',
        description: 'Weekly refill',
        items: [
          {
            nomenclature_id: 'product-1',
            planned_quantity: 50,
            unit_of_measure_code: 'pcs',
          },
        ],
      }

      const mockCreatedTask: Task = {
        id: 'new-task',
        type_code: createDto.type_code,
        priority: createDto.priority,
        machine_id: createDto.machine_id,
        assigned_to_user_id: createDto.assigned_to_user_id,
        scheduled_date: createDto.scheduled_date,
        description: createDto.description,
        items: [
          {
            id: 'item-1',
            task_id: 'new-task',
            nomenclature_id: 'product-1',
            planned_quantity: 50,
            unit_of_measure_code: 'pcs',
          },
        ],
        status: TaskStatus.ASSIGNED,
        created_by_user_id: 'admin-1',
        has_photo_before: false,
        has_photo_after: false,
        created_at: '2025-11-23T00:00:00Z',
        updated_at: '2025-11-23T00:00:00Z',
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedTask })

      const result = await tasksApi.create(createDto)

      expect(apiClient.post).toHaveBeenCalledWith('/tasks', createDto)
      expect(result).toEqual(mockCreatedTask)
    })

    it('should update a task', async () => {
      const updateData = {
        priority: TaskPriority.HIGH,
        description: 'Updated description',
      }

      const mockUpdatedTask: Task = {
        id: 'task-1',
        type_code: TaskType.REFILL,
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH,
        machine_id: 'machine-1',
        created_by_user_id: 'user-1',
        scheduled_date: '2025-11-24',
        description: 'Updated description',
        has_photo_before: false,
        has_photo_after: false,
        created_at: '2025-11-23T00:00:00Z',
        updated_at: '2025-11-23T01:00:00Z',
      }

      vi.mocked(apiClient.patch).mockResolvedValue({ data: mockUpdatedTask })

      const result = await tasksApi.update('task-1', updateData)

      expect(apiClient.patch).toHaveBeenCalledWith('/tasks/task-1', updateData)
      expect(result).toEqual(mockUpdatedTask)
    })
  })

  describe('Task Lifecycle Operations', () => {
    it('should assign task to user', async () => {
      const mockAssignedTask: Task = {
        id: 'task-1',
        type_code: TaskType.REFILL,
        status: TaskStatus.ASSIGNED,
        priority: TaskPriority.MEDIUM,
        machine_id: 'machine-1',
        assigned_to_user_id: 'operator-1',
        created_by_user_id: 'admin-1',
        scheduled_date: '2025-11-24',
        has_photo_before: false,
        has_photo_after: false,
        created_at: '2025-11-23T00:00:00Z',
        updated_at: '2025-11-23T00:30:00Z',
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockAssignedTask })

      const result = await tasksApi.assign('task-1', 'operator-1')

      expect(apiClient.post).toHaveBeenCalledWith('/tasks/task-1/assign', { user_id: 'operator-1' })
      expect(result.status).toBe(TaskStatus.ASSIGNED)
    })

    it('should start a task', async () => {
      const mockStartedTask: Task = {
        id: 'task-1',
        type_code: TaskType.REFILL,
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        machine_id: 'machine-1',
        assigned_to_user_id: 'operator-1',
        created_by_user_id: 'admin-1',
        scheduled_date: '2025-11-24',
        started_at: '2025-11-24T08:00:00Z',
        has_photo_before: false,
        has_photo_after: false,
        created_at: '2025-11-23T00:00:00Z',
        updated_at: '2025-11-24T08:00:00Z',
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockStartedTask })

      const result = await tasksApi.start('task-1')

      expect(apiClient.post).toHaveBeenCalledWith('/tasks/task-1/start')
      expect(result.status).toBe(TaskStatus.IN_PROGRESS)
      expect(result.started_at).toBeDefined()
    })

    it('should complete a refill task with photo validation', async () => {
      const completeDto: CompleteTaskDto = {
        completion_notes: 'Refill completed successfully',
        items: [
          {
            nomenclature_id: 'product-1',
            actual_quantity: 48,
          },
        ],
      }

      const mockCompletedTask: Task = {
        id: 'task-1',
        type_code: TaskType.REFILL,
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.MEDIUM,
        machine_id: 'machine-1',
        assigned_to_user_id: 'operator-1',
        created_by_user_id: 'admin-1',
        scheduled_date: '2025-11-24',
        started_at: '2025-11-24T08:00:00Z',
        completed_at: '2025-11-24T09:00:00Z',
        has_photo_before: true,
        has_photo_after: true,
        notes: 'Refill completed successfully',
        created_at: '2025-11-23T00:00:00Z',
        updated_at: '2025-11-24T09:00:00Z',
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCompletedTask })

      const result = await tasksApi.complete('task-1', completeDto)

      expect(apiClient.post).toHaveBeenCalledWith('/tasks/task-1/complete', completeDto)
      expect(result.status).toBe(TaskStatus.COMPLETED)
      expect(result.has_photo_before).toBe(true)
      expect(result.has_photo_after).toBe(true)
    })

    it('should complete a collection task with cash amount', async () => {
      const completeDto: CompleteTaskDto = {
        actual_cash_amount: 4850,
        completion_notes: 'Collection with minor discrepancy',
      }

      const mockCompletedTask: Task = {
        id: 'task-2',
        type_code: TaskType.COLLECTION,
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.HIGH,
        machine_id: 'machine-2',
        assigned_to_user_id: 'operator-1',
        created_by_user_id: 'admin-1',
        scheduled_date: '2025-11-24',
        started_at: '2025-11-24T10:00:00Z',
        completed_at: '2025-11-24T10:30:00Z',
        expected_cash_amount: 5000,
        actual_cash_amount: 4850,
        has_photo_before: true,
        has_photo_after: true,
        created_at: '2025-11-23T00:00:00Z',
        updated_at: '2025-11-24T10:30:00Z',
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCompletedTask })

      const result = await tasksApi.complete('task-2', completeDto)

      expect(apiClient.post).toHaveBeenCalledWith('/tasks/task-2/complete', completeDto)
      expect(result.actual_cash_amount).toBe(4850)
      expect(result.expected_cash_amount).toBe(5000)
    })

    it('should cancel a task with reason', async () => {
      const mockCancelledTask: Task = {
        id: 'task-1',
        type_code: TaskType.MAINTENANCE,
        status: TaskStatus.CANCELLED,
        priority: TaskPriority.LOW,
        machine_id: 'machine-1',
        created_by_user_id: 'admin-1',
        scheduled_date: '2025-11-24',
        has_photo_before: false,
        has_photo_after: false,
        notes: 'Machine out of service',
        created_at: '2025-11-23T00:00:00Z',
        updated_at: '2025-11-24T12:00:00Z',
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCancelledTask })

      const result = await tasksApi.cancel('task-1', 'Machine out of service')

      expect(apiClient.post).toHaveBeenCalledWith('/tasks/task-1/cancel', {
        reason: 'Machine out of service',
      })
      expect(result.status).toBe(TaskStatus.CANCELLED)
    })

    it('should postpone a task with new date and reason', async () => {
      const mockPostponedTask: Task = {
        id: 'task-1',
        type_code: TaskType.CLEANING,
        status: TaskStatus.POSTPONED,
        priority: TaskPriority.LOW,
        machine_id: 'machine-1',
        created_by_user_id: 'admin-1',
        scheduled_date: '2025-11-25',
        has_photo_before: false,
        has_photo_after: false,
        created_at: '2025-11-23T00:00:00Z',
        updated_at: '2025-11-24T14:00:00Z',
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockPostponedTask })

      const result = await tasksApi.postpone('task-1', '2025-11-25', 'Operator unavailable')

      expect(apiClient.post).toHaveBeenCalledWith('/tasks/task-1/postpone', {
        new_scheduled_date: '2025-11-25',
        reason: 'Operator unavailable',
      })
      expect(result.status).toBe(TaskStatus.POSTPONED)
      expect(result.scheduled_date).toBe('2025-11-25')
    })
  })

  describe('Task Comments', () => {
    it('should add comment to task', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: null })

      await tasksApi.addComment('task-1', 'Machine needs urgent attention')

      expect(apiClient.post).toHaveBeenCalledWith('/tasks/task-1/comments', {
        comment: 'Machine needs urgent attention',
      })
    })

    it('should get task comments', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          task_id: 'task-1',
          user_id: 'user-1',
          comment: 'Started refill process',
          created_at: '2025-11-24T08:00:00Z',
        },
      ]

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockComments })

      const result = await tasksApi.getComments('task-1')

      expect(apiClient.get).toHaveBeenCalledWith('/tasks/task-1/comments')
      expect(result).toEqual(mockComments)
    })
  })

  describe('Task Stats and Analytics', () => {
    it('should get task statistics', async () => {
      const mockStats = {
        total: 150,
        by_status: {
          [TaskStatus.PENDING]: 30,
          [TaskStatus.ASSIGNED]: 25,
          [TaskStatus.IN_PROGRESS]: 20,
          [TaskStatus.COMPLETED]: 70,
          [TaskStatus.CANCELLED]: 5,
          [TaskStatus.POSTPONED]: 0,
        },
        by_type: {
          [TaskType.REFILL]: 60,
          [TaskType.COLLECTION]: 40,
          [TaskType.MAINTENANCE]: 20,
          [TaskType.REPAIR]: 15,
          [TaskType.CLEANING]: 10,
          [TaskType.INSPECTION]: 5,
          [TaskType.REPLACE_HOPPER]: 0,
          [TaskType.REPLACE_GRINDER]: 0,
          [TaskType.REPLACE_BREWER]: 0,
          [TaskType.REPLACE_MIXER]: 0,
          [TaskType.OTHER]: 0,
        },
        overdue: 12,
        in_progress: 20,
        pending_photos: 8,
      }

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStats })

      const result = await tasksApi.getStats()

      expect(apiClient.get).toHaveBeenCalledWith('/tasks/stats')
      expect(result.total).toBe(150)
      expect(result.overdue).toBe(12)
      expect(result.pending_photos).toBe(8)
    })

    it('should get overdue tasks', async () => {
      const mockOverdueTasks: Task[] = [
        {
          id: 'task-overdue-1',
          type_code: TaskType.COLLECTION,
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.CRITICAL,
          machine_id: 'machine-1',
          created_by_user_id: 'admin-1',
          scheduled_date: '2025-11-20',
          due_date: '2025-11-22',
          has_photo_before: false,
          has_photo_after: false,
          created_at: '2025-11-19T00:00:00Z',
          updated_at: '2025-11-23T00:00:00Z',
        },
      ]

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockOverdueTasks })

      const result = await tasksApi.getOverdue()

      expect(apiClient.get).toHaveBeenCalledWith('/tasks/overdue')
      expect(result).toHaveLength(1)
      expect(result[0].priority).toBe(TaskPriority.CRITICAL)
    })

    it('should escalate overdue tasks and create incidents', async () => {
      const mockEscalationResult = {
        escalated_count: 5,
        incidents_created: 3,
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockEscalationResult })

      const result = await tasksApi.escalate()

      expect(apiClient.post).toHaveBeenCalledWith('/tasks/escalate')
      expect(result.escalated_count).toBe(5)
      expect(result.incidents_created).toBe(3)
    })
  })

  describe('Task Photos', () => {
    it('should get task photos', async () => {
      const mockPhotos = [
        {
          id: 'photo-1',
          task_id: 'task-1',
          category_code: 'task_photo_before',
          file_url: 'https://storage.example.com/photo-1.jpg',
          created_at: '2025-11-24T08:00:00Z',
        },
        {
          id: 'photo-2',
          task_id: 'task-1',
          category_code: 'task_photo_after',
          file_url: 'https://storage.example.com/photo-2.jpg',
          created_at: '2025-11-24T09:00:00Z',
        },
      ]

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPhotos })

      const result = await tasksApi.getPhotos('task-1')

      expect(apiClient.get).toHaveBeenCalledWith('/tasks/task-1/photos')
      expect(result).toHaveLength(2)
    })

    it('should get tasks with pending photo uploads', async () => {
      const mockPendingPhotoTasks: Task[] = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          status: TaskStatus.COMPLETED,
          priority: TaskPriority.MEDIUM,
          machine_id: 'machine-1',
          created_by_user_id: 'admin-1',
          scheduled_date: '2025-11-24',
          pending_photos: true,
          has_photo_before: false,
          has_photo_after: false,
          created_at: '2025-11-24T00:00:00Z',
          updated_at: '2025-11-24T09:00:00Z',
        },
      ]

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPendingPhotoTasks })

      const result = await tasksApi.getPendingPhotos()

      expect(apiClient.get).toHaveBeenCalledWith('/tasks/pending-photos')
      expect(result[0].pending_photos).toBe(true)
    })

    it('should upload pending photos for offline-completed task', async () => {
      const mockUpdatedTask: Task = {
        id: 'task-1',
        type_code: TaskType.REFILL,
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.MEDIUM,
        machine_id: 'machine-1',
        created_by_user_id: 'admin-1',
        scheduled_date: '2025-11-24',
        pending_photos: false,
        has_photo_before: true,
        has_photo_after: true,
        created_at: '2025-11-24T00:00:00Z',
        updated_at: '2025-11-24T10:00:00Z',
      }

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockUpdatedTask })

      const result = await tasksApi.uploadPendingPhotos('task-1')

      expect(apiClient.post).toHaveBeenCalledWith('/tasks/task-1/upload-photos')
      expect(result.pending_photos).toBe(false)
      expect(result.has_photo_before).toBe(true)
      expect(result.has_photo_after).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 error when task not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Task not found' },
        },
      })

      await expect(tasksApi.getById('non-existent')).rejects.toMatchObject({
        response: {
          status: 404,
        },
      })
    })

    it('should handle 400 error when completing task without photos', async () => {
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Photos are required to complete the task' },
        },
      })

      await expect(tasksApi.complete('task-1', { completion_notes: 'Done' })).rejects.toMatchObject(
        {
          response: {
            status: 400,
            data: {
              message: 'Photos are required to complete the task',
            },
          },
        }
      )
    })

    it('should handle 403 error when unauthorized to complete task', async () => {
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'You are not authorized to complete this task' },
        },
      })

      await expect(tasksApi.complete('task-1', { completion_notes: 'Done' })).rejects.toMatchObject(
        {
          response: {
            status: 403,
          },
        }
      )
    })

    it('should handle 500 server error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      })

      await expect(
        tasksApi.create({
          type_code: TaskType.REFILL,
          priority: TaskPriority.MEDIUM,
          machine_id: 'machine-1',
          scheduled_date: '2025-11-24',
        })
      ).rejects.toMatchObject({
        response: {
          status: 500,
        },
      })
    })

    it('should handle network error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        message: 'Network Error',
        code: 'ERR_NETWORK',
      })

      await expect(tasksApi.getAll()).rejects.toMatchObject({
        message: 'Network Error',
      })
    })
  })
})
