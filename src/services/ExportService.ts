import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';
import * as XLSX from 'xlsx';
import { Deposit } from '../types';
import { format } from 'date-fns';

export const exportToXLSX = (deposits: Deposit[]) => {
  const data = deposits.map(d => ({
    'Банк': d.bank,
    'Сумма': d.amount,
    'Валюта': d.currency,
    'Ставка (%)': d.rate,
    'Дата открытия': format(new Date(d.startDate), 'dd.MM.yyyy'),
    'Дата закрытия': format(new Date(d.endDate), 'dd.MM.yyyy'),
    'Статус': d.isClosed ? 'Закрыт' : 'Активен',
    'Комментарий': d.comment || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Вклады');
  XLSX.writeFile(workbook, `sproutly_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportOverviewToXLSX = (data: any, year: number) => {
  const summaryData = [
    { 'Показатель': 'Год', 'Значение': year },
    { 'Показатель': 'Общий Доход (Gross)', 'Значение': data.totalGross },
    { 'Показатель': 'Чистый Доход (Net)', 'Значение': data.totalNet },
    { 'Показатель': 'Всего Налогов', 'Значение': data.totalTax },
    { 'Показатель': 'Налог уплачен (13%)', 'Значение': data.taxPaid },
    { 'Показатель': 'Налог к доплате', 'Значение': data.taxToBePaid },
    { 'Показатель': 'Доход от зарплаты', 'Значение': data.salaryGross },
    { 'Показатель': 'Доход от вкладов', 'Значение': data.depositsIncome },
  ];

  const worksheet = XLSX.utils.json_to_sheet(summaryData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Сводка');
  XLSX.writeFile(workbook, `overview_export_${year}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportToPDF = async (elementId: string, summary?: any, deposits?: Deposit[]) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // Small delay to ensure any transitions are finished
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const isDark = document.documentElement.classList.contains('dark');
    const backgroundColor = isDark ? '#020617' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const borderColor = isDark ? '#1e293b' : '#e2e8f0';

    // Create a temporary container for export
    const container = document.createElement('div');
    container.id = 'export-container';
    if (isDark) container.classList.add('dark');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1200px';
    container.style.zIndex = '-100';
    container.style.backgroundColor = backgroundColor;
    container.style.color = textColor;
    container.style.padding = '60px';
    container.style.fontFamily = '"Manrope", sans-serif';
    document.body.appendChild(container);

    // Add Title
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '40px';
    header.style.borderBottom = `2px solid ${borderColor}`;
    header.style.paddingBottom = '20px';

    const titleContainer = document.createElement('div');
    const title = document.createElement('h1');
    title.innerText = 'ФИНАНСОВЫЙ ОТЧЕТ (PDF)';
    title.style.fontSize = '28px';
    title.style.fontWeight = '900';
    title.style.letterSpacing = '-1px';
    title.style.margin = '0';
    titleContainer.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.innerText = `Сформировано в Sproutly Pro • ${format(new Date(), 'dd.MM.yyyy HH:mm')}`;
    subtitle.style.fontSize = '12px';
    subtitle.style.opacity = '0.6';
    subtitle.style.margin = '4px 0 0 0';
    titleContainer.appendChild(subtitle);
    header.appendChild(titleContainer);

    const logo = document.createElement('div');
    logo.innerHTML = '<span style="font-weight: 900; font-size: 20px; color: #2563eb;">SPROUTLY</span>';
    header.appendChild(logo);
    container.appendChild(header);

    // Add Summary if provided
    if (summary) {
      const summaryGrid = document.createElement('div');
      summaryGrid.style.display = 'grid';
      summaryGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
      summaryGrid.style.gap = '20px';
      summaryGrid.style.marginBottom = '40px';

      const createStat = (label: string, value: string, color: string = textColor) => {
        const div = document.createElement('div');
        div.style.padding = '20px';
        div.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc';
        div.style.borderRadius = '16px';
        div.style.border = `1px solid ${borderColor}`;
        div.innerHTML = `
          <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; opacity: 0.5; margin-bottom: 8px;">${label}</p>
          <p style="font-size: 20px; font-weight: 900; color: ${color};">${value}</p>
        `;
        return div;
      };

      summaryGrid.appendChild(createStat('Общий Gross', summary.totalGross?.toLocaleString('ru-RU') + ' ₽'));
      summaryGrid.appendChild(createStat('Чистый Net', summary.totalNet?.toLocaleString('ru-RU') + ' ₽', '#10b981'));
      summaryGrid.appendChild(createStat('Всего налогов', summary.totalTax?.toLocaleString('ru-RU') + ' ₽', '#ef4444'));
      summaryGrid.appendChild(createStat('Эфф. ставка', (summary.effectiveRate || 0).toFixed(1) + ' %', '#6366f1'));
      
      container.appendChild(summaryGrid);
    }

    // Clone and add the dashboard/element
    const clone = element.cloneNode(true) as HTMLElement;
    // Remove export buttons from clone if they exist
    const exportButtons = clone.querySelectorAll('button');
    exportButtons.forEach(btn => btn.remove());
    container.appendChild(clone);

    // Add Table if deposits provided
    if (deposits && deposits.length > 0) {
      const tableTitle = document.createElement('h2');
      tableTitle.innerText = 'Список вкладов';
      tableTitle.style.fontSize = '24px';
      tableTitle.style.fontWeight = '800';
      tableTitle.style.marginTop = '48px';
      tableTitle.style.marginBottom = '16px';
      container.appendChild(tableTitle);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '12px';
      
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="border-bottom: 2px solid ${borderColor}; text-align: left;">
          <th style="padding: 12px 8px;">Банк</th>
          <th style="padding: 12px 8px;">Ставка</th>
          <th style="padding: 12px 8px;">Срок</th>
          <th style="padding: 12px 8px;">Сумма</th>
          <th style="padding: 12px 8px;">Статус</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      deposits.forEach(d => {
        const row = document.createElement('tr');
        row.style.borderBottom = `1px solid ${borderColor}`;
        row.innerHTML = `
          <td style="padding: 12px 8px; font-weight: 700;">${d.bank}</td>
          <td style="padding: 12px 8px; color: #10b981; font-weight: 800;">${d.rate}%</td>
          <td style="padding: 12px 8px;">${format(new Date(d.startDate), 'dd.MM.yy')} - ${d.endDate ? format(new Date(d.endDate), 'dd.MM.yy') : '...'}</td>
          <td style="padding: 12px 8px; font-weight: 700;">${d.amount.toLocaleString('ru-RU')} ${d.currency}</td>
          <td style="padding: 12px 8px;">${d.isClosed ? 'Закрыт' : 'Активен'}</td>
        `;
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    }

    const dataUrl = await htmlToImage.toPng(container, {
      backgroundColor,
      pixelRatio: 2,
    });
    
    // Cleanup
    document.body.removeChild(container);

    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => img.onload = resolve);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [img.width, img.height]
    });
    
    pdf.save(`sproutly_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return false;
  }
};

export const exportToImage = async (elementId: string, deposits?: Deposit[]) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // Small delay to ensure any transitions are finished
    await new Promise(resolve => setTimeout(resolve, 300));

    const isDark = document.documentElement.classList.contains('dark');
    const backgroundColor = isDark ? '#020617' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const borderColor = isDark ? '#1e293b' : '#e2e8f0';

    // Create a temporary container for export
    const container = document.createElement('div');
    container.id = 'export-container-img';
    if (isDark) container.classList.add('dark');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1200px';
    container.style.zIndex = '-100';
    container.style.backgroundColor = backgroundColor;
    container.style.color = textColor;
    container.style.padding = '60px';
    container.style.fontFamily = '"Manrope", sans-serif';
    document.body.appendChild(container);

    // Add Title
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '40px';
    header.style.borderBottom = `2px solid ${borderColor}`;
    header.style.paddingBottom = '20px';

    const titleContainer = document.createElement('div');
    const title = document.createElement('h1');
    title.innerText = 'ФИНАНСОВЫЙ ОТЧЕТ (IMG)';
    title.style.fontSize = '28px';
    title.style.fontWeight = '900';
    title.style.letterSpacing = '-1px';
    title.style.margin = '0';
    titleContainer.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.innerText = `Сформировано в Sproutly Pro • ${format(new Date(), 'dd.MM.yyyy HH:mm')}`;
    subtitle.style.fontSize = '12px';
    subtitle.style.opacity = '0.6';
    subtitle.style.margin = '4px 0 0 0';
    titleContainer.appendChild(subtitle);
    header.appendChild(titleContainer);

    const logo = document.createElement('div');
    logo.innerHTML = '<span style="font-weight: 900; font-size: 20px; color: #2563eb;">SPROUTLY</span>';
    header.appendChild(logo);
    container.appendChild(header);

    // Clone and add the dashboard/element
    const clone = element.cloneNode(true) as HTMLElement;
    // Remove export buttons from clone if they exist
    const exportButtons = clone.querySelectorAll('button');
    exportButtons.forEach(btn => btn.remove());
    container.appendChild(clone);

    // Add Table if deposits provided
    if (deposits && deposits.length > 0) {
      const tableTitle = document.createElement('h2');
      tableTitle.innerText = 'Список вкладов';
      tableTitle.style.fontSize = '24px';
      tableTitle.style.fontWeight = '800';
      tableTitle.style.marginTop = '48px';
      tableTitle.style.marginBottom = '16px';
      container.appendChild(tableTitle);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '12px';
      
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="border-bottom: 2px solid ${borderColor}; text-align: left;">
          <th style="padding: 12px 8px;">Банк</th>
          <th style="padding: 12px 8px;">Ставка</th>
          <th style="padding: 12px 8px;">Срок</th>
          <th style="padding: 12px 8px;">Сумма</th>
          <th style="padding: 12px 8px;">Статус</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      deposits.forEach(d => {
        const row = document.createElement('tr');
        row.style.borderBottom = `1px solid ${borderColor}`;
        row.innerHTML = `
          <td style="padding: 12px 8px; font-weight: 700;">${d.bank}</td>
          <td style="padding: 12px 8px; color: #10b981; font-weight: 800;">${d.rate}%</td>
          <td style="padding: 12px 8px;">${format(new Date(d.startDate), 'dd.MM.yy')} - ${d.endDate ? format(new Date(d.endDate), 'dd.MM.yy') : '...'}</td>
          <td style="padding: 12px 8px; font-weight: 700;">${d.amount.toLocaleString('ru-RU')} ${d.currency}</td>
          <td style="padding: 12px 8px;">${d.isClosed ? 'Закрыт' : 'Активен'}</td>
        `;
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    }

    const dataUrl = await htmlToImage.toPng(container, {
      backgroundColor,
      pixelRatio: 2,
    });
    
    // Cleanup
    document.body.removeChild(container);

    const link = document.createElement('a');
    link.download = `sproutly_report_${format(new Date(), 'yyyy-MM-dd')}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exporting to image:', error);
  }
};
