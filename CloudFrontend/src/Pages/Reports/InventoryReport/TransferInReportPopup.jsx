import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getDataFundtion } from "../../../Api/CRUDFunctions";import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';



const TransferInDataPopup = ({ data = {} }) => {
  const {
    startDate,
    endDate,
    store,
    SkuOptions = [],
    StoreList = [],
    LocationList = [],
  } = data;

  const [transferData, setTransferData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const reportRef = useRef();

  const fmt = useCallback((n) => (Number(n || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), []);

  // Build API URL
  const buildUrl = useCallback(() => {
    const s = startDate ? `startDate=${encodeURIComponent(startDate)}` : "";
    const e = endDate ? `&endDate=${encodeURIComponent(endDate)}` : "";
    const st = store ? `&Store=${encodeURIComponent(store)}` : "";
    return `/StockTransfer/GetTransferInReport?${s}${e}${st}`;
  }, [startDate, endDate, store]);

  // Fetch transfer data
  const fetchTransferData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = buildUrl();
      const res = await getDataFundtion(`/InventoryReport/TransferInReport?startDate=${data.startDate}&endDate=${data.endDate}&Store=${data.store}`);
      //console.log(res)  
      setTransferData(res);
    } catch (err) {
      console.error("Error fetching Transfer In data:", err);
      setError("Failed to fetch data");
      setTransferData([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchTransferData();
  }, []);

  // Map + lookup
  const mappedData = useMemo(() => {
    
    return transferData.map((item, idx) => {
      const productObj = SkuOptions.find((p) => p._id === item.product) || {};
      const storeObj = StoreList.find((s) => s._id === item.StoreTo) || {};
      const locObj = LocationList.find((l) => l._id === item.LocationTo) || {};

      return {
        id: idx + 1,
        date: item.date || "",
        TransferCode: item.TransferCode || "",
        SalesFlowRef: item.SalesFlowRef || "",
        PostStatus: item.PostStatus || "",
        Type: item.type || "",
        totalInBoxes: Number(item.totalInBoxes),
        TransferInAmount: Number(item.TransferInAmount || 0),
        productCode: productObj.code || "",
        productName: productObj.ProductName || "",
        StoreName: storeObj.label || storeObj.StoreName || "",
        LocationName: locObj.label || locObj.LocationName || "",
      };
    });
  }, [transferData, SkuOptions, StoreList, LocationList]);


  
  // Totals
  const totals = useMemo(() => {
    return mappedData.reduce(
      (acc, cur) => {
        acc.totalBoxes += cur.totalInBoxes || 0;
        acc.totalAmount += cur.TransferInAmount || 0;
        return acc;
      },
      { totalBoxes: 0, totalAmount: 0 }
    );
  }, [mappedData]);

  // Excel Export
  const exportToExcel = async () => {
    const exportRows = mappedData.map((row, index) => ({
      '#': index + 1,
      ...row,
      totalInBoxes: Number(Number(row.totalInBoxes || 0).toFixed(2)),
      TransferInAmount: Number(Number(row.TransferInAmount || 0).toFixed(2)),
    }));
    const storeName = StoreList.find((s) => s._id === store || s.value === store)?.StoreName
      || StoreList.find((s) => s._id === store || s.value === store)?.label
      || store
      || 'All';
    await exportProfessionalExcel({
      title: 'Transfer In Report',
      fileName: 'TransferInReport',
      sheetName: 'TransferInReport',
      rows: exportRows,
      meta: [
        startDate && endDate ? `Period: ${startDate} to ${endDate}` : '',
        `Store: ${storeName}`,
      ].filter(Boolean),
      excludeKeys: ['_id', 'id'],
    });
  };

  // Word Export
  const exportToWord = async () => {
    const tableRows = [
      new TableRow({
        children: [
          "S/N",
          "Date",
          "Transfer Code",
          "Product",
          "Boxes",
          "Amount",
          "Store",
          "Location",
          "Status",
        ].map((header) => new TableCell({ children: [new Paragraph(header)] })),
      }),
      ...mappedData.map(
        (item) =>
          new TableRow({
            children: [
              item.id,
              item.date,
              item.TransferCode,
              item.productName,
              fmt(item.totalInBoxes),
              fmt(item.TransferInAmount),
              item.StoreName,
              item.LocationName,
              item.PostStatus,
            ].map((v) => new TableCell({ children: [new Paragraph(String(v))] })),
          })
      ),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Totals")], columnSpan: 4 }),
          new TableCell({ children: [new Paragraph(fmt(totals.totalBoxes))] }),
          new TableCell({ children: [new Paragraph(fmt(totals.totalAmount))] }),
          new TableCell({ children: [new Paragraph("")], columnSpan: 3 }),
        ],
      }),
    ];

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: "Transfer In Report", heading: "Heading1" }),
            new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `TransferInReport_${Date.now()}.docx`);
  };

  // PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Transfer In Report", 14, 12);
    autoTable(doc, {
      head: [["#", "Date", "TransferCode", "Product", "Boxes", "Amount", "Store", "Location", "Status"]],
      body: mappedData.map((r) => [
        r.id,
        r.date,
        r.TransferCode,
        r.productName,
        fmt(r.totalInBoxes),
        fmt(r.TransferInAmount),
        r.StoreName,
        r.LocationName,
        r.PostStatus,
      ]),
      startY: 20,
    });
    doc.save(`TransferInReport_${Date.now()}.pdf`);
  };

  // Print
  const printReport = () => {
    const printContent = reportRef.current.innerHTML;
    const WinPrint = window.open("", "", "width=1000,height=800");
    WinPrint.document.write(`<html><head><title>Transfer In Report</title></head><body>${printContent}</body></html>`);
    WinPrint.document.close();
    WinPrint.focus();
    WinPrint.print();
    WinPrint.close();
  };

  return (
    <div className="report-container">
      <ReportPopupHeader title="Transfer In Report" />

      <div className="report-header">
        <h2>Transfer In Report</h2>
        <div className="actions">
          <button onClick={exportToExcel}>Excel</button>
          <button onClick={exportToWord}>Word</button>
          <button onClick={exportToPDF}>PDF</button>
          <button onClick={printReport}>Print</button>
        </div>
      </div>

      {isLoading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div ref={reportRef}>
        <table className="report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Transfer Code</th>
              <th>SalesFlowRef</th>
              <th>Product</th>
              <th>Boxes</th>
              <th>Amount</th>
              <th>Department</th>
              <th>Location</th>
              <th>Status</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {mappedData.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.date}</td>
                <td>{item.TransferCode}</td>
                <td>{item.SalesFlowRef}</td>
                <td>{item.productName}</td>
                <td>{fmt(item.totalInBoxes)}</td>
                <td>{fmt(item.TransferInAmount)}</td>
                <td>{item.StoreName}</td>
                <td>{item.LocationName}</td>
                <td>{item.PostStatus}</td>
                <td>{item.Type}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="5" style={{ textAlign: "right" }}>Totals:</td>
              <td>{fmt(totals.totalBoxes)}</td>
              <td>{fmt(totals.totalAmount)}</td>
              <td colSpan="4"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <style jsx>{`
        .report-container {
          padding: 20px;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .actions button {
          margin-left: 8px;
          padding: 5px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f3f3f3;
          cursor: pointer;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .report-table th,
        .report-table td {
          border: 1px solid #ddd;
          padding: 6px 8px;
          text-align: center;
        }
        .report-table th {
          background: #eee;
        }
        tfoot {
          font-weight: bold;
          background: #f9f9f9;
        }
      `}</style>
    </div>
  );
};

export default TransferInDataPopup;
