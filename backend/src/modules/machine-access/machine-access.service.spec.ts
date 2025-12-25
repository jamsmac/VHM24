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
  };

  const mockTemplate: Partial<AccessTemplate> = {
    id: 'template-id-1',
    name: 'Test Template',
    description: 'Test template description',
    created_by_id: 'admin-id',
    rows: [],
  };

  const mockQueryRunnerManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockQueryRunnerManager,
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
    jest.resetAllMocks();
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

      await service.create(dto, 'admin-id');

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
      // Mock returns access with OPERATOR role
      const accessWithRole = { ...mockMachineAccess, role: MachineAccessRole.OPERATOR };
      machineAccessRepository.findOne.mockResolvedValue(accessWithRole as MachineAccess);

      // Test matching role - should return true
      const resultWithRole = await service.hasAccess('user-id-1', 'machine-id-1', [MachineAccessRole.OPERATOR]);
      expect(resultWithRole).toBe(true);

      // Reset mock for next assertion
      machineAccessRepository.findOne.mockResolvedValue(accessWithRole as MachineAccess);

      // Test non-matching role - should return false
      const resultWrongRole = await service.hasAccess('user-id-1', 'machine-id-1', [MachineAccessRole.OWNER]);
      expect(resultWrongRole).toBe(false);
    });
  });

  describe('resolveUser', () => {
    it('should find user by UUID and return immediately', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.resolveUser(uuid);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: uuid } });
      expect(userRepository.findOne).toHaveBeenCalledTimes(1); // Should not try other lookups
      expect(result).toEqual(mockUser);
    });

    it('should try email if UUID not found', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      userRepository.findOne.mockResolvedValueOnce(null); // UUID lookup fails

      const result = await service.resolveUser(uuid);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: uuid } });
      expect(result).toBeNull();
    });

    it('should find user by email and return immediately', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.resolveUser('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
    });

    it('should try username if email not found', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null) // email lookup fails
        .mockResolvedValueOnce(mockUser as User); // username lookup succeeds

      const result = await service.resolveUser('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should find user by username', async () => {
      userRepository.findOne.mockResolvedValueOnce(mockUser as User);

      const result = await service.resolveUser('testuser');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found by any method', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.resolveUser('nonexistent');

      expect(result).toBeNull();
    });

    it('should find user by telegram_username as fallback', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null) // username lookup fails
        .mockResolvedValueOnce(mockUser as User); // telegram_username lookup succeeds

      const result = await service.resolveUser('tguser');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { username: 'tguser' } });
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { telegram_username: 'tguser' } });
      expect(result).toEqual(mockUser);
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
      // When machineNumber is undefined, only the serial_number lookup is performed
      machineRepository.findOne.mockResolvedValue(mockMachine as Machine);

      const result = await service.resolveMachine(undefined, 'SN-001');

      expect(machineRepository.findOne).toHaveBeenCalledWith({ where: { serial_number: 'SN-001' } });
      expect(result).toEqual(mockMachine);
    });

    it('should return null when no parameters provided', async () => {
      const result = await service.resolveMachine(undefined, undefined);

      expect(result).toBeNull();
    });

    it('should fallback to serial_number if machine_number not found', async () => {
      machineRepository.findOne
        .mockResolvedValueOnce(null) // machine_number lookup fails
        .mockResolvedValueOnce(mockMachine as Machine); // serial_number lookup succeeds

      const result = await service.resolveMachine('M-999', 'SN-001');

      expect(machineRepository.findOne).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockMachine);
    });

    it('should return null if serial_number not found either', async () => {
      machineRepository.findOne
        .mockResolvedValueOnce(null) // machine_number lookup fails
        .mockResolvedValueOnce(null); // serial_number lookup also fails

      const result = await service.resolveMachine('M-999', 'SN-999');

      expect(machineRepository.findOne).toHaveBeenCalledTimes(2);
      expect(result).toBeNull();
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

    describe('updateTemplate', () => {
      it('should update template name and description', async () => {
        const dto = { name: 'Updated Template', description: 'Updated description' };
        templateRepository.findOne.mockResolvedValue(mockTemplate as AccessTemplate);
        templateRepository.save.mockResolvedValue({ ...mockTemplate, ...dto } as AccessTemplate);

        const result = await service.updateTemplate('template-id-1', dto);

        expect(templateRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'template-id-1' },
          relations: ['created_by', 'rows', 'rows.user'],
        });
        expect(templateRepository.save).toHaveBeenCalled();
        expect(result.name).toBe('Updated Template');
      });
    });

    describe('addTemplateRow', () => {
      it('should add new row to template', async () => {
        const dto = { user_id: 'user-id-1', role: MachineAccessRole.OPERATOR };
        const newRow = { id: 'row-id-1', template_id: 'template-id-1', ...dto };
        templateRepository.findOne.mockResolvedValue(mockTemplate as AccessTemplate);
        templateRowRepository.findOne.mockResolvedValue(null);
        templateRowRepository.create.mockReturnValue(newRow as AccessTemplateRow);
        templateRowRepository.save.mockResolvedValue(newRow as AccessTemplateRow);

        const result = await service.addTemplateRow('template-id-1', dto);

        expect(templateRepository.findOne).toHaveBeenCalled();
        expect(templateRowRepository.findOne).toHaveBeenCalledWith({
          where: { template_id: 'template-id-1', user_id: 'user-id-1' },
        });
        expect(templateRowRepository.create).toHaveBeenCalledWith({
          template_id: 'template-id-1',
          ...dto,
        });
        expect(result).toEqual(newRow);
      });

      it('should update existing row if it exists', async () => {
        const dto = { user_id: 'user-id-1', role: MachineAccessRole.ADMIN };
        const existingRow = { id: 'row-id-1', template_id: 'template-id-1', user_id: 'user-id-1', role: MachineAccessRole.OPERATOR };
        templateRepository.findOne.mockResolvedValue(mockTemplate as AccessTemplate);
        templateRowRepository.findOne.mockResolvedValue(existingRow as AccessTemplateRow);
        templateRowRepository.save.mockResolvedValue({ ...existingRow, role: dto.role } as AccessTemplateRow);

        await service.addTemplateRow('template-id-1', dto);

        expect(existingRow.role).toBe(MachineAccessRole.ADMIN);
        expect(templateRowRepository.save).toHaveBeenCalledWith(existingRow);
      });
    });

    describe('removeTemplateRow', () => {
      it('should remove row from template', async () => {
        const row = { id: 'row-id-1', template_id: 'template-id-1' };
        templateRowRepository.findOne.mockResolvedValue(row as AccessTemplateRow);
        templateRowRepository.remove.mockResolvedValue(row as AccessTemplateRow);

        await service.removeTemplateRow('template-id-1', 'row-id-1');

        expect(templateRowRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'row-id-1', template_id: 'template-id-1' },
        });
        expect(templateRowRepository.remove).toHaveBeenCalledWith(row);
      });

      it('should throw NotFoundException if row not found', async () => {
        templateRowRepository.findOne.mockResolvedValue(null);

        await expect(service.removeTemplateRow('template-id-1', 'non-existent')).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('assignOwnerToAllMachines', () => {
    it('should assign owner to all machines for new entries', async () => {
      const machines = [{ id: 'machine-id-1' }, { id: 'machine-id-2' }];
      machineRepository.find.mockResolvedValue(machines as Machine[]);
      mockQueryRunnerManager.findOne.mockResolvedValue(null); // No existing access
      mockQueryRunnerManager.create.mockReturnValue({ id: 'new-access' });
      mockQueryRunnerManager.save.mockResolvedValue({ id: 'new-access' });

      const result = await service.assignOwnerToAllMachines('user-id-1', 'admin-id');

      expect(machineRepository.find).toHaveBeenCalledWith({ select: ['id'] });
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({ applied: 2, updated: 0 });
    });

    it('should update existing access entries to owner role', async () => {
      const machines = [{ id: 'machine-id-1' }];
      machineRepository.find.mockResolvedValue(machines as Machine[]);
      const existingAccess = { id: 'access-1', role: MachineAccessRole.OPERATOR };
      mockQueryRunnerManager.findOne.mockResolvedValue(existingAccess);
      mockQueryRunnerManager.save.mockResolvedValue({ ...existingAccess, role: MachineAccessRole.OWNER });

      const result = await service.assignOwnerToAllMachines('user-id-1', 'admin-id');

      expect(existingAccess.role).toBe(MachineAccessRole.OWNER);
      expect(result).toEqual({ applied: 0, updated: 1 });
    });

    it('should not update if already owner', async () => {
      const machines = [{ id: 'machine-id-1' }];
      machineRepository.find.mockResolvedValue(machines as Machine[]);
      const existingAccess = { id: 'access-1', role: MachineAccessRole.OWNER };
      mockQueryRunnerManager.findOne.mockResolvedValue(existingAccess);

      const result = await service.assignOwnerToAllMachines('user-id-1', 'admin-id');

      expect(mockQueryRunnerManager.save).not.toHaveBeenCalled();
      expect(result).toEqual({ applied: 0, updated: 0 });
    });

    it('should rollback transaction on error', async () => {
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }] as Machine[]);
      mockQueryRunnerManager.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.assignOwnerToAllMachines('user-id-1', 'admin-id')).rejects.toThrow('Database error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
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

    it('should bulk assign access to multiple machines', async () => {
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }, { id: 'machine-id-2' }] as Machine[]);
      mockQueryRunnerManager.findOne.mockResolvedValue(null);
      mockQueryRunnerManager.create.mockReturnValue({ id: 'new-access' });
      mockQueryRunnerManager.save.mockResolvedValue({ id: 'new-access' });

      const result = await service.bulkAssign(
        { user_id: 'user-id-1', role: MachineAccessRole.OPERATOR, machineNumbers: ['M-001', 'M-002'] },
        'admin-id',
      );

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({ applied: 2, updated: 0 });
    });

    it('should update existing access entries with new role', async () => {
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }] as Machine[]);
      const existingAccess = { id: 'access-1', role: MachineAccessRole.VIEWER };
      mockQueryRunnerManager.findOne.mockResolvedValue(existingAccess);
      mockQueryRunnerManager.save.mockResolvedValue({ ...existingAccess, role: MachineAccessRole.OPERATOR });

      const result = await service.bulkAssign(
        { user_id: 'user-id-1', role: MachineAccessRole.OPERATOR, machineNumbers: ['M-001'] },
        'admin-id',
      );

      expect(existingAccess.role).toBe(MachineAccessRole.OPERATOR);
      expect(result).toEqual({ applied: 0, updated: 1 });
    });

    it('should not update if role is the same', async () => {
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }] as Machine[]);
      const existingAccess = { id: 'access-1', role: MachineAccessRole.OPERATOR };
      mockQueryRunnerManager.findOne.mockResolvedValue(existingAccess);

      const result = await service.bulkAssign(
        { user_id: 'user-id-1', role: MachineAccessRole.OPERATOR, machineNumbers: ['M-001'] },
        'admin-id',
      );

      expect(mockQueryRunnerManager.save).not.toHaveBeenCalled();
      expect(result).toEqual({ applied: 0, updated: 0 });
    });

    it('should rollback transaction on error', async () => {
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }] as Machine[]);
      mockQueryRunnerManager.findOne.mockRejectedValue(new Error('Transaction error'));

      await expect(
        service.bulkAssign(
          { user_id: 'user-id-1', role: MachineAccessRole.OPERATOR, machineIds: ['machine-id-1'] },
          'admin-id',
        ),
      ).rejects.toThrow('Transaction error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('applyTemplate', () => {
    const mockTemplateWithRows: Partial<AccessTemplate> = {
      id: 'template-id-1',
      name: 'Test Template',
      description: 'Test template description',
      created_by_id: 'admin-id',
      rows: [
        { id: 'row-1', user_id: 'user-id-1', role: MachineAccessRole.OPERATOR } as AccessTemplateRow,
        { id: 'row-2', user_id: 'user-id-2', role: MachineAccessRole.TECHNICIAN } as AccessTemplateRow,
      ],
    };

    it('should throw BadRequestException if template has no rows', async () => {
      templateRepository.findOne.mockResolvedValue({ ...mockTemplate, rows: [] } as AccessTemplate);

      await expect(
        service.applyTemplate('template-id-1', { machineIds: ['machine-id-1'] }, 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no valid machines found', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplateWithRows as AccessTemplate);
      machineRepository.find.mockResolvedValue([]);

      await expect(
        service.applyTemplate('template-id-1', { machineNumbers: ['M-999'] }, 'admin-id'),
      ).rejects.toThrow('No valid machines found');
    });

    it('should apply template to machines and create new access entries', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplateWithRows as AccessTemplate);
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }] as Machine[]);
      mockQueryRunnerManager.findOne.mockResolvedValue(null); // No existing access
      mockQueryRunnerManager.create.mockReturnValue({ id: 'new-access' });
      mockQueryRunnerManager.save.mockResolvedValue({ id: 'new-access' });

      const result = await service.applyTemplate('template-id-1', { machineNumbers: ['M-001'] }, 'admin-id');

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({
        applied_count: 2,
        updated_count: 0,
        machines_processed: 1,
        errors: [],
      });
    });

    it('should update existing access entries with different role', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplateWithRows as AccessTemplate);
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }] as Machine[]);
      const existingAccess = { id: 'access-1', role: MachineAccessRole.VIEWER };
      mockQueryRunnerManager.findOne.mockResolvedValue(existingAccess);
      mockQueryRunnerManager.save.mockResolvedValue({ ...existingAccess, role: MachineAccessRole.OPERATOR });

      const result = await service.applyTemplate('template-id-1', { machineIds: ['machine-id-1'] }, 'admin-id');

      expect(result.updated_count).toBe(2);
      expect(result.applied_count).toBe(0);
    });

    it('should not update if role is the same', async () => {
      const templateWithSingleRow: Partial<AccessTemplate> = {
        ...mockTemplateWithRows,
        rows: [{ id: 'row-1', user_id: 'user-id-1', role: MachineAccessRole.OPERATOR } as AccessTemplateRow],
      };
      templateRepository.findOne.mockResolvedValue(templateWithSingleRow as AccessTemplate);
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }] as Machine[]);
      const existingAccess = { id: 'access-1', role: MachineAccessRole.OPERATOR };
      mockQueryRunnerManager.findOne.mockResolvedValue(existingAccess);

      const result = await service.applyTemplate('template-id-1', { machineIds: ['machine-id-1'] }, 'admin-id');

      expect(result.updated_count).toBe(0);
      expect(result.applied_count).toBe(0);
    });

    it('should collect errors for individual row failures without failing entire operation', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplateWithRows as AccessTemplate);
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }] as Machine[]);
      mockQueryRunnerManager.findOne
        .mockRejectedValueOnce(new Error('Database constraint error'))
        .mockResolvedValueOnce(null); // Second row succeeds
      mockQueryRunnerManager.create.mockReturnValue({ id: 'new-access' });
      mockQueryRunnerManager.save.mockResolvedValue({ id: 'new-access' });

      const result = await service.applyTemplate('template-id-1', { machineIds: ['machine-id-1'] }, 'admin-id');

      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('Database constraint error');
      expect(result.applied_count).toBe(1);
    });

    it('should rollback transaction on critical error', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplateWithRows as AccessTemplate);
      machineRepository.find.mockResolvedValue([{ id: 'machine-id-1' }] as Machine[]);
      mockQueryRunnerManager.findOne.mockResolvedValue(null);
      mockQueryRunnerManager.create.mockReturnValue({ id: 'new-access' });
      mockQueryRunnerManager.save.mockResolvedValue({ id: 'new-access' });
      (queryRunner.commitTransaction as jest.Mock).mockRejectedValue(new Error('Commit failed'));

      await expect(
        service.applyTemplate('template-id-1', { machineIds: ['machine-id-1'] }, 'admin-id'),
      ).rejects.toThrow('Commit failed');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});
