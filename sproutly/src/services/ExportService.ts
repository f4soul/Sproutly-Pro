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

export const exportToPDF = async (elementId: string, deposits?: Deposit[]) => {
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
    const title = document.createElement('h1');
    title.innerText = 'Sproutly - Отчет по вкладам';
    title.style.fontSize = '32px';
    title.style.fontWeight = '900';
    title.style.marginBottom = '24px';
    container.appendChild(title);

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
    
    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
    pdf.save(`sproutly_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
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
    const title = document.createElement('h1');
    title.innerText = 'Sproutly - Отчет по вкладам';
    title.style.fontSize = '32px';
    title.style.fontWeight = '900';
    title.style.marginBottom = '24px';
    container.appendChild(title);

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
