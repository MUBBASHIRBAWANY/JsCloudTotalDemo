const SKIP_REFS = new Set(["", "Advance", "UnRealized", "undefined", "null"]);

export const toReportNumber = (val) => {
    const n = Number(String(val ?? 0).replace(/,/g, ""));
    return Number.isNaN(n) ? 0 : n;
};

export const uniqueRefs = (refs = []) => [
    ...new Set(
        (Array.isArray(refs) ? refs : [refs])
            .filter((r) => r !== undefined && r !== null && r !== "")
            .map((r) => String(r).trim())
            .filter(Boolean)
    )
];

export const usableInvoiceRefs = (value) =>
    String(value ?? "")
        .split(",")
        .map((s) => String(s).trim())
        .filter((p) => p && !SKIP_REFS.has(p));

const addPayment = (paymentMap, ref, credit, debit, voucherNumber, chqNo) => {
    const key = String(ref ?? "").trim();
    if (!key || SKIP_REFS.has(key)) return;
    if (!paymentMap[key]) {
        paymentMap[key] = {
            payment: 0,
            debit: 0,
            vouchers: [],
            chequeNumbers: []
        };
    }
    paymentMap[key].payment += toReportNumber(credit);
    paymentMap[key].debit += toReportNumber(debit);
    if (voucherNumber) paymentMap[key].vouchers.push(voucherNumber);
    if (chqNo !== undefined && chqNo !== null && chqNo !== "") {
        paymentMap[key].chequeNumbers.push(chqNo);
    }
};

/**
 * BR/CR invoice payment lines:
 * 1. ClientRef2 present → take line Credit against ClientRef2
 * 2. Else Ref kind → ChqRef { Am, ref } if present, else line Credit against Ref
 * Skip cash/bank contra: no Client and no Credit (debit balancing row).
 * CR/receipt client lines can omit Client or set show:true — still count them.
 */
export const collectVoucherPayments = (vouchers = []) => {
    const paymentMap = {};
    const processedVoucherIds = new Set();

    for (const voucher of vouchers) {
        const voucherId = String(voucher?._id ?? voucher?.VoucherNumber ?? "");
        if (!voucherId || processedVoucherIds.has(voucherId)) continue;
        processedVoucherIds.add(voucherId);

        const lines = Array.isArray(voucher?.VoucharData) ? voucher.VoucharData : [];
        for (const line of lines) {
            const clientId = String(line?.Client ?? "").trim();
            const creditAmt = toReportNumber(line?.Credit);
            // Cash/bank balancing row: Debit only, no client
            if (!clientId && creditAmt <= 0) continue;

            const clientRefs = usableInvoiceRefs(line?.ClientRef2);
            const chqRefs = Array.isArray(line?.ChqRef)
                ? line.ChqRef
                : (line?.ChqRef ? [line.ChqRef] : []);
            const chqNo = line?.Chq ?? voucher?.ChequeNumber;

            if (clientRefs.length === 1) {
                addPayment(
                    paymentMap,
                    clientRefs[0],
                    line?.Credit,
                    line?.Debit,
                    voucher?.VoucherNumber,
                    chqNo
                );
                continue;
            }

            if (chqRefs.length) {
                for (const cr of chqRefs) {
                    addPayment(
                        paymentMap,
                        cr?.ref,
                        cr?.Am,
                        0,
                        voucher?.VoucherNumber,
                        chqNo
                    );
                }
                continue;
            }

            const lineRefs = usableInvoiceRefs(line?.Ref);
            if (lineRefs.length === 1) {
                addPayment(
                    paymentMap,
                    lineRefs[0],
                    line?.Credit,
                    line?.Debit,
                    voucher?.VoucherNumber,
                    chqNo
                );
            }
        }
    }

    return paymentMap;
};

export const paymentsForInvoice = (refs, paymentMap = {}) => {
    const acc = { payment: 0, vouchers: [], chequeNumbers: [] };
    for (const ref of uniqueRefs(refs)) {
        const row = paymentMap[ref];
        if (!row) continue;
        acc.payment += toReportNumber(row.payment) - toReportNumber(row.debit);
        acc.vouchers.push(...(row.vouchers || []));
        acc.chequeNumbers.push(...(row.chequeNumbers || []));
    }
    return acc;
};
