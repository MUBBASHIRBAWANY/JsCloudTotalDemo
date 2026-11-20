import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import AsyncSelect from 'react-select/async';
import Select from 'react-select'
import { AddSalesInvoiceReturn } from '../../Redux/Reducers/SalesInvoiceReturnReducer';



const SalesInvoiceAdd = () => {
    const navigate = useNavigate();
    const [poClient, setPoClient] = useState(null);
    const [filterProduct, setFilterProduct] = useState([])
    const Client = useSelector((state) => state.Client.client)
    const Products = useSelector((state) => state.Product.product);
    const Vendor = useSelector((state) => state.Vendor.state)
    const location = useSelector((state) => state.Location.Location)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const Store = useSelector((state) => state.Store.Store)
    const [tableData, setTableData] = useState([]);
    const [invoiceRef, setInvoiceRef] = useState()
    const [clientInvoice, setclientInvoice] = useState([])
    const [salesInvoice, setSalesInvoice] = useState([])
    const [invoicedata, setInvoiceData] = useState('')
    const [ReturnType, setReturnType] = useState("current")

    const loadPurchseInvoiceOptions = async (inputValue) => {

        if (!inputValue) return [];
        console.log(salesInvoice)
        const filtered = salesInvoice
            .filter((item) =>
                item.SalesInvoice.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        console.log(filtered)
        return filtered.map((item) => ({
            value: item.SalesInvoice,
            label: item.SalesInvoice

        })).slice(0, 50);
    };


    const GetSaleinvoice = async (value) => {
        console.log(value)
        setclientInvoice('')
        setPoClient(value)
        const getInvoice = await getDataFundtion(`SaleInvoice/invoiceClient/${value.value}`)
        console.log(getInvoice)
        setSalesInvoice(getInvoice.data)

        const data = getInvoice.data.map((item) => ({
            value: item.SalesInvoice,
            label: item.SalesInvoice
        })).slice(0, 50)
        console.log(data)
        setclientInvoice(data)
        console.log(clientInvoice)

    }


    const setData = (val) => {
        setInvoiceRef(val.value)
        console.log(salesInvoice)
        const data = salesInvoice.find((item) => item.SalesInvoice == val.value)
        setInvoiceData(data)
        setTableData(data.SalesData)
    }


    const { register, handleSubmit, formState: { errors }, reset } = useForm();


    const removeRow = (id) => {
        setTableData(tableData.filter(row => row.id !== id));
    };

    const handleCellChange = (id, field, feildvalue) => {
        let value = feildvalue?.value || feildvalue;

        setTableData(tableData.map(row => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: value };

                if (field === "return") {
                    if (Number(updatedRow.return) > Number(updatedRow.Delivered)) {
                        toast.error("Return Qty should be less than Delivered Qty");
                        return row
                    }
                }

                if (field == "Rate") {
                    const lineAmount = Number(value) * Number(updatedRow.return || 0);
                    console.log(lineAmount)
                    if (lineAmount > invoicedata.RemainingAmount) {
                        toast.error("Amount should be less than Remaining Amount");
                        return row;
                    }
                }

                updatedRow.netAmunt =
                    (Number(updatedRow.Rate) * Number(updatedRow.return || 0)) -
                    (Number(updatedRow.discount || 0));

                return updatedRow;
            }
            return row;
        }));
    };
    const dispatch = useDispatch()
    const TotalnetAmunt = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);
    const totalDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0);
    const totalDelivered = tableData.reduce((sum, row) => sum + (parseInt(row.Delivered) || 0), 0);

    const onSubmit = async (data) => {
        console.log(invoicedata.RemainingAmount)
        data.Client = poClient.value
        data.SalesReturnData = tableData
        data.InvoiceRef = invoiceRef || "Opening"
        data.Store = Store[0]._id
        data.Location = location[0]._id
        console.log(data)
        if (invoicedata.RemainingAmount < TotalnetAmunt) {
            return toast.error(`Remaining Amount in this invoice is ${invoicedata.RemainingAmount}`)
        }
        else {
            try {
                console.log(data)
                const res = await createDataFunction('/SalesInvoiceReturn', data)
                dispatch(AddSalesInvoiceReturn(res))
                setTimeout(() => {
                    navigate(`/SalesReturnInvoiceView/${res._id}`)
                }, 2000);
            }
            catch (err) {
                const error = err.response.data.errors
                if (error) {
                    console.log(error)
                    try {
                        const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName} on your location`
                        toast.error(notAvalible)
                    }
                    catch {
                        const notAvalible = `Qty of ${Products.find((item) => item._id == error[0][0].product).ProductName} Avalibale Qty ${error[0][0].qty}  you need ${error[0][0].Req} Boxes`
                        toast.error(notAvalible)
                    }
                }
            }
        }

    }

    console.log(tableData)
    useEffect(() => {
        const today = new Date();
        const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
        reset({
            SalesInvoiceReturnDate: formatted,
            Location: location[0].LocationName,
            Store: Store[0]?.StoreName
        })


    }, [])
    const clients = Client

    const startingvendor = Vendor.filter((item) => clients.includes(item._id))
        .map((item1) => item1.code)




    const loadclients = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = Client
            .filter((item) =>
                item.CutomerName.toLowerCase().includes(inputValue.toLowerCase()) || item.code.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50);

        return filtered.map((item) => ({
            label: `${item.CutomerName} ${item.code}`,
            value: item._id
        }));
    }

    const startingClient = Client.slice(0, 50).map((item) => ({
        label: `${item.CutomerName} ${item.code}`,
        value: item._id
    }));;

    const loadInvoiceOptions = async (inputValue) => {
        console.log(poClient)

        const product = Products.map((p) => ({
            label: `${p.ProductName}`,
            value: p._id
        }))
        console.log(product)
        if (!inputValue) return [];
        const AllProduct = product

        const filtered = AllProduct
            .filter((item) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results
        return filtered.map((item) => ({
            label: item.label,
            value: item.value
        }));

    };

    const defultStore = Store.find((item) => item._id == loginVendor.Store[0])
    const selectedStore = {
        label: defultStore?.StoreName,
        value: defultStore?._id
    }

    const addNewRow = () => {
        if (!poClient) {
            return toast.error("first Select Client ")
        }

        setTableData([...tableData, {
            id: Date.now(),
            product: '',

        }]);
    };
    const statrtingProduct = Products.map((item) => ({
        value: item._id,
        label: item.ProductName
    }))


    return (
        <div className=" p-4">
            <ToastContainer />
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Create Sales Return </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Return Date</label>
                        <input
                            type="date"
                            {...register("SalesInvoiceReturnDate", { required: true })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Client</label>
                        <AsyncSelect
                            onChange={(vals) => GetSaleinvoice(vals)}
                            loadOptions={loadclients}
                            defaultOptions={startingClient}
                            value={poClient}
                            className="basic-single text-sm"
                            classNamePrefix="select"
                            isSearchable
                            isDisabled={tableData.length === 0 ? false : true}
                            placeholder="Select customer..."
                            styles={{
                                control: (provided) => ({
                                    ...provided,
                                    minHeight: '40px',
                                    fontSize: '14px'
                                })
                            }}
                        />
                    </div>

                    < div >
                        <label className="block text-gray-700 font-semibold mb-2">Return Type</label>
                        <select onChange={(e) => setReturnType(e.target.value)} disabled={tableData.length != 0 ? true : false} className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 '>
                            <option value="current">Current </option>
                            <option value="Opening">Opening </option>
                        </select>
                    </div>

                    {ReturnType == "current" ?
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">Select Invoice</label>
                            <AsyncSelect
                                defaultOptions={clientInvoice}
                                loadOptions={loadPurchseInvoiceOptions}
                                isDisabled={tableData.length != 0 ? true : false}
                                className="basic-single"
                                classNamePrefix="select"
                                isSearchable
                                placeholder="Select Invoice..."
                                onChange={(val) => {
                                    setData(val)
                                }}
                            />

                        </div>
                        : null}
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Sales Return No</label>
                        <input
                            type="text"
                            disabled
                            defaultValue={''}
                            {...register("purchase")}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Location</label>
                        <input
                            type="text"
                            disabled={true}
                            {...register("Location")}
                            value={location[0].LocationName}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Store</label>
                        <input
                            type="text"
                            disabled={true}
                            {...register("Store")}
                            value={selectedStore?.label}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Remarks</label>
                        <input
                            type="text"
                            {...register("Remarks")}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Excel-like Table */}
                <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border px-36">Product</th>

                                <th className="border p-2">CTN</th>
                                {ReturnType == "current" ? <th className="border p-2">Return</th> : null}
                                <th className="border p-2">Rate </th>
                                <th className="border p-2"> Discount</th>
                                <th className="border p-2">Gst</th>
                                <th className="border p-2">Net Amount </th>
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    {ReturnType == "current" ? <td className="border p-2">
                                        {Products.find((item) => item._id == row.product)?.ProductName}
                                    </td>
                                        : null}
                                    {ReturnType !== "current" ?
                                        <td className="border p-2">
                                            <AsyncSelect
                                                menuPortalTarget={document.body}
                                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                cacheOptions
                                                defaultOptions={statrtingProduct}
                                                loadOptions={loadInvoiceOptions}
                                                value={row.product ? {
                                                    value: `${row.product} ${console.log(row)}`,
                                                    label: `${Products.find((p) => p._id === row.product)?.ProductName}`
                                                } : null}
                                                onChange={(selectedOption) =>
                                                    handleCellChange(row.id, 'product', selectedOption || '')
                                                }
                                                className="text-sm"
                                                classNamePrefix="select"
                                                placeholder="Select Product..."
                                                isSearchable
                                                isClearable
                                            />
                                        </td>
                                        : null}
                                    {ReturnType == "current" ?
                                        <td className="border p-2">
                                            {row.Delivered}
                                        </td>
                                        : null}

                                    <td className="border p-2">
                                        <input
                                            type="text"
                                            value={row.return}
                                            onChange={(e) => handleCellChange(row.id, 'return', e.target.value)}
                                            className="w-full p-1 border rounded"
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            type="text"
                                            value={row.Rate}
                                            onChange={(e) => handleCellChange(row.id, 'Rate', e.target.value)}
                                            className="w-full p-1 border rounded"
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            value={row.discount}
                                            onChange={(e) => handleCellChange(row.id, 'discount', e.target.value)}
                                            className="w-full p-1 border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        {row.Gst}
                                    </td>

                                    <td className="border p-2">
                                        {row.netAmunt}
                                    </td>
                                    <td className="border p-2">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>

                            ))
                            }

                        </tbody>
                        {
                            tableData.length != 0 ? <tfoot>
                                <tr className="bg-gray-100 font-semibold">
                                    <td className="border p-2">Total</td>
                                    <td className="border p-2">{totalDelivered}</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>
                                    {ReturnType == "current" ? <td className="border p-2"></td> : null}
                                    <td className="border p-2">{TotalnetAmunt}</td>
                                    <td className="border p-2"></td>
                                </tr>
                            </tfoot> : null
                        }
                    </table>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    {ReturnType != "current" ?
                        <button
                            type="button"
                            onClick={addNewRow}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm md:text-base"
                        >
                            Add Row
                        </button>
                        : null}
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Create Purchase Return
                    </button>
                </div>
            </form >
        </div >
    )
}

export default SalesInvoiceAdd