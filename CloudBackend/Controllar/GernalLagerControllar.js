import mongoose from "mongoose";
import AccountOpeningBalanceModal from "../modal/AccountsOpeningModal.js";
import AdministrativeModal from "../modal/AdministrativeModal.js";
import ChartofAccountsModel from "../modal/ChartofAccountsModal.js";
import ClientOpeningBalanceModal from "../modal/ClientOpeningBalanceModal.js";
import CutomerModal from "../modal/CutomerModal.js";
import DistrbutorModal from "../modal/DistributerModal.js";
import PaymentRecivedModal from "../modal/PaymentRecivedModal.js";
import TransporterOpeningBalanceModal from "../modal/TransportesOpeningModal.js";
import VendorOpeningModal from "../modal/VendorOpeningModal.js";
import VoucherModal from "../modal/VoucherModal.js";
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";
import InvoiceOpeningModal from "../modal/OpeningInvoicesModal.js";
import PurchaseInvoiceModal from "../modal/PurchaseInvoiceModal.js";
import { VoucherNumber } from "./VoucherControllar.js";
import { attachPrInvoiceRefs, collectPrPurchaseInvoiceNumbers } from "../utils/gernalLagerInvoiceRef.js";
import EmployeeEBFAccountModal from "../modal/EmployeeEBFAccountModal.js";
import EmployeeLoanAccountModal from "../modal/EmployeeLoanAccountModal.js";
import EmployeeAdvanceAccountModal from "../modal/EmployeeAdvanceAccountModal.js";
import EmployeeBadDebtAccountModal from "../modal/EmployeeBadDebtAccountModal.js";
import EBFOpeningModal from "../modal/EBFOpeningModal.js";
import LoanOpeningModal from "../modal/LoanOpeningModal.js";
import StoreModal from "../modal/StoreModal.js";
import BadDebtModal from "../modal/BadDebtModal.js";

const withPrAndSlInvoiceRefs = async (rows = []) => {
    const purchaseNumbers = collectPrPurchaseInvoiceNumbers(rows);
    const salesNumbers = [...new Set((rows || [])
        .filter((item) => String(item?.VoucherType || "").trim().toLowerCase() === "sl" || String(item?.VoucherNumber || "").trim().toLowerCase().startsWith("sl"))
        .map((item) => String(item?.VoucherNumber || "").trim())
        .filter((number) => number.length > 2)
        .map((number) => number.slice(2)))];

    const [purchaseInvoices, salesInvoices] = await Promise.all([
        purchaseNumbers.length
            ? PurchaseInvoiceModal.find(
                { PurchaseInvoice: { $in: purchaseNumbers } },
                { PurchaseInvoice: 1, InvoiceRef: 1 }
            ).lean()
            : [],
        salesNumbers.length
            ? SalesInvoiceModal.find(
                { SalesInvoice: { $in: salesNumbers } },
                { SalesInvoice: 1, SalesFlowRef: 1 }
            ).lean()
            : []
    ]);

    const invoiceRefByPurchaseInvoice = {};
    for (const invoice of purchaseInvoices) {
        if (invoice?.PurchaseInvoice) invoiceRefByPurchaseInvoice[invoice.PurchaseInvoice] = invoice.InvoiceRef || "";
    }
    const salesFlowRefByInvoice = {};
    for (const invoice of salesInvoices) {
        if (invoice?.SalesInvoice) salesFlowRefByInvoice[invoice.SalesInvoice] = invoice.SalesFlowRef || "";
    }

    return attachPrInvoiceRefs(rows, invoiceRefByPurchaseInvoice).map((item) => {
        const voucherType = String(item?.VoucherType || "").trim().toLowerCase();
        const voucherNumber = String(item?.VoucherNumber || "").trim();
        if (voucherType === "sl" || voucherNumber.toLowerCase().startsWith("sl")) {
            const invoiceNumber = voucherNumber.slice(2);
            const salesFlowRef = salesFlowRefByInvoice[invoiceNumber] || item.SalesFlowRef || "";
            return { ...item, SalesFlowRef: salesFlowRef, Ref: salesFlowRef || item.Ref || "" };
        }
        if (voucherType === "pr" || voucherNumber.toLowerCase().startsWith("pr")) {
            return { ...item, Ref: item.InvoiceRef || item.Ref || "" };
        }
        return item;
    });
};

