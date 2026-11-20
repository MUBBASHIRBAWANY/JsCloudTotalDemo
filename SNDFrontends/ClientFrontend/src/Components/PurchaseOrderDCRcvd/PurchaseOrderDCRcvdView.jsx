import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, updateDataFunction, updateDataFunctionInCloud } from "../../Api/CurdFunctions";
import * as XLSX from "xlsx";

const PurchaseOrderDCRcvdView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const Products = useSelector((state) => state.Product.product);
    const Store = useSelector((state) => state.Store.Store);
    const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers);
    const OrderDc = useSelector((state) => state.PurchaseOrderDCRcvd.PurchaseOrderDCRcvd);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [stop, setStop] = useState(false)

    const [record, setRecord] = useState(null);

    // ---------------- Load DC Data --------------------
    useEffect(() => {
        const dc = OrderDc.find((item) => item._id === id);
        setRecord(dc);
    }, [id]);

    if (!record) return <p className="p-4 text-center">Loading...</p>;

    const distributor = EditDistributor.find((d) => d._id === record.Distrbutor);
    const store = Store.find((s) => s._id === record.Store);

    const totalCarton = record.DCData.reduce(
        (sum, row) => sum + (parseInt(row.carton) || 0),
        0
    );
    const totalBox = record.DCData.reduce(
        (sum, row) => sum + (parseInt(row.box) || 0),
        0
    );
        const totalGross = record.DCData.reduce(
        (sum, row) => sum + (parseFloat(row.Amount) || 0),
        0
    );
    const orders = record.DCData.map((t) => t.Order).filter((v, i, a) => a.indexOf(v) === i).join(", ");




    // ---------------- Excel Export --------------------
    const exportExcel = () => {
        const worksheetData = [
            ["Purchase Order DC"],
            [`DC No: ${record.DCCode || 'N/A'}`],
            [`Delivery Date: ${record.DCDate}`],
            [`Distributor: ${loginVendor.DistrbutorName}`],
            [`Order: ${orders}`],
            [],
            ["Product", "Carton", "Box", "Gross"]
        ];

        // Add product rows
        record.DCData.forEach((row) => {
            worksheetData.push([
                Products.find((p) => p._id === row.product)?.ProductName || 'N/A',
                row.carton,
                row.box,
                row.Amount
            ]);
        });

        // Add totals row
        worksheetData.push([
            "Total",
            totalCarton,
            totalBox,
            totalGross
        ]);

        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Purchase Order DC");
        XLSX.writeFile(wb, `PurchaseOrderDC-${record.DCCode || 'document'}.xlsx`);
    };

    // ---------------- Print --------------------
    const handlePrint = () => {
        const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order DC - ${record.DCCode}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .print-header { text-align: center; margin-bottom: 20px; }
          .print-header h1 { font-size: 24px; margin: 0; }
          .print-details { margin-bottom: 20px; }
          .print-details p { margin: 4px 0; }
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
          <h1>Purchase Order DC</h1>
          <h2>${record.DCCode || 'N/A'}</h2>
        </div>

        <div class="print-details">
          <p><strong>Delivery Date:</strong> ${record.DCDate}</p>
          <p><strong>Distributor:</strong> ${loginVendor.DistrbutorName}</p>
          <p><strong>Order:</strong> ${orders}</p>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Carton</th>
              <th>Box</th>
              <th>Gross</th>
            </tr>
          </thead>
          <tbody>
            ${record.DCData.map((row) => `
              <tr>
                <td>${Products.find((p) => p._id === row.product)?.ProductName || 'N/A'}</td>
                <td>${row.carton}</td>
                <td>${row.box}</td>
                <td>${row.Amount}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>${totalCarton}</strong></td>
              <td><strong>${totalBox}</strong></td>
              <td><strong>${totalGross}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div class="print-footer">
          <p>Printed on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            window.print();
        }
    };

    const updateStatus = async (Status) => {
        setStop(true)
        const orders = record.DCData.map((t) => t.Order)
        try {
            for (const item of orders) {
                await updateDataFunction(`/PurchaseOrder/UpdateOrderStatusByNumber/${item}`, {
                    status: Status,
                })
              
            }
            
            await createDataFunction(`/PurchaseOrderDC/PostPurchaseOrderDC/${record._id}`, record)
            toast.success("Stock Recived")
            setTimeout(() => {
                navigate("/PurchaseOrderDCRcvdList")
            }, 1500);

        } catch (err) {
            console.log(err)
            toast.error(err?.response?.data?.message || "Stock receive failed")
            setStop(false)
        }
    }


    return (
        <div className="p-4">
            <ToastContainer />

            <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800 mb-6">
                Purchase Order DC
            </h1>

            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

                    <div>
                        <label className="block font-semibold mb-1">Delivery Date</label>
                        <div className="border px-3 py-2 rounded bg-gray-100">
                            {record.DCDate}
                        </div>
                    </div>

                    <div>
                        <label className="block font-semibold mb-1">Distributor</label>
                        <div className="border px-3 py-2 rounded bg-gray-100">
                            {loginVendor.DistrbutorName}
                        </div>
                    </div>

                    <div>
                        <label className="block font-semibold mb-1">DC No</label>
                        <div className="border px-3 py-2 rounded bg-gray-100">
                            {record.DCCode}
                        </div>
                    </div>



                    <div>
                        <label className="block font-semibold mb-1">Order</label>
                        <div className="border px-3 py-2 rounded bg-gray-100">
                            {/* If multiple orders exist, show comma-separated */}
                            {orders}
                        </div>
                    </div>

                </div>

                {/* ---------------- Table ---------------- */}
                <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border px-36">Product</th>
                                <th className="border p-2">Carton</th>
                                <th className="border p-2">Box</th>
                                <th className="border p-2">Gross</th>
                            </tr>
                        </thead>

                        <tbody>
                            {record.DCData.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="border p-2">
                                        {Products.find((p) => p._id === row.product)?.ProductName}
                                    </td>

                                    <td className="border p-2 text-center">
                                        {row.carton}
                                    </td>

                                    <td className="border p-2 text-center">
                                        {row.box}
                                    </td>
                                    <td className="border p-2 text-center">
                                        {row.Amount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot>
                            <tr className="bg-gray-100 font-semibold">
                                <td className="border p-2">Total</td>
                                <td className="border p-2 text-center">{totalCarton}</td>
                                <td className="border p-2 text-center">{totalBox}</td>
                                <td className="border p-2 text-center">{totalGross}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex justify-end gap-6">
                    <button
                        onClick={exportExcel}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
                    >
                        Excel
                    </button>

                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                    >
                        Print
                    </button>

                    {record.PostStatus == "Send" && (

                        <>
                            <button
                                type="button"
                                disabled={stop}
                                onClick={() => updateStatus("Received By Distributor")}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
                            >
                                Received
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderDCRcvdView;
