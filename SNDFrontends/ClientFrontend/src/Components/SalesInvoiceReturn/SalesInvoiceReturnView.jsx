import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from "docx";
import { toast } from "react-toastify";
import { getDataFundtion, updateDataFunction } from "../../Api/CurdFunctions";

const SalesInvoiceReturnView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const Client = useSelector((state) => state.Client.client);
  const Products = useSelector((state) => state.Product.product);
  const SalesInvoiceReturn = useSelector(
    (state) => state.SalesInvoiceReturn.SalesInvoiceReturn
  );
  const findReturn = SalesInvoiceReturn.find((item) => item._id === id);
  const location = useSelector((state) => state.Location.Location);
  const Store = useSelector((state) => state.Store.Store);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const [status, setStatus] = useState(false);
  const [voucherData , setVoucherData] = useState({})
  
  const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)


  // Hooks hamesha render ke start par call hone chahiye (conditional return ke baad nahi)
  // — warna React "Rendered fewer hooks" error dekar component crash kar deta hai
  useEffect(() => {
    if (findReturn) {
      setStatus(findReturn.PostStatus)
    }
  }, [findReturn])

  if (!findReturn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-xl">Loading return data...</span>
      </div>
    );
  }
  // Find client information
  const client = Client.find((item) => item._id === findReturn.Client);
  const clientLabel = client ? `${client.CutomerName} ${client.code}` : '';

  // Prepare table data with product names
  const tableData = (findReturn.SalesReturnData || []).map(row => {
    const product = Products.find(p => p._id === row.product);
    return {
      ...row,
      productName: product ? product.ProductName : 'Unknown Product'
    };
  });

  // Calculate totals
  const TotalnetAmunt = tableData.reduce(
    (sum, row) => sum + (parseFloat(row.netAmunt) || 0),
    0
  );
  const totalDiscount = tableData.reduce(
    (sum, row) => sum + (parseFloat(row.discount) || 0),
    0
  );
  const totalCarton = tableData.reduce(
    (sum, row) => sum + (parseInt(row.carton) || 0),
    0
  );

  // Find location and store
  const findLocation = location.find(
    (item) => item._id === findReturn?.Location
  );
  
  const locationName = findLocation?.LocationName || "";

  const findStore = Store.find((item) => item._id === findReturn?.Store);
  const storeName = findStore?.StoreName || "";

  const defultStore = Store.find((item) => item._id == loginVendor.Store[0]);
  const storeLabel = defultStore?.StoreName || "";

  // Export functions
  const exportPDF = () => {
    const doc = new jsPDF();

    // Header information
    doc.setFontSize(16);
    doc.text(`Sales Return: ${findReturn.SalesReturnNumber || 'N/A'}`, 105, 15, null, null, 'center');
    doc.setFontSize(10);

    // Company and client info
    doc.text(`Location: ${locationName}`, 14, 25);
    doc.text(`Store: ${storeName || storeLabel}`, 14, 30);
    doc.text(`Date: ${findReturn.SalesInvoiceReturnDate}`, 14, 35);
    doc.text(`Client: ${clientLabel}`, 14, 40);
    doc.text(`Invoice Ref: ${findReturn.InvoiceRef || 'N/A'}`, 14, 45);

    // Table
    autoTable(doc, {
      startY: 50,
      head: [["Product", "CTN", "Return", "Rate", "Discount", "GST", "Net Amount"]],
      body: tableData.map(r => [
        r.productName,
        r.carton,
        r.return,
        r.Rate,
        r.discount,
        r.Gst,
        r.netAmunt
      ]),
      foot: [["Total", totalCarton, "", "", totalDiscount, "", TotalnetAmunt]],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`SalesReturn-${findReturn.SalesReturnNumber || 'document'}.pdf`);
  };

  // Excel Export
  const exportExcel = () => {
    const worksheetData = [
      ["Sales Return Details"],
      [`Return Number: ${findReturn.SalesReturnNumber || 'N/A'}`],
      [`Date: ${findReturn.SalesInvoiceReturnDate}`],
      [`Client: ${clientLabel}`],
      [`Invoice Ref: ${findReturn.InvoiceRef || 'N/A'}`],
      [],
      ["Product", "CTN", "Return", "Rate", "Discount", "GST", "Net Amount"]
    ];

    // Add rows
    tableData.forEach(row => {
      worksheetData.push([
        row.productName,
        row.carton,
        row.return,
        row.Rate,
        row.discount,
        row.Gst,
        row.netAmunt
      ]);
    });

    // Add totals row
    worksheetData.push([
      "Total",
      totalCarton,
      "",
      "",
      totalDiscount,
      "",
      TotalnetAmunt
    ]);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Return");
    XLSX.writeFile(wb, `SalesReturn-${findReturn.SalesReturnNumber || 'document'}.xlsx`);
  };

  // Word Export
  const exportWord = async () => {
    const tableRows = tableData.map(row =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(row.productName)] }),
          new TableCell({ children: [new Paragraph(String(row.carton))] }),
          new TableCell({ children: [new Paragraph(String(row.return))] }),
          new TableCell({ children: [new Paragraph(String(row.Rate))] }),
          new TableCell({ children: [new Paragraph(String(row.discount))] }),
          new TableCell({ children: [new Paragraph(String(row.Gst))] }),
          new TableCell({ children: [new Paragraph(String(row.netAmunt))] }),
        ]
      })
    );

    // Add totals row
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Total")] }),
          new TableCell({ children: [new Paragraph(String(totalCarton))] }),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph(String(totalDiscount))] }),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph(String(TotalnetAmunt))] }),
        ]
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "Sales Return Details",
            heading: "Heading1",
            alignment: "center"
          }),
          new Paragraph({
            text: `Return Number: ${findReturn.SalesReturnNumber || 'N/A'}`,
            spacing: { after: 100 }
          }),
          new Paragraph(`Date: ${findReturn.SalesInvoiceReturnDate}`),
          new Paragraph(`Client: ${clientLabel}`),
          new Paragraph(`Invoice Ref: ${findReturn.InvoiceRef || 'N/A'}`),
          new Paragraph(""),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Product")] }),
                  new TableCell({ children: [new Paragraph("CTN")] }),
                  new TableCell({ children: [new Paragraph("Return")] }),
                  new TableCell({ children: [new Paragraph("Rate")] }),
                  new TableCell({ children: [new Paragraph("Discount")] }),
                  new TableCell({ children: [new Paragraph("GST")] }),
                  new TableCell({ children: [new Paragraph("Net Amount")] }),
                ]
              }),
              ...tableRows
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SalesReturn-${findReturn.SalesReturnNumber || 'document'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print
  const handlePrint = () => {
    const printContent = document.getElementById("printArea").innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Return - ${findReturn.SalesReturnNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .print-header { text-align: center; margin-bottom: 20px; }
          .print-header h1 { font-size: 24px; margin: 0; }
          .print-details { margin-bottom: 20px; }
          .print-table { width: 100%; border-collapse: collapse; }
          .print-table th, .print-table td { border: 1px solid #000; padding: 8px; text-align: center; }
          .print-table th { background-color: #f0f0f0; }
          .print-footer { margin-top: 30px; text-align: right; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>Sales Return</h1>
          <h2>${findReturn.SalesReturnNumber || 'N/A'}</h2>
        </div>
        
        <div class="print-details">
          <p><strong>Date:</strong> ${findReturn.SalesInvoiceReturnDate}</p>
          <p><strong>Client:</strong> ${clientLabel}</p>
          <p><strong>Invoice Ref:</strong> ${findReturn.InvoiceRef || 'N/A'}</p>
          <p><strong>Location:</strong> ${locationName}</p>
          <p><strong>Store:</strong> ${storeName || storeLabel}</p>
        </div>
        
        <table class="print-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>CTN</th>
              <th>Return</th>
              <th>Rate</th>
              <th>Discount</th>
              <th>GST</th>
              <th>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableData.map(row => `
              <tr>
                <td>${row.productName}</td>
                <td>${row.carton}</td>
                <td>${row.return}</td>
                <td>${row.Rate}</td>
                <td>${row.discount}</td>
                <td>${row.Gst}</td>
                <td>${row.netAmunt}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>${totalCarton}</strong></td>
              <td></td>
              <td></td>
              <td><strong>${totalDiscount}</strong></td>
              <td></td>
              <td><strong>${TotalnetAmunt}</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div class="print-footer">
          <p>Printed on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    window.print();
    document.body.innerHTML = originalContent;
  };

  const handlePostUnpost = async (val) => {
    console.log(val)


    const ReturnData = {
      inv: findReturn.InvoiceRef,
      id: findReturn._id,
      Store: findReturn.Store,
      Location: findReturn.Location,
      returnData: findReturn.SalesReturnData,
      InvoiceRef: findReturn.InvoiceRef,
      SalesReturnData: findReturn.SalesReturnData,
      status: val,
      AccountsData: {
        VoucherType: "Slr",
        VoucherNumber: `Slr${findReturn.SalesReturnNumber}`,
        status: "Post",
        VoucherDate: findReturn.SalesInvoiceReturnDate,
        VoucharData: [
          {
            Account: Accounts.find((val) => val.AccountCode == Client.find((item) => item._id === findReturn.Client)?.AccountCode)?._id,
            Credit: findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0),
            store: findReturn.Store,
            Narration: findReturn.Remarks,
          },
          {
            Account: Admin.finishedGoods,
            Debit: findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0) + findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0),
            store: findReturn.Store,
            Narration: findReturn.Remarks,
          },
          {
            Account: Admin.PurchaseDiscount,
            Credit: findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0),
            store: findReturn.Store,
            Narration: findReturn.Remarks,
          },
          {
            Account: Admin.Gst,
            Debit: findReturn.SalesReturnData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0),
            store: findReturn.Store,
            Narration: findReturn.Remarks,
          },
        ]
          .filter(
            item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
          )

      }
    }
    console.log(ReturnData)
    try {
      const res = await updateDataFunction(`/SalesInvoiceReturn/Changestatus/${ReturnData.id}`, ReturnData)
      toast.success("Status Updated")
      setStatus(val)
      setTimeout(() => {
        navigate("/SalesReturnList")
      }, 2000)
    } catch (err) {
      toast.error("Some Thing Went Wrong")
      console.log(err)
    }

  }
const Voucher = async (val) =>{
  try{
    const getData = await getDataFundtion(`/Voucher/getVoucherByNumber/Slr${val}`)
    console.log(getData)
    setVoucherData(getData.data[0])
  }catch(err){

  }
}
  return (
    <div className="p-4">
      <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800 mb-6">
        View Sales Return
      </h1>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-end mb-4">
        {status === false && (
          <>
            <button
              onClick={() => handlePostUnpost(true)}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Post Invoice
            </button>
          </>
        )}
        {status === true && (
          <>
            <button
              onClick={() => Voucher(findReturn.SalesReturnNumber)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Voucher
            </button>
            <button
              onClick={() => handlePostUnpost(false)}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Unpost Invoice
            </button>
          </>
        )}
        <button onClick={exportPDF} className="bg-red-500 text-white px-4 py-2 rounded">PDF</button>
        <button onClick={exportExcel} className="bg-green-500 text-white px-4 py-2 rounded">Excel</button>
        <button onClick={exportWord} className="bg-blue-500 text-white px-4 py-2 rounded">Word</button>
        <button onClick={handlePrint} className="bg-gray-500 text-white px-4 py-2 rounded">Print</button>
      </div>

      <div id="printArea" className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Return Number
            </label>
            <div className="w-full px-4 py-2 border rounded-lg bg-gray-50">
              {findReturn.SalesReturnNumber || "N/A"}
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Return Date
            </label>
            <div className="w-full px-4 py-2 border rounded-lg bg-gray-50">
              {findReturn.SalesInvoiceReturnDate}
            </div>
          </div>
          <div>
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">
              Client
            </label>
            <div className="w-full px-4 py-2 border rounded-lg bg-gray-50">
              {clientLabel}
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Invoice Reference
            </label>
            <div className="w-full px-4 py-2 border rounded-lg bg-gray-50">
              {findReturn.InvoiceRef || "N/A"}
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Location
            </label>
            <div className="w-full px-4 py-2 border rounded-lg bg-gray-50">
              {locationName}
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Store
            </label>
            <div className="w-full px-4 py-2 border rounded-lg bg-gray-50">
              {storeName || storeLabel}
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
             Remarks
            </label>
            <div className="w-full px-4 py-2 border rounded-lg bg-gray-50">
              {findReturn.Remarks}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Product</th>
                <th className="border p-2">CTN</th>
                <th className="border p-2">Return</th>
                <th className="border p-2">Rate</th>
                <th className="border p-2">Discount</th>
                <th className="border p-2">GST</th>
                <th className="border p-2">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    {row.productName}
                  </td>
                  <td className="border p-2 text-center">{row.carton}</td>
                  <td className="border p-2 text-center">{row.return}</td>
                  <td className="border p-2 text-center">{row.Rate}</td>
                  <td className="border p-2 text-center">{row.discount}</td>
                  <td className="border p-2 text-center">{row.Gst}</td>
                  <td className="border p-2 text-center">{row.netAmunt}</td>
                </tr>
              ))}
            </tbody>
            {tableData.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border p-2">Total</td>
                  <td className="border p-2 text-center">{totalCarton}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2 text-center">{totalDiscount}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2 text-center">{TotalnetAmunt}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate("/SalesReturnList")}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to List
          </button>
        </div>
      </div>
      {voucherData?.VoucherNumber ?
        <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-[5vw]">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">📄 Voucher Details</h2>
            <div className="grid grid-cols-2 gap-4 text-gray-700">
              <div><strong>Voucher Number:</strong>{voucherData?.VoucherNumber}</div>
              <div><strong>Voucher Date:</strong> {voucherData?.VoucherDate}</div>
              <div><strong>Voucher Type:</strong> {voucherData?.VoucherType}</div>
              <div><strong>Status:</strong> {voucherData?.status}</div>
            </div>
          </div>

          {/* Table */}
          <div className=''>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">💰 Voucher Entries</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 border">#</th>
                    <th className="px-4 py-2 border">Account</th>
                    <th className="px-4 py-2 border">Debit</th>
                    <th className="px-4 py-2 border">Credit</th>
                  </tr>
                </thead>
                <tbody>

                  {voucherData.VoucharData?.map((item, index) => (

                    <tr key={index} className="text-center hover:bg-gray-50">
                      <td className="px-4 py-2 border">{index + 1}</td>
                      <td className="px-4 py-2 border">{Accounts.find((ac) => ac._id === item.Account)?.AccountName}({Accounts.find((ac) => ac._id === item.Account)?.AccountCode})</td>
                      <td className="px-4 py-2 border">
                        {item.Debit !== undefined ? item.Debit.toLocaleString() : '–'}
                      </td>
                      <td className="px-4 py-2 border">
                        {item.Credit !== undefined ? item.Credit.toLocaleString() : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <td className="px-4 py-2 border"> </td>
                  <td className="px-4  border text-center font-bold text-[20px] py-[5px]">Total </td>
                  <td className="px-4 py-2 border text-center">{voucherData?.VoucharData?.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0)} </td>
                  <td className="px-4 py-2 border text-center">{voucherData?.VoucharData?.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0)} </td>


                </tfoot>
              </table>
            </div>
          </div>
        </div>
        : null}
    </div>
  );
};

export default SalesInvoiceReturnView;