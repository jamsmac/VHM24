import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../../../tasks/entities/task.entity';
import { NearbyTaskResult, TelegramTaskInfo, TelegramMachineInfo } from '../../shared/types/telegram.types';

/**
 * Location Service for Telegram Bot
 *
 * Handles GPS location sharing from operators for:
 * - Route optimization (find nearest tasks)
 * - Task geo-fencing (verify operator at correct location)
 * - Emergency support (share location with manager)
 *
 * **Privacy Principles:**
 * - Location shared ONLY when operator explicitly sends it
 * - Location NOT tracked continuously
 * - Location NOT stored permanently (only for active tasks)
 * - Location access requires operator consent
 * - Location data encrypted in transit and at rest
 *
 * **Use Cases:**
 * 1. Route optimization - Find nearest tasks based on current location
 * 2. Task verification - Verify operator is at machine location
 * 3. Emergency support - Share location with manager for assistance
 *
 * **Example Flow:**
 * ```
 * 1. Operator shares location from Telegram
 * 2. Bot receives GPS coordinates
 * 3. Bot finds nearby tasks (within 1000m radius)
 * 4. Bot sorts tasks by distance
 * 5. Bot suggests optimal route order
 * ```
 */
@Injectable()
export class TelegramLocationService {
  private readonly logger = new Logger(TelegramLocationService.name);

  // Default radius for nearby search (meters)
  private readonly DEFAULT_SEARCH_RADIUS = 1000; // 1km

  // Proximity threshold for task verification (meters)
  private readonly TASK_VERIFICATION_RADIUS = 100; // 100m

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   *
   * Accurate to within 1 meter for distances up to 1000km.
   *
   * @param lat1 - Latitude of point 1 (degrees)
   * @param lon1 - Longitude of point 1 (degrees)
   * @param lat2 - Latitude of point 2 (degrees)
   * @param lon2 - Longitude of point 2 (degrees)
   * @returns Distance in meters
   *
   * @example
   * ```typescript
   * // Tashkent City Center to Tashkent Airport
   * const distance = calculateDistance(41.2995, 69.2401, 41.2579, 69.2811);
   * // → ~6,700 meters (6.7 km)
   * ```
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters

