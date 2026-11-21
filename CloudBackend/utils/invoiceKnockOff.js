import mongoose from "mongoose";
import SalesInvoiceModal from "../Modal/SalesInvoiceModal.js";
import InvoiceOpeningModal from "../Modal/OpeningInvoicesModal.js";
import DistrbutorInvoiceModal from "../Modal/DistrbutorInvoiceModal.js";
import DistrbutorModal from "../Modal/DistributerModal.js";
import VoucherModal from "../Modal/VoucherModal.js";
import ClientOpeningBalanceModal from "../Modal/ClientOpeningBalanceModal.js";
import SalesReturnModal from "../Modal/SalesReturnModal.js";

const SKIP_REFS = new Set(["", "Advance", "UnRealized", "undefined", "null"]);

const sessionOpt = (session) => (session ? { session } : {});

const withSession = (query, session) => (session ? query.session(session) : query);

export const normalizeRef = (val) => String(val ?? "").trim();

export const isSkippedInvoiceRef = (ref) => {
    const key = normalizeRef(ref);
    return !key || SKIP_REFS.has(key);
};

const refsMatch = (a, b) => normalizeRef(a) === normalizeRef(b);

const sameClient = (value, clientId) => normalizeRef(value) === normalizeRef(clientId);

export const isForDistributor = (forDis) =>
    String(forDis ?? "").trim().toLowerCase() === "yes";

const openingRows = (opening) =>
    Array.isArray(opening?.InvoiceData) ? opening.InvoiceData : [];

