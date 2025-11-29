#!/usr/bin/env python3
import re

file_path = "src/modules/reports/services/excel-export.service.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Convert all export method signatures to async Promise<Buffer>
content = re.sub(
    r'(\s+export\w+\([^)]+\)): Buffer {',
    r'\1: Promise<Buffer> {',
    content
)

# Also handle methods without 'export' prefix
content = re.sub(
    r'(\s+\w+\([^)]+\)): Buffer {',
    lambda m: m.group(0).replace(': Buffer {', ': Promise<Buffer> {') if 'async' not in m.group(0) else m.group(0),
    content
)

# Add async keyword where missing
content = re.sub(
    r'(\s+)(export\w+\([^)]+\): Promise<Buffer> {)',
    r'\1async \2',
    content
)

# Replace XLSX.utils.book_new() with new ExcelJS.Workbook()
content = content.replace(
    'const workbook = XLSX.utils.book_new();',
    'const workbook = new ExcelJS.Workbook();'
)

# Replace worksheet creation pattern
# XLSX.utils.aoa_to_sheet(data) + XLSX.utils.book_append_sheet(workbook, sheet, 'Name')
# with workbook.addWorksheet('Name') + sheet.addRows(data)

# Pattern 1: const sheet = XLSX.utils.aoa_to_sheet(data); XLSX.utils.book_append_sheet(workbook, sheet, 'Name');
def replace_sheet_pattern(match):
    var_name = match.group(1)
    data_var = match.group(2)
    sheet_name = match.group(3)
    return f"const {var_name} = workbook.addWorksheet('{sheet_name}');\n    {var_name}.addRows({data_var});"

content = re.sub(
    r'const (\w+) = XLSX\.utils\.aoa_to_sheet\((\w+)\);\s+XLSX\.utils\.book_append_sheet\(workbook, \1, [\'"]([^\'"]+)[\'"]\);',
    replace_sheet_pattern,
    content
)

# Replace XLSX.write(workbook, ...) with await workbook.xlsx.writeBuffer()
content = re.sub(
    r'return XLSX\.write\(workbook, \{ type: [\'"]buffer[\'"], bookType: [\'"]xlsx[\'"] \}\);',
    'return await workbook.xlsx.writeBuffer() as Buffer;',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Migration completed successfully!")
print("Converted all xlsx patterns to exceljs in excel-export.service.ts")
