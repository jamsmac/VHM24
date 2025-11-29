import { Injectable } from '@nestjs/common';

interface Location {
  id: string;
  lat: number;
  lng: number;
  priority?: number;
}

@Injectable()
export class RouteOptimizationService {
  /**
   * Optimize route using nearest neighbor algorithm
   */
  optimizeRoute(start: Location, locations: Location[]): Location[] {
    if (locations.length === 0) return [];
    if (locations.length === 1) return locations;

    const optimized: Location[] = [];
    const remaining = [...locations];
    let current = start;

    while (remaining.length > 0) {
      // Find nearest location considering priority
      let nearestIndex = 0;
      let minScore = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const distance = this.calculateDistance(current, remaining[i]);
        const priorityFactor = remaining[i].priority || 1;
        const score = distance / priorityFactor; // Lower score = better

        if (score < minScore) {
          minScore = score;
          nearestIndex = i;
        }
      }

      const nearest = remaining.splice(nearestIndex, 1)[0];
      optimized.push(nearest);
      current = nearest;
    }

    return optimized;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(point1: Location, point2: Location): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) *
        Math.cos(this.toRad(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate total route distance
   */
  calculateTotalDistance(route: Location[]): number {
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += this.calculateDistance(route[i], route[i + 1]);
    }
    return total;
  }

  /**
   * Estimate travel time based on distance
   */
  estimateTravelTime(distanceKm: number, avgSpeedKmh: number = 40): number {
    return Math.ceil((distanceKm / avgSpeedKmh) * 60); // minutes
  }
}
