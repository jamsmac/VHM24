import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { NetworkSummaryReport } from './network-summary.service';
import { ProfitLossReport } from './profit-loss.service';
import { CashFlowReport } from './cash-flow.service';
import { MachinePerformanceReport } from './machine-performance.service';
import { LocationPerformanceReport } from './location-performance.service';
import { ProductSalesReport, AllProductsSalesReport } from './product-sales.service';
import { CollectionsSummaryReport } from './collections-summary.service';

@Injectable()
export class ExcelExportService {
  /**
   * Export Network Summary Report to Excel
   */
  async exportNetworkSummary(report: NetworkSummaryReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Сводка');
    const summaryData = [
      ['ОТЧЕТ ПО СЕТИ'],
      [''],
      [
        'Период:',
        report.period.start_date.toLocaleDateString('ru-RU'),
        '-',
        report.period.end_date.toLocaleDateString('ru-RU'),
      ],
      ['Сформирован:', report.generated_at.toLocaleDateString('ru-RU')],
      [''],
      ['АППАРАТЫ'],
      ['Всего:', report.machines.total],
      ['Активных:', report.machines.active],
      ['Офлайн:', report.machines.offline],
      ['Отключенных:', report.machines.disabled],
      ['Низкий запас:', report.machines.low_stock],
      [''],
      ['ФИНАНСЫ (UZS)'],
      ['Общая выручка:', report.financial.total_revenue.toFixed(2)],
      ['Продаж (шт):', report.financial.total_sales_count],
      ['Расходы:', report.financial.total_expenses.toFixed(2)],
      ['Инкассации:', report.financial.total_collections.toFixed(2)],
      ['Чистая прибыль:', report.financial.net_profit.toFixed(2)],
      ['Ср. выручка/аппарат:', report.financial.average_revenue_per_machine.toFixed(2)],
      [''],
      ['ЗАДАЧИ'],
      ['Всего:', report.tasks.total],
      ['Завершено:', report.tasks.completed],
      ['В ожидании:', report.tasks.pending],
      ['В работе:', report.tasks.in_progress],
      ['Просрочено:', report.tasks.overdue],
      ['% выполнения:', report.tasks.completion_rate.toFixed(2) + '%'],
      [''],
      ['ИНЦИДЕНТЫ'],
      ['Всего:', report.incidents.total],
      ['Открыто:', report.incidents.open],
      ['Решено:', report.incidents.resolved],
      ['Ср. время решения (часы):', report.incidents.average_resolution_time_hours.toFixed(2)],
    ];
    summarySheet.addRows(summaryData);

    // Top Machines Sheet
    const topMachinesSheet = workbook.addWorksheet('Топ аппараты');
    const topMachinesData = [
      ['ТОП АППАРАТОВ'],
      [''],
      ['Номер аппарата', 'Локация', 'Выручка (UZS)', 'Продаж (шт)'],
      ...report.top_machines.map((m) => [
        m.machine_number,
        m.location_name,
        m.total_revenue.toFixed(2),
        m.sales_count,
      ]),
    ];
    topMachinesSheet.addRows(topMachinesData);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Export P&L Report to Excel
   */
  async exportProfitLoss(report: ProfitLossReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const data = [
      ['ОТЧЕТ О ПРИБЫЛЯХ И УБЫТКАХ (P&L)'],
      [''],
      [
        'Период:',
        report.period.start_date.toLocaleDateString('ru-RU'),
        '-',
        report.period.end_date.toLocaleDateString('ru-RU'),
      ],
      ['Сформирован:', report.generated_at.toLocaleDateString('ru-RU')],
      [''],
      ['ВЫРУЧКА (UZS)'],
      ['Продажи:', report.revenue.sales.toFixed(2)],
      ['Прочие доходы:', report.revenue.other_income.toFixed(2)],
      ['Всего выручка:', report.revenue.total_revenue.toFixed(2)],
      [''],
      ['РАСХОДЫ (UZS)'],
      ['Аренда:', report.expenses.rent.toFixed(2)],
      ['Закупка товара:', report.expenses.purchase.toFixed(2)],
      ['Ремонт:', report.expenses.repair.toFixed(2)],
      ['Зарплата:', report.expenses.salary.toFixed(2)],
      ['Коммунальные услуги:', report.expenses.utilities.toFixed(2)],
      ['Амортизация:', report.expenses.depreciation.toFixed(2)],
      ['Списание:', report.expenses.writeoff.toFixed(2)],
      ['Прочее:', report.expenses.other.toFixed(2)],
      ['Всего расходы:', report.expenses.total_expenses.toFixed(2)],
      [''],
      ['ПРИБЫЛЬ (UZS)'],
      ['Валовая прибыль:', report.profit.gross_profit.toFixed(2)],
      ['Операционная прибыль:', report.profit.operating_profit.toFixed(2)],
      ['Чистая прибыль:', report.profit.net_profit.toFixed(2)],
      ['Маржа прибыли (%):', report.profit.profit_margin_percent.toFixed(2) + '%'],
    ];

    const sheet = workbook.addWorksheet('P&L');
    sheet.addRows(data);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Export Cash Flow Report to Excel
   */
  async exportCashFlow(report: CashFlowReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const data = [
      ['ОТЧЕТ О ДВИЖЕНИИ ДЕНЕЖНЫХ СРЕДСТВ'],
      [''],
      [
        'Период:',
        report.period.start_date.toLocaleDateString('ru-RU'),
        '-',
        report.period.end_date.toLocaleDateString('ru-RU'),
      ],
      ['Сформирован:', report.generated_at.toLocaleDateString('ru-RU')],
      [''],
      ['ДЕНЕЖНЫЕ ПОСТУПЛЕНИЯ (UZS)'],
      ['Продажи (наличные):', report.cash_inflows.cash_sales.toFixed(2)],
      ['Продажи (карта):', report.cash_inflows.card_sales.toFixed(2)],
      ['Продажи (мобильные):', report.cash_inflows.mobile_sales.toFixed(2)],
      ['Продажи (QR):', report.cash_inflows.qr_sales.toFixed(2)],
      ['Инкассации:', report.cash_inflows.collections.toFixed(2)],
      ['Всего поступления:', report.cash_inflows.total_inflows.toFixed(2)],
      [''],
      ['ДЕНЕЖНЫЕ РАСХОДЫ (UZS)'],
      ['Расходы:', report.cash_outflows.expenses.toFixed(2)],
      ['Возвраты:', report.cash_outflows.refunds.toFixed(2)],
      ['Всего расходы:', report.cash_outflows.total_outflows.toFixed(2)],
      [''],
      ['ЧИСТЫЙ ДЕНЕЖНЫЙ ПОТОК (UZS)'],
      ['Чистый поток:', report.net_cash_flow.toFixed(2)],
      [''],
      ['ОСТАТКИ ДЕНЕЖНЫХ СРЕДСТВ'],
      ['Начальный остаток:', report.cash_position.opening_balance.toFixed(2)],
      ['Конечный остаток:', report.cash_position.closing_balance.toFixed(2)],
      [''],
      ['РАСПРЕДЕЛЕНИЕ ПО МЕТОДАМ ОПЛАТЫ'],
      ['Метод оплаты', 'Сумма (UZS)', 'Кол-во', 'Доля (%)'],
      ...report.payment_breakdown.map((pb) => [
        pb.payment_method,
        pb.amount.toFixed(2),
        pb.transaction_count,
        pb.percentage.toFixed(2) + '%',
      ]),
    ];

    const sheet = workbook.addWorksheet('Cash Flow');
    sheet.addRows(data);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Export Machine Performance Report to Excel
   */
  async exportMachinePerformance(report: MachinePerformanceReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summaryData = [
      ['ОТЧЕТ ПО АППАРАТУ'],
      [''],
      ['Номер аппарата:', report.machine.machine_number],
      ['Название:', report.machine.name],
      ['Локация:', report.machine.location_name],
      ['Адрес:', report.machine.location_address],
      ['Статус:', report.machine.status],
      [''],
      [
        'Период:',
        report.period.start_date.toLocaleDateString('ru-RU'),
        '-',
        report.period.end_date.toLocaleDateString('ru-RU'),
      ],
      [''],
      ['ПРОДАЖИ (UZS)'],
      ['Общая выручка:', report.sales.total_revenue.toFixed(2)],
      ['Всего транзакций:', report.sales.total_transactions],
      ['Средний чек:', report.sales.average_transaction.toFixed(2)],
      [''],
      ['ЗАДАЧИ'],
      ['Всего:', report.tasks.total],
      ['Пополнения:', report.tasks.refills],
      ['Инкассации:', report.tasks.collections],
      ['Обслуживание:', report.tasks.maintenance],
      ['Ремонт:', report.tasks.repairs],
      ['% выполнения:', report.tasks.completion_rate.toFixed(2) + '%'],
      [''],
      ['РЕНТАБЕЛЬНОСТЬ (UZS)'],
      ['Выручка:', report.profitability.revenue.toFixed(2)],
      ['Расходы:', report.profitability.expenses.toFixed(2)],
      ['Чистая прибыль:', report.profitability.net_profit.toFixed(2)],
      ['Маржа (%):', report.profitability.profit_margin.toFixed(2) + '%'],
      ['ROI (%):', report.profitability.roi.toFixed(2) + '%'],
      [''],
      ['ВРЕМЯ РАБОТЫ'],
      ['Всего дней:', report.uptime.total_days],
      ['Активных дней:', report.uptime.active_days],
      ['Офлайн дней:', report.uptime.offline_days],
      ['Uptime (%):', report.uptime.uptime_percentage.toFixed(2) + '%'],
    ];

    const summarySheet = workbook.addWorksheet('Сводка');
    summarySheet.addRows(summaryData);

    // Payment Methods Sheet
    const paymentData = [
      ['РАСПРЕДЕЛЕНИЕ ПО МЕТОДАМ ОПЛАТЫ'],
      [''],
      ['Метод оплаты', 'Сумма (UZS)', 'Транзакций', 'Доля (%)'],
      ...report.sales.payment_breakdown.map((pb) => [
        pb.payment_method,
        pb.amount.toFixed(2),
        pb.transaction_count,
        pb.percentage.toFixed(2) + '%',
      ]),
    ];

    const paymentSheet = workbook.addWorksheet('Методы оплаты');
    paymentSheet.addRows(paymentData);

    // Top Products Sheet
    const productsData = [
      ['ТОП ПРОДУКТОВ'],
      [''],
      ['Наименование', 'Продано (шт)', 'Выручка (UZS)'],
      ...report.sales.top_products.map((p) => [
        p.product_name,
        p.quantity_sold,
        p.revenue.toFixed(2),
      ]),
    ];

    const productsSheet = workbook.addWorksheet('Топ продукты');
    productsSheet.addRows(productsData);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Export Location Performance Report to Excel
   */
  async exportLocationPerformance(report: LocationPerformanceReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summaryData = [
      ['ОТЧЕТ ПО ЛОКАЦИИ'],
      [''],
      ['Название:', report.location.name],
      ['Адрес:', report.location.address],
      ['Тип:', report.location.type],
      ['Владелец:', report.location.owner_name],
      [''],
      [
        'Период:',
        report.period.start_date.toLocaleDateString('ru-RU'),
        '-',
        report.period.end_date.toLocaleDateString('ru-RU'),
      ],
      [''],
      ['АППАРАТЫ'],
      ['Всего:', report.machines.total],
      ['Активных:', report.machines.active],
      ['Офлайн:', report.machines.offline],
      [''],
      ['ФИНАНСЫ (UZS)'],
      ['Общая выручка:', report.financial.total_revenue.toFixed(2)],
      ['Расходы:', report.financial.total_expenses.toFixed(2)],
      ['Комиссия владельца:', report.financial.owner_commission.toFixed(2)],
      ['Чистая прибыль:', report.financial.net_profit.toFixed(2)],
      ['Маржа (%):', report.financial.profit_margin.toFixed(2) + '%'],
      ['Ср. выручка/аппарат:', report.financial.average_revenue_per_machine.toFixed(2)],
    ];

    const summarySheet = workbook.addWorksheet('Сводка');
    summarySheet.addRows(summaryData);

    // Machines Performance Sheet
    const machinesData = [
      ['ПРОИЗВОДИТЕЛЬНОСТЬ АППАРАТОВ'],
      [''],
      ['Номер', 'Название', 'Выручка (UZS)', 'Транзакций', 'Статус'],
      ...report.machines.performance.map((m) => [
        m.machine_number,
        m.machine_name,
        m.revenue.toFixed(2),
        m.transactions,
        m.status,
      ]),
    ];

    const machinesSheet = workbook.addWorksheet('Аппараты');
    machinesSheet.addRows(machinesData);

    // Top Performers Sheet
    const topData = [
      ['ТОП АППАРАТОВ'],
      [''],
      ['Номер', 'Выручка (UZS)', 'Вклад (%)'],
      ...report.top_performers.map((t) => [
        t.machine_number,
        t.revenue.toFixed(2),
        t.contribution_percentage.toFixed(2) + '%',
      ]),
    ];

    const topSheet = workbook.addWorksheet('Топ аппараты');
    topSheet.addRows(topData);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Export Product Sales Report to Excel
   */
  async exportProductSales(report: ProductSalesReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summaryData = [
      ['ОТЧЕТ ПО ПРОДУКТУ'],
      [''],
      ['Наименование:', report.product.name],
      ['Категория:', report.product.category],
      ['Тип:', report.product.type],
      ['Цена продажи:', report.product.sale_price.toFixed(2)],
      ['Цена закупки:', report.product.purchase_price.toFixed(2)],
      [''],
      [
        'Период:',
        report.period.start_date.toLocaleDateString('ru-RU'),
        '-',
        report.period.end_date.toLocaleDateString('ru-RU'),
      ],
      [''],
      ['ПРОДАЖИ'],
      ['Всего продано (шт):', report.sales.total_quantity],
      ['Общая выручка (UZS):', report.sales.total_revenue.toFixed(2)],
      ['Себестоимость (UZS):', report.sales.total_cost.toFixed(2)],
      ['Валовая прибыль (UZS):', report.sales.gross_profit.toFixed(2)],
      ['Маржа (%):', report.sales.profit_margin.toFixed(2) + '%'],
      ['Средняя цена:', report.sales.average_price.toFixed(2)],
    ];

    const summarySheet = workbook.addWorksheet('Сводка');
    summarySheet.addRows(summaryData);

    // By Machine Sheet
    const machinesData = [
      ['ПРОДАЖИ ПО АППАРАТАМ'],
      [''],
      ['Номер', 'Название', 'Локация', 'Количество', 'Выручка (UZS)', 'Вклад (%)'],
      ...report.by_machine.map((m) => [
        m.machine_number,
        m.machine_name,
        m.location_name,
        m.quantity,
        m.revenue.toFixed(2),
        m.contribution_percentage.toFixed(2) + '%',
      ]),
    ];

    const machinesSheet = workbook.addWorksheet('По аппаратам');
    machinesSheet.addRows(machinesData);

    // By Payment Method Sheet
    const paymentData = [
      ['ПРОДАЖИ ПО МЕТОДАМ ОПЛАТЫ'],
      [''],
      ['Метод оплаты', 'Количество', 'Выручка (UZS)', 'Доля (%)'],
      ...report.by_payment_method.map((p) => [
        p.payment_method,
        p.quantity,
        p.revenue.toFixed(2),
        p.percentage.toFixed(2) + '%',
      ]),
    ];

    const paymentSheet = workbook.addWorksheet('Методы оплаты');
    paymentSheet.addRows(paymentData);

    // Daily Trend Sheet
    const trendData = [
      ['ДИНАМИКА ПРОДАЖ ПО ДНЯМ'],
      [''],
      ['Дата', 'Количество', 'Выручка (UZS)'],
      ...report.daily_trend.map((d) => [d.date, d.quantity, d.revenue.toFixed(2)]),
    ];

    const trendSheet = workbook.addWorksheet('Динамика');
    trendSheet.addRows(trendData);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Export All Products Sales Report to Excel
   */
  async exportAllProductsSales(report: AllProductsSalesReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summaryData = [
      ['ОТЧЕТ ПО ВСЕМ ПРОДУКТАМ'],
      [''],
      [
        'Период:',
        report.period.start_date.toLocaleDateString('ru-RU'),
        '-',
        report.period.end_date.toLocaleDateString('ru-RU'),
      ],
      [''],
      ['ИТОГИ'],
      ['Всего продуктов:', report.summary.total_products],
      ['Продано (шт):', report.summary.total_quantity_sold],
      ['Общая выручка (UZS):', report.summary.total_revenue.toFixed(2)],
      ['Себестоимость (UZS):', report.summary.total_cost.toFixed(2)],
      ['Валовая прибыль (UZS):', report.summary.total_profit.toFixed(2)],
      ['Средняя маржа (%):', report.summary.average_margin.toFixed(2) + '%'],
    ];

    const summarySheet = workbook.addWorksheet('Сводка');
    summarySheet.addRows(summaryData);

    // All Products Sheet
    const productsData = [
      ['ВСЕ ПРОДУКТЫ'],
      [''],
      [
        'Наименование',
        'Категория',
        'Продано (шт)',
        'Выручка (UZS)',
        'Себестоимость (UZS)',
        'Прибыль (UZS)',
        'Маржа (%)',
        'Вклад (%)',
      ],
      ...report.products.map((p) => [
        p.product_name,
        p.category,
        p.quantity_sold,
        p.revenue.toFixed(2),
        p.cost.toFixed(2),
        p.profit.toFixed(2),
        p.margin.toFixed(2) + '%',
        p.contribution_percentage.toFixed(2) + '%',
      ]),
    ];

    const productsSheet = workbook.addWorksheet('Продукты');
    productsSheet.addRows(productsData);

    // Top Performers Sheet
    const topData = [
      ['ТОП ПРОДУКТОВ'],
      [''],
      ['Наименование', 'Выручка (UZS)', 'Продано (шт)'],
      ...report.top_performers.map((t) => [t.product_name, t.revenue.toFixed(2), t.quantity]),
    ];

    const topSheet = workbook.addWorksheet('Топ продукты');
    topSheet.addRows(topData);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Export Collections Summary Report to Excel
   */
  async exportCollectionsSummary(report: CollectionsSummaryReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summaryData = [
      ['СВОДНЫЙ ОТЧЕТ ПО ИНКАССАЦИЯМ'],
      [''],
      [
        'Период:',
        report.period.start_date.toLocaleDateString('ru-RU'),
        '-',
        report.period.end_date.toLocaleDateString('ru-RU'),
      ],
      [''],
      ['ИТОГИ'],
      ['Всего инкассаций:', report.summary.total_collections],
      ['Собрано (UZS):', report.summary.total_collected_amount.toFixed(2)],
      ['Ожидалось (UZS):', report.summary.expected_amount.toFixed(2)],
      ['Расхождение (UZS):', report.summary.variance.toFixed(2)],
      ['Расхождение (%):', report.summary.variance_percentage.toFixed(2) + '%'],
      ['Ср. сумма инкассации:', report.summary.average_collection_amount.toFixed(2)],
    ];

    const summarySheet = workbook.addWorksheet('Сводка');
    summarySheet.addRows(summaryData);

    // By Machine Sheet
    const machinesData = [
      ['ИНКАССАЦИИ ПО АППАРАТАМ'],
      [''],
      [
        'Номер',
        'Название',
        'Локация',
        'Кол-во',
        'Собрано (UZS)',
        'Ожидалось (UZS)',
        'Расхождение (UZS)',
        'Расх. (%)',
      ],
      ...report.by_machine.map((m) => [
        m.machine_number,
        m.machine_name,
        m.location_name,
        m.collections_count,
        m.collected_amount.toFixed(2),
        m.expected_amount.toFixed(2),
        m.variance.toFixed(2),
        m.variance_percentage.toFixed(2) + '%',
      ]),
    ];

    const machinesSheet = workbook.addWorksheet('По аппаратам');
    machinesSheet.addRows(machinesData);

    // By Collector Sheet
    const collectorsData = [
      ['ИНКАССАЦИИ ПО ИНКАССАТОРАМ'],
      [''],
      ['Инкассатор', 'Кол-во', 'Сумма (UZS)', 'Ср. сумма (UZS)'],
      ...report.by_collector.map((c) => [
        c.collector_name,
        c.collections_count,
        c.total_amount.toFixed(2),
        c.average_amount.toFixed(2),
      ]),
    ];

    const collectorsSheet = workbook.addWorksheet('По инкассаторам');
    collectorsSheet.addRows(collectorsData);

    // Discrepancies Sheet
    if (report.discrepancies.length > 0) {
      const discrepanciesData = [
        ['ЗНАЧИТЕЛЬНЫЕ РАСХОЖДЕНИЯ (>10%)'],
        [''],
        [
          'Номер аппарата',
          'Дата',
          'Собрано (UZS)',
          'Ожидалось (UZS)',
          'Расхождение (UZS)',
          'Расх. (%)',
        ],
        ...report.discrepancies.map((d) => [
          d.machine_number,
          d.collection_date.toLocaleDateString('ru-RU'),
          d.collected_amount.toFixed(2),
          d.expected_amount.toFixed(2),
          d.variance.toFixed(2),
          d.variance_percentage.toFixed(2) + '%',
        ]),
      ];

      const discrepanciesSheet = workbook.addWorksheet('Расхождения');
      discrepanciesSheet.addRows(discrepanciesData);
    }

    // Daily Trend Sheet
    const trendData = [
      ['ДИНАМИКА ИНКАССАЦИЙ ПО ДНЯМ'],
      [''],
      ['Дата', 'Количество', 'Сумма (UZS)'],
      ...report.daily_trend.map((d) => [d.date, d.collections_count, d.total_amount.toFixed(2)]),
    ];

    const trendSheet = workbook.addWorksheet('Динамика');
    trendSheet.addRows(trendData);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
