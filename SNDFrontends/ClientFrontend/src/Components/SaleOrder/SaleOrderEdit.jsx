import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../Api/CurdFunctions';
import AsyncSelect from 'react-select/async';
import Select from 'react-select'
import { generateNextCode, generateNextCodeForOrder } from '../Global/GenrateCode';
import { EditSaleOrder } from '../../Redux/Reducers/SaleOrderReducer';



const SaleOrderEdit = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch()
    const { id } = useParams()
    const [poClient, setPoClient] = useState(null);
    const [filterClinet, setFilterClinet] = useState([])
    const Client = useSelector((state) => state.Client.client)
    const Products = useSelector((state) => state.Product.product);
    const TotalProducts = useSelector((state) => state.TotalProducts.TotalProducts);
    const Vendor = useSelector((state) => state.Vendor.state)
    const location = useSelector((state) => state.Location.Location)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const Store = useSelector((state) => state.Store.Store)
    const [AllProduct, SetAllProduct] = useState([])
    const [tableData, setTableData] = useState([]);
    const [OderBooker, setOderBooker] = useState([])
    const [selectedLocation, setSelectedLocation] = useState([])
    const [salesLoction, setSalesLoction] = useState([])
    const [salesStore, setSalesStore] = useState([])
    const [storeDrp, setStoreDrp] = useState([])
    const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
    const Order = useSelector((state) => state.SaleOrder.SaleOrder)

    const [isSubmitting, setIsSubmitting] = useState(false)


    const [editOrder, setEditOrder] = useState("")
    const Location = location.filter(item => loginVendor?.Location?.includes(item._id))
        .map((item) => ({
            label: item.LocationName,
            value: item._id
        }))

    const { register, handleSubmit, formState: { errors }, reset } = useForm();

    const addNewRow = () => {
        if (!poClient) {
            return toast.error("first Select Client ")
        }

        setTableData([...tableData, {
            id: Date.now(),
            product: '',
            carton: 0,
        }]);
    };

    const removeRow = (id) => {
        setTableData(tableData.filter(row => row.id !== id));
    };

    const handleCellChange = (id, field, value) => {
        console.log(value)
        setTableData(tableData.map(row => {
            if (row.id === id) {

                const updatedRow = { ...row, [field]: value };
                const checking = tableData.find((item) => item.id == id)
                if (field == "product") {
                    if (checking.product != value) {
                        updatedRow.inclGstAmnt = ""
                        updatedRow.netAmunt = ""
                        updatedRow.perBoxAmount = ""
                        updatedRow.PerBoxValueGrs = ""
                        updatedRow.box = 0
                        updatedRow.unit = 0
                        updatedRow.carton = 0
                        updatedRow.Gst = ''
                        updatedRow.discount = ''
                    }

                }
                if (updatedRow.product == "") {
                    updatedRow.inclGstAmnt = ""
                    updatedRow.netAmunt = ""
                    updatedRow.perBoxAmount = ""
                    updatedRow.PerBoxValueGrs = ""
                    updatedRow.box = ""
                    updatedRow.unit = ""
                    updatedRow.carton = ''
                    updatedRow.GrossAmount = ""
                    updatedRow.Gst = ''
                    updatedRow.AfterTaxdiscount = 0
                }

                if (field == "product") {
                    const findProduct = Products.find((item) => item._id === value.value);
                    updatedRow.product = value.value
                    updatedRow.Rate = Number(findProduct.TPSale) || 0


                }

                if (field === "carton" || field === "box") {
                    const findProduct = updatedRow.product ? Products.find((item) => item._id === updatedRow.product) : null;
                    console.log(findProduct)
                    if (findProduct) {


                        const BoxinCarton = parseInt(findProduct.BoxinCarton || 0);
                        const PcsinBox = parseInt(findProduct.PcsinBox || 0);
                        const Allunit = BoxinCarton * PcsinBox;
                        // Default values if empty
                        updatedRow.Amount = (Number(updatedRow.carton) * Number(findProduct.TPSale) * BoxinCarton) + (Number(updatedRow.box) * Number(findProduct.TPSale))

                        const box = parseInt(updatedRow.box || 0);
                        const carton = parseInt(updatedRow.carton || 0);
                        if (box === 0) {
                            updatedRow.unit = Allunit * carton;
                            updatedRow.Remaining = Allunit * carton;;
                        } else if (carton === 0) {
                            updatedRow.unit = PcsinBox * box;
                            updatedRow.Remaining = PcsinBox * box;
                        } else {
                            const totalbox = box * findProduct.PcsinBox
                            updatedRow.unit = Allunit * carton + totalbox;
                        }
                        const boxPrice = (updatedRow.unit / findProduct.PcsinBox)
                        updatedRow.GrossAmount = (boxPrice * updatedRow.Rate)
                        const totalBox = updatedRow.unit / findProduct.PcsinBox
                        console.log(totalBox)
                        updatedRow.perBoxAmount = updatedRow.inclGstAmnt / totalBox - row.discount
                        updatedRow.RetailValue = findProduct.RetailPrice * totalBox
                        updatedRow.PerBoxValueGrs = updatedRow.GrossAmount / totalBox
                        updatedRow.ValueAfterDiscout = updatedRow.GrossAmount - row.discount
                        findProduct.SaleTaxBy == 2 ? updatedRow.Gst = updatedRow.RetailValue / 100 * findProduct.SaleTaxPercent : updatedRow.Gst = (updatedRow.Amount / 100) * findProduct.SaleTaxPercent
                        console.log(updatedRow.Gst = updatedRow.RetailValue / 100 * findProduct.SaleTaxPercent)
                        updatedRow.ValuewithGst = updatedRow.Gst + updatedRow.Amount
                        updatedRow.netAmunt = updatedRow.ValuewithGst
                        updatedRow.netAmuntWithAdvnaceTax = parseFloat(Number(updatedRow.netAmunt))
                        updatedRow.totalBox = totalBox

                    }


                }
                return updatedRow;
            }
            return row;
        }));
    };
    const TotalAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.Amount) || 0), 0);
    const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
    const totalBox = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
    const TotalGst = tableData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0);
    const TotalNetAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);

    const getData = () => {
        const SaleOrder = Order.find((item) => item._id === id)
        reset({
            SaleOrderDate: SaleOrder.SaleOrderDate,
            Remarks: SaleOrder.Remarks,
            salesInvoice: SaleOrder.SaleOrderNumber

        })
        setEditOrder(SaleOrder)
        setSalesLoction(SaleOrder.Location)
        const defultClient = Client.filter((item) => item._id === SaleOrder.Customer).map((val) => ({
            value: val._id,
            label: val.CutomerName

        }))
        console.log(defultClient)
        setPoClient(defultClient)
        setSalesStore(SaleOrder.Store)
        setOderBooker(SaleOrder.OrderBookerId)
        setTableData(SaleOrder.SaleOrderData)
    }

    useEffect(() => {
        getData()
    }, [])
    const onSubmit = async (data) => {
        if (isSubmitting) return
        setIsSubmitting(true)

        data.SaleOrderData = tableData
        data.Location = location[0]?._id,
            data.Store = Store[0]?._id,
            data.Status = "true"
        console.log(data)
        try {
            const res = await updateDataFunction(`/SaleOrder/updateSaleOrder/${id}`, data)
            console.log(res)
            toast.success("Data Edit")
            dispatch(EditSaleOrder(res))
            setTimeout(() => {

                navigate(`/SaleOrderView/${res._id}`)
            }, 2000)
        }
        catch (err) {
            console.log(err)
            setIsSubmitting(false)
            toast.error("some went gone wrong")
            const error = err.response.data.errors
            if (error) {

                try {
                    const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName} on your location`
                    toast.error(notAvalible)
                }
                catch {
                    console.log(err)
                    const notAvalible = `Qty of ${Products.find((item) => item._id == error[0].product).ProductName} Avalibale Qty ${error[0].qty}  you need ${error[0].required} Boxes`
                    toast.error(notAvalible)
                }
            }
        }



    }
    // Filter products with stock > 0
   const inStockProducts = Products.filter((item) => {
    return TotalProducts.some(
        (tp) => tp.ProductName === item._id
    );
});

    const statrtingProduct = inStockProducts.map((item) => ({
        value: item._id,
        label: item.ProductName
    }))


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

    const startingClient = filterClinet.slice(0, 50).map((item) => ({
        label: `${item.CutomerName} ${item.code}`,
        value: item._id
    }));;

    const loadInvoiceOptions = async (inputValue) => {
        console.log(poClient)

        const product = inStockProducts.map((p) => ({
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


    const setClient = (value) => {
        setOderBooker(value)
        const RegClint = Client.filter((item) => item.Region === value.Region)

        console.log(RegClint)
        setFilterClinet(RegClint)
    }

    const OrderBookerDrp = OrderBooker.map((item) => ({
        value: item._id,
        label: item.OrderBookerName,
        Region: item.Region
    }))

    return (
        <div className="p-4  ">
            <ToastContainer />
            <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800 mb-6">Edit Sales Order</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Sale Date</label>
                        <input
                            type="date"
                            {...register("SaleOrderDate", { required: true })}
                            className="w-full px-3 py-2 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Order Booker</label>
                        <Select isDisabled={tableData.length === 0 ? false : true} onChange={(v) => setClient(v)} options={OrderBookerDrp} />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Client</label>
                        <AsyncSelect
                            onChange={(vals) => setPoClient(vals)}
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

                    <div>
                        <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Invoice No</label>
                        <input
                            type="text"
                            disabled
                            defaultValue={''}
                            {...register("salesInvoice")}
                            className="w-full px-3 py-2 text-sm md:text-base border rounded-lg bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Distributor</label>
                        <input
                            type="text"
                            disabled={true}
                            defaultValue={loginVendor?.DistrbutorName}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="md:col-span-2 lg:col-span-2">
                        <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Remarks</label>
                        <input
                            type="text"
                            {...register("Remarks")}
                            className="w-full py-3 text-sm md:text-base border rounded-lg"
                        />
                    </div>

                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 min-w-[200px]">Product</th>
                                <th className="border p-2">CTN</th>
                                <th className="border p-2">BOX</th>
                                <th className="border p-2 hidden lg:table-cell">Rate</th>
                                <th className="border p-2 hidden lg:table-cell">Amount</th>
                                <th className="border p-2 hidden lg:table-cell">Gst</th>
                                <th className="border p-2 hidden lg:table-cell">NetAmount</th>
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="border p-2">
                                        <AsyncSelect
                                            menuPortalTarget={document.body}
                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                            cacheOptions
                                            defaultOptions={statrtingProduct}
                                            loadOptions={loadInvoiceOptions}
                                            value={row.product ? {
                                                value: row.product,
                                                label: Products.find((p) => p._id === row.product)?.ProductName
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
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            value={row.carton}
                                            onChange={(e) => handleCellChange(row.id, 'carton', e.target.value)}
                                            className="w-full p-1 text-xs md:text-sm border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            value={row.box}
                                            onChange={(e) => handleCellChange(row.id, 'box', e.target.value)}
                                            className="w-full p-1 text-xs md:text-sm border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        {row.Rate}
                                    </td>
                                    <td className="border p-2">
                                        {row.Amount}
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
                                            className="bg-red-500 text-white px-2 py-1 text-xs md:text-sm rounded hover:bg-red-600"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {tableData.length !== 0 && (
                            <tfoot>
                                <tr className="bg-gray-100 font-semibold">
                                    <td className="border p-2">Total</td>
                                    <td className="border p-2">{totalCarton}</td>
                                    <td className="border p-2">{totalBox}</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2 hidden lg:table-cell">{TotalAmount?.toFixed(2)}</td>
                                    <td className="border p-2 hidden lg:table-cell">{TotalGst?.toFixed(2)}</td>
                                    <td className="border p-2 hidden lg:table-cell">{TotalNetAmount?.toFixed(2)}</td>
                                    <td className="border p-2"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <button
                        type="button"
                        onClick={addNewRow}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm md:text-base"
                    >
                        Add Row
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Updating..." : "Update Sale Order"}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default SaleOrderEdit