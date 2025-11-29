#!/bin/bash

# Quick fix for common 'any' patterns
# Conservative replacements that are always safe

# Only fix in non-test files
FILES=$(find src -name "*.ts" -not -path "*/test/*" -not -name "*.spec.ts" | grep -v node_modules)

for file in $FILES; do
  # Skip files without 'any'
  grep -q ": any" "$file" || continue
  
  # Safe replacements:
  # 1. Function parameters named 'value' - almost always should be unknown
  perl -pi -e 's/\(value: any\)/(value: unknown)/g' "$file"
  
  # 2. Object properties that are clearly unknown data
  perl -pi -e 's/: any;  \/\/ /: unknown;  \/\/ /g' "$file"
  
  # 3. Generic default type parameters
  perl -pi -e 's/<T = any>/<T = unknown>/g' "$file"
  
done

echo "Quick fixes applied. Files modified:"
find src -name "*.ts" -not -path "*/test/*" -not -name "*.spec.ts" | xargs grep -l ": unknown" | wc -l
