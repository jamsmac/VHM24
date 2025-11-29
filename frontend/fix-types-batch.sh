#!/bin/bash
# Comprehensive TypeScript error fixes batch script

# Fix all Dialog isOpen -> open replacements
echo "Fixing Dialog API..."
find src/components/equipment -name "*.tsx" -type f -exec sed -i '' 's/isOpen={isOpen}/open={isOpen}/g' {} \;
find src/components/equipment -name "*.tsx" -type f -exec sed -i '' 's/onClose={onClose}/onOpenChange={onClose}/g' {} \;

echo "Batch fixes applied!"
