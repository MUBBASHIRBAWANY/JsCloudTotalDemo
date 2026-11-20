import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';

const PurchaseOrderView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const PurchaseOrder = useSelector((state) => state.PurchaseOrder.PurchaseOrder)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const Products = useSelector((state) => state.Product.product);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const getData = async () => {
        try {
            const res = PurchaseOrder.find((item) => item._id == id)
            setData(res);
            setLoading(false);
        } catch (err) {
            console.log(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        getData();
    }, []);

    if (loading) return <p className="text-center p-4">Loading...</p>;
    if (!data) return <p className="text-center p-4">No data found</p>;

    return (
        <div className="p-4">
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
                            value={loginVendor.DistrbutorName}
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
                <th>Reject Reason </th>
                <td>
                    {data.RejectReson}
                </td>
                <div className="flex justify-end">
                    <button
                        onClick={() => navigate("/PurchaseOrderList")}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Back to List
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PurchaseOrderView;
