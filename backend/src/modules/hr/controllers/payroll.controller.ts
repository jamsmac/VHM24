import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from '../services/payroll.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('payroll')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('calculate')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async calculate(
    @Body('employee_id') employeeId: string,
    @Body('period') period: string,
    @Body('base_salary') baseSalary: number,
  ) {
    return this.payrollService.calculatePayroll(employeeId, period, baseSalary);
  }

  @Put(':id/approve')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.approvePayroll(id);
  }

  @Put(':id/pay')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async markAsPaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.markAsPaid(id);
  }

  @Get('employee/:employeeId')
  async getByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('year') year?: number,
  ) {
    return this.payrollService.getPayrollByEmployee(employeeId, year ? Number(year) : undefined);
  }

  @Get('period/:period')
  async getByPeriod(@Param('period') period: string) {
    return this.payrollService.getPayrollByPeriod(period);
  }

  @Get('cost/:period')
  async getTotalCost(@Param('period') period: string) {
    return this.payrollService.getTotalPayrollCost(period);
  }
}