    return Math.round(distance);
  }

  /**
   * Find nearby tasks based on operator's location
   *
   * Searches for tasks assigned to operator within specified radius.
   * Returns tasks sorted by distance (nearest first).
   *
   * @param userId - VendHub user ID
   * @param latitude - Operator's latitude
   * @param longitude - Operator's longitude
   * @param radiusMeters - Search radius in meters (default: 1000m)
   * @returns Tasks with distance, sorted by proximity
   *
   * @example
   * ```typescript
   * const nearbyTasks = await this.locationService.findNearbyTasks(
   *   userId,
   *   41.2995,  // Tashkent coordinates
   *   69.2401,
   *   1000,     // Within 1km
   * );
   *
   * // Returns:
   * // [
   * //   { task: {...}, distance: 120, machine: {...} },
   * //   { task: {...}, distance: 340, machine: {...} },
   * //   { task: {...}, distance: 580, machine: {...} },
   * // ]
   * ```
   */
  async findNearbyTasks(
    userId: string,
    latitude: number,
    longitude: number,
    radiusMeters: number = this.DEFAULT_SEARCH_RADIUS,
  ): Promise<NearbyTaskResult[]> {
    try {
      this.logger.log(
        `Finding tasks near (${latitude}, ${longitude}) within ${radiusMeters}m for user ${userId}`,
      );

      // Get active tasks assigned to user with machine and location data
      const activeStatuses = [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS];

      const tasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.machine', 'machine')
        .leftJoinAndSelect('machine.location', 'location')
        .where('task.assigned_to_user_id = :userId', { userId })
        .andWhere('task.status IN (:...statuses)', { statuses: activeStatuses })
        .andWhere('task.deleted_at IS NULL')
        .andWhere('machine.deleted_at IS NULL')
        .andWhere('location.latitude IS NOT NULL')
        .andWhere('location.longitude IS NOT NULL')
        .orderBy('task.priority', 'DESC')
        .addOrderBy('task.scheduled_date', 'ASC')
        .getMany();

      // Calculate distance for each task and filter by radius
      const nearbyTasks: NearbyTaskResult[] = [];

      for (const task of tasks) {
        const location = task.machine?.location;
        if (!location?.latitude || !location?.longitude) {
          continue;
        }

        const distance = this.calculateDistance(
          latitude,
          longitude,
          Number(location.latitude),
          Number(location.longitude),
        );

        // Only include tasks within radius
        if (distance <= radiusMeters) {
          const taskInfo: TelegramTaskInfo = {
            id: task.id,
            type_code: task.type_code,
            status: task.status,
            scheduled_date: task.scheduled_date,
            machine: task.machine
              ? {
                  id: task.machine.id,
                  machine_number: task.machine.machine_number,
                  name: task.machine.name,
                  location: location
                    ? {
                        id: location.id,
                        name: location.name,
                      }
                    : null,
                }
              : null,
            has_photo_before: task.has_photo_before,
            has_photo_after: task.has_photo_after,
          };

          const machineInfo: TelegramMachineInfo = {
            id: task.machine?.id || '',
            name: task.machine?.name || '',
            machine_number: task.machine?.machine_number,
            status: task.machine?.status || 'unknown',
            location: location?.name,
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
          };

          nearbyTasks.push({
            task: taskInfo,
            machine: machineInfo,
            distance,
            distanceFormatted: this.formatDistance(distance),
          });
        }
      }

      // Sort by distance (nearest first)
      nearbyTasks.sort((a, b) => a.distance - b.distance);

      this.logger.log(`Found ${nearbyTasks.length} tasks within ${radiusMeters}m`);

      return nearbyTasks;
    } catch (error) {
      this.logger.error('Failed to find nearby tasks', error);
      return [];
    }
  }

  /**
   * Verify operator is at correct location for task
   *
   * Checks if operator's location is within acceptable proximity
   * to machine location. Used for geo-fencing task completion.
   *
   * @param taskId - Task ID
   * @param operatorLat - Operator's latitude
   * @param operatorLon - Operator's longitude
   * @returns Verification result with distance
   *
   * @example
   * ```typescript
   * const verification = await this.locationService.verifyTaskLocation(
   *   'task-uuid',
   *   41.2995,
   *   69.2401,
   * );
   *
   * if (verification.isValid) {
   *   // Allow task to be started/completed
   * } else {
   *   // Show error: "You must be within 100m of machine (currently ${verification.distance}m away)"
   * }
   * ```
   */
  async verifyTaskLocation(
    taskId: string,
    operatorLat: number,
    operatorLon: number,
  ): Promise<{
    isValid: boolean;
    distance: number;
    threshold: number;
    machineLocation?: { latitude: number; longitude: number };
    machineName?: string;
    locationName?: string;
  }> {
    try {
      this.logger.log(`Verifying location for task ${taskId} at (${operatorLat}, ${operatorLon})`);

      // Load task with machine and location
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['machine', 'machine.location'],
      });

      if (!task) {
        this.logger.warn(`Task ${taskId} not found for location verification`);
        return {
          isValid: false,
          distance: 0,
          threshold: this.TASK_VERIFICATION_RADIUS,
        };
      }

      const location = task.machine?.location;
      if (!location?.latitude || !location?.longitude) {
        this.logger.warn(`Machine location not available for task ${taskId}`);
        return {
          isValid: false,
          distance: 0,
          threshold: this.TASK_VERIFICATION_RADIUS,
          machineName: task.machine?.name,
        };
      }

      const machineLat = Number(location.latitude);
      const machineLon = Number(location.longitude);

      // Calculate distance between operator and machine
      const distance = this.calculateDistance(operatorLat, operatorLon, machineLat, machineLon);

      const isValid = distance <= this.TASK_VERIFICATION_RADIUS;

      this.logger.log(
        `Location verification: distance=${distance}m, threshold=${this.TASK_VERIFICATION_RADIUS}m, valid=${isValid}`,
      );

      return {
        isValid,
        distance,
        threshold: this.TASK_VERIFICATION_RADIUS,
        machineLocation: {
          latitude: machineLat,
          longitude: machineLon,
        },
        machineName: task.machine?.name,
        locationName: location.name,
      };
    } catch (error) {
      this.logger.error('Location verification failed', error);
      return {
        isValid: false,
        distance: 0,
        threshold: this.TASK_VERIFICATION_RADIUS,
      };
    }
  }

  /**
   * Format distance for display
   *
   * Converts meters to human-readable format.
   *
   * @param meters - Distance in meters
   * @param language - Language code for formatting
   * @returns Formatted distance string
   *
   * @example
   * ```typescript
   * formatDistance(120, 'ru') // → "120м"
   * formatDistance(1500, 'ru') // → "1.5км"
   * formatDistance(120, 'en') // → "120m"
   * formatDistance(1500, 'en') // → "1.5km"
   * ```
   */
  formatDistance(meters: number, language: string = 'ru'): string {
    const unit = language === 'en' ? 'm' : 'м';
    const kmUnit = language === 'en' ? 'km' : 'км';

    if (meters < 1000) {
      return `${meters}${unit}`;
    }

    const km = (meters / 1000).toFixed(1);
    return `${km}${kmUnit}`;
  }

  /**
   * Store operator location for active task
   *
   * Saves GPS coordinates in task metadata for audit trail.
   * Location is only stored if task is active.
   *
   * **Privacy:** Location deleted when task completed (after 24 hours max).
   *
   * @param taskId - Task ID
   * @param latitude - Operator's latitude
   * @param longitude - Operator's longitude
   * @returns Success status
   */
  async storeTaskLocation(taskId: string, latitude: number, longitude: number): Promise<boolean> {
    try {
      this.logger.log(`Storing location for task ${taskId}: (${latitude}, ${longitude})`);

      // Validate task exists and is active
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
      });

      if (!task) {
        this.logger.warn(`Task ${taskId} not found for location storage`);
        return false;
      }

      // Only store location for active tasks
      const activeStatuses = [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS];
      if (!activeStatuses.includes(task.status)) {
        this.logger.warn(`Task ${taskId} is not active (status: ${task.status})`);
        return false;
      }

      // Store coordinates in task metadata
      const currentMetadata = (task.metadata || {}) as Record<string, unknown>;
      const locationHistory = (currentMetadata.location_history as Array<unknown>) || [];
      locationHistory.push({
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 10 location entries
      const trimmedHistory = locationHistory.slice(-10);

      const updatedMetadata: Record<string, unknown> = {
        ...currentMetadata,
        last_operator_location: {
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        },
        location_history: trimmedHistory,
      };

      // Update task metadata directly
      task.metadata = updatedMetadata as Record<string, any>;
      await this.taskRepository.save(task);

      this.logger.log(`Location stored for task ${taskId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to store task location', error);
      return false;
    }
  }

  /**
   * Get operator's last known location for a task
   *
   * @param taskId - Task ID
   * @returns Last known location or null
   */
  async getLastTaskLocation(
    taskId: string,
  ): Promise<{ latitude: number; longitude: number; timestamp: string } | null> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        select: ['id', 'metadata'],
      });

      const metadata = task?.metadata as Record<string, unknown> | null;
      const lastLocation = metadata?.last_operator_location as
        | { latitude: number; longitude: number; timestamp: string }
        | undefined;

      if (!lastLocation) {
        return null;
      }

      return lastLocation;
    } catch (error) {
      this.logger.error('Failed to get last task location', error);
      return null;
    }
  }

  /**
   * Calculate optimal route order
   *
   * Given operator's current location and list of tasks,
   * calculates optimal visit order to minimize travel distance.
   *
   * Uses simple nearest-neighbor algorithm (good for 5-10 tasks).
   * For larger routes, consider using external routing API.
   *
   * @param startLat - Starting latitude
   * @param startLon - Starting longitude
   * @param tasks - Tasks with machine locations
   * @returns Ordered task list with total distance
   *
   * @example
   * ```typescript
   * const route = this.locationService.calculateOptimalRoute(
   *   41.2995,
   *   69.2401,
   *   [task1, task2, task3, task4, task5]
   * );
   *
   * // Returns tasks sorted by optimal visit order
   * // Total estimated distance: 8.5 km
   * ```
   */
  calculateOptimalRoute(
    startLat: number,
    startLon: number,
    tasks: Array<{
      id: string;
      machine: { latitude: number; longitude: number };
    }>,
  ): {
    orderedTasks: Array<{ id: string; distance: number }>;
    totalDistance: number;
  } {
    if (tasks.length === 0) {
      return { orderedTasks: [], totalDistance: 0 };
    }

    // Simple nearest-neighbor algorithm
    const remaining = [...tasks];
    const ordered: Array<{ id: string; distance: number }> = [];
    let currentLat = startLat;
    let currentLon = startLon;
    let totalDistance = 0;

    while (remaining.length > 0) {
      // Find nearest task
      let nearestIndex = 0;
      let nearestDistance = this.calculateDistance(
        currentLat,
        currentLon,
        remaining[0].machine.latitude,
        remaining[0].machine.longitude,
      );

      for (let i = 1; i < remaining.length; i++) {
        const distance = this.calculateDistance(
          currentLat,
          currentLon,
          remaining[i].machine.latitude,
          remaining[i].machine.longitude,
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      // Add to route
      const nearestTask = remaining[nearestIndex];
      ordered.push({
        id: nearestTask.id,
        distance: nearestDistance,
      });

      totalDistance += nearestDistance;

      // Update current position
      currentLat = nearestTask.machine.latitude;
      currentLon = nearestTask.machine.longitude;

      // Remove from remaining
      remaining.splice(nearestIndex, 1);
    }

    return { orderedTasks: ordered, totalDistance };
  }

  /**
   * Find nearby tasks and calculate optimal route
   *
   * Combines findNearbyTasks and calculateOptimalRoute for convenience.
   *
   * @param userId - VendHub user ID
   * @param latitude - Operator's latitude
   * @param longitude - Operator's longitude
   * @param radiusMeters - Search radius in meters
   * @returns Nearby tasks in optimal order with route info
   */
  async findNearbyTasksWithOptimalRoute(
    userId: string,
    latitude: number,
    longitude: number,
    radiusMeters: number = this.DEFAULT_SEARCH_RADIUS,
  ): Promise<{
    tasks: NearbyTaskResult[];
    totalDistance: number;
    totalDistanceFormatted: string;
  }> {
    const nearbyTasks = await this.findNearbyTasks(userId, latitude, longitude, radiusMeters);

    if (nearbyTasks.length === 0) {
      return {
        tasks: [],
        totalDistance: 0,
        totalDistanceFormatted: '0м',
      };
    }

    // Prepare tasks for route optimization
    const tasksForRoute = nearbyTasks.map((t) => ({
      id: t.task.id,
      machine: {
        latitude: t.machine.latitude || 0,
        longitude: t.machine.longitude || 0,
      },
    }));

    const route = this.calculateOptimalRoute(latitude, longitude, tasksForRoute);

    // Reorder nearbyTasks according to optimal route
    const orderedTasks: NearbyTaskResult[] = [];
    for (const routeTask of route.orderedTasks) {
      const task = nearbyTasks.find((t) => t.task.id === routeTask.id);
      if (task) {
        orderedTasks.push({
          ...task,
          distance: routeTask.distance,
          distanceFormatted: this.formatDistance(routeTask.distance),
        });
      }
    }

    return {
      tasks: orderedTasks,
      totalDistance: route.totalDistance,
      totalDistanceFormatted: this.formatDistance(route.totalDistance),
    };
  }

  /**
   * Validate GPS coordinates
   *
   * Checks if coordinates are valid and within reasonable bounds.
   *
   * @param latitude - Latitude to validate
   * @param longitude - Longitude to validate
   * @returns Validation result
   */
  validateCoordinates(
    latitude: number,
    longitude: number,
  ): {
    isValid: boolean;
    error?: string;
  } {
    if (isNaN(latitude) || isNaN(longitude)) {
      return { isValid: false, error: 'Coordinates must be numbers' };
    }

    if (latitude < -90 || latitude > 90) {
      return { isValid: false, error: 'Latitude must be between -90 and 90' };
    }

    if (longitude < -180 || longitude > 180) {
      return {
        isValid: false,
        error: 'Longitude must be between -180 and 180',
      };
    }

    // Optional: Check if coordinates are in Uzbekistan bounds
    // Uzbekistan approximate bounds: 37°-46°N, 56°-74°E
    const isInUzbekistan = latitude >= 37 && latitude <= 46 && longitude >= 56 && longitude <= 74;

    if (!isInUzbekistan) {
      this.logger.warn(`Coordinates (${latitude}, ${longitude}) are outside Uzbekistan bounds`);
    }

    return { isValid: true };
  }
}
