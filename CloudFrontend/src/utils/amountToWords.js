import { toWords } from "number-to-words";

export function amountToWords(amount) {
  if (amount === null || amount === undefined) {
    return "";
  }

  return `${toWords(Number(amount))} rupees only`
    .replace(/,/g, "")
    .replace(/\bzero\b/g, "")
    .trim()
    .toUpperCase();
}

// Helper to format amounts with commas (perfect for vouchers)
export const formatAmount = (value) => {
    if (value == null || value === '' || isNaN(value)) return '0';
    return parseFloat(value).toLocaleString('en-US');   // 1,234,567 (Pakistan-friendly)
};