import {
    collectVoucherPayments,
    paymentsForInvoice,
    uniqueRefs,
    usableInvoiceRefs
} from "../utils/invoicePaymentAging.js";

const br0003676 = {
    _id: "69d0f741df261228846678b6",
    VoucherType: "BR",
    VoucherNumber: "BR0003676",
    status: "Post",
    Type: "Chq",
    VoucharData: [
        {
            label: "34007062",
            value: "69ccefb64e484aa1233838b5",
            Credit: 87261,
            Ref: "067645",
            Client: "687092f91824583ad524267c",
            status: "Pending",
            Chq: "34007062",
            ChqRef: [
                {
                    Am: 87261,
                    ref: "067645",
                    value: "69ccefb64e484aa1233838b5"
                }
            ]
        },
        {
            Chq: "34007062",
            Debit: 87261,
            Ref: "067645",
            show: true
        }
    ]
};

const br0003679 = {
    _id: "69d0fbc9df26122884667914",
    VoucherType: "BR",
    VoucherNumber: "BR0003679",
    status: "Post",
    Type: "Chq",
    VoucharData: [
        {
            label: 1985,
            Credit: 334362,
            Ref: "048907, 049095, 055552",
            Client: "687092f81824583ad52425d1",
            Chq: 1985,
            ChqRef: [
                { Am: 124581, ref: "048907", value: "69803a67b0bab598e4599df7" },
                { Am: 74197, ref: "049095", value: "69803a68b0bab598e4599dfe" },
                { Am: 135584, ref: "055552", value: "69803a68b0bab598e4599e05" }
            ]
        },
        {
            Chq: 1985,
            Debit: 334362,
            Ref: "048907, 049095, 055552",
            show: true
        }
    ]
};

const onlineBr = {
    _id: "online-1",
    VoucherNumber: "BR0001000",
    VoucharData: [
        {
            Client: "c1",
            ClientRef2: "SI000111",
            Credit: 50000,
            Ref: "SI000111"
        },
        {
            Debit: 50000,
            Ref: "SI000111",
            show: true
        }
    ]
};

describe("usableInvoiceRefs", () => {
    test("splits comma refs and drops UnRealized/Advance", () => {
        expect(usableInvoiceRefs("048907, 049095, 055552")).toEqual([
            "048907",
            "049095",
            "055552"
        ]);
        expect(usableInvoiceRefs("UnRealized , 217940")).toEqual(["217940"]);
        expect(usableInvoiceRefs("Advance")).toEqual([]);
        expect(usableInvoiceRefs("")).toEqual([]);
    });
});

describe("collectVoucherPayments — real BR cheques", () => {
    test("BR0003676: no ClientRef2, uses ChqRef Am against ref, ignores bank debit", () => {
        const map = collectVoucherPayments([br0003676]);
        expect(map["067645"].payment).toBe(87261);
        expect(map["067645"].debit).toBe(0);
        expect(map["067645"].vouchers).toEqual(["BR0003676"]);
        expect(paymentsForInvoice(["067645", "067645"], map).payment).toBe(87261);
    });

    test("BR0003679: splits three invoices from ChqRef, not the joined Ref or bank debit", () => {
        const map = collectVoucherPayments([br0003679]);
        expect(map["048907"].payment).toBe(124581);
        expect(map["049095"].payment).toBe(74197);
        expect(map["055552"].payment).toBe(135584);
        expect(map["048907"].vouchers).toContain("BR0003679");
        expect(map["048907, 049095, 055552"]).toBeUndefined();
        expect(
            map["048907"].payment + map["049095"].payment + map["055552"].payment
        ).toBe(334362);
    });

    test("does not double-count the same voucher twice", () => {
        const map = collectVoucherPayments([br0003676, br0003676]);
        expect(map["067645"].payment).toBe(87261);
    });
});

describe("collectVoucherPayments — ClientRef2 vs Ref", () => {
    test("ClientRef2 present: take Credit, ignore Ref and ChqRef", () => {
        const voucher = {
            _id: "both-1",
            VoucherNumber: "BR0004216",
            VoucharData: [
                {
                    Client: "c1",
                    ClientRef2: "048904",
                    Ref: "999999",
                    Credit: 17965,
                    ChqRef: [{ Am: 1, ref: "999999" }]
                }
            ]
        };
        const map = collectVoucherPayments([voucher]);
        expect(map["048904"].payment).toBe(17965);
        expect(map["999999"]).toBeUndefined();
    });

    test("no ClientRef2: take Ref + Credit", () => {
        const voucher = {
            _id: "ref-only",
            VoucherNumber: "BR0003676",
            VoucharData: [
                {
                    Client: "c1",
                    ClientRef2: "",
                    Ref: "067645",
                    Credit: 87261
                }
            ]
        };
        const map = collectVoucherPayments([voucher]);
        expect(map["067645"].payment).toBe(87261);
    });
});

