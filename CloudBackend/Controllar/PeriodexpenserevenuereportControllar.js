/**
 * Period Expense And Revenue Report
 * GET /GernalLager/PeriodExpenseRevenueReport?startDate=&endDate=
 *
 * Aggregates in Mongo (account + store + fiscal month), then shapes groups once.
 * No per-line dump to the client.
 */
import mongoose from "mongoose";
import VoucherModal from "../modal/VoucherModal.js";
import ChartOfAccountsModal from "../modal/ChartofAccountsModal.js";
import StoreModal from "../modal/StoreModal.js";

const DEPT_PARENT_CODES = ["50101", "50201", "50301"];

const emptyMonths = () => Array.from({ length: 12 }, () => 0);
const monthTotal = (months) => (months || []).reduce((s, v) => s + (Number(v) || 0), 0);
const round2 = (n) => Number(Number(n || 0).toFixed(2));
const byCode = (a, b) => (parseFloat(a.code) || 0) - (parseFloat(b.code) || 0);

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

const normalizeStoreKey = (raw) => {
    const s = raw == null ? "" : String(raw).trim();
    if (!s || s === "none" || s === "0" || s === "null" || s === "undefined") return "0";
    return s;
};

const makeStoreNamer = (stores) => {
    const lookup = {};
    (stores || []).forEach((s) => {
        lookup[String(s._id)] = s.StoreName || "";
    });
    return (rawStoreId) => {
        const raw = normalizeStoreKey(rawStoreId);
        if (raw === "0") return "Head Office";
        const name = (lookup[raw] || "").trim();
        if (!name || /^head\s*office$/i.test(name)) return "Head Office";
        return name;
    };
};

const isStage4Account = (accInfo) => {
    if (accInfo.stage === "4") return true;
    if (accInfo.stage === "1" || accInfo.stage === "2" || accInfo.stage === "3") return false;
    return (accInfo.code || "").length > 5;
};

const deptParentCode = (code) =>
    DEPT_PARENT_CODES.find((parent) => String(code || "").trim().startsWith(parent)) || "";

const prepareAccounts = (allAccounts) => {
    const stage3ById = {};
    const stage3ByCode = {};
    const revenueLookup = {};
    const expenseLookup = {};
    const accountIds = [];

    (allAccounts || []).forEach((acc) => {
        const id = String(acc._id);
        const code = String(acc.AccountCode || "").trim();
        const name = acc.AccountName || "";
        const stage = String(acc.Stage ?? "");

        if (stage === "3") {
            stage3ById[id] = { code, name };
            if (code) stage3ByCode[code] = { code, name };
        }

        if (code.startsWith("4")) {
            accountIds.push(id);
            revenueLookup[id] = {
                name,
                code,
                stage,
                stage3Id: acc.Stage3 ? String(acc.Stage3) : "",
            };
        } else if (code.startsWith("5")) {
            accountIds.push(id);
            expenseLookup[id] = { name, code };
        }
    });

    return { stage3ById, stage3ByCode, revenueLookup, expenseLookup, accountIds };
};

