import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Organization, OrganizationType } from './entities/organization.entity';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let repository: Repository<Organization>;

  const mockOrganization = {
    id: 'org-uuid-1',
    name: 'VendHub HQ',
    slug: 'vendhub-hq',
    type: OrganizationType.HEADQUARTERS,
    parent_id: null,
    parent: null,
    children: [],
    settings: {},
    is_active: true,
    phone: null,
    email: null,
    address: null,
    logo_url: null,
    tax_id: null,
    contract_start_date: null,
    contract_end_date: null,
    commission_rate: null,
    created_by_id: null,
    updated_by_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockOrganization]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            create: jest.fn().mockReturnValue(mockOrganization),
            save: jest.fn().mockResolvedValue(mockOrganization),
            find: jest.fn().mockResolvedValue([mockOrganization]),
            findOne: jest.fn().mockResolvedValue(mockOrganization),
            count: jest.fn().mockResolvedValue(0),
            softRemove: jest.fn().mockResolvedValue(mockOrganization),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    repository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create organization', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);
      const result = await service.create({
        name: 'Test',
        slug: 'test',
        type: OrganizationType.FRANCHISE,
      });
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if slug exists', async () => {
      await expect(
        service.create({ name: 'Test', slug: 'vendhub-hq', type: OrganizationType.FRANCHISE }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return organizations', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockOrganization]);
    });

    it('should apply type filter', async () => {
      await service.findAll({ type: OrganizationType.FRANCHISE });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return organization', async () => {
      const result = await service.findOne('org-uuid-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should return organization by slug', async () => {
      const result = await service.findBySlug('vendhub-hq');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);
      await expect(service.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update organization', async () => {
      jest.spyOn(repository, 'save').mockImplementation(async (entity) => entity as Organization);
      const result = await service.update('org-uuid-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw BadRequestException if self-reference', async () => {
      await expect(
        service.update('org-uuid-1', { parent_id: 'org-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove organization', async () => {
      await expect(service.remove('org-uuid-1')).resolves.not.toThrow();
    });

    it('should throw BadRequestException if has children', async () => {
      jest.spyOn(repository, 'count').mockResolvedValueOnce(5);
      await expect(service.remove('org-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getHierarchy', () => {
    it('should return hierarchy', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([mockOrganization]);
      const result = await service.getHierarchy();
      expect(result).toBeDefined();
    });
  });

  describe('getDescendants', () => {
    it('should return descendants', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);
      const result = await service.getDescendants(mockOrganization as Organization);
      expect(result).toEqual([]);
    });
  });

  describe('getAncestorIds', () => {
    it('should return empty array for root', async () => {
      const result = await service.getAncestorIds('org-uuid-1');
      expect(result).toEqual([]);
    });
  });

  describe('generateSlug', () => {
    it('should generate unique slug', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const result = await service.generateSlug('Test Org');
      expect(result).toBe('test-org');
    });

    it('should add suffix for existing slug', async () => {
      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(mockOrganization as Organization)
        .mockResolvedValueOnce(null);
      const result = await service.generateSlug('Test');
      expect(result).toBe('test-1');
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);
      const result = await service.getStatistics('org-uuid-1');
      expect(result.childrenCount).toBe(0);
      expect(result.totalDescendantsCount).toBe(0);
    });
  });
});
