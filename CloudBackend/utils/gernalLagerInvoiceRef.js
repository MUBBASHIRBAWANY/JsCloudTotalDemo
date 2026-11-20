export const isPrVoucher = (type, voucherNumber = "") => {
    const voucherType = String(type || "").trim().toLowerCase();
    if (voucherType === "pr") return true;
    return String(voucherNumber || "").trim().toLowerCase().startsWith("pr");
};

export const purchaseInvoiceNumberFromVoucher = (voucherNumber = "") => {
    const value = String(voucherNumber || "").trim();
    if (!value.toLowerCase().startsWith("pr")) return "";
    return value.slice(2);
};

export const collectPrPurchaseInvoiceNumbers = (rows = []) => {
    const numbers = new Set();
    for (const item of rows) {
        if (!isPrVoucher(item?.VoucherType, item?.VoucherNumber)) continue;
        if (item?.InvoiceRef) continue;
        const invoiceNumber = purchaseInvoiceNumberFromVoucher(item?.VoucherNumber);
        if (invoiceNumber) numbers.add(invoiceNumber);
    }
    return [...numbers];
};

export const attachPrInvoiceRefs = (rows = [], invoiceRefByPurchaseInvoice = {}) =>
    (rows || []).map((item) => {
        if (!isPrVoucher(item?.VoucherType, item?.VoucherNumber)) return item;
        if (item?.InvoiceRef) return item;
        const invoiceNumber = purchaseInvoiceNumberFromVoucher(item?.VoucherNumber);
        return {
            ...item,
            InvoiceRef: invoiceRefByPurchaseInvoice[invoiceNumber] || ""
        };
    });
