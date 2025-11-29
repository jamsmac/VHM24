import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchemaRegistryService } from '../engines/schema-registry.service';
import { SchemaDefinition } from '../entities/schema-definition.entity';
import { DomainType } from '../interfaces/common.interface';

describe('SchemaRegistryService', () => {
  let service: SchemaRegistryService;
  let repository: Repository<SchemaDefinition>;

  const mockSchemaDefinition = {
    id: 'test-schema-id',
    domain: DomainType.SALES,
    table_name: 'transactions',
    field_definitions: [
      {
        name: 'sale_date',
        type: 'date',
        required: true,
        synonyms: ['date', 'Date', 'Дата'],
      },
      {
        name: 'amount',
        type: 'number',
        required: true,
        synonyms: ['sum', 'total', 'Сумма'],
        validation: { min: 0, max: 1000000 },
      },
    ],
    relationships: {
      machine_number: {
        table: 'machines',
        field: 'machine_number',
        type: 'string',
      },
    },
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchemaRegistryService,
        {
          provide: getRepositoryToken(SchemaDefinition),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SchemaRegistryService>(SchemaRegistryService);
    repository = module.get<Repository<SchemaDefinition>>(getRepositoryToken(SchemaDefinition));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSchema', () => {
    it('should retrieve schema for domain', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockSchemaDefinition as any);

      const result = await service.getSchema(DomainType.SALES);

      expect(result).toBeDefined();
      expect(result.domain).toBe(DomainType.SALES);
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].name).toBe('sale_date');
      expect(result.relationships).toBeDefined();
    });

    it('should throw error if schema not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getSchema(DomainType.SALES)).rejects.toThrow(
        'Schema for domain "sales" not found',
      );
    });
  });

  describe('findField', () => {
    it('should find exact field match', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockSchemaDefinition as any);

      const result = await service.findField(DomainType.SALES, 'sale_date');

      expect(result).toBeDefined();
      expect(result?.name).toBe('sale_date');
    });

    it('should find field by synonym', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockSchemaDefinition as any);

      const result = await service.findField(DomainType.SALES, 'Дата');

      expect(result).toBeDefined();
      expect(result?.name).toBe('sale_date');
    });

    it('should return null for non-existent field', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockSchemaDefinition as any);

      const result = await service.findField(DomainType.SALES, 'completely_different_field');

      expect(result).toBeNull();
    });
  });

  describe('upsertSchema', () => {
    it('should create new schema if not exists', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockSchemaDefinition as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockSchemaDefinition as any);

      const fields = mockSchemaDefinition.field_definitions as any[];
      const relationships = mockSchemaDefinition.relationships as any;

      const result = await service.upsertSchema(
        DomainType.SALES,
        'transactions',
        fields,
        relationships,
      );

      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update existing schema', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockSchemaDefinition as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockSchemaDefinition as any);

      const fields = mockSchemaDefinition.field_definitions as any[];
      const relationships = mockSchemaDefinition.relationships as any;

      const result = await service.upsertSchema(
        DomainType.SALES,
        'transactions',
        fields,
        relationships,
      );

      expect(repository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update existing schema with new fields and relationships', async () => {
      const existingSchema = { ...mockSchemaDefinition };
      jest.spyOn(repository, 'findOne').mockResolvedValue(existingSchema as any);
      jest.spyOn(repository, 'save').mockResolvedValue(existingSchema as any);

      const newFields = [{ name: 'new_field', type: 'string', required: true }];
      const newRelationships = {
        new_relation: { table: 'new_table', field: 'id', type: 'uuid' },
      };

      await service.upsertSchema(
        DomainType.SALES,
        'transactions',
        newFields as any,
        newRelationships as any,
      );

      expect(repository.save).toHaveBeenCalled();
      // Verify the schema was updated with new values
      expect(existingSchema.field_definitions).toEqual(newFields);
      expect(existingSchema.relationships).toEqual(newRelationships);
    });

    it('should update updated_at timestamp when updating schema', async () => {
      const originalDate = new Date('2025-01-01');
      const existingSchema = { ...mockSchemaDefinition, updated_at: originalDate };
      jest.spyOn(repository, 'findOne').mockResolvedValue(existingSchema as any);
      jest.spyOn(repository, 'save').mockResolvedValue(existingSchema as any);

      await service.upsertSchema(DomainType.SALES, 'transactions', [] as any, {} as any);

      expect(existingSchema.updated_at).not.toEqual(originalDate);
      expect(existingSchema.updated_at.getTime()).toBeGreaterThan(originalDate.getTime());
    });
  });

  describe('getFields', () => {
    it('should return fields for a domain', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockSchemaDefinition as any);

      const result = await service.getFields(DomainType.SALES);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('sale_date');
      expect(result[1].name).toBe('amount');
    });

    it('should throw NotFoundException if schema not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getFields(DomainType.SALES)).rejects.toThrow(
        'Schema for domain "sales" not found',
      );
    });
  });

  describe('getRelationships', () => {
    it('should return relationships for a domain', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockSchemaDefinition as any);

      const result = await service.getRelationships(DomainType.SALES);

      expect(result).toBeDefined();
      expect(result.machine_number).toBeDefined();
      expect(result.machine_number.table).toBe('machines');
      expect(result.machine_number.field).toBe('machine_number');
    });

    it('should return empty object when no relationships defined', async () => {
      const schemaNoRelations = { ...mockSchemaDefinition, relationships: null };
      jest.spyOn(repository, 'findOne').mockResolvedValue(schemaNoRelations as any);

      const result = await service.getRelationships(DomainType.SALES);

      expect(result).toEqual({});
    });

    it('should throw NotFoundException if schema not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getRelationships(DomainType.INVENTORY)).rejects.toThrow(
        'Schema for domain "inventory" not found',
      );
    });
  });

  describe('seedDefaultSchemas', () => {
    it('should seed all default schemas (SALES, INVENTORY, MACHINES)', async () => {
      // Mock findOne to always return null (no existing schemas)
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockImplementation((data: any) => data);
      jest.spyOn(repository, 'save').mockImplementation((data: any) => Promise.resolve(data));

      await service.seedDefaultSchemas();

      // Should call save 3 times (SALES, INVENTORY, MACHINES)
      expect(repository.save).toHaveBeenCalledTimes(3);
    });

    it('should seed SALES domain schema with correct fields', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const savedSchemas: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data: any) => data);
      jest.spyOn(repository, 'save').mockImplementation((data: any) => {
        savedSchemas.push(data);
        return Promise.resolve(data);
      });

      await service.seedDefaultSchemas();

      const salesSchema = savedSchemas.find((s) => s.domain === DomainType.SALES);
      expect(salesSchema).toBeDefined();
      expect(salesSchema.table_name).toBe('transactions');

      // Check SALES fields
      const fields = salesSchema.field_definitions;
      const saleDateField = fields.find((f: any) => f.name === 'sale_date');
      expect(saleDateField).toBeDefined();
      expect(saleDateField.type).toBe('date');
      expect(saleDateField.required).toBe(true);
      expect(saleDateField.synonyms).toContain('Дата');

      const amountField = fields.find((f: any) => f.name === 'amount');
      expect(amountField).toBeDefined();
      expect(amountField.type).toBe('number');
      expect(amountField.validation).toEqual({ min: 0, max: 1000000 });
    });

    it('should seed INVENTORY domain schema with correct fields', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const savedSchemas: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data: any) => data);
      jest.spyOn(repository, 'save').mockImplementation((data: any) => {
        savedSchemas.push(data);
        return Promise.resolve(data);
      });

      await service.seedDefaultSchemas();

      const inventorySchema = savedSchemas.find((s) => s.domain === DomainType.INVENTORY);
      expect(inventorySchema).toBeDefined();
      expect(inventorySchema.table_name).toBe('inventory');

      // Check INVENTORY fields
      const fields = inventorySchema.field_definitions;
      expect(fields.length).toBeGreaterThan(0);

      const machineField = fields.find((f: any) => f.name === 'machine_number');
      expect(machineField).toBeDefined();
      expect(machineField.type).toBe('string');
      expect(machineField.required).toBe(true);

      const quantityField = fields.find((f: any) => f.name === 'quantity');
      expect(quantityField).toBeDefined();
      expect(quantityField.validation).toEqual({ min: 0 });
    });

    it('should seed MACHINES domain schema with correct fields', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const savedSchemas: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data: any) => data);
      jest.spyOn(repository, 'save').mockImplementation((data: any) => {
        savedSchemas.push(data);
        return Promise.resolve(data);
      });

      await service.seedDefaultSchemas();

      const machinesSchema = savedSchemas.find((s) => s.domain === DomainType.MACHINES);
      expect(machinesSchema).toBeDefined();
      expect(machinesSchema.table_name).toBe('machines');

      // Check MACHINES fields
      const fields = machinesSchema.field_definitions;
      const statusField = fields.find((f: any) => f.name === 'status');
      expect(statusField).toBeDefined();
      expect(statusField.type).toBe('enum');
      expect(statusField.defaultValue).toBe('active');
      expect(statusField.validation.enum).toContain('active');
      expect(statusField.validation.enum).toContain('maintenance');
    });

    it('should update existing schemas during seed', async () => {
      // Mock findOne to return existing schema
      const existingSchema = { ...mockSchemaDefinition };
      jest.spyOn(repository, 'findOne').mockResolvedValue(existingSchema as any);
      jest.spyOn(repository, 'save').mockResolvedValue(existingSchema as any);

      await service.seedDefaultSchemas();

      // Should still call save 3 times (updates instead of creates)
      expect(repository.save).toHaveBeenCalledTimes(3);
    });

    it('should seed relationships for SALES domain', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const savedSchemas: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data: any) => data);
      jest.spyOn(repository, 'save').mockImplementation((data: any) => {
        savedSchemas.push(data);
        return Promise.resolve(data);
      });

      await service.seedDefaultSchemas();

      const salesSchema = savedSchemas.find((s) => s.domain === DomainType.SALES);
      expect(salesSchema.relationships).toBeDefined();
      expect(salesSchema.relationships.machine_number).toBeDefined();
      expect(salesSchema.relationships.machine_number.table).toBe('machines');
      expect(salesSchema.relationships.product_name).toBeDefined();
      expect(salesSchema.relationships.product_name.table).toBe('nomenclature');
    });

    it('should seed relationships for INVENTORY domain', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const savedSchemas: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data: any) => data);
      jest.spyOn(repository, 'save').mockImplementation((data: any) => {
        savedSchemas.push(data);
        return Promise.resolve(data);
      });

      await service.seedDefaultSchemas();

      const inventorySchema = savedSchemas.find((s) => s.domain === DomainType.INVENTORY);
      expect(inventorySchema.relationships).toBeDefined();
      expect(inventorySchema.relationships.machine_number.table).toBe('machines');
      expect(inventorySchema.relationships.product_name.table).toBe('nomenclature');
    });

    it('should seed relationships for MACHINES domain', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const savedSchemas: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data: any) => data);
      jest.spyOn(repository, 'save').mockImplementation((data: any) => {
        savedSchemas.push(data);
        return Promise.resolve(data);
      });

      await service.seedDefaultSchemas();

      const machinesSchema = savedSchemas.find((s) => s.domain === DomainType.MACHINES);
      expect(machinesSchema.relationships).toBeDefined();
      expect(machinesSchema.relationships.location.table).toBe('locations');
    });

    it('should include all required field synonyms for multilingual support', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const savedSchemas: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data: any) => data);
      jest.spyOn(repository, 'save').mockImplementation((data: any) => {
        savedSchemas.push(data);
        return Promise.resolve(data);
      });

      await service.seedDefaultSchemas();

      const salesSchema = savedSchemas.find((s) => s.domain === DomainType.SALES);
      const fields = salesSchema.field_definitions;

      // Check that Russian synonyms are included
      const saleDateField = fields.find((f: any) => f.name === 'sale_date');
      expect(saleDateField.synonyms).toContain('дата');

      const machineField = fields.find((f: any) => f.name === 'machine_number');
      expect(machineField.synonyms).toContain('аппарат');

      const amountField = fields.find((f: any) => f.name === 'amount');
      expect(amountField.synonyms).toContain('сумма');
    });

    it('should set correct default values for optional fields', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const savedSchemas: any[] = [];
      jest.spyOn(repository, 'create').mockImplementation((data: any) => data);
      jest.spyOn(repository, 'save').mockImplementation((data: any) => {
        savedSchemas.push(data);
        return Promise.resolve(data);
      });

      await service.seedDefaultSchemas();

      const salesSchema = savedSchemas.find((s) => s.domain === DomainType.SALES);
      const fields = salesSchema.field_definitions;

      const paymentMethodField = fields.find((f: any) => f.name === 'payment_method');
      expect(paymentMethodField.defaultValue).toBe('cash');
      expect(paymentMethodField.required).toBe(false);

      const quantityField = fields.find((f: any) => f.name === 'quantity');
      expect(quantityField.defaultValue).toBe(1);
    });
  });
});
