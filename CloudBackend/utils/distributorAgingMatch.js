// Match the Client Aging Ledger "Aging" figure to the "Ledger Balance"
// by rewriting Remaining / RecivedAmount on DistrbutorInvoice.
// Sales invoices, opening invoices, and cheques are never touched.
// A positive ledger clears open knockoff (Remain is set equal to Credit).
// A negative ledger puts that credit balance into knockoff. The voucher is
// balanced, so the ledger total does not move. A zero ledger does not
// change real knockoff.
// Voucher Credit and Debit stay as they are, so the ledger balance does not move.

const round2 = (val) => {
    const n = Number(String(val ?? 0).replace(/,/g, ""));
    if (!Number.isFinite(n)) return 0;
    return Number(n.toFixed(2));
};

// Negative ledger: knockoff should show the credit balance.
// add = how much new knockoff is still needed on top of the amount already open.
export const planNegativeKnockoffFill = ({ ledger, currentKnockoff } = {}) => {
    const creditBalance = round2(Math.max(0, -round2(ledger)));
    const current = round2(Math.max(0, currentKnockoff));
    return {
        creditBalance,
        current,
        add: round2(Math.max(0, creditBalance - current))
    };
};

// Open knockoff is Credit - Remain. Clearing it sets Remain to Credit.
export const planKnockoffClear = (lines = []) => {
    const updates = [];
    for (const line of Array.isArray(lines) ? lines : []) {
        const credit = round2(line?.Credit);
        const remain = round2(line?.Remain);
        const open = round2(Math.max(0, credit - remain));
        if (open <= 0.001 || credit <= 0) continue;
        updates.push({
            voucherId: line?.voucherId,
            voucherNumber: line?.voucherNumber || "",
            lineId: line?.id,
            credit,
            remainBefore: remain,
            remainAfter: credit,
            cleared: open
        });
    }
    const cleared = round2(updates.reduce((sum, row) => sum + row.cleared, 0));
    return { cleared, lines: updates.length, updates };
};

const invoiceSortKey = (inv) =>
    `${String(inv?.InvoiceDate || "")}\u0000${String(inv?.DitributorInvoiceCode || "")}`;

const byFifo = (a, b) => invoiceSortKey(a).localeCompare(invoiceSortKey(b), undefined, { numeric: true });

export const distributorInvoiceOpen = (inv) => {
    const total = round2(Math.max(0, inv?.TotalAmount));
    const received = round2(Math.max(0, inv?.RecivedAmount));
    const hasRemaining = inv?.Remaining !== undefined && inv?.Remaining !== null && inv?.Remaining !== "";
    let remaining = hasRemaining
        ? round2(inv.Remaining)
        : round2(Math.max(0, total - received));
    if (remaining < 0) remaining = 0;
    if (total > 0 && remaining > total) remaining = round2(total);
    return { total, received, remaining };
};

// Same store rule as getClientAgingLedger: a blank store stays in every filter.
export const distributorInvoiceInStore = (storeId, storeArray = []) => {
    const stores = (Array.isArray(storeArray) ? storeArray : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean);
    if (!stores.length || stores.includes("All")) return true;
    const id = String(storeId ?? "").trim();
    if (!id) return true;
    return stores.includes(id);
};

const amountsAfter = (inv, nextRemaining) => {
    let remaining = round2(Math.max(0, nextRemaining));
    if (inv.total > 0 && remaining > inv.total) remaining = round2(inv.total);
    const received = inv.total > 0
        ? round2(Math.max(0, inv.total - remaining))
        : round2(Math.max(0, inv.received));
    return { remaining, received };
};

/**
 * @param {{ aging: number, ledger: number, invoices: Array }} input
 * Screen aging and ledger are the Client Aging Ledger row.
 * Invoices must already be this client's distributor invoices inside the report window.
 * ledger <= 0 sets every distributor remaining to 0.
 * aging > ledger reduces oldest invoices first (FIFO) until aging equals the ledger.
 * ledger > aging increases newest invoices first (LIFO), never above TotalAmount.
 */
