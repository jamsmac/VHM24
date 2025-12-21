# HR (Human Resources) Module

## Overview

The HR module manages employee information, attendance tracking, leave requests, and payroll for VendHub Manager. It provides comprehensive workforce management capabilities.

## Key Features

- Employee management with full profiles
- Department and position hierarchy
- Attendance tracking with geolocation
- Leave request workflow
- Payroll calculation
- Performance reviews
- Manager hierarchy

## Entities

### Employee

**File**: `backend/src/modules/hr/entities/employee.entity.ts`

```typescript
@Entity('employees')
export class Employee extends BaseEntity {
  // Link to system user
  user_id: string;                 // Reference to users table

  // Identification
  employee_number: string;         // Unique employee ID (e.g., "EMP-001")
  first_name: string;
  last_name: string;
  middle_name: string;

  // Contact
  email: string;
  phone: string;

  // Personal
  date_of_birth: Date;
  gender: string;
  address: string;

  // Organization
  department_id: string;           // Department reference
  position_id: string;             // Position reference
  manager_id: string;              // Direct manager (Employee)

  // Employment
  employment_type: EmploymentType;
  employment_status: EmploymentStatus;
  hire_date: Date;
  termination_date: Date;

  // Compensation
  base_salary: number;             // Base salary amount
  salary_period: string;           // monthly, hourly, daily

  // Banking
  bank_account: string;
  tax_id: string;                  // Tax identification

  // Emergency Contact
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
  };

  // Skills & Education
  metadata: {
    education: string;
    certifications: string[];
    skills: string[];
    languages: string[];
  };
}
```

### Employment Types

| Type | Value | Description |
|------|-------|-------------|
| Full-Time | `full_time` | Standard full-time employment |
| Part-Time | `part_time` | Reduced hours |
| Contract | `contract` | Fixed-term contract |
| Intern | `intern` | Internship |
| Temporary | `temporary` | Temporary position |

### Employment Statuses

| Status | Value | Description |
|--------|-------|-------------|
| Active | `active` | Currently employed |
| On Leave | `on_leave` | On approved leave |
| Suspended | `suspended` | Employment suspended |
| Terminated | `terminated` | Employment terminated |
| Resigned | `resigned` | Voluntarily resigned |

### Department

```typescript
@Entity('departments')
export class Department extends BaseEntity {
  name: string;                    // Department name
  code: string;                    // Short code (e.g., "OPS")
  description: string;
  head_id: string;                 // Department head (Employee)
  parent_id: string;               // Parent department (for hierarchy)
  is_active: boolean;
}
```

### Position

```typescript
@Entity('positions')
export class Position extends BaseEntity {
  title: string;                   // Position title
  code: string;                    // Short code
  department_id: string;           // Primary department
  level: number;                   // Hierarchy level (1=entry, 5=executive)
  min_salary: number;              // Salary range minimum
  max_salary: number;              // Salary range maximum
  job_description: string;
  requirements: string[];          // Required qualifications
  is_active: boolean;
}
```

### Attendance

**File**: `backend/src/modules/hr/entities/attendance.entity.ts`

```typescript
@Entity('attendances')
export class Attendance extends BaseEntity {
  employee_id: string;             // Employee reference
  date: Date;                      // Attendance date

  // Time Tracking
  check_in: Date;                  // Check-in timestamp
  check_out: Date;                 // Check-out timestamp
  total_hours: number;             // Total hours (in minutes)
  overtime_hours: number;          // Overtime (in minutes)
  break_duration: number;          // Break time (in minutes)

  // Status
  status: AttendanceStatus;

  // Notes
  notes: string;
  location: string;                // Work location

  // Metadata
  metadata: {
    ip_address: string;
    device: string;
    geo_coordinates: { lat: number; lng: number };
  };
}
```

### Attendance Statuses

| Status | Value | Description |
|--------|-------|-------------|
| Present | `present` | Normal attendance |
| Absent | `absent` | Unexcused absence |
| Late | `late` | Arrived late |
| Half Day | `half_day` | Worked half day |
| On Leave | `on_leave` | On approved leave |

