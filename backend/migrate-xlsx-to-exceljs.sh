#!/bin/bash

# Script to migrate xlsx to exceljs in excel-export.service.ts

FILE="src/modules/reports/services/excel-export.service.ts"

echo "Migrating $FILE from xlsx to exceljs..."

# Replace export signatures from Buffer to Promise<Buffer>
sed -i '' 's/): Buffer {/): Promise<Buffer> {/g' "$FILE"
sed -i '' 's/export\(.*\): Buffer/export\1: Promise<Buffer>/g' "$FILE"

# Replace XLSX.utils.book_new() with new ExcelJS.Workbook()
sed -i '' 's/const workbook = XLSX\.utils\.book_new();/const workbook = new ExcelJS.Workbook();/g' "$FILE"

# Replace XLSX.utils.aoa_to_sheet and XLSX.utils.book_append_sheet with addWorksheet + addRows
# This is more complex and needs to be done method by method

# Replace XLSX.write() with workbook.xlsx.writeBuffer()
sed -i '' 's/return XLSX\.write(workbook, { type: .buffer., bookType: .xlsx. });/return await workbook.xlsx.writeBuffer() as Buffer;/g' "$FILE"

echo "Basic replacements done. Manual intervention needed for sheet creation patterns."
