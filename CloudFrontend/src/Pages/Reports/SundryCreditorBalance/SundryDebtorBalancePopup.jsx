import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';


const SundryCreditorBalancePopup = ({ filterData = [] }) => {

  const [isLoading, setIsLoading] = useState(false);
  const { startDate, endDate } = filterData;

  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState([]);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const reportRef = useRef(null);
  const [zsmData, setZsmData] = useState([]);
  const [zoneData, setZoneData] = useState([]);
  const [regionData, setRegionData] = useState([]);

  const getData = async () => {
    setIsLoading(true);
    try {
      const gettingdata = await getDataFundtion(`GernalLager/DebtorBalance/?startDate=${startDate}&endDate=${endDate}`);

      const zsmRes = await getDataFundtion("/Zsm");
      setZsmData(zsmRes.data || []);

      const zoneRes = await getDataFundtion("/Zone");
      setZoneData(zoneRes.data || []);

      const regionRes = await getDataFundtion("/Region");
      setRegionData(regionRes.data || []);

      //console.log(gettingdata.length)
      const processedData = gettingdata.map((item) => ({
        ...item,
        Client: item?.Client,
        Debit: Number(item?.Debit) || 0,
        Credit: Number(item?.Credit) || 0,
      }));

      setData(processedData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const lookupMaps = useMemo(() => {
    const obToZsmMap = new Map();
    (filterData.OrderBookerRaw || []).forEach(ob => {
      if (ob._id && ob.ZSM) obToZsmMap.set(ob._id, ob.ZSM);
    });

    const zsmMap = new Map();
    zsmData.forEach(z => {
      if (z._id) zsmMap.set(z._id, z);
    });

    const zoneMap = new Map();
    zoneData.forEach(z => {
      if (z._id) zoneMap.set(z._id, z);
    });

    const regionMap = new Map();
    regionData.forEach(r => {
      if (r._id) regionMap.set(r._id, r);
    });

    return { obToZsmMap, zsmMap, zoneMap, regionMap };
  }, [filterData.OrderBookerRaw, zsmData, zoneData, regionData]);

  useEffect(() => {
    if (data && data.length > 0) {

      const clientGroups = data.reduce((acc, item) => {
        const clientId = item.Client;

        if (!acc[clientId]) {
          acc[clientId] = {
            clientId,
            totalDebit: 0,
            totalCredit: 0,
            netBalance: 0,
            voucherCount: 0,
            Opening: 0,
            OpeningDebit: 0,
            OpeningCredit: 0,

          };
        }

        // Safe number conversion
        const debit = Number((item.Debit || "0").toString().replace(/,/g, ""));
        const credit = Number((item.Credit || "0").toString().replace(/,/g, ""));

        if (item.Type === "VoucherBefore") {
          acc[clientId].OpeningDebit += debit;
          acc[clientId].OpeningCredit += credit;
        } else {
          acc[clientId].totalDebit += debit;
          acc[clientId].totalCredit += credit;
          // backend may send pre-aggregated rows with voucherCount (live 504 fix)
          acc[clientId].voucherCount += Number(item.voucherCount) || 1;
        }

        // Net Balance Calculation
        acc[clientId].netBalance =
          acc[clientId].Opening +
          acc[clientId].OpeningDebit +
          acc[clientId].totalDebit -
          acc[clientId].totalCredit -
          acc[clientId].OpeningCredit
          ;

        return acc;
      }, {});

      const clients = filterData.Customer?.map((item) => item.value) || [];

      const processedRows = Object.values(clientGroups)
        .filter(item => clients.includes(item.clientId))
        .map(client => {

          const clientInfo =
            filterData.Customer?.find((val) => val.value === client.clientId) || {};

          const orderBookerId = clientInfo.OrderBooker;
          const orderBookerLabel = filterData.OrderBooker?.find((ob) => ob.value === orderBookerId)?.label || "";

          const zsmId = orderBookerId ? lookupMaps.obToZsmMap.get(orderBookerId) : null;
          const zsmObj = zsmId ? lookupMaps.zsmMap.get(zsmId) : null;
          const zoneId = zsmObj?.Zone;
          const zoneObj = zoneId ? lookupMaps.zoneMap.get(zoneId) : null;
          const regionId = zoneObj?.Region;
          const regionObj = regionId ? lookupMaps.regionMap.get(regionId) : null;

          const Zone = zoneObj?.ZoneName || "";
          const Region = regionObj?.RegionName || "";
          const OrderBooker = orderBookerLabel;
          const ZSM = zsmObj?.ZsmName || "-";

          const City =
            filterData.City?.find((city) => city.value === clientInfo.city)?.label || "";

          const Group =
            filterData.Group?.find((group) => group.value === clientInfo.Group)?.label || "";

          const oldCode = clientInfo?.oldCode || clientInfo?.OldCode || "";
          const code = clientInfo?.code || "";
          const distributorCode = clientInfo?.distributorCode || clientInfo?.DistrbutorSystemCode || "";
          const rawLabel = clientInfo?.label || "";
          const accountName = clientInfo?.name
            || (oldCode && rawLabel.startsWith(String(oldCode))
              ? rawLabel.slice(String(oldCode).length).trim()
              : rawLabel.trim());

          return {
            accountName,
            oldCode,
            code,
            distributorCode,
            Zone,
            Region,
            ZSM,
            OrderBooker,
            Group,
            City,
            accountCode: client.clientId,
            orderbooker: "",
            OpeningDebit: client.OpeningDebit,
            OpeningCredit: client.OpeningCredit,
            opening: (client.Opening + client.OpeningDebit) - client.OpeningCredit,
            totalDebit: client.totalDebit,
            totalCredit: client.totalCredit,
            netBalance: client.netBalance,
            voucherCount: client.voucherCount
          };
        }).filter(row =>
          (!filterData.SelectedOrderBooker || filterData.SelectedOrderBooker.some(ob => ob.label === row.OrderBooker)) && 
          (!filterData.SelectedZone || filterData.SelectedZone.some(z => z.label === row.Zone)) &&
          (!filterData.SelectedRegion || filterData.SelectedRegion.some(r => r.label === row.Region)) &&
          (!filterData.SelectedCity || filterData.SelectedCity.some(c => c.label === row.City)) &&
          (!filterData.SelectedGroup || filterData.SelectedGroup.some(g => g.label === row.Group)) &&
          (!filterData.SelectedCustomer || filterData.SelectedCustomer.some(c => c.value === row.accountCode)) 

        );
      setRows(processedRows);
    }
  }, [data, filterData]);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;

    if (filter) {
      filtered = rows.filter(row =>
        Object.values(row).some(value =>
          value && value.toString().toLowerCase().includes(filter.toLowerCase())
        )
      );
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [rows, filter, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const grandTotals = useMemo(() => {
    return {
      totalOpening: rows.reduce((sum, account) => sum + (account.opening || 0), 0),
      totalDebit: rows.reduce((sum, account) => sum + account.totalDebit, 0),
      totalCredit: rows.reduce((sum, account) => sum + account.totalCredit, 0),
      netBalance: rows.reduce((sum, account) => sum + account.netBalance, 0),
      totalVouchers: rows.reduce((sum, account) => sum + (account.voucherCount || 0), 0)
    };
  }, [rows]);

  // Export functions with ALL columns
  const exportToExcel = async () => {
    const exportRows = filteredAndSortedRows.map(row => ({
      accountName: row.accountName || "",
      oldCode: row.oldCode || "",
      code: row.code || "",
      distributorCode: row.distributorCode || "",
      Zone: row.Zone || "",
      Region: row.Region || "",
      ZSM: row.ZSM || "",
      OrderBooker: row.OrderBooker || "",
      Group: row.Group || "",
      City: row.City || "",
      opening: Number(Number(row.opening || 0).toFixed(2)),
      totalDebit: Number(Number(row.totalDebit || 0).toFixed(2)),
      totalCredit: Number(Number(row.totalCredit || 0).toFixed(2)),
      netBalance: Number(Number(row.netBalance || 0).toFixed(2)),
    }));
    await exportProfessionalExcel({
      title: 'Debtor Summary',
      fileName: 'Debtor_Summary',
      sheetName: 'Debtor Summary',
      rows: exportRows,
      columns: [
        { header: "Client Name", key: "accountName" },
        { header: "Old Code", key: "oldCode", type: "text" },
        { header: "Code", key: "code", type: "text" },
        { header: "Distributor Code", key: "distributorCode", type: "text" },
        { header: "Zone", key: "Zone" },
        { header: "Region", key: "Region" },
        { header: "ZSM", key: "ZSM" },
        { header: "Order Booker", key: "OrderBooker" },
        { header: "Group", key: "Group" },
        { header: "City", key: "City" },
        { header: "Opening", key: "opening", type: "number" },
        { header: "Total Debit", key: "totalDebit", type: "number" },
        { header: "Total Credit", key: "totalCredit", type: "number" },
        { header: "Net Balance", key: "netBalance", type: "number" },
      ],
      meta: [
        startDate && endDate ? `Period: ${startDate} to ${endDate}` : '',
      ].filter(Boolean),
      excludeKeys: ['_id', 'id'],
    });
  };

  const exportToWord = async () => {
    const tableRows = filteredAndSortedRows.map(row =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: row.accountName || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.oldCode || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.code || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.distributorCode || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.Zone || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.Region || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.ZSM || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.Group || '' })] }),
          new TableCell({ children: [new Paragraph({ text: row.City || '' })] }),
          new TableCell({ children: [new Paragraph({ text: (row.opening || 0)?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })] }),
          new TableCell({ children: [new Paragraph({ text: row.totalDebit?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0' })] }),
          new TableCell({ children: [new Paragraph({ text: row.totalCredit?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0' })] }),
          new TableCell({ children: [new Paragraph({ text: row.netBalance?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0' })] })
        ],
      })
    );

    const headers = ['Client Name', 'Old Code', 'Code', 'Distributor Code', 'Zone', 'Region', 'ZSM', 'Group', 'City', 'OPENING', 'Total Debit', 'Total Credit', 'Net Balance'];
    const table = new Table({
      rows: [
        new TableRow({
          children: headers.map(header =>
            new TableCell({
              children: [new Paragraph({ text: header, bold: true })],
            })
          ),
        }),
        ...tableRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: "Pearl Dyanamic", heading: "Heading1" }),
          new Paragraph({ text: "Debtor Balance Summary" }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}` }),
          new Paragraph({ text: `Period: ${startDate} to ${endDate}` }),
          new Paragraph({ text: "" }),
          table,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Debtor_Balance_Summary.docx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    /* Header */
    doc.setFontSize(20);
    doc.text("Debtor Balance Summary", 14, 15);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 29);

    /* Table Data - ALL 10 COLUMNS */
    const tableColumn = [
      "Client Name",
      "Old Code",
      "Code",
      "Distributor Code",
      "Zone",
      "Region",
      "ZSM",
      "Group",
      "City",
      "OPENING",
      "Total Debit",
      "Total Credit",
      "Net Balance"
    ];

    const tableRows = filteredAndSortedRows.map((row) => [
      row.accountName || "",
      row.oldCode || "",
      row.code || "",
      row.distributorCode || "",
      row.Zone || "",
      row.Region || "",
      row.ZSM || "",
      row.Group || "",
      row.City || "",
      (row.opening || 0)?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0",
      row.totalDebit?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0",
      row.totalCredit?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0",
      row.netBalance?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0"
    ]);

    // Compute totals
    const totals = tableRows.reduce(
      (acc, row) => {
        acc.opening += Number(String(row[9]).replace(/,/g, "")) || 0;
        acc.debit += Number(String(row[10]).replace(/,/g, "")) || 0;
        acc.credit += Number(String(row[11]).replace(/,/g, "")) || 0;
        acc.netBalance += Number(String(row[12] || "").replace(/,/g, "")) || 0;
        return acc;
      },
      { opening: 0, debit: 0, credit: 0, netBalance: 0 }
    );

    // Add total row
    const totalRow = [
      "Total", "", "", "", "", "", "", "", "",
      grandTotals.totalOpening.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      grandTotals.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      grandTotals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0,
      grandTotals.netBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ];
    tableRows.push(totalRow);

    // Render table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === tableRows.length - 1) {
          data.cell.styles.fillColor = [255, 255, 204];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [0, 0, 0];
          if (data.column.index >= 9) {
            data.cell.styles.halign = 'right';
          }
        }
      }
    });

    /* Footer */
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(
      "Developed by JS International",
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: "center" }
    );

    /* Save */
    doc.save("Debtor_Balance_Summary.pdf");
  };

  const handlePrint = () => {
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
      <html>
        <head>
          <title>Debtor Balance Summary</title>
          <style>
            body {
              font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
              background: #fff;
              color: #333;
              padding: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th {
              background: #f8f9fa;
              padding: 8px 6px;
              text-align: left;
              font-weight: 600;
              color: #2c3e50;
              border-bottom: 2px solid #e0e0e0;
              font-size: 11px;
            }
            td {
              padding: 6px 4px;
              border-bottom: 1px solid #eaeaea;
              font-size: 11px;
            }
            .numeric {
              text-align: right;
            }
            .footer-total {
              font-weight: 700;
              background: #f8f9fa;
            }
            .positive-balance {
              color: #27ae60;
            }
            .negative-balance {
              color: #e74c3c;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="general-ledger-container" ref={reportRef}>
      <ReportPopupHeader title="Sundry Debtor Balance" />

      <div className="watermark">
        <div className="watermark-content">
          <img src="https://res.cloudinary.com/dmi26itgk/image/upload/v1755943603/Adobe_Express_-_file-Photoroom_dayaxd.png" alt="" />
        </div>
      </div>

      <div className="report-header">
        <div className="company-info">
          <h2 className="company-name">Pearl Dyanamic</h2>
          <p className="company-address">123 Business Avenue, Suite 456</p>
          <p className="company-contact"></p>
        </div>
        <div className="report-info">
          <h1 className="report-title">Debtor Balance Summary</h1>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
          <p className="report-range">Period: {startDate} to {endDate}</p>
        </div>
      </div>

      <div className="report-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search clients..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="summary-stats">
          <span className="stat-item">
            Total Clients: <strong>{rows.length}</strong>
          </span>
          <span className="stat-item">
            Total Debit: <strong>{grandTotals.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>
          <span className="stat-item">
            Total Credit: <strong>{grandTotals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>
          <span className="stat-item">
            Net Balance: <strong className={grandTotals.netBalance >= 0 ? 'positive-balance' : 'negative-balance'}>
              {grandTotals.netBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </span>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('accountName')}>
                  Client Name {sortConfig.key === 'accountName' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('oldCode')}>
                  Old Code {sortConfig.key === 'oldCode' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('code')}>
                  Code {sortConfig.key === 'code' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('distributorCode')}>
                  Distributor Code {sortConfig.key === 'distributorCode' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('Zone')}>
                  Zone {sortConfig.key === 'Zone' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('Region')}>
                  Region {sortConfig.key === 'Region' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('ZSM')}>
                  ZSM {sortConfig.key === 'ZSM' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('OrderBooker')}>
                  OrderBooker {sortConfig.key === 'OrderBooker' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('Group')}>
                  Group {sortConfig.key === 'Group' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('City')}>
                  City {sortConfig.key === 'City' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('opening')}>
                  OPENING {sortConfig.key === 'opening' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('totalDebit')}>
                  Total Debit {sortConfig.key === 'totalDebit' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('totalCredit')}>
                  Total Credit {sortConfig.key === 'totalCredit' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('netBalance')}>
                  Net Balance {sortConfig.key === 'netBalance' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <strong>{row.accountName}</strong>
                    </td>
                    <td>
                      <strong>{row.oldCode}</strong>
                    </td>
                    <td>
                      <strong>{row.code}</strong>
                    </td>
                    <td>
                      <strong>{row.distributorCode}</strong>
                    </td>
                    <td>
                      <strong>{row.Zone}</strong>
                    </td>
                    <td>
                      <strong>{row.Region}</strong>
                    </td>
                    <td>
                      <strong>{row.ZSM}</strong>
                    </td>
                    <td>
                      <strong>{row.OrderBooker}</strong>
                    </td>
                    <td>
                      <strong>{row.Group}</strong>
                    </td>
                    <td>
                      <strong>{row.City}</strong>
                    </td>
                    <td className="numeric">{row.opening?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0"}</td>
                    <td className="numeric">{row.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="numeric">{row.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`numeric ${row.netBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}>
                      <strong>{row.netBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="14" className="no-data">
                    No creditor data found
                  </td>
                </tr>
              )}
              <tr className="grand-total-row">
                <td colSpan="10" className="footer-total">
                  <strong>Grand Total</strong>
                </td>
                <td className="numeric footer-total">
                  <strong>{grandTotals.totalOpening.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </td>
                <td className="numeric footer-total">
                  <strong>{grandTotals.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </td>
                <td className="numeric footer-total">
                  <strong>{grandTotals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </td>
                <td className={`numeric footer-total ${grandTotals.netBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}>
                  <strong>{grandTotals.netBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="report-actions">
        <button className="btn btn-word" onClick={exportToWord}>
          Download Word
        </button>
        <button className="btn btn-excel" onClick={exportToExcel}>
          Download Excel
        </button>
        <button className="btn btn-pdf" onClick={exportToPDF}>
          Download PDF
        </button>
        <button className="btn btn-print" onClick={handlePrint}>
          Print Report
        </button>
      </div>

      <style jsx>{`
        .general-ledger-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 1200px;
          color: #333;
          position: relative;
          overflow-x: auto;
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
          opacity: 0.05;
        }
        
        .grand-total-row {
          background: #34495e !important;
          color: white;
        }
        
        .grand-total-row td {
          background: #34495e !important;
          color: white;
          border-top: 2px solid #2c3e50;
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eaeaea;
          position: relative;
          z-index: 2;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 8px 0;
        }
        
        .report-title {
          font-size: 20px;
          font-weight: 600;
          color: #3498db;
          margin: 0 0 8px 0;
        }
        
        .report-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
          position: relative;
          z-index: 2;
        }
        
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          min-width: 250px;
        }
        
        .summary-stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .stat-item {
          font-size: 12px;
          color: #555;
        }
        
        .table-container {
          overflow-x: auto;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }
        
        .ledger-table {
          min-width: 1200px;
          border-collapse: collapse;
          font-size: 12px;
          width: 100%;
        }
        
        .ledger-table th {
          background: #f8f9fa;
          padding: 10px 6px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
          font-size: 11px;
        }
        
        .ledger-table td {
          padding: 8px 6px;
          border-bottom: 1px solid #eaeaea;
          font-size: 11px;
        }
        
        .numeric {
          text-align: right;
        }
        
        .no-data {
          text-align: center;
          padding: 30px;
          color: #95a5a6;
          font-style: italic;
        }
        
        .footer-total {
          font-weight: 700;
        }
        
        .positive-balance {
          
        }
        
        .negative-balance {
          color: #e74c3c;
        }
        
        .report-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          position: relative;
          z-index: 2;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-word { background: #2b579a; color: white; }
        .btn-excel { background: #217346; color: white; }
        .btn-pdf { background: #f40f02; color: white; }
        .btn-print { background: #555; color: white; }
        
        .btn:hover {
          opacity: 0.9;
        }
        
        .loader-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }
        
        .spinner {
          width: 48px;
          height: 48px;
          border: 6px solid #ccc;
          border-top: 6px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SundryCreditorBalancePopup;