### Leave Request

**File**: `backend/src/modules/hr/entities/leave-request.entity.ts`

```typescript
@Entity('leave_requests')
export class LeaveRequest extends BaseEntity {
  employee_id: string;             // Employee reference
  leave_type: LeaveType;           // Type of leave
  start_date: Date;
  end_date: Date;
  total_days: number;              // Including weekends if applicable
  reason: string;                  // Leave reason

  // Approval
  status: LeaveStatus;
  approved_by_id: string;          // Approver (usually manager)
  approved_at: Date;
  rejection_reason: string;

  // Metadata
  metadata: {
    attachments: string[];         // Medical certificates, etc.
    handover_notes: string;        // Work handover instructions
  };
}
```

### Leave Types

| Type | Value | Description |
|------|-------|-------------|
| Annual | `annual` | Paid vacation |
| Sick | `sick` | Medical leave |
| Maternity | `maternity` | Maternity leave |
| Paternity | `paternity` | Paternity leave |
| Unpaid | `unpaid` | Leave without pay |
| Emergency | `emergency` | Emergency leave |
| Study | `study` | Educational leave |
| Compensatory | `compensatory` | Time off for overtime |

### Leave Statuses

```
┌─────────┐     ┌──────────┐
│ PENDING │────>│ APPROVED │
└─────────┘     └──────────┘
      │
      ▼
┌──────────┐     ┌───────────┐
│ REJECTED │     │ CANCELLED │
└──────────┘     └───────────┘
```

### Payroll

**File**: `backend/src/modules/hr/entities/payroll.entity.ts`

```typescript
@Entity('payrolls')
export class Payroll extends BaseEntity {
  employee_id: string;             // Employee reference
  period: string;                  // Format: YYYY-MM
  pay_date: Date;                  // Payment date

  // Earnings
  base_salary: number;
  overtime_pay: number;
  bonuses: number;
  allowances: number;

  // Deductions
  deductions: number;
  tax: number;

  // Final
  net_salary: number;              // Take-home pay

  // Time Tracking
  working_days: number;            // Days worked
  absent_days: number;
  overtime_hours: number;

  // Status
  status: PayrollStatus;
  notes: string;

  // Detailed Breakdown
  metadata: {
    breakdown: { allowance_type: string; amount: number }[];
    deduction_breakdown: { deduction_type: string; amount: number }[];
  };
}
```

### Payroll Statuses

| Status | Value | Description |
|--------|-------|-------------|
| Draft | `draft` | Being prepared |
| Calculated | `calculated` | Amounts calculated |
| Approved | `approved` | Approved for payment |
| Paid | `paid` | Payment completed |
| Cancelled | `cancelled` | Cancelled |

## API Endpoints

### Employees

```
POST   /api/hr/employees           Create employee
GET    /api/hr/employees           List employees
GET    /api/hr/employees/:id       Get employee
PUT    /api/hr/employees/:id       Update employee
DELETE /api/hr/employees/:id       Delete employee
GET    /api/hr/employees/:id/attendance  Get employee attendance
```

### Departments

```
POST   /api/hr/departments         Create department
GET    /api/hr/departments         List departments
GET    /api/hr/departments/:id     Get department
PUT    /api/hr/departments/:id     Update department
DELETE /api/hr/departments/:id     Delete department
```

### Positions

```
POST   /api/hr/positions           Create position
GET    /api/hr/positions           List positions
GET    /api/hr/positions/:id       Get position
PUT    /api/hr/positions/:id       Update position
```

### Attendance

```
POST   /api/hr/attendance/check-in    Record check-in
POST   /api/hr/attendance/check-out   Record check-out
GET    /api/hr/attendance             List attendance records
GET    /api/hr/attendance/report      Attendance report
```

### Leave Requests

```
POST   /api/hr/leave-requests          Create leave request
GET    /api/hr/leave-requests          List leave requests
GET    /api/hr/leave-requests/:id      Get leave request
PUT    /api/hr/leave-requests/:id      Update leave request
POST   /api/hr/leave-requests/:id/approve  Approve request
POST   /api/hr/leave-requests/:id/reject   Reject request
```

