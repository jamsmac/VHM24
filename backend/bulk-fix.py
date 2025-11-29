#!/usr/bin/env python3
"""
Bulk fix TypeScript compilation errors in VendHub backend
"""
import re
import os
from pathlib import Path

def fix_file(filepath):
    """Apply fixes to a single file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Fix 1: status: 'completed' -> status: TaskStatus.COMPLETED
    content = re.sub(r"status:\s*['\"]completed['\"]", "status: TaskStatus.COMPLETED", content)
    content = re.sub(r"status:\s*['\"]pending['\"]", "status: TaskStatus.PENDING", content)
    content = re.sub(r"status:\s*['\"]in_progress['\"]", "status: TaskStatus.IN_PROGRESS", content)
    content = re.sub(r"status:\s*['\"]assigned['\"]", "status: TaskStatus.ASSIGNED", content)

    # Fix 2: role: 'ADMIN' -> role: UserRole.ADMIN
    content = re.sub(r"role:\s*['\"]ADMIN['\"]", "role: UserRole.ADMIN", content)
    content = re.sub(r"role:\s*['\"]OPERATOR['\"]", "role: UserRole.OPERATOR", content)
    content = re.sub(r"role:\s*['\"]MANAGER['\"]", "role: UserRole.MANAGER", content)
    content = re.sub(r"@Roles\(['\"]ADMIN['\"]\)", "@Roles(UserRole.ADMIN)", content)
    content = re.sub(r"@Roles\(['\"]OPERATOR['\"]\)", "@Roles(UserRole.OPERATOR)", content)
    content = re.sub(r"@Roles\(['\"]MANAGER['\"]\)", "@Roles(UserRole.MANAGER)", content)
    content = re.sub(r"@Roles\(['\"]ADMIN['\"],\s*['\"]MANAGER['\"]\)", "@Roles(UserRole.ADMIN, UserRole.MANAGER)", content)

    # Fix 3: MachineStatus string literals
    content = re.sub(r"status:\s*['\"]active['\"]", "status: MachineStatus.ACTIVE", content)
    content = re.sub(r"status:\s*['\"]offline['\"]", "status: MachineStatus.OFFLINE", content)
    content = re.sub(r"status:\s*['\"]disabled['\"]", "status: MachineStatus.DISABLED", content)

    # Fix 4: IncidentStatus and ComplaintStatus
    content = re.sub(r"status:\s*['\"]open['\"]", "status: IncidentStatus.OPEN", content)
    content = re.sub(r"priority:\s*['\"]critical['\"]", "priority: IncidentPriority.CRITICAL", content)
    content = re.sub(r"status:\s*['\"]new['\"]", "status: ComplaintStatus.NEW", content)

    # Fix 5: user.is_active -> user.status === UserStatus.ACTIVE
    content = re.sub(r"user\.is_active", "user.status === UserStatus.ACTIVE", content)

    # Fix 6: Date to ISO string for DTOs
    content = re.sub(r"scheduled_date:\s*new Date\(\)", "scheduled_date: new Date().toISOString()", content)
    content = re.sub(r"due_date:\s*new Date\(\)", "due_date: new Date().toISOString()", content)
    content = re.sub(r"due_date:\s*dueDate,", "due_date: dueDate.toISOString(),", content)

    # Fix 7: || undefined -> ?? undefined for null to undefined
    content = re.sub(r"\|\|\s*undefined", "?? undefined", content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Find and fix TypeScript files"""
    src_dir = Path('src')
    fixed_count = 0

    for ts_file in src_dir.rglob('*.ts'):
        if ts_file.is_file() and '.spec.ts' not in str(ts_file):
            if fix_file(ts_file):
                print(f"Fixed: {ts_file}")
                fixed_count += 1

    print(f"\nTotal files fixed: {fixed_count}")

if __name__ == '__main__':
    main()
