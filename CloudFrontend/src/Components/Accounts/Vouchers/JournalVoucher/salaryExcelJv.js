import * as XLSX from "xlsx";

const MONTHS = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

const amount = (value) => {
    if (value === "" || value == null) return 0;
    const number = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(number) ? number : 0;
};

const accountCodeOf = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return String(Math.round(value));
    const text = String(value ?? "").trim();
    return /^\d+\.0+$/.test(text) ? text.replace(/\.0+$/, "") : text;
};

const refOf = (item) => accountCodeOf(item?.AccountRef ?? item?.accountRef);

const indexByRef = (list) => {
    const map = new Map();
    list.forEach((item) => {
        const key = refOf(item);
        if (!key) return;
        const rows = map.get(key);
        if (rows) rows.push(item);
        else map.set(key, [item]);
    });
    return map;
};

const findByRef = (index, code) => {
    const hits = index.get(accountCodeOf(code));
    return hits && hits.length === 1 ? hits[0] : null;
};

const idOf = (item) => {
    const id = item?._id;
    if (id && typeof id === "object") return id.$oid || "";
    return id ? String(id) : "";
};

const parentOf = (item) => String(item?.parentAccount || item?.account || "");

const storeOf = (item) => {
    const value = item?.Store ?? item?.store;
    if (value && typeof value === "object") return String(value.$oid || "") || "0";
    const text = String(value ?? "").trim();
    return text || "0";
};

const kindOf = (name) => {
    const upper = String(name || "").toUpperCase();
    if (upper.startsWith("EBF EXP")) return "EBFEXP";
    if (upper.startsWith("EBF")) return "EBF";
    if (upper.startsWith("LOAN")) return "LOAN";
    if (upper.includes("SALAR")) return "SALARY";
    return "OTHER";
};

const columnIndex = (header, label, fallback) => {
    const index = header.findIndex((cell) => String(cell || "").toUpperCase().includes(label));
    return index >= 0 ? index : fallback;
};

const voucherDateFrom = (text) => {
    const found = String(text || "").toUpperCase().match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-(\d{4})\b/);
    if (!found) return "";
    const month = MONTHS[found[1]];
    const year = found[2];
    const day = String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const readRows = (buffer) => {
    const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
};

export const readSalaryExcel = (buffer, { ebfAccounts = [], loanAccounts = [] } = {}) => {
    const rows = readRows(buffer);
    const header = rows[0] || [];
    const codeCol = columnIndex(header, "CODE", 0);
    const nameCol = columnIndex(header, "ACCOUNT", 3);
    const descCol = columnIndex(header, "DESC", 6);
    const debitCol = columnIndex(header, "DEBIT", 9);
    const creditCol = columnIndex(header, "CREDIT", 11);
    const ebfParent = parentOf(ebfAccounts.find((item) => parentOf(item)));
    const loanParent = parentOf(loanAccounts.find((item) => parentOf(item)));
    const ebfByRef = indexByRef(ebfAccounts);
    const loanByRef = indexByRef(loanAccounts);
    const lines = [];
    let period = "";
    let periodLabel = "";

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const code = accountCodeOf(row[codeCol]);
        const name = String(row[nameCol] ?? "").trim();
        const desc = String(row[descCol] ?? "").trim();
        const debit = amount(row[debitCol]);
        const credit = amount(row[creditCol]);
        if (/total amount/i.test(desc) || /amount in words/i.test(code)) break;

        let fullName = name;
        let fullDesc = desc;
        const next = rows[i + 1];
        if (next) {
            const nextCode = accountCodeOf(next[codeCol]);
            const nextDebit = amount(next[debitCol]);
            const nextCredit = amount(next[creditCol]);
            const nextName = String(next[nameCol] ?? "").trim();
            const nextDesc = String(next[descCol] ?? "").trim();
            if (!nextCode && !nextDebit && !nextCredit && (nextName || nextDesc) && !/total amount/i.test(nextDesc)) {
                fullName = `${name} ${nextName}`.replace(/\s+/g, " ").trim();
                fullDesc = `${desc} ${nextDesc}`.replace(/\s+/g, " ").trim();
                i++;
            }
        }
        if (!code && !debit && !credit) continue;
        if (!period) {
            period = voucherDateFrom(fullDesc);
            const found = fullDesc.toUpperCase().match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{4}\b/);
            periodLabel = found ? found[0] : "";
        }
        lines.push({ code, name: fullName, desc: fullDesc, debit, credit });
    }

    let serial = 0;
    const VoucharData = lines.map((line) => {
        const kind = kindOf(line.name);
        const base = {
            id: Date.now() + serial++,
            AccountCode: line.code,
            AccountName: line.name,
            Client: "",
            EBF: "",
            Loan: "",
            Advance: "",
            BadDebt: "",
            Transporter: "",
            store: "0",
            Debit: line.debit,
            Credit: line.credit,
            Narration: line.desc,
            Account: "",
            Match: "chart-missing",
        };
        if (kind === "EBF" || kind === "LOAN") {
            const hit = findByRef(kind === "EBF" ? ebfByRef : loanByRef, line.code);
            const parent = hit ? parentOf(hit) : (kind === "EBF" ? ebfParent : loanParent);
            return {
                ...base,
                Account: parent,
                AccountName: hit ? hit.name : line.name,
                EBF: kind === "EBF" && hit ? idOf(hit) : "",
                Loan: kind === "LOAN" && hit ? idOf(hit) : "",
                store: storeOf(hit),
                Narration: hit ? line.desc : `${line.desc} | ${line.name}`,
                Match: hit ? kind.toLowerCase() : "unmatched",
            };
        }
        return base;
    });

    return {
        VoucherType: "JV",
        VoucherDate: period,
        Remarks: periodLabel ? `SALARY FOR THE MONTH OF ${periodLabel}` : "SALARY",
        VoucharData,
    };
};

