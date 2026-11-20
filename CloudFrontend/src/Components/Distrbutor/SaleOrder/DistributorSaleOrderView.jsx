import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
//SndUpdateDataFunction
const DistributorSaleOrderView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const PurchaseOrder = useSelector((state) => state.DistributorOrder.DistributorOrder)
    const LoginerVendor = useSelector((state) => state.LoginerReducer.userDetail)   

    //console.log(PurchaseOrder)
    const [orderIndex, setOrderIndex] = useState(-1);



    const handleNext = () => {
        if (orderIndex < PurchaseOrder.length - 1) {
            const nextId = PurchaseOrder[orderIndex + 1]._id;
            navigate(`/DistributorSaleOrderView/${nextId}`);
        }
    };

    const handlePrev = () => {
        if (orderIndex > 0) {
            const prevId = PurchaseOrder[orderIndex - 1]._id;
            navigate(`/DistributorSaleOrderView/${prevId}`);
        }
    };

    const loadOptions = (inputValue, callback) => {
        const filtered = PurchaseOrder.filter(order =>
            order.OrderCode.toLowerCase().includes(inputValue.toLowerCase())
        );

        const options = filtered.map(order => ({
            label: order.OrderCode,
            value: order._id
        }));

        callback(options);
    };

    const handleSelectChange = (selectedOption) => {
        if (selectedOption) {
            navigate(`/DistributorSaleOrderView/${selectedOption.value}`);
        }
    }

    const Products = useSelector((state) => state.Product.product);

    const City = useSelector((state) => state.City.City)

    const [resone, setResone] = useState("")
    const [Rejected, setRejected] = useState(false)
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);


    const EditDistributor = useSelector(
        (state) => state.DistributroReducers.DistributroReducers
    );

    const orderRef = useRef(PurchaseOrder);
    orderRef.current = PurchaseOrder;

    const getData = async () => {
        try {
            let res;
            try {
                res = await getDataFundtion(`/DistributorSaleOrder/${id}`);
            } catch (err) {
                res = orderRef.current.find((item) => item._id == id && Array.isArray(item.OrderData));
                if (!res) console.log(err);
            }
            if (!res) return;
            setData(res);
            if (res.PostStatus == "Reject") {
                setRejected(true)
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) getData();
    }, [id]);

    useEffect(() => {
        if (PurchaseOrder.length && id) {
            setOrderIndex(PurchaseOrder.findIndex(item => item._id === id));
        }
    }, [PurchaseOrder, id]);
    const updateStatus = async (Status) => {
        if (Status === "Reject") {
            setRejected(true)
            if (resone == "") {
                toast.error("Please Enter Resone")
            }
            else {
                try {
                    // await SndUpdateDataFunction(`/PurchaseOrder/UpdateOrderStatus/${id}`, {
                    //     status: Status,
                    //     RejectReson: resone
                    // })
                    await updateDataFunction(`/DistributorSaleOrder/UpdateOrderStatus/${id}`, {
                        status: Status,
                        RejectReson: resone
                    })
                    toast.success(`Order ${Status} successfully`)
                    setTimeout(() => {

                        navigate("/DistributorSaleOrderListPage")
                    }, 2000)
                } catch (err) {
                    //console.log(err)
                    toast.error("Something went wrong")
                }

            }

        }
        else {
            try {
                // await SndUpdateDataFunction(`/PurchaseOrder/UpdateOrderStatus/${id}`, {
                //     status: Status,
                // })
                await updateDataFunction(`/DistributorSaleOrder/UpdateOrderStatus/${id}`, {
                    status: Status,
                })

                toast.success(`Order ${Status} successfully`)
                setTimeout(() => {

                    navigate("/DistributorSaleOrderListPage")
                }, 2000)
            } catch (err) {
       
   const msg = err?.response?.data?.message || "Something went wrong"
                toast.error(msg)

            }
        }

    }

    if (loading) return <p className="text-center p-4">Loading...</p>;
    if (!data) return <p className="text-center p-4">No data found</p>;

    // Print Function
    const handlePrint = () => {
        const printContent = document.getElementById("distributorSaleOrderPrintArea")?.innerHTML || "";
        const printWindow = window.open("", "_blank", "width=1200,height=800");
        if (!printWindow) return;

        const distributor = EditDistributor.find((item) => item._id == data.Distrbutor);
        const distributorName = distributor?.DistrbutorName || "";
        const cityName = City.find(city => city._id == distributor?.City)?.CityName || "";

        printWindow.document.write(`
        <html>
            <head>
                <title>Distributor Sale Order - ${data.OrderCode}</title>
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

                    .order-title {
                        text-align: center;
                        font-size: 20px;
                        margin: 20px 0;
                        font-weight: bold;
                        letter-spacing: 1px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }

                    .order-details {
                        margin-bottom: 20px;
                        font-size: 14px;
                    }

                    .order-details p {
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
                <div class="order-title">DISTRIBUTOR SALE ORDER</div>

                <div class="order-details">
                    <p><strong>Order No:</strong> ${data.OrderCode}</p>
                    <p><strong>Order Date:</strong> ${data.OrderDate}</p>
                    <p><strong>Distributor:</strong> ${distributorName} (${cityName})</p>
                    <p><strong>Order Status:</strong> ${data.PostStatus}</p>
                    <p><strong>Remarks:</strong> ${data.Remarks || "No remarks"}</p>
                </div>

                ${printContent}

                <div class="print-footer">
                    Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
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

    return (
        <div className="p-4">
            <ToastContainer />
            {!LoginerVendor.City ?
            <div className="flex flex-col md:flex-row gap-4 mb-6">

                {/* Async Select */}
                <div className="w-full md:w-1/3">
                    <label className="block font-semibold mb-1">Select Order</label>
                    <AppAsyncSelect
                        cacheOptions
                        loadOptions={loadOptions}
                        defaultOptions={PurchaseOrder.map(order => ({
                            label: order.OrderCode,
                            value: order._id
                        }))}
                        onChange={handleSelectChange}
                        placeholder="Search Order نمبر..."
                    />
                </div>

                {/* Prev / Next Buttons */}
                <div className="flex items-end gap-3">
                    <button
                        onClick={handlePrev}
                        disabled={orderIndex <= 0}
                        className="px-4 py-2 pd-bg-muted0 text-white rounded disabled:bg-gray-300"
                    >
                        Previous
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={orderIndex >= PurchaseOrder.length - 1}
                        className="px-4 py-2 pd-bg-muted0 text-white rounded disabled:bg-gray-300"
                    >
                        Next
                    </button>
                </div>

            </div>
             : null}
            <h1 className="pd-page-title text-center mb-6">
                Distributor SaleOrder View
            </h1>

            <div className="pd-card p-6 mb-6">

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

                    <div>
                        <label className="pd-label">Order Date</label>
                        <input
                            type="text"
                            disabled
                            value={data.OrderDate}
                            className="w-full px-4 py-2 border rounded-lg pd-bg-muted"
                        />
                    </div>

                    <div>
                        <label className="pd-label">Distributor</label>
                        <input
                            type="text"
                            disabled
                            // value={EditDistributor.find((item) => item._id == data.Distrbutor)?.DistrbutorName}
                            value={`${EditDistributor.find(item => item._id == data.Distrbutor)?.DistrbutorName || ""} (${City.find(city => city._id ==
                                EditDistributor.find(item => item._id == data.Distrbutor)?.City
                            )?.CityName || ""
                                })`}
                            className="w-full px-4 py-2 border rounded-lg pd-bg-muted"
                        />
                    </div>

                    <div>
                        <label className="pd-label">Purchase Order No</label>
                        <input
                            type="text"
                            disabled
                            value={data.OrderCode}
                            className="w-full px-4 py-2 border rounded-lg pd-bg-muted"
                        />
                    </div>
                    <div>
                        <label className="pd-label">Order Status</label>
                        <input
                            type="text"
                            disabled
                            value={data.PostStatus}
                            className="w-full px-4 py-2 border rounded-lg pd-bg-muted"
                        />
                    </div>
                    <div className="md:col-span-4">
                        <label className="pd-label">Remarks</label>
                        <textarea
                            disabled
                            rows={2}
                            value={data.Remarks || "No remarks"}
                            className="w-full px-4 py-2 border rounded-lg pd-bg-muted resize-none"
                        />
                    </div>
                </div>

                {/* Table */}
                <div id="distributorSaleOrderPrintArea" className="overflow-x-auto mb-6">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="border px-36">Product</th>
                                <th className="border p-2">Carton</th>
                                <th className="border p-2">BOX</th>
                                <th className="border p-2">Rate Per Box</th>
                                <th className="border p-2">Gross Amount</th>
                                <th className="border p-2">Net Amount</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data.OrderData?.map((row, index) => {
                                const pro = Products.find((item) => item._id == row.product)

                                return (
                                    <tr key={index} >
                                        <td className="border p-2">{pro?.ProductName || ""}</td>
                                        <td className="border p-2">{row.carton}</td>
                                        <td className="border p-2">{row.box}</td>
                                        <td className="border p-2">{pro?.TPSale}</td>
                                        <td className="border p-2">{row.totalBox * pro?.TPSale}</td>
                                        <td className="border p-2">{row.totalBox * pro?.TPSale}</td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        <tfoot>
                            <tr className="pd-table-footer">
                                <td className="border p-2">Total</td>
                                <td className="border p-2">
                                    {data.OrderData.reduce((a, b) => a + Number(b.carton || 0), 0)}
                                </td>
                                <td className="border p-2">
                                    {data.OrderData.reduce((a, b) => a + Number(b.box || 0), 0)}
                                </td>
                                <td className="border p-2"></td>
                                <td className="border p-2">
                                    {data.OrderData?.reduce((sum, row) => {
                                        const pro = Products.find((item) => item._id == row.product);

                                        return sum + ((row.totalBox || 0) * (pro?.TPSale || 0));
                                    }, 0).toFixed(2)}
                                </td>
                                <td className="border p-2">
                                    {data.OrderData?.reduce((sum, row) => {
                                        const pro = Products.find((item) => item._id == row.product);

                                        return sum + ((row.totalBox || 0) * (pro?.TPSale || 0));
                                    }, 0).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>

                    </table>
                </div>

                <div className="flex flex-col md:flex-row items-end justify-end gap-4 mt-4">
                    {Rejected === true && (
                        <div className="w-full md:w-1/3 mt-4">
                            <label className="block pd-text-body font-semibold mb-1">
                                Reject Reason
                            </label>
                            <input
                                type="text"
                                placeholder="Enter Reject Reason"
                                value={resone}
                                onChange={(e) => setResone(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                            />
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-col md:flex-row items-end justify-end gap-4 mt-4">


                        {/* Buttons */}
                        <div className="flex gap-3">
                            {data.PostStatus == "Accept" && (

                                <>
                                    <button
                                        onClick={() => updateStatus("Process")}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
                                    >
                                        Process
                                    </button>

                                    <button
                                        onClick={() => updateStatus("Reject")}
                                        className="px-6 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
                                    >
                                        Reject
                                    </button>
                                </>
                            )}
                            {(data.PostStatus == "Process" || data.PostStatus == "Partially Delivered") && (
                                <button
                                    onClick={() => updateStatus("Off")}
                                    className="px-6 py-2 bg-orange-500 text-white rounded-lg shadow hover:bg-orange-600 transition"
                                >
                                    Off
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/DistributorSaleOrderListPage')}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:pd-bg-readonly transition"
                            >
                                Back
                            </button>

                            <button
                                onClick={handlePrint}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
                            >
                                Print
                            </button>

                        </div>

                    </div>

                </div>


            </div>
        </div>
    );
};

export default DistributorSaleOrderView;
