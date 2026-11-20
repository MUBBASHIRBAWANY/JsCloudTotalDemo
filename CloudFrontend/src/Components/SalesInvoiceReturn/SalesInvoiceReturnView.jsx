import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';

const SalesInvoiceReturnView = () => {
  const { id } = useParams();
  const Clients = useSelector((state) => state.Client.client);
  const Products = useSelector((state) => state.Product.product);
  const SalesReturns = useSelector((state) => state.SalesInvoiceReturn.SalesInvoiceReturn);
  const Locations = useSelector((state) => state.Location.Location);
  const Stores = useSelector((state) => state.Store.Store);
  const AllProduct = useSelector((state) => state.TotalProducts.TotalProducts)
  const findReturn = SalesReturns.find((item) => item._id === id);
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    if (findReturn) {
      setTableData(findReturn.SalesReturnData || []);
    }
  }, [findReturn]);

  const findClient = Clients.find((item) => item._id === findReturn?.Client);
  const findLocation = Locations.find((item) => item._id === findReturn?.Location);
  const findStore = Stores.find((item) => item._id === findReturn?.Store);
  const navigate = useNavigate()

  // -------- TOTALS --------
  const totalUnit = tableData.reduce((sum, row) => sum + Number(row.unit || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + Number(row.carton || 0), 0);
  const totalBox = tableData.reduce((sum, row) => sum + Number(row.box || 0), 0);
  const totalValueExclGst = tableData.reduce((sum, row) => sum + Number(row.TotalValueExclGst || 0), 0);
  const totalGst = tableData.reduce((sum, row) => sum + Number(row.Gst || 0), 0);
  const totalDiscount = tableData.reduce((sum, row) => sum + Number(row.discount || 0), 0);
  const totalAdvanceTax = tableData.reduce((sum, row) => sum + Number(row.AdvanceTax || 0), 0);
  const totalNetAmount = tableData.reduce((sum, row) => sum + Number(row.netAmunt || 0), 0);

  const handlePrint = () => {
    const printContent = document.getElementById("salesReturnView")?.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
    <html>
      <head>
        <title>Sales Return - ${findReturn?.SalesReturnNumber || ''}</title>
        <style>
          @media print {
            @page {
              size: A4 landscape;
              margin: 5mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.5;
            margin: 20px;
          }
          .invoice-title {
            text-align: center;
            font-size: 20px;
            margin: 20px 0;
            font-weight: bold;
            letter-spacing: 1px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            gap: 40px;
            margin-bottom: 20px;
            font-size: 13px;
          }
          .details-column {
            width: 48%;
          }
          .invoice-details p {
            margin: 3px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 5px 6px;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
          }
          td {
            text-align: right;
          }
          td:first-child {
            text-align: left;
          }
          .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
          }
          .print-footer {
            font-size: 9px;
            text-align: center;
            color: #555;
            border-top: 1px solid #ccc;
            padding: 8px 0;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="invoice-title">SALES INVOICE RETURN</div>

        <div class="invoice-details">
          <div class="details-column">
            <p><strong>Return No:</strong> ${findReturn?.SalesReturnNumber || ''}</p>
            <p><strong>Date:</strong> ${findReturn?.SalesInvoiceReturnDate || ''}</p>
            <p><strong>Client:</strong> ${findClient ? `${findClient.CutomerName || findClient.DistrbutorName} ${findClient.code}` : ''}</p>
            <p><strong>Reference:</strong> ${findReturn?.SalesFlowRef || ''}</p>
          </div>
          <div class="details-column">
            <p><strong>Location:</strong> ${findLocation?.LocationName || ''}</p>
            <p><strong>Department:</strong> ${findStore?.StoreName || ''}</p>
            <p><strong>Condition:</strong> ${findReturn?.Damage || 'Fresh'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left">Product</th>
              <th>Rate</th>
              <th>Unit</th>
              <th>Carton</th>
              <th>Pcs</th>
              <th>Value Excl GST</th>
              <th>GST</th>
              <th>Discount</th>
              <th>Adv Tax</th>
              <th>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableData.map(row => {
              const product = Products.find((p) => p._id === row.product);
              return '<tr>' +
                '<td style="text-align:left">' + (product ? product.mastercode + ' ' + product.ProductName : '-') + '</td>' +
                '<td>' + Number(row.rate || 0).toLocaleString() + '</td>' +
                '<td>' + (row.unit || 0) + '</td>' +
                '<td>' + (row.carton || 0) + '</td>' +
                '<td>' + (row.box || 0) + '</td>' +
                '<td>' + Number(row.TotalValueExclGst || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>' +
                '<td>' + Number(row.Gst || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>' +
                '<td>' + Number(row.discount || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>' +
                '<td>' + Number(row.AdvanceTax || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>' +
                '<td>' + Number(row.netAmunt || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>' +
                '</tr>';
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td style="text-align:left;font-weight:bold">TOTAL</td>
              <td></td>
              <td style="text-align:center;font-weight:bold">${totalUnit}</td>
              <td style="text-align:center;font-weight:bold">${totalCarton}</td>
              <td style="text-align:center;font-weight:bold">${totalBox}</td>
              <td style="font-weight:bold">${totalValueExclGst.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
              <td style="font-weight:bold">${totalGst.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
              <td style="font-weight:bold">${totalDiscount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
              <td style="font-weight:bold">${totalAdvanceTax.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
              <td style="font-weight:bold">${totalNetAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
            </tr>
          </tfoot>
        </table>

        <div class="print-footer">
          <p>This is a computer generated document - Signature not required</p>
        </div>
      </body>
    </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handlePostStatusChange = async (status) => {

    try {
      const payload = {
        SalesReturnNumber: findReturn.SalesReturnNumber,
        Store: findReturn.Store,
        Location: findReturn.Location,
        id: findReturn._id,
        status,
        SalesReturnData: findReturn.SalesReturnData,
        Condition: findReturn.Condition
      };
      const rate = payload.SalesReturnData.map((item) => {
        const stock = AllProduct.find((p) => p.ProductName === item.product && p.Store === payload.Store && p.Location === payload.Location);
        const avgRate = Number(stock?.AvgRate) || 0;
        const qty = Number(item.totalBox) || 0;
        return {
          product: item.product,
          value: (avgRate * qty).toFixed(4)
        };
      });

      const totalCost = Number(parseFloat(rate.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0)).toFixed(4));

      const CostVoucherData = {
        VoucherType: "RSO",
        VoucherNumber: `RSO${payload.SalesReturnNumber}`,
        VoucherDate: findReturn.SalesInvoiceReturnDate,
        status: "Post",
        Store: payload.Store,
        VoucharData: [
          {
            Account: Admin.finishedGoods,
            Debit: totalCost,
            store: payload.Store
          },
          {
            Account: Admin.COSTOFSALES,
            Credit: totalCost,
            store: payload.Store
          },
        ]
      }
      //console.log(CostVoucherData)

      const VoucharData = [

        {
          Account: Admin.Client,
          Credit: (Number(parseFloat(findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0)).toFixed(4))),
          store: findReturn.Store,
        },
        {
          Account: Admin.SaleDiscount,
          Credit: findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0) - findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.diBspass) || 0), 0)
            + findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.TTS) || 0), 0),
          store: findReturn.Store,
        },
        {
          Account: Admin.salesRevenue,
          Debit: findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.TotalValueExclGst) || 0), 0),
          store: findReturn.Store,
        },
        {
          Account: Admin.Gst,
          Debit: findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0),
          store: findReturn.Store,
        },
        {
          Account: Admin.AdvanceTax,
          Debit: parseFloat(findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.AdvanceTax) || 0), 0).toFixed(4)),
          store: findReturn.Store,
        }

      ].filter(
        item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
      )
      //console.log(VoucharData)
      const AccountsData = {
        VoucherType: "SR",
        VoucherNumber: `SR${payload.SalesReturnNumber}`,
        VoucherDate: findReturn.SalesInvoiceReturnDate,
        status: "Post",
        VoucharData: VoucharData

      }

      const res = await updateDataFunction(`/SalesInvoiceReturn/ChangeStatus/${id}`, payload);
      if (payload.status == true) {
        const CostVoucher = await createDataFunction("/Voucher/createSystemVoucher", CostVoucherData)
        const Voucher = await createDataFunction("/Voucher/createSystemVoucher", AccountsData)
      }
      toast.success(status ? 'Posted successfully' : 'Unposted successfully');
      setTimeout((navigate('/SalesReturnList'),
        5000))
    } catch (err) {
      const error = err?.response?.data?.errors;
      if (error) {
        try {
          const productName = Products.find((item) => item._id == error[0])?.ProductName || 'Unknown';
          toast.error(`This product not available: ${productName}`);
        } catch {
          const errorDetails = error[0][0];
          const productName = Products.find((item) => item._id == errorDetails.product)?.ProductName || 'Unknown';
          toast.error(`Qty of ${productName} available: ${errorDetails.qty}, required: ${errorDetails.Req} Boxes`);
        }
      }
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:pd-page-title text-center mb-6">
        View Sales Invoice Return
      </h1>

      {findReturn?.PostStatus === false ? (
        <div className="flex justify-end mb-4 space-x-4">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-300"
            onClick={handlePrint}
          >
            Print
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-300"
            onClick={() => handlePostStatusChange(true)}
          >
            Post
          </button>
        </div>
      ) : (
        <div className="flex justify-end mb-4 space-x-4">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-300"
            onClick={handlePrint}
          >
            Print
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-300"
            onClick={() => handlePostStatusChange(false)}
          >
            Unpost
          </button>
        </div>
      )}

      <div className="pd-card p-4 md:p-6 mb-6" id="salesReturnView">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="pd-label">Return Date</label>
            <div className="p-2 pd-bg-muted rounded">{findReturn?.SalesInvoiceReturnDate || '-'}</div>
          </div>
          <div>
            <label className="pd-label">Client</label>
            <div className="p-2 pd-bg-muted rounded">
              {findClient ? `${findClient.CutomerName || findClient.DistrbutorName} ${findClient.code}` : '-'}
            </div>
          </div>
          <div>
            <label className="pd-label">Return No</label>
            <div className="p-2 pd-bg-muted rounded">{findReturn?.SalesReturnNumber || '-'}</div>
          </div>
          <div>
            <label className="pd-label">Reference</label>
            <div className="p-2 pd-bg-muted rounded">{findReturn?.SalesFlowRef || '-'}</div>
          </div>
          <div>
            <label className="pd-label">Location</label>
            <div className="p-2 pd-bg-muted rounded">{findLocation?.LocationName || '-'}</div>
          </div>
          <div>
            <label className="pd-label">Department</label>
            <div className="p-2 pd-bg-muted rounded">{findStore?.StoreName || '-'}</div>
          </div>
          <div>
            <label className="pd-label">Condition</label>
            <div className="p-2 pd-bg-muted rounded">{findReturn?.Damage || 'Fresh'}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2">Rate</th>
                <th className="border p-2">Unit</th>
                <th className="border p-2">Carton</th>
                <th className="border p-2">Pcs</th>
                <th className="border p-2">Value Excl GST</th>
                <th className="border p-2">GST</th>
                <th className="border p-2">Discount</th>
                <th className="border p-2">Advance Tax</th>
                <th className="border p-2">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => {
                const product = Products.find((p) => p._id === row.product);
                return (
                  <tr key={row.id || index}>
                    <td className="border p-2">
                      {product ? `${product.mastercode} ${product.ProductName}` : '-'}
                    </td>
                    <td className="border p-2">{row.rate || 0}</td>
                    <td className="border p-2">{row.unit || 0}</td>
                    <td className="border p-2">{row.carton || 0}</td>
                    <td className="border p-2">{row.box || 0}</td>
                    <td className="border p-2">{row.TotalValueExclGst?.toFixed(2) || 0}</td>
                    <td className="border p-2">{row.Gst?.toFixed(2) || 0}</td>
                    <td className="border p-2">{row.discount?.toFixed(2) || 0}</td>
                    <td className="border p-2">{row.AdvanceTax?.toFixed(2) || 0}</td>
                    <td className="border p-2">{row.netAmunt?.toFixed(2) || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceReturnView;