/** Mongo: sum Debit/Credit by Account + store + fiscal month (Jul=0 … Jun=11) */
const aggregateLedger = async (startDate, endDate, accountIds) => {
    if (!accountIds.length) return [];
    const accountMatchIds = toMatchIds(accountIds);

    return VoucherModal.aggregate([
        {
            $match: {
                VoucherDate: { $gte: startDate, $lte: endDate },
                "VoucharData.Account": { $in: accountMatchIds },
            },
        },
        {
            $addFields: {
                VoucharData: {
                    $filter: {
                        input: "$VoucharData",
                        as: "vd",
                        cond: { $in: ["$$vd.Account", accountMatchIds] },
                    },
                },
            },
        },
        { $unwind: "$VoucharData" },
        {
            $project: {
                _id: 0,
                Account: { $toString: "$VoucharData.Account" },
                Debit: {
                    $convert: {
                        input: "$VoucharData.Debit",
                        to: "double",
                        onError: 0,
                        onNull: 0,
                    },
                },
                Credit: {
                    $convert: {
                        input: "$VoucharData.Credit",
                        to: "double",
                        onError: 0,
                        onNull: 0,
                    },
                },
                store: {
                    $let: {
                        vars: {
                            raw: {
                                $ifNull: [
                                    "$VoucharData.store",
                                    { $ifNull: ["$VoucharData.Store", "0"] },
                                ],
                            },
                        },
                        in: {
                            $let: {
                                vars: { s: { $toString: { $ifNull: ["$$raw", "0"] } } },
                                in: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $eq: ["$$s", ""] },
                                                { $eq: ["$$s", "0"] },
                                                { $eq: ["$$s", "null"] },
                                                { $eq: ["$$s", "undefined"] },
                                                { $eq: ["$$s", "none"] },
                                            ],
                                        },
                                        then: "0",
                                        else: "$$s",
                                    },
                                },
                            },
                        },
                    },
                },
                // VoucherDate is "YYYY-MM-DD" string → fiscal idx (Jul=0)
                fiscalMonth: {
                    $cond: {
                        if: {
                            $gte: [
                                { $strLenCP: { $toString: { $ifNull: ["$VoucherDate", ""] } } },
                                7,
                            ],
                        },
                        then: {
                            $mod: [
                                {
                                    $add: [
                                        {
                                            $toInt: {
                                                $substrBytes: [
                                                    { $toString: "$VoucherDate" },
                                                    5,
                                                    2,
                                                ],
                                            },
                                        },
                                        5,
                                    ],
                                },
                                12,
                            ],
                        },
                        else: -1,
                    },
                },
            },
        },
        { $match: { fiscalMonth: { $gte: 0, $lte: 11 } } },
        {
            $group: {
                _id: {
                    Account: "$Account",
                    store: "$store",
                    m: "$fiscalMonth",
                },
                Debit: { $sum: "$Debit" },
                Credit: { $sum: "$Credit" },
            },
        },
    ]).allowDiskUse(true);
};

const applyMonth = (months, fiscalIdx, amount) => {
    if (fiscalIdx == null || fiscalIdx < 0 || fiscalIdx > 11) return;
    months[fiscalIdx] += amount;
};

const buildRevenueGroups = (rows, { revenueLookup, stage3ById, stage3ByCode }, storeNameOf) => {
    // accountId -> storeName -> months[]
    const monthly = {};

    rows.forEach((row) => {
        const accountId = String(row?._id?.Account || "");
        const acc = revenueLookup[accountId];
        if (!acc || !isStage4Account(acc)) return;
        const storeName = storeNameOf(row?._id?.store);
        const fiscalIdx = Number(row?._id?.m);
        const amount = (Number(row.Credit) || 0) - (Number(row.Debit) || 0);
        if (!amount) return;
        if (!monthly[accountId]) monthly[accountId] = {};
        if (!monthly[accountId][storeName]) monthly[accountId][storeName] = emptyMonths();
        applyMonth(monthly[accountId][storeName], fiscalIdx, amount);
    });

    const getStage3 = (accInfo) => {
        if (accInfo.stage3Id && stage3ById[accInfo.stage3Id]) return stage3ById[accInfo.stage3Id];
        const prefix = (accInfo.code || "").substring(0, 5);
        if (stage3ByCode[prefix]) return stage3ByCode[prefix];
        return { code: prefix || "4", name: "Other Revenue" };
    };

    const level3Map = {};
    Object.keys(monthly).forEach((accountId) => {
        const accInfo = revenueLookup[accountId];
        const stage3 = getStage3(accInfo);
        const level3Key = stage3.code || stage3.name;
        if (!level3Map[level3Key]) {
            level3Map[level3Key] = {
                code: stage3.code,
                name: stage3.name,
                Months: emptyMonths(),
                accounts: {},
            };
        }

        Object.entries(monthly[accountId]).forEach(([storeName, rawMonths]) => {
            const months = rawMonths.map(round2);
            const total = round2(monthTotal(months));
            if (!total && months.every((v) => v === 0)) return;
            months.forEach((v, i) => {
                level3Map[level3Key].Months[i] += v;
            });
            if (!level3Map[level3Key].accounts[accountId]) {
                level3Map[level3Key].accounts[accountId] = {
                    code: accInfo.code,
                    accountName: accInfo.name,
                    departments: [],
                };
            }
            level3Map[level3Key].accounts[accountId].departments.push({
                storeName,
                Months: months,
                Total: total,
            });
        });
    });

    return Object.values(level3Map)
        .map((group) => {
            const accounts = Object.values(group.accounts)
                .map((acc) => {
                    const departments = acc.departments.sort((a, b) =>
                        a.storeName.localeCompare(b.storeName)
                    );
                    const months = emptyMonths();
                    departments.forEach((d) =>
                        d.Months.forEach((v, i) => {
                            months[i] += v;
                        })
                    );
                    const Months = months.map(round2);
                    return {
                        ...acc,
                        departments,
                        Months,
                        Total: round2(monthTotal(Months)),
                    };
                })
                .filter((acc) => acc.departments.length > 0)
                .sort(byCode);

            const Months = group.Months.map(round2);
            return {
                code: group.code,
                name: group.name,
                Months,
                Total: round2(monthTotal(Months)),
                accounts,
            };
        })
        .filter((g) => g.accounts.length > 0)
        .sort(byCode);
};

