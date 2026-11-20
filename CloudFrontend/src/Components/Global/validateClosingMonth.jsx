import { toast } from 'react-toastify';

/**
 * Check if a given date falls within any closed month
 */
export const isDateClosed = (dateString, userCloseMonthData) => {
  if (!dateString || !userCloseMonthData || userCloseMonthData.length === 0) {
    return false;
  }

  const voucherDate = new Date(dateString);
  const voucherYear = voucherDate.getFullYear();
  const voucherMonth = voucherDate.toLocaleString('default', { month: 'long' });
  const voucherMonthYear = `${voucherMonth} ${voucherYear}`;

  for (const yearEntry of userCloseMonthData) {
    if (yearEntry.months && yearEntry.months.includes(voucherMonthYear)) {
      return true;
    }
  }

  return false;
};

/**
 * Get detailed information about which closing year a date falls into
 */
export const getClosingYearInfo = (dateString, userCloseMonthData) => {
  if (!dateString || !userCloseMonthData || userCloseMonthData.length === 0) {
    return null;
  }

  const voucherDate = new Date(dateString);
  const voucherYear = voucherDate.getFullYear();
  const voucherMonth = voucherDate.toLocaleString('default', { month: 'long' });
  const voucherMonthYear = `${voucherMonth} ${voucherYear}`;

  for (const yearEntry of userCloseMonthData) {
    if (yearEntry.months && yearEntry.months.includes(voucherMonthYear)) {
      return yearEntry;
    }
  }

  return null;
};

/**
 * Get formatted month-year string from date
 */
export const getFormattedMonthYear = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

/**
 * Check if a date falls within a specific fiscal year
 */
export const isDateInFiscalYear = (dateString, yearKey) => {
  if (!dateString || !yearKey) return false;

  const [start, end] = yearKey.split(' to ');
  const date = new Date(dateString);
  const startDate = new Date(start);
  const endDate = new Date(end);

  return date >= startDate && date <= endDate;
};

/**
 * Get fiscal year for a given date
 */
export const getFiscalYearForDate = (dateString, userCloseMonthData) => {
  if (!dateString || !userCloseMonthData) return null;

  const voucherDate = new Date(dateString);

  for (const yearEntry of userCloseMonthData) {
    const [startDate, endDate] = yearEntry.year.split(' to ');
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (voucherDate >= start && voucherDate <= end) {
      return yearEntry;
    }
  }

  return null;
};

/**
 * Validate voucher date against closing months. Returns true if blocked.
 * Call at the top of onSubmit: if (validateClosingMonth(data.VoucherDate, loginVendor)) return;
 */
export const validateClosingMonth = (voucherDate, loginVendor) => {
  const userCloseMonthData = loginVendor?.userCloseMonth || [];

  if (isDateClosed(voucherDate, userCloseMonthData)) {
    const closingInfo = getClosingYearInfo(voucherDate, userCloseMonthData);
    const formattedDate = getFormattedMonthYear(voucherDate);
    const fiscalYear = closingInfo?.year || 'Unknown';

    toast.error(
      `Cannot create voucher for ${formattedDate}. ` +
      `This month is closed for fiscal year: ${fiscalYear}`
    );
    return true;
  }

  return false;
};
