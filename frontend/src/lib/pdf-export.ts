import type { ComponentMaintenance, EquipmentComponent } from '@/types/equipment'
import { MaintenanceTypeLabels } from '@/types/equipment'

/**
 * Export maintenance history to PDF
 * Uses browser's print functionality for PDF generation
 */
export async function exportMaintenanceToPDF(
  maintenance: ComponentMaintenance[],
  component?: EquipmentComponent
) {
  // Create a new window with print-friendly content
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    alert('Пожалуйста, разрешите всплывающие окна для экспорта PDF')
    return
  }

  const html = generateMaintenanceReport(maintenance, component)

  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}

/**
 * Generate HTML for maintenance report
 */
function generateMaintenanceReport(
  maintenance: ComponentMaintenance[],
  component?: EquipmentComponent
): string {
  const totalCost = maintenance.reduce((sum, m) => sum + Number(m.total_cost), 0)
  const avgDuration = maintenance.length > 0
    ? maintenance.reduce((sum, m) => sum + (m.duration_minutes || 0), 0) / maintenance.length
    : 0
  const successRate = maintenance.length > 0
    ? (maintenance.filter(m => m.is_successful).length / maintenance.length) * 100
    : 0

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Отчет по обслуживанию ${component ? `- ${component.name}` : ''}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      color: #4F46E5;
      border-bottom: 3px solid #4F46E5;
      padding-bottom: 10px;
      margin-bottom: 20px;
      font-size: 24px;
    }

    h2 {
      color: #6366F1;
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #4F46E5;
    }

    .report-meta {
      text-align: right;
      color: #666;
      font-size: 11px;
    }

    .component-info {
      background: #F3F4F6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 25px;
    }

    .component-info h3 {
      margin: 0 0 10px 0;
      color: #1F2937;
    }

    .component-info p {
      margin: 5px 0;
      color: #4B5563;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }

    .stat-card {
      background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-value {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 11px;
      opacity: 0.9;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 11px;
    }

    thead {
      background: #4F46E5;
      color: white;
    }

    th {
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }

    td {
      padding: 10px;
      border-bottom: 1px solid #E5E7EB;
    }

    tbody tr:nth-child(even) {
      background: #F9FAFB;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
    }

    .badge-success {
      background: #D1FAE5;
      color: #065F46;
    }

    .badge-error {
      background: #FEE2E2;
      color: #991B1B;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 10px;
    }

    @media print {
      body {
        padding: 0;
      }

      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🔧 VendHub Manager</div>
    <div class="report-meta">
      <strong>Отчет по обслуживанию</strong><br>
      Сгенерирован: ${new Date().toLocaleString('ru-RU')}<br>
      Записей: ${maintenance.length}
    </div>
  </div>

  ${component ? `
  <div class="component-info">
    <h3>${component.name}</h3>
    <p><strong>Тип:</strong> ${component.component_type}</p>
    ${component.serial_number ? `<p><strong>Серийный номер:</strong> ${component.serial_number}</p>` : ''}
    ${component.model ? `<p><strong>Модель:</strong> ${component.model}</p>` : ''}
    <p><strong>Часы работы:</strong> ${component.working_hours} ч</p>
    ${component.expected_lifetime_hours ?
      `<p><strong>Ресурс:</strong> ${Math.round((component.working_hours / component.expected_lifetime_hours) * 100)}%</p>`
      : ''
    }
  </div>
  ` : ''}

  <h2>📊 Статистика</h2>
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${maintenance.length}</div>
      <div class="stat-label">Всего работ</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalCost.toLocaleString('ru-RU')} ₽</div>
      <div class="stat-label">Общие затраты</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${successRate.toFixed(0)}%</div>
      <div class="stat-label">Успешность</div>
    </div>
  </div>

  <h2>📋 История обслуживания</h2>
  <table>
    <thead>
      <tr>
        <th>Дата</th>
        <th>Тип работ</th>
        <th>Описание</th>
        <th>Длительность</th>
        <th>Стоимость</th>
        <th>Статус</th>
      </tr>
    </thead>
    <tbody>
      ${maintenance.map(m => `
        <tr>
          <td>${new Date(m.performed_at).toLocaleDateString('ru-RU')}</td>
          <td>${MaintenanceTypeLabels[m.maintenance_type]}</td>
          <td>${m.description.substring(0, 100)}${m.description.length > 100 ? '...' : ''}</td>
          <td>${m.duration_minutes ? `${m.duration_minutes} мин` : '—'}</td>
          <td>${Number(m.total_cost).toLocaleString('ru-RU')} ₽</td>
          <td>
            <span class="badge ${m.is_successful ? 'badge-success' : 'badge-error'}">
              ${m.is_successful ? '✓ Успешно' : '✗ Неуспешно'}
            </span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>VendHub Manager - Система управления вендинговыми аппаратами</p>
    <p>Этот отчет создан автоматически и не требует подписи</p>
  </div>

  <script>
    // Auto-print on load
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `
}

/**
 * Export component list to PDF
 */
export async function exportComponentsToPDF(components: EquipmentComponent[]) {
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    alert('Пожалуйста, разрешите всплывающие окна для экспорта PDF')
    return
  }

  const needingMaintenance = components.filter(c =>
    c.next_maintenance_date && new Date(c.next_maintenance_date) < new Date()
  ).length

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Список компонентов</title>
  <style>
    ${getCommonStyles()}
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🔧 VendHub Manager</div>
    <div class="report-meta">
      <strong>Список компонентов</strong><br>
      Сгенерирован: ${new Date().toLocaleString('ru-RU')}<br>
      Компонентов: ${components.length}
    </div>
  </div>

  ${needingMaintenance > 0 ? `
    <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
      <strong style="color: #991B1B;">⚠️ Внимание:</strong> ${needingMaintenance} компонент(ов) требуют обслуживания
    </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>Компонент</th>
        <th>Тип</th>
        <th>Статус</th>
        <th>Часы</th>
        <th>Ресурс</th>
        <th>Следующее ТО</th>
      </tr>
    </thead>
    <tbody>
      ${components.map(c => `
        <tr>
          <td>
            <strong>${c.name}</strong><br>
            ${c.serial_number ? `<small>SN: ${c.serial_number}</small>` : ''}
          </td>
          <td>${c.component_type}</td>
          <td>${c.status}</td>
          <td>${c.working_hours} ч</td>
          <td>
            ${c.expected_lifetime_hours
              ? `${Math.round((c.working_hours / c.expected_lifetime_hours) * 100)}%`
              : '—'
            }
          </td>
          <td>
            ${c.next_maintenance_date
              ? new Date(c.next_maintenance_date).toLocaleDateString('ru-RU')
              : '—'
            }
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>VendHub Manager - Система управления вендинговыми аппаратами</p>
  </div>

  <script>
    window.onload = function() {
      setTimeout(() => window.print(), 500);
    };
  </script>
</body>
</html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}

function getCommonStyles(): string {
  return `
    @page { size: A4; margin: 20mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #4F46E5;
    }
    .report-meta {
      text-align: right;
      color: #666;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead {
      background: #4F46E5;
      color: white;
    }
    th, td {
      padding: 10px;
      text-align: left;
    }
    td {
      border-bottom: 1px solid #E5E7EB;
    }
    tbody tr:nth-child(even) {
      background: #F9FAFB;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 10px;
    }
  `
}
