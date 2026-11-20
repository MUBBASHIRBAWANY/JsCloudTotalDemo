import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { toast, ToastContainer } from "react-toastify";
import { getDataFundtion, SndcreateDataFunction, updateDataFunction } from "../../../Api/CRUDFunctions";
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const cleanRemark = (value) => {
  const remark = value == null ? "" : String(value).trim();
  if (!remark) return "";
  return remark.startsWith("Remarks") ? remark.slice(8).trim() : remark;
};

const CustomerAndOrderBookerWiseInvoicePopup = ({ data }) => {

  console.log(data)
  const Products = data.Produts.data
  const Stores = data.Store
  const City = data.Store
  const DistributorList = data.Client
  //console.log("DistributorList", DistributorList)

  const [InvoicesList, setInvoicesList] = useState([]);
  const [ClientLedgers, setClientLedgers] = useState({});
  //console.log(ClientLedgers)
  const [BuiltyDetails, setBuiltyDetails] = useState({});
  const [BeforeInvoiceDetails, setBeforeInvoiceDetails] = useState({});
  const [RemarksDetails, setRemarksDetails] = useState({});
  const [view, setview] = useState(false);
  const [FilteredTransactions, setFilteredTransactions] = useState([]);
  const printRef = useRef();
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === '' || isNaN(Number(amount)) || amount === 0) {
      return '';
    }
    return Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  const getData = async () => {
    const orderBookerId = data.selectedOrderBooker?.value || data.selectedOrderBooker || "";
    const invoiceUrl = data.BookerWise !== "Client"
      ? `/DistrbutorInvoice/ClientWiseInvoice?OrderBooker=${orderBookerId}&startDate=${data.startDate}&endDate=${data.endDate}&wise=${data.BookerWise}`
      : `/DistrbutorInvoice/ClientWiseInvoice?clinet=${data.SelectedClient}&startDate=${data.startDate}&endDate=${data.endDate}&wise=${data.BookerWise}`;
    const ledgerUrl = data.BookerWise !== "Client"
      ? `GernalLager/BookerLedger?OrderBooker=${orderBookerId}&startDate=${data.startDate}&endDate=${data.endDate}`
      : `GernalLager/ClientlLager?startDate=${data.startDate}&endDate=${data.endDate}&Client=${data.SelectedClient}`;

    // Load invoice + ledger together. Remarks come from ClientWiseInvoice itself.
    let [totalInvoice, response] = await Promise.all([
      getDataFundtion(invoiceUrl),
      getDataFundtion(ledgerUrl),
    ]);

    console.log(response, totalInvoice);
    totalInvoice = Array.isArray(totalInvoice) ? totalInvoice : (totalInvoice?.data || []);
    response = Array.isArray(response) ? response : (response?.data || []);

    // Group transactions by Client
    const groupedByClient = {};

    response.forEach((transaction) => {
      const clientId = transaction.Client;

      if (!groupedByClient[clientId]) {
        const clientObj = data.Client.find((item) => item._id === clientId);


        groupedByClient[clientId] = {
          clientId: clientId,
          clientName: `Client : ${clientObj?.DistrbutorName || ""}`,

          transactions: {}
        };
      }

      const voucherKey = transaction.VoucherNumber;

      if (!groupedByClient[clientId].transactions[voucherKey]) {
        groupedByClient[clientId].transactions[voucherKey] = {
          ...transaction,
          Debit: Number(transaction.Debit || 0),
          Credit: Number(transaction.Credit || 0)
        };
      } else {
        groupedByClient[clientId].transactions[voucherKey].Debit += Number(transaction.Debit || 0);
        groupedByClient[clientId].transactions[voucherKey].Credit += Number(transaction.Credit || 0);
      }
    });

    // Calculate balances for each client
    const clientLedgersArray = Object.values(groupedByClient).map(client => {

      const transactions = Object.values(client.transactions);

      // sort by date
      transactions.sort((a, b) => new Date(a.VoucherDate) - new Date(b.VoucherDate));

      const openingTransactions = transactions.filter(
        t => t.Type === "VoucherBefore" || t.Type === "OpeningBalance"
      );

      const regularTransactions = transactions.filter(
        t => t.Type === "Voucher"
      );

      let openingBalance = 0;

      openingTransactions.forEach(t => {
        openingBalance += (t.Debit || 0) - (t.Credit || 0);
      });

      let runningBalance = openingBalance;

      const transformedTransactions = regularTransactions.map(t => {
        const debit = t.Debit || 0;
        const credit = t.Credit || 0;

        runningBalance += debit - credit;

        return {
          date: t.VoucherDate,
          voucherNo: t.VoucherNumber,
          refNo: t.Ref,
          narration: t.Narration,
          debit,
          credit,
          balance: runningBalance,
          formattedDebit: debit ? formatCurrency(debit) : "",
          formattedCredit: credit ? formatCurrency(credit) : "",
          formattedBalance: formatCurrency(runningBalance)
        };
      });

      const totalDebit = transformedTransactions.reduce((s, t) => s + t.debit, 0);
      const totalCredit = transformedTransactions.reduce((s, t) => s + t.credit, 0);

      return {
        ...client,
        transactions: transformedTransactions,
        openingBalance,
        totalDebit,
        totalCredit,
        closingBalance: runningBalance
      };
    });

    const builtyMap = {};
    const remarkById = {};
    totalInvoice.forEach((invoice) => {
      const id = String(invoice._id);
      remarkById[id] = cleanRemark(invoice.Remarks || invoice.Remark || invoice.Narration);
      if (invoice.BiltyNumber) builtyMap[id] = { BiltyNumber: invoice.BiltyNumber };
    });

    setClientLedgers(clientLedgersArray);
    setInvoicesList(totalInvoice);
    setBuiltyDetails(builtyMap);
    setRemarksDetails(remarkById);
    if (clientLedgersArray.length > 0) {
      setFilteredTransactions(clientLedgersArray[0].transactions);
    }
  }

  useEffect(() => {
    // Handle single invoice or multiple invoices

    getData()
    // Multiple invoices view - you can modify this based on your needs
    // For example, get all invoices for a date range or distributor


  }, [data]);


  if (InvoicesList.length === 0) return <div className="p-4">Loading...</div>;

  // 1% advance payment discount is stored on the invoice header (backend field names vary)
  const getOnePercentDiscount = (invoice) => {
    const raw = invoice?.LessAdvanceDis ?? invoice?.AdvanceDis ?? invoice?.Advance;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  // Calculate totals for an invoice
  const calculateInvoiceTotals = (invoiceData) => {
    const TotalAmount = invoiceData.reduce(
      (sum, row) => sum + Number(row.Amount || 0),
      0
    );

    const totalDiscount = invoiceData.reduce(
      (sum, row) => sum + Number(row.discount || 0),
      0
    );

    const totalSpecialTO = invoiceData.reduce(
      (sum, row) => sum + Number(row.SpecialTO || 0),
      0
    );

    const totalSpecialDiscount = invoiceData.reduce(
      (sum, row) => sum + Number(row.specialdiscount || 0),
      0
    );

    const totalNetAmount = TotalAmount - totalDiscount;
    const totalCarton = invoiceData.reduce(
      (sum, row) => sum + Number(row.carton || 0),
      0
    );
    const totalBox = invoiceData.reduce(
      (sum, row) => sum + Number(row.box || 0),
      0
    );

    return {
      TotalAmount,
      totalDiscount,
      totalSpecialTO,
      totalSpecialDiscount,
      totalNetAmount,
      totalCarton,
      totalBox
    };
  };
  const balacne = (Distrbutor , InvoiceDate , Amount) => {
    const client = ClientLedgers.find(
      (item) => item.clientId == Distrbutor
    );
//console.log(client)
    const transaction = client?.transactions?.find(
      (tr) =>
    tr.voucherNo === `DSl${InvoiceDate}`
    );

    const balance = (transaction?.balance - Amount) || 0;
    return balance 
  }

  const exportToExcel = async () => {
    if (!InvoicesList.length) {
      toast.warning('No data to export');
      return;
    }

    const exportRows = [];
    InvoicesList.forEach((invoice) => {
      const distributorObj = DistributorList.find((x) => x._id === invoice.Distrbutor);
      const storeObj = Stores.find((x) => x._id === invoice.Store);
      const totals = calculateInvoiceTotals(invoice.InvoiceData || []);
      const lineItems = invoice.InvoiceData?.length ? invoice.InvoiceData : [{}];

      lineItems.forEach((row) => {
        const product = Products.find((p) => p._id === row.product);
        exportRows.push({
          'Sr No': exportRows.length + 1,
          'Invoice No': invoice.DitributorInvoiceCode || '',
          'Date': invoice.InvoiceDate ? new Date(invoice.InvoiceDate).toLocaleDateString() : '',
          'Distributor': distributorObj?.DistrbutorName || '',
          'Store': storeObj?.StoreName || '',
          'DC Number': invoice.DcNumber || '',
          'Remarks': cleanRemark(RemarksDetails[String(invoice._id)] || invoice.Remarks || invoice.Remark || invoice.Narration),
          'Product': product?.ProductName || '',
          'Carton': Number(row.carton || 0),
          'Box': Number(row.box || 0),
          'Rate': Number(row.Rate || 0),
          'Amount': Number(row.Amount || 0),
          'Discount': Number(row.discount || 0),
          'Scheme': Number(row.SpecialTO || 0),
          'Net': Number(row.Amount || 0) - Number(row.discount || 0),
          '1% Discount': getOnePercentDiscount(invoice),
          'Invoice Total': Number(invoice.TotalAmount || totals.totalNetAmount || 0),
        });
      });
    });

    const clientName = data.BookerWise === 'Client'
      ? (DistributorList.find((c) => c._id === data.SelectedClient)?.DistrbutorName || '')
      : (data.selectedOrderBooker?.label || '');

    try {
      await exportProfessionalExcel({
        title: 'Customer / Order Booker Invoices',
        fileName: 'Customer_OrderBooker_Invoices',
        sheetName: 'Invoices',
        rows: exportRows,
        meta: [
          `Period: ${data.startDate || ''} to ${data.endDate || ''}`,
          data.BookerWise === 'Client'
            ? `Client: ${clientName}`
            : `Order Booker: ${clientName}`,
        ].filter(Boolean),
        excludeKeys: ['_id', 'id'],
      });
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to export Excel');
    }
  };

  // Handle print for multiple invoices
  const handlePrint = () => {
    let printContent = '';

    InvoicesList.forEach((invoice, index) => {
      const distributorObj = DistributorList.find(
        (x) => x._id === invoice.Distrbutor
      );
      const storeObj = Stores.find((x) => x._id === invoice.Store);
      const totals = calculateInvoiceTotals(invoice.InvoiceData);

      printContent += `
        <div class="invoice-page ${index > 0 ? 'page-break' : ''}">
          <div class="header">
            <h1>INVOICE</h1>
          </div>

          <div class="details-grid">
            <div class="details-column">
              <p><strong>Invoice No:</strong> ${invoice.DitributorInvoiceCode}</p>
              <p><strong>Date:</strong> ${new Date(invoice.InvoiceDate).toLocaleDateString()}</p>
              <p><strong>Distributor:</strong> ${distributorObj?.DistrbutorName || ''}</p>
              <p><strong>Store:</strong> ${storeObj?.StoreName || ''}</p>
            </div>
            <div class="details-column">
              <p><strong>DC Number:</strong> ${invoice.DcNumber || ''}</p>
              <p><strong>Bilty Number:</strong> ${BuiltyDetails[String(invoice._id)]?.BiltyNumber || invoice.BiltyNumber || ''}</p>
              <p><strong>City:</strong> ${City?.find((item) => item._id === distributorObj?.City)?.CityName || ''}</p>
              <p><strong>Remarks:</strong> ${cleanRemark(RemarksDetails[String(invoice._id)] || invoice.Remarks || invoice.Remark || invoice.Narration)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Carton</th>
                <th>Box</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Discount</th>
                <th>Scheme</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.InvoiceData.map(row => {
        const product = Products.find(p => p._id === row.product);
        return `
                  <tr>
                    <td>${product?.ProductName || ''}</td>
                    <td class="text-center">${Number(Number(row.carton || 0).toFixed(2))}</td>
                    <td class="text-center">${Number(Number(row.box || 0).toFixed(2))}</td>
                    <td class="text-right">${Number(Number(row.Rate || 0).toFixed(2))}</td>
                    <td class="text-right">${Number(row.Amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="text-right">${Number(row.discount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="text-right">${Number(row.SpecialTO || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="text-right">${((row.Amount || 0) - (row.discount || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `;
      }).join('')}
            </tbody>
            <tfoot class="total-row">
              <tr>
                <td><strong>TOTAL</strong></td>
                <td class="text-center"><strong>${Number(Number(totals.totalCarton || 0).toFixed(2))}</strong></td>
                <td class="text-center"><strong>${Number(Number(totals.totalBox || 0).toFixed(2))}</strong></td>
                <td></td>
                <td class="text-right"><strong>${totals.TotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td class="text-right"><strong>${totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td class="text-right"><strong>${totals.totalSpecialTO.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td class="text-right"><strong>${totals.totalNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
              </tr>
            </tfoot>
          </table>

          <div class="summary-section">
            <div class="summary-box">
              <h3>Invoice Summary</h3>
              <div class="summary-row">
                <span>Total Cartons:</span>
                <span>${Number(Number(totals.totalCarton || 0).toFixed(2))}</span>
              </div>
              <div class="summary-row">
                <span>Total Boxes:</span>
                <span>${Number(Number(totals.totalBox || 0).toFixed(2))}</span>
              </div>
              <div class="summary-row">
                <span>Total Amount:</span>
                <span>${totals.TotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row">
                <span>Total Discount:</span>
                <span>(${totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
              <div class="summary-row">
                <span>Special Discount:</span>
                <span>(${totals.totalSpecialDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
              <div class="summary-row">
                <span>Scheme Amount:</span>
                <span>(${totals.totalSpecialTO.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
              <div class="summary-row">
                <span>Freight Add:</span>
                <span>${Number(invoice.AddAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row">
                <span>Freight Less:</span>
                <span>(${Number(invoice.LessAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
              <div class="summary-row">
                <span>1% Discount:</span>
                <span>(${getOnePercentDiscount(invoice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
              <div class="summary-row bold">
                <span>Net Payable:</span>
                <span>${Number(invoice.TotalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div class="summary-box">
              <h3>Payment Summary</h3>
              <div class="summary-row">
                <span>Previous Balance:</span>
                <span>${Number(Number(balacne(invoice.Distrbutor , invoice.DitributorInvoiceCode ,invoice.TotalAmount) || 0).toFixed(2))}</span>
              </div>
              <div class="summary-row">
                <span>Invoice Amount:</span>
                <span>${Number(invoice.TotalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-row bold">
                <span>Total Payable:</span>
                <span>${Number(Number(Number(invoice.TotalAmount || 0) + balacne(invoice.Distrbutor , invoice.DitributorInvoiceCode , invoice.TotalAmount)).toFixed(2))}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This is a computer generated invoice - Signature not required</p>
          </div>
        </div>
      `;
    });

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
    <html>
      <head>
        <title>Multiple Invoices</title>
        <style>
          @media print {
            @page {
              size: A4 portrait;
              margin: 1.5cm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
            }
            .page-break {
              page-break-before: always;
            }
            .no-break {
              page-break-inside: avoid;
            }
            .footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              font-size: 9px;
              text-align: center;
              color: #555;
              border-top: 1px solid #ccc;
              padding: 8px 0;
            }
          }

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }

          .invoice-page {
            margin-bottom: 30px;
          }

          .header {
            text-align: center;
            margin-bottom: 20px;
          }

          .header h1 {
            font-size: 24px;
            margin: 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
          }

          .details-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 12px;
          }

          .details-column {
            width: 48%;
          }

          .details-column p {
            margin: 4px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
          }

          th {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
            font-weight: bold;
          }

          td {
            border: 1px solid #ddd;
            padding: 6px 8px;
          }

          td:first-child {
            text-align: left;
          }

          .text-center {
            text-align: center;
          }

          .text-right {
            text-align: right;
          }

          .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
          }

          .summary-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
          }

          .summary-box {
            width: 45%;
            border-top: 2px solid #333;
            padding-top: 10px;
          }

          .summary-box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 12px;
          }

          .summary-row.bold {
            font-weight: bold;
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

  // Generate PDF for multiple invoices
  const GeneratePDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;

      for (let i = 0; i < InvoicesList.length; i++) {
        const invoice = InvoicesList[i];

        // Add new page for each invoice except the first one
        if (i > 0) {
          doc.addPage();
        }

        let yOffset = margin;

        // Add header for current invoice
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pageWidth / 2, yOffset, { align: 'center' });
        yOffset += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Draw line
        doc.setDrawColor(0);
        doc.line(margin, yOffset, pageWidth - margin, yOffset);
        yOffset += 8;

        const distributorObj = DistributorList.find(
          (x) => x._id === invoice.Distrbutor
        );
        const storeObj = Stores.find((x) => x._id === invoice.Store);
        const totals = calculateInvoiceTotals(invoice.InvoiceData);

        // Invoice Details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Invoice Details:', margin, yOffset);
        yOffset += 6;

        doc.setFont('helvetica', 'normal');
        const leftDetails = [
          `Invoice No: ${invoice.DitributorInvoiceCode}`,
          `Date: ${new Date(invoice.InvoiceDate).toLocaleDateString()}`,
          `Distributor: ${distributorObj?.DistrbutorName || ''}`,
          `Store: ${storeObj?.StoreName || ''}`
        ];

        const rightDetails = [
          `DC Number: ${invoice.DcNumber || ''}`,
          `Bilty No: ${BuiltyDetails[String(invoice._id)]?.BiltyNumber || invoice.BiltyNumber || ''}`,
          `City: ${City?.find((item) => item._id === distributorObj?.City)?.CityName || ''}`,
          `Remarks: ${cleanRemark(RemarksDetails[String(invoice._id)] || invoice.Remarks || invoice.Remark || invoice.Narration)}`
        ];

        leftDetails.forEach((text, index) => {
          doc.text(text, margin, yOffset + (index * 5));
        });

        rightDetails.forEach((text, index) => {
          doc.text(text, pageWidth / 2 + 10, yOffset + (index * 5));
        });

        yOffset += 30;

        // Prepare table data
        const tableRows = invoice.InvoiceData.map(row => {
          const product = Products.find(p => p._id === row.product);
          return [
            product?.ProductName || '',
            row.carton || '0',
            row.box || '0',
            row.Rate || '0',
            (row.Amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            (row.discount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            (row.SpecialTO || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            ((row.Amount || 0) - (row.discount || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          ];
        });

        // Add totals row
        tableRows.push([
          'TOTAL',
          totals.totalCarton.toString(),
          totals.totalBox.toString(),
          '',
          totals.TotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          totals.totalSpecialTO.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          totals.totalNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ]);

        // Generate table
        doc.autoTable({
          startY: yOffset,
          head: [['Product', 'Carton', 'Box', 'Rate', 'Amount', 'Discount', 'Scheme', 'Net']],
          body: tableRows,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
          },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right', fontStyle: 'bold' }
          },
          didDrawPage: (data) => {
            // Add footer on each page
            const footerY = doc.internal.pageSize.getHeight() - 10;
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(
              `Page ${data.pageNumber} | Invoice: ${invoice.DitributorInvoiceCode}`,
              pageWidth / 2,
              footerY,
              { align: 'center' }
            );
          }
        });

        // Get the final Y position after the table
        const finalY = doc.lastAutoTable.finalY + 10;

        // Add summary sections
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');

        // Left summary
        doc.text('Invoice Summary', margin, finalY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const leftSummary = [
          { label: 'Total Cartons:', value: Number(Number(totals.totalCarton || 0).toFixed(2)) },
          { label: 'Total Boxes:', value: Number(Number(totals.totalBox || 0).toFixed(2)) },
          { label: 'Total Amount:', value: totals.TotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
          { label: 'Total Discount:', value: `(${totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` },
          { label: 'Special Discount:', value: `(${totals.totalSpecialDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` },
          { label: 'Scheme Amount:', value: `(${totals.totalSpecialTO.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` },
          { label: 'Freight Add:', value: Number(invoice.AddAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
          { label: 'Freight Less:', value: `(${Number(invoice.LessAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` },
          { label: '1% Discount:', value: `(${getOnePercentDiscount(invoice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` },
          { label: 'Net Payable:', value: Number(invoice.TotalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bold: true }
        ];

        leftSummary.forEach((item, index) => {
          if (item.bold) {
            doc.setFont('helvetica', 'bold');
          }
          doc.text(item.label, margin, finalY + 6 + (index * 5));
          doc.text(item.value, pageWidth / 2 - 10, finalY + 6 + (index * 5), { align: 'right' });
          doc.setFont('helvetica', 'normal');
        });

        // Right summary
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Summary', pageWidth / 2 + 10, finalY);

        doc.setFont('helvetica', 'normal');
        const rightSummary = [
          { label: 'Previous Balance:', value: (BeforeInvoiceDetails[invoice._id] || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
          { label: 'Invoice Amount:', value: Number(invoice.TotalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
          { label: 'Total Payable:', value: ((invoice.TotalAmount || 0) + (BeforeInvoiceDetails[invoice._id] || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bold: true }
        ];

        rightSummary.forEach((item, index) => {
          if (item.bold) {
            doc.setFont('helvetica', 'bold');
          }
          doc.text(item.label, pageWidth / 2 + 10, finalY + 6 + (index * 5));
          doc.text(item.value, pageWidth - margin, finalY + 6 + (index * 5), { align: 'right' });
          doc.setFont('helvetica', 'normal');
        });
      }

      // Save PDF
      const fileName = InvoicesList.length === 1
        ? `Invoice_${InvoicesList[0].DitributorInvoiceCode}.pdf`
        : `Invoices_${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF. Please try again.');
    }
  };



  return (
    <div className="invoice-container">
      <ReportPopupHeader title="Order Booker Wise Invoice" />

      <style>
        {
          `@media print {
  @page {
    size: A4 portrait;
    margin: 1.5cm;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: 'Arial', sans-serif;
    font-size: 12px;
    line-height: 1.4;
    color: #333;
    background: white;
  }

  .no-print {
    display: none !important;
  }

  .page-break {
    page-break-before: always;
  }

  .page-break-avoid {
    page-break-inside: avoid;
  }

  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    font-size: 9px;
    text-align: center;
    color: #555;
    border-top: 1px solid #ccc;
    padding: 8px 0;
    background: white;
  }
}

/* General Invoice Styles */
.invoice-container {
  font-family: 'Arial', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 20px;
}

.invoice-page {
  margin-bottom: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.invoice-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 20px;
  border-radius: 8px 8px 0 0;
}

.invoice-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.invoice-header p {
  margin: 5px 0 0;
  font-size: 14px;
  opacity: 0.9;
}

.invoice-title {
  text-align: center;
  margin: 30px 0 20px;
  position: relative;
}

.invoice-title h1 {
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
  margin: 0;
  padding-bottom: 15px;
  border-bottom: 3px solid #3498db;
  display: inline-block;
  padding-left: 30px;
  padding-right: 30px;
}

/* Details Grid */
.details-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.details-column {
  width: 48%;
}

.details-column p {
  margin: 8px 0;
  font-size: 13px;
  color: #2c3e50;
}

.details-column p strong {
  color: #34495e;
  min-width: 120px;
  display: inline-block;
  font-weight: 600;
}

/* Table Styles */
.table-container {
  margin: 20px 0;
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.invoice-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: white;
}

.invoice-table th {
  background: #34495e;
  color: white;
  font-weight: 600;
  padding: 12px 8px;
  text-align: center;
  border: 1px solid #2c3e50;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.invoice-table td {
  padding: 10px 8px;
  border: 1px solid #ddd;
  vertical-align: middle;
}

.invoice-table tbody tr:hover {
  background: #f5f6fa;
}

.invoice-table tbody tr:nth-child(even) {
  background: #f9f9f9;
}

.invoice-table tfoot {
  background: #ecf0f1;
  font-weight: bold;
}

.invoice-table tfoot td {
  padding: 12px 8px;
  border: 1px solid #bdc3c7;
  font-weight: 600;
}

.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

/* Summary Section */
.summary-section {
  display: flex;
  justify-content: space-between;
  margin: 30px 0 20px;
  gap: 20px;
}

.summary-box {
  flex: 1;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border-top: 4px solid #3498db;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.summary-box h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  font-size: 13px;
  color: #555;
}

.summary-row.bold {
  font-weight: 700;
  color: #2c3e50;
  font-size: 14px;
  border-top: 2px solid #e0e0e0;
  padding-top: 10px;
  margin-top: 10px;
}

.summary-row .label {
  color: #7f8c8d;
}

.summary-row .value {
  font-weight: 600;
  color: #2c3e50;
}

.summary-row .value.positive {
  color: #27ae60;
}

.summary-row .value.negative {
  color: #e74c3c;
}

/* Footer */
.invoice-footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 2px dashed #ccc;
  text-align: center;
  font-size: 11px;
  color: #7f8c8d;
}

.invoice-footer p {
  margin: 5px 0;
}

/* Button Styles */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn i {
  font-size: 16px;
}

.btn-print {
  background: #3498db;
  color: white;
}

.btn-print:hover {
  background: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.btn-excel {
  background: #217346;
  color: white;
}

.btn-excel:hover {
  background: #1a5c38;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(33, 115, 70, 0.3);
}

.btn-pdf {
  background: #27ae60;
  color: white;
}

.btn-pdf:hover {
  background: #229954;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3);
}

.btn-back {
  background: #95a5a6;
  color: white;
}

.btn-back:hover {
  background: #7f8c8d;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(149, 165, 166, 0.3);
}

/* Loading State */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 15px;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Invoice Card Styles (for screen view) */
.invoice-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  margin-bottom: 30px;
  overflow: hidden;
}

.invoice-card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 20px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.invoice-card-header:hover {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

.invoice-card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.invoice-card-header .badge {
  background: rgba(255,255,255,0.2);
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
}

.invoice-card-body {
  padding: 20px;
}

/* Stats Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  border-left: 3px solid #3498db;
}

.stat-card .stat-label {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-card .stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
  margin-top: 5px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .details-grid {
    flex-direction: column;
    gap: 15px;
  }

  .details-column {
    width: 100%;
  }

  .summary-section {
    flex-direction: column;
  }

  .summary-box {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .invoice-table {
    font-size: 11px;
  }

  .invoice-table th,
  .invoice-table td {
    padding: 8px 4px;
  }
}

/* Print-specific optimizations */
@media print {
  .invoice-card {
    box-shadow: none;
    margin-bottom: 0;
    page-break-inside: avoid;
  }

  .invoice-card-header {
    background: #f0f0f0 !important;
    color: black !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .btn {
    display: none;
  }

  .invoice-table th {
    background: #e0e0e0 !important;
    color: black !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .stats-grid {
    display: none;
  }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Animation Classes */
.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
          `
        }
      </style>
      <ToastContainer />

      <div className="action-buttons no-print">
        <h1 className="text-2xl font-bold">
          {InvoicesList.length === 1 ? 'Distributor Invoice' : `Invoices (${InvoicesList.length})`}
        </h1>

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="btn btn-print"
          >
            <i className="fas fa-print"></i>
            Print {InvoicesList.length > 1 ? 'All Invoices' : 'Invoice'}
          </button>
          <button
            onClick={GeneratePDF}
            className="btn btn-pdf"
          >
            <i className="fas fa-file-pdf"></i>
            Download {InvoicesList.length > 1 ? 'All PDFs' : 'PDF'}
          </button>
          <button
            onClick={exportToExcel}
            className="btn btn-excel"
          >
            Download Excel
          </button>
        </div>

      </div>

      {/* Multiple Invoices Display */}
      {InvoicesList.map((invoice, index) => {
        const distributorObj = DistributorList.find(
          (x) => x._id === invoice.Distrbutor
        );
        const storeObj = Stores.find((x) => x._id === invoice.Store);
        const totals = calculateInvoiceTotals(invoice.InvoiceData);

        return (
          <div key={invoice._id} className="invoice-card fade-in">
            <div className="invoice-card-header">
              <h2>
                Invoice #{invoice.DitributorInvoiceCode} - {new Date(invoice.InvoiceDate).toLocaleDateString()}
              </h2>
              <span className="badge">
                Total: {Number(invoice.TotalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="invoice-card-body">
              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Cartons</div>
                  <div className="stat-value">{totals.totalCarton}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Boxes</div>
                  <div className="stat-value">{Number(Number(totals.totalBox || 0).toFixed(2))}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Net Amount</div>
                  <div className="stat-value">{totals.totalNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Net Payable</div>
                  <div className="stat-value">{Number(invoice.TotalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>

              {/* DETAILS */}
              <div className="details-grid">
                <div className="details-column">
                  <p><strong>Invoice No:</strong> {invoice.DitributorInvoiceCode}</p>
                  <p><strong>Date:</strong> {new Date(invoice.InvoiceDate).toLocaleDateString()}</p>
                  <p><strong>Distributor:</strong> {distributorObj?.DistrbutorName}</p>
                  <p><strong>Store:</strong> {storeObj?.StoreName}</p>
                </div>
                <div className="details-column">
                  <p><strong>DC Number:</strong> {invoice.DcNumber}</p>
                  <p><strong>Bilty Number:</strong> {BuiltyDetails[String(invoice._id)]?.BiltyNumber || invoice.BiltyNumber}</p>
                  <p><strong>Remarks:</strong> {cleanRemark(RemarksDetails[String(invoice._id)] || invoice.Remarks || invoice.Remark || invoice.Narration)}</p>
                </div>
              </div>

              {/* TABLE */}
              <div className="table-container">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Carton</th>
                      <th>Box</th>
                      <th>Rate</th>
                      <th>Amount</th>
                      <th>Discount</th>
                      <th>Scheme</th>
                      <th>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.InvoiceData.map((row, rowIndex) => {
                      const product = Products.find((p) => p._id === row.product);
                      return (
                        <tr key={row._id || rowIndex}>
                          <td className="text-left">{product?.ProductName || ''}</td>
                          <td className="text-center">{Number(Number(row.carton || 0).toFixed(2))}</td>
                          <td className="text-center">{row.box}</td>
                          <td className="text-right">{row.Rate}</td>
                          <td className="text-right">{row.Amount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-right">{row.discount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-right">{row.SpecialTO?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-right font-semibold">
                            {((row.Amount || 0) - (row.discount || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>TOTAL</strong></td>
                      <td className="text-center"><strong>{totals.totalCarton}</strong></td>
                      <td className="text-center"><strong>{Number(Number(totals.totalBox || 0).toFixed(2))}</strong></td>
                      <td></td>
                      <td className="text-right"><strong>{totals.TotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                      <td className="text-right"><strong>{totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                      <td className="text-right"><strong>{totals.totalSpecialTO.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                      <td className="text-right"><strong>{totals.totalNetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* SUMMARY CARDS */}
              <div className="summary-section">
                <div className="summary-box">
                  <h3>Invoice Summary</h3>
                  <div className="summary-row">
                    <span className="label">Total Cartons:</span>
                    <span className="value">{totals.totalCarton}</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Total Boxes:</span>
                    <span className="value">{Number(Number(totals.totalBox || 0).toFixed(2))}</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Total Amount:</span>
                    <span className="value positive">{totals.TotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Total Discount:</span>
                    <span className="value negative">({totals.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Special Discount:</span>
                    <span className="value negative">({totals.totalSpecialDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Scheme Amount:</span>
                    <span className="value negative">({totals.totalSpecialTO.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Freight Add:</span>
                    <span className="value positive">{Number(invoice.AddAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Freight Less:</span>
                    <span className="value negative">({Number(invoice.LessAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">1% Discount:</span>
                    <span className="value negative">({getOnePercentDiscount(invoice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </div>
                  <div className="summary-row bold">
                    <span className="label">Net Payable:</span>
                    <span className="value">{Number(invoice.TotalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="summary-box">
                  <h3>Payment Summary</h3>
                  <div className="summary-row">
                    <span className="label">Previous Balance:</span>
                    <span className="value">{balacne(invoice.Distrbutor, invoice.DitributorInvoiceCode, invoice.TotalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="summary-row">
                    <span className="label">Invoice Amount:</span>
                    <span className="value positive">{Number(invoice.TotalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="summary-row bold">
                    <span className="label">Total Payable:</span>
                    <span className="value">{(Number(invoice.TotalAmount || 0) + balacne(invoice.Distrbutor, invoice.DitributorInvoiceCode, invoice.TotalAmount)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}


    </div>
  );
};

export default CustomerAndOrderBookerWiseInvoicePopup;
