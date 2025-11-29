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
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContractService } from './services/contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractStatus } from './entities/contract.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Contracts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create contract' })
  create(@Body() createContractDto: CreateContractDto) {
    return this.contractService.create(createContractDto);
  }

  @Get()
  findAll(
    @Query('counterparty_id') counterpartyId?: string,
    @Query('status') status?: ContractStatus,
    @Query('active_only') activeOnly?: string,
  ) {
    const activeOnlyBool = activeOnly === 'true';
    return this.contractService.findAll(counterpartyId, status, activeOnlyBool);
  }

  @Get('stats')
  getStats() {
    return this.contractService.getStats();
  }

  @Get('expiring')
  getExpiringContracts(@Query('within_days', ParseIntPipe) withinDays: number = 30) {
    return this.contractService.getExpiringContracts(withinDays);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update contract' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateContractDto: UpdateContractDto) {
    return this.contractService.update(id, updateContractDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Change contract status' })
  changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: ContractStatus) {
    return this.contractService.changeStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete contract' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractService.remove(id);
  }
}
