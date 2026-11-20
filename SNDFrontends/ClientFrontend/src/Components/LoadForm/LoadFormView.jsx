import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { getDataFundtion } from '../../Api/CurdFunctions';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { printLoadFormReport } from '../../utils/printLoadFormReport';

const LoadFormView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const dispatch = useDispatch();
  const LoadForms = useSelector((state) => state.LoadForm.LoadForm);
  const Products = useSelector((state) => state.Product.product);
  const Clients = useSelector((state) => state.Client.client);
  const Distributors = useSelector((state) => state.DistributroReducers.DistributroReducers);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);

  const [loadForm, setLoadForm] = useState(null);
  const [loadFormOrderBooker, setLoadFormOrderBooker] = useState(null);
  const [OrderDate, setOrderDate] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [invoicesData, setInvoicesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const normalizeId = (val) => (val && typeof val === 'object' && val.$oid) ? val.$oid : val;

    const loadData = async () => {
      setIsLoading(true);
      try {
        let currentProducts = Products;
        if (!currentProducts || currentProducts.length === 0) {
          const prodRes = await getDataFundtion("/product");
          if (prodRes?.data) {
            dispatch(fetchproduct(prodRes.data));
            currentProducts = prodRes.data;
          }
        }

        let currentClients = Clients;
        if (!currentClients || currentClients.length === 0) {
          const clientRes = await getDataFundtion("/Customor");
          if (clientRes?.data) {
            dispatch(fetchClient(clientRes.data));
            currentClients = clientRes.data;
          }
        }

        const found = LoadForms.find((item) => {
          const itemId = normalizeId(item?._id);
          return itemId === id || itemId === normalizeId(id);
        });

        if (found) {
          setLoadForm(found);

          const loadFormNumber = found.LoadFormNumber || found.LoadForm;
          const response = await getDataFundtion(`/SalesInvoice/LoadForm/${loadFormNumber}`);
          const OderBookerList = await getDataFundtion(`/orderbooker/OrderByvendor/${loginVendor._id}`)
          
          const rawInvoices = response.data || [];
          setInvoicesData(rawInvoices);

          const salesdata = rawInvoices.flatMap((item) => item.SalesData || []);
          const orderNumber = salesdata[0].orderNumber;
          const orderBooker = rawInvoices[0].OrderBooker;
          const OrderBookername = OderBookerList.data.find((item)=> item._id == orderBooker)
                    console.log(orderNumber, OrderBookername, "orderBooker")
          const orderDate = await getDataFundtion(`/saleOrder/getSalesOrderByNumber/${orderNumber}`)
          setOrderDate(orderDate.SaleOrderDate)
          setLoadFormOrderBooker(OrderBookername.OrderBookerName)
          const mergedData = Object.values(
            salesdata.reduce((acc, item) => {
              if (!acc[item.product]) {
                acc[item.product] = {
                  product: item.product,
                  DeliveredBox: 0,
                  To: 0,
                  GrossAmount: 0,
                  NetSale: 0,
                  orderBox: 0,
                  RTGBox: 0,
                  SpecialTO: 0,
                };
              }

              acc[item.product].DeliveredBox += item.DeliveredBox || 0;
              acc[item.product].To += item.To || 0;
              acc[item.product].GrossAmount += item.GrossAmount || 0;
              acc[item.product].NetSale += Number(item.NetSale) || 0;
              acc[item.product].orderBox += item.orderBox || item.DeliveredBox || 0;
              acc[item.product].RTGBox += item.RTGBox || 0;
              acc[item.product].SpecialTO += Number(item.SpecialTO) || 0;

              return acc;
            }, {})
          );

          setTableData(mergedData);
        } else {
          setInvoicesData([]);
          setTableData([]);
        }
      } catch (err) {
        console.error("Error loading LoadForm detailed data from /SalesInvoice/LoadForm/", err);
        setInvoicesData([]);
        setTableData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, LoadForms]);

  const getProduct = (productId) => {
    if (!productId) return null;
    return Products.find((p) => p._id === productId) || null;
  };

  const getProductName = (productId) => {
    const prod = getProduct(productId);
    if (!prod) return productId || 'N/A';
    return prod.ProductName || prod.name || `${prod.mastercode || prod.code || ''} ${prod.ProductName || ''}`.trim();
  };

  const getBoxInCarton = (productId) => {
    const prod = getProduct(productId);
    return parseInt(prod?.BoxinCarton) || 1;
  };

  const getDistributorName = () => {
    const distId = loadForm?.Distrbutor || loadForm?.Distributor;
    if (!distId) return loginVendor?.DistrbutorName || 'N/A';
    const dist = Distributors.find((d) => d._id === distId);
    if (dist) return dist.DistrbutorName || dist.name || distId;
    return loginVendor?.DistrbutorName || distId;
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

  const productMetrics = useMemo(() => {
    const rows = tableData.map((row) => {
      const boxInCarton = getBoxInCarton(row.product);
      const delivered = parseInt(row.DeliveredBox) || 0;
      const rtg = parseInt(row.RTGBox) || 0;
      const totalIssued = delivered + rtg;

      return {
        ...row,
        productCode : getProduct(row.product).mastercode,
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
  }, [tableData, Products]);

  const clientSummary = useMemo(() => {
    if (!invoicesData.length) return [];

    const grouped = {};

    invoicesData.forEach((inv) => {
      const cid = inv.Client;
      if (!grouped[cid]) {
        const c = Clients.find((cl) => cl._id === cid);
        const clientName = c ? (c.CutomerName || c.CustomorName || c.name || cid) : (cid || 'Unknown Client');

        grouped[cid] = {
          clientId: cid,
          code: c.code,
          name: clientName,
          invoiceCount: inv.DisSalesInvoice,
          RTGBox: 0,
          To: 0,
          RTGValue : 0,
          totalDeliveredBox: 0,
          totalGross: 0,
          totalNet: 0,
          SlabDiscount: 0,
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
  }, [invoicesData, Clients]);
  const clientTotals = useMemo(() => ({
    invoices: invoicesData.length,
    delivered: clientSummary.reduce((s, c) => s + c.totalDeliveredBox, 0),
    rtg: clientSummary.reduce((s, c) => s + c.RTGBox, 0),
    rtgValue: clientSummary.reduce((s, c) => s + c.RTGValue , 0),
    To: clientSummary.reduce((s, c) => s + c.To , 0),
    gross: clientSummary.reduce((s, c) => s + c.totalGross, 0),
    net: clientSummary.reduce((s, c) => s + c.totalNet, 0),
    SlabDiscount: clientSummary.reduce((s, c) => s + c.SlabDiscount, 0),
    Scheme: clientSummary.reduce((s, c) => s + (c.SpecialTO || 0), 0),
  }), [clientSummary, invoicesData.length]);

  const invoiceTotals = useMemo(() => ({
    totalBill: invoicesData.reduce((sum, row) => sum + (parseFloat(row?.Totalamount) || 0), 0),
    SlabDiscount: invoicesData.reduce((sum, row) => sum + (parseFloat(row?.SlabDiscount) || 0), 0),
    totalCash: invoicesData.reduce((sum, row) => sum + (parseFloat(row?.cashAmount) || 0), 0),
    totalChq: invoicesData.reduce((sum, row) => sum + (parseFloat(row?.Chq) || 0), 0),
  }), [invoicesData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Load Form...</p>
        </div>
      </div>
    );
  }

  if (!loadForm) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Load Form Not Found</h2>
          <p className="text-gray-600 mb-6">
            The load form you requested could not be found. It may have been deleted or not loaded yet.
          </p>
          <button
            onClick={() => navigate('/LoadFormList')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Load Forms
          </button>
        </div>
      </div>
    );
  }

  const status = loadForm.Status || loadForm.PostStatus || 'open';
  const statusColor = status.toLowerCase() === 'open' || status === true
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800';

  const loadFormNumber = loadForm.LoadFormNumber || loadForm.LoadForm || 'N/A';
  const { rows: productRows, totals: productTotals } = productMetrics;

  const handlePrint = () => {
    printLoadFormReport({
      loadFormNumber,
      orderBooker: loadFormOrderBooker,
      distributorName: getDistributorName(),
      orderDate: OrderDate,
      status,
      deliveryDate: loadForm.LoadFormDate,
      productRows,
      productTotals,
      clientRows: clientSummary,
      clientTotals,
      invoiceTotals,
      invoices: invoicesData,
    });
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });

      doc.setFontSize(16);
      doc.text(`Load Form Report - ${loadFormNumber}`, 14, 15);

      doc.setFontSize(10);
      doc.text(
        `Date: ${formatDate(loadForm.LoadFormDate)}  |  Distributor: ${getDistributorName()}  |  Status: ${status}`,
        14,
        22
      );

      const productBody = productRows.map((row) => [
        row.productName,
        row.ctn,
        row.box,
        row.totalIssued,
        row.rtgCtn,
        row.rtgBox,
        row.totalReturned,
        row.saleBox,
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['Product', 'CTN', 'BOX', 'Total Issued', 'RTG CTN', 'RTG Box', 'Total Returned', 'Sale Box']],
        body: productBody,
        foot: [[
          'TOTAL',
          productTotals.ctn,
          productTotals.box,
          productTotals.totalIssued,
          productTotals.rtgCtn,
          productTotals.rtgBox,
          productTotals.totalReturned,
          productTotals.saleBox,
        ]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        showFoot: 'lastPage',
        footStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: 'bold' },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
        },
      });

      const clientBody = clientSummary.map((c) => [
        c.name,
        c.invoiceCount,
        c.totalDeliveredBox,
        c.RTGBox,
        c.totalGross.toFixed(2),
        Number(c.SpecialTO || 0).toFixed(2),
        c.totalNet.toFixed(2),
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Client', 'Invoices', 'Delivered Box', 'RTG Box', 'Gross Amount', 'Scheme', 'Net Sale']],
        body: clientBody,
        foot: [[
          'TOTAL',
          clientTotals.invoices,
          clientTotals.delivered,
          clientTotals.rtg,
          clientTotals.gross.toFixed(2),
          Number(clientTotals.Scheme || 0).toFixed(2),
          clientTotals.net.toFixed(2),
        ]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        showFoot: 'lastPage',
        footStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: 'bold' },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
      });

      doc.save(`LoadForm_${loadFormNumber}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF export failed. Using browser print instead.');
      handlePrint();
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen print:p-0 print:bg-white">
      <style>{`@media print { #load-form-report tfoot { display: table-row-group; } }`}</style>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Load Form View</h1>
          <p className="text-gray-500 mt-1 text-sm">Detailed view of the load form record</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/LoadFormList')}
            className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
          >
            Back to List
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
          >
            Export PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
          >
            Print
          </button>
        </div>
      </div>

      <div id="load-form-report">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-6 print:shadow-none print:rounded-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-gray-500">Load Form Number</span>
              <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
                {loadFormNumber}
              </h2>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-sm font-semibold ${statusColor}`}>
              {String(status).toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-1">DATE</label>
              <p className="text-base font-medium text-gray-800">{formatDate(loadForm.LoadFormDate)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-1">DISTRIBUTOR</label>
              <p className="text-base font-medium text-gray-800">{getDistributorName()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-1">PRODUCTS</label>
              <p className="text-base font-medium text-gray-800">{productRows.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-1">CLIENTS</label>
              <p className="text-base font-medium text-gray-800">{clientSummary.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-1">INVOICES</label>
              <p className="text-base font-medium text-gray-800">{invoicesData.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 print:shadow-none print:rounded-none">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-lg text-gray-800">Product Summary</h3>
            <span className="text-sm text-gray-500">{productRows.length} product(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">CTN</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">BOX</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Issued</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">RTG CTN</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">RTG Box</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Returned</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Sale Box</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productRows.length > 0 ? (
                  productRows.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.productName}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 text-right tabular-nums">{row.ctn}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 text-right tabular-nums">{row.box}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 text-right tabular-nums font-medium">{row.totalIssued}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 text-right tabular-nums">{row.rtgCtn}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 text-right tabular-nums">{row.rtgBox}</td>
                      <td className="px-3 py-3 text-sm text-orange-600 text-right tabular-nums">{row.totalReturned}</td>
                      <td className="px-3 py-3 text-sm text-green-700 text-right tabular-nums font-medium">{row.saleBox}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      No line items found in this load form.
                    </td>
                  </tr>
                )}
              </tbody>
              {productRows.length > 0 && (
                <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">TOTAL</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-900">{productTotals.ctn}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-900">{productTotals.box}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-900">{productTotals.totalIssued}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-900">{productTotals.rtgCtn}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-900">{productTotals.rtgBox}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-orange-700">{productTotals.totalReturned}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-green-700">{productTotals.saleBox}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {clientSummary.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 print:shadow-none print:rounded-none">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-gray-800">Client Summary</h3>
              <span className="text-sm text-gray-500">
                {clientSummary.length} client(s) | {invoicesData.length} invoice(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Client</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase">Invoices</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Delivered Box</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">RTG Box</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Gross Amount</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Scheme</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Net Sale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientSummary.map((c, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{c.invoiceCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.totalDeliveredBox}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-orange-600">{c.RTGBox}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.totalGross.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-blue-600">{Number(c.SpecialTO || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-green-700">{c.totalNet.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-center font-bold tabular-nums">{clientTotals.invoices}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{clientTotals.delivered}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-orange-700">{clientTotals.rtg}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{clientTotals.gross.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-blue-700">{Number(clientTotals.Scheme || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-green-700">{clientTotals.net.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-3 print:hidden">
        <button
          onClick={() => navigate('/LoadFormList')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Back to Load Form List
        </button>
      </div>
    </div>
  );
};

export default LoadFormView;
