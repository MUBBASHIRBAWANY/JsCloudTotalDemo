import { useEffect, useState, useRef, useMemo } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const companyInfo = {
  name: "",
  address: "",
  city: "",
  email: "",
  website: ""
};

const LoadFormReport = ({ data, loadFormData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [productTable, setProductTable] = useState([]);
  const [allProduct, setallProduct] = useState([])
  const [invoiceData, setInvoiceData] = useState([]);
  const [allData , setAllData] = useState([])
  const [allClient , setAllClient] = useState([])
  const [loadFormMeta, setLoadFormMeta] = useState(null);
  const [loadFormOrderBooker, setLoadFormOrderBooker] = useState(null);
  const [orderDate, setOrderDate] = useState(null);
  const reportRef = useRef(null);

  // Export to PDF
const exportToPDF = async () => {
  const element = reportRef.current;

  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollY: -window.scrollY,
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 5;

    const usableWidth = pageWidth - margin * 2;

    const imgHeight =
      (canvas.height * usableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // First Page
    pdf.addImage(
      imgData,
      "PNG",
      margin,
      position,
      usableWidth,
      imgHeight
    );

    heightLeft -= pageHeight;

    // Extra Pages
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;

      pdf.addPage();

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        position,
        usableWidth,
        imgHeight
      );

      heightLeft -= pageHeight;
    }

    pdf.save(
      `LoadForm_Report_${data.LoadForm}.pdf`
    );
  } catch (error) {
    console.error("PDF Error:", error);
  }
};

  const getProduct = (productId) => allProduct.find((p) => p._id === productId) || null;

  const getProductName = (productId) => {
    const prod = getProduct(productId);
    if (!prod) return productId || 'N/A';
    return prod.ProductName || prod.name || `${prod.mastercode || prod.code || ''} ${prod.ProductName || ''}`.trim();
  };

  const getBoxInCarton = (productId) => {
    const prod = getProduct(productId);
    return parseInt(prod?.BoxinCarton) || 1;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getDistributorName = () => {
    return data.loginVendor?.DistrbutorName || 'N/A';
  };

  const loadFormNumber = loadFormMeta?.LoadFormNumber || loadFormMeta?.LoadForm || allData[0]?.LoadFormNumber || data.LoadForm || 'N/A';
  const loadFormStatus = loadFormMeta?.Status || loadFormMeta?.PostStatus || 'open';
  const loadFormDeliveryDate = loadFormMeta?.LoadFormDate || allData[0]?.LoadFormDate;

  const productMetrics = useMemo(() => {
    const rows = productTable.map((row) => {
      const boxInCarton = getBoxInCarton(row.product);
      const delivered = parseInt(row.DeliveredBox) || 0;
      const rtg = parseInt(row.RTGBox) || 0;
      const totalIssued = delivered + rtg;

      return {
        ...row,
        productCode: getProduct(row.product)?.mastercode || 'N/A',
        productName: getProductName(row.product),
        ctn: Math.floor(totalIssued / boxInCarton),
        box: totalIssued % boxInCarton,
        totalIssued,
        rtgCtn: Math.floor(rtg / boxInCarton),
        rtgBox: rtg % boxInCarton,
        totalReturned: rtg,
        saleBox: delivered,
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        ctn: acc.ctn + r.ctn,
        box: acc.box + r.box,
        totalIssued: acc.totalIssued + r.totalIssued,
        rtgCtn: acc.rtgCtn + r.rtgCtn,
        rtgBox: acc.rtgBox + r.rtgBox,
        totalReturned: acc.totalReturned + r.totalReturned,
        saleBox: acc.saleBox + r.saleBox,
      }),
      { ctn: 0, box: 0, totalIssued: 0, rtgCtn: 0, rtgBox: 0, totalReturned: 0, saleBox: 0 }
    );

    return { rows, totals };
  }, [productTable, allProduct]);

  const clientSummary = useMemo(() => {
    if (!allData.length) return [];

    const grouped = {};

    allData.forEach((inv) => {
      const cid = inv.Client;
      if (!grouped[cid]) {
        const c = allClient.find((cl) => cl._id === cid);
        const clientName = c ? (c.CutomerName || c.CustomorName || c.name || cid) : (cid || 'Unknown Client');

        grouped[cid] = {
          clientId: cid,
          code: c?.code,
          name: clientName,
          invoiceCount: inv.DisSalesInvoice,
          RTGBox: 0,
          To: 0,
          RTGValue: 0,
          totalDeliveredBox: 0,
          totalGross: 0,
          totalNet: 0,
          SlabDiscount : 0,
          SpecialTO: 0,
        };
      }

      const sd = inv.SalesData || [];
      grouped[cid].RTGBox += sd.reduce((sum, r) => sum + (parseInt(r.RTGBox) || 0), 0);
      grouped[cid].To += sd.reduce((sum, r) => sum + (parseInt(r.To) || 0), 0);
      grouped[cid].RTGValue += sd.reduce((sum, r) => sum + (parseInt((r.RTGBox || 0) * (r.RTGRate || 0)) || 0), 0);
      grouped[cid].totalDeliveredBox += sd.reduce((sum, r) => sum + (parseInt(r.DeliveredBox) || 0), 0);
      grouped[cid].totalGross += sd.reduce((sum, r) => sum + (parseFloat(r.GrossAmount) || 0), 0);
      grouped[cid].totalNet += sd.reduce((sum, r) => sum + (parseFloat(r.NetSale) || 0), 0);
      grouped[cid].SlabDiscount += parseFloat(inv.SlabDiscount) || 0;
      grouped[cid].SpecialTO += sd.reduce((sum, r) => sum + (parseFloat(r.SpecialTO) || 0), 0);
    });

    return Object.values(grouped);
  }, [allData, allClient]);
  const invoiceTotals = {
    totalBill: invoiceData.reduce((sum, row) => sum + (parseFloat(row?.Totalamount) || 0), 0),
    SlabDiscount: invoiceData.reduce((sum, row) => sum + (parseFloat(row?.SlabDiscount) || 0), 0),
    totalCash: invoiceData.reduce((sum, row) => sum + (parseFloat(row?.cashAmount) || 0), 0),
    totalChq: invoiceData.reduce((sum, row) => sum + (parseFloat(row?.Chq) || 0), 0),
  }
  
  const clientTotals = useMemo(() => ({
    invoices: allData.length,
    delivered: clientSummary.reduce((s, c) => s + c.totalDeliveredBox, 0),
    rtg: clientSummary.reduce((s, c) => s + c.RTGBox, 0),
    rtgValue: clientSummary.reduce((s, c) => s + c.RTGValue, 0),
    To: clientSummary.reduce((s, c) => s + c.To, 0),
    gross: clientSummary.reduce((s, c) => s + c.totalGross, 0),
    net: clientSummary.reduce((s, c) => s + c.totalNet, 0),
    SlabDiscount: clientSummary.reduce((s, c) => s + c.SlabDiscount, 0),
    Scheme: clientSummary.reduce((s, c) => s + (c.SpecialTO || 0), 0),
  }), [clientSummary, allData.length]);

  const getDelivered = (row) => parseInt(row?.Delivered ?? row?.DeliveredBox ?? row?.orderBox ?? 0) || 0;
  const getRate = (row) => parseFloat(row?.rate ?? row?.RTGRate ?? 0) || 0;
  const getAmount = (row) => parseFloat(row?.Amount ?? row?.GrossAmount ?? 0) || 0;
  const getDiscount = (row) => parseFloat(row?.Discount ?? row?.To ?? 0) || 0;
  const getNet = (row) => parseFloat(row?.netAmunt ?? row?.NetSale ?? row?.netAmount ?? 0) || 0;
  const getScheme = (row) => parseFloat(row?.SpecialTO ?? 0) || 0;

  const getCtnBox = (row) => {
    const product = getProduct(row.product);
    const delivered = getDelivered(row);
    const boxInCarton = parseInt(product?.BoxinCarton) || 1;
    return {
      ctn: Math.floor(delivered / boxInCarton),
      box: delivered % boxInCarton,
      totalBox: delivered,
    };
  };

  const buildLoadFormPrintHtml = () => {
    const { rows: productRows, totals: productTotals } = productMetrics;

    const buildPrintProductRows = () => productRows.map((row) => `
      <tr>
        <td>${row.productCode}</td>
        <td>${row.productName}</td>
        <td class="num">${row.ctn}</td>
        <td class="num">${row.box}</td>
        <td class="num">${row.totalIssued}</td>
        <td class="num">${row.rtgCtn}</td>
        <td class="num">${row.rtgBox}</td>
        <td class="num">${row.totalReturned}</td>
        <td class="num">${row.saleBox}</td>
      </tr>
    `).join('');

    const buildPrintClientRows = () => clientSummary.map((c) => `
      <tr>
        <td>${c.code || ''}</td>
        <td>${c.name}</td>
        <td class="center">${c.invoiceCount}</td>
        <td class="num">${c.totalDeliveredBox}</td>
        <td class="num">${c.RTGBox}</td>
        <td class="num">${c.totalGross.toFixed(2)}</td>
        <td class="num">${c.To}</td>
        <td class="num">${Number(c.SpecialTO || 0).toFixed(2)}</td>
        <td class="num">${Number(c.SlabDiscount || 0).toFixed(2)}</td>
        <td class="num">${c.RTGValue}</td>
        <td class="num">${(c.totalNet - Number(c.SlabDiscount || 0)).toFixed(2)}</td>
      </tr>
    `).join('');

    const creditTotal = invoiceTotals.totalBill - (Number(invoiceTotals.totalCash || 0) + Number(invoiceTotals.totalChq || 0));
    const unsettledTotal = creditTotal + (Number(invoiceTotals.totalCash || 0) + Number(invoiceTotals.totalChq || 0)) - invoiceTotals.totalBill;

    const buildPrintInvoiceRows = () => invoiceData.map((item) => `
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

    return `
      <div class="load-form-section">
        <div class="lf-header">
          <h1>LOAD FORM REPORT</h1>
          <div class="header-top">
            <div class="header-left"><strong>Order Booker:</strong> ${loadFormOrderBooker || 'N/A'}</div>
            <div class="header-center"><strong>Distributor:</strong> ${getDistributorName()}</div>
            <div class="header-right"><strong>Order Date:</strong> ${formatDate(orderDate)}</div>
          </div>
          <div class="header-top">
            <div class="header-left"><strong>PJP Day:</strong> Unplaned</div>
            <div class="header-center">Load Form # ${loadFormNumber} ${loadFormStatus}</div>
            <div class="header-right"><strong>Delivery Date:</strong> ${formatDate(loadFormDeliveryDate)}</div>
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
            ${buildPrintProductRows() || '<tr><td colspan="9" class="center">No items</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              <td>TOTAL</td>
              <td class="num">${productTotals.ctn}</td>
              <td class="num">${productTotals.box}</td>
              <td class="num">${productTotals.totalIssued}</td>
              <td class="num">${productTotals.rtgCtn}</td>
              <td class="num">${productTotals.rtgBox}</td>
              <td class="num">${productTotals.totalReturned}</td>
              <td class="num">${productTotals.saleBox}</td>
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
              <th class="num">Scheme</th>
              <th class="num">Slab Discount</th>
              <th class="num">RTG Value</th>
              <th class="num">Net Sale</th>
            </tr>
          </thead>
          <tbody>
            ${buildPrintClientRows() || '<tr><td colspan="11" class="center">No client data</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              <td>TOTAL</td>
              <td class="center">${clientTotals.invoices}</td>
              <td class="num">${clientTotals.delivered}</td>
              <td class="num">${clientTotals.rtg}</td>
              <td class="num">${clientTotals.gross.toFixed(2)}</td>
              <td class="num">${clientTotals.To}</td>
              <td class="num">${Number(clientTotals.Scheme || 0).toFixed(2)}</td>
              <td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td>
              <td class="num">${clientTotals.rtgValue}</td>
              <td class="num">${invoiceTotals.totalBill.toFixed(2)}</td>
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
            ${buildPrintInvoiceRows() || '<tr><td colspan="8" class="center">No invoice data</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              <td>TOTAL</td>
              <td class="num">${invoiceTotals.totalBill.toFixed(2)}</td>
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
            <tr><td class="label">Gross Amount</td><td class="num">${clientTotals.gross.toFixed(2)}</td></tr>
            <tr><td class="label">To</td><td class="num">${clientTotals.To.toFixed(2)}</td></tr>
            <tr><td class="label">Scheme</td><td class="num">${Number(clientTotals.Scheme || 0).toFixed(2)}</td></tr>
            <tr><td class="label">Slab Discount</td><td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td></tr>
            <tr><td class="label">Net Sales</td><td class="num">${invoiceTotals.totalBill.toFixed(2)}</td></tr>
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
    `;
  };

  const buildInvoicePrintHtml = (invoice) => {
    const foundClient = allClient.find((c) => c._id === invoice.Client);
    const client = foundClient || (invoice.Client && typeof invoice.Client === 'string' ? { CutomerName: invoice.Client } : null);
    const clientName = client?.CutomerName || client?.CustomorName || invoice.Client || 'N/A';
    const orderBookerName = invoice.OrderBooker
      ? (typeof invoice.OrderBooker === 'string' ? invoice.OrderBooker : (invoice.OrderBooker?.label || ''))
      : '';

    const salesData = invoice.SalesData || [];
    const totalAmount = salesData.reduce((sum, item) => sum + getAmount(item), 0);
    const totalDiscount = salesData.reduce((sum, item) => sum + getDiscount(item), 0);
    const totalNetAmount = salesData.reduce((sum, item) => sum + getNet(item), 0);
    const totalScheme = salesData.reduce((sum, item) => sum + getScheme(item), 0);
    const quantityTotals = salesData.reduce(
      (acc, row) => {
        const { ctn, box, totalBox } = getCtnBox(row);
        acc.ctn += ctn;
        acc.box += box;
        acc.totalBox += totalBox;
        return acc;
      },
      { ctn: 0, box: 0, totalBox: 0 }
    );
    const netTotal = Number(invoice.TotalAmount || invoice.Totalamount || totalNetAmount || 0);

    const buildPrintTableRows = () => salesData.map((row) => {
      const product = getProduct(row.product);
      const { ctn, box, totalBox } = getCtnBox(row);
      return `
        <tr>
          <td class="center">${product?.mastercode || 'N/A'}</td>
          <td>${product?.ProductName || 'N/A'}</td>
          <td class="num">${ctn}</td>
          <td class="num">${box}</td>
          <td class="num">${totalBox}</td>
          <td class="num">${getAmount(row) / totalBox}</td>
          <td class="num">${Number(getAmount(row)).toLocaleString()}</td>
          <td class="num">${Number(getDiscount(row)).toLocaleString()}</td>
          <td class="num">${Number(getScheme(row)).toLocaleString()}</td>
          <td class="num">${Number(getNet(row)).toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="invoice-section">
        <div class="inv-header">
          <h1>${companyInfo.name}</h1>
          <p>${companyInfo.address} | ${companyInfo.city}</p>
          <p><strong>SALES INVOICE</strong></p>
        </div>

        <div class="inv-meta">
          <div class="inv-meta-box">
            <h3>Client Information</h3>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Address:</strong> ${client?.Address || 'N/A'}</p>
            <p><strong>Phone:</strong> ${client?.Phone || 'N/A'}</p>
            ${invoice.Remarks ? `<p><strong>Remarks:</strong> ${invoice.Remarks}</p>` : ''}
          </div>
          <div class="inv-meta-box">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.DisSalesInvoice}</p>
            <p><strong>Date:</strong> ${invoice.SalesInvoiceDate}</p>
            ${invoice.LoadFormNumber ? `<p><strong>Load Form:</strong> ${invoice.LoadFormNumber}</p>` : ''}
            ${invoice.OrderNumber ? `<p><strong>Order #:</strong> ${invoice.OrderNumber}</p>` : ''}
            ${orderBookerName ? `<p><strong>Order Booker:</strong> ${orderBookerName}</p>` : ''}
          </div>
        </div>

        <div class="inv-section-title">PRODUCTS DETAILS</div>
        <table>
          <thead>
            <tr>
              <th class="center" style="width:8%">Code</th>
              <th class="center" style="width:18%">Product</th>
              <th class="center" style="width:6%">CTN</th>
              <th class="center" style="width:6%">BOX</th>
              <th class="center" style="width:7%">Total Box</th>
              <th class="center" style="width:8%">TP Rate</th>
              <th class="center" style="width:11%">Gross Amount</th>
              <th class="center" style="width:9%">Discount</th>
              <th class="center" style="width:10%">Scheme</th>
              <th class="center" style="width:14%">Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${buildPrintTableRows() || '<tr><td colspan="10" class="center">No items</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">TOTAL</td>
              <td class="num">${quantityTotals.ctn}</td>
              <td class="num">${quantityTotals.box}</td>
              <td class="num">${quantityTotals.totalBox}</td>
              <td class="num">-</td>
              <td class="num">${totalAmount.toLocaleString()}</td>
              <td class="num">-${totalDiscount.toLocaleString()}</td>
              <td class="num">${totalScheme.toLocaleString()}</td>
              <td class="num">${totalNetAmount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div class="inv-bottom-section">
          <div class="inv-signatures">
            <div class="inv-sig-box">
              <h4>Prepared By</h4>
              <div class="inv-sig-line">Signature / Date: ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="inv-sig-box">
              <h4>Verified By</h4>
              <div class="inv-sig-line">Signature / Date: ___________</div>
            </div>
            <div class="inv-sig-box">
              <h4>Received By</h4>
              <div class="inv-sig-line">Signature / Date: ___________</div>
            </div>
          </div>
          <div class="inv-summary-box">
            <h3>Invoice Summary</h3>
            <div class="inv-summary-row"><span>Gross Amount:</span><span>${totalAmount.toLocaleString()}</span></div>
            <div class="inv-summary-row"><span>Discount:</span><span>${totalDiscount.toLocaleString()}</span></div>
            <div class="inv-summary-row"><span>Scheme:</span><span>${totalScheme.toLocaleString()}</span></div>
            <div class="inv-summary-row"><span>Slab Discount(${invoice?.SlabPercentage ||0}%):</span><span>${((invoice.SlabDiscount || 0)).toLocaleString()}</span></div>
            <div class="inv-summary-row"><span>Net Amount:</span><span class="positive">${netTotal }</span></div>
          </div>
        </div>

        <div class="inv-print-footer">
          Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} |
          | / | 
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Print Invoice Report');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    let bodyContent = '';

    if (data.invoice !== 'OnlyInvoice') {
      bodyContent += buildLoadFormPrintHtml();
    }

    if (data.invoice !== 'WithOutInvoice') {
      bodyContent += '<div class="invoices-print-block">';
      allData.forEach((invoice) => {
        bodyContent += buildInvoicePrintHtml(invoice);
      });
      bodyContent += '</div>';
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LoadForm Report ${loadFormNumber}</title>
          <style>
            @page { size: A4 portrait; margin: 5mm; }
            @page loadform { size: A4 portrait; margin: 8mm; }
            @media print {
              @page { size: A4 portrait; margin: 5mm; }
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              thead { display: table-header-group; }
              tr { page-break-inside: avoid; }
              table { page-break-inside: auto; margin: 0; padding: 0; }
              .load-form-section {
                page-break-after: always;
                margin-bottom: 0;
              }
              .invoices-print-block {
                margin: 0;
                padding: 0;
              }
              .invoice-section {
                border: none;
                page-break-inside: avoid;
                break-inside: avoid;
                margin: 0;
                padding: 2mm 3mm;
              }
              .invoices-print-block .invoice-section + .invoice-section {
                margin-top: 0;
              }
              .inv-bottom-section {
                page-break-inside: avoid;
              }
              .total-row {
                page-break-inside: avoid;
              }
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
            .invoices-print-block { width: 100%; margin: 0; padding: 0; }
            .invoice-section {
              border: 1px solid #9ca3af;
              padding: 2.5mm 3.5mm;
              margin-bottom: 1mm;
              box-sizing: border-box;
              max-width: 100%;
            }
            .invoices-print-block .invoice-section + .invoice-section {
              margin-top: 1mm;
            }
            .inv-header {
              border-bottom: 2px solid #1e40af;
              padding-bottom: 5px;
              margin-bottom: 6px;
              text-align: center;
            }
            .inv-header h1 { margin: 0 0 3px; font-size: 18px; color: #1e3a8a; }
            .inv-header p { margin: 1px 0; font-size: 11px; color: #4b5563; }
            .inv-meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
              margin-bottom: 6px;
              font-size: 10px;
            }
            .inv-meta-box {
              border: 1px solid #d1d5db;
              border-radius: 3px;
              padding: 4px 6px;
            }
            .inv-meta-box h3 {
              margin: 0 0 4px;
              font-size: 11px;
              color: #1e40af;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 2px;
            }
            .inv-meta-box p { margin: 2px 0; }
            .inv-section-title {
              font-size: 12px;
              font-weight: bold;
              background: #1e40af;
              color: #fff;
              padding: 3px 7px;
              margin: 5px 0 4px;
            }
            .invoice-section table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              margin-bottom: 5px;
              table-layout: fixed;
            }
            .invoice-section th,
            .invoice-section td {
              padding: 2px 3px;
              word-wrap: break-word;
              overflow-wrap: break-word;
              line-height: 1.2;
            }
            .invoice-section th {
              border: 1px solid #9ca3af;
              background: #e5e7eb;
              font-weight: 600;
              text-align: left;
            }
            .invoice-section tfoot td {
              border: 1px solid #9ca3af;
              font-weight: bold;
              background: #f3f4f6;
            }
            .inv-bottom-section {
              display: grid;
              grid-template-columns: 1fr 160px;
              gap: 10px;
              margin-top: 10px;
            }
            .inv-summary-box {
              border: 1px solid #d1d5db;
              padding: 4px 5px;
              font-size: 10px;
            }
            .inv-summary-box h3 {
              margin: 0 0 4px;
              font-size: 11px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 2px;
            }
            .inv-summary-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .inv-summary-row .negative { color: #dc2626; }
            .inv-summary-row .positive { color: #16a34a; font-weight: bold; }
            .inv-signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 5px;
            }
            .inv-sig-box {
              border: 1px solid #d1d5db;
              padding: 6px;
              min-height: 60px;
              font-size: 11px;
            }
            .inv-sig-box h4 { margin: 0 0 20px; font-size: 13px; }
            .inv-sig-line { border-top: 1px solid #9ca3af; margin-top: 4px; padding-top: 2px; }
            .inv-print-footer {
              margin-top: 5px;
              padding-top: 4px;
              border-top: 1px solid #d1d5db;
              font-size: 8px;
              text-align: center;
              color: #6b7280;
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
          ${bodyContent}
        </body>
      </html>
    `;

    const printDoc = iframe.contentWindow.document;
    printDoc.open();
    printDoc.write(printContent);
    printDoc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const loadformData = await getDataFundtion(
          `SalesInvoice/LoadForm/${data.LoadForm}`
        )
        console.log(        `SalesInvoice/LoadForm/${data.LoadForm}`)
        const Client = await getDataFundtion(`/Customor/AllCutomerByDis/${data.loginVendor._id}`)
        setAllClient(Client.data)
        setAllData(loadformData.data)
        const Product = await getDataFundtion(`/Product`)
        setallProduct(Product.data)

        const loadFormsRes = await getDataFundtion(`LoadForm/AllloadFormNumber/${data.loginVendor._id}`)
        const foundLoadForm = (loadFormsRes.data || []).find(
          (lf) => lf._id === data.LoadForm || lf.LoadFormNumber === data.LoadForm
        ) || loadformData.data[0] || null;
        setLoadFormMeta(foundLoadForm)

        const salesdata = loadformData.data.flatMap((item) => item.SalesData || [])
        const orderNumber = salesdata[0]?.orderNumber
        const orderBooker = loadformData.data[0]?.OrderBooker

        if (orderBooker) {
          const orderBookerList = await getDataFundtion(`/orderbooker/OrderByvendor/${data.loginVendor._id}`)
          const orderBookerName = orderBookerList.data?.find((item) => item._id == orderBooker)
          setLoadFormOrderBooker(orderBookerName?.OrderBookerName || null)
        }

        if (orderNumber) {
          const orderDateRes = await getDataFundtion(`/saleOrder/getSalesOrderByNumber/${orderNumber}`)
          setOrderDate(orderDateRes?.SaleOrderDate || null)
        }

        const mergedData = Object.values(
          salesdata.reduce((acc, item) => {
            if (!acc[item.product]) {
              acc[item.product] = {
                product: item.product,
                DeliveredBox: 0,
                To: 0,
                GrossAmount: 0,
                NetSale: 0,
                RTGBox: 0,
                SpecialTO: 0,
              };
            }

            acc[item.product].DeliveredBox += item.DeliveredBox || 0;
            acc[item.product].To += item.To || 0;
            acc[item.product].GrossAmount += item.GrossAmount || 0;
            acc[item.product].NetSale += Number(item.NetSale) || 0;
            acc[item.product].RTGBox += item.RTGBox || 0;
            acc[item.product].SpecialTO += Number(item.SpecialTO) || 0;

            return acc;
          }, {})
        );
        setProductTable(mergedData);
        const invoiceData = loadformData.data.map((item) => ({
          DisSalesInvoice: item.DisSalesInvoice,
          Remaining: item.Remaining,
          Totalamount: item.Totalamount,
          cashAmount: item.cashAmount,
          Chq: item.Chq,
          SalesInvoiceDate: item.SalesInvoiceDate,
          SlabDiscount: item.SlabDiscount,
          ChqDate: item.ChqDate,
          ChqNumber: item.ChqNumber,
        }))
        setInvoiceData(invoiceData)
      } catch (err) {
        console.error("Error fetching ledger data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (data?.LoadForm) {
      fetchData();
    }
  }, [data]);

  // Calculate totals
  const calculateTotals = () => {
    const totals = {
      issuedUnits: 0,
      freeUnits: 0,
      cartonsIssued: 0,
      boxIssued: 0,
      unitsIssued: 0,
      returnedCartons: 0,
      returnedBox: 0,
      returnedUnits: 0,
      salesCartons: 0,
      salesBox: 0,
      salesUnits: 0,
      salesAmount: 0,
      gst: 0,
      advanceTax: 0,
      totalDiscount: 0,
      scheme: 0,
      netSales: 0
    };

    productTable.forEach(item => {
      totals.issuedUnits += item.IssuedUnits || 0;
      totals.freeUnits += item.FreeUnits || 0;
      totals.cartonsIssued += item.CartonsIssued || 0;
      totals.boxIssued += (Number(item.DeliveredBox) || 0) + (Number(item.RTGBox) || 0);
      totals.unitsIssued += item.UnitsIssued || 0;
      totals.returnedCartons += item.ReturnedCartons || 0;
      totals.returnedBox += item.RTGBox || 0;
      totals.returnedUnits += item.ReturnedUnits || 0;
      totals.salesCartons += item.SalesCartons || 0;
      totals.salesBox += Number(item.DeliveredBox) || 0;
      totals.salesUnits += item.SalesUnits || 0;
      totals.salesAmount += item.GrossAmount || 0;
      totals.gst += item.GST || 0;
      totals.advanceTax += item.AdvanceTax || 0;
      totals.totalDiscount += item.To || 0;
      totals.scheme += Number(item.SpecialTO) || 0;
      totals.netSales += item.NetSale || 0;
    });

    return totals;
  };


  const totals = calculateTotals();
  const { rows: productRows, totals: productTotals } = productMetrics;

  const getPrintDate = () => {
    const now = new Date();
    return `${now.getDate()} ${now.toLocaleString('default', { month: 'long' })}, ${now.getFullYear()} ${now.toLocaleTimeString()}`;
  };

  const getClientName = (clientId) => {
    const c = allClient.find((item) => item._id === clientId);
    return c?.CutomerName || c?.CustomorName || clientId || 'N/A';
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: '#fff',
        padding: '10px',
        borderBottom: '1px solid #ddd',
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={exportToPDF}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Export to PDF
        </button>
        <button
          onClick={handlePrint}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Print
        </button>
      </div>

      <div className="report" style={{ marginLeft: '5px' }} ref={reportRef}>
        <center id="showH">
          <table className="filter-table" cellSpacing="1" border="1" cellPadding="5">
            <tbody>
              <tr><td colSpan="3"><h3>Filters Applied</h3></td></tr>
              <tr>
                <td valign="top"><strong>Load Form</strong></td>
                <td colSpan="2" valign="top">{loadFormNumber}</td>
              </tr>
              <tr>
                <td valign="top"><strong>With Invoice</strong></td>
                <td colSpan="2" valign="top">{data.invoice}</td>
              </tr>
            </tbody>
          </table>

          <table className="print-date-table" border="1" cellPadding="5">
            <tbody>
              <tr>
                <td colSpan="3">
                  <strong>Print Date</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  {getPrintDate()}
                </td>
              </tr>
            </tbody>
          </table>
        </center>

        {data.invoice !== 'OnlyInvoice' ? (
          <>
            <div className="table-responsive">
              <table className="main-table" border="1" cellSpacing="0" cellPadding="5" width="95%" align="center">
                <thead style={{ backgroundColor: '#2196F3', color: 'white', fontSize: '16px' }}>
                  <tr>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>SKU</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Total Issued</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Returned</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Sales</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Sales Amount</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>GST</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Advance Tax</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Total Discount</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Scheme</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Net Sales</td>
                  </tr>
                  <tr style={{ backgroundColor: '#2196F3', color: 'white' }}>
                    <td></td>
                    <td align="center">Box</td>
                    <td align="center">Box</td>
                    <td align="center">Box</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row, index) => (
                    <tr key={index} style={{ fontFamily: 'Trebuchet MS, Arial', fontSize: '11px' }}>
                      <td align="left" style={{ whiteSpace: 'pre-line' }}>{row.productName}</td>
                      <td align="right">{row.totalIssued}</td>
                      <td align="right">{row.totalReturned}</td>
                      <td align="right">{row.saleBox}</td>
                      <td align="right">{row.GrossAmount?.toFixed(2) || '0.00'}</td>
                      <td align="right">{row.gst?.toFixed(2) || '0.00'}</td>
                      <td align="right">{row.AdvanceTax?.toFixed(2) || '0.00'}</td>
                      <td align="right">{row.To?.toFixed(2) || '0.00'}</td>
                      <td align="right">{row.SpecialTO?.toFixed(2) || '0.00'}</td>
                      <td align="right">{row.NetSale?.toFixed(2) || '0.00'}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bolder' }}>
                    <td align="right">Total</td>
                    <td align="right">{productTotals.totalIssued}</td>
                    <td align="right">{productTotals.totalReturned}</td>
                    <td align="right">{productTotals.saleBox}</td>
                    <td align="right">{totals.salesAmount.toFixed(2)}</td>
                    <td align="right">{totals.gst.toFixed(2)}</td>
                    <td align="right">{totals.advanceTax.toFixed(2)}</td>
                    <td align="right">{totals.totalDiscount.toFixed(2)}</td>
                    <td align="right">{totals.scheme.toFixed(2)}</td>
                    <td align="right">{totals.netSales.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="table-responsive">
              <table className="discount-table" border="1" cellSpacing="0" cellPadding="5" width="95%" align="center">
                <thead style={{ backgroundColor: '#2196F3', color: 'white' }}>
                  <tr>
                    <th style={{ fontWeight: 'bold', fontSize: '12px' }}>Invoice wise Summary</th>
                    <th></th><th></th><th></th><th></th><th></th><th></th><th></th>
                  </tr>
                  <tr>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Invoice</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Invoice Date</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Bill Amount</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Chq Amount</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Chq Date</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Chq Number</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Cash</td>
                    <td align="center" style={{ fontWeight: 'bold', fontSize: '12px' }}>Credit</td>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.map((item, index) => (
                    <tr key={index}>
                      <td align="center">{item.DisSalesInvoice}</td>
                      <td align="center">{item.SalesInvoiceDate}</td>
                      <td align="center">{item.Totalamount}</td>
                      <td align="center">{item.Chq?.toFixed(2) || '0.00'}</td>
                      <td align="center">{item.ChqDate}</td>
                      <td align="center">{item.ChqNumber}</td>
                      <td align="center">{Number(item.cashAmount || 0).toFixed(2)}</td>
                      <td align="center">
                        {Number((item.Totalamount || 0) - Number(item.cashAmount || 0) - Number(item.Chq || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td align="center"></td>
                    <td align="center"></td>
                    <td align="center">{invoiceTotals.totalBill}</td>
                    <td align="center">{invoiceTotals.totalChq.toFixed(2)}</td>
                    <td align="center"></td>
                    <td align="center"></td>
                    <td align="center">{invoiceTotals.totalCash.toFixed(2)}</td>
                    <td align="center">
                      {(invoiceTotals.totalBill - (Number(invoiceTotals.totalCash || 0) + Number(invoiceTotals.totalChq || 0))).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="loadform-summary">
              <table className="loadform-table" border="1" cellSpacing="0" cellPadding="5" width="95%" align="center">
                <thead style={{ backgroundColor: '#2196F3', color: 'white' }}>
                  <tr>
                    <th style={{ fontWeight: 'bold', fontSize: '12px' }}>Loadform Summary</th>
                    <th></th><th></th><th></th>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', fontSize: '12px' }}>Cash</td>
                    <td style={{ fontWeight: 'bold', fontSize: '12px' }}>Credit</td>
                    <td style={{ fontWeight: 'bold', fontSize: '12px' }}>Cheque Collected</td>
                    <td style={{ fontWeight: 'bold', fontSize: '12px' }}>UnSettled</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{invoiceTotals.totalCash.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {(invoiceTotals.totalBill - (Number(invoiceTotals.totalCash || 0) + Number(invoiceTotals.totalChq || 0))).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{invoiceTotals.totalChq.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {((invoiceTotals.totalBill - (Number(invoiceTotals.totalCash || 0) + Number(invoiceTotals.totalChq || 0))) + (Number(invoiceTotals.totalCash || 0) + Number(invoiceTotals.totalChq || 0)) - invoiceTotals.totalBill).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="sales-summary">
              <table id="sales" style={{ margin: '0 auto', width: '90%' }}>
                <tbody>
                  <tr>
                    <th align="left" style={{ fontWeight: 'bolder', fontSize: '13px' }}>Sales Summary Calculation</th>
                    <th align="left" style={{ fontWeight: 'bolder', fontSize: '13px' }}></th>
                  </tr>
                  <tr><td align="left" style={{ fontWeight: 'bolder' }}>Gross Amount</td><td align="right">{clientTotals.gross.toFixed(2)}</td></tr>
                  <tr><td align="left" style={{ fontWeight: 'bolder' }}>To</td><td align="right">{clientTotals.To.toFixed(2)}</td></tr>
                  <tr><td align="left" style={{ fontWeight: 'bolder' }}>Scheme</td><td align="right">{Number(clientTotals.Scheme || 0).toFixed(2)}</td></tr>
                  <tr><td align="left" style={{ fontWeight: 'bolder' }}>Slab Discount</td><td align="right">{Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td></tr>
                  <tr><td align="left" style={{ fontWeight: 'bolder' }}>Net Sales</td><td align="right">{invoiceTotals.totalBill.toFixed(2)}</td></tr>
                  <tr><td align="left" style={{ fontWeight: 'bolder' }}>Credit Sale</td><td align="right">{(invoiceTotals.totalBill - (Number(invoiceTotals.totalCash || 0) + Number(invoiceTotals.totalChq || 0))).toFixed(2)}</td></tr>
                  <tr><td align="left" style={{ fontWeight: 'bolder' }}>Cheque Sale</td><td align="right">{Number(invoiceTotals.totalChq || 0).toFixed(2)}</td></tr>
                  <tr><td align="left" style={{ fontWeight: 'bolder' }}>Cash/Deposit Slip Collected</td><td align="right">{Number(invoiceTotals.totalCash || 0).toFixed(2)}</td></tr>
                  <tr>
                    <td align="left" style={{ fontWeight: 'bolder', color: '#0b559b' }}>Shortage / Excess</td>
                    <td align="right" style={{ fontWeight: 'bolder', color: '#0b559b' }}>
                      {((invoiceTotals.totalBill - (Number(invoiceTotals.totalCash || 0) + Number(invoiceTotals.totalChq || 0))) + (Number(invoiceTotals.totalCash || 0) + Number(invoiceTotals.totalChq || 0)) - invoiceTotals.totalBill).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="notes-coins">
              <table className="notes-table" border="1" cellSpacing="0" cellPadding="5" width="95%" align="center">
                <thead style={{ backgroundColor: '#2196F3', color: 'white' }}>
                  <tr>
                    <th style={{ fontWeight: 'bold', fontSize: '12px' }}>Notes and Coins</th>
                    <th></th><th></th><th></th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {[5000, 1000, 500, 100, 75, 50, 20, 10].map((denom) => (
                    <tr key={denom}>
                      <td style={{ textAlign: 'right' }}>{denom}</td>
                      <td style={{ textAlign: 'center' }}>*</td>
                      <td style={{ borderBottom: '2px solid black', width: '120px' }}>0</td>
                      <td style={{ textAlign: 'center' }}>=</td>
                      <td style={{ borderBottom: '2px solid black', width: '120px' }}>0</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ textAlign: 'right' }}>Coins</td>
                    <td style={{ textAlign: 'center' }}>*</td>
                    <td style={{ borderBottom: '2px solid black', width: '120px' }}>0</td>
                    <td style={{ textAlign: 'center' }}>=</td>
                    <td style={{ borderBottom: '2px solid black', width: '120px' }}>0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {data.invoice !== 'WithOutInvoice' ? (
          <div className="invoice-detail-section">
            {allData.map((invoice, invoiceIndex) => {
              const salesData = invoice.SalesData || [];
              const invTotalAmount = salesData.reduce((sum, item) => sum + getAmount(item), 0);
              const invTotalDiscount = salesData.reduce((sum, item) => sum + getDiscount(item), 0);
              const invTotalNetAmount = salesData.reduce((sum, item) => sum + getNet(item), 0);
              const invTotalScheme = salesData.reduce((sum, item) => sum + getScheme(item), 0);
              const invTotalBox = salesData.reduce((sum, item) => sum + getDelivered(item), 0);

              return (
                <div
                  key={invoiceIndex}
                  style={{
                    border: '1px solid #000',
                    margin: '20px',
                    padding: '10px',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <table width="100%" border="1" cellSpacing="0" cellPadding="5" style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td colSpan="4" align="center">
                          <h2 style={{ margin: 0 }}>INVOICE</h2>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Invoice No:</strong> {invoice.DisSalesInvoice}</td>
                        <td><strong>Date:</strong> {invoice.SalesInvoiceDate}</td>
                        <td><strong>Customer:</strong> {getClientName(invoice.Client)}</td>
                      </tr>
                      <tr>
                        <td><strong>LoadForm:</strong> {invoice.LoadFormNumber || loadFormNumber}</td>
                        <td><strong>Order No:</strong> {invoice.OrderNumber || 'N/A'}</td>
                        <td>
                          <strong>Total:</strong>{' '}
                          {Number(invoice.TotalAmount || invoice.Totalamount || invTotalNetAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <table
                    width="100%"
                    border="1"
                    cellSpacing="0"
                    cellPadding="5"
                    style={{ marginTop: '10px', borderCollapse: 'collapse' }}
                  >
                    <thead style={{ backgroundColor: '#2196F3', color: 'white' }}>
                      <tr>
                        <th>Product</th>
                        <th>Box</th>
                        <th>Rate</th>
                        <th>Gross Amount</th>
                        <th>Discount</th>
                        <th>Scheme</th>
                        <th>Net Sale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.map((item, idx) => {
                        const product = getProduct(item.product);
                        return (
                          <tr key={idx}>
                            <td>{product?.ProductName || 'N/A'}</td>
                            <td align="right">{getDelivered(item)}</td>
                            <td align="right">{getRate(item).toFixed(2)}</td>
                            <td align="right">{getAmount(item).toFixed(2)}</td>
                            <td align="right">{getDiscount(item).toFixed(2)}</td>
                            <td align="right">{getScheme(item).toFixed(2)}</td>
                            <td align="right">{getNet(item).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ fontWeight: 'bold' }}>
                        <td align="right">TOTAL</td>
                        <td align="right">{invTotalBox}</td>
                        <td></td>
                        <td align="right">{invTotalAmount.toFixed(2)}</td>
                        <td align="right">{invTotalDiscount.toFixed(2)}</td>
                        <td align="right">{invTotalScheme.toFixed(2)}</td>
                        <td align="right">{invTotalNetAmount.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ) : null}

        <style>{`.report {
  font-family: 'Trebuchet MS', Arial, sans-serif;
  margin-left: 5px;
}

.filter-table,
.print-date-table,
.main-table,
.discount-table,
.loadform-table,
.notes-table {
  margin: 20px;
  width: 95%;
  border-collapse: collapse;
}

.filter-table td,
.print-date-table td,
.main-table td,
.main-table th,
.discount-table td,
.discount-table th,
.loadform-table td,
.loadform-table th,
.notes-table td,
.notes-table th {
  border: 1px solid #ddd;
  padding: 5px;
}

.main-table thead td,
.discount-table thead td,
.loadform-table thead td,
.notes-table thead td {
  background-color: #2196F3;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.main-table tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}

.table-responsive {
  overflow-x: auto;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #2196F3;
}

#sales {
  width: 90%;
  margin: 0 auto;
  border-collapse: collapse;
}

#sales td {
  border-bottom: 1px solid #cccccc;
  border-top: 1px solid #cccccc;
  font-weight: bolder;
  padding: 8px;
}

#sales tr:nth-child(odd) {
  background: #f4f2f2;
}

#sales th {
  padding: 8px;
  text-align: left;
}

.sales-summary {
  margin-top: 20px;
}

.loadform-summary,
.sales-summary,
.notes-coins {
  margin-top: 30px;
}

@media print {
  .report {
    margin: 0;
    padding: 0;
  }

  .main-table,
  .discount-table,
  .loadform-table,
  .notes-table {
    page-break-inside: avoid;
  }

  div[style*="position: sticky"] {
    display: none !important;
  }
}`}</style>
      </div>
    </div>
  );
};

export default LoadFormReport;