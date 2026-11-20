import { createDataFunction } from "../../../../Api/CRUDFunctions";
import { prepareSalaryVoucher } from "./salaryExcelJv";

export { prepareSalaryVoucher, readSalaryExcel } from "./salaryExcelJv";

const nextVoucherNumber = async (voucherDate) => {
    const [year, month] = String(voucherDate || "").split("-");
    const prefix = `JV${year}${month}`;
    const code = await createDataFunction(
        `/Voucher/GetLastVouherByDate/JV?Voucherdate=${voucherDate}`,
        { prefix }
    );
    const list = Array.isArray(code) ? code : code?.data || [];
    let serial = 1;
    const lastVoucher = list[0]?.VoucherNumber;
    if (lastVoucher && lastVoucher.startsWith(prefix)) {
        const lastSerial = parseInt(lastVoucher.slice(8), 10);
        serial = Number.isNaN(lastSerial) ? 1 : lastSerial + 1;
    }
    return `${prefix}${String(serial).padStart(4, "0")}`;
};

export const uploadSalaryJournalVoucher = async ({ voucher, chartAccounts }) => {
    const prepared = prepareSalaryVoucher(voucher, chartAccounts);
    if (!voucher?.VoucherDate) {
        throw new Error("Excel mein salary month nahi mila");
    }
    if (prepared.missing.length) {
        const error = new Error("In account codes ka khata nahi mila");
        error.missing = prepared.missing;
        throw error;
    }
    if (prepared.totalDebit !== prepared.totalCredit) {
        throw new Error("Debit aur credit barabar nahi hain");
    }

    const payload = {
        VoucherDate: voucher.VoucherDate,
        Remarks: voucher.Remarks || "",
        VoucherType: "JV",
        VoucherNumber: await nextVoucherNumber(voucher.VoucherDate),
        status: "Post",
        TotalDebit: prepared.totalDebit,
        TotalCredit: prepared.totalCredit,
        VoucharData: prepared.lines,
        invoiceData: [],
    };
    return createDataFunction("/Voucher", payload);
};