### Payroll

```
POST   /api/hr/payroll/calculate       Calculate payroll for period
GET    /api/hr/payroll                 List payroll records
GET    /api/hr/payroll/:id             Get payroll record
POST   /api/hr/payroll/:id/approve     Approve payroll
POST   /api/hr/payroll/:id/pay         Mark as paid
```

## Service Methods

### EmployeeService

| Method | Description |
|--------|-------------|
| `create()` | Create new employee |
| `findAll()` | List employees with filters |
| `findOne()` | Get employee by ID |
| `update()` | Update employee |
| `terminate()` | Terminate employment |
| `getTeam()` | Get direct reports |
| `getOrganizationChart()` | Full org structure |

### AttendanceService

| Method | Description |
|--------|-------------|
| `checkIn()` | Record check-in |
| `checkOut()` | Record check-out |
| `getByEmployee()` | Get employee attendance |
| `getByDateRange()` | Get attendance for period |
| `getReport()` | Generate attendance report |
| `detectAnomalies()` | Find attendance issues |

### LeaveRequestService

| Method | Description |
|--------|-------------|
| `create()` | Submit leave request |
| `approve()` | Approve request |
| `reject()` | Reject request |
| `cancel()` | Cancel request |
| `getBalance()` | Get remaining leave days |
| `getPendingApprovals()` | Get requests pending approval |

### PayrollService

| Method | Description |
|--------|-------------|
| `calculate()` | Calculate payroll for period |
| `approve()` | Approve payroll |
| `markAsPaid()` | Mark as paid |
| `generatePayslip()` | Generate payslip PDF |
| `getAnnualSummary()` | Get annual earnings summary |

## Payroll Calculation

### Basic Calculation

```typescript
async calculatePayroll(employeeId: string, period: string): Promise<Payroll> {
  const employee = await this.employeeRepository.findOne(employeeId);
  const attendance = await this.attendanceService.getByPeriod(employeeId, period);

  const workingDays = this.getWorkingDaysInPeriod(period);
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const absentDays = workingDays - presentDays;

  const baseSalary = employee.base_salary;
  const dailyRate = baseSalary / workingDays;
  const deductionForAbsence = dailyRate * absentDays;

  const overtimeHours = this.calculateOvertimeHours(attendance);
  const overtimePay = this.calculateOvertimePay(overtimeHours, dailyRate);

  const grossSalary = baseSalary - deductionForAbsence + overtimePay;
  const tax = this.calculateTax(grossSalary);
  const netSalary = grossSalary - tax;

  return {
    base_salary: baseSalary,
    overtime_pay: overtimePay,
    deductions: deductionForAbsence,
    tax,
    net_salary: netSalary,
    working_days: workingDays,
    absent_days: absentDays,
    overtime_hours: overtimeHours,
  };
}
```

## Leave Balance Management

### Annual Leave Calculation

```typescript
interface LeaveBalance {
  annual_total: number;       // Total annual leave days
  annual_used: number;        // Days used
  annual_remaining: number;   // Days remaining
  sick_used: number;          // Sick days used
  unpaid_used: number;        // Unpaid leave used
}
```

## Integration with Other Modules

### Users

- Each Employee links to a User account
- Syncs role and permissions

### Tasks

- Operators from HR assigned to tasks
- Attendance affects task assignment

### Reports

- HR reports (headcount, turnover)
- Payroll reports

### Notifications

- Leave approval notifications
- Payroll notifications
- Birthday reminders

## Best Practices

1. **Accurate Time Tracking**: Require clock-in/out for all employees
2. **Leave Planning**: Encourage advance leave requests
3. **Manager Approval**: Route all requests through managers
4. **Regular Payroll**: Process payroll on consistent dates
5. **Document Everything**: Attach documents to leave requests

## Related Modules

- [Users](../users/README.md) - User accounts
- [Tasks](../tasks/README.md) - Task assignment
- [Reports](../reports/README.md) - HR reports
- [Notifications](../notifications/README.md) - HR notifications
