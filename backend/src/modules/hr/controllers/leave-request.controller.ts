import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeaveRequestService } from '../services/leave-request.service';
import { CreateLeaveRequestDto, ApproveLeaveDto, RejectLeaveDto } from '../dto/leave-request.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('leave-requests')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-requests')
export class LeaveRequestController {
  constructor(private readonly leaveService: LeaveRequestService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async create(@Body() dto: CreateLeaveRequestDto) {
    return this.leaveService.createLeaveRequest(dto);
  }

  @Put(':id/approve')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveLeaveDto) {
    return this.leaveService.approveLeave(id, dto.approved_by_id);
  }

  @Put(':id/reject')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectLeaveDto) {
    return this.leaveService.rejectLeave(id, dto.approved_by_id, dto.rejection_reason);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.leaveService.cancelLeave(id);
  }

  @Get('employee/:employeeId')
  async getByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('year') year?: number,
  ) {
    return this.leaveService.getLeavesByEmployee(employeeId, year ? Number(year) : undefined);
  }

  @Get('pending')
  async getPending() {
    return this.leaveService.getPendingLeaves();
  }

  @Get('balance/:employeeId/:year')
  async getBalance(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('year') year: number,
  ) {
    return this.leaveService.getLeaveBalance(employeeId, Number(year));
  }
}
