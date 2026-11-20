import {
    collectKnockOffLines,
    collectRealizeLines,
    leftoverOf,
    isClientCreditLine,
    lineIdentity,
    groupKnockOffTotals,
    sameKnockOffAllocation,
    findRemainingOverflows,
    pickInvoiceMatch,
    isForDistributor,
    planStrictInvoiceKnockOff,
    strictInvoiceRefOf,
    strictKnockOffClientRef2,
    strictLeftoverInKnockoffPool,
    isAdvanceKnockoffRef,
    indexStrictInvoices,
    groupStrictPaymentsByInvoice,
    isSalesReturnVoucher,
    salesReturnNumberFromVoucher,
    salesReturnVoucherNumberOf,
    attachSalesReturnClients
} from "../utils/invoiceKnockOff.js";

describe("voucher realize helpers", () => {
    test("leftover is credit minus remain", () => {
        expect(leftoverOf({ Credit: 1000, Remain: 250 })).toBe(750);
        expect(leftoverOf({ Credit: "1,200", Remain: "200" })).toBe(1000);
        expect(leftoverOf({ Credit: 100, Remain: 100 })).toBe(0);
        expect(leftoverOf({ Credit: 50, Remain: 80 })).toBe(0);
    });

    test("client credit lines skip bank debit rows", () => {
        expect(isClientCreditLine({ Client: "abc", Credit: 500 })).toBe(true);
        expect(isClientCreditLine({ Debit: 500 })).toBe(false);
        expect(isClientCreditLine({ Client: "abc", Credit: 0, Debit: 500 })).toBe(false);
    });

    test("line identity prefers voucher line id", () => {
        expect(lineIdentity({ id: "row-1" }, 4)).toBe("row-1");
        expect(lineIdentity({}, 4)).toBe("4");
    });

    test("collects invoice refs from ClientRef2 and ChqRef", () => {
        expect(collectKnockOffLines([
            { ClientRef2: "067645", Credit: 87261, Client: "dist-1" }
        ])).toEqual([{ invoiceRef: "067645", amount: 87261, client: "dist-1" }]);

        expect(collectKnockOffLines([
            {
                Credit: 100,
                Client: "dist-1",
                ChqRef: [
                    { Am: 40, ref: "048904" },
                    { Am: 60, ref: "048907" }
                ]
            }
        ])).toEqual([
            { invoiceRef: "048904", amount: 40, client: "dist-1" },
            { invoiceRef: "048907", amount: 60, client: "dist-1" }
        ]);
    });

    test("drops UnRealized / Advance refs", () => {
        expect(collectKnockOffLines([
            { ClientRef2: "UnRealized", Credit: 500 }
        ])).toEqual([]);

        expect(collectRealizeLines({
            ClientRef2: "UnRealized",
            Credit: 500
        })).toEqual([]);

        expect(collectRealizeLines({
            ClientRef2: "UnRealized , 217940",
            Credit: 500
        })).toEqual([{ invoiceRef: "217940", amount: 500 }]);
    });

    test("splits comma invoice refs for realize", () => {
        expect(collectRealizeLines({
            Ref: "048907, 049095",
            Credit: 334362
        })).toEqual([
            { invoiceRef: "048907", amount: 334362 },
            { invoiceRef: "049095", amount: 334362 }
        ]);
    });

    test("groups payment amounts by invoice ref", () => {
        expect(groupKnockOffTotals([
            { ClientRef2: "067645", Credit: 60 },
            { ClientRef2: "067645", Credit: 50 },
            { ClientRef2: "Advance", Credit: 20 }
        ])).toEqual({ "067645": 110 });
    });

    test("same knock-off allocation ignores narration and advance", () => {
        const oldRows = [
            { ClientRef2: "067645", Credit: 100, Client: "c1", Narration: "a" },
            { ClientRef2: "Advance", Credit: 50, Client: "c1" }
        ];
        const sameRows = [
            { ClientRef2: "Advance", Credit: 80, Client: "c1" },
            { ClientRef2: "067645", Credit: 100, Client: "c1", Narration: "b" }
        ];
        expect(sameKnockOffAllocation(oldRows, "Yes", sameRows, "yes")).toBe(true);
        expect(sameKnockOffAllocation(oldRows, "Yes", [
            { ClientRef2: "067645", Credit: 90, Client: "c1" }
        ], "Yes")).toBe(false);
        expect(sameKnockOffAllocation(oldRows, "Yes", oldRows, "No")).toBe(false);
        expect(sameKnockOffAllocation(oldRows, "Yes", [
            { ClientRef2: "067645", Credit: 100, Client: "c2" }
        ], "Yes")).toBe(false);
    });

    test("rejects payment that exceeds remaining", () => {
        expect(findRemainingOverflows(
            { "067645": 500 },
            { "067645": { kind: "sales", remaining: 200 } }
        )).toEqual([expect.objectContaining({
            reason: "exceeds_remaining",
            invoiceRef: "067645",
            amount: 500,
            remaining: 200
        })]);
    });

    test("allows payment within remaining", () => {
        expect(findRemainingOverflows(
            { "067645": 200 },
            { "067645": { kind: "sales", remaining: 200 } }
        )).toEqual([]);
    });

    test("legacy post allows already realized remaining", () => {
        expect(findRemainingOverflows(
            { "067645": 200 },
            { "067645": { kind: "sales", remaining: 0 } },
            { allowAlreadyRealized: true }
        )).toEqual([]);
    });
});

