import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsInt,
  Length,
  Matches,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum CounterpartyType {
  CLIENT = 'client',
  SUPPLIER = 'supplier',
  PARTNER = 'partner',
  LOCATION_OWNER = 'location_owner',
}

/**
 * DTO for creating a new counterparty
 * Validates Uzbekistan-specific requirements
 */
export class CreateCounterpartyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string; // Название организации

  @IsOptional()
  @IsString()
  @MaxLength(50)
  short_name?: string; // Краткое название

  @IsEnum(CounterpartyType)
  type: CounterpartyType; // Тип контрагента

  // Uzbekistan tax identifiers
  @IsString()
  @Length(9, 9, { message: 'ИНН должен содержать ровно 9 цифр' })
  @Matches(/^[0-9]{9}$/, { message: 'ИНН должен состоять только из 9 цифр' })
  inn: string; // ИНН: 9 цифр (Узбекистан)

  @IsOptional()
  @IsString()
  @MaxLength(20)
  oked?: string; // ОКЭД

  // Banking details
  @IsOptional()
  @IsString()
  @Length(5, 5, { message: 'МФО должен содержать ровно 5 цифр' })
  @Matches(/^[0-9]{5}$/, { message: 'МФО должен состоять только из 5 цифр' })
  mfo?: string; // МФО: 5 цифр

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bank_account?: string; // Расчетный счет

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bank_name?: string; // Название банка

  // Addresses
  @IsOptional()
  @IsString()
  legal_address?: string; // Юридический адрес

  @IsOptional()
  @IsString()
  actual_address?: string; // Фактический адрес

  // Contact information
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contact_person?: string; // Контактное лицо

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[\d\s()+\-]+$/, { message: 'Некорректный формат телефона' })
  phone?: string; // Телефон

  @IsOptional()
  @IsEmail({}, { message: 'Некорректный формат email' })
  @MaxLength(100)
  email?: string; // Email

  // Director information
  @IsOptional()
  @IsString()
  @MaxLength(255)
  director_name?: string; // ФИО директора

  @IsOptional()
  @IsString()
  @MaxLength(255)
  director_position?: string; // Должность директора

  // VAT registration
  @IsOptional()
  @IsBoolean()
  is_vat_payer?: boolean; // Плательщик НДС

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vat_rate?: number; // Ставка НДС (обычно 15% в Узбекистане)

  // Payment terms
  @IsOptional()
  @IsInt()
  @Min(0)
  payment_term_days?: number; // Срок оплаты (дней)

  @IsOptional()
  @IsNumber()
  @Min(0)
  credit_limit?: number; // Кредитный лимит (UZS)

  // Status
  @IsOptional()
  @IsBoolean()
  is_active?: boolean; // Активен

  @IsOptional()
  @IsString()
  notes?: string; // Примечания
}
