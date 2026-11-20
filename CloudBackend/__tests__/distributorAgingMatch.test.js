import {
    describeAgingMatch,
    describeRebuildOpenFromBottom,
    distributorInvoiceInStore,
    planDistributorAgingMatch,
    planKnockoffClear,
    planNegativeKnockoffFill,
    planRebuildOpenFromBottom
} from "../utils/distributorAgingMatch.js";

const invoice = (code, date, total, remaining, received = null) => ({
    _id: code,
    DitributorInvoiceCode: code,
    InvoiceDate: date,
    TotalAmount: total,
    Remaining: remaining,
    RecivedAmount: received == null ? round(total - remaining) : received
});

const round = (n) => Number(Number(n).toFixed(2));

describe("planDistributorAgingMatch", () => {
    test("aging above the ledger is reduced FIFO, oldest invoices first", () => {
        const result = planDistributorAgingMatch({
            aging: 50000,
            ledger: 5000,
            invoices: [
                invoice("000002", "2024-06-01", 20000, 20000),
                invoice("000001", "2024-01-01", 30000, 30000)
            ]
        });

        expect(result.action).toBe("reduce");
        expect(result.basis).toBe("fifo");
        expect(result.matched).toBe(true);
        expect(result.agingAfter).toBe(5000);
        expect(result.invoices.map((row) => [row.invoice, row.remainingAfter, row.receivedAfter])).toEqual([
            ["000001", 0, 30000],
            ["000002", 5000, 15000]
        ]);
    });

    test("ledger above aging is added LIFO, newest invoices first, never above the invoice total", () => {
        const result = planDistributorAgingMatch({
            aging: 50000,
            ledger: 100000,
            invoices: [
                invoice("000001", "2024-01-01", 30000, 30000, 0),
                invoice("000003", "2024-08-01", 30000, 0, 30000),
                invoice("000002", "2024-06-01", 40000, 20000, 20000)
            ]
        });

        expect(result.action).toBe("increase");
        expect(result.basis).toBe("lifo");
        expect(result.matched).toBe(true);
        expect(result.agingAfter).toBe(100000);
        expect(result.invoices.map((row) => [row.invoice, row.remainingAfter, row.receivedAfter])).toEqual([
            ["000003", 30000, 0],
            ["000002", 40000, 0]
        ]);
    });

    test("a zero or negative ledger sets every distributor invoice remaining to 0", () => {
        const invoices = [
            invoice("000002", "2024-06-01", 20000, 20000),
            invoice("000001", "2024-01-01", 30000, 30000)
        ];

        for (const ledger of [0, -1500]) {
            const result = planDistributorAgingMatch({ aging: 50000, ledger, invoices });
            expect(result.action).toBe("zero");
            expect(result.target).toBe(0);
            expect(result.matched).toBe(true);
            expect(result.agingAfter).toBe(0);
            expect(result.invoices.map((row) => row.remainingAfter)).toEqual([0, 0]);
            expect(result.invoices.map((row) => row.receivedAfter)).toEqual([30000, 20000]);
        }
    });

    test("stops at distributor invoice capacity and does not invent the rest of the gap", () => {
        const reduce = planDistributorAgingMatch({
            aging: 50000,
            ledger: 5000,
            invoices: [invoice("000001", "2024-01-01", 20000, 20000)]
        });
        expect(reduce.matched).toBe(false);
        expect(reduce.agingAfter).toBe(30000);
        expect(reduce.shortfall).toBe(25000);
        expect(reduce.invoices).toHaveLength(1);
        expect(reduce.invoices[0].remainingAfter).toBe(0);

        const increase = planDistributorAgingMatch({
            aging: 50000,
            ledger: 100000,
            invoices: [invoice("000009", "2024-08-01", 60000, 50000, 10000)]
        });
        expect(increase.matched).toBe(false);
        expect(increase.agingAfter).toBe(60000);
        expect(increase.invoices[0].remainingAfter).toBe(60000);
        expect(increase.invoices[0].receivedAfter).toBe(0);
    });

    test("a matched row writes nothing", () => {
        const result = planDistributorAgingMatch({
            aging: 5000,
            ledger: 5000.2,
            invoices: [invoice("000001", "2024-01-01", 5000, 5000)]
        });
        expect(result.action).toBe("skip");
        expect(result.invoices).toEqual([]);
        expect(describeAgingMatch(result)).toMatch(/already matches/i);
    });

    test("same-day invoices follow the invoice code inside FIFO", () => {
        const reduce = planDistributorAgingMatch({
            aging: 300,
            ledger: 50,
            invoices: [
                invoice("000010", "2024-01-01", 100, 100),
                invoice("000002", "2024-01-01", 200, 200)
            ]
        });
        expect(reduce.invoices.map((row) => row.invoice)).toEqual(["000002", "000010"]);
        expect(reduce.invoices.map((row) => row.remainingAfter)).toEqual([0, 50]);
    });
});