const dayBefore = (dateStr) => {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() - 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

const toMatchIds = (ids = []) => {
    const out = [];
    ids.forEach((id) => {
        const str = String(id || "").trim();
        if (!str) return;
        out.push(str);
        if (mongoose.Types.ObjectId.isValid(str)) {
            out.push(new mongoose.Types.ObjectId(str));
        }
    });
    return out;
};

export const GernalLager = async (req, res) => {
    const { getAll, Account, startDate, endDate, Store } = req.query;

    try {
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "startDate and endDate are required." });
        }

        const StoreArray = Store
            ? String(Store)
                .split(",")
                .map((s) => String(s).trim())
                .filter((s) => s && s !== "undefined" && s !== "null")
            : [];
        const AccountArray = Account
            ? String(Account)
                .split(",")
                .map((s) => String(s).trim())
                .filter((s) => s && s !== "undefined" && s !== "null")
            : [];
        const accountMatchIds = AccountArray.length ? toMatchIds(AccountArray) : [];

        const firstOpening = await AccountOpeningBalanceModal.findOne({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate },
        })
            .select({ DateStart: 1, DateEnd: 1, AccountsData: 1 })
            .lean();

        const nextDate = firstOpening?.DateStart || startDate;
        const before = dayBefore(startDate);

        // Store=0 means "no store defined" (null / missing / "" / "0")
        const isBlankStore = (fieldPath) => ({
            $or: [
                { $eq: [{ $ifNull: [fieldPath, null] }, null] },
                { $eq: [fieldPath, ""] },
                { $eq: [fieldPath, 0] },
                { $eq: [{ $toString: { $ifNull: [fieldPath, ""] } }, ""] },
                { $eq: [{ $toString: { $ifNull: [fieldPath, ""] } }, "0"] },
                { $eq: [{ $toString: { $ifNull: [fieldPath, ""] } }, "null"] },
                { $eq: [{ $toString: { $ifNull: [fieldPath, ""] } }, "undefined"] },
            ],
        });

        const storeExpr = {
            $let: {
                vars: {
                    picked: {
                        $cond: {
                            if: isBlankStore("$VoucharData.store"),
                            then: {
                                $cond: {
                                    if: isBlankStore("$VoucharData.Store"),
                                    then: "0",
                                    else: "$VoucharData.Store",
                                },
                            },
                            else: "$VoucharData.store",
                        },
                    },
                },
                in: {
                    $let: {
                        vars: {
                            asStr: { $toString: { $ifNull: ["$$picked", "0"] } },
                        },
                        in: {
                            $cond: {
                                if: {
                                    $or: [
                                        { $eq: ["$$asStr", ""] },
                                        { $eq: ["$$asStr", "0"] },
                                        { $eq: ["$$asStr", "null"] },
                                        { $eq: ["$$asStr", "undefined"] },
                                    ],
                                },
                                then: "0",
                                else: "$$asStr",
                            },
                        },
                    },
                },
            },
        };

        const normalizeStoreId = (value) => {
            const s = value == null ? "" : String(value).trim();
            if (!s || s === "0" || s === "null" || s === "undefined") return "0";
            return s;
        };

        const baseMatch = (from, to) => ({
            VoucherDate: { $gte: from, $lte: to },
            ...(accountMatchIds.length
                ? { "VoucharData.Account": { $in: accountMatchIds } }
                : {}),
        });

        // Shrink lines to target account before unwind (much less work)
        const shrinkLinesStage = accountMatchIds.length
            ? {
                $addFields: {
                    VoucharData: {
                        $filter: {
                            input: "$VoucharData",
                            as: "vd",
                            cond: { $in: ["$$vd.Account", accountMatchIds] },
                        },
                    },
                },
            }
            : null;

        // Detail lines for period only (what the ledger table shows)
        const periodLinesPipeline = (from, to) => {
            if (!from || !to || from > to) return Promise.resolve([]);
            const pipeline = [{ $match: baseMatch(from, to) }];
            if (shrinkLinesStage) pipeline.push(shrinkLinesStage);
            pipeline.push({ $unwind: "$VoucharData" });

            if (accountMatchIds.length) {
                pipeline.push({
                    $match: { "VoucharData.Account": { $in: accountMatchIds } },
                });
            }

            if (StoreArray.length) {
                pipeline.push({
                    $match: { $expr: { $in: [storeExpr, StoreArray] } },
                });
            }

            pipeline.push({
                $project: {
                    _id: 1,
                    id: "$_id",
                    Account: { $toString: "$VoucharData.Account" },
                    VoucherNumber: 1,
                    VoucherType: 1,
                    status: 1,
                    VoucherDate: 1,
                    Credit: { $ifNull: ["$VoucharData.Credit", 0] },
                    Debit: { $ifNull: ["$VoucharData.Debit", 0] },
                    Type: { $literal: "Voucher" },
                    Slip: "$VoucharData.Slip",
                    store: storeExpr,
                    Chq: "$VoucharData.Chq",
                    ChqNumber: { $ifNull: ["$ChequeNumber", "$Cheque"] },
                    Narration: "$VoucharData.Narration",
                    Ref: "$VoucharData.Ref",
                    InvoiceRef: "$VoucharData.InvoiceRef",
                    ClientRef2: "$VoucharData.ClientRef2",
                },
            });

            return VoucherModal.aggregate(pipeline).allowDiskUse(true);
        };

        // Opening movement before startDate — SUM only (FE only needs totals)
        const beforeSumPipeline = (from, to) => {
            if (!from || !to || from > to) return Promise.resolve([]);
            const pipeline = [{ $match: baseMatch(from, to) }];
            if (shrinkLinesStage) pipeline.push(shrinkLinesStage);
            pipeline.push({ $unwind: "$VoucharData" });

            if (accountMatchIds.length) {
                pipeline.push({
                    $match: { "VoucharData.Account": { $in: accountMatchIds } },
                });
            }

            if (StoreArray.length) {
                pipeline.push({
                    $match: { $expr: { $in: [storeExpr, StoreArray] } },
                });
            }

            pipeline.push({
                $group: {
                    _id: {
                        Account: { $toString: "$VoucharData.Account" },
                        store: storeExpr,
                    },
                    Debit: {
                        $sum: {
                            $convert: {
                                input: "$VoucharData.Debit",
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                    Credit: {
                        $sum: {
                            $convert: {
                                input: "$VoucharData.Credit",
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                },
            });

            return VoucherModal.aggregate(pipeline).allowDiskUse(true);
        };

        const [periodRows, beforeSums] = await Promise.all([
            periodLinesPipeline(startDate, endDate),
            beforeSumPipeline(nextDate, before),
        ]);

        const accountSet = AccountArray.length ? new Set(AccountArray.map(String)) : null;
        const storeSet = StoreArray.length ? new Set(StoreArray.map(String)) : null;

        const yearOpening = (firstOpening?.AccountsData || [])
            .map((item) => ({
                id: item.id,
                Account: String(item.Account || ""),
                Debit: Number(item.Debit) || 0,
                Credit: Number(item.Credit) || 0,
                store: normalizeStoreId(
                    item.store != null && String(item.store).trim() !== "" && String(item.store) !== "0"
                        ? item.store
                        : (item.Store ?? "0")
                ),
                Type: "VoucherBefore",
            }))
            .filter((item) => {
                if (!item.Account) return false;
                if (accountSet && !accountSet.has(item.Account)) return false;
                if (storeSet && !storeSet.has(item.store)) return false;
                return (item.Debit || item.Credit);
            });

        const beforeRows = (beforeSums || []).map((row) => ({
            Account: String(row?._id?.Account || ""),
            store: normalizeStoreId(row?._id?.store),
            Debit: Number(row.Debit) || 0,
            Credit: Number(row.Credit) || 0,
            Type: "VoucherBefore",
            VoucherDate: before,
            VoucherNumber: "BEFORE",
            Narration: "Movement before period",
        })).filter((row) => row.Account && (row.Debit || row.Credit));

        // PR/SL invoice refs only for period detail rows (not opening/before sums)
        const periodWithRefs = await withPrAndSlInvoiceRefs(periodRows || []);
        const data = yearOpening.concat(beforeRows).concat(periodWithRefs);

        if (getAll == "All") {
            return res.json(data);
        }
        if (Account) {
            return res.json(data);
        }
        return res.status(200).json(data);
    } catch (err) {
        console.error("GernalLager", err);
        return res.status(500).json({
            message: "Something went wrong",
            error: err.message,
        });
    }
};

const EMPLOYEE_LEDGER_TYPES = {
    EBF: { field: "EBF", label: "EBF", Account: EmployeeEBFAccountModal, Opening: EBFOpeningModal },
    Loan: { field: "Loan", label: "Loan", Account: EmployeeLoanAccountModal, Opening: LoanOpeningModal },
    Advance: { field: "Advance", label: "Advance", Account: EmployeeAdvanceAccountModal, Opening: null },
    BadDebt: { field: "BadDebt", label: "Bad Debt", Account: EmployeeBadDebtAccountModal, Opening: BadDebtModal },
};

const asEmployeeRows = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value);
    return [];
};

const employeeVoucherLines = (field, ids, from, to, lineType) => {
    if (!ids.length || !from || !to || from > to) return [];
    const matchIds = toMatchIds(ids);
    return VoucherModal.aggregate([
        {
            $match: {
                VoucherDate: { $gte: from, $lte: to },
                [`VoucharData.${field}`]: { $in: matchIds },
            },
        },
        { $unwind: "$VoucharData" },
        { $match: { [`VoucharData.${field}`]: { $in: matchIds } } },
        {
            $project: {
                id: "$_id",
                Account: `$VoucharData.${field}`,
                VoucherNumber: "$VoucherNumber",
                VoucherType: "$VoucherType",
                status: "$status",
                VoucherDate: "$VoucherDate",
                Credit: { $ifNull: ["$VoucharData.Credit", 0] },
                Debit: { $ifNull: ["$VoucharData.Debit", 0] },
                Type: { $literal: lineType },
                Slip: "$VoucharData.Slip",
                store: {
                    $ifNull: ["$VoucharData.store", { $ifNull: ["$VoucharData.Store", "0"] }],
                },
                ChqNumber: { $ifNull: ["$ChequeNumber", "$Cheque"] },
                Narration: "$VoucharData.Narration",
                Ref: { $ifNull: ["$VoucharData.ClientRef2", "$VoucharData.Ref"] },
            },
        },
    ]);
};

const loadEmployeeTypeRaw = async (type, startDate, endDate, employeeId) => {
    const config = EMPLOYEE_LEDGER_TYPES[type];
    if (!config) return null;

    let accountQuery = {};
    if (employeeId) {
        const empKey = String(employeeId);
        accountQuery = {
            $or: [
                { _id: empKey },
                { empId: empKey },
            ],
        };
        if (mongoose.Types.ObjectId.isValid(empKey)) {
            accountQuery.$or.push({ _id: new mongoose.Types.ObjectId(empKey) });
            accountQuery.$or.push({ empId: new mongoose.Types.ObjectId(empKey) });
        }
    }

    const accounts = await config.Account.find(accountQuery).sort({ name: 1 }).lean();
    const ids = accounts.map((item) => String(item._id));
    const before = dayBefore(startDate);

    let periodStart = "1970-01-01";
    let openingStart = "";
    let openingEnd = "";
    let openingRows = [];

    if (config.Opening) {
        const opening = await config.Opening.findOne({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate },
        }).lean();

        openingStart = opening?.DateStart || "";
        openingEnd = opening?.DateEnd || "";
        if (opening?.DateStart) periodStart = opening.DateStart;

        openingRows = asEmployeeRows(opening?.EmployeesData).map((row) => {
            const amount = Number(row.openingBalance) || 0;
            const accountId = String(row._id || "");
            return {
                Account: accountId,
                Debit: amount > 0 ? amount : 0,
                Credit: amount < 0 ? Math.abs(amount) : 0,
                Type: "Opening",
                VoucherDate: openingStart || startDate,
                VoucherNumber: "OPENING",
                Narration: "Opening Balance",
            };
        }).filter((row) => ids.includes(row.Account) && (row.Debit || row.Credit));
    }

    const [periodLines, beforeLines] = await Promise.all([
        employeeVoucherLines(config.field, ids, startDate, endDate, "Voucher"),
        employeeVoucherLines(config.field, ids, periodStart, before, "VoucherBefore"),
    ]);

    const rows = openingRows
        .concat(beforeLines || [])
        .concat(periodLines || [])
        .map((row) => ({
            ...row,
            Account: String(row.Account || ""),
            Debit: Number(row.Debit) || 0,
            Credit: Number(row.Credit) || 0,
        }));

    return {
        type,
        label: config.label,
        field: config.field,
        accounts,
        rows,
        openingStart,
        openingEnd,
    };
};

const buildEmployeeLedgers = (raw) => {
    if (!raw) return null;
    const { accounts, rows, type, label, field, openingStart, openingEnd } = raw;

    const ledgers = accounts.map((acc) => {
        const accountId = String(acc._id);
        const accountRows = rows.filter((row) => String(row.Account) === accountId);

        const openingDebit = accountRows
            .filter((row) => row.Type === "Opening" || row.Type === "VoucherBefore")
            .reduce((sum, row) => sum + (Number(row.Debit) || 0), 0);
        const openingCredit = accountRows
            .filter((row) => row.Type === "Opening" || row.Type === "VoucherBefore")
            .reduce((sum, row) => sum + (Number(row.Credit) || 0), 0);
        let balance = openingDebit - openingCredit;

        const transactions = accountRows
            .filter((row) => row.Type === "Voucher")
            .sort((a, b) => String(a.VoucherDate).localeCompare(String(b.VoucherDate))
                || String(a.VoucherNumber || "").localeCompare(String(b.VoucherNumber || "")))
            .map((row) => {
                const debit = Number(row.Debit) || 0;
                const credit = Number(row.Credit) || 0;
                balance += debit - credit;
                return {
                    id: row.id || row._id || "",
                    date: row.VoucherDate || "",
                    voucherNumber: row.VoucherNumber || "",
                    voucherType: row.VoucherType || "",
                    status: row.status,
                    narration: row.Narration || "",
                    ref: row.Ref || "",
                    slip: row.Slip || "",
                    chqNumber: row.ChqNumber || "",
                    store: row.store || "0",
                    debit,
                    credit,
                    balance,
                };
            });

        const periodDebit = transactions.reduce((sum, row) => sum + row.debit, 0);
        const periodCredit = transactions.reduce((sum, row) => sum + row.credit, 0);

        return {
            accountId,
            empId: acc.empId ? String(acc.empId) : "",
            employeeName: acc.name || "",
            accountCode: acc.AccountRef || acc.account || "",
            store: acc.Store || "0",
            type,
            label,
            field,
            openingDebit,
            openingCredit,
            openingBalance: openingDebit - openingCredit,
            transactions,
            totalDebit: periodDebit,
            totalCredit: periodCredit,
            closingBalance: balance,
        };
    }).filter((ledger) =>
        ledger.openingBalance !== 0
        || ledger.transactions.length > 0
        || ledger.totalDebit !== 0
        || ledger.totalCredit !== 0
    );

    return {
        type,
        label,
        field,
        openingStart,
        openingEnd,
        ledgers,
    };
};

export const EmployeeSubLedger = async (req, res) => {
    try {
        const { type, startDate, endDate, employeeId } = req.query;
        if (!type || !startDate || !endDate) {
            return res.status(400).json({ message: "Type, start date, and end date are required." });
        }
        if (!EMPLOYEE_LEDGER_TYPES[type]) {
            return res.status(400).json({ message: "Type must be EBF, Loan, Advance, or BadDebt." });
        }

        const raw = await loadEmployeeTypeRaw(type, startDate, endDate, employeeId);
        res.json({
            accounts: (raw?.accounts || []).map((item) => ({
                _id: String(item._id),
                AccountName: item.name || "",
                empId: item.empId ? String(item.empId) : "",
                Stage: "4",
            })),
            rows: raw?.rows || [],
            openingStart: raw?.openingStart || "",
            openingEnd: raw?.openingEnd || "",
        });
    } catch (err) {
        console.error("EmployeeSubLedger", err);
        res.status(500).json({ message: "Employee ledger could not be loaded." });
    }
};

/**
 * Employee EBF / Loan / Bad Debt transaction ledger report.
 * GET /GernalLager/EmployeeLedgerReport
 * Query:
 *   type      = EBF | Loan | BadDebt | All   (default All)
 *   startDate = YYYY-MM-DD (required)
 *   endDate   = YYYY-MM-DD (required)
 *   employeeId = optional EmployeeEBFAccount/_id OR empId
 */
export const EmployeeLedgerReport = async (req, res) => {
    try {
        const { type = "All", startDate, endDate, employeeId } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "startDate and endDate are required." });
        }

        const allowed = ["EBF", "Loan", "BadDebt"];
        let types = [];
        if (String(type).toLowerCase() === "all") {
            types = allowed;
        } else if (allowed.includes(type)) {
            types = [type];
        } else {
            return res.status(400).json({
                message: "type must be EBF, Loan, BadDebt, or All.",
            });
        }

        const sections = [];
        for (const t of types) {
            const raw = await loadEmployeeTypeRaw(t, startDate, endDate, employeeId || "");
            const built = buildEmployeeLedgers(raw);
            if (built) sections.push(built);
        }

        const allLedgers = sections.flatMap((section) => section.ledgers || []);

        res.json({
            status: true,
            startDate,
            endDate,
            type: String(type),
            sections,
            ledgers: allLedgers,
            summary: {
                employees: allLedgers.length,
                totalOpening: allLedgers.reduce((sum, row) => sum + (Number(row.openingBalance) || 0), 0),
                totalDebit: allLedgers.reduce((sum, row) => sum + (Number(row.totalDebit) || 0), 0),
                totalCredit: allLedgers.reduce((sum, row) => sum + (Number(row.totalCredit) || 0), 0),
                totalClosing: allLedgers.reduce((sum, row) => sum + (Number(row.closingBalance) || 0), 0),
            },
        });
    } catch (err) {
        console.error("EmployeeLedgerReport", err);
        res.status(500).json({ message: "Employee EBF/Loan/BadDebt ledger report failed." });
    }
};