describe("distributor payment invoice match", () => {
    const sales = { client: "customer-1" };
    const distributor = { client: "dist-1" };
    const opening = { client: "dist-1" };

    test("forDis Yes treats as distributor receipt", () => {
        expect(isForDistributor("Yes")).toBe(true);
        expect(isForDistributor("yes")).toBe(true);
        expect(isForDistributor("No")).toBe(false);
    });

    test("forDis Yes prefers distributor over sales with the same number", () => {
        expect(pickInvoiceMatch({
            sales,
            distributor,
            opening,
            forDis: "Yes"
        })).toBe("distributor");
    });

    test("without forDis still prefers distributor when line client is the distributor", () => {
        expect(pickInvoiceMatch({
            sales,
            distributor,
            opening,
            client: "dist-1",
            forDis: "No"
        })).toBe("distributor");
    });

    test("customer payment still prefers sales invoice", () => {
        expect(pickInvoiceMatch({
            sales,
            distributor,
            opening,
            client: "customer-1",
            forDis: "No"
        })).toBe("sales");
    });

    test("forDis Yes uses opening when current distributor invoice is missing", () => {
        expect(pickInvoiceMatch({
            sales,
            distributor: null,
            opening,
            client: "dist-1",
            forDis: "Yes"
        })).toBe("opening");
    });
});

