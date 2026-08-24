export function formatMoney(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';
}

export function formatMoneyShort(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return '-';
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(s: string | null | undefined): string {
  if (!s) return '-';
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function hoursSince(s: string): number {
  return (Date.now() - new Date(s.replace(' ', 'T')).getTime()) / 3600000;
}

export function downloadCsvUrl(url: string) {
  const token = localStorage.getItem('mapassa_token') || '';
  const sep = url.includes('?') ? '&' : '?';
  window.open(`${url}${sep}token=${token}`, '_blank');
}

/**
 * Export an array of objects to an Excel-compatible file (SpreadsheetML / .xls).
 * Opens cleanly in Excel and LibreOffice with proper UTF-8 and column formatting.
 */
export function exportToExcel(
  filename: string,
  headers: { key: string; label: string }[],
  rows: Record<string, unknown>[],
  sheetTitle: string,
) {
  const escapeXml = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const headerRow = `<tr>${headers.map(h => `<th style="background:#1e40af;color:white;font-weight:bold;padding:6px 10px;border:1px solid #93c5fd;font-size:12px">${escapeXml(h.label)}</th>`).join('')}</tr>`;
  const dataRows = rows.map((r, i) => {
    const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
    return `<tr>${headers.map(h => `<td style="background:${bg};padding:5px 10px;border:1px solid #e2e8f0;font-size:11px;mso-number-format:'\\@'">${escapeXml(r[h.key])}</td>`).join('')}</tr>`;
  }).join('');

  const tableXml = `<table border="1">${headerRow}${dataRows}</table>`;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><style>td{mso-number-format:'\\@'}</style></head>
<body><h3 style="color:#1e40af;font-family:Arial">${escapeXml(sheetTitle)}</h3>${tableXml}</body></html>`;

  const blob = new Blob(['\uFEFF', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Calculate the maximum withdrawal for a classic card client.
 *
 * Classic card: 31 carreaux, fixed_amount per carreau.
 * Client saves 30 carreaux (fixed_amount * 30), company takes 1 carreau (fixed_amount) as profit.
 *
 * Withdrawable = totalDeposits - totalWithdrawals - (2 * fixedAmount)
 *   - 1 carreau = company profit (the 31st carreau)
 *   - 1 carreau = minimum balance kept locked until card completion
 *
 * Example: fixed_amount=500, 5 deposits = 2500, 0 withdrawals
 *   withdrawable = 2500 - 0 - (2*500) = 1500
 *
 * For COMPTE_LIBRE: withdrawable = balance (deposits - withdrawals).
 */
export function calculateMaxWithdrawal(
  accountType: string,
  fixedAmount: number,
  totalDeposits: number,
  totalWithdrawals: number,
): { maxWithdrawal: number; expectedTotal: number; companyProfit: number; clientSaving: number; carreauxPaid: number; carreauxRemaining: number; lockedAmount: number } {
  if (accountType === 'CARTE_CLASSIQUE' && fixedAmount > 0) {
    const expectedTotal = fixedAmount * 31;
    const companyProfit = fixedAmount;
    const clientSaving = fixedAmount * 30;
    const carreauxPaid = Math.floor(totalDeposits / fixedAmount);
    const carreauxRemaining = 31 - carreauxPaid;
    const lockedAmount = fixedAmount;
    const balance = totalDeposits - totalWithdrawals;
    const maxWithdrawal = Math.max(0, balance - companyProfit - lockedAmount);
    return { maxWithdrawal, expectedTotal, companyProfit, clientSaving, carreauxPaid, carreauxRemaining, lockedAmount };
  }
  return {
    maxWithdrawal: Math.max(0, totalDeposits - totalWithdrawals),
    expectedTotal: 0,
    companyProfit: 0,
    clientSaving: 0,
    carreauxPaid: 0,
    carreauxRemaining: 0,
    lockedAmount: 0,
  };
}