export const ClientlLager = async (req, res) => {
    const { Client, startDate, endDate } = req.query
    const ClientArray = [...Client?.split(",")]
    const firstOpneing = await ClientOpeningBalanceModal?.find({
        DateStart: { $lte: startDate },
        DateEnd: { $gte: startDate }
    });

    const nextDate = firstOpneing[0]?.DateStart
    const previosdate = new Date(startDate);
    previosdate.setDate(previosdate.getDate() - 1);
    const before = previosdate.toISOString().split('T')[0];

    try {
        // ---------- Current period ----------
        const mergedVOucherData = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    "VoucharData.Client": Client
                },
            },
            { $unwind: "$VoucharData" },
            {
                $group: {
                    _id: {
                        id: "$_id", // voucher ki _id
                        Account: "$VoucharData.Account",
                        VoucherNumber: "$VoucherNumber",
                        Client: "$VoucharData.Client",
                        status: "$status",
                        Ref: { $ifNull: ["$VoucharData.ClientRef2", "$VoucharData.Ref"] },
                        VoucherDate: "$VoucherDate",
                        Credit: "$VoucharData.Credit",
                        store: "$VoucharData.store",
                        Debit: "$VoucharData.Debit",
                        Type: "Voucher",
                        Narration: "$VoucharData.Narration",
                        Chq: "$ChequeNumber",
                    },
                    VoucharData: { $push: "$VoucharData" },
                },
            },
            {
                $project: {
                    _id: "$_id.id", // voucher ki _id
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Client: "$_id.Client",
                    Credit: "$_id.Credit",
                    Ref: "$_id.Ref",
                    Narration: "$_id.Narration",
                    Debit: "$_id.Debit",
                    Type: "Voucher",
                    store: { $ifNull: ["$_id.store", "0"] },
                    Chq: "$_id.Chq",
                },
            },
        ]);

        const totalDebit = mergedVOucherData.reduce((sum, row) => sum + Number(row.Debit || 0), 0);
        const totalCredit = mergedVOucherData.reduce((sum, row) => sum + Number(row.Credit || 0), 0);
        console.log(totalDebit, totalCredit, totalDebit - totalCredit, "Current")

        // ---------- Before period ----------
        const mergedVOucherDataBefore = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                    "VoucharData.Client": Client
                },
            },
            { $unwind: "$VoucharData" },
            {
                $group: {
                    _id: {
                        id: "$_id", // voucher ki _id (NEW)
                        Account: "$VoucharData.Account",
                        VoucherNumber: "$VoucherNumber",
                        Client: "$VoucharData.Client",
                        status: "$status",
                        Ref: { $ifNull: ["$VoucharData.ClientRef2", "$VoucharData.Ref"] },
                        VoucherDate: "$VoucherDate",
                        Credit: "$VoucharData.Credit",
                        store: "$VoucharData.store",
                        Debit: "$VoucharData.Debit",
                        Type: "Voucher",
                        Narration: "$VoucharData.Narration",
                        Chq: "$ChequeNumber",
                    },
                    VoucharData: { $push: "$VoucharData" },
                },
            },
            {
                $project: {
                    _id: "$_id.id", // 0 ki jagah voucher ki _id (NEW)
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Client: "$_id.Client",
                    Credit: "$_id.Credit",
                    Debit: "$_id.Debit",
                    Type: "VoucherBefore",
                    store: { $ifNull: ["$_id.store", "0"] },
                },
            },
        ]);

        const totalDebitBefore = mergedVOucherDataBefore.reduce((sum, row) => sum + Number(row.Debit || 0), 0);
        const totalCreditBefore = mergedVOucherDataBefore.reduce((sum, row) => sum + Number(row.Credit || 0), 0);
        console.log(totalDebitBefore, totalCreditBefore, totalDebitBefore - totalCreditBefore, "Before")

        // ---------- Year opening ----------
        const yearOpening = (firstOpneing[0]?.ClientData || []).map((item) => ({
            id: item.id,
            Account: item.Account,
            Debit: item.Debit,
            Credit: item.Credit,
            Client: item.Client,
            store: item.store || item.Store || "0",
            Type: "VoucherBefore"
        }))

        const data = mergedVOucherData.concat(mergedVOucherDataBefore).concat(yearOpening)

        if (Client === "All") {
            return res.json(data); // return add kiya
        }

        if (Client) {
            const wholedata = data.filter((item) => ClientArray.includes(item?.Client));
            return res.json(wholedata);
        }

        console.log("data send")
        return res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(500).send({ message: "Some thing went wrong", error: err.message })
    }
}

export const ClientlBalance = async (req, res) => {
    const { Client, startDate, endDate } = req.query

    const ClientArray = [...Client?.split(",")]

    const firstOpneing = await ClientOpeningBalanceModal?.find({
        DateStart: { $lte: startDate },
        DateEnd: { $gte: startDate }
    });

    const nextDate = firstOpneing[0]?.DateStart
    const previosdate = new Date(startDate);
    previosdate.setDate(previosdate.getDate() - 1);
    const before = previosdate.toISOString().split('T')[0];

    try {


        const mergedVOucherData = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    "VoucharData.Client": Client
                },
            },

            { $unwind: "$VoucharData" },
            {
                $group: {
                    _id: {
                        VoucherNumber: "$VoucherNumber",
                        Debit: "$VoucharData.Debit",
                        Credit: "$VoucharData.Credit",
                        Client: "$VoucharData.Client",

                    },
                    VoucharData: { $push: "$VoucharData" },

                },
            },
            {
                $project: {
                    _id: 0,
                    Client: "$_id.Client",
                    VoucherNumber: "$_id.VoucherNumber",
                    Credit: "$_id.Credit",
                    Debit: "$_id.Debit",


                },
            },
        ]);

        const mergedVOucherDataBefore = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                    "VoucharData.Client": Client
                },
            },

            { $unwind: "$VoucharData" },
            {
                $group: {
                    _id: {
                        Account: "$VoucharData.Account",
                        VoucherNumber: "$VoucherNumber",
                        Client: "$VoucharData.Client",
                        status: "$status",
                        Ref: { $ifNull: ["$VoucharData.ClientRef2", "$VoucharData.Ref"] },
                        VoucherDate: "$VoucherDate",
                        Credit: "$VoucharData.Credit",
                        store: "$VoucharData.store",
                        Debit: "$VoucharData.Debit",
                        Type: "Voucher",
                        Narration: "$VoucharData.Narration",
                        Chq: "$ChequeNumber",
                    },
                    VoucharData: { $push: "$VoucharData" },

                },
            },
            {
                $project: {
                    _id: 0,
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Client: "$_id.Client",
                    Credit: "$_id.Credit",
                    Debit: "$_id.Debit",
                    Type: "VoucherBefore",
                    store: { $ifNull: ["$_id.store", "0"] },

                },
            },
        ]);
        console.log(mergedVOucherDataBefore.reduce((acc, item) => { if (!acc[item.Client]) { acc[item.Client] = { Debit: 0, Credit: 0 }; } acc[item.Client].Debit += item.Debit; acc[item.Client].Credit += item.Credit; return acc; }, {}))
        const yearOpening = (firstOpneing[0]?.ClientData || []).map((item) => ({
            id: item.id,
            Account: item.Account,
            Debit: item.Debit,
            Credit: item.Credit,
            Client: item.Client,
            store: item.store || item.Store || "0",
            Type: "VoucherBefore"
        }))
        const data1 = mergedVOucherData.concat(mergedVOucherDataBefore).concat(yearOpening)
        const data = data1.map((item) => ({
            ...item,
            Debit: Number(item.Debit || 0),
            Credit: Number(item.Credit || 0)

        }))
        if (Client === "All") {
            res.json(data);
        }
        if (Client) {

            const wholedata = data.filter((item) => {
                const ClientMatch = ClientArray.includes(item?.Client)
                return ClientMatch;
            });

            const totalDebit = wholedata.reduce(
                (sum, row) => sum + Number(row.Debit || 0),
                0
            );
            const TotalCredit = wholedata.reduce(
                (sum, row) => sum + Number(row.Credit || 0),
                0
            );
            const totalBalance = totalDebit - TotalCredit
            console.log(totalBalance)
            return res.status(200).json(
                {
                    Status: "Success",
                    data: { totalBalance }
                }
            )
        }
        else {
            res.status(200).send(data)
            console.log("data send")
        }
    } catch (err) {
        console.log(err)

        res.status(500).send("Some thing went wrong", err)
    }

}
export const TransporterlLager = async (req, res) => {
    const { Transporter, startDate, endDate } = req.query
    const TransporterArray = [...Transporter?.split(",")]



    const previosdate = new Date(startDate);
    previosdate.setDate(previosdate.getDate() - 1);
    const before = previosdate.toISOString().split('T')[0];
    try {
        const firstOpneing = await TransporterOpeningBalanceModal?.find({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate }
        }) || [];

        const mergedVOucherData = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    "VoucharData.Transporter": Transporter
                },
            },

            { $unwind: "$VoucharData" },
            {
                $group: {
                    _id: {
                        Account: "$VoucharData.Account",
                        VoucherNumber: "$VoucherNumber",
                        Transporter: "$VoucharData.Transporter",
                        status: "$status",
                        Ref: { $ifNull: ["$VoucharData.TransporterRef2", "$VoucharData.Ref"] },
                        VoucherDate: "$VoucherDate",
                        Credit: "$VoucharData.Credit",
                        store: "$VoucharData.store",
                        Debit: "$VoucharData.Debit",
                        Type: "Voucher",
                        Narration: "$VoucharData.Narration",
                        Chq: "$ChequeNumber",
                    },
                    VoucharData: { $push: "$VoucharData" },

                },
            },
            {
                $project: {
                    _id: 0,
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Transporter: "$_id.Transporter",
                    Credit: "$_id.Credit",
                    Ref: "$_id.Ref",
                    Narration: "$_id.Narration",
                    Debit: "$_id.Debit",
                    Type: "Voucher",
                    store: { $ifNull: ["$_id.store", "0"] },
                    Chq: "$_id.Chq",


                },
            },
        ]);

        const mergedVOucherDataBefore = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: "2025-07-01",
                        $lte: before,
                    },
                    "VoucharData.Transporter": Transporter
                },
            },

            { $unwind: "$VoucharData" },
            {
                $group: {
                    _id: {
                        Account: "$VoucharData.Account",
                        VoucherNumber: "$VoucherNumber",
                        status: "$PostStatus",
                        Transporter: "$VoucharData.Transporter",
                        VoucherDate: "$VoucherDate",
                        Credit: "$VoucharData.Credit",
                        store: "$VoucharData.store",
                        Debit: "$VoucharData.Debit",
                        Type: "Voucher Before",
                        PaidFor: "PaidFor"
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Transporter: "$_id.Transporter",
                    Credit: "$_id.Credit",
                    Debit: "$_id.Debit",
                    Type: "VoucherBefore",
                    store: { $ifNull: ["$_id.store", "0"] },

                },
            },
        ]);
        console.log(mergedVOucherDataBefore)
        const data = mergedVOucherData.concat(mergedVOucherDataBefore).concat(firstOpneing)
        if (Transporter === "All") {
            res.json(data);
        }
        if (Transporter) {

            const wholedata = data.filter((item) => {
                const TransporterMatch = TransporterArray.includes(item?.Transporter)
                return TransporterMatch;
            });

            res.json(wholedata);
        }
        else {
            res.status(200).send(data)
            console.log("data send")
        }
    } catch (err) {
        console.log(err)

        res.status(500).send("Some thing went wrong", err)
    }

}