describe("strict distributor invoice knockoff", () => {
    test("caps 350000 invoice and leaves 150000 in knockoff leftover", () => {
        const plan = planStrictInvoiceKnockOff({
            invoiceAmount: 350000,
            remaining: 350000,
            received: 0,
            invoiceRef: "INV-1",
            payments: [
                { credit: 200000, remain: 0, ClientRef2: "INV-1", Ref: "INV-1" },
                { credit: 200000, remain: 0, ClientRef2: "INV-1", Ref: "INV-1" },
                { credit: 100000, remain: 0, ClientRef2: "INV-1", Ref: "INV-1" }
            ]
        });

        expect(plan.paymentTotal).toBe(500000);
        expect(plan.targetApplied).toBe(350000);
        expect(plan.applyToInvoice).toBe(350000);
        expect(plan.leftoverKnockoff).toBe(150000);
        expect(plan.remainingAfter).toBe(0);
        expect(plan.lineUpdates.map((row) => row.newRemain)).toEqual([200000, 150000, 0]);
        expect(plan.lineUpdates.map((row) => row.leftoverAfter)).toEqual([0, 50000, 100000]);
        expect(plan.lineUpdates.map((row) => row.convertToAdvance)).toEqual([false, true, true]);
        expect(plan.lineUpdates.map((row) => row.clientRef2)).toEqual([
            "INV-1",
            "Advance , INV-1",
            "Advance"
        ]);
        expect(plan.lineUpdates.map((row) => row.Ref)).toEqual(["", "", ""]);
        expect(plan.action).toBe("apply");
    });

    test("underpayment knocks off only what arrived", () => {
        const plan = planStrictInvoiceKnockOff({
            invoiceAmount: 350000,
            remaining: 350000,
            received: 0,
            payments: [{ credit: 200000, remain: 0 }]
        });
        expect(plan.applyToInvoice).toBe(200000);
        expect(plan.leftoverKnockoff).toBe(0);
        expect(plan.remainingAfter).toBe(150000);
        expect(plan.lineUpdates[0].convertToAdvance).toBe(false);
    });

    test("does not re-apply when invoice already received the invoice amount", () => {
        const plan = planStrictInvoiceKnockOff({
            invoiceAmount: 350000,
            remaining: 0,
            received: 350000,
            payments: [
                { credit: 200000, remain: 0 },
                { credit: 200000, remain: 0 },
                { credit: 100000, remain: 0 }
            ]
        });
        expect(plan.applyToInvoice).toBe(0);
        expect(plan.leftoverKnockoff).toBe(150000);
        expect(plan.lineUpdates.map((row) => row.newRemain)).toEqual([200000, 150000, 0]);
        expect(plan.lineUpdates.map((row) => row.convertToAdvance)).toEqual([false, true, true]);
    });

    test("does not decrease already marked remain", () => {
        const plan = planStrictInvoiceKnockOff({
            invoiceAmount: 350000,
            remaining: 0,
            received: 350000,
            invoiceRef: "INV-1",
            payments: [
                { credit: 200000, remain: 200000, ClientRef2: "INV-1" },
                { credit: 200000, remain: 150000, ClientRef2: "INV-1" },
                { credit: 100000, remain: 0, ClientRef2: "INV-1" }
            ]
        });
        expect(plan.applyToInvoice).toBe(0);
        expect(plan.lineUpdates.map((row) => row.mark)).toEqual([0, 0, 0]);
        expect(plan.lineUpdates.map((row) => row.newRemain)).toEqual([200000, 150000, 0]);
        expect(plan.lineUpdates[2].convertToAdvance).toBe(true);
        expect(plan.lineUpdates.map((row) => row.clientRef2)).toEqual([
            "INV-1",
            "Advance , INV-1",
            "Advance"
        ]);
        expect(plan.leftoverKnockoff).toBe(150000);
        expect(plan.action).toBe("apply");
    });

    test("rewrites ClientRef2 to invoice / Advance+invoice / Advance and clears Ref", () => {
        expect(strictKnockOffClientRef2("INV-1", 200000, 0)).toBe("INV-1");
        expect(strictKnockOffClientRef2("INV-1", 150000, 50000)).toBe("Advance , INV-1");
        expect(strictKnockOffClientRef2("INV-1", 0, 100000)).toBe("Advance");

        const plan = planStrictInvoiceKnockOff({
            invoiceAmount: 350000,
            remaining: 350000,
            received: 0,
            invoiceRef: "INV-1",
            payments: [
                { credit: 200000, remain: 0, ClientRef2: "INV-1", Ref: "INV-1" },
                { credit: 200000, remain: 0, ClientRef2: "INV-1", Ref: "INV-1" },
                { credit: 100000, remain: 0, ClientRef2: "INV-1", Ref: "INV-1" }
            ]
        });
        expect(plan.lineUpdates.map((row) => row.clientRef2)).toEqual([
            "INV-1",
            "Advance , INV-1",
            "Advance"
        ]);
        expect(plan.lineUpdates.every((row) => row.Ref === "")).toBe(true);
        expect(plan.lineUpdates.every((row) => row.refsChanged)).toBe(true);
        expect(plan.leftoverKnockoff).toBe(150000);
    });

    test("skips when remain and ClientRef2 already match", () => {
        const plan = planStrictInvoiceKnockOff({
            invoiceAmount: 350000,
            remaining: 0,
            received: 350000,
            invoiceRef: "INV-1",
            payments: [
                { credit: 200000, remain: 200000, ClientRef2: "INV-1" },
                { credit: 200000, remain: 150000, ClientRef2: "Advance , INV-1" },
                { credit: 100000, remain: 0, ClientRef2: "Advance" }
            ]
        });
        expect(plan.lineUpdates.map((row) => row.mark)).toEqual([0, 0, 0]);
        expect(plan.lineUpdates.every((row) => row.refsChanged === false)).toBe(true);
        expect(plan.action).toBe("skip");
    });

    test("strict leftover enters knockoff only after remain is marked", () => {
        const overpay = [
            { credit: 200000, remain: 200000 },
            { credit: 200000, remain: 150000 },
            { credit: 100000, remain: 0 }
        ];
        expect(strictLeftoverInKnockoffPool({
            invoiceAmount: 350000,
            remaining: 0,
            received: 350000,
            payments: overpay
        })).toBe(true);

        expect(strictLeftoverInKnockoffPool({
            invoiceAmount: 350000,
            remaining: 350000,
            received: 0,
            payments: [
                { credit: 200000, remain: 0 },
                { credit: 200000, remain: 0 },
                { credit: 100000, remain: 0 }
            ]
        })).toBe(false);

        expect(strictLeftoverInKnockoffPool({
            invoiceAmount: 350000,
            remaining: 0,
            received: 350000,
            payments: [{ credit: 350000, remain: 0 }]
        })).toBe(false);

        expect(strictLeftoverInKnockoffPool({
            invoiceAmount: 350000,
            remaining: 0,
            received: 350000,
            payments: [{ credit: 500000, remain: 350000 }]
        })).toBe(true);
    });

    test("treats Advance leftover including knocked-off Advance refs", () => {
        expect(isAdvanceKnockoffRef("Advance")).toBe(true);
        expect(isAdvanceKnockoffRef("UnRealized")).toBe(true);
        expect(isAdvanceKnockoffRef("")).toBe(true);
        expect(isAdvanceKnockoffRef("Advance , 067645")).toBe(true);
        expect(isAdvanceKnockoffRef("067645")).toBe(false);
    });

    test("skips invoice refs Advance and comma lists", () => {
        expect(strictInvoiceRefOf({ ClientRef2: "Advance", Credit: 100 })).toBe("");
        expect(strictInvoiceRefOf({ ClientRef2: "INV-1, INV-2", Credit: 100 })).toBe("");
        expect(strictInvoiceRefOf({ ClientRef2: "067645", Credit: 100 })).toBe("067645");
        expect(strictInvoiceRefOf({
            Credit: 100,
            ChqRef: [{ Am: 100, ref: "048904" }]
        })).toBe("048904");
        expect(strictInvoiceRefOf({
            Credit: 100,
            ChqRef: [{ Am: 40, ref: "048904" }, { Am: 60, ref: "048907" }]
        })).toBe("");
    });

    test("indexes opening invoices when distributor invoice is missing", () => {
        const map = indexStrictInvoices(
            [{ DitributorInvoiceCode: "D-1", InvoiceDate: "2024-02-01" }],
            [
                { Invoice: "OPEN-1", SalesFlowRef: "SF-1", date: "2020-07-01", RemaingAmount: "350000" },
                { Invoice: "D-1", date: "2020-01-01", RemaingAmount: "100" }
            ]
        );
        expect(map["D-1"].kind).toBe("distributor");
        expect(map["OPEN-1"].kind).toBe("opening");
        expect(map["SF-1"].kind).toBe("opening");
        expect(map["SF-1"].doc).toBe(map["OPEN-1"].doc);
    });

    test("groups opening alias payments onto one invoice", () => {
        const opening = { Invoice: "OPEN-1", SalesFlowRef: "SF-1", date: "2020-07-01" };
        const invoiceByRef = indexStrictInvoices([], [opening]);
        const groups = groupStrictPaymentsByInvoice({
            "OPEN-1": [{ credit: 200000, date: "2024-01-02", voucherNumber: "BR2" }],
            "SF-1": [{ credit: 150000, date: "2024-01-01", voucherNumber: "BR1" }]
        }, invoiceByRef);
        expect(groups).toHaveLength(1);
        expect(groups[0].invoiceRef).toBe("OPEN-1");
        expect(groups[0].entry.kind).toBe("opening");
        expect(groups[0].payments.map((row) => row.voucherNumber)).toEqual(["BR1", "BR2"]);
    });

    test("attaches Sales Return client onto the AR credit line", () => {
        expect(isSalesReturnVoucher({ VoucherType: "SR" })).toBe(true);
        expect(isSalesReturnVoucher({ VoucherType: "BR" })).toBe(false);
        expect(salesReturnNumberFromVoucher("SR000123")).toBe("000123");
        expect(salesReturnVoucherNumberOf("000123")).toBe("SR000123");

        const [hydrated] = attachSalesReturnClients(
            [{
                VoucherType: "SR",
                VoucherNumber: "SR000123",
                VoucharData: [
                    { Account: "client-ac", Credit: 50000 },
                    { Account: "discount-ac", Credit: 2000 },
                    { Account: "sales-ac", Debit: 52000 }
                ]
            }],
            { SR000123: { SalesReturnNumber: "000123", Client: "cust-1", SalesFlowRef: "INV-9" } }
        );
        expect(hydrated.VoucharData[0].Client).toBe("cust-1");
        expect(hydrated.VoucharData[1].Client).toBeUndefined();
    });

    test("plans leftover on opening invoice the same FIFO as distributor", () => {
        const plan = planStrictInvoiceKnockOff({
            invoiceAmount: 350000,
            remaining: 350000,
            received: 0,
            invoiceRef: "OPEN-1",
            payments: [
                { credit: 200000, remain: 0, ClientRef2: "OPEN-1" },
                { credit: 200000, remain: 0, ClientRef2: "OPEN-1" }
            ]
        });
        expect(plan.applyToInvoice).toBe(350000);
        expect(plan.leftoverKnockoff).toBe(50000);
        expect(plan.lineUpdates.map((row) => row.clientRef2)).toEqual([
            "OPEN-1",
            "Advance , OPEN-1"
        ]);
    });
});