export const planDistributorAgingMatch = ({ aging, ledger, invoices } = {}) => {
    const agingNow = round2(aging);
    const ledgerNow = round2(ledger);
    const target = ledgerNow <= 0 ? 0 : ledgerNow;
    const list = (Array.isArray(invoices) ? invoices : []).map((inv) => ({
        _id: inv?._id,
        DitributorInvoiceCode: inv?.DitributorInvoiceCode || "",
        InvoiceDate: inv?.InvoiceDate || "",
        ...distributorInvoiceOpen(inv)
    }));

    const updates = [];
    const write = (inv, nextRemaining) => {
        const next = amountsAfter(inv, nextRemaining);
        if (
            Math.abs(next.remaining - inv.remaining) < 0.001 &&
            Math.abs(next.received - inv.received) < 0.001
        ) {
            return 0;
        }
        const applied = round2(inv.remaining - next.remaining);
        updates.push({
            _id: inv._id,
            invoice: inv.DitributorInvoiceCode,
            invoiceDate: inv.InvoiceDate,
            remainingBefore: inv.remaining,
            remainingAfter: next.remaining,
            receivedBefore: inv.received,
            receivedAfter: next.received,
            applied
        });
        inv.remaining = next.remaining;
        inv.received = next.received;
        return applied;
    };

    const finish = (action, basis, moved) => {
        const agingAfter = action === "increase"
            ? round2(agingNow + moved)
            : round2(Math.max(0, agingNow - moved));
        const shortfall = action === "increase"
            ? round2(Math.max(0, target - agingAfter))
            : round2(Math.max(0, agingAfter - target));
        return {
            action,
            basis,
            aging: agingNow,
            ledger: ledgerNow,
            target,
            agingAfter,
            matched: shortfall <= 0.5,
            shortfall,
            updatedCount: updates.length,
            invoices: updates
        };
    };

    if (ledgerNow <= 0) {
        let moved = 0;
        for (const inv of [...list].sort(byFifo)) {
            moved = round2(moved + write(inv, 0));
        }
        return finish("zero", "all", moved);
    }

    const gap = round2(target - agingNow);
    if (Math.abs(gap) <= 0.5) {
        return finish("skip", "none", 0);
    }

    if (gap < 0) {
        let need = round2(-gap);
        let moved = 0;
        for (const inv of [...list].sort(byFifo)) {
            if (need <= 0.001) break;
            if (inv.remaining <= 0) continue;
            const apply = Math.min(need, inv.remaining);
            const done = write(inv, inv.remaining - apply);
            need = round2(need - done);
            moved = round2(moved + done);
        }
        return finish("reduce", "fifo", moved);
    }

    let need = gap;
    let moved = 0;
    for (const inv of [...list].sort((a, b) => byFifo(b, a))) {
        if (need <= 0.001) break;
        const headroom = round2(Math.max(0, inv.total - inv.remaining));
        if (headroom <= 0) continue;
        const apply = Math.min(need, headroom);
        const done = write(inv, inv.remaining + apply);
        const increased = round2(-done);
        need = round2(need - increased);
        moved = round2(moved + increased);
    }
    return finish("increase", "lifo", moved);
};