describe("planRebuildOpenFromBottom", () => {
    test("closes every invoice, then opens the newest until the open amount equals a positive ledger", () => {
        const result = planRebuildOpenFromBottom({
            ledger: 25000,
            invoices: [
                invoice("000001", "2024-01-01", 30000, 30000),
                invoice("000002", "2024-06-01", 20000, 5000),
                invoice("000003", "2024-08-01", 10000, 0, 10000)
            ]
        });

        expect(result.action).toBe("rebuild");
        expect(result.basis).toBe("bottom");
        expect(result.matched).toBe(true);
        expect(result.agingAfter).toBe(25000);
        expect(result.invoices.map((row) => [row.invoice, row.remainingAfter, row.receivedAfter])).toEqual([
            ["000003", 10000, 0],
            ["000002", 15000, 5000],
            ["000001", 0, 30000]
        ]);
        expect(describeRebuildOpenFromBottom(result)).toMatch(/newest/);
        expect(describeRebuildOpenFromBottom(result)).toMatch(/ledger was not changed/i);
    });

    test("a ledger smaller than the newest invoice opens only part of that invoice", () => {
        const result = planRebuildOpenFromBottom({
            ledger: 12000,
            invoices: [
                invoice("000001", "2024-01-01", 10000, 10000),
                invoice("000002", "2024-08-01", 40000, 40000)
            ]
        });

        expect(result.matched).toBe(true);
        expect(result.agingAfter).toBe(12000);
        expect(result.invoices.map((row) => [row.invoice, row.remainingAfter, row.receivedAfter])).toEqual([
            ["000002", 12000, 28000],
            ["000001", 0, 10000]
        ]);
    });

    test("same-day invoices open the higher code first because that row is at the bottom", () => {
        const result = planRebuildOpenFromBottom({
            ledger: 150,
            invoices: [
                invoice("000002", "2024-01-01", 100, 100),
                invoice("000010", "2024-01-01", 200, 200)
            ]
        });

        expect(result.invoices.map((row) => [row.invoice, row.remainingAfter])).toEqual([
            ["000010", 150],
            ["000002", 0]
        ]);
    });

    test("a zero or negative ledger does not change invoices", () => {
        for (const ledger of [0, -1500]) {
            const result = planRebuildOpenFromBottom({
                ledger,
                invoices: [invoice("000001", "2024-01-01", 30000, 30000)]
            });
            expect(result.action).toBe("skip");
            expect(result.invoices).toEqual([]);
            expect(describeRebuildOpenFromBottom(result)).toMatch(/not positive/i);
        }
    });

    test("stops at invoice capacity and leaves the rest of the ledger uncovered", () => {
        const result = planRebuildOpenFromBottom({
            ledger: 20000,
            invoices: [
                invoice("000001", "2024-01-01", 3000, 1000),
                invoice("000002", "2024-06-01", 5000, 0, 5000)
            ]
        });

        expect(result.matched).toBe(false);
        expect(result.agingAfter).toBe(8000);
        expect(result.shortfall).toBe(12000);
        expect(result.invoices.map((row) => [row.invoice, row.remainingAfter])).toEqual([
            ["000002", 5000],
            ["000001", 3000]
        ]);
    });

    test("writes nothing when the newest invoices are already open for the ledger", () => {
        const result = planRebuildOpenFromBottom({
            ledger: 5000,
            invoices: [
                invoice("000001", "2024-01-01", 30000, 0, 30000),
                invoice("000002", "2024-08-01", 20000, 5000, 15000)
            ]
        });

        expect(result.matched).toBe(true);
        expect(result.agingAfter).toBe(5000);
        expect(result.invoices).toEqual([]);
    });
});

describe("planNegativeKnockoffFill", () => {
    test("puts the whole credit balance into knockoff when knockoff is empty", () => {
        expect(planNegativeKnockoffFill({
            ledger: -685585.8,
            currentKnockoff: 0
        })).toEqual({ creditBalance: 685585.8, current: 0, add: 685585.8 });
    });

    test("adds only the missing knockoff and does not add more when knockoff is already higher", () => {
        expect(planNegativeKnockoffFill({ ledger: -100, currentKnockoff: 40 }).add).toBe(60);
        expect(planNegativeKnockoffFill({ ledger: -100, currentKnockoff: 150 }).add).toBe(0);
        expect(planNegativeKnockoffFill({ ledger: 5000, currentKnockoff: 0 }).creditBalance).toBe(0);
    });
});

describe("planKnockoffClear", () => {
    test("sets Remain equal to Credit and leaves a settled line alone", () => {
        const result = planKnockoffClear([
            { id: "a", Credit: 1000, Remain: 250 },
            { id: "b", Credit: "400", Remain: 400 },
            { id: "c", Credit: 0, Remain: 0 }
        ]);
        expect(result.cleared).toBe(750);
        expect(result.updates).toEqual([
            expect.objectContaining({ lineId: "a", remainBefore: 250, remainAfter: 1000, cleared: 750 })
        ]);
    });
});

describe("describeAgingMatch", () => {
    test("a negative ledger puts the credit balance into knockoff", () => {
        const message = describeAgingMatch({
            action: "zero",
            matched: true,
            ledger: -1500,
            target: 0,
            agingAfter: 0
        });
        expect(message).toMatch(/credit balance is now in knockoff/i);
    });

    test("a zero ledger and zero aging says knockoff is cleared", () => {
        const message = describeAgingMatch({
            action: "zero",
            matched: true,
            ledger: 0,
            target: 0,
            agingAfter: 0
        });
        expect(message).toMatch(/Knockoff amount is now 0/);
    });

    test("a positive ledger says the knockoff amount is cleared", () => {
        const message = describeAgingMatch({
            action: "reduce",
            matched: true,
            ledger: 5000,
            target: 5000,
            agingAfter: 5000
        });
        expect(message).toMatch(/FIFO/);
        expect(message).toMatch(/Knockoff amount is now 0/);
    });
});

describe("distributorInvoiceInStore", () => {
    test("blank store stays in a filtered report and other stores stay out", () => {
        expect(distributorInvoiceInStore("", ["store-a"])).toBe(true);
        expect(distributorInvoiceInStore("store-a", ["store-a"])).toBe(true);
        expect(distributorInvoiceInStore("store-b", ["store-a"])).toBe(false);
        expect(distributorInvoiceInStore("store-b", [])).toBe(true);
    });
});