const buildExpenseSections = (rows, { expenseLookup, stage3ByCode }, storeNameOf) => {
    // accountId -> storeName -> months[]  (debit - credit)
    const monthly = {};

    rows.forEach((row) => {
        const accountId = String(row?._id?.Account || "");
        const acc = expenseLookup[accountId];
        if (!acc) return;
        const storeName = storeNameOf(row?._id?.store);
        const fiscalIdx = Number(row?._id?.m);
        const amount = (Number(row.Debit) || 0) - (Number(row.Credit) || 0);
        if (!amount) return;
        if (!monthly[accountId]) monthly[accountId] = {};
        if (!monthly[accountId][storeName]) monthly[accountId][storeName] = emptyMonths();
        applyMonth(monthly[accountId][storeName], fiscalIdx, amount);
    });

    const deptBucket = {};
    DEPT_PARENT_CODES.forEach((code) => {
        deptBucket[code] = {
            code,
            name: stage3ByCode[code]?.name || code,
            accounts: {},
        };
    });

    const storeGroupMap = {};
    const shownInDept = new Set();

    Object.keys(monthly).forEach((accountId) => {
        const acc = expenseLookup[accountId];
        if (!acc) return;
        const parent = deptParentCode(acc.code);

        Object.entries(monthly[accountId]).forEach(([storeName, rawMonths]) => {
            const months = rawMonths.map(round2);
            const total = round2(monthTotal(months));
            if (!total && months.every((v) => v === 0)) return;

            if (parent && deptBucket[parent]) {
                shownInDept.add(acc.code);
                if (!deptBucket[parent].accounts[acc.code]) {
                    deptBucket[parent].accounts[acc.code] = {
                        code: acc.code,
                        accountName: acc.name,
                        departments: [],
                    };
                }
                deptBucket[parent].accounts[acc.code].departments.push({
                    storeName,
                    Months: months,
                    Total: total,
                });
                return;
            }

            if (!storeGroupMap[storeName]) {
                storeGroupMap[storeName] = {
                    storeName,
                    Months: emptyMonths(),
                    accounts: [],
                };
            }
            months.forEach((v, i) => {
                storeGroupMap[storeName].Months[i] += v;
            });
            storeGroupMap[storeName].accounts.push({
                code: acc.code,
                accountName: acc.name,
                Months: months,
                Total: total,
            });
        });
    });

    const expenseDeptGroups = DEPT_PARENT_CODES.map((code) => deptBucket[code])
        .map((group) => {
            const accounts = Object.values(group.accounts)
                .map((acc) => {
                    const departments = acc.departments.sort((a, b) =>
                        a.storeName.localeCompare(b.storeName)
                    );
                    const months = emptyMonths();
                    departments.forEach((d) =>
                        d.Months.forEach((v, i) => {
                            months[i] += v;
                        })
                    );
                    const Months = months.map(round2);
                    return {
                        code: acc.code,
                        accountName: acc.accountName,
                        departments,
                        Months,
                        Total: round2(monthTotal(Months)),
                    };
                })
                .filter((acc) => acc.departments.length > 0)
                .sort(byCode);

            const Months = emptyMonths();
            accounts.forEach((acc) =>
                acc.Months.forEach((v, i) => {
                    Months[i] += v;
                })
            );
            const rounded = Months.map(round2);
            return {
                code: group.code,
                name: group.name,
                Months: rounded,
                Total: round2(monthTotal(rounded)),
                accounts,
            };
        })
        .filter((g) => g.accounts.length > 0);

    const storeGroups = Object.values(storeGroupMap)
        .map((group) => {
            const accounts = group.accounts
                .filter((acc) => !shownInDept.has(acc.code))
                .sort(byCode);
            const Months = emptyMonths();
            accounts.forEach((acc) =>
                (acc.Months || []).forEach((v, i) => {
                    Months[i] += Number(v) || 0;
                })
            );
            const rounded = Months.map(round2);
            return {
                storeName: group.storeName,
                accounts,
                Months: rounded,
                Total: round2(monthTotal(rounded)),
            };
        })
        .filter((g) => g.accounts.length > 0)
        .sort((a, b) => a.storeName.localeCompare(b.storeName));

    return { expenseDeptGroups, storeGroups };
};