// Positive ledger only. Every distributor invoice is closed, then invoices are
// opened from the bottom of a date list (newest first) until the open amount
// equals the ledger. Vouchers are not part of this plan.
export const planRebuildOpenFromBottom = ({ ledger, invoices } = {}) => {
    const ledgerNow = round2(ledger);
    const list = (Array.isArray(invoices) ? invoices : []).map((inv) => ({
        _id: inv?._id,
        DitributorInvoiceCode: inv?.DitributorInvoiceCode || "",
        InvoiceDate: inv?.InvoiceDate || "",
        ...distributorInvoiceOpen(inv)
    }));
    const bottomFirst = [...list].sort((a, b) => byFifo(b, a));
    const openNow = round2(list.reduce((sum, inv) => sum + inv.remaining, 0));

    if (ledgerNow <= 0) {
        return {
            action: "skip",
            basis: "none",
            ledger: ledgerNow,
            target: 0,
            agingAfter: openNow,
            matched: false,
            shortfall: 0,
            updatedCount: 0,
            invoices: []
        };
    }

    let need = ledgerNow;
    const openById = new Map();
    for (const inv of bottomFirst) {
        const room = round2(Math.max(0, inv.total));
        const open = need > 0.001 ? round2(Math.min(need, room)) : 0;
        openById.set(String(inv._id), open);
        if (need > 0.001) need = round2(need - open);
    }

    const updates = [];
    let agingAfter = 0;
    for (const inv of bottomFirst) {
        const nextRemaining = openById.get(String(inv._id)) || 0;
        agingAfter = round2(agingAfter + nextRemaining);
        const next = amountsAfter(inv, nextRemaining);
        if (
            Math.abs(next.remaining - inv.remaining) < 0.001 &&
            Math.abs(next.received - inv.received) < 0.001
        ) {
            continue;
        }
        updates.push({
            _id: inv._id,
            invoice: inv.DitributorInvoiceCode,
            invoiceDate: inv.InvoiceDate,
            remainingBefore: inv.remaining,
            remainingAfter: next.remaining,
            receivedBefore: inv.received,
            receivedAfter: next.received,
            applied: round2(inv.remaining - next.remaining)
        });
    }

    const shortfall = round2(Math.max(0, ledgerNow - agingAfter));
    return {
        action: "rebuild",
        basis: "bottom",
        ledger: ledgerNow,
        target: ledgerNow,
        agingAfter,
        matched: shortfall <= 0.5,
        shortfall,
        updatedCount: updates.length,
        invoices: updates
    };
};

const clientMatchValues = async (clientId) => {
    const mongoose = (await import("mongoose")).default;
    const values = [String(clientId || "").trim()].filter(Boolean);
    try {
        if (mongoose.Types.ObjectId.isValid(clientId)) {
            const objectId = new mongoose.Types.ObjectId(clientId);
            if (String(objectId) === String(clientId)) values.push(objectId);
        }
    } catch (_) { /* keep the string id */ }
    return values;
};

// Writes distributor invoice balances. A positive ledger clears knockoff.
// A negative ledger puts the credit balance into knockoff.
export const applyDistributorAgingMatch = async ({ clientId, aging, ledger, startDate, endDate, store } = {}) => {
    const { default: DistrbutorInvoiceModal } = await import("../modal/DistrbutorInvoiceModal.js");
    const agingStart = startDate && String(startDate) < "2020-01-01" ? String(startDate) : "2020-01-01";
    const storeArray = String(store || "").split(",").map((id) => id.trim()).filter(Boolean);
    const query = {
        Distrbutor: { $in: await clientMatchValues(clientId) },
        InvoiceDate: { $gte: agingStart, $lte: String(endDate || "") }
    };
    if (storeArray.length && !storeArray.includes("All")) {
        query.$or = [
            { Store: { $in: storeArray } },
            { Store: { $in: [null, ""] } },
            { Store: { $exists: false } }
        ];
    }

    const docs = await DistrbutorInvoiceModal.find(query)
        .select({
            DitributorInvoiceCode: 1,
            InvoiceDate: 1,
            TotalAmount: 1,
            RecivedAmount: 1,
            Remaining: 1,
            Store: 1
        })
        .lean();
    const inWindow = docs.filter((doc) => distributorInvoiceInStore(doc.Store, storeArray));
    const plan = planDistributorAgingMatch({ aging, ledger, invoices: inWindow });
    const writes = plan.invoices.filter((row) => row._id);
    if (writes.length) {
        await DistrbutorInvoiceModal.bulkWrite(writes.map((row) => ({
            updateOne: {
                filter: { _id: row._id },
                update: {
                    $set: {
                        Remaining: row.remainingAfter,
                        RecivedAmount: row.receivedAfter
                    }
                }
            }
        })));
    }
    const ledgerNow = round2(ledger);
    let knockoff = { cleared: 0, lines: 0, filled: 0 };
    if (ledgerNow > 0) {
        await upsertAgingKnockoff(clientId, 0, endDate);
        knockoff = await clearClientKnockoff(clientId, storeArray);
    } else if (ledgerNow < 0) {
        knockoff = await fillNegativeLedgerKnockoff(clientId, ledgerNow, storeArray, endDate);
    } else if (round2(plan.agingAfter) <= 0.5) {
        await upsertAgingKnockoff(clientId, 0, endDate);
        knockoff = await clearClientKnockoff(clientId, storeArray);
    } else {
        await upsertAgingKnockoff(clientId, 0, endDate);
    }

    return {
        ...plan,
        knockoffCleared: knockoff.cleared,
        knockoffLines: knockoff.lines,
        knockoffFilled: knockoff.filled || 0
    };
};

