/**
 * HTML Report Templates for Prince XML
 * These templates generate HTML that can be converted to PDF using Prince
 */

export interface DashboardReportData {
  period: { from: string | Date; to: string | Date };
  financial: {
    revenue: number;
    expenses: number;
    collections: number;
    net_profit: number;
  };
  tasks: {
    total: number;
    completed: number;
    overdue: number;
    completion_rate?: number;
  };
  incidents: { open: number; critical: number };
  complaints: { new: number };
  machines: { active: number; total: number };
}

/**
 * Generate HTML template for dashboard report
 */
export function generateDashboardReportHtml(data: DashboardReportData): string {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ru-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('ru-RU');
  };

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VendHub Manager - Dashboard Report</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
      @top-center {
        content: "VendHub Manager - Dashboard Report";
        font-size: 10pt;
        color: #666;
      }
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9pt;
        color: #666;
      }
    }
    
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2196F3;
    }
    
    .header h1 {
      margin: 0;
      font-size: 24pt;
      color: #2196F3;
      font-weight: bold;
    }
    
    .header .period {
      margin-top: 10px;
      font-size: 12pt;
      color: #666;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 16pt;
      font-weight: bold;
      color: #2196F3;
      margin-bottom: 15px;
      padding-bottom: 5px;
      border-bottom: 2px solid #E0E0E0;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: #F5F5F5;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #2196F3;
    }
    
    .stat-label {
      font-size: 10pt;
      color: #666;
      margin-bottom: 5px;
    }
    
    .stat-value {
      font-size: 18pt;
      font-weight: bold;
      color: #333;
    }
    
    .financial-summary {
      background: #E3F2FD;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    
    .financial-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #BBDEFB;
    }
    
    .financial-row:last-child {
      border-bottom: none;
      font-weight: bold;
      font-size: 12pt;
      margin-top: 10px;
      padding-top: 15px;
      border-top: 2px solid #2196F3;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E0E0E0;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
    
    @media print {
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>VendHub Manager</h1>
    <div class="period">
      Отчёт за период: ${formatDate(data.period.from)} - ${formatDate(data.period.to)}
    </div>
    <div style="font-size: 9pt; color: #999; margin-top: 5px;">
      Сгенерировано: ${new Date().toLocaleString('ru-RU')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Финансовая сводка</div>
    <div class="financial-summary">
      <div class="financial-row">
        <span>Выручка:</span>
        <span>${formatCurrency(data.financial.revenue)}</span>
      </div>
      <div class="financial-row">
        <span>Расходы:</span>
        <span>${formatCurrency(data.financial.expenses)}</span>
      </div>
      <div class="financial-row">
        <span>Инкассации:</span>
        <span>${formatCurrency(data.financial.collections)}</span>
      </div>
      <div class="financial-row">
        <span>Чистая прибыль:</span>
        <span>${formatCurrency(data.financial.net_profit)}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Статистика задач</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Всего задач</div>
        <div class="stat-value">${data.tasks.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Выполнено</div>
        <div class="stat-value">${data.tasks.completed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Просрочено</div>
        <div class="stat-value">${data.tasks.overdue}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Процент выполнения</div>
        <div class="stat-value">${data.tasks.completion_rate?.toFixed(1) || 0}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Инциденты и жалобы</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Открытые инциденты</div>
        <div class="stat-value">${data.incidents.open}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Критические инциденты</div>
        <div class="stat-value">${data.incidents.critical}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Новые жалобы</div>
        <div class="stat-value">${data.complaints.new}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Статус автоматов</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Активных автоматов</div>
        <div class="stat-value">${data.machines.active}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Всего автоматов</div>
        <div class="stat-value">${data.machines.total}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>VendHub Manager - Система управления вендинговыми автоматами</p>
    <p>© ${new Date().getFullYear()} VendHub. Все права защищены.</p>
  </div>
</body>
</html>
  `.trim();
}