const sumGroupMonths = (groups) => {
    const months = emptyMonths();
    (groups || []).forEach((g) => {
        (g.Months || []).forEach((v, i) => {
            months[i] += Number(v) || 0;
        });
    });
    return months.map(round2);
};

export const buildPeriodExpenseRevenueReport = ({ allAccounts, stores, ledgerRows }) => {
    const ctx = prepareAccounts(allAccounts);
    const storeNameOf = makeStoreNamer(stores);

    const revenueGroups = buildRevenueGroups(ledgerRows, ctx, storeNameOf);
    const { expenseDeptGroups, storeGroups } = buildExpenseSections(ledgerRows, ctx, storeNameOf);

    const revenueMonths = sumGroupMonths(revenueGroups);
    const expenseDeptMonths = sumGroupMonths(expenseDeptGroups);
    const storeMonths = sumGroupMonths(storeGroups);
    const expenseGrandMonths = emptyMonths().map((_, i) =>
        round2((expenseDeptMonths[i] || 0) + (storeMonths[i] || 0))
    );

    return {
        revenueGroups,
        expenseDeptGroups,
        storeGroups,
        totals: {
            revenueMonths,
            revenueTotal: round2(monthTotal(revenueMonths)),
            expenseDeptMonths,
            expenseDeptTotal: round2(monthTotal(expenseDeptMonths)),
            expenseGrandMonths,
            expenseGrandTotal: round2(monthTotal(expenseGrandMonths)),
            // legacy aliases
            expenseMonths: expenseGrandMonths,
            expenseTotal: round2(monthTotal(expenseGrandMonths)),
        },
    };
};

export const PeriodExpenseRevenueReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "startDate and endDate are required" });
        }

        const [allAccounts, stores] = await Promise.all([
            ChartOfAccountsModal.find({}, "AccountCode AccountName Stage Stage3").lean(),
            StoreModal.find({}, "StoreName").lean(),
        ]);

        const { accountIds } = prepareAccounts(allAccounts);
        const ledgerRows = await aggregateLedger(startDate, endDate, accountIds);

        return res
            .status(200)
            .json(buildPeriodExpenseRevenueReport({ allAccounts, stores, ledgerRows }));
    } catch (err) {
        console.error("PeriodExpenseRevenueReport error:", err);
        return res.status(500).json({ message: "Something went wrong", error: err.message });
    }
};
