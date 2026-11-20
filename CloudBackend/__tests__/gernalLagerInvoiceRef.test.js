import {
    attachPrInvoiceRefs,
    collectPrPurchaseInvoiceNumbers,
    isPrVoucher,
    purchaseInvoiceNumberFromVoucher
} from "../utils/gernalLagerInvoiceRef.js";

describe("gernalLagerInvoiceRef", () => {
    test("detects PR voucher type regardless of case", () => {
        expect(isPrVoucher("Pr")).toBe(true);
        expect(isPrVoucher("PR")).toBe(true);
        expect(isPrVoucher("pr", "Pr001000001")).toBe(true);
        expect(isPrVoucher("", "Pr001000001")).toBe(true);
        expect(isPrVoucher("SL", "SL000123")).toBe(false);
        expect(isPrVoucher("JV")).toBe(false);
    });

    test("strips Pr prefix from voucher number", () => {
        expect(purchaseInvoiceNumberFromVoucher("Pr001000001")).toBe("001000001");
        expect(purchaseInvoiceNumberFromVoucher("PRABC123")).toBe("ABC123");
        expect(purchaseInvoiceNumberFromVoucher("SL000123")).toBe("");
        expect(purchaseInvoiceNumberFromVoucher("")).toBe("");
    });

    test("collects missing PR invoice numbers only", () => {
        expect(collectPrPurchaseInvoiceNumbers([
            { VoucherType: "Pr", VoucherNumber: "Pr001000001" },
            { VoucherType: "Pr", VoucherNumber: "Pr001000002", InvoiceRef: "INV-9" },
            { VoucherType: "SL", VoucherNumber: "SL000123" },
            { VoucherType: "JV", VoucherNumber: "JV000010" }
        ])).toEqual(["001000001"]);
    });

    test("attaches InvoiceRef for PR rows from lookup map", () => {
        const rows = [
            { VoucherType: "Pr", VoucherNumber: "Pr001000001", Debit: 100 },
            { VoucherType: "Pr", VoucherNumber: "Pr001000002", InvoiceRef: "ALREADY" },
            { VoucherType: "SL", VoucherNumber: "SL000123" }
        ];
        const attached = attachPrInvoiceRefs(rows, {
            "001000001": "VENDOR-INV-88",
            "001000002": "SHOULD-NOT-OVERRIDE"
        });

        expect(attached[0].InvoiceRef).toBe("VENDOR-INV-88");
        expect(attached[1].InvoiceRef).toBe("ALREADY");
        expect(attached[2].InvoiceRef).toBeUndefined();
    });
});
