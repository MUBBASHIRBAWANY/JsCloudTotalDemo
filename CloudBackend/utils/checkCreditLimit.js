import DistrbutorInvoiceModal from "../Modal/DistrbutorInvoiceModal.js";

const DAY = 24 * 60 * 60 * 1000;

export const checkCreditLimit = async (dist, newAmount = 0) => {
    if (!dist) return { allowed: true };

    const limitAmt = Number(dist.CreditLimit) || 0;
    const limitDays = Number(dist.CreditDays) || 0;
    if (!limitAmt && !limitDays) return { allowed: true };

    const invoices = await DistrbutorInvoiceModal.find({ Distrbutor: dist._id })
        .select("InvoiceDate Remaining")
        .lean();

    // JS filter so it works even if Remaining is stored as String
    const unpaid = invoices
        .filter((i) => Number(i.Remaining) > 1)
        .sort((a, b) => new Date(a.InvoiceDate) - new Date(b.InvoiceDate));

    const pending = unpaid.reduce((s, i) => s + Number(i.Remaining), 0);
    const oldest = unpaid[0];
    const daysUsed = oldest ? Math.floor((Date.now() - new Date(oldest.InvoiceDate)) / DAY) : 0;

    const amountOk = !limitAmt || pending + newAmount <= limitAmt;
    const daysOk = !limitDays || daysUsed <= limitDays;
    console.log("credit check:", { pending, daysUsed, oldest });

    if (amountOk && daysOk) return { allowed: true, pending, oldest, daysUsed };

    const reasons = [];
    if (!amountOk) reasons.push(`Amount limit exceeded (pending ${pending} + order ${newAmount} > limit ${limitAmt})`);
    if (!daysOk) reasons.push(`Oldest unpaid invoice is ${daysUsed} days old (limit ${limitDays} days)`);
    return { allowed: false, reasons };
};
