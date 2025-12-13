import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO для создания поставщика.
 */
export class CreateSupplierDto {
  @ApiProperty({ example: 'ООО Кофе Мастер', description: 'Название поставщика' })
  @IsString()
  @MinLength(2, { message: 'Название должно быть минимум 2 символа' })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: '+998901234567', description: 'Телефон' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'supplier@email.com', description: 'Email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '123456789', description: 'Telegram ID для уведомлений' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegram_id?: string;

  @ApiPropertyOptional({ example: '@coffemaster', description: 'Telegram username' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  telegram_username?: string;

  @ApiPropertyOptional({ example: 'ул. Чиланзар, 15', description: 'Адрес' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Контактное лицо: Алишер', description: 'Заметки' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: ['ingredients', 'consumables'],
    description: 'Категории товаров',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ default: true, description: 'Активен ли поставщик' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
