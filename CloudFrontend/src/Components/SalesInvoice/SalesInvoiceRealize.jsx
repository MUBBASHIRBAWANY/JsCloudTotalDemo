import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as XLSX from 'xlsx';
import { createDataFunction, getDataFundtion } from '../../Api/CRUDFunctions';
import { useNavigate } from 'react-router-dom';
import { ConvetDate } from '../Global/getDate';
import { set } from 'react-hook-form';
import { CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import { fetchRemaininginvoice } from '../../Redux/Reducers/Remaininginvoice';
import { fetchOpeningInvoices } from '../../Redux/Reducers/OpeningInvoicesReducer';
const EDITABLE_COLUMNS = new Set([
  "ChqNumber",
  "ChqDate",
  "ChqAmount",
  "CashAmount",
  "Credit",
  "shortage",
  "Shortage",
  "BankName",
  "BANK",
  "Bank",
]);

const getExcelInvoiceDateValue = (row) =>
  row?.["Invoice Date"] ?? row?.InvoiceDate ?? row?.invoiceDate ?? row?.["invoice date"] ?? "";

const normalizeRow = (row, formatDateFn) => {
  const next = { ...row };
  if (next.Shortage != null && next.shortage == null) next.shortage = next.Shortage;
  if (next.BANK != null && next.BankName == null) next.BankName = next.BANK;
  if (next.Bank != null && next.BankName == null) next.BankName = next.Bank;
  // Excel serial date -> YYYY-MM-DD
  if (typeof next.ChqDate === "number") {
    next.ChqDate = formatDateFn(next.ChqDate);
  }
  // Invoice Date column from excel (any common header variant)
  const invoiceDateKeys = ["Invoice Date", "InvoiceDate", "invoiceDate", "invoice date"];
  for (const key of invoiceDateKeys) {
    if (typeof next[key] === "number") {
      next[key] = formatDateFn(next[key]);
    } else if (next[key] instanceof Date && !Number.isNaN(next[key].getTime())) {
      const d = next[key];
      next[key] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }
  // keep one normalized alias for logic
  const excelInvDate = getExcelInvoiceDateValue(next);
  if (excelInvDate && next["Invoice Date"] == null) {
    next["Invoice Date"] = excelInvDate;
  }
  // keep stable row id for edits
  if (next.id == null && next.Id != null) next.id = next.Id;
  if (next.id == null) next.id = `${next.SalesFlowRef || "row"}-${Math.random().toString(36).slice(2, 8)}`;
  return next;
};

const SalesInvoiceRealize = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [data, setData] = useState([]);
  console.log(data)
  const [headers, setHeaders] = useState([]);
  const [filter, setFilter] = useState("");
  const [disable, setdisable] = useState(false);
  const [voucherDate, setvoucherDate] = useState(false);
  
  const [fullDetail, setFullDetail] = useState("All");
  const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);
  const Reamin = useSelector((state) => state.Remaininginvoice.Remaininginvoice)

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = React.useRef();
  const Client = useSelector((state) => state.Client.client)
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const SalesInvoice = useSelector((state) => state.SalesInvoice.SalesInvoice)
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [remainLoading, setRemainLoading] = useState(false);

  const findRemaining = (salesFlowRef) => {
    const key = String(salesFlowRef ?? "").trim();
    if (!key) return null;
    const fromRemain = (Reamin || []).find(
      (item) =>
        String(item?.SalesFlowRef ?? "").trim() === key ||
        String(item?.SalesInvoice ?? "").trim() === key
    );
    if (fromRemain) return fromRemain;

    // Opening invoices fallback
    const openingRows = editOpeningInvoices?.[0]?.InvoiceData || [];
    const opening = openingRows.find(
      (item) =>
        String(item?.Invoice ?? "").trim() === key ||
        String(item?.SalesFlowRef ?? "").trim() === key
    );
    if (!opening) return null;
    return {
      SalesFlowRef: opening.Invoice || opening.SalesFlowRef,
      RemainingAmount: opening.RemaingAmount ?? opening.RemainingAmount ?? 0,
      SalesInvoiceDate: opening.InvoiceDate || opening.SalesInvoiceDate,
      Store: opening.Store,
    };
  };

  useEffect(() => {
    const loadRemaining = async () => {
      setRemainLoading(true);
      try {
        const [remainRes, openingRes] = await Promise.all([
          getDataFundtion("/saleInvoice/getOnlyRemainInvoiceAmount"),
          getDataFundtion("/OpeningInvoice"),
        ]);
        if (remainRes?.data) dispatch(fetchRemaininginvoice(remainRes.data));
        if (openingRes?.data) dispatch(fetchOpeningInvoices(openingRes.data));
      } catch (err) {
        console.log(err);
        toast.error("Failed to load remaining invoices");
      } finally {
        setRemainLoading(false);
      }
    };
    loadRemaining();
  }, [dispatch]);

  // Re-check excel rows after remaining invoices load
  useEffect(() => {
    if (!remainLoading && data.length) {
      validateData(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Reamin, editOpeningInvoices, remainLoading]);
  const formatDate = (serial) => {
    const excelEpoch = new Date(1900, 0, 1);
    const days = serial - 2; // Excel's leap year bug adjustment
    const date = new Date(excelEpoch.getTime() + days * 86400000);

    // Format YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  };

  const getShortage = (row) => {
    return Number(row.shortage || row.Shortage || 0);
  };

  const getRemainingAmount = (row) => {
    const match = findRemaining(row.SalesFlowRef);
    return Number(match?.RemainingAmount || 0);
  };

  const getVOucherDate = (row) => {
    const excelDate = getExcelInvoiceDateValue(row);
    if (excelDate) return excelDate;
    const match = findRemaining(row.SalesFlowRef);
    return match?.SalesInvoiceDate;
  };

  const excelHasInvoiceDate = headers.some((h) =>
    ["Invoice Date", "InvoiceDate", "invoiceDate", "invoice date"].includes(String(h))
  );
  const hasDifferentInvoiceDates = React.useMemo(() => {
    if (!data.length) return false;

    const dates = data
      .map(row => getVOucherDate(row))
      .filter(Boolean);
    console.log(new Set(dates).size > 1)
setvoucherDate(dates[0])
    return new Set(dates).size > 1;
  }, [data, Reamin]);
  const validateData = (inputData = data) => {
    let newErrors = {};

    inputData.forEach((row, index) => {
      const match = findRemaining(row.SalesFlowRef);

      if (!match) {
        newErrors[row.SalesFlowRef] =
          `No remaining record found for SalesFlowRef "${String(row.SalesFlowRef ?? "").trim()}" (invoice missing, fully paid, or wrong ref)`;
        return;
      }

      const remaining = Number(match.RemainingAmount || 0);
      const cashAmt = Number(String(row.CashAmount ?? "").toString().replace(/,/g, "")) || 0;
      const chqAmt = Number(String(row.ChqAmount ?? "").toString().replace(/,/g, "")) || 0;
      const shortageAmt = getShortage(row);

      const totalPaid = Math.round(cashAmt + chqAmt + shortageAmt);

     

      if (remaining < totalPaid) {
        newErrors[row.SalesFlowRef] = `Remaining (${remaining}) < you want to realize (${totalPaid})`;
      }

      const chqNumber = String(row.ChqNumber ?? row.chq ?? "").trim();
      const bankName = String(row.BankName ?? row.BANK ?? row.Bank ?? "").trim();
      if (chqNumber && chqAmt <= 0) {
        newErrors[row.SalesFlowRef] = "ChqNumber hai to ChqAmount > 0 required";
      }
      if ((chqNumber || chqAmt > 0) && !bankName) {
        newErrors[row.SalesFlowRef] = "BankName is required when Cheque Number is entered";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  // ✅ File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileData = new Uint8Array(e.target.result);
      const workbook = XLSX.read(fileData, { type: 'array' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];

      // Keep excel columns exactly as in file (same order)
      const firstRow = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [])
        .map((h) => String(h ?? "").trim())
        .filter(Boolean);
      // Parse dates from excel cells so Invoice Date / ChqDate don't stay as serials
      const jsonData = XLSX.utils
        .sheet_to_json(worksheet, { raw: false, dateNF: "yyyy-mm-dd" })
        .map((row) => normalizeRow(row, formatDate));

      setData(jsonData);
      setHeaders(firstRow);

      setTimeout(() => {
        const isValid = validateData(jsonData);
        if (!isValid) {
          toast.error("Fix errors in uploaded file");
        }
      }, 0);
    };

    reader.readAsArrayBuffer(file);
  };

  // ✅ Sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedRows = React.useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // ✅ Filter
  const filteredAndSortedRows = sortedRows.filter((row) =>
    Object.values(row).some((val) =>
      val?.toString().toLowerCase().includes(filter.toLowerCase())
    )
  );

  // ✅ Totals (numeric only)
  const totals = headers.reduce((acc, h) => {
    const nums = filteredAndSortedRows.map(r => Number(r[h]) || 0);
    acc[h] = nums.reduce((a, b) => a + b, 0);
    return acc;
  }, {});

  const changeHandler = (row, field, value) => {
    const rowKey = row.id ?? row.Id ?? row.SalesFlowRef;
    const updatedData = data.map(r => {
      const key = r.id ?? r.Id ?? r.SalesFlowRef;
      if (key === rowKey) {
        let nextValue = value;
        if (field === "ChqAmount" || field === "Credit" || field === "CashAmount" || field === "shortage" || field === "Shortage") {
          nextValue = value === "" ? "" : Number(value);
        }
        const updated = { ...r, [field]: nextValue };
        if (field === "BankName" || field === "BANK" || field === "Bank") {
          updated.BankName = nextValue;
          updated.Bank = nextValue;
        }
        return updated;
      }
      return r;
    });

    setData(updatedData);
    setTimeout(() => validateData(updatedData), 0);
  };

  const isEditableColumn = (header) =>
    fullDetail !== "All" && EDITABLE_COLUMNS.has(header);

  const nevigate = useNavigate()

  const toAmount = (value) => {
    if (value == null || value === "") return 0;
    const n = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  };

  const submitData = async () => {
    if (!data.length) {
      toast.error("Upload excel data first");
      return;
    }
    if (!validateData(data)) {
      toast.error("Fix validation errors before submit");
      return;
    }

    const chqWithoutAmount = data.find(
      (row) => String(row.ChqNumber ?? "").trim() && toAmount(row.ChqAmount) <= 0
    );
    if (chqWithoutAmount) {
      toast.error(
        `SalesFlowRef ${chqWithoutAmount.SalesFlowRef}: ChqNumber hai to ChqAmount > 0 hona chahiye`
      );
      return;
    }

    const missingBankRow = data.find((row) => {
      const chqNumber = String(row.ChqNumber ?? row.chq ?? "").trim();
      const bankName = String(row.BankName ?? row.BANK ?? row.Bank ?? "").trim();
      return (chqNumber || toAmount(row.ChqAmount) > 0) && !bankName;
    });
    if (missingBankRow) {
      toast.error(
        `SalesFlowRef ${missingBankRow.SalesFlowRef}: BankName is required when Cheque Number is entered`
      );
      return;
    }

    const customRound = (value) => {
      const num = parseFloat(value) || 0;
      const floor = Math.floor(num);
      const decimal = num - floor;
      if (decimal > 0.5) return floor + 1;
      return floor;
    };

    const onlyCheque = data.filter((row) => toAmount(row.ChqAmount) > 0);
    const onlyCash =
      fullDetail == "All"
        ? data.filter((row) => toAmount(row.CashAmount) > 0 || getShortage(row) > 0)
        : data.filter(
            (row) =>
              toAmount(row.TotalAmount) -
                (toAmount(row.ChqAmount) + toAmount(row.Credit)) >
                0 || getShortage(row) > 0
          );

    if (!onlyCheque.length && !onlyCash.length) {
      toast.error("API call nahi hui: CashAmount / ChqAmount / shortage sab 0 hain");
      return;
    }

    setLoading(true);
    let chequeOk = 0;
    let cashOk = false;

    try {
      for (const row of onlyCheque) {
        const openingItem = editOpeningInvoices?.[0]?.InvoiceData?.find(
          (item) => item.Invoice == row.SalesFlowRef
        );
        const invoiceNumber = openingItem?.Invoice || row.SalesFlowRef;
        const type = openingItem?.Invoice ? "Opening" : "Current";
        const bankName = String(row.BankName ?? row.BANK ?? row.Bank ?? "").trim();
        const chqAmount = toAmount(row.ChqAmount);

        const dataCheque = {
          ChqDate: new Date(Date.now()).toISOString().split("T")[0],
          Customer: row.ClientSalesFlow,
          Amount: chqAmount,
          ChqNumber: row.ChqNumber,
          RealizeDate: row.ChqDate,
          BankName: bankName,
          PaymentDetail: [{ Type: "Chq", Amount: chqAmount, ChqNumber: row.ChqNumber }],
          table: [
            {
              chq: row.ChqNumber,
              ChqDate: new Date(Date.now()).toISOString().split("T")[0],
              Amount: chqAmount,
              id: Date.now() + Math.random().toString(36).substring(2, 15),
              RealizeDate: row.ChqDate,
              status: "Pending",
              Invoice: invoiceNumber,
              BankName: bankName,
              Bank: bankName,
            },
          ],
          grouped: [
            {
              chq: row.ChqNumber,
              status: "Pending",
              BankName: bankName,
              Bank: bankName,
              items: [
                {
                  RealizeDate: ConvetDate(row.ChqDate),
                  staus: "Pending",
                  chq: row.ChqNumber,
                  Invoice: invoiceNumber,
                  Type: type,
                  Amount: chqAmount,
                  BankName: bankName,
                  Bank: bankName,
                },
              ],
            },
          ],
          status: "Pending",
          invoiceArray: [
            {
              invoice: invoiceNumber,
              Amount: chqAmount,
              type: type,
            },
          ],
        };

        try {
          await createDataFunction("/CustomerChqRecived/RealizeCustomerChq", dataCheque);
          chequeOk += 1;
        } catch (err) {
          console.error(err);
          const msg =
            err?.response?.data?.message ||
            err?.response?.data?.invalidInvoices?.[0]?.reason ||
            "Customer cheque API failed";
          toast.error(`Cheque ${row.ChqNumber}: ${msg}`);
          setLoading(false);
          return;
        }
      }

      if (onlyCash.length) {
        const cashData = onlyCash.map((row) => {
          const openingItem = editOpeningInvoices?.[0]?.InvoiceData?.find(
            (item) => item.Invoice == row.SalesFlowRef
          );
          const invoiceNumber = openingItem?.Invoice || row.SalesFlowRef;
          const type = openingItem?.Invoice ? "Opening" : "Current";
          const remainMatch = findRemaining(row.SalesFlowRef);
          const store = openingItem?.Store || remainMatch?.Store || row.Store || "";
          const cashAmount =
            fullDetail == "All"
              ? toAmount(row.CashAmount)
              : Math.max(
                  0,
                  toAmount(row.TotalAmount) -
                    (toAmount(row.ChqAmount) + toAmount(row.Credit))
                );

          return {
            Client: row.ClientSalesFlow,
            Credit: customRound(cashAmount) + getShortage(row),
            Account: Admin.Client,
            ClientRef2: invoiceNumber,
            store: store,
            Shortage: getShortage(row),
            Type: type,
            Narration: `Cash Rcvd against invoice ${invoiceNumber} received from ${
              Client.find((c) => c.SalesFlowRef == row.ClientSalesFlow)?.CutomerName ||
              row.ClientSalesFlow
            }`,
            id: Date.now() + Math.random().toString(36).substring(2, 15),
          };
        });

        const Shortage = cashData.reduce((a, b) => a + (b.Shortage || 0), 0);
        cashData.push({
          Debit:
            cashData.reduce((a, b) => a + (b.Credit || 0), 0) -
            cashData.reduce((a, b) => a + (b.Debit || 0), 0),
          Account: Admin.pettyCashAccount,
          store: cashData[0]?.store || "",
          show: true,
          id: Date.now(),
        });

        const CashVoucher = {
          VoucherDate: voucherDate || getExcelInvoiceDateValue(data[0]) || new Date().toISOString().split("T")[0],
          VoucherType: "CR",
          Shortage,
          ShortageAccount: Admin.shortageAccount,
          VoucherMainAccount: Admin.pettyCashAccount,
          status: "Post",
          PaidFor: "Client",
          TotalDebit: cashData.reduce((a, b) => a + (b.Debit || 0), 0),
          TotalCredit: cashData.reduce((a, b) => a + (b.Credit || 0), 0),
          VoucharData: cashData,
        };

        await createDataFunction("/Voucher/RealizeVoucher", CashVoucher);
        cashOk = true;
      }

      toast.success(
        `Submitted${chequeOk ? ` · Cheques: ${chequeOk}` : ""}${cashOk ? " · Cash receipt created" : ""}`
      );
      navigate("/SalesInvoice");
    } catch (error) {
      console.error("Error submitting data:", error);
      toast.error(
        error?.response?.data?.message || error?.message || "Submit failed — API call error"
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="sales-report-container" ref={reportRef}>
      {/* Watermark */}
      <div className="watermark">
        <div className="watermark-content">
          <img
            src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png"
            alt=""
          />
        </div>
      </div>

      {/* Header */}
      <div className="sales-report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dynamic</h2>
          <p className="company-address">123 Business Avenue, Suite 456</p>
          <p className="company-contact">Phone: (555) 123-4567 | Email: info@pmmgmt.com</p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Uploaded Excel Report</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">
            {filteredAndSortedRows.length > 0
              ? `Rows: ${filteredAndSortedRows.length}`
              : 'No data available'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="report-controls">
        <div className="file-upload">
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
        </div>
        <div className="data-type-selector">
          <label>
            <input
              type="radio"
              value="All"
              defaultChecked={true}
              onChange={(e) => setFullDetail(e.target.value)}
              name="dataType"
            />
            <span>Full Data</span>
          </label>
          <label>
            <input
              type="radio"
              value="enterChq"
              onChange={(e) => setFullDetail(e.target.value)}
              name="dataType"
            />
            <span>Enter Cheque Detail</span>
          </label>
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search uploaded data..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            Total Rows: <strong>{filteredAndSortedRows.length}</strong>
          </span>
        </div>
      </div>

      {/* Table — excel columns exactly as uploaded */}
      <div className="table-container">
        <table className="sales-data-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} onClick={() => requestSort(h)}>
                  {h}{h === "BankName" ? " *" : ""} {sortConfig.key === h ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th>error</th>
              <th>Remaining</th>
              {!excelHasInvoiceDate && <th>Invoice Date</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length > 0 ? (
              filteredAndSortedRows.map((row, i) => (
                <tr key={row.id ?? row.Id ?? i} className={errors[row.SalesFlowRef] ? "error-row" : ""}>
                  {headers.map((h) => (
                    <td key={h} className={typeof row[h] === "number" ? "numeric" : ""}>
                      {isEditableColumn(h) ? (
                        <input
                          className={`input-field ${h === "BankName" && String(row.ChqNumber || "").trim() && !String(row.BankName || "").trim() ? "border-red-400" : ""}`}
                          type={h === "ChqDate" || h === "Invoice Date" || h === "InvoiceDate" ? "date" : (h === "ChqAmount" || h === "CashAmount" || h === "Credit" || h === "shortage" || h === "Shortage" ? "number" : "text")}
                          value={row[h] ?? ""}
                          placeholder={h === "BankName" ? "BankName *" : ""}
                          onChange={(e) => changeHandler(row, h, e.target.value)}
                        />
                      ) : (
                        row[h]
                      )}
                    </td>
                  ))}
                  <td className="error-message">
                    {errors[row.SalesFlowRef]}
                  </td>
                  <td className="numeric">
                    {getRemainingAmount(row)}
                  </td>
                  {!excelHasInvoiceDate && (
                    <td className="numeric">
                      {getVOucherDate(row)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length + (excelHasInvoiceDate ? 2 : 3)} className="no-data">
                  No matching records found
                </td>
              </tr>
            )}
            {filteredAndSortedRows.length > 0 && (
              <tr className="footer-row">
                {headers.map((h, i) => (
                  <td key={i} className="footer-total numeric">
                    {totals[h] ? totals[h].toLocaleString() : ""}
                  </td>
                ))}
                <td className="footer-total"></td>
                <td className="footer-total numeric"></td>
                {!excelHasInvoiceDate && <td className="footer-total numeric"></td>}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      {(Object.keys(errors).length > 0 || hasDifferentInvoiceDates) && (
        <div className="error-message" style={{ marginBottom: 8 }}>
          {hasDifferentInvoiceDates
            ? "Submit disabled: selected rows have different Invoice Dates"
            : `Submit disabled: ${Object.values(errors)[0] || "validation errors found"}`}
        </div>
      )}
      <button
        disabled={
          Object.keys(errors).length > 0 ||
          hasDifferentInvoiceDates || loading
        }
        className="btn btn-submit"
        onClick={() => submitData()}
        title={
          hasDifferentInvoiceDates
            ? "Different Invoice Dates"
            : Object.keys(errors).length > 0
              ? Object.values(errors)[0]
              : loading
                ? "Submitting..."
                : "Submit"
        }
      >
        {loading ? <CircularProgress size={16} color="inherit" /> : "Submit"}
      </button>

      <style jsx>{`
    .sales-report-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--pd-surface-container-lowest);
      border: 1px solid var(--pd-border-card);
      border-radius: 8px;
      padding: 24px;
      margin: 20px auto;
      color: var(--pd-on-surface);
      position: relative;
      overflow-y: auto;
      max-height: 90vh;
      max-width: 95vw;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .watermark {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 1;
      opacity: 0.03;
    }

    .watermark-content {
      text-align: center;
      transform: rotate(-45deg);
    }

    .watermark-content img {
      max-width: 400px;
      opacity: 0.5;
    }

    .sales-report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--pd-border-card);
      position: relative;
      z-index: 2;
    }

    .company-info {
      text-align: left;
    }

    .company-name {
      font-size: 20px;
      font-weight: 600;
      color: var(--pd-on-surface);
      margin: 0 0 4px 0;
    }

    .company-address, .company-contact {
      font-size: 12px;
      color: var(--pd-on-surface-variant);
      margin: 2px 0;
    }

    .report-info {
      text-align: right;
    }

    .report-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--pd-on-surface);
      margin: 0 0 4px 0;
    }

    .report-date, .report-range {
      font-size: 12px;
      color: var(--pd-on-surface-variant);
      margin: 2px 0;
    }

    .report-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
      position: relative;
      z-index: 2;
    }

    .file-upload {
      flex: 0 0 auto;
    }

    .file-upload input[type="file"] {
      font-size: 13px;
      padding: 4px 0;
    }

    .data-type-selector {
      display: flex;
      gap: 16px;
      flex: 0 0 auto;
    }

    .data-type-selector label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--pd-on-surface);
    }

    .search-box {
      flex: 1 1 300px;
    }

    .search-input {
      width: 100%;
      padding: 6px 12px;
      border: 1px solid var(--pd-outline-variant);
      border-radius: 4px;
      font-size: 13px;
      color: var(--pd-on-surface);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--pd-on-surface-variant);
    }

    .summary-stats {
      flex: 0 0 auto;
    }

    .stat-item {
      font-size: 13px;
      color: var(--pd-on-surface);
    }

    .stat-item strong {
      font-weight: 600;
      color: var(--pd-on-surface);
    }

    .table-container {
      border: 1px solid var(--pd-border-card);
      border-radius: 4px;
      margin-bottom: 20px;
      overflow-x: auto;
      position: relative;
      z-index: 2;
    }

    .sales-data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      min-width: 800px;
    }

    .sales-data-table th {
      background: var(--pd-surface-container-low);
      padding: 10px 12px;
      text-align: center;
      font-weight: 500;
      color: var(--pd-on-surface);
      border-bottom: 1px solid var(--pd-border-card);
      white-space: nowrap;
      cursor: pointer;
    }

    .sales-data-table th:hover {
      background: var(--pd-surface-container-low);
    }

    .sales-data-table td {
      padding: 8px 12px;
      text-align: center;
      vertical-align: middle;
      border-bottom: 1px solid var(--pd-border-card);
      color: var(--pd-on-surface);
    }

    .error-row {
      background-color: #fef2f2;
    }

    .input-field {
      width: 100%;
      padding: 4px 8px;
      border: 1px solid var(--pd-outline-variant);
      border-radius: 4px;
      font-size: 12px;
      color: var(--pd-on-surface);
      background: var(--pd-surface-container-lowest);
      text-align: center;
    }

    .input-field:focus {
      outline: none;
      border-color: var(--pd-on-surface-variant);
    }

    .numeric {
      text-align: center;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
    }

    .error-message {
      color: #dc2626;
      font-size: 11px;
      text-align: center;
    }

    .no-data {
      text-align: center;
      padding: 40px 20px;
      color: var(--pd-on-surface-variant);
      font-style: italic;
    }

    .footer-row {
      background: var(--pd-surface-container-low);
      border-top: 1px solid var(--pd-border-card);
    }

    .footer-total {
      font-weight: 600;
      color: var(--pd-on-surface);
    }

    .report-actions {
      display: flex;
      justify-content: flex-end;
      position: relative;
      z-index: 2;
    }

    .btn {
      padding: 8px 20px;
      border: 1px solid var(--pd-outline-variant);
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      background: var(--pd-surface-container-lowest);
      color: var(--pd-on-surface);
      transition: all 0.1s ease;
    }

    .btn:hover:not(:disabled) {
      background: var(--pd-surface-container-low);
      border-color: var(--pd-on-surface-variant);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-submit {
      background: var(--pd-on-surface);
      color: var(--pd-surface-container-lowest);
      border-color: var(--pd-on-surface);
    }

    .btn-submit:hover:not(:disabled) {
      background: var(--pd-on-surface);
    }

    @media (max-width: 768px) {
      .sales-report-container {
        padding: 16px;
      }

      .sales-report-header {
        flex-direction: column;
        gap: 12px;
      }

      .company-info, .report-info {
        text-align: left;
        width: 100%;
      }

      .report-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .data-type-selector {
        justify-content: flex-start;
      }

      .search-box {
        width: 100%;
      }
    }

    @media print {
      .sales-report-container {
        border: none;
        padding: 0;
        box-shadow: none;
      }

      .report-controls,
      .report-actions,
      .input-field,
      .watermark {
        display: none;
      }

      .table-container {
        overflow: visible;
        border: none;
      }

      .sales-data-table {
        border-collapse: collapse;
      }

      .footer-row {
        background: var(--pd-surface-container-low) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `}</style>
    </div>
  );
};

export default SalesInvoiceRealize;