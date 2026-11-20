import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import AppSelect from '../Global/AppSelect.jsx'
import { generateNextCode, generateNextCodeForOrder } from '../Global/GenrateCode';
import { AddSaleOrder, fetchSaleOrder } from '../../Redux/Reducers/SaleOrderReducer';



const SaleOrderAdd = () => {
    const navigate = useNavigate();
    const [poClient, setPoClient] = useState(null);
    const [lginerStore, setlginerStore] = useState([])
    const [lginerlocation, setlginerlocation] = useState([])
    const [filterClinet, setFilterClinet] = useState([])
    const Client = useSelector((state) => state.Client.client)
    const Products = useSelector((state) => state.Product.product);
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
const dispatch = useDispatch()


    const Location = location.filter(item => loginVendor.Location.includes(item._id))
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
            
        }]);
    };

    const removeRow = (id) => {
        setTableData(tableData.filter(row => row.id !== id));
    };

    const handleCellChange = (id, field, value) => {
        //console.log(field)
        setTableData(tableData.map(row => {
            if (row.id === id) {

                const updatedRow = { ...row, [field]: value };
                updatedRow.product = updatedRow.product.value || updatedRow.product
                const checking = tableData.find((item) => item.id == id)
                if (field == "product") {
                    if (checking.product != value) {
                        updatedRow.rate = 0
                        updatedRow.carton = ""
                    }
                }
                if (updatedRow.product == "") {
                    updatedRow.Amount = 0
                    updatedRow.carton = ''
                }
                const findProduct = Products.find((item) => item._id === updatedRow.product);
                if (field == "product") {
                    updatedRow.unit == 0
                    //console.log(findProduct)                    
                    updatedRow.rate = findProduct ? findProduct.TPSale : 0
                }
                updatedRow.Remaingcarton = updatedRow.carton
                updatedRow.Amount = updatedRow.carton * updatedRow.rate
                return updatedRow;
            }
            return row;
        }));
    };
    const TotalAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.Amount) || 0), 0);
    const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);

    const onSubmit = async (data) => {
        data.Customer = poClient.value
        data.SaleOrderData = tableData
        data.Location= location[0]?._id,
        data.Store  = Store[0]?._id,
        data.OrderBookerName = OderBooker.label,
            data.OrderBookerId = OderBooker.value
        data.Status = "true"

        //console.log(data)
        try {
            const lastCode = await getDataFundtion("/SaleOrder/lastcode")
            //console.log(lastCode.data)

            lastCode.data == null ? data.SaleOrderNumber = "000001" : data.SaleOrderNumber = generateNextCodeForOrder(lastCode.data.SaleOrderNumber)
//console.log(data ,"data")
            const res = await createDataFunction('/SaleOrder', data)
            //console.log(res)
            dispatch(AddSaleOrder(res))
            toast.success("Sales Invoice Add")
            setTimeout(() => {

                navigate(`/SaleOrderView/${res._id}`)
            }, 2000)
        }
        catch (err) {
            //console.log(err)
            toast.error("some went gone wrong")
            const error = err.response.data.errors
            if (error) {

                try {
                    const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName} on your location`
                    toast.error(notAvalible)
                }
                catch {
                    //console.log(err)
                    const notAvalible = `Qty of ${Products.find((item) => item._id == error[0].product).ProductName} Available Qty ${error[0].qty}  you need ${error[0].required} Boxes`
                    toast.error(notAvalible)
                }
            }
        }



    }
    const statrtingProduct = Products.map((item) => ({
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
        //console.log(poClient)

        const product = Products.map((p) => ({
            label: `${p.ProductName}`,
            value: p._id
        }))
        //console.log(product)
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
        value: defultStore?._id,

    }

    const setDrp = (value) => {
        setSalesLoction(value)
        const values = value.value;
        setSelectedLocation(values);
        setSalesStore([]);
        const userStore = loginVendor.Store
        const updatedStoreDrp = Store?.filter(item => values.includes(item.Location))
            .filter(store => userStore.includes(store._id))
            .map((st) => ({
                label: st.StoreName,
                value: st._id
            }))

        setStoreDrp(updatedStoreDrp);
        //console.log(storeDrp)
    }

    const setClient = (value) => {
        setOderBooker(value)
        const RegClint = Client.filter((item) => item.Region === value.Region)

        //console.log(RegClint)
        setFilterClinet(RegClint)
    }

    const OrderBookerDrp = OrderBooker.map((item) => ({
        value: item._id,
        label: item.OrderBookerName,
        Region: item.Region
    }))


    
    useEffect(() => {

        const Userstore = Store.find((item) => item._id == loginVendor?.Store[0])
        const UserLocation = location.find((item) => item._id == loginVendor?.Location)

        setlginerlocation(UserLocation)
        setlginerStore(Userstore)
        const today = new Date();
        const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
        reset({
            SaleOrderDate: formatted
        })
    }, []);
    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-xl md:pd-page-title text-center mb-6">Create Sales Order</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="pd-label">Sale Date</label>
                        <input
                            type="date"
                            {...register("SaleOrderDate", { required: true })}
                            className="pd-input"
                        />
                    </div>
                    <div>
                        <label className="pd-label">Order Booker</label>
                        <AppSelect isDisabled={tableData.length === 0 ? false : true} onChange={(v) => setClient(v)} options={OrderBookerDrp} />
                    </div>
                    <div>
                        <label className="pd-label">Client</label>
                        <AppAsyncSelect
                            onChange={(vals) => setPoClient(vals)}
                            loadOptions={loadclients}
                            defaultOptions={startingClient}
                            value={poClient}
                            className="basic-single" compact
                            classNamePrefix="pd-select"
                            isSearchable
                            isDisabled={tableData.length === 0 ? false : true}
                            placeholder="Select customer..."
                        />
                    </div>

                    <div>
                        <label className="pd-label">Invoice No</label>
                        <input
                            type="text"
                            disabled
                            defaultValue={''}
                            {...register("salesInvoice")}
                            className="pd-input-readonly text-sm md:text-base"
                        />
                    </div>
                    <div>
                        <label className="pd-label">Location</label>
                        <input
                            type="text"
                            disabled={true}
                            defaultValue={location[0]?.LocationName}
                            className="pd-input"
                        />
                    </div>
                    <div>
                        <label className="pd-label">Store</label>
                        <input
                            type="text"
                            disabled={true}
                            defaultValue={Store[0]?.StoreName}
                            className="pd-input"
                        />

                    </div>
                    <div className="md:col-span-2 lg:col-span-2">
                        <label className="pd-label">Remarks</label>
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
                            <tr>
                                <th className="border p-2 min-w-[200px]">Product</th>
                                <th className="border p-2">CTN</th>
                                <th className="border p-2 hidden lg:table-cell">Rate</th>
                                <th className="border p-2 hidden lg:table-cell">Amount</th>
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id} >
                                    <td className="border p-2">
                                        <AppAsyncSelect
                                            cacheOptions
                                            defaultOptions={statrtingProduct}
                                            loadOptions={loadInvoiceOptions}
                                            value={row.product ? {
                                                value: `${row.product} `,
                                                label: `${Products.find((p) => p._id === row.product)?.ProductName}`
                                            } : null}
                                            onChange={(selectedOption) =>
                                                handleCellChange(row.id, 'product', selectedOption || '')
                                            }
                                            className="text-sm"
                                            classNamePrefix="pd-select"
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
                                            value={row.rate}
                                            onChange={(e) => handleCellChange(row.id, 'rate', e.target.value)}
                                            className="w-full p-1 text-xs md:text-sm border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">

                                        {row.Amount}
                                    </td>
                                    <td className="border p-2">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="pd-btn-icon-danger text-xs md:text-sm"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {tableData.length !== 0 && (
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2">Total</td>
                                    <td className="border p-2">{totalCarton}</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2 hidden lg:table-cell">{TotalAmount?.toFixed(2)}</td>
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
                        className="pd-btn-success px-4 py-2 text-sm md:text-base"
                    >
                        Add Row
                    </button>
                    <button
                        type="submit"
                        className="pd-btn-save text-sm md:text-base"
                    >
                        Create Sale Order
                    </button>
                </div>
            </form>
        </div>
    )
}

export default SaleOrderAdd