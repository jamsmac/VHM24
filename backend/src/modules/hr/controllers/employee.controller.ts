import { Controller, Get, Put, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeeService } from '../services/employee.service';
// Note: CreateEmployeeDto and UpdateEmployeeDto are defined but not yet used in routes
import { EmploymentStatus } from '../entities/employee.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('employees')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  async findAll(
    @Query('department_id') departmentId?: string,
    @Query('position_id') positionId?: string,
    @Query('employment_status') employmentStatus?: EmploymentStatus,
  ) {
    return this.employeeService.findAll({
      department_id: departmentId,
      position_id: positionId,
      employment_status: employmentStatus,
    });
  }

  @Get('active')
  async getActiveEmployees() {
    return this.employeeService.getActiveEmployees();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeeService.findOne(id);
  }

  @Get('number/:employeeNumber')
  async findByEmployeeNumber(@Param('employeeNumber') employeeNumber: string) {
    return this.employeeService.findByEmployeeNumber(employeeNumber);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.employeeService.findByUserId(userId);
  }

  @Get('department/:departmentId')
  async getByDepartment(@Param('departmentId', ParseUUIDPipe) departmentId: string) {
    return this.employeeService.getEmployeesByDepartment(departmentId);
  }

  @Get('manager/:managerId')
  async getByManager(@Param('managerId', ParseUUIDPipe) managerId: string) {
    return this.employeeService.getEmployeesByManager(managerId);
  }

  @Put(':id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: EmploymentStatus,
    @Body('termination_date') terminationDate?: Date,
  ) {
    return this.employeeService.updateEmploymentStatus(id, status, terminationDate);
  }
}