export const DebtorBalanceList = async (req, res) => {
    const t0 = Date.now();
    try {
        const { startDate, endDate, onlyCurrunt } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        const skipHistory = String(onlyCurrunt) === "true";

        // Keep identical before-date logic as legacy (timezone-sensitive but contract-stable)
        const previosdate = new Date(startDate);
        previosdate.setDate(previosdate.getDate() - 1);
        const before = previosdate.toISOString().split("T")[0];

        const AGG = { allowDiskUse: true };

        const toNum = (path) => ({
            $convert: {
                input: {
                    $replaceAll: {
                        input: { $toString: { $ifNull: [path, "0"] } },
                        find: ",",
                        replacement: "",
                    },
                },
                to: "double",
                onError: 0,
                onNull: 0,
            },
        });

        const storeExpr = {
            $cond: {
                if: {
                    $or: [
                        { $eq: ["$VoucharData.store", null] },
                        { $eq: ["$VoucharData.store", ""] },
                        { $eq: ["$VoucharData.store", "0"] },
                    ],
                },
                then: { $toString: { $ifNull: ["$VoucharData.Store", "0"] } },
                else: { $toString: { $ifNull: ["$VoucharData.store", "0"] } },
            },
        };

        const buildVoucherPipeline = (from, to, typeLiteral) => [
            {
                $match: {
                    VoucherDate: { $gte: from, $lte: to },
                },
            },
            {
                $project: {
                    VoucherNumber: 1,
                    VoucharData: 1,
                },
            },
            { $unwind: "$VoucharData" },
            {
                $match: {
                    "VoucharData.Client": {
                        $exists: true,
                        $nin: [null, "", "null", "undefined"],
                    },
                },
            },
            {
                $project: {
                    Client: { $toString: "$VoucharData.Client" },
                    BigStore: "$VoucharData.Store",
                    SmallStore: "$VoucharData.store",
                    store: storeExpr,
                    Debit: toNum("$VoucharData.Debit"),
                    Credit: toNum("$VoucharData.Credit"),
                    Type: { $literal: typeLiteral },
                },
            },
            {
                $group: {
                    _id: {
                        Client: "$Client",
                        store: "$store",
                        Type: "$Type",
                    },
                    Debit: { $sum: "$Debit" },
                    Credit: { $sum: "$Credit" },
                    voucherCount: { $sum: 1 },
                    BigStore: { $first: "$BigStore" },
                    SmallStore: { $first: "$SmallStore" },
                },
            },
            {
                $project: {
                    _id: 0,
                    Client: "$_id.Client",
                    store: "$_id.store",
                    Type: "$_id.Type",
                    Debit: 1,
                    Credit: 1,
                    voucherCount: 1,
                    BigStore: 1,
                    SmallStore: 1,
                },
            },
        ];

        const openingPromise = skipHistory
            ? Promise.resolve(null)
            : ClientOpeningBalanceModal.findOne({
                DateStart: { $lte: startDate },
                DateEnd: { $gte: startDate },
            })
                .select({ DateStart: 1, DateEnd: 1, ClientData: 1 })
                .lean();

        const periodPromise = VoucherModal.aggregate(
            buildVoucherPipeline(startDate, endDate, "Voucher"),
            AGG
        );

        const firstOpening = await openingPromise;
        const nextDate = firstOpening?.DateStart;

        const beforePromise =
            skipHistory || !nextDate || nextDate > before
                ? Promise.resolve([])
                : VoucherModal.aggregate(
                    buildVoucherPipeline(nextDate, before, "VoucherBefore"),
                    AGG
                );

        const [mergedVOucherData, mergedVOucherDataBefore] = await Promise.all([
            periodPromise,
            beforePromise,
        ]);

        if (skipHistory) {
            res.set("X-Debtor-Balance-Ms", String(Date.now() - t0));
            res.set("X-Debtor-Balance-Count", String(mergedVOucherData.length));
            return res.status(200).send(mergedVOucherData);
        }

        const yearOpening = (firstOpening?.ClientData || []).map((item) => ({
            id: item.id,
            Account: item.Account,
            Debit: item.Debit,
            Credit: item.Credit,
            Client: item.Client,
            store: item.Store || item.store || "0",
            BigStore: item.Store || item.store || "0",
            SmallStore: item.store || "0",
            Type: "VoucherBefore",
            voucherCount: 1,
        }));

        const data = mergedVOucherData
            .concat(mergedVOucherDataBefore)
            .concat(yearOpening);

        res.set("X-Debtor-Balance-Ms", String(Date.now() - t0));
        res.set("X-Debtor-Balance-Count", String(data.length));
        return res.status(200).send(data);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Some thing went wrong");
    }
};


// export const DebtorBalanceList = async (req, res) => {
//     const { startDate, endDate, onlyCurrunt } = req.query;
//     console.log(startDate, endDate, onlyCurrunt);

//     try {
//         const firstOpneing = onlyCurrunt == "true" ? [] : await ClientOpeningBalanceModal?.find({
//             DateStart: { $lte: startDate },
//             DateEnd: { $gte: startDate }
//         });

//         console.log("firstOpneing", firstOpneing);

//         const nextDate = firstOpneing[0]?.DateStart;
//         const previosdate = new Date(startDate);
//         previosdate.setDate(previosdate.getDate() - 1);
//         const before = previosdate.toISOString().split('T')[0];

//         // ===== Current period pipeline =====
//         const pipeline = [
//             { $match: { VoucherDate: { $gte: startDate, $lte: endDate } } },
//             { $unwind: "$VoucharData" },
//             { $match: { "VoucharData.Client": { $exists: true, $ne: "" } } },
//             {
//                 $project: {
//                     _id: 0,
//                     Client: "$VoucharData.Client",
//                     Debit: { $ifNull: ["$VoucharData.Debit", 0] },
//                     Credit: { $ifNull: ["$VoucharData.Credit", 0] }
//                 }
//             }
//         ];

//         if (onlyCurrunt != "true") {
//             // ===== Previous period vouchers (before startDate) =====
//             pipeline.push({
//                 $unionWith: {
//                     coll: VoucherModal.collection.name,
//                     pipeline: [
//                         { $match: { VoucherDate: { $gte: nextDate, $lte: before } } },
//                         { $unwind: "$VoucharData" },
//                         { $match: { "VoucharData.Client": { $exists: true, $ne: "" } } },
//                         {
//                             $project: {
//                                 _id: 0,
//                                 Client: "$VoucharData.Client",
//                                 Debit: { $ifNull: ["$VoucharData.Debit", 0] },
//                                 Credit: { $ifNull: ["$VoucharData.Credit", 0] }
//                             }
//                         }
//                     ]
//                 }
//             });

//             // ===== Year opening balances =====
//             pipeline.push({
//                 $unionWith: {
//                     coll: ClientOpeningBalanceModal.collection.name,
//                     pipeline: [
//                         {
//                             $match: {
//                                 DateStart: { $lte: startDate },
//                                 DateEnd: { $gte: startDate }
//                             }
//                         },
//                         { $unwind: "$ClientData" },
//                         { $match: { "ClientData.Client": { $exists: true, $ne: "" } } },
//                         {
//                             $project: {
//                                 _id: 0,
//                                 Client: "$ClientData.Client",
//                                 Debit: { $ifNull: ["$ClientData.Debit", 0] },
//                                 Credit: { $ifNull: ["$ClientData.Credit", 0] }
//                             }
//                         }
//                     ]
//                 }
//             });
//         }

//         // ===== Group by Client, get totals =====
//         pipeline.push(
//             {
//                 $group: {
//                     _id: "$Client",
//                     totalDebit: {
//                         $sum: { $convert: { input: "$Debit", to: "double", onError: 0, onNull: 0 } }
//                     },
//                     totalCredit: {
//                         $sum: { $convert: { input: "$Credit", to: "double", onError: 0, onNull: 0 } }
//                     }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     Client: "$_id",
//                     totalDebit: 1,
//                     totalCredit: 1,
//                     balance: { $subtract: ["$totalDebit", "$totalCredit"] }
//                 }
//             },
//             { $sort: { Client: 1 } }
//         );

//         const result = await VoucherModal.aggregate(pipeline);

//         // ===== Sirf wo clients jo Distributor collection mein exist karte hain =====
//         const clientIds = result
//             .map(item => item.Client)
//             .filter(Boolean);

//         const distributors = await DistrbutorModal.find(
//             { _id: { $in: clientIds } },
//             { _id: 1 }
//         );

//         const distributorIdSet = new Set(distributors.map(d => d._id.toString()));

//         const filterOut = result.filter(item => distributorIdSet.has(item.Client?.toString()));

