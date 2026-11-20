import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import Select from 'react-select';

const PurchaseOrderEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const PurchaseOrder = useSelector((state) => state.PurchaseOrder.PurchaseOrder);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
    const Products = useSelector((state) => state.Product.product);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const { register, handleSubmit, control, setValue } = useForm({
        defaultValues: {
            OrderDate: '',
            OrderCode: '',
            PostStatus: '',
            RejectReson: '',
            OrderData: []
        }
    });

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: 'OrderData'
    });

    const getData = async () => {
        try {
            const res = PurchaseOrder.find((item) => item._id == id);
            if (res) {
                setData(res);
                setValue('OrderDate', res.OrderDate);
                setValue('OrderCode', res.OrderCode);
                setValue('PostStatus', res.PostStatus);
                setValue('RejectReson', res.RejectReson || '');
                setValue('OrderData', res.OrderData);
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

    const onSubmit = async (formData) => {
        try {
            await axios.put(`/api/purchaseOrder/${id}`, formData);
            alert('Purchase Order Updated Successfully');
            navigate('/PurchaseOrderList');
        } catch (err) {
            console.log(err);
            alert('Error updating Purchase Order');
        }
    };

    if (loading) return <p className="text-center p-4">Loading...</p>;
    if (!data) return <p className="text-center p-4">No data found</p>;

    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
                Edit Purchase Order
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md mb-6">

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Purchase Date</label>
                        <input
                            type="date"
                            {...register('OrderDate')}
                            className="w-full px-4 py-2 border rounded-lg"
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
                            {...register('OrderCode')}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Order Status</label>
                        <select {...register('PostStatus')} className="w-full px-4 py-2 border rounded-lg">
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2">Product</th>
                                <th className="border p-2">Carton</th>
                                <th className="border p-2">BOX</th>
                                <th className="border p-2">Rate Per Box</th>
                                <th className="border p-2">Gross Amount</th>
                                <th className="border p-2">Net Amount</th>
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {fields.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="border p-2">
                                        <Controller
                                            name={`OrderData.${index}.product`}
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    options={Products.map(p => ({ label: p.ProductName, value: p._id }))}
                                                    onChange={(val) => field.onChange(val.value)}
                                                />
                                            )}
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            {...register(`OrderData.${index}.carton`)}
                                            className="w-full px-2 py-1 border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            {...register(`OrderData.${index}.box`)}
                                            className="w-full px-2 py-1 border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            {...register(`OrderData.${index}.Rate`)}
                                            className="w-full px-2 py-1 border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            {...register(`OrderData.${index}.GrossAmount`)}
                                            className="w-full px-2 py-1 border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            {...register(`OrderData.${index}.netAmunt`)}
                                            className="w-full px-2 py-1 border rounded"
                                        />
                                    </td>
                                    <td className="border p-2 text-center">
                                        <button type="button" onClick={() => remove(index)} className="text-red-500">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">Reject Reason</label>
                    <textarea
                        {...register('RejectReson')}
                        className="w-full px-4 py-2 border rounded-lg"
                        rows={3}
                    />
                </div>

                <div className="flex justify-between">
                    <button
                        type="button"
                        onClick={() => navigate("/PurchaseOrderList")}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                        Back to List
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Save Changes
                    </button>
                </div>

            </form>
        </div>
    );
};

export default PurchaseOrderEdit;