// Same distributor invoices as the match, but vouchers and knockoff are not written.
// A positive ledger closes every invoice, then opens from the newest until the
// open amount equals the ledger. The ledger balance does not move.
export const applyRebuildOpenFromBottom = async ({ clientId, ledger, startDate, endDate, store } = {}) => {
    const { default: DistrbutorInvoiceModal } = await import("../modal/DistrbutorInvoiceModal.js");
    const agingStart = startDate && String(startDate) < "2020-01-01" ? String(startDate) : "2020-01-01";
    const storeArray = String(store || "").split(",").map((id) => id.trim()).filter(Boolean);
    const query = {
        Distrbutor: { $in: await clientMatchValues(clientId) },
        InvoiceDate: { $gte: agingStart, $lte: String(endDate || "") }
    };
    if (storeArray.length && !storeArray.includes("All")) {
        query.$or = [
            { Store: { $in: storeArray } },
            { Store: { $in: [null, ""] } },
            { Store: { $exists: false } }
        ];
    }

    const docs = await DistrbutorInvoiceModal.find(query)
        .select({
            DitributorInvoiceCode: 1,
            InvoiceDate: 1,
            TotalAmount: 1,
            RecivedAmount: 1,
            Remaining: 1,
            Store: 1
        })
        .lean();
    const inWindow = docs.filter((doc) => distributorInvoiceInStore(doc.Store, storeArray));
    const plan = planRebuildOpenFromBottom({ ledger, invoices: inWindow });
    const writes = plan.invoices.filter((row) => row._id);
    if (writes.length) {
        await DistrbutorInvoiceModal.bulkWrite(writes.map((row) => ({
            updateOne: {
                filter: { _id: row._id },
                update: {
                    $set: {
                        Remaining: row.remainingAfter,
                        RecivedAmount: row.receivedAfter
                    }
                }
            }
        })));
    }
    return plan;
};

const KNOCKOFF_NARRATION = "Client aging knockoff";
const KNOCKOFF_LINE_ID = "ak-credit";

const isAdjustmentKnockoffLine = (line) =>
    line?.id === KNOCKOFF_LINE_ID || line?.Narration === KNOCKOFF_NARRATION;

const sumShownKnockoff = (pool, clientId, storeArray) => {
    let total = 0;
    for (const voucher of pool || []) {
        for (const line of voucher?.VoucharData || []) {
            if (isAdjustmentKnockoffLine(line)) continue;
            const lineClient = line?.Client?._id || line?.Client;
            if (lineClient && !sameClientId(lineClient, clientId)) continue;
            const storeId = line?.store || line?.Store || "";
            if (!distributorInvoiceInStore(storeId, storeArray)) continue;
            const open = round2(Math.max(0, round2(line?.Credit) - round2(line?.Remain)));
            total = round2(total + open);
        }
    }
    return total;
};

const agingKnockoffRef = (clientId) => `AGING-KNOCKOFF:${clientId}`;

const voucherDateOf = (endDate) => {
    const date = String(endDate || "");
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
};

