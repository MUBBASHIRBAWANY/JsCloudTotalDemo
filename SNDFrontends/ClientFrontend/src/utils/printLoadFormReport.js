const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
};

export function printLoadFormReport({
  loadFormNumber,
  orderBooker,
  distributorName,
  orderDate,
  status,
  deliveryDate,
  productRows = [],
  productTotals = {},
  clientRows = [],
  clientTotals = {},
  invoiceTotals = {},
  invoices = [],
}) {
  const creditTotal = (Number(invoiceTotals.totalBill) || 0) - ((Number(invoiceTotals.totalCash) || 0) + (Number(invoiceTotals.totalChq) || 0));
  const unsettledTotal = creditTotal + (Number(invoiceTotals.totalCash) || 0) + (Number(invoiceTotals.totalChq) || 0) - (Number(invoiceTotals.totalBill) || 0);

  const productHtml = productRows.map((row) => `
    <tr>
      <td>${row.productCode || ''}</td>
      <td>${row.productName || ''}</td>
      <td class="num">${row.ctn}</td>
      <td class="num">${row.box}</td>
      <td class="num">${row.totalIssued}</td>
      <td class="num">${row.rtgCtn}</td>
      <td class="num">${row.rtgBox}</td>
      <td class="num">${row.totalReturned}</td>
      <td class="num">${row.saleBox}</td>
    </tr>
  `).join('');

  const clientHtml = clientRows.map((c) => `
    <tr>
      <td>${c.code || ''}</td>
      <td>${c.name}</td>
      <td class="center">${c.invoiceCount}</td>
      <td class="num">${c.totalDeliveredBox}</td>
      <td class="num">${c.RTGBox}</td>
      <td class="num">${c.totalGross.toFixed(2)}</td>
      <td class="num">${Number(c.SpecialTO || 0).toFixed(2)}</td>
      <td class="num">${Number(c.SlabDiscount || 0).toFixed(2)}</td>
      <td class="num">${c.RTGValue}</td>
      <td class="num">${(c.totalNet - Number(c.SlabDiscount || 0)).toFixed(2)}</td>
    </tr>
  `).join('');

  const invoiceHtml = invoices.map((item) => `
      <tr>
        <td class="center">${item.DisSalesInvoice}</td>
        <td class="num">${item.SalesInvoiceDate}</td>
        <td class="num">${Number(item.Totalamount || 0).toFixed(2)}</td>
        <td class="num">${Number(item.Chq || 0).toFixed(2)}</td>
        <td class="num">${item.ChqDate || ''}</td>
        <td class="num">${item.ChqNumber || ''}</td>
        <td class="num">${Number(item.cashAmount || 0).toFixed(2)}</td>
        <td class="num">${Number((item.Totalamount || 0) - Number(item.cashAmount || 0) - Number(item.Chq || 0)).toFixed(2)}</td>
      </tr>
    `).join('');

  const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Load Form ${loadFormNumber}</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 8mm; }
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              thead { display: table-header-group; }
              tfoot { display: table-row-group; }
              tr { page-break-inside: avoid; }
              table { page-break-inside: auto; margin: 0; padding: 0; }
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #1f2937;
              font-size: 11px;
              padding: 4px;
            }
            .load-form-section { margin-bottom: 5px; }
            .lf-header {
              border-bottom: 2px solid #1e40af;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .lf-header h1 {
              margin: 0 0 8px;
              font-size: 20px;
              color: #1e3a8a;
              text-align: center;
            }
            .header-top {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              align-items: center;
              width: 100%;
              font-size: 12px;
              margin-bottom: 6px;
            }
            .header-left { text-align: left; }
            .header-center { text-align: center; font-weight: bold; font-size: 13px; }
            .header-right { text-align: right; }
            .lf-section-title {
              font-size: 12px;
              font-weight: bold;
              background: #1e40af;
              color: #fff;
              padding: 5px 10px;
              margin: 12px 0 6px;
            }
            .load-form-section table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
              margin-bottom: 12px;
              table-layout: fixed;
            }
            .load-form-section th,
            .load-form-section td {
              padding: 4px 5px;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .load-form-section th {
              border: 1px solid #9ca3af;
              background: #e5e7eb;
              font-weight: 600;
              text-align: left;
            }
            td.num, th.num { text-align: right; }
            td.center, th.center { text-align: center; }
            .load-form-section tfoot {
              display: table-row-group;
            }
            .load-form-section tfoot td {
              border: 1px solid #9ca3af;
              font-weight: bold;
              background: #f3f4f6;
            }
            .summary-grid {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
              margin-bottom: 12px;
            }
            .summary-grid td {
              border: 1px solid #9ca3af;
              padding: 4px 5px;
            }
            .summary-grid td.label {
              font-weight: bold;
              background: #f3f4f6;
            }
            .summary-grid td.blank-cell {
              border: none;
              border-bottom: 2px solid #000;
              height: 18px;
            }
          </style>
        </head>
        <body>
          <div class="load-form-section">
          <div class="lf-header">
            <h1>LOAD FORM REPORT</h1>
            <div class="header-top">
              <div class="header-left"><strong>Order Booker:</strong> ${orderBooker || 'N/A'}</div>
              <div class="header-center"><strong>Distributor:</strong> ${distributorName || 'N/A'}</div>
              <div class="header-right"><strong>Order Date:</strong> ${formatDate(orderDate)}</div>
            </div>
            <div class="header-top">
              <div class="header-left"><strong>PJP Day:</strong> Unplaned</div>
              <div class="header-center">Load Form # ${loadFormNumber} ${status || ''}</div>
              <div class="header-right"><strong>Delivery Date:</strong> ${formatDate(deliveryDate)}</div>
            </div>
          </div>

          <div class="lf-section-title">PRODUCT SUMMARY</div>
          <table>
            <thead>
              <tr>
                <th>ProductCode</th>
                <th>Product</th>
                <th class="num">CTN</th>
                <th class="num">BOX</th>
                <th class="num">Total Issued</th>
                <th class="num">RTG CTN</th>
                <th class="num">RTG Box</th>
                <th class="num">Total Returned</th>
                <th class="num">Sale Box</th>
              </tr>
            </thead>
            <tbody>
              ${productHtml || '<tr><td colspan="9" class="center">No items</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                <td>TOTAL</td>
                <td class="num">${productTotals.ctn || 0}</td>
                <td class="num">${productTotals.box || 0}</td>
                <td class="num">${productTotals.totalIssued || 0}</td>
                <td class="num">${productTotals.rtgCtn || 0}</td>
                <td class="num">${productTotals.rtgBox || 0}</td>
                <td class="num">${productTotals.totalReturned || 0}</td>
                <td class="num">${productTotals.saleBox || 0}</td>
              </tr>
            </tfoot>
          </table>

          <div class="lf-section-title">CLIENT SUMMARY</div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Client</th>
                <th class="center">Invoices</th>
                <th class="num">Delivered Box</th>
                <th class="num">RTG Box</th>
                <th class="num">Gross Amount</th>
                <th class="num">To</th>
                <th class="num">Slab Discount</th>
                <th class="num">RTG Value</th>
                <th class="num">Net Sale</th>
              </tr>
            </thead>
            <tbody>
              ${clientHtml || '<tr><td colspan="11" class="center">No client data</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                <td>TOTAL</td>
                <td class="center">${clientTotals.invoices || 0}</td>
                <td class="num">${clientTotals.delivered || 0}</td>
                <td class="num">${clientTotals.rtg || 0}</td>
                <td class="num">${Number(clientTotals.gross || 0).toFixed(2)}</td>
                <td class="num">${Number(clientTotals.Scheme || 0).toFixed(2)}</td>
                <td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td>
                <td class="num">${clientTotals.rtgValue || 0}</td>
                <td class="num">${Number(invoiceTotals.totalBill || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="lf-section-title">INVOICE WISE SUMMARY</div>
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th class="num">Invoice Date</th>
                <th class="num">Bill Amount</th>
                <th class="num">Chq Amount</th>
                <th class="num">Chq Date</th>
                <th class="num">Chq Number</th>
                <th class="num">Cash</th>
                <th class="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceHtml || '<tr><td colspan="8" class="center">No invoice data</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                <td>TOTAL</td>
                <td class="num">${Number(invoiceTotals.totalBill || 0).toFixed(2)}</td>
                <td class="num">${Number(invoiceTotals.totalChq || 0).toFixed(2)}</td>
                <td></td>
                <td></td>
                <td class="num">${Number(invoiceTotals.totalCash || 0).toFixed(2)}</td>
                <td class="num">${creditTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="lf-section-title">LOADFORM SUMMARY</div>
          <table>
            <thead>
              <tr>
                <th class="num">Cash</th>
                <th class="num">Credit</th>
                <th class="num">Cheque Collected</th>
                <th class="num">UnSettled</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="num">${Number(invoiceTotals.totalCash || 0).toFixed(2)}</td>
                <td class="num">${creditTotal.toFixed(2)}</td>
                <td class="num">${Number(invoiceTotals.totalChq || 0).toFixed(2)}</td>
                <td class="num">${unsettledTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="lf-section-title">SALES SUMMARY CALCULATION</div>
          <table class="summary-grid">
            <tbody>
              <tr><td class="label">Gross Amount</td><td class="num">${Number(clientTotals.gross || 0).toFixed(2)}</td></tr>
              <tr><td class="label">To</td><td class="num">${Number(clientTotals.Scheme || 0).toFixed(2)}</td></tr>
              <tr><td class="label">Slab Discount</td><td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td></tr>
              <tr><td class="label">Net Sales</td><td class="num">${Number(invoiceTotals.totalBill || 0).toFixed(2)}</td></tr>
              <tr><td class="label">Credit Sale</td><td class="num">${creditTotal.toFixed(2)}</td></tr>
              <tr><td class="label">Cheque Sale</td><td class="num">${Number(invoiceTotals.totalChq || 0).toFixed(2)}</td></tr>
              <tr><td class="label">Cash/Deposit Slip Collected</td><td class="num">${Number(invoiceTotals.totalCash || 0).toFixed(2)}</td></tr>
              <tr><td class="label">Shortage / Excess</td><td class="num">${unsettledTotal.toFixed(2)}</td></tr>
            </tbody>
          </table>

          <div class="lf-section-title">NOTES AND COINS</div>
          <table class="summary-grid">
            <tbody>
              ${[5000, 1000, 500, 100, 75, 50, 20, 10].map((denom) => `
                <tr>
                  <td class="label">${denom}</td>
                  <td class="center">*</td>
                  <td class="blank-cell"></td>
                  <td class="center">=</td>
                  <td class="blank-cell"></td>
                </tr>
              `).join('')}
              <tr>
                <td class="label">Coins</td>
                <td class="center">*</td>
                <td class="blank-cell"></td>
                <td class="center">=</td>
                <td class="blank-cell"></td>
              </tr>
            </tbody>
          </table>
          </div>
        </body>
      </html>
    `;

  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Load Form Print');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    const printDoc = iframe.contentWindow.document;
    printDoc.open();
    printDoc.write(printContent);
    printDoc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
        resolve();
      }, 1000);
    }, 300);
  });
}