const toAmount = (val) => {
    const n = Number(String(val ?? 0).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
};

const round2 = (val) => Number(toAmount(val).toFixed(2));

const findOpeningInvoice = (opening, invoiceRef) =>
    openingRows(opening).find(
        (row) =>
            refsMatch(row?.Invoice, invoiceRef) ||
            refsMatch(row?.SalesInvoice, invoiceRef) ||
            refsMatch(row?.SalesFlowRef, invoiceRef) ||
            refsMatch(row?.DitributorInvoiceCode, invoiceRef)
    );

const openingInvoiceRefsOf = (inv) =>
    [...new Set(
        [inv?.Invoice, inv?.SalesInvoice, inv?.SalesFlowRef, inv?.DitributorInvoiceCode]
            .map(normalizeRef)
            .filter(Boolean)
    )];

const invoiceTotalOf = (inv) =>
    toAmount(inv?.TotalAmount ?? inv?.Amount);

const isOpeningClient = (row, clientId) =>
    sameClient(row?.Client, clientId) || sameClient(row?.Distrbutor, clientId);

export const indexStrictInvoices = (distributorInvoices = [], openingInvoices = [], openingDoc = null) => {
    const invoiceByRef = {};
    for (const inv of distributorInvoices || []) {
        const ref = normalizeRef(inv?.DitributorInvoiceCode);
        if (!ref) continue;
        invoiceByRef[ref] = {
            kind: "distributor",
            doc: inv,
            date: inv?.InvoiceDate || ""
        };
    }
    for (const inv of openingInvoices || []) {
        const entry = {
            kind: "opening",
            doc: inv,
            opening: openingDoc,
            date: inv?.date || inv?.InvoiceDate || ""
        };
        for (const ref of openingInvoiceRefsOf(inv)) {
            if (!invoiceByRef[ref]) invoiceByRef[ref] = entry;
        }
    }
    return invoiceByRef;
};

export const groupStrictPaymentsByInvoice = (paymentsByRef = {}, invoiceByRef = {}) => {
    const seen = new Set();
    const groups = [];
    const refs = Object.keys(paymentsByRef).sort((a, b) => {
        const dateA = String(invoiceByRef[a]?.date || "");
        const dateB = String(invoiceByRef[b]?.date || "");
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.localeCompare(b);
    });
    for (const ref of refs) {
        const entry = invoiceByRef[ref];
        if (!entry?.doc) continue;
        const aliases = entry.kind === "opening"
            ? openingInvoiceRefsOf(entry.doc)
            : [normalizeRef(entry.doc.DitributorInvoiceCode)].filter(Boolean);
        const key = `${entry.kind}:${aliases[0] || ref}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const payments = aliases
            .flatMap((alias) => paymentsByRef[alias] || [])
            .sort((a, b) =>
                String(a.date || "").localeCompare(String(b.date || "")) ||
                String(a.voucherNumber || "").localeCompare(String(b.voucherNumber || ""))
            );
        if (!payments.length) continue;
        groups.push({
            entry,
            payments,
            invoiceRef: aliases[0] || ref
        });
    }
    return groups;
};

/**
 * When sales and distributor invoices share a number, pick the invoice that
 * belongs to the receipt/voucher client. forDis=Yes prefers distributor.
 */
export const pickInvoiceMatch = ({
    sales = null,
    distributor = null,
    opening = null,
    client = "",
    forDis = ""
} = {}) => {
    const clientKey = normalizeRef(client);
    const preferDistributor = isForDistributor(forDis);
    const matchesClient = (row) => {
        if (!row) return false;
        if (!clientKey) return true;
        return sameClient(row.client, clientKey);
    };

    const distOk = matchesClient(distributor);
    const salesOk = matchesClient(sales);
    const openingOk = matchesClient(opening);
    const order = preferDistributor
        ? [distOk && "distributor", openingOk && "opening", salesOk && "sales"]
        : [salesOk && "sales", distOk && "distributor", openingOk && "opening"];

    return order.find(Boolean) || "not_found";
};

export const collectKnockOffLines = (rows = []) => {
    const lines = [];
    for (const item of Array.isArray(rows) ? rows : []) {
        const chqRefs = Array.isArray(item?.ChqRef)
            ? item.ChqRef
            : (item?.ChqRef ? [item.ChqRef] : []);
        const client = normalizeRef(item?.Client);

        if (chqRefs.length) {
            for (const cr of chqRefs) {
                const ref = normalizeRef(cr?.ref);
                if (isSkippedInvoiceRef(ref) || ref.includes(",")) continue;
                lines.push({ invoiceRef: ref, amount: toAmount(cr?.Am), client });
            }
            continue;
        }

        const ref = normalizeRef(item?.ClientRef2 || item?.Ref);
        if (isSkippedInvoiceRef(ref) || ref.includes(",")) continue;
        lines.push({ invoiceRef: ref, amount: toAmount(item?.Credit), client });
    }
    return lines.filter((line) => line.amount > 0);
};

const clientsByRefFromRows = (rows = []) => {
    const map = {};
    for (const line of collectKnockOffLines(rows)) {
        if (line.client && !map[line.invoiceRef]) map[line.invoiceRef] = line.client;
    }
    return map;
};

const applyToSales = async (invoice, amount, session) => {
    const remaining = toAmount(invoice.RemainingAmount);
    const received = toAmount(invoice.RecivedAmount);
    const apply = Math.min(amount, Math.max(0, remaining));
    await SalesInvoiceModal.findByIdAndUpdate(invoice._id, {
        RemainingAmount: Math.max(0, remaining - apply),
        RecivedAmount: received + apply
    }, sessionOpt(session));
};

const applyToOpening = async (opening, inv, amount, session) => {
    const remaining = toAmount(inv.RemaingAmount ?? inv.RemainingAmount);
    const received = toAmount(inv.RecivedAmount);
    const apply = Math.min(amount, Math.max(0, remaining));
    inv.RemaingAmount = String(Math.max(0, remaining - apply));
    inv.RecivedAmount = String(received + apply);
    await InvoiceOpeningModal.findByIdAndUpdate(opening._id, {
        InvoiceData: opening.InvoiceData
    }, sessionOpt(session));
};

const invoiceRemainOf = (inv) => {
    const remaining = toAmount(inv?.RemainingAmount ?? inv?.RemaingAmount ?? inv?.Remaining);
    if (remaining > 0) return remaining;
    const total = toAmount(inv?.TotalAmount ?? inv?.Amount);
    const received = toAmount(inv?.RecivedAmount);
    return Math.max(0, total - received);
};

const applyToDistributor = async (invoice, amount, session) => {
    const remaining = invoiceRemainOf(invoice);
    const received = toAmount(invoice.RecivedAmount);
    const apply = Math.min(amount, Math.max(0, remaining));
    if (apply <= 0) return 0;
    await DistrbutorInvoiceModal.findByIdAndUpdate(
        invoice._id,
        {
            Remaining: Math.max(0, remaining - apply),
            RecivedAmount: received + apply
        },
        { runValidators: false, ...sessionOpt(session) }
    );
    return apply;
};

export const applyInvoiceKnockOff = async (invoiceRef, amount, options = {}) => {
    const ref = normalizeRef(invoiceRef);
    const amt = toAmount(amount);
    const session = options.session;
    if (isSkippedInvoiceRef(ref) || amt <= 0) {
        return { applied: false, reason: "skip", amount: 0 };
    }

    const [sales, distributor, opening] = await Promise.all([
        withSession(SalesInvoiceModal.findOne({
            $or: [{ SalesInvoice: ref }, { SalesFlowRef: ref }]
        }), session),
        withSession(DistrbutorInvoiceModal.findOne({
            DitributorInvoiceCode: ref
        }), session),
        withSession(InvoiceOpeningModal.findOne(), session)
    ]);
    const openingInv = findOpeningInvoice(opening, ref);
    const kind = pickInvoiceMatch({
        sales: sales ? { client: sales.Client } : null,
        distributor: distributor ? { client: distributor.Distrbutor } : null,
        opening: openingInv ? { client: openingInv.Client } : null,
        client: options.client,
        forDis: options.forDis
    });

    const applyKind = async (doc, applyFn, invoiceKind) => {
        const remaining = invoiceRemainOf(doc);
        const apply = Math.min(amt, Math.max(0, remaining));
        if (apply <= 0) {
            return { applied: false, reason: "already_realized", kind: invoiceKind, amount: 0 };
        }
        const done = await applyFn(doc, apply);
        const appliedAmt = done == null ? apply : toAmount(done);
        return { applied: appliedAmt > 0, kind: invoiceKind, amount: appliedAmt };
    };

    if (kind === "sales" && sales) {
        return applyKind(sales, (doc, apply) => applyToSales(doc, apply, session), "sales");
    }
    if (kind === "distributor" && distributor) {
        return applyKind(distributor, (doc, apply) => applyToDistributor(doc, apply, session), "distributor");
    }
    if (kind === "opening" && opening && openingInv) {
        return applyKind(openingInv, (inv, apply) => applyToOpening(opening, inv, apply, session), "opening");
    }

    return { applied: false, reason: "not_found", amount: 0 };
};

export const knockOffInvoiceLines = async (rows = [], options = {}) => {
    const session = options.session;
    for (const line of collectKnockOffLines(rows)) {
        try {
            await applyInvoiceKnockOff(line.invoiceRef, line.amount, {
                client: line.client,
                forDis: options.forDis,
                session
            });
        } catch (err) {
            if (session) throw err;
            console.log("Invoice knock-off skipped:", line.invoiceRef, err?.message);
        }
    }
};

const undoAmounts = (remaining, received, amount) => {
    const undo = Math.min(toAmount(amount), Math.max(0, toAmount(received)));
    if (undo <= 0) return null;
    return {
        undo,
        remaining: toAmount(remaining) + undo,
        received: Math.max(0, toAmount(received) - undo)
    };
};

const reverseOnSales = async (invoice, amount, session) => {
    const next = undoAmounts(invoice.RemainingAmount, invoice.RecivedAmount, amount);
    if (!next) return 0;
    await SalesInvoiceModal.findByIdAndUpdate(invoice._id, {
        RemainingAmount: next.remaining,
        RecivedAmount: next.received
    }, sessionOpt(session));
    return next.undo;
};

const reverseOnDistributor = async (invoice, amount, session) => {
    const next = undoAmounts(invoice.Remaining, invoice.RecivedAmount, amount);
    if (!next) return 0;
    await DistrbutorInvoiceModal.findByIdAndUpdate(
        invoice._id,
        {
            Remaining: next.remaining,
            RecivedAmount: next.received
        },
        { runValidators: false, ...sessionOpt(session) }
    );
    return next.undo;
};

const reverseOnOpening = async (opening, inv, amount, session) => {
    const next = undoAmounts(inv.RemaingAmount ?? inv.RemainingAmount, inv.RecivedAmount, amount);
    if (!next) return 0;
    inv.RemaingAmount = String(next.remaining);
    inv.RecivedAmount = String(next.received);
    await InvoiceOpeningModal.findByIdAndUpdate(opening._id, {
        InvoiceData: opening.InvoiceData
    }, sessionOpt(session));
    return next.undo;
};

export const reverseInvoiceKnockOff = async (invoiceRef, amount, options = {}) => {
    const ref = normalizeRef(invoiceRef);
    const amt = toAmount(amount);
    const session = options.session;
    if (isSkippedInvoiceRef(ref) || amt <= 0) {
        return { reversed: false, reason: "skip", amount: 0 };
    }

    const [sales, distributor, opening] = await Promise.all([
        withSession(SalesInvoiceModal.findOne({
            $or: [{ SalesInvoice: ref }, { SalesFlowRef: ref }]
        }), session),
        withSession(DistrbutorInvoiceModal.findOne({
            DitributorInvoiceCode: ref
        }), session),
        withSession(InvoiceOpeningModal.findOne(), session)
    ]);
    const openingInv = findOpeningInvoice(opening, ref);
    const kind = pickInvoiceMatch({
        sales: sales ? { client: sales.Client } : null,
        distributor: distributor ? { client: distributor.Distrbutor } : null,
        opening: openingInv ? { client: openingInv.Client } : null,
        client: options.client,
        forDis: options.forDis
    });

    const run = async (doc, fn, invoiceKind) => {
        const done = await fn(doc, amt);
        return { reversed: toAmount(done) > 0, kind: invoiceKind, amount: toAmount(done) };
    };

    if (kind === "sales" && sales) {
        return run(sales, (doc, apply) => reverseOnSales(doc, apply, session), "sales");
    }
    if (kind === "distributor" && distributor) {
        return run(distributor, (doc, apply) => reverseOnDistributor(doc, apply, session), "distributor");
    }
    if (kind === "opening" && opening && openingInv) {
        return run(openingInv, (inv, apply) => reverseOnOpening(opening, inv, apply, session), "opening");
    }

    return { reversed: false, reason: "not_found", amount: 0 };
};

const groupedKnockOffLines = (rows = []) => {
    const grouped = {};
    for (const line of collectKnockOffLines(rows)) {
        const key = `${normalizeRef(line.invoiceRef)}::${normalizeRef(line.client)}`;
        if (!grouped[key]) grouped[key] = { ...line, amount: 0 };
        grouped[key].amount = round2(grouped[key].amount + line.amount);
    }
    return Object.values(grouped);
};

export const reverseKnockOffInvoiceLines = async (rows = [], options = {}) => {
    const session = options.session;
    for (const line of groupedKnockOffLines(rows)) {
        try {
            await reverseInvoiceKnockOff(line.invoiceRef, line.amount, {
                client: line.client,
                forDis: options.forDis,
                session
            });
        } catch (err) {
            if (session) throw err;
            console.log("Invoice knock-off reverse skipped:", line.invoiceRef, err?.message);
        }
    }
};

export const sameKnockOffAllocation = (oldRows = [], oldForDis = "", newRows = [], newForDis = "") => {
    const flagOf = (forDis) => (isForDistributor(forDis) ? "yes" : "no");
    const mapOf = (rows, forDis) => {
        const map = {};
        const flag = flagOf(forDis);
        for (const line of collectKnockOffLines(rows)) {
            const key = `${normalizeRef(line.invoiceRef)}::${normalizeRef(line.client)}::${flag}`;
            map[key] = round2((map[key] || 0) + line.amount);
        }
        return map;
    };
    const oldMap = mapOf(oldRows, oldForDis);
    const newMap = mapOf(newRows, newForDis);
    const keys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
    for (const key of keys) {
        if (round2(oldMap[key] || 0) !== round2(newMap[key] || 0)) return false;
    }
    return true;
};

export const replaceKnockOffInvoiceLines = async (oldRows = [], newRows = [], options = {}) => {
    const oldForDis = options.oldForDis ?? options.forDis;
    const newForDis = options.newForDis ?? options.forDis;
    const session = options.session;
    if (sameKnockOffAllocation(oldRows, oldForDis, newRows, newForDis)) return;

    await reverseKnockOffInvoiceLines(oldRows, { forDis: oldForDis, session });
    await assertKnockOffWithinRemaining(newRows, { forDis: newForDis, session });
    await knockOffInvoiceLines(newRows, { forDis: newForDis, session });
};

export const groupKnockOffTotals = (rows = []) => {
    const totals = {};
    for (const line of collectKnockOffLines(rows)) {
        totals[line.invoiceRef] = (totals[line.invoiceRef] || 0) + line.amount;
    }
    return totals;
};

export const findRemainingOverflows = (totals = {}, invoiceMap = {}, options = {}) => {
    const allowAlreadyRealized = Boolean(options.allowAlreadyRealized);
    const errors = [];
    for (const [ref, amount] of Object.entries(totals)) {
        const inv = invoiceMap[ref];
        const remaining = toAmount(inv?.remaining);
        if (!inv || inv.kind === "not_found") {
            errors.push({
                invoiceRef: ref,
                amount,
                remaining: 0,
                reason: "not_found",
                message: `Invoice ${ref} not found`
            });
            continue;
        }
        if (allowAlreadyRealized && remaining <= 0.0001) continue;
        if (amount > remaining + 0.0001) {
            errors.push({
                invoiceRef: ref,
                amount,
                remaining,
                reason: "exceeds_remaining",
                message: `Payment ${amount} exceeds remaining ${remaining} on invoice ${ref}`
            });
        }
    }
    return errors;
};

const remainingOverflowError = (errors) => {
    const err = new Error(errors.map((item) => item.message).join("; "));
    err.statusCode = 400;
    err.details = errors;
    return err;
};

export const assertKnockOffWithinRemaining = async (rows = [], options = {}) => {
    const totals = groupKnockOffTotals(rows);
    const refs = Object.keys(totals);
    if (!refs.length) return { ok: true, totals, errors: [] };

    const invoiceMap = await lookupInvoiceStates(refs, {
        forDis: options.forDis,
        clientsByRef: clientsByRefFromRows(rows),
        session: options.session
    });
    const errors = findRemainingOverflows(totals, invoiceMap, options);
    if (errors.length) throw remainingOverflowError(errors);
    return { ok: true, totals, invoiceMap, errors };
};

export const leftoverOf = (line) =>
    Math.max(0, Number((toAmount(line?.Credit) - toAmount(line?.Remain)).toFixed(2)));

export const isSalesReturnVoucher = (voucher) =>
    String(voucher?.VoucherType || "").trim().toUpperCase() === "SR";

export const salesReturnNumberFromVoucher = (voucherNumber) =>
    String(voucherNumber || "").replace(/^SR/i, "");

export const salesReturnVoucherNumberOf = (salesReturnNumber) =>
    `SR${String(salesReturnNumber ?? "").trim()}`;

const indexSalesReturnsByVoucher = (rows = []) => {
    const map = {};
    for (const row of rows || []) {
        const voucherNumber = salesReturnVoucherNumberOf(row?.SalesReturnNumber);
        if (voucherNumber !== "SR") map[voucherNumber] = row;
        const raw = normalizeRef(row?.SalesReturnNumber);
        if (raw) map[raw] = row;
    }
    return map;
};

export const attachSalesReturnClients = (vouchers = [], returnsByVoucherNumber = {}) =>
    (Array.isArray(vouchers) ? vouchers : []).map((voucher) => {
        if (!isSalesReturnVoucher(voucher)) return voucher;
        const sr = returnsByVoucherNumber[voucher.VoucherNumber]
            || returnsByVoucherNumber[salesReturnNumberFromVoucher(voucher.VoucherNumber)];
        if (!sr || !normalizeRef(sr.Client)) return voucher;
        const lines = Array.isArray(voucher.VoucharData) ? voucher.VoucharData : [];
        const withClient = lines.findIndex((line) =>
            toAmount(line?.Credit) > 0 && normalizeRef(line?.Client)
        );
        let target = withClient;
        if (target < 0) {
            let maxCredit = 0;
            lines.forEach((line, index) => {
                const credit = toAmount(line?.Credit);
                if (credit > maxCredit) {
                    maxCredit = credit;
                    target = index;
                }
            });
        }
        if (target < 0) return voucher;
        return {
            ...voucher,
            VoucharData: lines.map((line, index) => {
                if (index !== target || normalizeRef(line?.Client)) return line;
                return { ...line, Client: sr.Client };
            })
        };
    });

const loadSalesReturnsForClients = async (clientIds = []) => {
    const ids = (Array.isArray(clientIds) ? clientIds : []).map((id) => String(id).trim()).filter(Boolean);
    if (!ids.length) return [];
    return SalesReturnModal.find({ Client: { $in: expandClientValues(ids) } })
        .select({ SalesReturnNumber: 1, Client: 1, SalesFlowRef: 1 })
        .lean();
};

/**
 * FIFO ClientRef2 after Strictly:
 * full invoice apply → invoice number
 * split (invoice + leftover) → "Advance , {invoice}"
 * leftover only → "Advance"
 */
export const strictKnockOffClientRef2 = (invoiceRef, appliedToInvoice, leftoverAfter) => {
    const inv = normalizeRef(invoiceRef);
    const applied = round2(appliedToInvoice) > 0.0001;
    const leftover = round2(leftoverAfter) > 0.0001;
    if (applied && leftover) return inv ? `Advance , ${inv}` : "Advance";
    if (leftover) return "Advance";
    return inv;
};

const lineRefValue = (row) =>
    normalizeRef(row?.Ref ?? row?.line?.Ref);

const lineClientRef2Value = (row) =>
    normalizeRef(row?.ClientRef2 ?? row?.clientRef2 ?? row?.line?.ClientRef2);

/**
 * Strict invoice matching: apply payments tagged to an invoice only up to the
 * invoice amount. Extra payment stays as knockoff leftover (Credit − Remain).
 * Apply rewrites ClientRef2 (invoice / Advance+invoice / Advance) and clears Ref.
 * Debit, Credit, Account, and Client stay the same.
 *
 * Example: invoice 350000, payments 200000 + 200000 + 100000 = 500000
 * → apply 350000 to the invoice, 150000 leftover in knockoff.
 * → ClientRef2: invoice, "Advance , invoice", "Advance". Ref cleared.
 */
export const planStrictInvoiceKnockOff = ({
    invoiceAmount = 0,
    remaining = 0,
    received = 0,
    payments = [],
    invoiceRef = ""
} = {}) => {
    const invoiceAmountN = round2(invoiceAmount);
    const receivedN = round2(received);
    const remainingN = round2(remaining);
    const rows = (Array.isArray(payments) ? payments : []).map((payment, index) => ({
        ...payment,
        credit: round2(payment?.credit ?? payment?.Credit),
        remain: round2(payment?.remain ?? payment?.Remain)
    }));
    const invoiceKey = normalizeRef(invoiceRef) ||
        rows.map((row) => strictInvoiceRefOf(row.line || row)).find(Boolean) || "";
    const paymentTotal = round2(rows.reduce((sum, row) => sum + row.credit, 0));
    const cap = invoiceAmountN > 0 ? invoiceAmountN : round2(remainingN + receivedN);
    const targetApplied = round2(Math.min(cap > 0 ? cap : paymentTotal, paymentTotal));
    const applyToInvoice = round2(Math.max(0, targetApplied - receivedN));
    const leftoverKnockoff = round2(Math.max(0, paymentTotal - targetApplied));
    let needToMark = round2(Math.max(0, targetApplied - rows.reduce((sum, row) => sum + row.remain, 0)));

    const lineUpdates = rows.map((row) => {
        const leftover = round2(Math.max(0, row.credit - row.remain));
        const mark = round2(Math.min(leftover, needToMark));
        needToMark = round2(Math.max(0, needToMark - mark));
        const newRemain = round2(row.remain + mark);
        const leftoverAfter = round2(Math.max(0, row.credit - newRemain));
        const clientRef2 = strictKnockOffClientRef2(invoiceKey, newRemain, leftoverAfter);
        const refsChanged = lineClientRef2Value(row) !== clientRef2 || lineRefValue(row) !== "";
        return {
            ...row,
            mark,
            newRemain,
            leftoverAfter,
            convertToAdvance: leftoverAfter > 0.0001,
            ClientRef2: clientRef2,
            clientRef2,
            Ref: "",
            refsChanged
        };
    });

    const hasWork = applyToInvoice > 0.0001 ||
        lineUpdates.some((row) => row.mark > 0.0001 || row.refsChanged);

    return {
        paymentTotal,
        invoiceAmount: cap,
        remaining: remainingN,
        received: receivedN,
        targetApplied,
        applyToInvoice,
        leftoverKnockoff,
        remainingAfter: round2(Math.max(0, cap - (receivedN + applyToInvoice))),
        invoiceRef: invoiceKey,
        lineUpdates,
        action: hasWork ? "apply" : "skip"
    };
};

export const strictInvoiceRefOf = (line) => {
    const chqRefs = Array.isArray(line?.ChqRef)
        ? line.ChqRef
        : (line?.ChqRef ? [line.ChqRef] : []);
    if (chqRefs.length > 1) return "";
    if (chqRefs.length === 1) {
        const ref = normalizeRef(chqRefs[0]?.ref);
        if (isSkippedInvoiceRef(ref) || ref.includes(",")) return "";
        return ref;
    }
    const ref = normalizeRef(line?.ClientRef2 || line?.Ref || line?.InvoiceRef);
    if (isSkippedInvoiceRef(ref) || ref.includes(",")) return "";
    return ref;
};

export const isAdvanceKnockoffRef = (ref) => {
    const key = normalizeRef(ref);
    if (isSkippedInvoiceRef(key)) return true;
    return /^(advance|unrealized)\b/i.test(key);
};

export const strictLeftoverInKnockoffPool = ({
    invoiceAmount = 0,
    remaining = 0,
    received = 0,
    payments = []
} = {}) => {
    const plan = planStrictInvoiceKnockOff({ invoiceAmount, remaining, received, payments });
    if (plan.leftoverKnockoff <= 0.0001) return false;
    const remainTotal = round2(
        (Array.isArray(payments) ? payments : []).reduce(
            (sum, row) => sum + toAmount(row?.remain ?? row?.Remain),
            0
        )
    );
    return remainTotal + 0.0001 >= plan.targetApplied;
};

const knockoffLineKey = (voucher, index) =>
    `${voucher?.VoucherNumber || voucher?._id || ""}:${index}`;

const allowedClient = (lineClient, clientId = "", clientIdSet = null) => {
    if (clientIdSet && clientIdSet.size) return clientIdSet.has(normalizeRef(lineClient));
    if (clientId) return sameClient(lineClient, clientId);
    return true;
};

export const filterVoucherKnockoffPool = async (vouchers = [], { clientId = "", clientIds = [], forDis = "" } = {}) => {
    const clientIdSet = new Set((clientIds || []).map((id) => normalizeRef(id)).filter(Boolean));
    const allClientCredits = [];
    for (const voucher of vouchers) {
        const lines = Array.isArray(voucher?.VoucharData) ? voucher.VoucharData : [];
        lines.forEach((line, index) => {
            if (!allowedClient(line?.Client, clientId, clientIdSet)) return;
            if (!isClientCreditLine(line)) return;
            allClientCredits.push({ voucher, line, index });
        });
    }

    const keep = new Set();
    for (const row of allClientCredits) {
        if (leftoverOf(row.line) <= 1) continue;
        if (isAdvanceKnockoffRef(row.line?.ClientRef2) || isSalesReturnVoucher(row.voucher)) {
            keep.add(knockoffLineKey(row.voucher, row.index));
        }
    }

    const taggedLeftover = {};
    for (const row of allClientCredits) {
        if (leftoverOf(row.line) <= 1) continue;
        const ref = strictInvoiceRefOf(row.line);
        if (!ref) continue;
        const key = `${normalizeRef(row.line?.Client)}::${ref}`;
        if (!taggedLeftover[key]) taggedLeftover[key] = [];
        taggedLeftover[key].push(row);
    }

    const refs = [...new Set(
        Object.values(taggedLeftover).map((rows) => strictInvoiceRefOf(rows[0].line))
    )];
    const paymentTotals = await loadTaggedPaymentTotals(refs, clientId, clientIdSet);

    const clientsByRef = {};
    for (const rows of Object.values(taggedLeftover)) {
        const ref = strictInvoiceRefOf(rows[0].line);
        if (ref && !clientsByRef[ref]) clientsByRef[ref] = rows[0].line?.Client;
    }
    const invoiceMap = await lookupInvoiceStates(refs, { clientsByRef, forDis });

    for (const [key, leftoverRows] of Object.entries(taggedLeftover)) {
        const ref = strictInvoiceRefOf(leftoverRows[0].line);
        const inv = invoiceMap[ref];
        if (!inv || inv.kind === "not_found") continue;
        const totals = paymentTotals[key] || leftoverRows.reduce(
            (acc, row) => ({
                credit: acc.credit + toAmount(row.line.Credit),
                remain: acc.remain + toAmount(row.line.Remain)
            }),
            { credit: 0, remain: 0 }
        );
        if (!strictLeftoverInKnockoffPool({
            invoiceAmount: inv.total,
            remaining: inv.remaining,
            received: inv.received,
            payments: [{ credit: totals.credit, remain: totals.remain }]
        })) continue;
        for (const row of leftoverRows) {
            keep.add(knockoffLineKey(row.voucher, row.index));
        }
    }

    return vouchers
        .map((voucher) => {
            const lines = (Array.isArray(voucher?.VoucharData) ? voucher.VoucharData : [])
                .filter((_, index) => keep.has(knockoffLineKey(voucher, index)));
            return { ...voucher, VoucharData: lines };
        })
        .filter((voucher) => (voucher.VoucharData || []).length > 0);
};

const flattenKnockoffVouchers = (vouchers = []) => {
    const rows = [];
    for (const voucher of vouchers) {
        for (const line of voucher.VoucharData || []) {
            rows.push({ ...voucher, VoucharData: [line] });
        }
    }
    return rows;
};

const leftoverCreditExpr = (as = "$$vd") => ({
    $subtract: [
        {
            $convert: {
                input: { $ifNull: [`${as}.Credit`, 0] },
                to: "double",
                onError: 0,
                onNull: 0
            }
        },
        {
            $convert: {
                input: { $ifNull: [`${as}.Remain`, 0] },
                to: "double",
                onError: 0,
                onNull: 0
            }
        }
    ]
});

const chunkArray = (items = [], size = 500) => {
    const out = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
};

const loadTaggedPaymentTotals = async (refs = [], clientId = "", clientIdSet = null) => {
    const unique = [...new Set(refs.map(normalizeRef).filter((ref) => !isSkippedInvoiceRef(ref)))];
    if (!unique.length) return {};

    const totals = {};
    for (const batch of chunkArray(unique, 500)) {
        const batchSet = new Set(batch);
        const rows = await VoucherModal.aggregate([
            {
                $match: {
                    $or: [
                        { "VoucharData.ClientRef2": { $in: batch } },
                        { "VoucharData.Ref": { $in: batch } },
                        { "VoucharData.InvoiceRef": { $in: batch } }
                    ]
                }
            },
            { $project: { VoucharData: 1 } },
            { $unwind: "$VoucharData" },
            {
                $match: {
                    $or: [
                        { "VoucharData.ClientRef2": { $in: batch } },
                        { "VoucharData.Ref": { $in: batch } },
                        { "VoucharData.InvoiceRef": { $in: batch } }
                    ]
                }
            },
            {
                $project: {
                    Client: "$VoucharData.Client",
                    ClientRef2: "$VoucharData.ClientRef2",
                    Ref: "$VoucharData.Ref",
                    InvoiceRef: "$VoucharData.InvoiceRef",
                    Credit: "$VoucharData.Credit",
                    Remain: "$VoucharData.Remain",
                    ChqRef: "$VoucharData.ChqRef"
                }
            }
        ]).allowDiskUse(true);

        for (const line of rows) {
            if (!allowedClient(line.Client, clientId, clientIdSet)) continue;
            if (toAmount(line.Credit) <= 0) continue;
            const ref = strictInvoiceRefOf(line);
            if (!ref || !batchSet.has(ref)) continue;
            const key = `${normalizeRef(line.Client)}::${ref}`;
            if (!totals[key]) totals[key] = { credit: 0, remain: 0 };
            totals[key].credit = round2(totals[key].credit + toAmount(line.Credit));
            totals[key].remain = round2(totals[key].remain + toAmount(line.Remain));
        }
    }
    return totals;
};

const expandClientValues = (ids = []) => {
    const out = [];
    const seen = new Set();
    for (const id of ids) {
        for (const value of clientMatchValues(id)) {
            const key = String(value);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(value);
        }
    }
    return out;
};

const loadLeftoverCreditVouchers = async (clientId = "", clientIds = [], salesReturnVoucherNumbers = [], includeAllSalesReturns = false) => {
    const allowedIds = (Array.isArray(clientIds) && clientIds.length)
        ? clientIds.map((id) => String(id)).filter(Boolean)
        : (String(clientId || "").trim() ? [String(clientId).trim()] : []);
    const clientValues = allowedIds.length ? expandClientValues(allowedIds) : null;
    const srNumbers = (Array.isArray(salesReturnVoucherNumbers) ? salesReturnVoucherNumbers : []).filter(Boolean);
    const clientCond = clientValues
        ? { $in: [{ $toString: { $ifNull: ["$$vd.Client", ""] } }, allowedIds] }
        : { $ne: [{ $ifNull: ["$$vd.Client", ""] }, ""] };

    const orMatch = [];
    if (clientValues) orMatch.push({ "VoucharData.Client": { $in: clientValues } });
    else orMatch.push({ "VoucharData.Client": { $exists: true, $nin: [null, ""] } });
    if (srNumbers.length) orMatch.push({ VoucherNumber: { $in: srNumbers } });
    if (includeAllSalesReturns) orMatch.push({ VoucherType: "SR" });
    const preMatch = orMatch.length === 1 ? orMatch[0] : { $or: orMatch };

    return VoucherModal.aggregate([
        { $match: preMatch },
        {
            $project: {
                VoucherNumber: 1,
                VoucherDate: 1,
                VoucherType: 1,
                status: 1,
                VoucharData: 1
            }
        },
        {
            $addFields: {
                VoucharData: {
                    $filter: {
                        input: "$VoucharData",
                        as: "vd",
                        cond: {
                            $and: [
                                { $gt: [leftoverCreditExpr("$$vd"), 1] },
                                {
                                    $or: [
                                        clientCond,
                                        { $eq: [{ $toUpper: { $ifNull: ["$VoucherType", ""] } }, "SR"] }
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        },
        { $match: { "VoucharData.0": { $exists: true } } }
    ]).allowDiskUse(true);
};

export const getKnockoffPoolVouchers = async (clientId = "", { flatten = false, distributorsOnly = false } = {}) => {
    const client = String(clientId || "").trim();
    let clientIds = [];
    let forDis = "";
    if (distributorsOnly && !client) {
        const distributors = await DistrbutorModal.find({}, { _id: 1 }).lean();
        clientIds = distributors.map((row) => String(row._id));
        forDis = "Yes";
        if (!clientIds.length) return [];
    }
    const lookupIds = client ? [client] : clientIds;
    const salesReturns = lookupIds.length ? await loadSalesReturnsForClients(lookupIds) : [];
    const srVoucherNumbers = salesReturns.map((row) => salesReturnVoucherNumberOf(row.SalesReturnNumber));
    const includeAllSalesReturns = !lookupIds.length;
    const vouchers = await loadLeftoverCreditVouchers(client, clientIds, srVoucherNumbers, includeAllSalesReturns);
    let returnsByVoucher = indexSalesReturnsByVoucher(salesReturns);
    if (includeAllSalesReturns) {
        const numbers = [...new Set(
            vouchers
                .filter(isSalesReturnVoucher)
                .map((row) => salesReturnNumberFromVoucher(row.VoucherNumber))
                .filter(Boolean)
        )];
        if (numbers.length) {
            const extra = await SalesReturnModal.find({ SalesReturnNumber: { $in: numbers } })
                .select({ SalesReturnNumber: 1, Client: 1, SalesFlowRef: 1 })
                .lean();
            returnsByVoucher = indexSalesReturnsByVoucher(extra);
        }
    }
    const withClients = attachSalesReturnClients(vouchers, returnsByVoucher);
    const pooled = await filterVoucherKnockoffPool(withClients, { clientId: client, clientIds, forDis });
    return flatten ? flattenKnockoffVouchers(pooled) : pooled;
};

export const collectRealizeLines = (line) => {
    const chqRefs = Array.isArray(line?.ChqRef)
        ? line.ChqRef
        : (line?.ChqRef ? [line.ChqRef] : []);

    if (chqRefs.length) {
        const fromChq = chqRefs
            .map((cr) => ({
                invoiceRef: normalizeRef(cr?.ref),
                amount: toAmount(cr?.Am)
            }))
            .filter((item) => !isSkippedInvoiceRef(item.invoiceRef) && item.amount > 0);
        if (fromChq.length) return fromChq;
    }

    const refs = String(line?.ClientRef2 || line?.Ref || "")
        .split(",")
        .map((part) => normalizeRef(part))
        .filter((ref) => !isSkippedInvoiceRef(ref));

    const amount = toAmount(line?.Credit);
    if (!refs.length || amount <= 0) return [];
    if (refs.length === 1) return [{ invoiceRef: refs[0], amount }];
    return refs.map((invoiceRef) => ({ invoiceRef, amount }));
};

export const isClientCreditLine = (line) =>
    Boolean(String(line?.Client ?? "").trim()) && toAmount(line?.Credit) > 0;

export const lineIdentity = (line, index) => String(line?.id ?? index);

const lookupInvoiceStates = async (refs = [], options = {}) => {
    const unique = [...new Set(refs.map(normalizeRef).filter((ref) => !isSkippedInvoiceRef(ref)))];
    if (!unique.length) return {};

    const [sales, distributors, opening] = await Promise.all([
        withSession(SalesInvoiceModal.find({
            $or: [{ SalesInvoice: { $in: unique } }, { SalesFlowRef: { $in: unique } }]
        }).select({ SalesInvoice: 1, SalesFlowRef: 1, RemainingAmount: 1, RecivedAmount: 1, TotalAmount: 1, Client: 1 }), options.session).lean(),
        withSession(DistrbutorInvoiceModal.find({ DitributorInvoiceCode: { $in: unique } })
            .select({ DitributorInvoiceCode: 1, Remaining: 1, RecivedAmount: 1, TotalAmount: 1, Distrbutor: 1 }), options.session).lean(),
        withSession(InvoiceOpeningModal.findOne().select({ InvoiceData: 1 }), options.session).lean()
    ]);

    const salesByRef = new Map();
    for (const row of sales) {
        const invoiceKey = normalizeRef(row.SalesInvoice);
        const flowKey = normalizeRef(row.SalesFlowRef);
        if (invoiceKey) salesByRef.set(invoiceKey, row);
        if (flowKey) salesByRef.set(flowKey, row);
    }
    const distByRef = new Map();
    for (const row of distributors) {
        const key = normalizeRef(row.DitributorInvoiceCode);
        if (key) distByRef.set(key, row);
    }

    const map = {};
    for (const ref of unique) {
        const sale = salesByRef.get(ref);
        const dist = distByRef.get(ref);
        const openingInv = findOpeningInvoice(opening, ref);
        const kind = pickInvoiceMatch({
            sales: sale ? { client: sale.Client } : null,
            distributor: dist ? { client: dist.Distrbutor } : null,
            opening: openingInv ? { client: openingInv.Client } : null,
            client: options.clientsByRef?.[ref] || "",
            forDis: options.forDis
        });

        if (kind === "sales" && sale) {
            map[ref] = {
                kind: "sales",
                remaining: invoiceRemainOf(sale),
                received: toAmount(sale.RecivedAmount),
                total: toAmount(sale.TotalAmount),
                number: sale.SalesInvoice || sale.SalesFlowRef
            };
            continue;
        }
        if (kind === "distributor" && dist) {
            map[ref] = {
                kind: "distributor",
                remaining: invoiceRemainOf(dist),
                received: toAmount(dist.RecivedAmount),
                total: toAmount(dist.TotalAmount),
                number: dist.DitributorInvoiceCode
            };
            continue;
        }
        if (kind === "opening" && openingInv) {
            map[ref] = {
                kind: "opening",
                remaining: invoiceRemainOf(openingInv),
                received: toAmount(openingInv.RecivedAmount),
                total: toAmount(openingInv.TotalAmount ?? openingInv.Amount),
                number: openingInv.Invoice || openingInv.SalesInvoice || openingInv.SalesFlowRef
            };
            continue;
        }
        map[ref] = { kind: "not_found", remaining: 0, received: 0, total: 0, number: ref };
    }
    return map;
};

const skipReasonForLine = (leftover, invoices) => {
    if (!invoices.length) return "No invoice against this line";
    if (leftover <= 0) return "Already realized on voucher";
    if (invoices.every((inv) => inv.kind === "not_found")) return "Invoice not found";
    if (invoices.every((inv) => toAmount(inv.remaining) <= 0)) return "Invoice already realized";
    return "";
};

const buildPreviewLine = (line, index, invoiceMap = {}) => {
    const leftover = leftoverOf(line);
    const knockOff = collectRealizeLines(line);
    const invoices = knockOff.map((item) => ({
        ref: item.invoiceRef,
        voucherAmount: item.amount,
        remaining: invoiceMap[item.invoiceRef]?.remaining ?? 0,
        kind: invoiceMap[item.invoiceRef]?.kind || "not_found"
    }));
    const skipReason = skipReasonForLine(leftover, invoices);
    return {
        id: lineIdentity(line, index),
        index,
        client: line?.Client || "",
        credit: toAmount(line?.Credit),
        remain: toAmount(line?.Remain),
        leftover,
        invoices,
        invoiceLabel: invoices.map((item) => item.ref).filter(Boolean).join(", "),
        narration: line?.Narration || "",
        chq: line?.Chq || "",
        clientRef2: line?.ClientRef2 || "",
        ref: line?.Ref || "",
        store: line?.store || line?.Store || "",
        canRealize: leftover > 0 && invoices.some((inv) => inv.remaining > 0 && inv.kind !== "not_found"),
        skipReason
    };
};

export const previewVoucherRealize = async (voucherNumber) => {
    const number = String(voucherNumber || "").replace(/\s+/g, "");
    if (!number) return null;

    const voucher = await VoucherModal.findOne({ VoucherNumber: number }).lean();
    if (!voucher) return null;

    const lines = Array.isArray(voucher.VoucharData) ? voucher.VoucharData : [];
    const clientLines = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => isClientCreditLine(line));

    const allRefs = clientLines.flatMap(({ line }) =>
        collectRealizeLines(line).map((item) => item.invoiceRef)
    );
    const clientsByRef = {};
    for (const { line } of clientLines) {
        for (const item of collectRealizeLines(line)) {
            if (line?.Client && !clientsByRef[item.invoiceRef]) {
                clientsByRef[item.invoiceRef] = line.Client;
            }
        }
    }
    const invoiceMap = await lookupInvoiceStates(allRefs, { clientsByRef });

    return {
        voucherNumber: voucher.VoucherNumber,
        voucherDate: voucher.VoucherDate,
        voucherType: voucher.VoucherType,
        status: voucher.status,
        remarks: voucher.Remarks || "",
        chequeNumber: voucher.ChequeNumber || "",
        totalCredit: toAmount(voucher.TotalCredit),
        totalDebit: toAmount(voucher.TotalDebit),
        lines: clientLines.map(({ line, index }) => {
            const preview = buildPreviewLine(line, index, invoiceMap);
            if (!preview.chq) preview.chq = voucher.ChequeNumber || "";
            return preview;
        })
    };
};

export const realizeVoucherAgainstInvoices = async (voucherNumber, lineId = "") => {
    const number = String(voucherNumber || "").replace(/\s+/g, "");
    if (!number) {
        const err = new Error("Voucher number is required");
        err.statusCode = 400;
        throw err;
    }

    const voucher = await VoucherModal.findOne({ VoucherNumber: number });
    if (!voucher) {
        const err = new Error("Voucher not found");
        err.statusCode = 404;
        throw err;
    }

    const lines = Array.isArray(voucher.VoucharData) ? voucher.VoucharData : [];
    const wanted = String(lineId ?? "").trim();
    const targets = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line, index }) => {
            if (!isClientCreditLine(line)) return false;
            if (!wanted) return true;
            return lineIdentity(line, index) === wanted;
        });

    if (wanted && !targets.length) {
        const err = new Error("Voucher line not found");
        err.statusCode = 404;
        throw err;
    }

    const realized = [];
    let changed = false;

    for (const { line, index } of targets) {
        let leftover = leftoverOf(line);
        const knockOff = collectRealizeLines(line);
        const invoiceDetails = [];
        const currentLineId = lineIdentity(line, index);

        if (leftover <= 0) {
            realized.push({
                lineId: currentLineId,
                applied: 0,
                leftoverAfter: leftover,
                invoices: [],
                reason: "already_realized_on_voucher"
            });
            continue;
        }

        if (!knockOff.length) {
            realized.push({
                lineId: currentLineId,
                applied: 0,
                leftoverAfter: leftover,
                invoices: [],
                reason: "no_invoice"
            });
            continue;
        }

        let appliedTotal = 0;
        for (const knock of knockOff) {
            if (leftover <= 0) break;
            const want = Math.min(toAmount(knock.amount), leftover);
            const result = await applyInvoiceKnockOff(knock.invoiceRef, want, {
                client: line?.Client
            });
            const applied = toAmount(result.amount);
            invoiceDetails.push({
                invoice: knock.invoiceRef,
                applied,
                kind: result.kind || result.reason
            });
            if (applied <= 0) continue;
            leftover = Number((leftover - applied).toFixed(2));
            appliedTotal = Number((appliedTotal + applied).toFixed(2));
        }

        if (appliedTotal > 0) {
            line.Remain = Number((toAmount(line.Remain) + appliedTotal).toFixed(2));
            changed = true;
        }

        realized.push({
            lineId: currentLineId,
            applied: appliedTotal,
            leftoverAfter: leftoverOf(line),
            invoices: invoiceDetails,
            reason: appliedTotal > 0 ? "realized" : "nothing_applied"
        });
    }

    if (changed) {
        voucher.markModified("VoucharData");
        await voucher.save();
    }

    const preview = await previewVoucherRealize(number);
    return { ...preview, realized };
};

const clientMatchValues = (clientId) => {
    const values = [String(clientId || "").trim()].filter(Boolean);
    try {
        if (mongoose.Types.ObjectId.isValid(clientId)) {
            const objectId = new mongoose.Types.ObjectId(clientId);
            if (String(objectId) === String(clientId)) values.push(objectId);
        }
    } catch (_) { }
    return values;
};

const loadRemainingInvoices = async (clientId) => {
    const clientValues = clientMatchValues(clientId);
    const [sales, distributor, opening] = await Promise.all([
        SalesInvoiceModal.find({ Client: { $in: clientValues } })
            .select({ SalesInvoice: 1, SalesFlowRef: 1, RemainingAmount: 1, RecivedAmount: 1, TotalAmount: 1, SalesInvoiceDate: 1 })
            .sort({ SalesInvoiceDate: 1 }),
        DistrbutorInvoiceModal.find({ Distrbutor: { $in: clientValues } })
            .select({ DitributorInvoiceCode: 1, Remaining: 1, RecivedAmount: 1, TotalAmount: 1, InvoiceDate: 1 })
            .sort({ InvoiceDate: 1 }),
        InvoiceOpeningModal.findOne().select({ InvoiceData: 1 })
    ]);

    const openingInvoices = openingRows(opening)
        .filter((row) => sameClient(row?.Client, clientId) && invoiceRemainOf(row) > 0)
        .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));

    return [
        ...distributor
            .filter((inv) => invoiceRemainOf(inv) > 0)
            .map((inv) => ({
                kind: "distributor",
                doc: inv,
                ref: normalizeRef(inv.DitributorInvoiceCode),
                remaining: invoiceRemainOf(inv),
                date: inv.InvoiceDate || ""
            })),
        ...sales
            .filter((inv) => invoiceRemainOf(inv) > 0)
            .map((inv) => ({
                kind: "sales",
                doc: inv,
                ref: normalizeRef(inv.SalesInvoice || inv.SalesFlowRef),
                remaining: invoiceRemainOf(inv),
                date: inv.SalesInvoiceDate || ""
            })),
        ...openingInvoices.map((inv) => ({
            kind: "opening",
            doc: inv,
            opening,
            ref: normalizeRef(inv.Invoice || inv.SalesInvoice || inv.SalesFlowRef),
            remaining: invoiceRemainOf(inv),
            date: inv.date || ""
        }))
    ].filter((inv) => inv.ref && inv.remaining > 0);
};

const applyLoadedInvoice = async (inv, amount) => {
    const apply = Math.min(toAmount(amount), inv.remaining);
    if (apply <= 0) return 0;
    if (inv.kind === "distributor") {
        const done = await applyToDistributor(inv.doc, apply);
        inv.remaining = Math.max(0, inv.remaining - done);
        return done;
    }
    if (inv.kind === "sales") {
        await applyToSales(inv.doc, apply);
        inv.remaining = Math.max(0, inv.remaining - apply);
        return apply;
    }
    if (inv.kind === "opening") {
        await applyToOpening(inv.opening, inv.doc, apply);
        inv.remaining = Math.max(0, inv.remaining - apply);
        return apply;
    }
    return 0;
};

export const reduceClientKnockOffLeftover = async (clientId, amount, invoiceRef = "") => {
    const client = String(clientId || "").trim();
    const requested = toAmount(amount);
    if (!client || requested <= 0) {
        return {
            clientId: client,
            requested,
            reduced: 0,
            appliedToInvoices: 0,
            leftoverWrittenOff: 0,
            remainingRequest: requested,
            vouchers: [],
            invoices: []
        };
    }

    const [vouchers, loadedInvoices] = await Promise.all([
        VoucherModal.find({ "VoucharData.Client": { $in: clientMatchValues(client) } })
            .sort({ VoucherDate: 1, VoucherNumber: 1 }),
        loadRemainingInvoices(client)
    ]);

    let invoices = loadedInvoices;
    const wantedInvoice = normalizeRef(invoiceRef);
    if (wantedInvoice) {
        invoices = loadedInvoices.filter((inv) => refsMatch(inv.ref, wantedInvoice));
        if (!invoices.length) {
            const distInv = await DistrbutorInvoiceModal.findOne({ DitributorInvoiceCode: wantedInvoice });
            if (distInv && invoiceRemainOf(distInv) > 0) {
                invoices = [{
                    kind: "distributor",
                    doc: distInv,
                    ref: wantedInvoice,
                    remaining: invoiceRemainOf(distInv),
                    date: distInv.InvoiceDate || ""
                }];
            }
        }
    }

    let invoiceCursor = 0;
    let appliedToInvoices = 0;
    let leftoverReduced = 0;
    const voucherDetails = [];
    const invoiceDetails = [];

    const takeFromInvoices = async (maxAmount) => {
        let need = maxAmount;
        let applied = 0;
        while (need > 0 && invoiceCursor < invoices.length) {
            const inv = invoices[invoiceCursor];
            if (inv.remaining <= 0) {
                invoiceCursor += 1;
                continue;
            }
            const done = await applyLoadedInvoice(inv, Math.min(need, inv.remaining));
            if (done <= 0) {
                invoiceCursor += 1;
                continue;
            }
            need -= done;
            applied += done;
            invoiceDetails.push({ invoice: inv.ref, kind: inv.kind, applied: done });
            if (inv.remaining <= 0.0001) invoiceCursor += 1;
        }
        return applied;
    };

    let leftForVoucher = requested;
    for (const voucher of vouchers) {
        if (leftForVoucher <= 0) break;
        let changed = false;

        for (let i = 0; i < (voucher.VoucharData || []).length; i += 1) {
            if (leftForVoucher <= 0) break;
            const item = voucher.VoucharData[i];
            if (!sameClient(item?.Client, client)) continue;
            if (toAmount(item?.Debit) > 0) continue;
            const leftover = leftoverOf(item);
            if (leftover <= 0) continue;

            const apply = Math.min(leftover, leftForVoucher);
            item.Remain = toAmount(item.Remain) + apply;
            leftoverReduced += apply;
            leftForVoucher -= apply;
            changed = true;
            voucherDetails.push({
                voucherNumber: voucher.VoucherNumber,
                entryId: item.id,
                applied: apply,
                leftoverAfter: leftover - apply
            });
        }

        if (changed) {
            voucher.markModified("VoucharData");
            await voucher.save();
        }
    }

    appliedToInvoices = await takeFromInvoices(requested);

    return {
        clientId: client,
        requested,
        reduced: leftoverReduced,
        appliedToInvoices,
        leftoverWrittenOff: Math.max(0, leftoverReduced - appliedToInvoices),
        remainingRequest: Math.max(0, requested - Math.max(leftoverReduced, appliedToInvoices)),
        vouchers: voucherDetails,
        invoices: invoiceDetails
    };
};

const todayStr = () => new Date().toISOString().split("T")[0];

export const loadClientLedger = async (clientId) => {
    const today = todayStr();
    let opening = await ClientOpeningBalanceModal.findOne({
        DateStart: { $lte: today },
        DateEnd: { $gte: today }
    }).lean();
    if (!opening) {
        opening = await ClientOpeningBalanceModal.findOne().sort({ DateStart: -1 }).lean();
    }

    let ledger = 0;
    const clientData = Array.isArray(opening?.ClientData)
        ? opening.ClientData
        : Object.values(opening?.ClientData || {});
    clientData.forEach((item) => {
        if (sameClient(item?.Client, clientId)) {
            ledger += toAmount(item.Debit) - toAmount(item.Credit);
        }
    });

    const start = opening?.DateStart || "2000-01-01";
    const voucherAgg = await VoucherModal.aggregate([
        { $match: { VoucherDate: { $gte: start, $lte: today } } },
        { $unwind: "$VoucharData" },
        { $match: { "VoucharData.Client": { $in: clientMatchValues(clientId) } } },
        {
            $group: {
                _id: null,
                debit: {
                    $sum: {
                        $convert: {
                            input: { $ifNull: ["$VoucharData.Debit", 0] },
                            to: "double",
                            onError: 0,
                            onNull: 0
                        }
                    }
                },
                credit: {
                    $sum: {
                        $convert: {
                            input: { $ifNull: ["$VoucharData.Credit", 0] },
                            to: "double",
                            onError: 0,
                            onNull: 0
                        }
                    }
                }
            }
        }
    ]);
    const row = voucherAgg[0] || { debit: 0, credit: 0 };
    ledger += toAmount(row.debit) - toAmount(row.credit);
    return Number(ledger.toFixed(2));
};

const zeroDistributorInvoice = async (invoice) => {
    const remaining = invoiceRemainOf(invoice);
    if (remaining <= 0) return 0;
    const received = toAmount(invoice.RecivedAmount);
    const total = toAmount(invoice.TotalAmount);
    await DistrbutorInvoiceModal.findByIdAndUpdate(
        invoice._id,
        {
            Remaining: 0,
            RecivedAmount: total > 0 ? total : received + remaining
        },
        { runValidators: false }
    );
    return remaining;
};

const zeroOpeningInvoice = (inv) => {
    const remaining = invoiceRemainOf(inv);
    if (remaining <= 0) return 0;
    const received = toAmount(inv.RecivedAmount);
    const total = toAmount(inv.Amount ?? inv.TotalAmount);
    inv.RemaingAmount = "0";
    inv.RemainingAmount = "0";
    inv.RecivedAmount = String(total > 0 ? total : received + remaining);
    return remaining;
};

export const matchDistributorAgingToLedger = async (clientId) => {
    const client = String(clientId || "").trim();
    if (!client) {
        return { aging: 0, ledger: 0, agingAfter: 0, action: "skip", invoices: [] };
    }

    const [distInvoices, opening, ledger] = await Promise.all([
        DistrbutorInvoiceModal.find({ Distrbutor: { $in: clientMatchValues(client) } })
            .sort({ InvoiceDate: 1, DitributorInvoiceCode: 1 }),
        InvoiceOpeningModal.findOne(),
        loadClientLedger(client)
    ]);

    const openingList = openingRows(opening)
        .filter((row) => sameClient(row?.Client, client) && invoiceRemainOf(row) > 0)
        .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));

    const distList = distInvoices.filter((inv) => invoiceRemainOf(inv) > 0);
    const aging = Number((
        distList.reduce((sum, inv) => sum + invoiceRemainOf(inv), 0) +
        openingList.reduce((sum, inv) => sum + invoiceRemainOf(inv), 0)
    ).toFixed(2));

    const invoices = [];
    const EPS = 0.5;

    if (aging <= EPS && ledger <= aging + EPS) {
        return { aging, ledger, agingAfter: aging, action: "skip", invoices };
    }

    if (ledger > aging + EPS) {
        for (const inv of openingList) {
            const cleared = zeroOpeningInvoice(inv);
            if (cleared > 0) invoices.push({ invoice: inv.Invoice || inv.SalesInvoice, kind: "opening", applied: cleared, action: "zero" });
        }
        for (const inv of distList) {
            const cleared = await zeroDistributorInvoice(inv);
            if (cleared > 0) invoices.push({ invoice: inv.DitributorInvoiceCode, kind: "distributor", applied: cleared, action: "zero" });
        }
        if (opening && openingList.length) {
            await InvoiceOpeningModal.findByIdAndUpdate(opening._id, { InvoiceData: opening.InvoiceData });
        }
        return { aging, ledger, agingAfter: 0, action: "zero_invoices", invoices };
    }

    if (aging > ledger + EPS) {
        let need = Number((aging - Math.max(0, ledger)).toFixed(2));
        for (const inv of openingList) {
            if (need <= 0) break;
            const apply = Math.min(need, invoiceRemainOf(inv));
            if (apply <= 0) continue;
            await applyToOpening(opening, inv, apply);
            need -= apply;
            invoices.push({ invoice: inv.Invoice || inv.SalesInvoice, kind: "opening", applied: apply, action: "reduce" });
        }
        for (const inv of distList) {
            if (need <= 0) break;
            const apply = Math.min(need, invoiceRemainOf(inv));
            if (apply <= 0) continue;
            const done = await applyToDistributor(inv, apply);
            need -= done;
            invoices.push({ invoice: inv.DitributorInvoiceCode, kind: "distributor", applied: done, action: "reduce" });
        }
        return {
            aging,
            ledger,
            agingAfter: Number(Math.max(0, ledger).toFixed(2)),
            action: "match_ledger",
            invoices
        };
    }

    return { aging, ledger, agingAfter: aging, action: "skip", invoices };
};

const settleOpeningInvoiceToReceived = async (opening, inv, targetReceived) => {
    if (!opening || !inv) return 0;
    const remainingNow = invoiceRemainOf(inv);
    const received = toAmount(inv.RecivedAmount);
    const total = invoiceTotalOf(inv);
    const cap = total > 0 ? total : Math.max(received + remainingNow, targetReceived);
    const nextReceived = round2(Math.min(cap, Math.max(received, targetReceived)));
    const nextRemaining = round2(Math.max(0, cap - nextReceived));
    const applied = round2(Math.max(0, nextReceived - received));
    if (applied <= 0 && Math.abs(remainingNow - nextRemaining) <= 0.0001) return 0;
    inv.RemaingAmount = String(nextRemaining);
    inv.RemainingAmount = String(nextRemaining);
    inv.RecivedAmount = String(nextReceived);
    if (opening._id) {
        await InvoiceOpeningModal.findByIdAndUpdate(opening._id, {
            InvoiceData: opening.InvoiceData
        });
    }
    return applied;
};

const settleDistributorInvoiceToReceived = async (invoice, targetReceived) => {
    const total = toAmount(invoice.TotalAmount);
    const received = toAmount(invoice.RecivedAmount);
    const cap = total > 0 ? total : Math.max(received, targetReceived);
    const nextReceived = round2(Math.min(cap, Math.max(received, targetReceived)));
    const nextRemaining = round2(Math.max(0, cap - nextReceived));
    const applied = round2(Math.max(0, nextReceived - received));
    const remainingNow = toAmount(invoice.Remaining);
    if (applied <= 0 && Math.abs(remainingNow - nextRemaining) <= 0.0001) return 0;
    await DistrbutorInvoiceModal.findByIdAndUpdate(
        invoice._id,
        { Remaining: nextRemaining, RecivedAmount: nextReceived },
        { runValidators: false }
    );
    invoice.Remaining = nextRemaining;
    invoice.RecivedAmount = nextReceived;
    return applied;
};

const setVoucherLineStrictKnockOff = async (voucher, index, line, { remain, clientRef2 }) => {
    if (!voucher?._id) return;
    const $setByPos = {
        [`VoucharData.${index}.Remain`]: remain,
        [`VoucharData.${index}.ClientRef2`]: clientRef2,
        [`VoucharData.${index}.Ref`]: ""
    };
    const lineId = line?.id;
    if (lineId !== undefined && lineId !== null && String(lineId).trim() !== "") {
        const res = await VoucherModal.updateOne(
            { _id: voucher._id, "VoucharData.id": lineId },
            {
                $set: {
                    "VoucharData.$.Remain": remain,
                    "VoucharData.$.ClientRef2": clientRef2,
                    "VoucharData.$.Ref": ""
                }
            }
        );
        if (res.matchedCount) return;
    }
    await VoucherModal.updateOne(
        { _id: voucher._id },
        { $set: $setByPos }
    );
};

export const runStrictDistributorKnockOff = async (clientId, { apply = false } = {}) => {
    const client = String(clientId || "").trim();
    if (!client) {
        const err = new Error("Distributor is required");
        err.statusCode = 400;
        throw err;
    }

    const salesReturns = await SalesReturnModal.find({ Client: { $in: clientMatchValues(client) } })
        .select({ SalesReturnNumber: 1, Client: 1, SalesFlowRef: 1 })
        .lean();
    const srByVoucher = indexSalesReturnsByVoucher(salesReturns);
    const srVoucherNumbers = salesReturns.map((row) => salesReturnVoucherNumberOf(row.SalesReturnNumber));

    const [invoices, vouchers, openingDoc] = await Promise.all([
        DistrbutorInvoiceModal.find({ Distrbutor: { $in: clientMatchValues(client) } })
            .sort({ InvoiceDate: 1, DitributorInvoiceCode: 1 }),
        VoucherModal.find({
            $or: [
                { "VoucharData.Client": { $in: clientMatchValues(client) } },
                ...(srVoucherNumbers.length ? [{ VoucherNumber: { $in: srVoucherNumbers } }] : [])
            ]
        }).sort({ VoucherDate: 1, VoucherNumber: 1 }),
        InvoiceOpeningModal.findOne()
    ]);
    const openingList = openingRows(openingDoc).filter((row) => isOpeningClient(row, client));
    const vouchersWithSr = attachSalesReturnClients(vouchers, srByVoucher);

    const paymentsByRef = {};
    for (const voucher of vouchersWithSr) {
        const lines = Array.isArray(voucher.VoucharData) ? voucher.VoucharData : [];
        const sr = srByVoucher[voucher.VoucherNumber] || srByVoucher[salesReturnNumberFromVoucher(voucher.VoucherNumber)];
        lines.forEach((line, index) => {
            if (!sameClient(line?.Client, client)) return;
            if (!isClientCreditLine(line)) return;
            const ref = strictInvoiceRefOf(line) || normalizeRef(sr?.SalesFlowRef);
            if (!ref) return;
            if (!paymentsByRef[ref]) paymentsByRef[ref] = [];
            paymentsByRef[ref].push({
                voucher,
                line,
                index,
                voucherNumber: voucher.VoucherNumber,
                lineId: lineIdentity(line, index),
                credit: toAmount(line.Credit),
                remain: toAmount(line.Remain),
                date: voucher.VoucherDate || ""
            });
        });
    }

    const invoiceByRef = indexStrictInvoices(invoices, openingList, openingDoc);
    const groups = groupStrictPaymentsByInvoice(paymentsByRef, invoiceByRef);

    const results = [];

    for (const { entry, payments, invoiceRef } of groups) {
        const inv = entry.doc;
        const remainingBefore = invoiceRemainOf(inv);
        const receivedBefore = toAmount(inv.RecivedAmount);
        const plan = planStrictInvoiceKnockOff({
            invoiceAmount: invoiceTotalOf(inv),
            remaining: remainingBefore,
            received: receivedBefore,
            payments,
            invoiceRef
        });
        if (plan.action === "skip") continue;

        let appliedToInvoice = plan.applyToInvoice;
        if (apply) {
            appliedToInvoice = entry.kind === "opening"
                ? await settleOpeningInvoiceToReceived(entry.opening, inv, plan.targetApplied)
                : await settleDistributorInvoiceToReceived(inv, plan.targetApplied);
            for (const upd of plan.lineUpdates) {
                if (upd.mark <= 0 && !upd.refsChanged) continue;
                if (upd.line) {
                    upd.line.Remain = upd.newRemain;
                    upd.line.ClientRef2 = upd.clientRef2;
                    upd.line.Ref = "";
                }
                await setVoucherLineStrictKnockOff(upd.voucher, upd.index, upd.line, {
                    remain: upd.newRemain,
                    clientRef2: upd.clientRef2
                });
            }
        }

        results.push({
            invoice: invoiceRef,
            kind: entry.kind,
            invoiceAmount: plan.invoiceAmount,
            remainingBefore,
            remainingAfter: plan.remainingAfter,
            receivedBefore,
            paymentTotal: plan.paymentTotal,
            appliedToInvoice,
            leftoverKnockoff: plan.leftoverKnockoff,
            payments: plan.lineUpdates.map((row) => ({
                voucherNumber: row.voucherNumber,
                lineId: row.lineId,
                credit: row.credit,
                remainBefore: row.remain,
                remainAfter: row.newRemain,
                leftoverAfter: row.leftoverAfter,
                convertToAdvance: row.convertToAdvance,
                clientRef2: row.clientRef2
            })),
            action: plan.action
        });
    }

    const summary = results.reduce((acc, row) => {
        acc.invoices += 1;
        acc.paymentTotal = round2(acc.paymentTotal + row.paymentTotal);
        acc.appliedToInvoice = round2(acc.appliedToInvoice + row.appliedToInvoice);
        acc.leftoverKnockoff = round2(acc.leftoverKnockoff + row.leftoverKnockoff);
        return acc;
    }, { invoices: 0, paymentTotal: 0, appliedToInvoice: 0, leftoverKnockoff: 0 });

    return {
        clientId: client,
        applied: apply,
        summary,
        invoices: results
    };
};

export const previewStrictDistributorKnockOff = (clientId) =>
    runStrictDistributorKnockOff(clientId, { apply: false });

export const applyStrictDistributorKnockOff = (clientId) =>
    runStrictDistributorKnockOff(clientId, { apply: true });