describe("collectVoucherPayments — ClientRef2 online BR", () => {
    test("uses ClientRef2 + Credit when ClientRef2 is present", () => {
        const map = collectVoucherPayments([onlineBr]);
        expect(map["SI000111"].payment).toBe(50000);
        expect(map["SI000111"].debit).toBe(0);
        expect(map["SI000111"].vouchers).toEqual(["BR0001000"]);
    });

    test("ClientRef2 UnRealized,invoice falls through to usable invoice ref", () => {
        const voucher = {
            _id: "u1",
            VoucherNumber: "BR0002000",
            VoucharData: [
                {
                    Client: "c1",
                    ClientRef2: "UnRealized , 217940",
                    Credit: 1000
                }
            ]
        };
        const map = collectVoucherPayments([voucher]);
        expect(map["217940"].payment).toBe(1000);
        expect(map["UnRealized"]).toBeUndefined();
    });

    test("comma ClientRef2 without ChqRef does not dump full credit on every invoice", () => {
        const voucher = {
            _id: "c1",
            VoucherNumber: "BR0003000",
            VoucharData: [
                {
                    Client: "c1",
                    ClientRef2: "048907, 049095",
                    Credit: 200000,
                    ChqRef: [
                        { Am: 120000, ref: "048907" },
                        { Am: 80000, ref: "049095" }
                    ]
                }
            ]
        };
        const map = collectVoucherPayments([voucher]);
        expect(map["048907"].payment).toBe(120000);
        expect(map["049095"].payment).toBe(80000);
    });
});

const br0004216 = {
    _id: "69e20a2dd1082bbfcc38f83c",
    VoucherType: "BR",
    VoucherNumber: "BR0004216",
    status: "Post",
    VoucharData: [
        { Client: "687092f71824583ad52420e8", Debit: 0, Credit: 17965, Ref: "", ClientRef2: "048904", show: true },
        { Client: "687092f71824583ad52420e8", Debit: 0, Credit: 36569, Ref: "", ClientRef2: "051426", show: true },
        { Client: "687092f71824583ad52420e8", Debit: 0, Credit: 52574, Ref: "", ClientRef2: "085642", show: true },
        { Client: "687092f81824583ad52423bb", Debit: 0, Credit: 28526, Ref: "", ClientRef2: "048905", show: true },
        { Client: "687092f81824583ad52423be", Debit: 0, Credit: 14263, Ref: "", ClientRef2: "048906", show: true },
        { Client: "687092f81824583ad52423af", Debit: 0, Credit: 39199, Ref: "", ClientRef2: "051427", show: true },
        { Client: "687092f81824583ad52423af", Debit: 0, Credit: 10673, Ref: "", ClientRef2: "085645", show: true },
        { Client: "687092f81824583ad52423c1", Debit: 0, Credit: 31194, Ref: "", ClientRef2: "054816", show: true },
        { Client: "687092f81824583ad52423c1", Debit: 0, Credit: 33862, Ref: "", ClientRef2: "085644", show: true },
        { Client: "687092f71824583ad52420e8", Debit: 0, Credit: 8865, Ref: "", ClientRef2: "135326", show: true },
        { Client: "687092f81824583ad52423b2", Debit: 0, Credit: 425606, Ref: "", ClientRef2: "088616", show: true },
        { Client: "", Debit: 699296, Credit: 0, Ref: "", ClientRef2: "", show: true },
        { Account: "688219dbf93ac76a141e267c", Debit: 0, Credit: 0, Narration: "Payment Receipt Posting" }
    ]
};

