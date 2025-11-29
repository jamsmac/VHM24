import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from '../services/attendance.service';
import { CheckInDto, CheckOutDto, MarkAbsentDto } from '../dto/attendance.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';

@ApiTags('attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  async checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto);
  }

  @Post('check-out')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  async checkOut(@Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(dto.employee_id, dto.date);
  }

  @Post('mark-absent')
  @Roles('ADMIN', 'MANAGER', 'SUPER_ADMIN')
  async markAbsent(@Body() dto: MarkAbsentDto) {
    return this.attendanceService.markAbsent(dto.employee_id, dto.date, dto.notes);
  }

  @Get('employee/:employeeId')
  async getByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.attendanceService.getAttendanceByEmployee(
      employeeId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('date/:date')
  async getByDate(@Param('date') date: string) {
    return this.attendanceService.getAttendanceByDate(new Date(date));
  }

  @Get('summary/:employeeId/:month')
  async getSummary(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('month') month: string,
  ) {
    return this.attendanceService.getAttendanceSummary(employeeId, month);
  }
}
