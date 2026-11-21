import DistrbutorInvoiceModal from "../Modal/DistrbutorInvoiceModal.js";
import { loadClientLedger } from "./invoiceKnockOff.js";

const DAY = 24 * 60 * 60 * 1000;

export const checkCreditLimit = async (dist, newAmount = 0) => {
    if (!dist) return { allowed: true };

    newAmount = Number(newAmount) || 0;

    const isAdvanceOnly =
        String(dist.CreditLimit || "").trim().toLowerCase() === "advance";

    // Advance customer: ledger minus (advance) mein ho aur order amount se kam na ho
    if (isAdvanceOnly) {
        const ledger = Number(await loadClientLedger(dist._id)) || 0;
        const advance = ledger < 0 ? Math.abs(ledger) : 0;

        console.log("advance check:", { ledger, advance, newAmount });

        if (newAmount <= advance) {
            return { allowed: true, ledger, advance };
        }
        return {
            allowed: false,
            reasons: [
                `Advance customer: order ${newAmount} > available advance ${advance} (ledger ${ledger})`,
            ],
        };
    }

    // Normal credit customer
    const limitAmt = Number(dist.CreditLimit) || 0;
    const limitDays = Number(dist.CreditDays) || 0;
    if (!limitAmt && !limitDays) return { allowed: true };

    const invoices = await DistrbutorInvoiceModal.find({ Distrbutor: dist._id })
        .select("InvoiceDate Remaining")
        .lean();

    const unpaid = invoices
        .filter((i) => Number(i.Remaining) > 1)
        .sort((a, b) => new Date(a.InvoiceDate) - new Date(b.InvoiceDate));

    const pending = unpaid.reduce((s, i) => s + Number(i.Remaining), 0);
    const oldest = unpaid[0];
    const daysUsed = oldest
        ? Math.floor((Date.now() - new Date(oldest.InvoiceDate)) / DAY)
        : 0;

    const ledger = Number(await loadClientLedger(dist._id)) || 0;
    const hasAdvance = ledger < 0;
    const advance = hasAdvance ? Math.abs(ledger) : 0;

    let amountOk = true;
    let amountReason = "";

    if (limitAmt && hasAdvance) {
        const available = advance + limitAmt;
        amountOk = newAmount <= available;
        amountReason = `Amount limit exceeded (order ${newAmount} > advance ${advance} + credit limit ${limitAmt} = ${available})`;
    } else if (limitAmt) {
        amountOk = pending + newAmount <= limitAmt;
        amountReason = `Amount limit exceeded (pending ${pending} + order ${newAmount} > limit ${limitAmt})`;
    }

    const daysOk = hasAdvance || !limitDays || daysUsed <= limitDays;

    console.log("credit check:", { ledger, pending, daysUsed, oldest });

    if (amountOk && daysOk) return { allowed: true, pending, oldest, daysUsed };

    const reasons = [];
    if (!amountOk) reasons.push(amountReason);
    if (!daysOk) {
        reasons.push(
            `Oldest unpaid invoice is ${daysUsed} days old (limit ${limitDays} days)`
        );
    }
    return { allowed: false, reasons };
};
    if (!dist) return { allowed: true };

    newAmount = Number(newAmount) || 0;

    const isAdvanceOnly =
        String(dist.CreditLimit || "").trim().toLowerCase() === "advance";

    // Advance customer: ledger minus (advance) mein ho aur order amount se kam na ho
    if (isAdvanceOnly) {
        const ledger = Number(await loadClientLedger(dist._id)) || 0;
        const advance = ledger < 0 ? Math.abs(ledger) : 0;

        console.log("advance check:", { ledger, advance, newAmount });

        if (newAmount <= advance) {
            return { allowed: true, ledger, advance };
        }
        return {
            allowed: false,
            reasons: [
                `Advance customer: order ${newAmount} > available advance ${advance} (ledger ${ledger})`,
            ],
        };
    }

    // Normal credit customer
    const limitAmt = Number(dist.CreditLimit) || 0;
    const limitDays = Number(dist.CreditDays) || 0;
    if (!limitAmt && !limitDays) return { allowed: true };

    const invoices = await DistrbutorInvoiceModal.find({ Distrbutor: dist._id })
        .select("InvoiceDate Remaining")
        .lean();

    const unpaid = invoices
        .filter((i) => Number(i.Remaining) > 1)
        .sort((a, b) => new