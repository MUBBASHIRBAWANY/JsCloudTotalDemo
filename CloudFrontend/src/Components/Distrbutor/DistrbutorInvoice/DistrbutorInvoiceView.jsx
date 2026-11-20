import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from "react-toastify";
import { getDataFundtion, SndcreateDataFunction, updateDataFunction } from "../../../Api/CRUDFunctions";

const DistrbutorInvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoiceIndex, setInvoiceIndex] = useState(-1);
  const Products = useSelector((state) => state.Product.product);
  const Stores = useSelector((state) => state.Store.Store);
  const City = useSelector((state) => state.City.City)
  const [Remarks, setRemarks] = useState("")
  const DistributorList = useSelector(
    (state) => state.DistributroReducers.DistributroReducers
  );
  const Invoices = useSelector(
    (state) => state.DitributorInvoice.DitributorInvoice
  );

  const DistributorOrderBooker = useSelector(
    (state) => state.DistributorOrderBooker.DistributorOrderBooker
  );


  const [Invoice, setInvoice] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [Builty, setBuilty] = useState({});
  const [BeforeInvoice, setBeforeInvoice] = useState(0);
  const [view, setview] = useState(false);


  const [disabled, setdisabled] = useState(false);











  useEffect(() => {
    if (Invoices.length && id) {
      const index = Invoices.findIndex(item => item._id === id);
      setInvoiceIndex(index);
    }
  }, [Invoices, id]);

  const invoicesRef = useRef(Invoices);
  invoicesRef.current = Invoices;

  useEffect(() => {
    let cancelled = false;
    const apply = (found) => {
      if (cancelled || !found) return;
      setInvoice(found);
      setTableData(found.InvoiceData || []);
    };
    const load = async () => {
      if (!id) return;
      try {
        apply(await getDataFundtion(`/DistrbutorInvoice/${id}`));
      } catch (err) {
        const cached = invoicesRef.current.find((item) => item._id === id && Array.isArray(item.InvoiceData));
        if (cached) apply(cached);
        else {
          console.error(err);
          toast.error("Invoice load nahi hui");
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleNext = () => {
    if (invoiceIndex < Invoices.length - 1) {
      const nextId = Invoices[invoiceIndex + 1]._id;
      navigate(`/DistrbutorInvoiceView/${nextId}`);
    }
  };

  const handlePrev = () => {
    if (invoiceIndex > 0) {
      const prevId = Invoices[invoiceIndex - 1]._id;
      navigate(`/DistrbutorInvoiceView/${prevId}`);
    }
  };
  const loadInvoiceOptions = (inputValue, callback) => {
    const filtered = Invoices.filter(inv =>
      inv.DitributorInvoiceCode
        ?.toLowerCase()
        .includes(inputValue.toLowerCase())
    );

    const options = filtered.map(inv => ({
      label: inv.DitributorInvoiceCode,
      value: inv._id
    }));

    callback(options);
  };
  const handleInvoiceChange = (selectedOption) => {
    if (selectedOption) {
      navigate(`/DistrbutorInvoiceView/${selectedOption.value}`);
    }
  };
  useEffect(() => {
    setview(false)
    if (!Invoice?.DcNumber) return;
    const getBUily = async () => {
      try {


        const ClientlBalance = await getDataFundtion(`/GernalLager/ClientlBalance?startDate=${Invoice.InvoiceDate}&endDate=${Invoice.InvoiceDate}&Client=${Invoice.Distrbutor}`)
        console.log(ClientlBalance)

        const BeforeInvoice = ClientlBalance.data.totalBalance - Invoice.TotalAmount
        setBeforeInvoice(BeforeInvoice)
        const Buitly = await getDataFundtion(
          `DcOrder/getBuiltyNumber/${Invoice.DcNumber}`
        );

        const Remarks = await getDataFundtion(
          `DistributorSaleOrder/getRemarks/${Buitly.DCData[0].Order}`
        );
        console.log(Remarks?.Remarks, "Advance Remarks")
        if (Remarks?.Remarks.startsWith("Remarks")) {
          setRemarks(Remarks?.Remarks?.slice(8).trim());
        } else {
          setRemarks(Remarks?.Remarks);
        }
        setBuilty(Buitly);
        setview(true)
      } catch (err) {
        console.log(err);
      }
    };

    getBUily();
  }, [Invoice]);
  const printRef = useRef();
  if (!Invoice) return <div className="p-4">Loading...</div>;

  const distributorObj = DistributorList.find(
    (x) => x._id === Invoice.Distrbutor
  );
  
  const storeObj = Stores.find((x) => x._id === Invoice.Store);


  // -------- TOTALS --------
  const TotalAmount = tableData.reduce(
    (sum, row) => sum + Number(row.Amount || 0),
    0
  );

  const totalDiscount = tableData.reduce(
    (sum, row) => sum + Number(row.discount || 0),
    0
  );
  const totalSpecialTO = tableData.reduce(
    (sum, row) => sum + Number(row.SpecialTO || 0),
    0
  );
  const totalSpecialDiscount = tableData.reduce(
    (sum, row) => sum + Number(row.specialdiscount || 0),
    0
  );

  const totalNetAmount = TotalAmount - totalDiscount - totalSpecialTO;

  const totalCarton = tableData.reduce(
    (sum, row) => sum + Number(row.carton || 0),
    0
  );

  const totalBox = tableData.reduce(
    (sum, row) => sum + Number(row.box || 0),
    0
  );

  const totalFreeBox = tableData.reduce(
    (sum, row) => sum + Number(row.FreeBox || row.freeBox || 0),
    0
  );
  const showFreeBox = tableData.some(
    (row) => Number(row.FreeBox || row.freeBox || 0) > 0
  );


  // -------- PRINT --------
  const handlePrint = () => {
    const printContent = document.getElementById("dcView")?.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    printWindow.document.write(`
    <html>
      <head>
        <title>Invoice - ${Invoice.DitributorInvoiceCode}</title>
        <style>
          @media print {
            @page {
              size: A4 portrait;
              margin: 5mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: Arial, sans-serif;
              margin-left: 30px;
              margin-right: 30px;
            }
            .print-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
            }
          }

          body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.5;
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
            margin-bottom: 20px;
             font-size: 14px;
          }

          .invoice-details p {
            margin: 3px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 6px 8px;
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

          .summary {
            margin-top: 20px;
             font-size: 14px;
            border-top: 2px solid #333;
            padding-top: 10px;
            width: 260px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
             font-size: 14px;
            margin: 4px 0;
          }
         
          .table{
           font-weight: bold;
          }
           .invoice-detail {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  margin-bottom: 20px;
  font-size: 14px;
}

.details-column {
  width: 48%;
}
  .summary-container{
  display:flex;
  justify-content:space-between;
  margin-top:20px;
  gap:40px;
}

.summary-box{
  width:45%;
  border-top:2px solid #333;
  padding-top:10px;
}

.summary-row{
  display:flex;
  justify-content:space-between;
  margin:4px 0;
}

.invoice-details p {
  margin: 4px 0;
}
          .print-footer {
            font-size: 9px;
            text-align: center;
            color: #555;
            border-top: 1px solid #ccc;
            padding: 8px 0;
            background: white;
          }
        </style>
      </head>

      <body>
        <div class="invoice-title">INVOICE</div>

        <div class="invoice-details">
         <div class="invoice-detail">

  <div class="details-column">
    <p><strong>Invoice No:</strong> ${Invoice.DitributorInvoiceCode}</p>
    <p><strong>Date:</strong> ${new Date(Invoice.InvoiceDate).toLocaleDateString()}</p>
    <p><strong>Distributor:</strong> ${distributorObj?.DistrbutorName || ""}</p>
    <p><strong>Remarks:</strong> ${Remarks || ""}</p>
  </div>

  <div class="details-column">
    <p><strong>DC Number:</strong> ${Invoice.DcNumber || ""}</p>
    <p><strong>Bilty Number:</strong> ${Builty.BiltyNumber || ""}</p>
    <p><strong>City:</strong> ${City?.find((item) => item._id === distributorObj.City)?.CityName || ""}</p>
    <p><strong>Sales Person:</strong> ${DistributorOrderBooker?.find((item) => item._id === distributorObj.OrderBooker)?.OrderBookerName || ""}</p>
  </div>

</div>
<div class="table">
        ${printContent}
</div>
<div class="summary-container">

  <div class="summary-box">
    <h4>Invoice Summary</h4>
    <div class="summary-row">
      <span>Total Cartons:</span>
      <span>${totalCarton}</span>
    </div>

    <div class="summary-row">
      <span>Total Amount:</span>
      <span>${TotalAmount?.toLocaleString()}</span>
    </div>

    <div class="summary-row">
      <span>Total Discount:</span>
      <span>(${totalDiscount?.toLocaleString()})</span>
    </div>
<div class="summary-row">
      <span>total Scheme :</span>
      <span>(${totalSpecialTO?.toLocaleString()})</span>
    </div>
    <div class="summary-row">
      <span>Total Special Discount:</span>
      <span>(${totalSpecialDiscount?.toLocaleString()})</span>
    </div>

    <div class="summary-row">
      <span>Freight Charges Add:</span>
      <span>${Number(Invoice.AddAmount || 0).toLocaleString()}</span>
    </div>

    <div class="summary-row">
      <span>Freight Charges Less:</span>
      <span>(${Number(Invoice.LessAmount || 0).toLocaleString()})</span>
    </div>

    <div class="summary-row">
      <span>Less Advance Discount:</span>
      <span>(${Number(Invoice.LessAdvanceDis || 0).toLocaleString()})</span>
    </div>

    <div class="summary-row" style="font-weight:bold;">
      <span>Net Payable:</span>
      <span>${Number(Invoice.TotalAmount).toLocaleString()}</span>
    </div>
  </div>

  <div class="summary-box">
    <h4>Payable Summary</h4>

    <div class="summary-row">
      <span>Payable Before:</span>
      <span>${BeforeInvoice?.toLocaleString()}</span>
    </div>

    <div class="summary-row">
      <span>Invoice Amount:</span>
      <span>${Invoice.TotalAmount?.toLocaleString()}</span>
    </div>

    <div class="summary-row" style="font-weight:bold;">
      <span>Net Payable:</span>
      <span>${(Invoice.TotalAmount + BeforeInvoice)?.toLocaleString()}</span>
    </div>

  </div>

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


  // -------- SIMPLE PDF --------
  // -------- GENERATE PDF LIKE HANDLE PRINT --------
  const GeneratePDF = async () => {
    try {
      // Create a hidden div with the same structure as print view
      const printContent = document.getElementById("dcView")?.innerHTML;

      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '1200px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; padding: 20px;">
        <div style="text-align: center; font-size: 20px; margin: 20px 0; font-weight: bold; letter-spacing: 1px; border-bottom: 2px solid #333; padding-bottom: 10px;">
          INVOICE
        </div>

        <div style="margin-bottom: 20px; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; gap: 40px; margin-bottom: 20px;">
            <div style="width: 48%;">
              <p style="margin: 3px 0;"><strong>Invoice No:</strong> ${Invoice.DitributorInvoiceCode || ''}</p>
              <p style="margin: 3px 0;"><strong>Date:</strong> ${Invoice.InvoiceDate ? new Date(Invoice.InvoiceDate).toLocaleDateString() : ''}</p>
              <p style="margin: 3px 0;"><strong>Distributor:</strong> ${distributorObj?.DistrbutorName || ''}</p>
              <p style="margin: 3px 0;"><strong>Remarks:</strong> ${Remarks || ''}</p>
            </div>

            <div style="width: 48%;">
              <p style="margin: 3px 0;"><strong>DC Number:</strong> ${Invoice.DcNumber || ''}</p>
              <p style="margin: 3px 0;"><strong>Bilty Number:</strong> ${Builty?.BiltyNumber || ''}</p>
              <p style="margin: 3px 0;"><strong>City:</strong> ${City?.find((item) => item._id === distributorObj?.City)?.CityName || ''}</p>
              <p style="margin: 3px 0;"><strong>Order Booker:</strong> ${DistributorOrderBooker?.find((item) => item._id === distributorObj?.OrderBooker)?.OrderBookerName || ''}</p>
            </div>
          </div>

          <div style="margin: 20px 0;">
            ${printContent || ''}
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 20px; gap: 40px;">
            <div style="width: 45%; border-top: 2px solid #333; padding-top: 10px;">
              <h4 style="margin: 0 0 10px 0; font-size: 14px;">Invoice Summary</h4>
              
              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Total Cartons:</span>
                <span>${totalCarton || 0}</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Total Amount:</span>
                <span>${(TotalAmount || 0).toLocaleString()}</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Total Discount:</span>
                <span>(${(totalDiscount || 0).toLocaleString()})</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Total Special Discount:</span>
                <span>(${(totalSpecialDiscount || 0).toLocaleString()})</span>
              </div>
            <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Total Scheme :</span>
                <span>(${(totalSpecialTO || 0).toLocaleString()})</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Freight Charges Add:</span>
                <span>${Number(Invoice.AddAmount || 0).toLocaleString()}</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Freight Charges Less:</span>
                <span>(${Number(Invoice.LessAmount || 0).toLocaleString()})</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Less Advance Discount:</span>
                <span>(${Number(Invoice.LessAdvanceDis || 0).toLocaleString()})</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px; font-weight: bold;">
                <span>Net Payable:</span>
                <span>${Number(Invoice.TotalAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            <div style="width: 45%; border-top: 2px solid #333; padding-top: 10px;">
              <h4 style="margin: 0 0 10px 0; font-size: 14px;">Payable Summary</h4>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Payable Before:</span>
                <span>${(BeforeInvoice || 0).toLocaleString()}</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px;">
                <span>Invoice Amount:</span>
                <span>${(Invoice.TotalAmount || 0).toLocaleString()}</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px; font-weight: bold;">
                <span>Net Payable:</span>
                <span>${((Invoice.TotalAmount || 0) + (BeforeInvoice || 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style="font-size: 9px; text-align: center; color: #555; border-top: 1px solid #ccc; padding: 8px 0; background: white; margin-top: 20px;">
            <p>This is a computer generated invoice - Signature not required</p>
          </div>
        </div>
      </div>
    `;

      // Append to body temporarily
      document.body.appendChild(tempContainer);

      // Generate PDF
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: false,
        backgroundColor: 'var(--pd-surface-container-lowest)'
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const ratio = pdfWidth / canvasWidth;
      const imgHeight = canvasHeight * ratio;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Save PDF
      pdf.save(`Invoice_${Invoice.DitributorInvoiceCode || 'document'}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // -------- ALTERNATIVE SIMPLER VERSION USING THE SAME ELEMENT --------
  const GeneratePDFSimple = async () => {
    try {
      const element = document.getElementById("invoicePrintArea");

      if (!element) {
        alert('Print area not found!');
        return;
      }

      // Apply print styles temporarily
      const originalStyle = element.style.cssText;
      element.style.width = '1200px';
      element.style.backgroundColor = 'white';
      element.style.padding = '20px';
      element.style.fontFamily = 'Arial, sans-serif';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: 'var(--pd-surface-container-lowest)'
      });

      // Restore original style
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Invoice_${Invoice.DitributorInvoiceCode || 'document'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const AddINSnd = async () => {
    try {
      setdisabled(true)
      const found = Invoices.find((x) => x._id === id);
console.log(found);

      const data = {
        DCCode: found.DitributorInvoiceCode,
        DCData: tableData,
        Distrbutor: found.Distrbutor,
        DCDate: found.InvoiceDate,
        PostStatus: "Send"
      }
      console.log(data);
      
      const Update = await updateDataFunction(`/DistrbutorInvoice/DistrbutorInvoiceStatusUpdate/${found._id}`)
      const CreateINSnd = await SndcreateDataFunction("/PurchaseOrderDC", data)
      toast.success("Data Successfully Added in SND")
      setTimeout(() => {
        navigate("/")
      }, 1500)

    }
    catch (err) {
      toast.error("Something went wrong")
      console.log(err)
    }


  }
  return (
    <div className="p-4">
      <ToastContainer />
      <div className="pd-bg-surface p-4 rounded shadow mb-6 flex flex-col md:flex-row gap-4 items-end">

        {/* Search Invoice */}
        <div className="w-full md:w-1/3">
          <label className="text-sm font-semibold mb-1 block">
            Search Invoice
          </label>

          <AppAsyncSelect
            cacheOptions
            loadOptions={loadInvoiceOptions}
            defaultOptions={Invoices.map(inv => ({
              label: inv.DitributorInvoiceCode,
              value: inv._id
            })).slice(0, 50)}
            onChange={handleInvoiceChange}
            placeholder="Search Invoice Number..."
          />
        </div>

        {/* Prev / Next Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            disabled={invoiceIndex <= 0}
            className="px-4 py-2 pd-bg-muted0 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={invoiceIndex >= Invoices.length - 1}
            className="px-4 py-2 pd-bg-muted0 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>

      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Distributor Invoice</h1>
        {view ? <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Print
          </button>
          {distributorObj.Type !== "Cust" && Invoice.PostStatus !== "Send" ?
            <button
              disabled={disabled}
              onClick={AddINSnd}
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              Send in Snd
            </button>
            : null}
          <button
            onClick={GeneratePDF}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Download PDF
          </button>
        </div>
          : null}
      </div>

      {/* DETAILS */}
      <div className="pd-bg-surface p-4 rounded shadow mb-6">
        <p><b>Invoice No:</b> {Invoice.DitributorInvoiceCode}</p>
        <p><b>Date:</b> {new Date(Invoice.InvoiceDate).toLocaleDateString()}</p>
        <p><b>Distributor:</b> {distributorObj?.DistrbutorName}</p>
        <p><b>Store:</b> {storeObj?.StoreName}</p>
      </div>

      {/* TABLE */}
      <div id="dcView">
        <table className="w-full border pd-bg-surface mb-6">
          <thead className="pd-bg-muted">
            <tr>
              <th className="border p-2">Product</th>
              <th className="border p-2">Carton</th>
              <th className="border p-2">Box</th>
              {showFreeBox ? <th className="border p-2">Free Box</th> : null}
              <th className="border p-2">Rate</th>
              <th className="border p-2">Amount</th>
              <th className="border p-2">Discount</th>
              <th className="border p-2">Scheme </th>
              <th className="border p-2">Special Discount </th>
              <th className="border p-2">Net</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row._id}>
                <td className="border p-2">
                  {Products.find((p) => p._id === row.product)?.ProductName}
                </td>
                <td className="border p-2 text-center">{Number(row.carton)?.toFixed(0)}</td>
                <td className="border p-2 text-center">{row.box}</td>
                {showFreeBox ? (
                  <td className="border p-2 text-center">
                    {Number(row.FreeBox || row.freeBox || 0)}
                  </td>
                ) : null}
                <td className="border p-2 text-right">{row.Rate}</td>
                <td className="border p-2 text-right">{row.Amount?.toLocaleString()}</td>
                <td className="border p-2 text-right">{row.discount?.toLocaleString()}</td>
                <td className="border p-2 text-right">{row.SpecialTO?.toLocaleString()}</td>
                <td className="border p-2 text-right">{row.specialdiscount?.toLocaleString()}</td>
                <td className="border p-2 text-right font-semibold">
                  {Number(row.netAmount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="pd-bg-muted font-bold">
            <tr>
              <td className="border p-2 font-bold">TOTAL</td>
              <td className="border p-2 font-bold text-center">{totalCarton}</td>
              <td className="border p-2 text-center font-bold">{totalBox}</td>
              {showFreeBox ? (
                <td className="border p-2 text-center font-bold">{totalFreeBox}</td>
              ) : null}
              <td className="border p-2 font-bold"></td>
              <td className="border p-2 text-right font-bold">{TotalAmount}</td>
              <td className="border p-2 text-right font-bold">{totalDiscount}</td>
              <td className="border p-2 text-right font-bold">{totalSpecialTO}</td>
              <td className="border p-2 text-right font-bold">{(totalSpecialDiscount).toFixed(2)}</td>
              <td className="border p-2 text-right font-bold">{totalNetAmount}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button
        onClick={() => navigate("/DistrbutorInvoice")}
        className="px-6 py-2 pd-bg-muted0 text-white rounded"
      >
        Back
      </button>
    </div>
  );
};

export default DistrbutorInvoiceView;
