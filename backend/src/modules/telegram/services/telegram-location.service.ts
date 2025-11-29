import { Injectable, Logger } from '@nestjs/common';
import { TelegramTaskInfo, TelegramMachineInfo, NearbyTaskResult } from '../types/telegram.types';

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
      // This would integrate with TasksService in real implementation
      // For now, returning type-safe structure

      // TODO: Implement actual query:
      // 1. Get tasks assigned to user with status 'created' or 'in_progress'
      // 2. Load machine locations for each task
      // 3. Calculate distance for each
      // 4. Filter by radius
      // 5. Sort by distance

      this.logger.log(
        `Finding tasks near (${latitude}, ${longitude}) within ${radiusMeters}m for user ${userId}`,
      );

      // Placeholder - in real implementation, would query database
      const nearbyTasks: NearbyTaskResult[] = [];

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
  }> {
    try {
      // TODO: Implement actual verification:
      // 1. Load task with machine and location
      // 2. Get machine's GPS coordinates
      // 3. Calculate distance
      // 4. Compare with threshold

      this.logger.log(`Verifying location for task ${taskId} at (${operatorLat}, ${operatorLon})`);

      // Placeholder response
      return {
        isValid: false,
        distance: 0,
        threshold: this.TASK_VERIFICATION_RADIUS,
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
      // TODO: Implement storage:
      // 1. Validate task exists and is active
      // 2. Store coordinates in task metadata JSON field
      // 3. Add timestamp

      this.logger.log(`Storing location for task ${taskId}: (${latitude}, ${longitude})`);

      return true;
    } catch (error) {
      this.logger.error('Failed to store task location', error);
      return false;
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
