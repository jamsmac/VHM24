#!/bin/bash

# Script to batch-replace common 'any' type patterns
# This script performs safe, common replacements

echo "Starting batch replacement of 'any' types..."

# Find all TypeScript source files (excluding tests)
FILES=$(find src -name "*.ts" -type f \( -not -path "*/test/*" -and -not -name "*.spec.ts" \))

for file in $FILES; do
  # Skip if file doesn't contain ': any'
  if ! grep -q ": any" "$file"; then
    continue
  fi

  echo "Processing: $file"

  # Create backup
  cp "$file" "$file.bak"

  # Pattern 1: Function parameters and returns
  sed -i '' 's/): any {/): Record<string, unknown> {/g' "$file"
  sed -i '' 's/): any;/): Record<string, unknown>;/g' "$file"
  sed -i '' 's/): Promise<any>/): Promise<Record<string, unknown>>/g' "$file"

  # Pattern 2: Variable declarations
  sed -i '' 's/: any\[\]/: Record<string, unknown>[]/g' "$file"
  sed -i '' 's/: any =/: Record<string, unknown> =/g' "$file"

  # Pattern 3: Generic types in common patterns
  sed -i '' 's/<T = any>/<T = Record<string, unknown>>/g' "$file"

  # Pattern 4: Object property types
  sed -i '' 's/value: any;/value: unknown;/g' "$file"
  sed -i '' 's/data: any;/data: unknown;/g' "$file"
  sed -i '' 's/result: any;/result: unknown;/g' "$file"
  sed -i '' 's/response: any;/response: unknown;/g' "$file"
  sed -i '' 's/payload: any;/payload: unknown;/g' "$file"

  # Pattern 5: Arrow function parameters (simple cases)
  sed -i '' 's/(data: any)/(data: Record<string, unknown>)/g' "$file"
  sed -i '' 's/(item: any)/(item: Record<string, unknown>)/g' "$file"
  sed -i '' 's/(row: any)/(row: Record<string, unknown>)/g' "$file"
  sed -i '' 's/(obj: any)/(obj: Record<string, unknown>)/g' "$file"
  sed -i '' 's/(value: any)/(value: unknown)/g' "$file"

done

echo "Batch replacement complete!"
echo "Backups created with .bak extension"
echo "Checking TypeScript compilation..."

npx tsc --noEmit
