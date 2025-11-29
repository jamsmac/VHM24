#!/bin/bash

# Script to fix common TypeScript errors in VendHub backend

# Fix 1: Replace expected_amount with expected_cash_amount and actual_amount with actual_cash_amount
find src -name "*.ts" -type f -exec sed -i '' 's/task\.expected_amount/task.expected_cash_amount/g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/task\.actual_amount/task.actual_cash_amount/g' {} \;

# Fix 2: Replace task.deadline with task.due_date
find src -name "*.ts" -type f -exec sed -i '' 's/task\.deadline/task.due_date/g' {} \;

# Fix 3: Replace user.is_active with user.status === UserStatus.ACTIVE
# This needs manual fix - skip

# Fix 4: Fix File.category (doesn't exist) - needs manual fix

echo "Common fixes applied. Please review changes."