const chartList = (accounts) => {
    if (Array.isArray(accounts)) return accounts;
    if (Array.isArray(accounts?.data)) return accounts.data;
    return [];
};

const normName = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const chartIndexes = (accounts) => {
    const all = chartList(accounts).filter((account) => account?._id && account?.AccountName);
    const byCode = new Map();
    all.forEach((account) => {
        const code = accountCodeOf(account.AccountCode);
        if (!code) return;
        if (byCode.has(code)) byCode.set(code, null);
        else byCode.set(code, account);
    });
    return { byCode };
};

const resolveChartAccount = (line, indexes) => {
    const code = accountCodeOf(line.AccountCode);
    if (!code) return null;
    return indexes.byCode.get(code) || null;
};

const isEmployeeLine = (line) =>
    Boolean(line?.EBF || line?.Loan || line?.Match === "ebf" || line?.Match === "loan" || line?.Match === "unmatched");

const isSalaryLine = (line) =>
    /salar/i.test(line?.AccountName || "") && !isEmployeeLine(line);

const voucherLines = (voucher) => (Array.isArray(voucher) ? voucher : voucher?.VoucharData || []);

const cleanLine = (line, accountId) => ({
    id: line.id || Date.now() + Math.random(),
    Account: accountId || line.Account || "",
    Client: "",
    EBF: line.EBF || "",
    Loan: line.Loan || "",
    Advance: line.Advance || "",
    BadDebt: line.BadDebt || "",
    Transporter: "",
    store: line.store || "0",
    vendor: "",
    Debit: amount(line.Debit),
    Credit: amount(line.Credit),
    Narration: line.Narration || "",
});

export const prepareSalaryVoucher = (voucher, chartAccounts) => {
    const indexes = chartIndexes(chartAccounts);
    const missing = [];
    const seen = new Set();
    const noteMissing = (line) => {
        const key = `${line.AccountCode || ""}|${normName(line.AccountName)}`;
        if (seen.has(key)) return;
        seen.add(key);
        missing.push({ code: String(line.AccountCode || "").trim(), name: line.AccountName || "" });
    };
    const prepared = voucherLines(voucher).map((line) => {
        if (isEmployeeLine(line)) {
            const posted = cleanLine(line);
            if (!posted.Account) noteMissing(line);
            return { ...line, posted };
        }
        const account = resolveChartAccount(line, indexes);
        if (!account) {
            noteMissing(line);
            return { ...line, posted: cleanLine(line, "") };
        }
        return { ...line, posted: cleanLine(line, String(account._id)) };
    });

    const salary = prepared.filter((line) => isSalaryLine(line));
    const rest = prepared.filter((line) => !isSalaryLine(line));
    salary.sort((a, b) => String(a.AccountName || "").localeCompare(String(b.AccountName || "")));
    const lines = [...salary, ...rest].map((line) => line.posted);
    const totalDebit = lines.reduce((sum, line) => sum + amount(line.Debit), 0);
    const totalCredit = lines.reduce((sum, line) => sum + amount(line.Credit), 0);
    const unmatched = [...new Set(
        voucherLines(voucher)
            .filter((line) => line.Match === "unmatched")
            .map((line) => {
                const name = line.AccountName || "";
                const code = String(line.AccountCode || "").trim();
                if (name && code) return `${name} (${code})`;
                return name || code || line.Narration;
            })
            .filter(Boolean)
    )];
    return { lines, missing, unmatched, totalDebit, totalCredit };
};
