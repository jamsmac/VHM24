import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MachineAccessService } from './machine-access.service';
import { MachineAccess, MachineAccessRole } from './entities/machine-access.entity';
import { AccessTemplate } from './entities/access-template.entity';
import { AccessTemplateRow } from './entities/access-template-row.entity';
import { Machine } from '../machines/entities/machine.entity';
import { User } from '../users/entities/user.entity';

describe('MachineAccessService', () => {
  let service: MachineAccessService;
  let machineAccessRepository: jest.Mocked<Repository<MachineAccess>>;
  let templateRepository: jest.Mocked<Repository<AccessTemplate>>;
  let templateRowRepository: jest.Mocked<Repository<AccessTemplateRow>>;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  const mockUser: Partial<User> = {
    id: 'user-id-1',
    username: 'testuser',
    email: 'test@example.com',
    telegram_username: 'tguser',
  };

  const mockMachine: Partial<Machine> = {
    id: 'machine-id-1',
    machine_number: 'M-001',
    name: 'Test Machine',
    serial_number: 'SN-001',
  };

  const mockMachineAccess: Partial<MachineAccess> = {
    id: 'access-id-1',
    machine_id: 'machine-id-1',
    user_id: 'user-id-1',
    role: MachineAccessRole.OPERATOR,
    created_by_id: 'admin-id',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockTemplate: Partial<AccessTemplate> = {
    id: 'template-id-1',
    name: 'Test Template',
    description: 'Test template description',
    created_by_id: 'admin-id',
    rows: [],
  };

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    } as any;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineAccessService,
        {
          provide: getRepositoryToken(MachineAccess),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AccessTemplate),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AccessTemplateRow),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<MachineAccessService>(MachineAccessService);
    machineAccessRepository = module.get(getRepositoryToken(MachineAccess));
    templateRepository = module.get(getRepositoryToken(AccessTemplate));
    templateRowRepository = module.get(getRepositoryToken(AccessTemplateRow));
    machineRepository = module.get(getRepositoryToken(Machine));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByMachine', () => {
    it('should return access entries for a machine', async () => {
      const mockAccessList = [mockMachineAccess];
      machineAccessRepository.find.mockResolvedValue(mockAccessList as MachineAccess[]);

      const result = await service.findByMachine('machine-id-1');

      expect(machineAccessRepository.find).toHaveBeenCalledWith({
        where: { machine_id: 'machine-id-1' },
        relations: ['user', 'created_by'],
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(mockAccessList);
    });
  });

  describe('findByUser', () => {
    it('should return access entries for a user', async () => {
      const mockAccessList = [mockMachineAccess];
      machineAccessRepository.find.mockResolvedValue(mockAccessList as MachineAccess[]);

      const result = await service.findByUser('user-id-1');

      expect(machineAccessRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-id-1' },
        relations: ['machine', 'machine.location'],
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(mockAccessList);
    });
  });

  describe('findOne', () => {
    it('should return access entry by id', async () => {
      machineAccessRepository.findOne.mockResolvedValue(mockMachineAccess as MachineAccess);

      const result = await service.findOne('access-id-1');

      expect(machineAccessRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'access-id-1' },
        relations: ['machine', 'user', 'created_by'],
      });
      expect(result).toEqual(mockMachineAccess);
    });

    it('should throw NotFoundException if access not found', async () => {
      machineAccessRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new access entry', async () => {
      const dto = {
        machine_id: 'machine-id-1',
        user_id: 'user-id-1',
        role: MachineAccessRole.OPERATOR,
      };

      machineAccessRepository.findOne.mockResolvedValue(null);
      machineAccessRepository.create.mockReturnValue(mockMachineAccess as MachineAccess);
      machineAccessRepository.save.mockResolvedValue(mockMachineAccess as MachineAccess);

      const result = await service.create(dto, 'admin-id');

      expect(machineAccessRepository.findOne).toHaveBeenCalledWith({
        where: { machine_id: dto.machine_id, user_id: dto.user_id },
      });
      expect(machineAccessRepository.create).toHaveBeenCalled();
      expect(machineAccessRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockMachineAccess);
    });

    it('should update existing access entry if it exists', async () => {
      const dto = {
        machine_id: 'machine-id-1',
        user_id: 'user-id-1',
        role: MachineAccessRole.ADMIN,
      };

      const existingAccess = { ...mockMachineAccess };
      machineAccessRepository.findOne.mockResolvedValue(existingAccess as MachineAccess);
      machineAccessRepository.save.mockResolvedValue({ ...existingAccess, role: dto.role } as MachineAccess);

      const result = await service.create(dto, 'admin-id');

      expect(existingAccess.role).toBe(dto.role);
      expect(machineAccessRepository.save).toHaveBeenCalledWith(existingAccess);
    });
  });

  describe('update', () => {
    it('should update access role', async () => {
      const dto = { role: MachineAccessRole.MANAGER };
      machineAccessRepository.findOne.mockResolvedValue(mockMachineAccess as MachineAccess);
      machineAccessRepository.save.mockResolvedValue({ ...mockMachineAccess, role: dto.role } as MachineAccess);

      const result = await service.update('access-id-1', dto);

      expect(result.role).toBe(dto.role);
    });
  });

  describe('remove', () => {
    it('should remove access entry', async () => {
      machineAccessRepository.findOne.mockResolvedValue(mockMachineAccess as MachineAccess);
      machineAccessRepository.remove.mockResolvedValue(mockMachineAccess as MachineAccess);

      await service.remove('access-id-1');

      expect(machineAccessRepository.remove).toHaveBeenCalledWith(mockMachineAccess);
    });

    it('should throw NotFoundException if access not found', async () => {
      machineAccessRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasAccess', () => {
    it('should return true if user has access to machine', async () => {
      machineAccessRepository.findOne.mockResolvedValue(mockMachineAccess as MachineAccess);

      const result = await service.hasAccess('user-id-1', 'machine-id-1');

      expect(result).toBe(true);
    });

    it('should return false if user has no access to machine', async () => {
      machineAccessRepository.findOne.mockResolvedValue(null);

      const result = await service.hasAccess('user-id-1', 'machine-id-1');

      expect(result).toBe(false);
    });

    it('should check specific roles if provided', async () => {
      machineAccessRepository.findOne.mockResolvedValue(mockMachineAccess as MachineAccess);

      const resultWithRole = await service.hasAccess('user-id-1', 'machine-id-1', [MachineAccessRole.OPERATOR]);
      const resultWrongRole = await service.hasAccess('user-id-1', 'machine-id-1', [MachineAccessRole.OWNER]);

      expect(resultWithRole).toBe(true);
      expect(resultWrongRole).toBe(false);
    });
  });

  describe('resolveUser', () => {
    it('should find user by UUID', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.resolveUser(uuid);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: uuid } });
      expect(result).toEqual(mockUser);
    });

    it('should find user by email', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null) // Not UUID
        .mockResolvedValueOnce(mockUser as User); // Email

      const result = await service.resolveUser('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(result).toEqual(mockUser);
    });

    it('should find user by username', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(mockUser as User); // Username

      const result = await service.resolveUser('testuser');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.resolveUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('resolveMachine', () => {
    it('should find machine by machine_number', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const result = await service.resolveMachine('M-001');

      expect(machineRepository.findOne).toHaveBeenCalledWith({ where: { machine_number: 'M-001' } });
      expect(result).toEqual(mockMachine);
    });

    it('should find machine by serial_number', async () => {
      machineRepository.findOne
        .mockResolvedValueOnce(null) // Not machine_number
        .mockResolvedValueOnce(mockMachine as Machine); // Serial number

      const result = await service.resolveMachine(undefined, 'SN-001');

      expect(machineRepository.findOne).toHaveBeenCalledWith({ where: { serial_number: 'SN-001' } });
      expect(result).toEqual(mockMachine);
    });
  });

  describe('resolveMachineIds', () => {
    it('should return unique machine IDs from machineIds and machineNumbers', async () => {
      machineRepository.find.mockResolvedValue([
        { id: 'machine-id-2' } as Machine,
        { id: 'machine-id-3' } as Machine,
      ]);

      const result = await service.resolveMachineIds(['M-002', 'M-003'], ['machine-id-1']);

      expect(result).toContain('machine-id-1');
      expect(result).toContain('machine-id-2');
      expect(result).toContain('machine-id-3');
      expect(result.length).toBe(3);
    });

    it('should deduplicate IDs', async () => {
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' } as Machine]);

      const result = await service.resolveMachineIds(['M-001'], ['machine-id-1']);

      expect(result).toEqual(['machine-id-1']);
    });
  });

  describe('Templates', () => {
    describe('findAllTemplates', () => {
      it('should return all templates with relations', async () => {
        templateRepository.find.mockResolvedValue([mockTemplate] as AccessTemplate[]);

        const result = await service.findAllTemplates();

        expect(templateRepository.find).toHaveBeenCalledWith({
          relations: ['created_by', 'rows', 'rows.user'],
          order: { created_at: 'DESC' },
        });
        expect(result).toEqual([mockTemplate]);
      });
    });

    describe('findTemplateById', () => {
      it('should return template by id', async () => {
        templateRepository.findOne.mockResolvedValue(mockTemplate as AccessTemplate);

        const result = await service.findTemplateById('template-id-1');

        expect(result).toEqual(mockTemplate);
      });

      it('should throw NotFoundException if template not found', async () => {
        templateRepository.findOne.mockResolvedValue(null);

        await expect(service.findTemplateById('non-existent')).rejects.toThrow(NotFoundException);
      });
    });

    describe('createTemplate', () => {
      it('should create new template', async () => {
        const dto = { name: 'New Template', description: 'Description' };
        templateRepository.create.mockReturnValue(mockTemplate as AccessTemplate);
        templateRepository.save.mockResolvedValue(mockTemplate as AccessTemplate);

        const result = await service.createTemplate(dto, 'admin-id');

        expect(templateRepository.create).toHaveBeenCalled();
        expect(templateRepository.save).toHaveBeenCalled();
        expect(result).toEqual(mockTemplate);
      });
    });

    describe('deleteTemplate', () => {
      it('should delete template', async () => {
        templateRepository.findOne.mockResolvedValue(mockTemplate as AccessTemplate);
        templateRepository.remove.mockResolvedValue(mockTemplate as AccessTemplate);

        await service.deleteTemplate('template-id-1');

        expect(templateRepository.remove).toHaveBeenCalledWith(mockTemplate);
      });
    });
  });

  describe('bulkAssign', () => {
    it('should throw BadRequestException if no valid machines found', async () => {
      machineRepository.find.mockResolvedValue([]);

      await expect(
        service.bulkAssign(
          { user_id: 'user-id-1', role: MachineAccessRole.OPERATOR, machineNumbers: ['M-999'] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyTemplate', () => {
    it('should throw BadRequestException if template has no rows', async () => {
      templateRepository.findOne.mockResolvedValue({ ...mockTemplate, rows: [] } as AccessTemplate);

      await expect(
        service.applyTemplate('template-id-1', { machineIds: ['machine-id-1'] }, 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