//         // ===== Tamam clients ka total balance nikalo =====
//         const totals = filterOut.reduce(
//             (acc, item) => {
//                 acc.totalDebit += Number(item.totalDebit) || 0;
//                 acc.totalCredit += Number(item.totalCredit) || 0;
//                 acc.totalBalance += Number(item.balance) || 0;
//                 return acc;
//             },
//             { totalDebit: 0, totalCredit: 0, totalBalance: 0 }
//         );

//         console.log("filterOut----->", filterOut?.length, result?.length);
//         console.log("Grand totals----->", totals);

//         return res.status(200).send({
//             data: filterOut,
//             totalDebit: totals.totalDebit,
//             totalCredit: totals.totalCredit,
//             totalBalance: totals.totalBalance
//         });

//     } catch (err) {
//         console.log(err);
//         return res.status(500).send("Some thing went wrong: " + err.message);
//     }
// };
export const CreditorBalanceList = async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const firstOpneing = await VendorOpeningModal?.find({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate }
        });

        const nextDate = firstOpneing[0]?.DateStart;
        const previosdate = new Date(startDate);
        previosdate.setDate(previosdate.getDate() - 1);
        const before = previosdate.toISOString().split("T")[0];

        const storeExpr = {
            $cond: {
                if: {
                    $or: [
                        { $eq: ["$VoucharData.store", null] },
                        { $eq: ["$VoucharData.store", ""] },
                        { $eq: ["$VoucharData.store", "0"] }
                    ]
                },
                then: { $ifNull: ["$VoucharData.Store", "0"] },
                else: "$VoucharData.store"
            }
        };

        const vendorExpr = {
            $replaceOne: {
                input: { $toString: { $ifNull: ["$VoucharData.Vendor", ""] } },
                find: "Vendor : ",
                replacement: ""
            }
        };

        const mergedVOucherData = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: "$VoucharData" },
            {
                $match: { "VoucharData.Vendor": { $exists: true, $nin: [null, ""] } }
            },
            {
                $project: {
                    _id: 0,
                    Vendor: vendorExpr,
                    Debit: { $ifNull: ["$VoucharData.Debit", 0] },
                    Credit: { $ifNull: ["$VoucharData.Credit", 0] },
                    store: storeExpr,
                    Type: "Voucher"
                }
            }
        ]);

        const mergedVOucherDataBefore = !nextDate
            ? []
            : await VoucherModal.aggregate([
                {
                    $match: {
                        VoucherDate: { $gte: nextDate, $lte: before }
                    }
                },
                { $unwind: "$VoucharData" },
                {
                    $match: { "VoucharData.Vendor": { $exists: true, $nin: [null, ""] } }
                },
                {
                    $project: {
                        _id: 0,
                        Vendor: vendorExpr,
                        Debit: { $ifNull: ["$VoucharData.Debit", 0] },
                        Credit: { $ifNull: ["$VoucharData.Credit", 0] },
                        store: storeExpr,
                        Type: "VoucherBefore"
                    }
                }
            ]);

        const yearOpening = (firstOpneing[0]?.VendorData || []).map((item) => ({
            Vendor: String(item.Vendor || "").replace(/^Vendor\s*:\s*/i, ""),
            Debit: item.Debit,
            Credit: item.Credit,
            store: item.store || item.Store || "0",
            Type: "VoucherBefore"
        }));

        return res.status(200).send(
            mergedVOucherData.concat(mergedVOucherDataBefore).concat(yearOpening)
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send("Some thing went wrong", err);
    }
};


/**
 * Fast Trial Balance — same formula as General Ledger closing balance:
 * Opening(year) + Vouchers(yearStart..dayBefore startDate) + Vouchers(startDate..endDate)
 *
 * openingOnly=true → Opening + Before only (day/period transactions NOT added)
 * Groups Stage-4 (and other) accounts under Stage-3 with subtotals.
 *
 * GET /GernalLager/TrailBalance
 * Query: startDate, endDate, Store?, stage?, fromAccount?, toAccount?, openingOnly?
 */
export const TrailBalance = async (req, res) => {
    const { startDate, endDate, Store, stage, fromAccount, toAccount, openingOnly } = req.query;
    const openingOnlyMode = String(openingOnly || "").toLowerCase() === "true"
        || String(openingOnly || "") === "1"
        || String(openingOnly || "").toLowerCase() === "yes";

    try {
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "startDate and endDate are required." });
        }

        const firstOpening = await AccountOpeningBalanceModal.findOne({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate },
        }).lean();

        if (!firstOpening) {
            return res.status(404).json({ message: "Opening balance year not found." });
        }

        const nextDate = firstOpening.DateStart;
        const previousDate = new Date(`${startDate}T00:00:00`);
        previousDate.setDate(previousDate.getDate() - 1);
        const before = [
            previousDate.getFullYear(),
            String(previousDate.getMonth() + 1).padStart(2, "0"),
            String(previousDate.getDate()).padStart(2, "0"),
        ].join("-");

        const storeArray = Store
            ? String(Store).split(",").map((s) => String(s).trim()).filter(Boolean)
            : [];

        const storeExpr = {
            $toString: {
                $ifNull: [
                    "$VoucharData.store",
                    { $ifNull: ["$VoucharData.Store", "0"] },
                ],
            },
        };

        const sumByAccount = async (from, to) => {
            if (!from || !to || from > to) return [];
            const pipeline = [
                {
                    $match: {
                        VoucherDate: { $gte: from, $lte: to },
                    },
                },
                { $unwind: "$VoucharData" },
                {
                    $match: {
                        "VoucharData.Account": { $nin: [null, ""] },
                    },
                },
            ];

            if (storeArray.length) {
                pipeline.push({
                    $match: {
                        $expr: { $in: [storeExpr, storeArray] },
                    },
                });
            }

            pipeline.push(
                {
                    $group: {
                        _id: { $toString: "$VoucharData.Account" },
                        Debit: {
                            $sum: {
                                $convert: {
                                    input: "$VoucharData.Debit",
                                    to: "double",
                                    onError: 0,
                                    onNull: 0,
                                },
                            },
                        },
                        Credit: {
                            $sum: {
                                $convert: {
                                    input: "$VoucharData.Credit",
                                    to: "double",
                                    onError: 0,
                                    onNull: 0,
                                },
                            },
                        },
                    },
                }
            );

            return VoucherModal.aggregate(pipeline).allowDiskUse(true);
        };

        const [periodAgg, beforeAgg, chartAccounts] = await Promise.all([
            openingOnlyMode ? Promise.resolve([]) : sumByAccount(startDate, endDate),
            sumByAccount(nextDate, before),
            ChartofAccountsModel.find({}, {
                AccountCode: 1,
                AccountName: 1,
                Stage: 1,
                Stage1: 1,
                Stage2: 1,
                Stage3: 1,
                masterCode: 1,
                isActive: 1,
            }).lean(),
        ]);

        // Year opening — same source GernalLager uses (AccountsData)
        const openingMap = new Map();
        const openingRows = Array.isArray(firstOpening.AccountsData)
            ? firstOpening.AccountsData
            : (firstOpening.AccountsData ? Object.values(firstOpening.AccountsData) : []);

        openingRows.forEach((item) => {
            const accountId = String(item?.Account || "").trim();
            if (!accountId) return;
            const store = String(item?.store ?? item?.Store ?? "0");
            if (storeArray.length && !storeArray.includes(store)) return;

            const prev = openingMap.get(accountId) || { Debit: 0, Credit: 0 };
            prev.Debit += Number(item?.Debit) || 0;
            prev.Credit += Number(item?.Credit) || 0;
            openingMap.set(accountId, prev);
        });

        const beforeMap = new Map(
            (beforeAgg || []).map((row) => [String(row._id), {
                Debit: Number(row.Debit) || 0,
                Credit: Number(row.Credit) || 0,
            }])
        );
        const periodMap = new Map(
            (periodAgg || []).map((row) => [String(row._id), {
                Debit: Number(row.Debit) || 0,
                Credit: Number(row.Credit) || 0,
            }])
        );

        const accountIds = new Set([
            ...openingMap.keys(),
            ...beforeMap.keys(),
            ...periodMap.keys(),
        ]);

        const coaById = new Map(
            (chartAccounts || []).map((acc) => [String(acc._id), acc])
        );

        const stageNum = stage && stage !== "StageAll"
            ? String(stage).replace("Stage", "")
            : "";
        const fromCode = String(fromAccount || "").trim();
        const toCode = String(toAccount || "").trim();

        const inCodeRange = (code) => {
            const c = String(code || "");
            if (!fromCode && !toCode) return true;
            if (fromCode && toCode) {
                const prefixLen = Math.min(fromCode.length, toCode.length, c.length || fromCode.length);
                const codePrefix = c.substring(0, prefixLen);
                return codePrefix >= fromCode.substring(0, prefixLen)
                    && codePrefix <= toCode.substring(0, prefixLen);
            }
            if (fromCode) {
                const prefixLen = Math.min(fromCode.length, c.length || fromCode.length);
                return c.substring(0, prefixLen) >= fromCode.substring(0, prefixLen);
            }
            const prefixLen = Math.min(toCode.length, c.length || toCode.length);
            return c.substring(0, prefixLen) <= toCode.substring(0, prefixLen);
        };

        const rows = [];
        accountIds.forEach((accountId) => {
            const coa = coaById.get(accountId);
            if (!coa) return;
            if (stageNum && String(coa.Stage) !== stageNum) return;
            if (!inCodeRange(coa.AccountCode)) return;

            const openingAmt = openingMap.get(accountId) || { Debit: 0, Credit: 0 };
            const beforeAmt = beforeMap.get(accountId) || { Debit: 0, Credit: 0 };
            const periodAmt = periodMap.get(accountId) || { Debit: 0, Credit: 0 };

            // Opening of day = year opening + vouchers before startDate
            // Full = opening of day + period (startDate..endDate)
            const totalDebit = openingOnlyMode
                ? openingAmt.Debit + beforeAmt.Debit
                : openingAmt.Debit + beforeAmt.Debit + periodAmt.Debit;
            const totalCredit = openingOnlyMode
                ? openingAmt.Credit + beforeAmt.Credit
                : openingAmt.Credit + beforeAmt.Credit + periodAmt.Credit;
            const balance = totalDebit - totalCredit;

            if (totalDebit === 0 && totalCredit === 0) return;

            const stage3Id = String(coa.Stage3 || (String(coa.Stage) === "3" ? accountId : "") || "");
            const stage3Acc = stage3Id ? coaById.get(stage3Id) : null;

            rows.push({
                _id: accountId,
                Account: accountId,
                code: coa.AccountCode || "",
                AccountCode: coa.AccountCode || "",
                AccountName: coa.AccountName || "",
                Stage: coa.Stage,
                Stage3: stage3Id || null,
                Stage3Code: stage3Acc?.AccountCode || coa.masterCode || "",
                Stage3Name: stage3Acc?.AccountName || (String(coa.Stage) === "3" ? coa.AccountName : "Unclassified"),
                OpeningDebit: Number(openingAmt.Debit.toFixed(3)),
                OpeningCredit: Number(openingAmt.Credit.toFixed(3)),
                BeforeDebit: Number(beforeAmt.Debit.toFixed(3)),
                BeforeCredit: Number(beforeAmt.Credit.toFixed(3)),
                PeriodDebit: Number(periodAmt.Debit.toFixed(3)),
                PeriodCredit: Number(periodAmt.Credit.toFixed(3)),
                Debit: Number(totalDebit.toFixed(3)),
                Credit: Number(totalCredit.toFixed(3)),
                Balance: Number(balance.toFixed(3)),
            });
        });

        rows.sort((a, b) => {
            const gA = parseFloat(a.Stage3Code) || 0;
            const gB = parseFloat(b.Stage3Code) || 0;
            if (gA !== gB) return gA - gB;
            const numA = parseFloat(a.code) || 0;
            const numB = parseFloat(b.code) || 0;
            return numA - numB;
        });

        // Stage-3 groups with subtotals
        const groupMap = new Map();
        rows.forEach((row) => {
            const key = row.Stage3 || `code:${row.Stage3Code || "NA"}`;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    Stage3: row.Stage3,
                    Stage3Code: row.Stage3Code || "",
                    Stage3Name: row.Stage3Name || "Unclassified",
                    accounts: [],
                    Debit: 0,
                    Credit: 0,
                    BalanceDebit: 0,
                    BalanceCredit: 0,
                });
            }
            const g = groupMap.get(key);
            g.accounts.push(row);
            g.Debit += Number(row.Debit) || 0;
            g.Credit += Number(row.Credit) || 0;
            if (row.Balance > 0) g.BalanceDebit += Math.abs(row.Balance);
            if (row.Balance < 0) g.BalanceCredit += Math.abs(row.Balance);
        });

        const groups = Array.from(groupMap.values()).map((g) => ({
            ...g,
            Debit: Number(g.Debit.toFixed(3)),
            Credit: Number(g.Credit.toFixed(3)),
            BalanceDebit: Number(g.BalanceDebit.toFixed(3)),
            BalanceCredit: Number(g.BalanceCredit.toFixed(3)),
            Balance: Number((g.BalanceDebit - g.BalanceCredit).toFixed(3)),
            accountCount: g.accounts.length,
        })).sort((a, b) => (parseFloat(a.Stage3Code) || 0) - (parseFloat(b.Stage3Code) || 0));

        const tbDebit = rows
            .filter((r) => r.Balance > 0)
            .reduce((sum, r) => sum + Math.abs(r.Balance), 0);
        const tbCredit = rows
            .filter((r) => r.Balance < 0)
            .reduce((sum, r) => sum + Math.abs(r.Balance), 0);

        return res.status(200).json({
            status: true,
            startDate,
            endDate,
            openingOnly: openingOnlyMode,
            mode: openingOnlyMode ? "opening" : "full",
            openingStart: nextDate,
            openingEnd: firstOpening.DateEnd || "",
            beforeDate: before,
            store: storeArray,
            rows,
            groups,
            summary: {
                accounts: rows.length,
                stage3Groups: groups.length,
                totalDebit: Number(tbDebit.toFixed(3)),
                totalCredit: Number(tbCredit.toFixed(3)),
                difference: Number((tbDebit - tbCredit).toFixed(3)),
            },
        });
    } catch (err) {
        console.error("TrailBalance", err);
        return res.status(500).json({
            message: "Trial Balance failed",
            error: err.message,
        });
    }
};


