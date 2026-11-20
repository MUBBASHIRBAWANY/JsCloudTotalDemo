import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "react-toastify/dist/ReactToastify.css";
import { amountToWords, formatAmount } from "../../../utils/amountToWords";
import { getDataFundtion } from "../../../Api/CRUDFunctions";

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const partyId = (value) => {
  if (value == null || value === "") return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const partyLabel = (item) => {
  if (!item || typeof item !== "object") return "";
  if (item.AccountName) {
    return `${item.AccountCode || ""} ${item.AccountName}`.trim();
  }
  const person =
    item.DistrbutorName ||
    item.CutomerName ||
    item.CustomerName ||
    item.ClientName ||
    "";
  if (!person) return "";
  const code = item.SalesFlowRef || item.OldCode || item.code || "";
  return code ? `${person} (${code})` : person;
};

const PaymentReceiptView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const receipts = useSelector(
    (state) => state.PaymentRecived?.PaymentRecived || []
  );
  const reduxClients = useSelector((state) => state.Client.client);
  const reduxAccounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
  const reduxDistributors = useSelector((state) => state.DistributroReducers.DistributroReducers);
  const [fetchedClients, setFetchedClients] = useState([]);
  const [fetchedAccounts, setFetchedAccounts] = useState([]);
  const [fetchedDistributors, setFetchedDistributors] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const loadParties = async () => {
      try {
        const [customerRes, distributorRes, accountRes] = await Promise.all([
          getDataFundtion("/customer/customerNameid"),
          getDataFundtion("/Distrbutor/DistrbutorNameId"),
          getDataFundtion("/ChartofAccounts"),
        ]);
        if (cancelled) return;
        setFetchedClients(asList(customerRes));
        setFetchedDistributors(asList(distributorRes));
        setFetchedAccounts(asList(accountRes));
      } catch (err) {
        console.error(err);
      }
    };
    loadParties();
    return () => {
      cancelled = true;
    };
  }, []);

  const mergeById = (primary, extra) => {
    const map = new Map();
    [...asList(primary), ...asList(extra)].forEach((item) => {
      const key = partyId(item?._id);
      if (key) map.set(key, item);
    });
    return [...map.values()];
  };

  const clients = useMemo(
    () => mergeById(reduxClients, fetchedClients),
    [reduxClients, fetchedClients]
  );
  const distributors = useMemo(
    () => mergeById(reduxDistributors, fetchedDistributors),
    [reduxDistributors, fetchedDistributors]
  );
  const accounts = useMemo(
    () => mergeById(reduxAccounts, fetchedAccounts),
    [reduxAccounts, fetchedAccounts]
  );

  const partyMap = useMemo(() => {
    const map = {};
    const put = (item) => {
      const key = partyId(item?._id);
      const label = partyLabel(item);
      if (key && label) map[key] = label;
    };
    accounts.forEach(put);
    clients.forEach(put);
    distributors.forEach(put);
    return map;
  }, [accounts, clients, distributors]);

  const getNameById = (value) => {
    const key = partyId(value);
    if (!key) return "";
    return partyMap[key] || "";
  };

  const getRowPartyName = (row) =>
    getNameById(row?.Client) ||
    getNameById(row?.Account) ||
    getNameById(row?.Customer) ||
    "";
  const [receipt, setReceipt] = useState(null);

  /* ================= FETCH ================= */
  useEffect(() => {
    const data = receipts.find((r) => r._id === id);
    //console.log(data)
    if (!data) {
      toast.error("Receipt not found");
      navigate(-1);
    } else {
      setReceipt(data);
    }
  }, [id, receipts, navigate]);

  /* ================= TOTALS ================= */
  const totals = useMemo(() => {
    if (!receipt?.ReciptData) return { debit: 0, credit: 0 };
    return {
      debit: receipt.ReciptData.reduce(
        (s, r) => s + (Number(r.Debit) || 0),
        0
      ),
      credit: receipt.ReciptData.reduce(
        (s, r) => s + (Number(r.Credit) || 0),
        0
      ),
    };
  }, [receipt]);

  // const format = (v) =>
  //   Number(v || 0).toLocaleString("en-US", {
  //     minimumFractionDigits: 2,
  //     maximumFractionDigits: 2,
  //   });

  /* ================= PDF ================= */
  const handlePrintPDF = async () => {
    const input = document.getElementById("receipt-print-section");
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, w, h);
    pdf.save(`PaymentReceipt_${receipt.ReciptNumber}.pdf`);
  };

  /* ================= EXCEL ================= */
  const handlePrintExcel = () => {
    const header = [
      ["Pearl Dynamic"],
      ["Payment Receipt Voucher"],
      [`Receipt No: ${receipt.ReciptNumber}`],
      [`Date: ${receipt.ReciptDate}`],
      [],
      ["Account / Client", "Debit", "Credit", "Narration"],
    ];

    const rows = receipt.ReciptData.map((r) => [
      getRowPartyName(r),
      r.Debit || 0,
      r.Credit || 0,
      r.Narration || "",
    ]);

    const totalRow = ["Totals", totals.debit, totals.credit, ""];

    const data = [...header, ...rows, totalRow];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Receipt");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `PaymentReceipt_${receipt.ReciptNumber}.xlsx`
    );
  };

  /* ================= WORD ================= */
  const handlePrintWord = () => {
    const rows = receipt.ReciptData
      .map(
        (r) => `
      <tr>
        <td>${getRowPartyName(r)}</td>
        <td>${formatAmount(r.Debit)}</td>
        <td>${formatAmount(r.Credit)}</td>
        <td>${r.Narration || ""}</td>
      </tr>`
      )
      .join("");

    const html = `
    <html>
    <body>
      <h2 align="center">Pearl Dynamic</h2>
      <h3 align="center">Payment Receipt Voucher</h3>
      <p><b>Receipt No:</b> ${receipt.ReciptNumber}</p>
      <p><b>Date:</b> ${receipt.ReciptDate}</p>
      <table border="1" width="100%" cellpadding="5">
        <tr>
          <th>Account / Client</th>
          <th>Debit</th>
          <th>Credit</th>
          <th>Narration</th>
        </tr>
        ${rows}
        <tr>
          <td><b>Totals</b></td>
          <td><b>${formatAmount(totals.debit)}</b></td>
          <td><b>${formatAmount(totals.credit)}</b></td>
          <td></td>
        </tr>
      </table>
    </body>
    </html>`;

    const blob = new Blob(["\ufeff", html], {
      type: "application/msword",
    });
    saveAs(blob, `PaymentReceipt_${receipt.ReciptNumber}.doc`);
  };

  if (!receipt) return <p className="text-center mt-6">Loading...</p>;

  /* ================= UI ================= */
  return (
    <>
      <ToastContainer />
      <div className="p-4">
        <h1 className="text-xl md:text-3xl font-bold text-center mb-6">
          Payment Receipt Voucher (View)
        </h1>

        {/* ACTIONS */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 pd-bg-muted0 text-white rounded"
          >
            Back
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Print PDF
          </button>
          <button
            onClick={handlePrintExcel}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Print Excel
          </button>
          <button
            onClick={handlePrintWord}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Print Word
          </button>

        </div>

        {/* PRINT AREA */}
        <div
          id="receipt-print-section"
          className="pd-bg-surface p-4 md:p-6 rounded-lg shadow-md"
        >
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold">Pearl Dynamic</h1>
            <h2 className="text-xl font-bold mt-4 underline">
              Payment Receipt Voucher
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <strong>Receipt No:</strong> {receipt.ReciptNumber}
            </div>
            <div>
              <strong>Date:</strong> {receipt.ReciptDate}
            </div>
            <div>
              <strong>Main Account:</strong>{" "}
              {getNameById(receipt.ReciptMainAccount) || receipt.ReciptMainAccount} 
            </div>
            <div>
              <strong>Status:</strong> {receipt.status}
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2">Account / Client</th>
                  <th className="border p-2 text-right">Ref</th>
                  <th className="border p-2 text-right">Debit</th>
                  <th className="border p-2 text-right">Credit</th>
                  <th className="border p-2">Narration</th>
                </tr>
              </thead>
              <tbody>
                {receipt.ReciptData.map((r, i) => (
                  <tr key={i}>
                    <td className="border p-2">
                      {getRowPartyName(r)}

                    </td>
                    <td className="border p-2">
                      {r.ClientRef2}
                    </td>
                    <td className="border p-2 text-right">
                      {formatAmount(r.Debit)}
                    </td>
                    <td className="border p-2 text-right">
                      {formatAmount(r.Credit)}
                    </td>
                    <td className="border p-2">
                      {r.Narration || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="pd-table-footer">
                  <td className="border p-2 text-right">Totals</td>
                  <td className="border p-2 text-right"></td>
                  <td className="border p-2 text-right">
                    {formatAmount(totals.debit)}
                  </td>
                  <td className="border p-2 text-right">
                    {formatAmount(totals.credit)}
                  </td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>  
                   {/* Amount in words */}
                  <div className="mb-10">
                      <div className="border-l-4 border-slate-700 pl-4 py-1">
                          <p className="text-xs uppercase tracking-[0.25em] pd-text-muted font-bold mb-2">
                              Amount in Words
                          </p>
                          <p className="font-medium pd-text-body leading-7 tracking-wide">
                              {amountToWords(totals.credit)}
                          </p>
                      </div>
                  </div>

          <div className="mt-10 grid grid-cols-3 gap-4 text-sm">
            <div>Prepared By: ___________________</div>
            <div>Approved By: ___________________</div>
            <div>Signature: ___________________</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentReceiptView;