// Balanced voucher: credit shows in knockoff, the matching debit keeps the ledger still.
const upsertAgingKnockoff = async (clientId, amount, endDate) => {
    const { default: VoucherModal } = await import("../modal/VoucherModal.js");
    const ref = agingKnockoffRef(clientId);
    const wanted = round2(Math.max(0, amount));
    const existing = await VoucherModal.findOne({ Ref: ref });
    if (wanted <= 0.5) {
        if (existing) await VoucherModal.deleteOne({ _id: existing._id });
        return { amount: 0 };
    }
    const lines = [
        {
            id: KNOCKOFF_LINE_ID,
            Client: String(clientId),
            Credit: wanted,
            Debit: 0,
            Remain: 0,
            ClientRef2: "Advance",
            Narration: KNOCKOFF_NARRATION,
            store: "",
            Store: ""
        },
        {
            id: "ak-debit",
            Client: String(clientId),
            Credit: 0,
            Debit: wanted,
            Remain: 0,
            Narration: "Client aging knockoff offset",
            store: "",
            Store: ""
        }
    ];
    if (existing) {
        existing.VoucherDate = voucherDateOf(endDate);
        existing.VoucharData = lines;
        existing.TotalDebit = String(wanted);
        existing.TotalCredit = String(wanted);
        existing.Remarks = "Client aging knockoff. Ledger balance is unchanged.";
        existing.markModified("VoucharData");
        await existing.save();
        return { amount: wanted, voucherNumber: existing.VoucherNumber };
    }
    let voucherNumber = `AK${String(clientId).slice(-10)}`;
    const clash = await VoucherModal.findOne({ VoucherNumber: voucherNumber }).select({ _id: 1 }).lean();
    if (clash) voucherNumber = `AK${String(clientId).slice(-6)}${Date.now().toString().slice(-6)}`;
    const created = await VoucherModal.create({
        VoucherType: "JV",
        VoucherNumber: voucherNumber,
        VoucherDate: voucherDateOf(endDate),
        Ref: ref,
        status: "true",
        VoucharData: lines,
        TotalDebit: String(wanted),
        TotalCredit: String(wanted),
        Remarks: "Client aging knockoff. Ledger balance is unchanged."
    });
    return { amount: wanted, voucherNumber: created.VoucherNumber };
};

const fillNegativeLedgerKnockoff = async (clientId, ledger, storeArray, endDate) => {
    const { getKnockoffPoolVouchers } = await import("./invoiceKnockOff.js");
    const pool = await getKnockoffPoolVouchers(clientId);
    const current = sumShownKnockoff(pool, clientId, storeArray);
    const plan = planNegativeKnockoffFill({ ledger, currentKnockoff: current });
    const saved = await upsertAgingKnockoff(clientId, plan.add, endDate);
    return { cleared: 0, lines: saved.amount > 0 ? 1 : 0, filled: plan.creditBalance };
};

const sameClientId = (lineClient, clientId) => String(lineClient || "").trim() === String(clientId || "").trim();

// Sets Remain = Credit on the knockoff lines this client shows in Knockoff Remaining.
// Credit and Debit are left unchanged.
const clearClientKnockoff = async (clientId, storeArray = []) => {
    const { getKnockoffPoolVouchers } = await import("./invoiceKnockOff.js");
    const { default: VoucherModal } = await import("../modal/VoucherModal.js");
    const pool = await getKnockoffPoolVouchers(clientId);
    const wanted = [];
    for (const voucher of pool || []) {
        for (const line of voucher?.VoucharData || []) {
            const lineClient = line?.Client?._id || line?.Client;
            if (lineClient && !sameClientId(lineClient, clientId)) continue;
            const storeId = line?.store || line?.Store || "";
            if (!distributorInvoiceInStore(storeId, storeArray)) continue;
            const planned = planKnockoffClear([{
                ...line,
                voucherId: voucher._id,
                voucherNumber: voucher.VoucherNumber
            }]);
            wanted.push(...planned.updates);
        }
    }
    if (!wanted.length) return { cleared: 0, lines: 0 };

    const byVoucher = new Map();
    for (const row of wanted) {
        const key = String(row.voucherId || "");
        if (!key) continue;
        if (!byVoucher.has(key)) byVoucher.set(key, []);
        byVoucher.get(key).push(row);
    }

    let cleared = 0;
    let lines = 0;
    for (const [voucherId, rows] of byVoucher) {
        const voucher = await VoucherModal.findById(voucherId);
        if (!voucher) continue;
        const data = Array.isArray(voucher.VoucharData) ? voucher.VoucharData : [];
        let changed = false;
        for (const row of rows) {
            let index = -1;
            if (row.lineId !== undefined && row.lineId !== null && String(row.lineId).trim() !== "") {
                index = data.findIndex((line) => String(line?.id) === String(row.lineId));
            }
            if (index < 0) {
                index = data.findIndex((line) =>
                    round2(line?.Credit) === row.credit &&
                    round2(line?.Remain) === row.remainBefore &&
                    (sameClientId(line?.Client?._id || line?.Client, clientId) || !line?.Client)
                );
            }
            if (index < 0) continue;
            const open = round2(Math.max(0, round2(data[index].Credit) - round2(data[index].Remain)));
            if (open <= 0.001) continue;
            data[index].Remain = round2(data[index].Credit);
            cleared = round2(cleared + open);
            lines += 1;
            changed = true;
        }
        if (changed) {
            voucher.markModified("VoucharData");
            await voucher.save();
        }
    }
    return { cleared, lines };
};