describe("collectVoucherPayments — CR cash receipt", () => {
    test("CR2026070220 unposted False: ClientRef2 Credit on each invoice, cash debit ignored", () => {
        const cr = {
            _id: "6a4f5b4d8ca30b7410c2bc9f",
            VoucherType: "CR",
            VoucherNumber: "CR2026070220",
            status: "False",
            Type: "Cash",
            VoucharData: [
                { Client: "687092f91824583ad5242889", Debit: 0, Credit: 53388, ClientRef2: "068633" },
                { Client: "687092f91824583ad5242889", Debit: 0, Credit: 17388, ClientRef2: "188711" },
                { Client: "687092f71824583ad5242157", Debit: 0, Credit: 20000, ClientRef2: "164551" },
                { Client: "687092f91824583ad52429ca", Debit: 0, Credit: 50000, ClientRef2: "180054" },
                { Account: "68e8d4cf5fbcd4d150aabcbc", Credit: 0, Debit: 140776, show: true }
            ]
        };
        const map = collectVoucherPayments([cr]);
        expect(map["068633"].payment).toBe(53388);
        expect(map["188711"].payment).toBe(17388);
        expect(map["164551"].payment).toBe(20000);
        expect(map["180054"].payment).toBe(50000);
        expect(map["068633"].vouchers).toContain("CR2026070220");
        expect(
            map["068633"].payment + map["188711"].payment + map["164551"].payment + map["180054"].payment
        ).toBe(140776);
    });

    test("CR with ClientRef2 + Credit, cash debit show:true ignored", () => {
        const cr = {
            _id: "cr-1",
            VoucherType: "CR",
            VoucherNumber: "CR0000100",
            status: "Post",
            VoucharData: [
                {
                    Client: "687092f71824583ad52420e8",
                    Account: "68821bd2f93ac76a141e26c0",
                    Credit: 17965,
                    Debit: 0,
                    Ref: "",
                    ClientRef2: "048904"
                },
                {
                    Account: "cash-account",
                    Debit: 17965,
                    Credit: 0,
                    show: true
                }
            ]
        };
        const map = collectVoucherPayments([cr]);
        expect(map["048904"].payment).toBe(17965);
        expect(map["048904"].debit).toBe(0);
        expect(map["048904"].vouchers).toEqual(["CR0000100"]);
    });

    test("CR credit line without Client still takes ClientRef2 Credit", () => {
        const cr = {
            _id: "cr-2",
            VoucherType: "CR",
            VoucherNumber: "CR0000101",
            VoucharData: [
                {
                    Credit: 25000,
                    Debit: 0,
                    ClientRef2: "051426",
                    Ref: ""
                },
                {
                    Debit: 25000,
                    Credit: 0,
                    show: true
                }
            ]
        };
        const map = collectVoucherPayments([cr]);
        expect(map["051426"].payment).toBe(25000);
        expect(map["051426"].vouchers).toEqual(["CR0000101"]);
    });

    test("CR without ClientRef2 takes Ref + Credit", () => {
        const cr = {
            _id: "cr-3",
            VoucherType: "CR",
            VoucherNumber: "CR0000102",
            VoucharData: [
                {
                    Client: "c1",
                    ClientRef2: "",
                    Ref: "085642",
                    Credit: 52574,
                    Debit: 0
                },
                { Debit: 52574, Credit: 0, show: true }
            ]
        };
        const map = collectVoucherPayments([cr]);
        expect(map["085642"].payment).toBe(52574);
    });
});

describe("collectVoucherPayments — receipt BR with show:true on client lines", () => {
    test("BR0004216: ClientRef2 + Credit counted even when show is true", () => {
        const map = collectVoucherPayments([br0004216]);
        expect(map["048904"].payment).toBe(17965);
        expect(map["051426"].payment).toBe(36569);
        expect(map["085642"].payment).toBe(52574);
        expect(map["048905"].payment).toBe(28526);
        expect(map["048906"].payment).toBe(14263);
        expect(map["051427"].payment).toBe(39199);
        expect(map["085645"].payment).toBe(10673);
        expect(map["054816"].payment).toBe(31194);
        expect(map["085644"].payment).toBe(33862);
        expect(map["135326"].payment).toBe(8865);
        expect(map["088616"].payment).toBe(425606);
        expect(map["048904"].vouchers).toContain("BR0004216");
        const total = Object.values(map).reduce((s, r) => s + r.payment, 0);
        expect(total).toBe(699296);
        expect(map[""]).toBeUndefined();
    });
});

describe("paymentsForInvoice", () => {
    test("unique refs prevent double count when SalesInvoice === SalesFlowRef", () => {
        const map = collectVoucherPayments([br0003676]);
        const pay = paymentsForInvoice(["067645", "067645"], map);
        expect(pay.payment).toBe(87261);
        expect(uniqueRefs(["067645", "067645"])).toEqual(["067645"]);
    });

    test("matches either SalesInvoice or SalesFlowRef", () => {
        const map = collectVoucherPayments([br0003679]);
        expect(paymentsForInvoice(["SI-X", "048907"], map).payment).toBe(124581);
        expect(paymentsForInvoice(["049095"], map).payment).toBe(74197);
    });
});
