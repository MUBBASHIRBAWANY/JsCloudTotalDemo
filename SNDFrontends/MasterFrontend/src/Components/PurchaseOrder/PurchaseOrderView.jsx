import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunctionInCloud, updateDataFunction } from '../../Api/CurdFunctions';

const PurchaseOrderView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const PurchaseOrder = useSelector((state) => state.PurchaseOrder.PurchaseOrder)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const Products = useSelector((state) => state.Product.product);
    const [resone, setResone] = useState("")
    const [Rejected, setRejected] = useState(false)
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const EditDistributor = useSelector(
        (state) => state.DistributroReducers.DistributroReducers
    );

    const getData = async () => {
        try {
            const res = PurchaseOrder.find((item) => item._id == id)
            setData(res);
            if (res.PostStatus == "Reject") {
                setRejected(true)
            }
            setLoading(false);

        } catch (err) {
            console.log(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        getData();
    }, []);
    const updateStatus = async (Status) => {
        if (Status === "Reject") {
            setRejected(true)
            if (resone == "") {
                toast.error("Please Enter Resone")
            }
            else {
                try {
                    await updateDataFunction(`/PurchaseOrder/UpdateOrderStatus/${id}`, {
                        status: Status,
                        RejectReson: resone
                    })
                    toast.success(`Order ${Status} successfully`)
                    setTimeout(() => {

                        navigate("/PurchaseOrderList")
                    }, 2000)
                } catch (err) {
                    console.log(err)
                    toast.error("Some Thing Went Wrong")
                }

            }

        }
        else {
            try{
                const allData = {
                ...data,
                PostStatus: Status,
                DistrbutorCode: EditDistributor.find((item) => item._id == data.Distrbutor)?.DistrbutorSystemCode
            }
            console.log(allData)
            await updateDataFunction(`/PurchaseOrder/UpdateOrderStatus/${id}`, {
                status: Status,
            })
            
            const createInCloud = await createDataFunctionInCloud("/DistributorSaleOrder", allData)
            toast.success(`Order ${Status} successfully`)
            setTimeout(() => {

                navigate("/PurchaseOrderList")
            }, 2000)
            }catch(err){
            toast.success(`Some THing Went Wrong`)
                
            }
        }

    }

    if (loading) return <p className="text-center p-4">Loading...</p>;
    if (!data) return <p className="text-center p-4">No data found</p>;

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
                Purchase Order View
            </h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Purchase Date</label>
                        <input
                            type="text"
                            disabled
                            value={data.OrderDate}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Distributor</label>
                        <input
                            type="text"
                            disabled
                            value={EditDistributor.find((item) => item._id == data.Distrbutor)?.DistrbutorName}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Purchase Order No</label>
                        <input
                            type="text"
                            disabled
                            value={data.OrderCode}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Order Status</label>
                        <input
                            type="text"
                            disabled
                            value={data.PostStatus}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border px-36">Product</th>
                                <th className="border p-2">Carton</th>
                                <th className="border p-2">BOX</th>
                                <th className="border p-2">Rate Per Box</th>
                                <th className="border p-2">Gross Amount</th>
                                <th className="border p-2">Net Amount</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data.OrderData?.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="border p-2">{Products.find((item) => item._id == row.product).ProductName}</td>
                                    <td className="border p-2">{row.carton}</td>
                                    <td className="border p-2">{row.box}</td>
                                    <td className="border p-2">{row.Rate}</td>
                                    <td className="border p-2">{row.GrossAmount}</td>
                                    <td className="border p-2">{row.netAmunt}</td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot>
                            <tr className="bg-gray-100 font-semibold">
                                <td className="border p-2">Total</td>
                                <td className="border p-2">
                                    {data.OrderData.reduce((a, b) => a + (b.carton || 0), 0)}
                                </td>
                                <td className="border p-2">
                                    {data.OrderData.reduce((a, b) => a + (b.box || 0), 0)}
                                </td>
                                <td className="border p-2"></td>
                                <td className="border p-2">
                                    {data.OrderData
                                        .reduce((a, b) => a + (b.GrossAmount || 0), 0)
                                        .toFixed(2)}
                                </td>
                                <td className="border p-2">
                                    {Number(data.OrderData
                                        ?.reduce((a, b) => a + (b.netAmunt || 0), 0)

                                    )}
                                </td>
                            </tr>
                        </tfoot>

                    </table>
                </div>

                <div className="flex flex-col md:flex-row items-end justify-end gap-4 mt-4">
                    {Rejected === true && (
                        <div className="w-full md:w-1/3 mt-4">
                            <label className="block text-gray-700 font-semibold mb-1">
                                Reject Reason
                            </label>
                            <input
                                type="text"
                                placeholder="Enter Reject Reason"
                                disabled
                                value={data.RejectReson}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                        {data.PostStatus == "Received" && (

                            <>
                                <button
                                    onClick={() => updateStatus("Accept")}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
                                >
                                    Accept
                                </button>

                                <button
                                    onClick={() => updateStatus("Reject")}
                                    className="px-6 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
                                >
                                    Reject
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => navigate('/PurchaseOrderList')}
                            className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition"
                        >
                            Back
                        </button>

                    </div>

                </div>


            </div>
        </div>
    );
};

export default PurchaseOrderView;