const knockoffSentence = (ledger) => {
    if (round2(ledger) > 0) return " Knockoff amount is now 0.";
    if (round2(ledger) < 0) return " The credit balance is now in knockoff.";
    return "";
};

export const describeAgingMatch = (result) => {
    if (!result || result.action === "skip") {
        if (round2(result?.ledger) > 0) return "Aging already matches the ledger. Knockoff amount is now 0.";
        if (round2(result?.ledger) < 0) return "Aging is already 0. The credit balance is now in knockoff.";
        return "Aging already matches the ledger.";
    }
    const agingAfter = round2(result.agingAfter);
    const target = round2(result.target);
    const knockoffNote = knockoffSentence(result.ledger);
    if (result.matched && result.action === "zero") {
        if (round2(result.ledger) < 0) {
            return "Distributor invoice aging is now 0. The credit balance is now in knockoff.";
        }
        if (round2(result.ledger) === 0) {
            return "Distributor invoice aging is now 0. Knockoff amount is now 0.";
        }
        return "Distributor invoice aging is now 0. Only distributor invoices were updated.";
    }
    if (result.matched && result.action === "reduce") {
        return `Aging was reduced on FIFO basis to match the ledger. Only distributor invoices were updated.${knockoffNote}`;
    }
    if (result.matched && result.action === "increase") {
        return `Aging was increased on LIFO basis to match the ledger. Only distributor invoices were updated.${knockoffNote}`;
    }
    if (result.action === "zero") {
        return `Distributor invoices were set to 0. Aging is still ${agingAfter.toFixed(2)} because that amount is not on distributor invoices.${knockoffNote}`;
    }
    if (result.action === "reduce") {
        return `Distributor invoices were reduced on FIFO basis. Aging is ${agingAfter.toFixed(2)} and the ledger is ${target.toFixed(2)}. The remaining gap is not on distributor invoices.${knockoffNote}`;
    }
    return `Distributor invoices were increased on LIFO basis up to their invoice total. Aging is ${agingAfter.toFixed(2)} and the ledger is ${target.toFixed(2)}. Distributor invoices have no further amount to add.${knockoffNote}`;
};

export const describeRebuildOpenFromBottom = (result) => {
    if (!result || result.action === "skip") {
        return "Ledger is not positive, so invoices were left as they are. The ledger was not changed.";
    }
    const open = round2(result.agingAfter);
    const target = round2(result.target);
    if (result.matched) {
        return `All distributor invoices were closed, then opened from the newest until the open amount equals the ledger (${open.toFixed(2)}). The ledger was not changed.`;
    }
    return `Distributor invoices were closed and opened from the newest up to their invoice total. Open amount is ${open.toFixed(2)} and the ledger is ${target.toFixed(2)}. The ledger was not changed.`;
};
