import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CounterpartyService } from './services/counterparty.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';
import { UpdateCounterpartyDto } from './dto/update-counterparty.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Counterparties')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('counterparties')
export class CounterpartyController {
  constructor(private readonly counterpartyService: CounterpartyService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create counterparty' })
  create(@Body() createCounterpartyDto: CreateCounterpartyDto) {
    return this.counterpartyService.create(createCounterpartyDto);
  }

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
  ) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.counterpartyService.findAll(type, isActiveBool, search);
  }

  @Get('stats')
  getStats() {
    return this.counterpartyService.getStats();
  }

  @Get('location-owners')
  getLocationOwners() {
    return this.counterpartyService.getLocationOwners();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.counterpartyService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update counterparty' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCounterpartyDto: UpdateCounterpartyDto,
  ) {
    return this.counterpartyService.update(id, updateCounterpartyDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete counterparty' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.counterpartyService.remove(id);
  }

  @Post(':id/restore')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Restore counterparty' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.counterpartyService.restore(id);
  }
}