export const VendorLeger = async (req, res) => {
    const { Vendor, startDate, endDate } = req.query
    const VendorArray = [...Vendor?.split(",")]

    const firstOpneing = await VendorOpeningModal?.find({
        DateStart: { $lte: startDate },
        DateEnd: { $gte: startDate }
    });

    const nextDate = firstOpneing[0]?.DateStart || startDate;

    const previosdate = new Date(startDate);
    previosdate.setDate(previosdate.getDate() - 1);
    const before = previosdate.toISOString().split('T')[0];
    try {

        const mergedVOucherData = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    "VoucharData.Vendor": { $in: VendorArray }
                },
            },

            { $unwind: "$VoucharData" },
            {
                $match: {
                    "VoucharData.Vendor": { $in: VendorArray }
                }
            },
            {
                $addFields: {
                    "VoucharData.VendorClean": {
                        $replaceOne: { input: "$VoucharData.Vendor", find: "Vendor : ", replacement: "" }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    Vendor: "$VoucharData.VendorClean",
                    VoucherNumber: "$VoucherNumber",
                    status: "$status",
                    VoucherDate: "$VoucherDate",
                    Credit: "$VoucharData.Credit",
                    Debit: "$VoucharData.Debit",
                    Type: "Voucher",
                    store: {
                        $ifNull: [
                            "$VoucharData.store",
                            { $ifNull: ["$VoucharData.Store", "0"] }
                        ]
                    },
                    Chq: "$ChequeNumber",
                    Narration: "$VoucharData.Narration",
                    Ref: "$VoucharData.Ref",

                },
            },
        ]);

        const mergedVOucherDataBefore = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                    "VoucharData.Vendor": { $in: VendorArray }
                },
            },

            { $unwind: "$VoucharData" },
            {
                $match: {
                    "VoucharData.Vendor": { $in: VendorArray }
                }
            },
            {
                $addFields: {
                    "VoucharData.VendorClean": {
                        $replaceOne: { input: "$VoucharData.Vendor", find: "Vendor : ", replacement: "" }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    Vendor: "$VoucharData.VendorClean",
                    VoucherNumber: "$VoucherNumber",
                    status: "$PostStatus",
                    VoucherDate: "$VoucherDate",
                    Credit: "$VoucharData.Credit",
                    Debit: "$VoucharData.Debit",
                    Type: "VoucherBefore",
                    store: {
                        $ifNull: [
                            "$VoucharData.store",
                            { $ifNull: ["$VoucharData.Store", "0"] }
                        ]
                    },

                },
            },
        ]);

        const yearOpening = firstOpneing[0]?.VendorData?.filter((item) => {
            const v = (item.Vendor || "").replace("Vendor : ", "");
            return VendorArray.includes(v);
        }).map((item) => ({
            id: item.id,
            Vendor: (item.Vendor || "").replace("Vendor : ", ""),
            Debit: item.Debit,
            Credit: item.Credit,
            store: item.store || item.Store || "0",
            Type: "VoucherBefore"
        })) || []

        const data = mergedVOucherData.concat(mergedVOucherDataBefore).concat(yearOpening)
        res.json(data);

    } catch (err) {
        console.log(err)

        res.status(500).send("Some thing went wrong", err)
    }

}


export const StoreLeadger = async (req, res) => {
    const t0 = Date.now();
    try {
        const { startDate, endDate, Store = "" } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        const storeFilterIds = String(Store || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const storeFilterSet = new Set(storeFilterIds.map(String));
        const AGG = { allowDiskUse: true };

        const voucherPipeline = [
            {
                $match: {
                    VoucherDate: { $gte: startDate, $lte: endDate },
                    VoucherType: { $in: ["BR", "CR"] },
                },
            },
            {
                $project: {
                    VoucherNumber: 1,
                    VoucherDate: 1,
                    VoucherType: 1,
                    PostStatus: 1,
                    VoucharData: 1,
                },
            },
            { $unwind: "$VoucharData" },
            {
                $match: {
                    "VoucharData.Client": { $nin: [null, "", "null", "undefined"] },
                },
            },
            {
                $project: {
                    _id: 0,
                    Account: "$VoucharData.Account",
                    VoucherNumber: 1,
                    status: "$PostStatus",
                    VoucherDate: 1,
                    Client: "$VoucharData.Client",
                    Credit: "$VoucharData.Credit",
                    Debit: "$VoucharData.Debit",
                    ClientRef2: "$VoucharData.ClientRef2",
                    Narration: "$VoucharData.Narration",
                    Chq: { $ifNull: ["$VoucharData.Chq", "$VoucharData.chq"] },
                    VoucherType: 1,
                    Type: { $literal: "StoreLedger" },
                    store: { $ifNull: ["$VoucharData.store", "0"] },
                    source: { $literal: "voucher" },
                },
            },
        ];

        const receiptPipeline = [
            {
                $match: {
                    ReciptDate: { $gte: startDate, $lte: endDate },
                    status: "False",
                },
            },
            {
                $project: {
                    ReciptNumber: 1,
                    ReciptDate: 1,
                    status: 1,
                    ReciptData: 1,
                },
            },
            { $unwind: "$ReciptData" },
            {
                $match: {
                    "ReciptData.Client": { $nin: [null, "", "null", "undefined"] },
                },
            },
            {
                $project: {
                    _id: 0,
                    Account: "$ReciptData.Account",
                    VoucherNumber: "$ReciptNumber",
                    status: 1,
                    VoucherDate: "$ReciptDate",
                    Client: "$ReciptData.Client",
                    Credit: "$ReciptData.Credit",
                    Debit: "$ReciptData.Debit",
                    ClientRef2: "$ReciptData.ClientRef2",
                    Narration: "$ReciptData.Narration",
                    Chq: { $ifNull: ["$ReciptData.Chq", "$ReciptData.chq"] },
                    VoucherType: { $literal: "BR" },
                    Type: { $literal: "StoreLedger" },
                    store: { $ifNull: ["$ReciptData.store", "0"] },
                    source: { $literal: "receipt" },
                },
            },
        ];

        const [vouchers, receipts] = await Promise.all([
            VoucherModal.aggregate(voucherPipeline, AGG),
            PaymentRecivedModal.aggregate(receiptPipeline, AGG),
        ]);

        let rows = vouchers.concat(receipts);
        if (!rows.length) {
            return res.status(200).json([]);
        }

        // Batch enrich only referenced invoices (not entire SalesInvoice collection)
        const invoiceNos = [
            ...new Set(
                rows
                    .map((r) => String(r.ClientRef2 ?? "").trim())
                    .filter(Boolean)
            ),
        ];

        const invoices = invoiceNos.length
            ? await SalesInvoiceModal.find(
                { SalesInvoice: { $in: invoiceNos } },
                {
                    SalesInvoice: 1,
                    Store: 1,
                    SalesFlowRef: 1,
                    SalesInvoiceDate: 1,
                }
            ).lean()
            : [];

        const invByNo = new Map(
            invoices.map((inv) => [String(inv.SalesInvoice), inv])
        );

        const storeIdStrs = [
            ...new Set(
                invoices
                    .map((inv) => String(inv.Store ?? "").trim())
                    .filter(Boolean)
            ),
        ];
        const storeOids = storeIdStrs.flatMap((id) => {
            if (!mongoose.Types.ObjectId.isValid(id)) return [];
            try {
                return [new mongoose.Types.ObjectId(id)];
            } catch {
                return [];
            }
        });

        const stores = storeOids.length
            ? await StoreModal.find({ _id: { $in: storeOids } })
                .select("StoreName")
                .lean()
            : [];
        const storeNameById = new Map(
            stores.map((s) => [String(s._id), s.StoreName || ""])
        );

        rows = rows.map((r) => {
            const inv = invByNo.get(String(r.ClientRef2 ?? "").trim());
            const invoiceStoreId = inv?.Store != null ? String(inv.Store) : "";
            const storeName = storeNameById.get(invoiceStoreId) || "";
            return {
                ...r,
                SalesInvoice: inv?.SalesInvoice || r.ClientRef2 || "",
                SaleInvoice: inv?.SalesInvoice || r.ClientRef2 || "", // FE legacy key
                SalesFlowRef: inv?.SalesFlowRef || "",
                SalesInvoiceDate: inv?.SalesInvoiceDate || "",
                invoiceStoreId,
                storeName,
                // Prefer invoice store name (same as old FE join); fallback line store
                store: storeName || r.store || "0",
            };
        });

        if (storeFilterSet.size) {
            rows = rows.filter((r) => storeFilterSet.has(String(r.invoiceStoreId || "")));
        }

        rows.sort((a, b) => {
            const d = String(a.VoucherDate || "").localeCompare(String(b.VoucherDate || ""));
            if (d !== 0) return d;
            return String(a.VoucherNumber || "").localeCompare(String(b.VoucherNumber || ""));
        });

        res.set("X-Store-Ledger-Ms", String(Date.now() - t0));
        res.set("X-Store-Ledger-Count", String(rows.length));
        return res.status(200).json(rows);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: err.message || "Store ledger failed" });
    }
};


