import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { Employee } from './entities/employee.entity';
import { Attendance } from './entities/attendance.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { Payroll } from './entities/payroll.entity';
import { PerformanceReview } from './entities/performance-review.entity';

// Services
import { EmployeeService } from './services/employee.service';
import { AttendanceService } from './services/attendance.service';
import { LeaveRequestService } from './services/leave-request.service';
import { PayrollService } from './services/payroll.service';

// Controllers
import { EmployeeController } from './controllers/employee.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { LeaveRequestController } from './controllers/leave-request.controller';
import { PayrollController } from './controllers/payroll.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Department,
      Position,
      Employee,
      Attendance,
      LeaveRequest,
      Payroll,
      PerformanceReview,
    ]),
  ],
  controllers: [
    EmployeeController,
    AttendanceController,
    LeaveRequestController,
    PayrollController,
  ],
  providers: [EmployeeService, AttendanceService, LeaveRequestService, PayrollService],
  exports: [EmployeeService, AttendanceService, LeaveRequestService, PayrollService],
})
export class HrModule {}
