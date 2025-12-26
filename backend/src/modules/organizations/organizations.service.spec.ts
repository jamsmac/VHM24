import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Organization, OrganizationType } from './entities/organization.entity';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  const mockOrg = { id: 'org-1', name: 'Test', slug: 'test', type: OrganizationType.HEADQUARTERS, parent_id: null };
  const mockRepository = {
    create: jest.fn().mockReturnValue(mockOrg),
    save: jest.fn().mockResolvedValue(mockOrg),
    find: jest.fn().mockResolvedValue([mockOrg]),
    findOne: jest.fn().mockResolvedValue(mockOrg),
    count: jest.fn().mockResolvedValue(0),
    softRemove: jest.fn().mockResolvedValue(mockOrg),
    createQueryBuilder: jest.fn().mockReturnValue({
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockOrg]),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(Organization), useValue: mockRepository },
      ],
    }).compile();
    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('create', () => {
    it('should create organization', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);
      const result = await service.create({ name: 'Test', slug: 'new', type: OrganizationType.FRANCHISE });
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if slug exists', async () => {
      await expect(service.create({ name: 'Test', slug: 'test', type: OrganizationType.FRANCHISE })).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return organization', async () => {
      const result = await service.findOne('org-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update organization', async () => {
      mockRepository.save.mockImplementation(async (e: any) => e);
      const result = await service.update('org-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw BadRequestException if self-reference', async () => {
      await expect(service.update('org-1', { parent_id: 'org-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove organization', async () => {
      await expect(service.remove('org-1')).resolves.not.toThrow();
    });

    it('should throw BadRequestException if has children', async () => {
      mockRepository.count.mockResolvedValueOnce(5);
      await expect(service.remove('org-1')).rejects.toThrow(BadRequestException);
    });
  });
});
