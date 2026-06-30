import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';
import * as XLSX from 'xlsx';
import { Deposit, MonthData } from '../types';
import { format } from 'date-fns';
import { showToast } from '../lib/toast';
import { isDepositClosed } from '../lib/depositCalculations';

export const exportToXLSX = (deposits: Deposit[]) => {
  const toastId = 'export-xlsx';
  try {
    showToast('Формирование XLSX...', 'loading', { id: toastId, duration: Infinity });
    // Sort deposits by active/closed and date
    const sortedDeposits = [...deposits].sort((a, b) => {
      const aClosed = isDepositClosed(a);
      const bClosed = isDepositClosed(b);
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    let totalAmount = 0;
    const data = sortedDeposits.map(d => {
      totalAmount += d.amount;
      return {
        'Банк': d.bank,
        'Сумма': d.amount,
        'Валюта': (d.currency && d.currency !== 'undefined' ? d.currency : '₽'),
        'Ставка (%)': d.rate,
        'Дата открытия': format(new Date(d.startDate), 'dd.MM.yyyy'),
        'Дата закрытия': function() {
            if (!d.endDate) return '...';
            const endStr = String(d.endDate);
            if(endStr.includes('1970-01-01') || endStr === '') return '...';
            return format(new Date(d.endDate), 'dd.MM.yyyy');
        }(),
        'Статус': isDepositClosed(d) ? 'Закрыт' : 'Активен',
        'Комментарий': d.comment || ''
      };
    });

    data.push({
      'Банк': 'ИТОГО:',
      'Сумма': totalAmount,
      'Валюта': '',
      'Ставка (%)': '',
      'Дата открытия': '',
      'Дата закрытия': '',
      'Статус': '',
      'Комментарий': ''
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add currency formatting for "Сумма" column (index 1) and freeze first row
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:H1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      // Cell B{R} (Сумма)
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: 1 });
      const cell = worksheet[cellAddress];
      if (cell && cell.t === 'n' && R > 0) {
        cell.z = '#,##0.00 ₽';
      }
    }
    // Freeze the first row
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" } as any;

    worksheet['!cols'] = [
      { wch: 25 }, // Банк
      { wch: 18 }, // Сумма
      { wch: 10 }, // Валюта
      { wch: 12 }, // Ставка
      { wch: 15 }, // Дата открытия
      { wch: 15 }, // Дата закрытия
      { wch: 12 }, // Статус
      { wch: 45 }  // Комментарий
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Вклады');
    XLSX.writeFile(workbook, `sproutly_deposits_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    showToast('Данные успешно экспортированы в XLSX', 'success', { id: toastId });
  } catch {
    showToast('Ошибка при экспорте в XLSX', 'error', { id: toastId });
  }
};

export const exportOverviewToXLSX = (data: any, year: number) => {
  const toastId = 'export-overview-xlsx';
  try {
    showToast('Формирование сводки XLSX...', 'loading', { id: toastId, duration: Infinity });
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
    
    // Add currency formatting for "Значение" column (index 1) and freeze first row
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:B1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: 1 });
      const cell = worksheet[cellAddress];
      if (cell && cell.t === 'n' && R > 0) {
        // Only format as currency if it's not the "Year" row (R === 1)
        if (summaryData[R - 1] && summaryData[R - 1]['Показатель'] !== 'Год') {
          cell.z = '#,##0.00 ₽';
        }
      }
    }
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" } as any;

    worksheet['!cols'] = [
      { wch: 25 }, // Показатель
      { wch: 20 }  // Значение
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Сводка');
    XLSX.writeFile(workbook, `overview_export_${year}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    showToast('Сводка успешно экспортирована в XLSX', 'success', { id: toastId });
  } catch {
    showToast('Ошибка при экспорте сводки', 'error', { id: toastId });
  }
};

export const exportIncomeToXLSX = (months: any[], year: number, totals: any) => {
  const toastId = 'export-income-xlsx';
  try {
    showToast('Формирование доходов XLSX...', 'loading', { id: toastId, duration: Infinity });
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const data = months.map((m, i) => ({
      'Месяц': monthNames[i] || '',
      'Дни (Норма)': m.normDays,
      'Дни (Факт)': m.factDays,
      'Оклад (Gross)': m.base,
      'Премия (Gross)': m.bonus,
      'Итого (Gross)': m.gross,
      'Налог (13%)': m.tax13,
      'На руки (Net)': m.net13
    }));

    // Add totals row
    data.push({
      'Месяц': 'ИТОГО',
      'Дни (Норма)': '',
      'Дни (Факт)': '',
      'Оклад (Gross)': '',
      'Премия (Gross)': '',
      'Итого (Gross)': totals.totalGross,
      'Налог (13%)': totals.progressiveTax,
      'На руки (Net)': totals.finalNet
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add currency formatting for monetary columns and freeze first row
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:H1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = 3; C <= 7; ++C) { // Columns D to H (Оклад to На руки)
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.t === 'n' && R > 0) {
          cell.z = '#,##0.00 ₽';
        }
      }
    }
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" } as any;

    worksheet['!cols'] = [
      { wch: 15 }, // Месяц
      { wch: 15 }, // Дни Норма
      { wch: 15 }, // Дни Факт
      { wch: 15 }, // Оклад
      { wch: 15 }, // Премия
      { wch: 15 }, // Итого
      { wch: 15 }, // Налог
      { wch: 15 }  // На руки
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Доходы ${year}`);
    XLSX.writeFile(workbook, `income_export_${year}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    showToast('Доходы успешно экспортированы в XLSX', 'success', { id: toastId });
  } catch {
    showToast('Ошибка при экспорте доходов', 'error', { id: toastId });
  }
};

export const buildExportContainer = (elementId: string | null, summary?: any, deposits?: Deposit[], incomeData?: { months: any[], totals: any }) => {
  const isDark = document.documentElement.classList.contains('dark');
  const backgroundColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';

  const container = document.createElement('div');
  container.id = 'export-container';
  if (isDark) container.classList.add('dark');
  else container.classList.remove('dark');
  
  container.style.position = 'fixed'; 
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = backgroundColor;
  container.style.color = textColor;
  container.style.padding = '60px';
  container.style.fontFamily = '"Inter", system-ui, -apple-system, sans-serif';
  document.body.appendChild(container);

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '40px';
  header.style.borderBottom = `2px solid ${borderColor}`;
  header.style.paddingBottom = '20px';

  const titleContainer = document.createElement('div');
  const title = document.createElement('h1');
  title.innerText = deposits && !summary ? 'ОТЧЕТ: ВКЛАДЫ' : (incomeData ? 'ОТЧЕТ: ДОХОДЫ' : 'ФИНАНСОВЫЙ ОТЧЕТ');
  title.style.fontSize = '28px';
  title.style.fontWeight = '900';
  title.style.letterSpacing = '-1px';
  title.style.margin = '0';
  titleContainer.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.innerText = `Сформировано • ${format(new Date(), 'dd.MM.yyyy HH:mm')}`;
  subtitle.style.fontSize = '12px';
  subtitle.style.opacity = '0.6';
  subtitle.style.margin = '4px 0 0 0';
  titleContainer.appendChild(subtitle);
  header.appendChild(titleContainer);

  const logo = document.createElement('div');
  logo.style.flexShrink = '0';
  logo.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <svg width="24" height="24" viewBox="0 0 986 1000" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: #10b981;">
        <path d="M958.762 0.475742C965.142 -0.0745192 985.062 -1.92038 985.272 8.69313C985.832 35.8013 983.189 64.0776 981.541 91.2782L974.034 216.344C971.896 251.575 969.06 285.25 964.536 320.081C956.585 381.31 913.614 412.542 872.997 453.33C859.963 466.419 849.183 479.164 833.834 490.099C802.434 512.467 767.141 514.899 730.147 517.643L670.069 521.964C646.853 523.666 623.654 526.115 600.415 526.977C585.361 527.529 587.203 518.412 587.18 507.143C587.156 496.837 589.029 482.498 594.19 473.429C605.203 454.05 620.903 435.952 634.496 418.087C666.672 375.798 699.361 333.904 732.556 292.41C745.325 276.316 760.706 259.488 771.424 242.229C776.779 233.613 782.274 208.889 780.688 198.941C778.015 196.143 776.686 195.284 773.476 193.055C738.602 194.234 719.763 210.821 693.797 231.6C678.354 243.952 663.004 256.413 647.739 268.983C582.594 322.313 522.687 365.061 469.192 431.424C468.842 418.824 470.373 404.045 471.283 391.245L474.827 337.946C477.866 294.284 478.946 245.797 488.482 202.924C492.485 184.925 504.726 160.875 516.982 147.048C541.371 119.529 569.032 93.9782 595.776 68.7478C610.643 54.6571 624.384 42.4324 642.991 33.437C671.553 19.6292 700.551 18.3911 731.398 16.7753C749.297 15.8543 767.188 14.8408 785.079 13.7341C843.02 9.96466 900.914 5.54468 958.762 0.475742Z" fill="currentColor"/>
        <path d="M7.91357 192.974C21.3647 192.421 40.7015 194.305 54.4791 195.309C76.5136 196.885 98.5567 198.341 120.607 199.677L196.064 204.018C212.179 204.789 230.095 204.663 245.885 206.803C257.502 208.41 268.84 211.619 279.577 216.338C310.174 229.954 337.53 263.844 362.746 285.925C378.413 299.644 389.099 314.175 396.601 333.755C400.366 343.66 403.126 353.918 404.842 364.373C407.436 380.038 421.308 506.576 418.184 513.57C415.858 514.192 413.991 515.055 411.837 514.262C393.181 495.205 364.969 474.047 343.968 457.675C320.142 439.369 296.746 420.181 272.39 402.605C247.798 384.858 226.503 361.162 197.32 350.928C191.66 348.944 177.295 346.108 172.062 348.778C170.115 350.711 170.248 351.758 169.851 354.497L169.722 355.456C170.976 363.541 174.346 382.478 178.987 389.055C189.859 404.459 205.412 421.489 217.709 435.938C238.513 460.427 259.095 485.101 279.457 509.956C290.805 523.845 301.431 536.583 312.549 551.475C323.211 564.796 328.321 582.229 327.182 599.164C326.422 605.11 321.255 607.55 315.972 607.317C274.024 605.428 232.09 603.283 190.189 600.431C169.198 599.001 139.905 591.493 123.728 577.169C107.816 563.086 92.0538 548.436 76.3994 534.034C66.6579 525.073 55.8811 515.171 46.9922 505.41C42.5863 500.661 38.6761 495.477 35.3225 489.928C27.1945 476.474 22.8934 459.549 20.2144 444.195C17.0061 425.804 -2.20875 207.944 0.209916 200.201C1.27935 196.779 5.0107 194.613 7.91357 192.974Z" fill="currentColor"/>
        <path d="M713.444 249.306C714.556 249.77 713.957 249.39 714.991 250.77C712.955 260.616 691.061 291.238 684.431 301.832L609.921 419.445C578.133 470.084 553.9 504.158 535.876 563.125C524.646 598.853 518.008 635.864 516.127 673.263C514.985 696.33 516.12 724.092 516.516 747.307C517.472 784.349 517.542 821.406 516.726 858.448C516.361 872.546 516.687 901.808 511.231 914.266C503.272 932.461 473.14 953.811 457.371 965.935C442.905 977.065 425.874 993.425 409.31 1000C406.83 998.01 402.444 994.824 402.079 991.49C401.225 983.694 401.629 975.075 401.749 967.217C402.023 955.839 402.045 944.461 401.817 933.083C401.108 889.816 401.957 846.331 401.155 802.893C400.253 754.046 401.313 716.242 389.49 668.615C376.785 620.11 357.749 590.63 331.434 549.602C315.472 524.63 298.83 500.101 281.528 476.041C264.37 452.146 243.859 424.444 230.099 398.879C254.578 411.429 282.533 434.611 304.832 451.454C344.851 481.682 388.39 510.679 417.677 552.081C423.765 560.685 428.913 569.591 435.465 577.939C435.974 564.679 442.259 538.255 446.055 525.166C473.14 432.593 555.982 371.918 627.68 314.1C652.814 293.831 685.69 264.456 713.444 249.306Z" fill="currentColor"/>
      </svg>
      <span style="font-weight: 900; font-size: 24px; color: ${textColor}; font-family: 'JetBrains Mono', 'Inter', system-ui, sans-serif; letter-spacing: -2px; text-transform: uppercase; white-space: nowrap;">
        SPROUTLY<span style="display: inline-block; width: 6px; height: 6px; background-color: #3b82f6; border-radius: 50%; margin: 0 4px; vertical-align: middle;"></span>PRO
      </span>
    </div>
  `;
  header.appendChild(logo);
  container.appendChild(header);

  if (summary) {
    const summaryGrid = document.createElement('div');
    summaryGrid.style.display = 'flex';
    summaryGrid.style.justifyContent = 'space-between';
    summaryGrid.style.gap = '20px';
    summaryGrid.style.marginBottom = '40px';

    const createStat = (label: string, value: string, color: string = textColor) => {
      const div = document.createElement('div');
      div.style.flex = '1';
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

    summaryGrid.appendChild(createStat('Общий Gross', (summary.totalGross || 0).toLocaleString('ru-RU') + ' ₽'));
    summaryGrid.appendChild(createStat('Чистый Net', (summary.totalNet || 0).toLocaleString('ru-RU') + ' ₽', '#3b82f6'));
    summaryGrid.appendChild(createStat('Всего налогов', (summary.totalTax || 0).toLocaleString('ru-RU') + ' ₽', '#ef4444'));
    summaryGrid.appendChild(createStat('Эфф. ставка', (summary.effectiveRate || 0).toFixed(1) + ' %', '#6366f1'));
    
    container.appendChild(summaryGrid);
  }

  const element = elementId ? document.getElementById(elementId) : null;
  if (element && !incomeData) {
    const clone = element.cloneNode(true) as HTMLElement;
    
    const inputs = clone.querySelectorAll('input');
    inputs.forEach(input => {
      const span = document.createElement('span');
      span.innerText = input.value;
      span.className = input.className;
      input.parentNode?.replaceChild(span, input);
    });

    const buttons = clone.querySelectorAll('button');
    buttons.forEach(btn => btn.remove());
    
    const tabs = clone.querySelectorAll('.YearTabs');
    tabs.forEach(tab => tab.remove());

    container.appendChild(clone);
  }

  if (incomeData) {
    const tableTitle = document.createElement('h2');
    tableTitle.innerText = 'Список доходов';
    tableTitle.style.fontSize = '24px';
    tableTitle.style.fontWeight = '800';
    tableTitle.style.marginTop = '40px';
    tableTitle.style.paddingTop = '0px';
    tableTitle.style.display = 'none'; // Avoid secondary title since it's already in the main header
    tableTitle.style.marginBottom = '16px';
    container.appendChild(tableTitle);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="border-bottom: 2px solid ${borderColor}; text-align: left;">
        <th style="padding: 12px 8px 12px 0;">Месяц</th>
        <th style="padding: 12px 8px;">Дни (Норма/Факт)</th>
        <th style="padding: 12px 8px;">Оклад</th>
        <th style="padding: 12px 8px;">Премия</th>
        <th style="padding: 12px 8px;">Итого (Gross)</th>
        <th style="padding: 12px 8px;">Налог</th>
        <th style="padding: 12px 0 12px 8px;">На руки (Net)</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    incomeData.months.forEach((m, index) => {
      const row = document.createElement('tr');
      row.style.borderBottom = `1px solid ${borderColor}`;
      row.innerHTML = `
        <td style="padding: 12px 8px 12px 0; font-weight: 700;">${monthNames[index] || ''}</td>
        <td style="padding: 12px 8px;">${m.normDays} / ${m.factDays}</td>
        <td style="padding: 12px 8px;">${(m.base || 0).toLocaleString('ru-RU')} ₽</td>
        <td style="padding: 12px 8px;">${(m.bonus || 0).toLocaleString('ru-RU')} ₽</td>
        <td style="padding: 12px 8px;">${(m.gross || 0).toLocaleString('ru-RU')} ₽</td>
        <td style="padding: 12px 8px; color: #ef4444;">${(m.tax13 || 0).toLocaleString('ru-RU')} ₽</td>
        <td style="padding: 12px 0 12px 8px; color: #3b82f6; font-weight: 800;">${(m.net13 || 0).toLocaleString('ru-RU')} ₽</td>
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  if (deposits && deposits.length > 0) {
    const tableTitle = document.createElement('h2');
    tableTitle.innerText = 'Список вкладов';
    tableTitle.style.fontSize = '24px';
    tableTitle.style.fontWeight = '800';
    tableTitle.style.marginTop = '20px';
    tableTitle.style.marginBottom = '16px';
    container.appendChild(tableTitle);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="border-bottom: 2px solid ${borderColor}; text-align: left;">
        <th style="padding: 12px 8px 12px 0;">Банк</th>
        <th style="padding: 12px 8px;">Ставка</th>
        <th style="padding: 12px 8px;">Срок</th>
        <th style="padding: 12px 8px;">Сумма</th>
        <th style="padding: 12px 0 12px 8px;">Статус</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    deposits.forEach(d => {
      const row = document.createElement('tr');
      row.style.borderBottom = `1px solid ${borderColor}`;
      row.innerHTML = `
        <td style="padding: 12px 8px 12px 0; font-weight: 700;">${d.bank}</td>
        <td style="padding: 12px 8px; color: #14b8a6; font-weight: 800;">${d.rate}%</td>
        <td style="padding: 12px 8px;">${format(new Date(d.startDate), 'dd.MM.yy')} - ${d.endDate ? format(new Date(d.endDate), 'dd.MM.yy') : '...'}</td>
        <td style="padding: 12px 8px; font-weight: 700;">${d.amount.toLocaleString('ru-RU')} ${(d.currency && d.currency !== 'undefined' ? d.currency : '₽')}</td>
        <td style="padding: 12px 0 12px 8px;">${isDepositClosed(d) ? 'Закрыт' : 'Активен'}</td>
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  return { container, backgroundColor };
};

export const exportToPDF = async (elementId: string | null, summary?: any, deposits?: Deposit[], incomeData?: { months: any[], totals: any }) => {
  const toastId = 'export-pdf';
  const element = elementId ? document.getElementById(elementId) : null;
  if (!element && !deposits && !incomeData) {
    console.error(`Element with id ${elementId} not found`);
    showToast('Ошибка: нечего экспортировать', 'error');
    return false;
  }

  showToast('Формирование PDF...', 'loading', { id: toastId, duration: Infinity });

  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { container, backgroundColor } = buildExportContainer(elementId, summary, deposits, incomeData);

    const dataUrl = await htmlToImage.toPng(container, {
      backgroundColor,
      pixelRatio: 2,
      skipAutoScale: true
    });
    
    document.body.removeChild(container);

    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => img.onload = resolve);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidthPx = img.width;
    const imgHeightPx = img.height;
    
    // Dimensions of the complete image when scaled to fit PDF width
    const renderWidthMm = pdfWidth;
    const renderHeightMm = (imgHeightPx * pdfWidth) / imgWidthPx;
    
    // Height of one PDF page mapped to the original image pixels
    const pageHeightPx = (pdfHeight / pdfWidth) * imgWidthPx;
    
    let heightLeftPx = imgHeightPx;
    let positionMm = 0;

    // Render first page
    pdf.addImage(dataUrl, 'PNG', 0, positionMm, renderWidthMm, renderHeightMm);
    heightLeftPx -= pageHeightPx;

    // Render subsequent pages
    const PADDING_TOLERANCE_PX = 70; // чуть больше bottom-padding контейнера (60px), с небольшим запасом
    while (heightLeftPx > PADDING_TOLERANCE_PX) {
      positionMm -= pdfHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, positionMm, renderWidthMm, renderHeightMm);
      heightLeftPx -= pageHeightPx;
    }
    
    pdf.save(`export_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    showToast('PDF успешно сохранен', 'success', { id: toastId });
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    showToast('Ошибка при формировании PDF', 'error', { id: toastId });
    return false;
  }
};

export const exportToImage = async (elementId: string, deposits?: Deposit[]) => {
  const toastId = 'export-image';
  const element = elementId ? document.getElementById(elementId) : null;
  if (!element && !deposits) {
    console.error(`Element with id ${elementId} not found`);
    showToast('Ошибка: нечего экспортировать', 'error');
    return false;
  }

  showToast('Формирование изображения...', 'loading', { id: toastId, duration: Infinity });

  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { container, backgroundColor } = buildExportContainer(elementId, undefined, deposits, undefined);

    const dataUrl = await htmlToImage.toPng(container, {
      backgroundColor,
      pixelRatio: 2,
      skipAutoScale: true
    });
    
    document.body.removeChild(container);

    const link = document.createElement('a');
    link.download = `export_${format(new Date(), 'yyyy-MM-dd')}.png`;
    link.href = dataUrl;
    link.click();
    showToast('Изображение успешно сохранено', 'success', { id: toastId });
    return true;
  } catch (error) {
    console.error('Error exporting to image:', error);
    showToast('Ошибка при формировании изображения', 'error', { id: toastId });
    return false;
  }
};
