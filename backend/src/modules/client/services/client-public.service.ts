import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, LocationStatus } from '@modules/locations/entities/location.entity';
import { Machine, MachineStatus } from '@modules/machines/entities/machine.entity';
import { Nomenclature } from '@modules/nomenclature/entities/nomenclature.entity';
import {
  PublicLocationsQueryDto,
  PublicLocationResponseDto,
  PublicMenuQueryDto,
  MenuItemResponseDto,
  QrResolveDto,
  QrResolveResponseDto,
} from '../dto/client-public.dto';

/**
 * Public API service for client-facing endpoints.
 * No authentication required for these endpoints.
 */
@Injectable()
export class ClientPublicService {
  private readonly logger = new Logger(ClientPublicService.name);

  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(Nomenclature)
    private readonly nomenclatureRepository: Repository<Nomenclature>,
  ) {}

  /**
   * Get public locations list with optional distance calculation
   */
  async getPublicLocations(query: PublicLocationsQueryDto): Promise<{
    data: PublicLocationResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { search, city, lat, lng, page = 1, limit = 50 } = query;

    const qb = this.locationRepository
      .createQueryBuilder('location')
      .where('location.status = :status', { status: LocationStatus.ACTIVE })
      .andWhere('location.deleted_at IS NULL');

    if (search) {
      qb.andWhere('(location.name ILIKE :search OR location.address ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (city) {
      qb.andWhere('location.city = :city', { city });
    }

    // Get machine counts per location
    qb.loadRelationCountAndMap(
      'location.machine_count',
      'location.machines',
      'machine',
      (sq) => sq.where('machine.status != :disabled', { disabled: MachineStatus.DISABLED }),
    );

    const total = await qb.getCount();

    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('location.name', 'ASC');

    const locations = await qb.getMany();

    // Calculate distances if coordinates provided
    const data: PublicLocationResponseDto[] = locations.map((loc: any) => {
      const result: PublicLocationResponseDto = {
        id: loc.id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        lat: loc.latitude ? parseFloat(String(loc.latitude)) : undefined,
        lng: loc.longitude ? parseFloat(String(loc.longitude)) : undefined,
        machine_count: loc.machine_count || 0,
        working_hours: loc.working_hours,
      };

      if (lat && lng && loc.latitude && loc.longitude) {
        result.distance_km = this.calculateDistance(
          lat,
          lng,
          parseFloat(String(loc.latitude)),
          parseFloat(String(loc.longitude)),
        );
      }

      return result;
    });

    // Sort by distance if coordinates provided
    if (lat && lng) {
      data.sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
    }

    return { data, total, page, limit };
  }

  /**
   * Get machine menu (available products)
   */
  async getMachineMenu(query: PublicMenuQueryDto): Promise<MenuItemResponseDto[]> {
    const { machine_id, category } = query;

    // Verify machine exists and is available
    const machine = await this.machineRepository.findOne({
      where: { id: machine_id },
    });

    if (!machine) {
      throw new NotFoundException(`Machine not found`);
    }

    if (machine.status === MachineStatus.DISABLED || machine.status === MachineStatus.OFFLINE) {
      return []; // Return empty menu for unavailable machines
    }

    // Get products available for this machine
    // This uses the machine_inventory or machine_recipes relations
    const qb = this.nomenclatureRepository
      .createQueryBuilder('nom')
      .leftJoin('machine_inventory', 'inv', 'inv.nomenclature_id = nom.id AND inv.machine_id = :machineId', { machineId: machine_id })
      .where('nom.deleted_at IS NULL')
      .andWhere('nom.is_active = true')
      .select([
        'nom.id',
        'nom.name',
        'nom.description',
        'nom.category',
        'nom.image_url',
        'nom.default_price',
        'COALESCE(inv.quantity, 0) as stock',
      ]);

    if (category) {
      qb.andWhere('nom.category = :category', { category });
    }

    qb.orderBy('nom.category', 'ASC').addOrderBy('nom.name', 'ASC');

    const products = await qb.getRawMany();

    return products.map((p) => ({
      id: p.nom_id,
      name: p.nom_name,
      description: p.nom_description,
      price: parseFloat(p.nom_default_price) || 0,
      currency: 'UZS',
      category: p.nom_category,
      image_url: p.nom_image_url,
      is_available: parseInt(p.stock) > 0,
      stock: parseInt(p.stock),
      points_earned: Math.floor((parseFloat(p.nom_default_price) || 0) / 1000), // 1 point per 1000 UZS
    }));
  }

  /**
   * Resolve QR code to machine info
   */
  async resolveQrCode(dto: QrResolveDto): Promise<QrResolveResponseDto> {
    const { qr_code } = dto;

    // Try to find by QR code first, then by machine_number
    let machine = await this.machineRepository.findOne({
      where: { qr_code },
      relations: ['location'],
    });

    if (!machine) {
      // Try machine_number (QR might contain just the number)
      machine = await this.machineRepository.findOne({
        where: { machine_number: qr_code },
        relations: ['location'],
      });
    }

    if (!machine) {
      // Try extracting machine number from URL pattern
      const match = qr_code.match(/\/(?:machine|m)\/([A-Z0-9-]+)/i);
      if (match) {
        machine = await this.machineRepository.findOne({
          where: { machine_number: match[1] },
          relations: ['location'],
        });
      }
    }

    if (!machine) {
      throw new NotFoundException('Machine not found for this QR code');
    }

    const isAvailable = ![
      MachineStatus.DISABLED,
      MachineStatus.OFFLINE,
      MachineStatus.ERROR,
    ].includes(machine.status);

    const response: QrResolveResponseDto = {
      machine_id: machine.id,
      machine_number: machine.machine_number,
      machine_name: machine.name,
      is_available: isAvailable,
    };

    if (!isAvailable) {
      response.unavailable_reason =
        machine.status === MachineStatus.DISABLED
          ? 'Machine is disabled'
          : machine.status === MachineStatus.OFFLINE
            ? 'Machine is offline'
            : 'Machine is temporarily unavailable';
    }

    if (machine.location) {
      response.location = {
        id: machine.location.id,
        name: machine.location.name,
        address: machine.location.address,
        city: machine.location.city,
        lat: machine.location.latitude
          ? parseFloat(String(machine.location.latitude))
          : undefined,
        lng: machine.location.longitude
          ? parseFloat(String(machine.location.longitude))
          : undefined,
        machine_count: 1,
      };
    }

    this.logger.log(`QR code resolved: ${qr_code} -> ${machine.machine_number}`);

    return response;
  }

  /**
   * Get unique cities list
   */
  async getCities(): Promise<string[]> {
    const result = await this.locationRepository
      .createQueryBuilder('location')
      .select('DISTINCT location.city', 'city')
      .where('location.status = :status', { status: LocationStatus.ACTIVE })
      .andWhere('location.city IS NOT NULL')
      .orderBy('location.city', 'ASC')
      .getRawMany();

    return result.map((r) => r.city).filter(Boolean);
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