export const BankBalance = async (req, res) => {
    try {
        const bank = await ChartofAccountsModel.find({ Stage: "4" })
        const Admin = await AdministrativeModal.findOne()

    } catch (err) {

    }
}



export const BookerLedger = async (req, res) => {
    const { OrderBooker, startDate, endDate } = req.query
    console.log(OrderBooker, "OrderBooker")
    const Client = await DistrbutorModal
        .find({ OrderBooker })
        .select({ _id: 1 })
        .lean();

    const ClientArray = Client.map((item) => item._id.toString())

    const firstOpneing = await ClientOpeningBalanceModal?.find({
        DateStart: { $lte: startDate },
        DateEnd: { $gte: startDate }
    });

    const nextDate = firstOpneing[0]?.DateStart
    const previosdate = new Date(startDate);
    previosdate.setDate(previosdate.getDate() - 1);
    const before = previosdate.toISOString().split('T')[0];
    try {


        const mergedVOucherData = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    "VoucharData.Client": { $in: ClientArray }
                },
            },

            { $unwind: "$VoucharData" },
            {
                $group: {
                    _id: {
                        id: "$_id",
                        Account: "$VoucharData.Account",
                        VoucherNumber: "$VoucherNumber",
                        Client: "$VoucharData.Client",
                        status: "$status",
                        Ref: { $ifNull: ["$VoucharData.ClientRef2", "$VoucharData.Ref"] },
                        VoucherDate: "$VoucherDate",
                        Credit: "$VoucharData.Credit",
                        store: "$VoucharData.store",
                        Debit: "$VoucharData.Debit",
                        Type: "Voucher",
                        Narration: "$VoucharData.Narration",
                        Chq: "$ChequeNumber",
                    },
                    VoucharData: { $push: "$VoucharData" },

                },
            },
            {
                $project: {
                    _id: 0,
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Client: "$_id.Client",
                    Credit: "$_id.Credit",
                    Ref: "$_id.Ref",
                    Narration: "$_id.Narration",
                    Debit: "$_id.Debit",
                    Type: "Voucher",
                    store: { $ifNull: ["$_id.store", "0"] },
                    Chq: "$_id.Chq",


                },
            },
        ]);
        console.log(mergedVOucherData)
        const mergedVOucherDataBefore = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                    "VoucharData.Client": { $in: ClientArray }
                },
            },

            { $unwind: "$VoucharData" },
            {
                $group: {
                    _id: {
                        Account: "$VoucharData.Account",
                        VoucherNumber: "$VoucherNumber",
                        status: "$PostStatus",
                        Client: "$VoucharData.Client",
                        VoucherDate: "$VoucherDate",
                        Credit: "$VoucharData.Credit",
                        store: "$VoucharData.store",
                        Debit: "$VoucharData.Debit",
                        Type: "Voucher Before",
                        PaidFor: "PaidFor"
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Client: "$_id.Client",
                    Credit: "$_id.Credit",
                    Debit: "$_id.Debit",
                    Type: "VoucherBefore",
                    store: { $ifNull: ["$_id.store", "0"] },

                },
            },
        ]);
        const yearOpening = (firstOpneing[0]?.ClientData || []).map((item) => ({
            id: item.id,
            Account: item.Account,
            Debit: item.Debit,
            Credit: item.Credit,
            Client: item.Client,
            store: item.store || item.Store || "0",
            Type: "VoucherBefore"
        }))
        const data1 = mergedVOucherData.concat(mergedVOucherDataBefore).concat(yearOpening)
        const data = data1.map((item) => ({
            ...item,
            Debit: Number(item.Debit || 0),
            Credit: Number(item.Credit || 0)

        }))



        const wholedata = data.filter((item) => {
            const ClientMatch = ClientArray.includes(item?.Client)
            return ClientMatch;
        });

        res.json(wholedata);

    } catch (err) {
        console.log(err)

        res.status(500).send("Some thing went wrong", err)
    }
};

export const VendorWiseClientLedger = async (req, res) => {
    const { Vendor, startDate, endDate } = req.query

    if (!Vendor || !startDate || !endDate) {
        return res.status(400).json({
            status: false,
            message: "Vendor, startDate and endDate are required"
        });
    }

    try {
        const vendorId = String(Vendor)
        const vendorIds = [vendorId, Vendor]
        if (mongoose.Types.ObjectId.isValid(vendorId)) {
            vendorIds.push(new mongoose.Types.ObjectId(vendorId))
        }
        const customers = await CutomerModal.find({
            Vendor: { $in: vendorIds }
        }).select({ CutomerName: 1, code: 1, SalesFlowRef: 1 }).lean();

        const customerList = customers.map((item) => ({
            _id: item._id.toString(),
            CutomerName: item.CutomerName || "",
            code: item.code || "",
            SalesFlowRef: item.SalesFlowRef || ""
        })).sort((a, b) => a.CutomerName.localeCompare(b.CutomerName));

        const ClientArray = customerList.map((item) => item._id)

        if (ClientArray.length === 0) {
            return res.json({
                customers: [],
                vouchers: []
            });
        }

        const firstOpneing = await ClientOpeningBalanceModal?.find({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate }
        });

        const nextDate = firstOpneing[0]?.DateStart || startDate
        const previosdate = new Date(startDate);
        previosdate.setDate(previosdate.getDate() - 1);
        const before = previosdate.toISOString().split('T')[0];

        const mergedVOucherData = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    "VoucharData.Client": { $in: ClientArray }
                },
            },
            { $unwind: "$VoucharData" },
            {
                $match: {
                    "VoucharData.Client": { $in: ClientArray }
                }
            },
            {
                $group: {
                    _id: {
                        id: "$_id",
                        Account: "$VoucharData.Account",
                        VoucherNumber: "$VoucherNumber",
                        Client: "$VoucharData.Client",
                        status: "$status",
                        Ref: { $ifNull: ["$VoucharData.ClientRef2", "$VoucharData.Ref"] },
                        VoucherDate: "$VoucherDate",
                        Credit: "$VoucharData.Credit",
                        store: "$VoucharData.store",
                        Debit: "$VoucharData.Debit",
                        Type: "Voucher",
                        Narration: "$VoucharData.Narration",
                        Chq: "$ChequeNumber",
                    },
                    VoucharData: { $push: "$VoucharData" },
                },
            },
            {
                $project: {
                    _id: $_id.id,
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Client: "$_id.Client",
                    Credit: "$_id.Credit",
                    Ref: "$_id.Ref",
                    Narration: "$_id.Narration",
                    Debit: "$_id.Debit",
                    Type: "Voucher",
                    store: { $ifNull: ["$_id.store", "0"] },
                    Chq: "$_id.Chq",
                },
            },
        ]);

        const mergedVOucherDataBefore = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                    "VoucharData.Client": { $in: ClientArray }
                },
            },
            { $unwind: "$VoucharData" },
            {
                $match: {
                    "VoucharData.Client": { $in: ClientArray }
                }
            },
            {
                $group: {
                    _id: {
                        Account: "$VoucharData.Account",
                        VoucherNumber: "$VoucherNumber",
                        status: "$PostStatus",
                        Client: "$VoucharData.Client",
                        VoucherDate: "$VoucherDate",
                        Credit: "$VoucharData.Credit",
                        store: "$VoucharData.store",
                        Debit: "$VoucharData.Debit",
                        Type: "Voucher Before",
                        PaidFor: "PaidFor"
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Client: "$_id.Client",
                    Credit: "$_id.Credit",
                    Debit: "$_id.Debit",
                    Type: "VoucherBefore",
                    store: { $ifNull: ["$_id.store", "0"] },
                },
            },
        ]);

        const yearOpening = (firstOpneing[0]?.ClientData || []).map((item) => ({
            id: item.id,
            Account: item.Account,
            Debit: item.Debit,
            Credit: item.Credit,
            Client: item.Client,
            store: item.store,
            Type: "VoucherBefore"
        }))

        const data1 = mergedVOucherData.concat(mergedVOucherDataBefore).concat(yearOpening)
        const data = data1.map((item) => ({
            ...item,
            Client: item.Client != null ? String(item.Client) : item.Client,
            Debit: Number(item.Debit || 0),
            Credit: Number(item.Credit || 0)
        }))

        const vouchers = data.filter((item) => ClientArray.includes(item?.Client));

        const extractInvoiceKey = (ref) => {
            const s = String(ref || "").trim();
            if (!s) return "";
            if (s.includes(",")) {
                const last = s.split(",").pop().trim();
                if (last && last !== "undefined" && last !== "null") return last;
            }
            return s;
        };

        const lookupKeys = [...new Set(
            vouchers.flatMap((v) => {
                const keys = [extractInvoiceKey(v.Ref)];
                const vn = String(v.VoucherNumber || "");
                if (vn.startsWith("SL") && vn.length > 2) keys.push(vn.slice(2));
                return keys;
            }).filter((k) => k && k !== "Advance" && k !== "UnRealized")
        )];

        const refMap = {};
        if (lookupKeys.length > 0) {
            const [salesInvoices, openingDocs] = await Promise.all([
                SalesInvoiceModal.find({
                    $or: [
                        { SalesInvoice: { $in: lookupKeys } },
                        { SalesFlowRef: { $in: lookupKeys } }
                    ]
                }).select({ SalesInvoice: 1, SalesFlowRef: 1 }).lean(),
                InvoiceOpeningModal.find().select({ InvoiceData: 1 }).lean()
            ]);

            salesInvoices.forEach((inv) => {
                const flow = inv.SalesFlowRef || "";
                if (inv.SalesInvoice) refMap[String(inv.SalesInvoice)] = flow;
                if (flow) refMap[String(flow)] = flow;
            });

            (openingDocs[0]?.InvoiceData || []).forEach((inv) => {
                const invoiceNo = String(inv.Invoice || inv.SalesInvoice || "");
                const flow = inv.SalesFlowRef || "";
                if (invoiceNo && flow) refMap[invoiceNo] = flow;
                if (flow) refMap[String(flow)] = flow;
            });
        }

        const vouchersWithRef = vouchers.map((item) => {
            const vn = String(item.VoucherNumber || "");
            const slInv = vn.startsWith("SL") && vn.length > 2 ? vn.slice(2) : "";
            const invoiceKey = extractInvoiceKey(item.Ref);
            const salesFlowRef = refMap[invoiceKey] || refMap[slInv] || "";
            return {
                ...item,
                SalesFlowRef: salesFlowRef
            };
        });

        res.json({
            customers: customerList,
            vouchers: vouchersWithRef
        });
    } catch (err) {
        console.log(err)
        res.status(500).send("Some thing went wrong", err)
    }
};

