import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHRTables1731630000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE position_level AS ENUM ('entry', 'junior', 'middle', 'senior', 'lead', 'manager', 'director', 'executive');
    `);

    await queryRunner.query(`
      CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'intern', 'temporary');
    `);

    await queryRunner.query(`
      CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'suspended', 'terminated', 'resigned');
    `);

    await queryRunner.query(`
      CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half_day', 'on_leave');
    `);

    await queryRunner.query(`
      CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'emergency', 'study', 'compensatory');
    `);

    await queryRunner.query(`
      CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    `);

    await queryRunner.query(`
      CREATE TYPE payroll_status AS ENUM ('draft', 'calculated', 'approved', 'paid', 'cancelled');
    `);

    await queryRunner.query(`
      CREATE TYPE review_period AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
    `);

    await queryRunner.query(`
      CREATE TYPE review_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
    `);

    // Create departments table
    await queryRunner.query(`
      CREATE TABLE departments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        manager_id UUID,
        parent_department_id UUID REFERENCES departments(id),
        is_active BOOLEAN DEFAULT true,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_departments_active ON departments(is_active) WHERE deleted_at IS NULL;
    `);

    // Create positions table
    await queryRunner.query(`
      CREATE TABLE positions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        level position_level NOT NULL,
        description TEXT,
        min_salary DECIMAL(10, 2),
        max_salary DECIMAL(10, 2),
        is_active BOOLEAN DEFAULT true,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_positions_active ON positions(is_active) WHERE deleted_at IS NULL;
    `);

    // Create employees table
    await queryRunner.query(`
      CREATE TABLE employees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL,
        employee_number VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        email VARCHAR(200) UNIQUE NOT NULL,
        phone VARCHAR(50),
        date_of_birth DATE NOT NULL,
        gender VARCHAR(10),
        address TEXT,
        department_id UUID NOT NULL REFERENCES departments(id),
        position_id UUID NOT NULL REFERENCES positions(id),
        manager_id UUID,
        employment_type employment_type NOT NULL,
        employment_status employment_status DEFAULT 'active',
        hire_date DATE NOT NULL,
        termination_date DATE,
        base_salary DECIMAL(10, 2) NOT NULL,
        salary_period VARCHAR(20) DEFAULT 'monthly',
        bank_account VARCHAR(100),
        tax_id VARCHAR(100),
        emergency_contact JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_employees_department ON employees(department_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_employees_position ON employees(position_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_employees_manager ON employees(manager_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_employees_status ON employees(employment_status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_employees_user ON employees(user_id);
    `);

    // Create attendances table
    await queryRunner.query(`
      CREATE TABLE attendances (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        check_in TIMESTAMP,
        check_out TIMESTAMP,
        total_hours INTEGER DEFAULT 0,
        overtime_hours INTEGER DEFAULT 0,
        break_duration INTEGER DEFAULT 0,
        status attendance_status DEFAULT 'present',
        notes TEXT,
        location VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(employee_id, date)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_attendances_employee ON attendances(employee_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_attendances_date ON attendances(date);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_attendances_employee_date ON attendances(employee_id, date);
    `);

    // Create leave_requests table
    await queryRunner.query(`
      CREATE TABLE leave_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type leave_type NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days DECIMAL(5, 2) NOT NULL,
        reason TEXT NOT NULL,
        status leave_status DEFAULT 'pending',
        approved_by_id UUID,
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_leave_requests_status ON leave_requests(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
    `);

    // Create payrolls table
    await queryRunner.query(`
      CREATE TABLE payrolls (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        period VARCHAR(7) NOT NULL,
        pay_date DATE NOT NULL,
        base_salary DECIMAL(10, 2) NOT NULL,
        overtime_pay DECIMAL(10, 2) DEFAULT 0,
        bonuses DECIMAL(10, 2) DEFAULT 0,
        allowances DECIMAL(10, 2) DEFAULT 0,
        deductions DECIMAL(10, 2) DEFAULT 0,
        tax DECIMAL(10, 2) DEFAULT 0,
        net_salary DECIMAL(10, 2) NOT NULL,
        status payroll_status DEFAULT 'draft',
        working_days INTEGER DEFAULT 0,
        absent_days INTEGER DEFAULT 0,
        overtime_hours INTEGER DEFAULT 0,
        notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(employee_id, period)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_payrolls_employee ON payrolls(employee_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_payrolls_period ON payrolls(period);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_payrolls_status ON payrolls(status);
    `);

    // Create performance_reviews table
    await queryRunner.query(`
      CREATE TABLE performance_reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL,
        review_period review_period NOT NULL,
        review_date DATE NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        overall_rating DECIMAL(3, 2),
        status review_status DEFAULT 'scheduled',
        strengths TEXT,
        areas_for_improvement TEXT,
        goals TEXT,
        reviewer_comments TEXT,
        employee_comments TEXT,
        ratings JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_performance_reviews_employee ON performance_reviews(employee_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_performance_reviews_date ON performance_reviews(review_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS performance_reviews CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS payrolls CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_requests CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS attendances CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS employees CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS positions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS departments CASCADE;`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS review_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS review_period;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payroll_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS leave_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS leave_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS attendance_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS employment_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS employment_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS position_level;`);
  }
}
