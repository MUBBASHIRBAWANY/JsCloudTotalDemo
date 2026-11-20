import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import AppSelect from '../../Global/AppSelect.jsx'
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { EditSaleOrderReducer } from '../../../Redux/Reducers/OrderDCReducer';

import { fetchClient } from '../../../Redux/Reducers/ClientReducer';

const SaleOrderEdit = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch()
    const { id } = useParams()
    const [poClient, setPoClient] = useState(null);
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
    console.log(OrderBooker, 'orderbooker')
    const Order = useSelector((state) => state.DistributorOrder.DistributorOrder)
    console.log(Order, 'order');
    const EditDistributor = useSelector(
        (state) => state.DistributroReducers.DistributroReducers
    );

    const [clients, setClients] = useState([])
    const [editOrder, setEditOrder] = useState('')
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
        console.log(tableData);

        // setTableData([...tableData, {
        //     id: Date.now(),
        //     product: '',
        //     carton: 0,
        // }]);

        setTableData(prev => [
            ...(Array.isArray(prev) ? prev : []),
            {
                id: Date.now(),
                product: '',
                carton: 0,
            }
        ]);
    };

    const removeRow = (id) => {
        setTableData(tableData.filter(row => row.id !== id));
    };

    // const handleCellChange = (id, field, value) => {
    //     console.log(field)
    //     setTableData(tableData.map(row => {
    //         if (row.id === id) {

    //             const updatedRow = { ...row, [field]: value };
    //             updatedRow.product = updatedRow.product.value || updatedRow.product
    //             const checking = tableData.find((item) => item.id == id)
    //             if (field == "product") {
    //                 if (checking.product != value) {
    //                     updatedRow.rate = 0
    //                     updatedRow.carton = 0
    //                 }
    //             }
    //             if (updatedRow.product == "") {
    //                 updatedRow.Amount = 0
    //                 updatedRow.carton = 0
    //             }
    //             const findProduct = Products.find((item) => item._id === updatedRow.product);
    //             if (field == "product") {
    //                 updatedRow.unit = 0 // comparison nahi assignment
    //                 console.log(findProduct)
    //                 updatedRow.rate = findProduct ? findProduct.TPSale : 0
    //             }
    //             updatedRow.Remaingcarton = updatedRow.carton
    //             updatedRow.Amount = updatedRow.carton * updatedRow.rate
    //             return updatedRow;
    //         }
    //         return row;
    //     }));
    // };

    const handleCellChange = (id, field, value) => {
        setTableData(prev =>
            prev.map(row => {
                if (row.id !== id) return row;

                const updatedRow = { ...row };

                if (field === "product") {
                    updatedRow.product = value?.value || "";
                    const product = Products.find(p => p._id === updatedRow.product);
                    updatedRow.rate = product ? product.TPSale : 0;
                    updatedRow.carton = 0;
                }

                if (field === "carton") {
                    updatedRow.carton = Number(value);
                }

                if (field === "rate") {
                    updatedRow.rate = Number(value);
                }

                updatedRow.Amount = (updatedRow.carton || 0) * (updatedRow.rate || 0);

                return updatedRow;
            })
        );
    };
    const TotalAmount = tableData?.reduce((sum, row) => sum + (parseFloat(row?.Amount) || 0), 0);
    const totalCarton = tableData?.reduce((sum, row) => sum + (parseInt(row?.carton) || 0), 0);

    const getData = async () => {
        let SaleOrder = Order.find((item) => item._id === id && Array.isArray(item.OrderData))
        if (!SaleOrder) {
            try {
                SaleOrder = await getDataFundtion(`/DistributorSaleOrder/${id}`)
            } catch (err) {
                console.log(err)
                return
            }
        }
        if (!SaleOrder?.OrderDate) return
        console.log(SaleOrder, "SaleOrder")
        reset({
            SaleOrderDate: SaleOrder.OrderDate,
            Remarks: SaleOrder.Remarks,
            salesInvoice: SaleOrder.OrderCode

        })
        // console.log(SaleOrder, 'saleorder');
        setEditOrder(SaleOrder)
        console.log(editOrder, 'editOrder');

        setSalesLoction(SaleOrder.Location)
        setDrp(SaleOrder.Location)
        const defultClient = Client.filter((item) => item._id === SaleOrder.Customer).map((val) => ({
            value: val._id,
            label: val.CutomerName

        }))
        console.log(defultClient)
        // setPoClient(defultClient)
        setPoClient(defultClient[0] || null)
        setSalesStore(SaleOrder.Store)
        setOderBooker(SaleOrder.OrderBookerId)
        setTableData(SaleOrder.OrderData)
        // console.log(SaleOrder, 'saleorderdata')
        // console.log(tableData, "tabledata164");
        setFilterClinet(Client)
    }

    //     useEffect(() => {
    //    console.log(editOrder, 'editorderdata')
    // }, [editOrder])
    useEffect(() => {
        getData()
    }, [id])
    //     useEffect(() => {
    //    dispatch(fetchClient())
    // }, [])
    const onSubmit = async (data) => {

        data.OrderData = tableData;
        data.Remarks = data.Remarks || "";
        data.OrderDate = data.SaleOrderDate
        console.log(data)
        try {
            const res = await updateDataFunction(`/DistributorSaleOrder/updateSaleOrder/${id}`, data)
            console.log(res,)
            toast.success("Data Edit")
            dispatch(EditSaleOrderReducer(res))
            setTimeout(() => {

                navigate(`/SaleOrderView/${res._id}`)
            }, 2000)
        }
        catch (err) {
            console.log(err)
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
    const statrtingProduct = Products.map((item) => ({
        value: item._id,
        label: item.ProductName
    }))


    const loadclients = async (inputValue) => {
        if (!inputValue) return [];
        console.log(Client);

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

    useEffect(() => {
        console.log("Redux Client:", Client)
    }, [Client])
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
    const defultLocation = Location.find((item) => item.value == loginVendor.Location[0])
    console.log(Location)
    const selectedStore = {
        label: defultStore?.StoreName,
        value: defultStore?._id,

    }

    const setDrp = (value) => {
        setSalesLoction(value)
        const values = value?.value || value;
        setSelectedLocation(values);
        setSalesStore([]);
        const userStore = loginVendor?.Store
        const updatedStoreDrp = Store?.filter(item => values?.includes(item?.Location))
            .filter(store => userStore.includes(store._id))
            .map((st) => ({
                label: st.StoreName,
                value: st._id
            }))

        setStoreDrp(updatedStoreDrp);
        console.log(storeDrp)
    }

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
        <div className="p-4">
            <ToastContainer />
            <h1 className="pd-page-title text-center mb-6">Edit Sales Order</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-bg-surface p-4 md:p-6 rounded-lg shadow-md">
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
                        <label className="pd-label">Distributor</label>
                        <AppSelect isDisabled={true} onChange={(v) => setClient(v)} options={OrderBookerDrp} value={(() => {
                            const distributor = EditDistributor.find(
                                (item) => item._id === editOrder?.Distrbutor
                            );
                            return distributor
                                ? { label: distributor.DistrbutorName, value: distributor._id }
                                : null;
                        })()} />
                    </div>

                    <div>
                        <label className="pd-label">Order No</label>
                        <input
                            type="text"
                            disabled
                            defaultValue={''}
                            {...register("salesInvoice")}
                            className="pd-input-readonly text-sm md:text-base"
                        />
                    </div>
             
                    <div>
                        <label className="pd-label">Store</label>
                        <input
                            type="text"
                            disabled={true}
                            defaultValue={defultStore?.StoreName}
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
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData?.map((row) => (
                                <tr key={row.id} >
                                    <td className="border p-2">
                                        <AppAsyncSelect
                                            cacheOptions
                                            defaultOptions={statrtingProduct}
                                            loadOptions={loadInvoiceOptions}
                                            value={row.product ? {
                                                value: `${row.product}`,
                                                label: Products.find((p) => p._id === row.product)?.ProductName || "Loading..."
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
                        {tableData?.length !== 0 && (
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2">Total</td>
                                    <td className="border p-2">{totalCarton}</td>
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
                        Edit Sale Order
                    </button>
                </div>
            </form>
        </div>
    )
}

export default SaleOrderEdit

// import React, { useEffect, useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { useDispatch, useSelector } from 'react-redux';
// import { useNavigate, useParams } from 'react-router-dom';
// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// import AsyncSelect from 'react-select/async';
// import Select from 'react-select'

// import { updateDataFunction } from '../../../Api/CRUDFunctions';
// import { EditSaleOrderReducer } from '../../../Redux/Reducers/OrderDCReducer';



// const SaleOrderEdit = () => {
//     const navigate = useNavigate();
//     const dispatch = useDispatch()
//     const { id } = useParams()
//     const [poClient, setPoClient] = useState(null);
//     const [filterClinet, setFilterClinet] = useState([])
//     const Client = useSelector((state) => state.Client.client)
//     const Products = useSelector((state) => state.Product.product);
//     const Vendor = useSelector((state) => state.Vendor.state)
//     const location = useSelector((state) => state.Location.Location)
//     const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
//     const Store = useSelector((state) => state.Store.Store)
//     const [AllProduct, SetAllProduct] = useState([])
//     const [tableData, setTableData] = useState([]);
//     const [OderBooker, setOderBooker] = useState([])
//     const [selectedLocation, setSelectedLocation] = useState([])
//     const [salesLoction, setSalesLoction] = useState([])
//     const [salesStore, setSalesStore] = useState([])
//     const [storeDrp, setStoreDrp] = useState([])
//     const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
//     const Order = useSelector((state) => state.DistributorOrder.DistributorOrder)


//     const [editOrder, setEditOrder] = useState("")
//     const Location = location.filter(item => loginVendor.Location.includes(item._id))
//         .map((item) => ({
//             label: item.LocationName,
//             value: item._id
//         }))

//     const { register, handleSubmit, formState: { errors }, reset } = useForm();

//     const addNewRow = () => {
//         if (!poClient) {
//             return toast.error("first Select Client ")
//         }

//         setTableData([...tableData, {
//             id: Date.now(),
//             product: '',
//             carton: 0,
//         }]);
//     };

//     const removeRow = (id) => {
//         setTableData(tableData.filter(row => row.id !== id));
//     };

//     const handleCellChange = (id, field, value) => {
//         //console.log(field)
//         setTableData(tableData.map(row => {
//             if (row.id === id) {

//                 const updatedRow = { ...row, [field]: value };
//                 updatedRow.product = updatedRow.product.value || updatedRow.product
//                 const checking = tableData.find((item) => item.id == id)
//                 if (field == "product") {
//                     if (checking.product != value) {
//                         updatedRow.rate = 0
//                         updatedRow.carton = 0
//                     }
//                 }
//                 if (updatedRow.product == "") {
//                     updatedRow.Amount = 0
//                     updatedRow.carton = 0
//                 }
//                 const findProduct = Products.find((item) => item._id === updatedRow.product);
//                 if (field == "product") {
//                     updatedRow.unit == 0
//                     //console.log(findProduct)
//                     updatedRow.rate = findProduct ? findProduct.TPSale : 0
//                 }
//                 updatedRow.Remaingcarton = updatedRow.carton
//                 updatedRow.Amount = updatedRow.carton * updatedRow.rate
//                 return updatedRow;
//             }
//             return row;
//         }));
//     };
//     const TotalAmount = tableData?.reduce((sum, row) => sum + (parseFloat(row?.Amount) || 0), 0);
//     const totalCarton = tableData?.reduce((sum, row) => sum + (parseInt(row?.carton) || 0), 0);

//     const getData = () => {
//         const SaleOrder = Order.find((item) => item._id === id)
//         reset({
//             SaleOrderDate: SaleOrder.SaleOrderDate,
//             Remarks: SaleOrder.Remarks,
//             salesInvoice: SaleOrder.SaleOrderNumber

//         })
//         setEditOrder(SaleOrder)
//         setSalesLoction(SaleOrder.Location)
//         setDrp(SaleOrder.Location)
//         const defultClient = Client.filter((item) => item._id === SaleOrder.Customer).map((val) => ({
//             value: val._id,
//             label: val.CutomerName

//         }))
//         //console.log(defultClient)
//         setPoClient(defultClient)
//         setSalesStore(SaleOrder.Store)
//         setOderBooker(SaleOrder.OrderBookerId)
//         setTableData(SaleOrder.SaleOrderData)
//     }

//     useEffect(() => {
//         getData()
//     }, [])
//     const onSubmit = async (data) => {

//         data.SaleOrderData = tableData
//         data.Location = location[0]?._id,
//             data.Store = Store[0]?._id,
//             data.Status = "true"
//         //console.log(data)
//         try {
//             const res = await updateDataFunction(`/SaleOrder/updateSaleOrder/${id}`, data)
//             //console.log(res)
//             toast.success("Data Edit")
//             dispatch(EditSaleOrderReducer(res))
//             setTimeout(() => {

//                 navigate(`/SaleOrderView/${res._id}`)
//             }, 2000)
//         }
//         catch (err) {
//             //console.log(err)
//             toast.error("some went gone wrong")
//             const error = err.response.data.errors
//             if (error) {

//                 try {
//                     const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName} on your location`
//                     toast.error(notAvalible)
//                 }
//                 catch {
//                     //console.log(err)
//                     const notAvalible = `Qty of ${Products.find((item) => item._id == error[0].product).ProductName} Available Qty ${error[0].qty}  you need ${error[0].required} Boxes`
//                     toast.error(notAvalible)
//                 }
//             }
//         }



//     }
//     const statrtingProduct = Products.map((item) => ({
//         value: item._id,
//         label: item.ProductName
//     }))


//     const loadclients = async (inputValue) => {
//         if (!inputValue) return [];

//         const filtered = Client
//             .filter((item) =>
//                 item.CutomerName.toLowerCase().includes(inputValue.toLowerCase()) || item.code.toLowerCase().includes(inputValue.toLowerCase())
//             )
//             .slice(0, 50);

//         return filtered.map((item) => ({
//             label: `${item.CutomerName} ${item.code}`,
//             value: item._id
//         }));
//     }

//     const startingClient = filterClinet.slice(0, 50).map((item) => ({
//         label: `${item.CutomerName} ${item.code}`,
//         value: item._id
//     }));;

//     const loadInvoiceOptions = async (inputValue) => {
//         //console.log(poClient)

//         const product = Products.map((p) => ({
//             label: `${p.ProductName}`,
//             value: p._id
//         }))
//         //console.log(product)
//         if (!inputValue) return [];
//         const AllProduct = product

//         const filtered = AllProduct
//             .filter((item) =>
//                 item.label.toLowerCase().includes(inputValue.toLowerCase())
//             )
//             .slice(0, 50); // limit to first 50 results
//         return filtered.map((item) => ({
//             label: item.label,
//             value: item.value
//         }));

//     };
//     const defultStore = Store.find((item) => item._id == loginVendor.Store[0])
//     const selectedStore = {
//         label: defultStore?.StoreName,
//         value: defultStore?._id,

//     }

//     const setDrp = (value) => {
//         setSalesLoction(value)
//         const values = value?.value || value;
//         setSelectedLocation(values);
//         setSalesStore([]);
//         const userStore = loginVendor?.Store
//         const updatedStoreDrp = Store?.filter(item => values?.includes(item?.Location))
//             .filter(store => userStore.includes(store._id))
//             .map((st) => ({
//                 label: st.StoreName,
//                 value: st._id
//             }))

//         setStoreDrp(updatedStoreDrp);
//         //console.log(storeDrp)
//     }

//     const setClient = (value) => {
//         setOderBooker(value)
//         const RegClint = Client.filter((item) => item.Region === value.Region)

//         //console.log(RegClint)
//         setFilterClinet(RegClint)
//     }

//     const OrderBookerDrp = OrderBooker.map((item) => ({
//         value: item._id,
//         label: item.OrderBookerName,
//         Region: item.Region
//     }))

//     return (
//         <div className="p-4">
//             <ToastContainer />
//             <h1 className="pd-page-title text-center mb-6">Edit Sales Order</h1>

//             <form onSubmit={handleSubmit(onSubmit)} className="pd-bg-surface p-4 md:p-6 rounded-lg shadow-md">
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//                     <div>
//                         <label className="pd-label">Sale Date</label>
//                         <input
//                             type="date"
//                             {...register("SaleOrderDate", { required: true })}
//                             className="pd-input"
//                         />
//                     </div>
//                     <div>
//                         <label className="pd-label">Order Booker</label>
//                         <AppSelect isDisabled={true} onChange={(v) => setClient(v)} options={OrderBookerDrp} value={OrderBookerDrp.filter((item) => item.value === editOrder.OrderBookerId)} />
//                     </div>
//                     <div>
//                         <label className="pd-label">Client</label>
//                         <AppAsyncSelect
//                             onChange={(vals) => setPoClient(vals)}
//                             loadOptions={loadclients}
//                             defaultOptions={startingClient}
//                             value={poClient}
//                             className="basic-single text-sm"
//                             classNamePrefix="pd-select"
//                             isSearchable
//                             isDisabled={true}
//                             placeholder="Select customer..."
//                             styles={{
//                                 control: (provided) => ({
//                                     ...provided,
//                                     minHeight: '40px',
//                                     fontSize: '14px'
//                                 })
//                             }}
//                         />
//                     </div>

//                     <div>
//                         <label className="pd-label">Order No</label>
//                         <input
//                             type="text"
//                             disabled
//                             defaultValue={''}
//                             {...register("salesInvoice")}
//                             className="pd-input-readonly text-sm md:text-base"
//                         />
//                     </div>
//                     <div>
//                         <label className="pd-label">Location</label>
//                         <input
//                             type="text"
//                             disabled={true}
//                             defaultValue={location[0]?.LocationName}
//                             className="pd-input"
//                         />
//                     </div>
//                     <div>
//                         <label className="pd-label">Store</label>
//                         <input
//                             type="text"
//                             disabled={true}
//                             defaultValue={Store[0]?.StoreName}
//                             className="pd-input"
//                         />

//                     </div>
//                     <div className="md:col-span-2 lg:col-span-2">
//                         <label className="pd-label">Remarks</label>
//                         <input
//                             type="text"
//                             {...register("Remarks")}
//                             className="w-full py-3 text-sm md:text-base border rounded-lg"
//                         />
//                     </div>

//                 </div>

//                 <div className="overflow-x-auto mb-6">
//                     <table className="w-full border-collapse text-sm md:text-base">
//                         <thead>
//                             <tr>
//                                 <th className="border p-2 min-w-[200px]">Product</th>
//                                 <th className="border p-2">CTN</th>
//                                 <th className="border p-2 hidden lg:table-cell">Rate</th>
//                                 <th className="border p-2">Action</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {tableData?.map((row) => (
//                                 <tr key={row.id} >
//                                     <td className="border p-2">
//                                         <AppAsyncSelect
//
//
//                                             cacheOptions
//                                             defaultOptions={statrtingProduct}
//                                             loadOptions={loadInvoiceOptions}
//                                             value={row.product ? {
//                                                 value: `${row.product} `,
//                                                 label: `${Products.find((p) => p._id === row.product)?.ProductName}`
//                                             } : null}
//                                             onChange={(selectedOption) =>
//                                                 handleCellChange(row.id, 'product', selectedOption || '')
//                                             }
//                                             className="text-sm"
//                                             classNamePrefix="pd-select"
//                                             placeholder="Select Product..."
//                                             isSearchable
//                                             isClearable
//                                         />
//                                     </td>
//                                     <td className="border p-2">
//                                         <input
//                                             type="number"
//                                             value={row.carton}
//                                             onChange={(e) => handleCellChange(row.id, 'carton', e.target.value)}
//                                             className="w-full p-1 text-xs md:text-sm border rounded"
//                                         />
//                                     </td>
//                                     <td className="border p-2">
//                                         <input
//                                             type="number"
//                                             value={row.rate}
//                                             onChange={(e) => handleCellChange(row.id, 'rate', e.target.value)}
//                                             className="w-full p-1 text-xs md:text-sm border rounded"
//                                         />
//                                     </td>
//                                     <td className="border p-2">
//                                         <button
//                                             type="button"
//                                             onClick={() => removeRow(row.id)}
//                                             className="pd-btn-icon-danger text-xs md:text-sm"
//                                         >
//                                             Remove
//                                         </button>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                         {tableData?.length !== 0 && (
//                             <tfoot>
//                                 <tr className="pd-table-footer">
//                                     <td className="border p-2">Total</td>
//                                     <td className="border p-2">{totalCarton}</td>
//                                     <td className="border p-2 hidden lg:table-cell">{TotalAmount?.toFixed(2)}</td>
//                                     <td className="border p-2"></td>
//                                 </tr>
//                             </tfoot>
//                         )}
//                     </table>
//                 </div>

//                 <div className="flex flex-col md:flex-row gap-4 justify-between">
//                     <button
//                         type="button"
//                         onClick={addNewRow}
//                         className="pd-btn-success px-4 py-2 text-sm md:text-base"
//                     >
//                         Add Row
//                     </button>
//                     <button
//                         type="submit"
//                         className="pd-btn-save text-sm md:text-base"
//                     >
//                         Edit Sale Order
//                     </button>
//                 </div>
//             </form>
//         </div>
//     )
// }

// export default SaleOrderEdit