export const CashBook = async (req, res) => {
    try {
        const { Account, startDate, endDate } = req.query;

        const data = await VoucherModal.find({
            VoucherDate: {
                $gte: startDate,
                $lte: endDate
            },
            "VoucharData.Account": Account
        }).select({
            VoucharData: 1,
            VoucherNumber: 1,
            VoucherType: 1,
            VoucherDate: 1,
            _id: 1 // optional
        });

        res.status(200).json(data);

    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};


const ledgerAmount = (path) => ({
    $convert: {
        input: { $trim: { input: { $toString: { $ifNull: [path, 0] } } } },
        to: "double",
        onError: 0,
        onNull: 0,
    },
});

const inDateRange = (from, to) => ({
    $and: [{ $gte: ["$VoucherDate", from] }, { $lte: ["$VoucherDate", to] }],
});

const sumStoreClientSummary = (rangeFrom, before, startDate, endDate, clientMatchIds) => {
    if (!clientMatchIds.length || !rangeFrom || !endDate || rangeFrom > endDate) return Promise.resolve([]);
    return VoucherModal.aggregate([
        {
            $match: {
                VoucherDate: { $gte: rangeFrom, $lte: endDate },
                "VoucharData.Client": { $in: clientMatchIds },
            },
        },
        {
            $project: {
                VoucherDate: 1,
                VoucharData: {
                    $filter: {
                        input: { $ifNull: ["$VoucharData", []] },
                        as: "line",
                        cond: { $in: ["$$line.Client", clientMatchIds] },
                    },
                },
            },
        },
        { $unwind: "$VoucharData" },
        {
            $group: {
                _id: { $toString: "$VoucharData.Client" },
                openingDebit: {
                    $sum: rangeFrom <= before
                        ? { $cond: [inDateRange(rangeFrom, before), ledgerAmount("$VoucharData.Debit"), 0] }
                        : 0,
                },
                openingCredit: {
                    $sum: rangeFrom <= before
                        ? { $cond: [inDateRange(rangeFrom, before), ledgerAmount("$VoucharData.Credit"), 0] }
                        : 0,
                },
                debit: {
                    $sum: { $cond: [inDateRange(startDate, endDate), ledgerAmount("$VoucharData.Debit"), 0] },
                },
                credit: {
                    $sum: { $cond: [inDateRange(startDate, endDate), ledgerAmount("$VoucharData.Credit"), 0] },
                },
            },
        },
    ]).allowDiskUse(true).exec();
};

export const StoreWiseClientLedger = async (req, res) => {
    const { store, startDate, endDate, view } = req.query;
    if (!store || !startDate || !endDate) {
        return res.status(400).send("Store, start date and end date are required");
    }

    try {
        const [customers, openingDoc] = await Promise.all([
            CutomerModal.find({ Store: String(store) })
                .select({ CutomerName: 1, code: 1, SalesFlowRef: 1 })
                .lean(),
            ClientOpeningBalanceModal.findOne({
                DateStart: { $lte: startDate },
                DateEnd: { $gte: startDate },
            }).select({ DateStart: 1, ClientData: 1 }).lean(),
        ]);
        const clientIds = customers.map((item) => String(item._id));
        const clients = new Map(customers.map((item) => [String(item._id), item]));

        if (clientIds.length === 0) {
            return res.status(200).send({ rows: [] });
        }

        const clientMatchIds = toMatchIds(clientIds);
        const yearStart = openingDoc?.DateStart || startDate;
        const before = dayBefore(startDate);
        const openingByClient = new Map();
        const addOpening = (client, debit, credit) => {
            const id = String(client || "");
            if (!clients.has(id)) return;
            const current = openingByClient.get(id) || { debit: 0, credit: 0 };
            current.debit += Number(debit) || 0;
            current.credit += Number(credit) || 0;
            openingByClient.set(id, current);
        };

        if (view === "Summary") {
            const rangeFrom = yearStart <= before ? yearStart : startDate;
            const movementPromise = sumStoreClientSummary(rangeFrom, before, startDate, endDate, clientMatchIds);
            (openingDoc?.ClientData || []).forEach((item) => addOpening(item.Client, item.Debit, item.Credit));
            const movementRows = await movementPromise;
            movementRows.forEach((item) => addOpening(item._id, item.openingDebit, item.openingCredit));
            const periodByClient = new Map(movementRows.map((item) => [String(item._id || ""), item]));
            const orderedClients = [...clients.values()].sort((a, b) =>
                String(a.CutomerName || "").localeCompare(String(b.CutomerName || ""))
            );
            const rows = orderedClients.map((client) => {
                const id = String(client._id);
                const openingParts = openingByClient.get(id) || { debit: 0, credit: 0 };
                const period = periodByClient.get(id) || { debit: 0, credit: 0 };
                const opening = openingParts.debit - openingParts.credit;
                const debit = Number(period.debit) || 0;
                const credit = Number(period.credit) || 0;
                return {
                    client: client.CutomerName || "",
                    code: client.SalesFlowRef || client.code || "",
                    opening,
                    debit,
                    credit,
                    closing: opening + debit - credit,
                };
            }).filter((row) => row.opening || row.debit || row.credit);
            return res.status(200).send({ rows });
        }

        (openingDoc?.ClientData || []).forEach((item) => addOpening(item.Client, item.Debit, item.Credit));

        if (yearStart <= before) {
            const beforeRows = await VoucherModal.aggregate([
                { $match: { VoucherDate: { $gte: yearStart, $lte: before }, "VoucharData.Client": { $in: clientMatchIds } } },
                { $unwind: "$VoucharData" },
                { $match: { "VoucharData.Client": { $in: clientMatchIds } } },
                {
                    $group: {
                        _id: "$VoucharData.Client",
                        debit: { $sum: ledgerAmount("$VoucharData.Debit") },
                        credit: { $sum: ledgerAmount("$VoucharData.Credit") },
                    },
                },
            ]).allowDiskUse(true);
            beforeRows.forEach((item) => addOpening(item._id, item.debit, item.credit));
        }

        const periodRows = await VoucherModal.aggregate([
            { $match: { VoucherDate: { $gte: startDate, $lte: endDate }, "VoucharData.Client": { $in: clientMatchIds } } },
            { $unwind: "$VoucharData" },
            { $match: { "VoucharData.Client": { $in: clientMatchIds } } },
            {
                $project: {
                    _id: 0,
                    client: "$VoucharData.Client",
                    date: "$VoucherDate",
                    voucherNo: "$VoucherNumber",
                    ref: { $ifNull: ["$VoucharData.ClientRef2", "$VoucharData.Ref"] },
                    narration: "$VoucharData.Narration",
                    debit: ledgerAmount("$VoucharData.Debit"),
                    credit: ledgerAmount("$VoucharData.Credit"),
                    status: "$status",
                },
            },
            { $sort: { client: 1, date: 1, voucherNo: 1 } },
        ]).allowDiskUse(true);

        const periodByClient = new Map();
        periodRows.forEach((row) => {
            const id = String(row.client || "");
            if (!periodByClient.has(id)) periodByClient.set(id, []);
            periodByClient.get(id).push(row);
        });

        const orderedClients = [...clients.values()].sort((a, b) =>
            String(a.CutomerName || "").localeCompare(String(b.CutomerName || ""))
        );

        const rows = [];
        orderedClients.forEach((client) => {
            const id = String(client._id);
            const openingParts = openingByClient.get(id) || { debit: 0, credit: 0 };
            const lines = periodByClient.get(id) || [];
            const opening = openingParts.debit - openingParts.credit;
            if (!opening && lines.length === 0) return;
            let balance = opening;
            rows.push({
                client: client.CutomerName || "",
                code: client.SalesFlowRef || client.code || "",
                date: before,
                voucherNo: "",
                ref: "",
                narration: "Opening Balance",
                debit: 0,
                credit: 0,
                balance,
            });
            lines.forEach((line) => {
                balance += line.debit - line.credit;
                rows.push({
                    client: client.CutomerName || "",
                    code: client.SalesFlowRef || client.code || "",
                    date: line.date,
                    voucherNo: line.voucherNo || "",
                    ref: line.ref || "",
                    narration: line.narration || "",
                    debit: line.debit,
                    credit: line.credit,
                    balance,
                    status: line.status === false || line.status === "false" ? "UnPost" : "Post",
                });
            });
        });

        res.status(200).send({ rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Store wise client ledger failed");
    }
};

export const UnClaimed = async (req, res) => {
    try {
        const { Account } = req.params
        const Admin = await AdministrativeModal.findOne()
        const Data = await VoucherModal.find(({ VoucherMainAccount: Account, "VoucharData.Account": Admin.UnclaimedAc, "VoucharData.Credit": 0 }))
        res.status(200).send(Data)
    } catch (err) {

    }
}