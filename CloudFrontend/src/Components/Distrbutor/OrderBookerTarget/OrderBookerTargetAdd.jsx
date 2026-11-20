import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppSelect from '../../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';
import { CircularProgress } from '@mui/material';
//SndcreateDataFunction


const OrderBookerTargetAdd = () => {
    const navigate = useNavigate();
    const Products = useSelector((state) => state.Product.product);
    const SndProducts = Products.filter((item) => item.isForSND == "true")
    const EditOrderBooker = useSelector((state) => state.DistributorOrderBooker.DistributorOrderBooker)


    const [loading, setLoading] = useState(false)
    const [disabled , setdisabled] = useState(true)
    const [selectedOrderBooker, setSelectedOrderBooker] = useState([])

    const [DrpOrderBooker, setDrpOrderBooker] = useState([])
    const [City, setCity] = useState("")
    const AllCity = useSelector((state) => state.City.City)

    const notify = () => toast("Product Duplicate In Purchase Order");

    const [tableData, setTableData] = useState([]);
    const [lginerlocation, setlginerlocation] = useState([])


    const dispatch = useDispatch()

    useEffect(() => {
        const today = new Date();
        const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
        reset({
            OrderDate: formatted
        })
    }, []);



    const getData = async () => {
        const EditOrderBookerDrp = EditOrderBooker.map((item) => {



            return {
                value: item._id,
                label: `${item.OrderBookerName} (${item.code || ""})`,


            }
        })

        setDrpOrderBooker(EditOrderBookerDrp.slice(0, 50))
        const arrProduct = Products.length == 0 ? await getDataFundtion('/product') : Products
        Products.length == 0 ? dispatch(fetchproduct(arrProduct?.data)) : null




    }




    useEffect(() => {
        getData()
    }, [])

    const loadclients = async (inputValue) => {
        console.log(inputValue, "cc")
        if (!inputValue) return [];
        const search = inputValue.toLowerCase();

        const filtered = EditOrderBooker
            .filter((item) =>
                (item?.OrderBookerName?.toLowerCase().includes(search)) ||
                (item?.code?.toLowerCase().includes(search))
            )
            .slice(0, 50);
        console.log(filtered, "ff")
        return filtered.map((item) => ({
            label: `${item.OrderBookerName} ${item.code}` || "Unknown",
            value: item._id,
        }));
    }

    const { register, handleSubmit, formState: { errors }, reset } = useForm();

    const addNewRow = () => {
        setTableData([...tableData, {
            id: Date.now(),
            product: '',
            box: 0,
            BOX: 0,
            Gst: 0
        }]);
    };



    const removeRow = (id) => {
        setTableData(tableData.filter(row => row.id !== id));
    };
    const loadInvoiceOptions = async (inputValue) => {
        if (!inputValue) return [];
        //console.log(SndProducts)
        const filtered = SndProducts
            .filter((item) =>
                item.ProductName.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results
        //console.log(filterProduct)
        return filtered.map((item) => ({
            label: `${item.ProductName} ${item.mastercode}`,
            value: item._id

        }));
    };

    const StartingProduct = SndProducts.slice(0, 50).map((item) => ({
        label: `${item.ProductName}`,
        value: item._id
    }));;


    const handleCellChange = (id, field, value) => {
        //console.log(field)
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
                        updatedRow.GrossAmount = ""
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

                const findProduct = Products.find((item) => item._id === updatedRow.product);
                if (field == "product") {
                    console.log(field)
                    if (tableData.find((item) => item.product === value && item.id !== id)) {
                        notify();
                        return updatedRow.product = "";
                    }

                    updatedRow.unit == 0
                    updatedRow.Rate = Number(findProduct.TPSale) || 0

                }

                if (field === "carton" || field === "box") {

                    if (findProduct) {


                        const BoxinCarton = parseInt(findProduct.BoxinCarton || 0);
                        const PcsinBox = parseInt(findProduct.PcsinBox || 0);
                        const Allunit = BoxinCarton * PcsinBox;
                        // Default values if empty
                        updatedRow.GrossAmount = (Number(updatedRow.carton) * Number(updatedRow.Rate))
                        //console.log(Number(updatedRow.Rate))
                        updatedRow.ValueAfterDiscout = updatedRow.GrossAmount - row.discount
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
                        //console.log(totalBox)
                        updatedRow.perBoxAmount = updatedRow.inclGstAmnt / totalBox - row.discount
                        updatedRow.RetailValue = findProduct.RetailPrice * totalBox
                        updatedRow.PerBoxValueGrs = updatedRow.GrossAmount / totalBox
                        updatedRow.ValueAfterDiscout = updatedRow.GrossAmount - row.discount
                        findProduct.SaleTaxBy == 2 ? updatedRow.Gst = updatedRow.RetailValue / 100 * findProduct.SaleTaxPercent : updatedRow.Gst = updatedRow.GrossAmount / 100 * findProduct.SaleTaxPercent - updatedRow.discount
                        updatedRow.ValuewithGst = updatedRow.Gst + updatedRow.ValueAfterDiscout
                        updatedRow.netAmunt = parseFloat(updatedRow.ValuewithGst - (updatedRow.AfterTaxdiscount || 0)).toFixed(4)
                        updatedRow.netAmuntWithAdvnaceTax = parseFloat(Number(updatedRow.netAmunt))
                        updatedRow.totalBox = totalBox


                    }


                }
                return updatedRow;
            }
            return row;
        }));
    };
    const totalDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0);
    const totalGST = tableData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0);
    const totalNetAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);
    const totalBOX = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
    const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
    const totalGrossAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.GrossAmount) || 0), 0);
    const totalValueAfterDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.ValueAfterDiscout) || 0), 0);
    const onSubmit = async (data) => {
        if (tableData.length == 0) {
            toast.error("Empty table not allow")
        }
        data.OrderBooker = selectedOrderBooker.value
            data.TargetData = tableData
        
        console.log(data)
        try {
            // await SndcreateDataFunction('/PurchaseOrder', data)
            setdisabled(true)
            setLoading(true)
             await createDataFunction("/Target", data)
            toast.success("Data Add")
            setTimeout(() => {
                //navigate(`/PurchaseInvoiceView/${res._id}`)
                 navigate(`/OrderBookerTarget`)
            }, 2000)
        } catch (err) {
            //console.log(err)
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
            setdisabled(false)
        }

    };
    const setDrp = (value) => {
        setSelectedOrderBooker(value)
        setSelectedLocation(value)
        const cityName = AllCity.find((item) => item._id == value.City)
        setCity(cityName?.CityName || "")
        //


    }

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="pd-page-title text-center mb-6">OrderBooker SaleOrder Add </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="pd-label">Order Date</label>
                        <input
                            type="month"
                            {...register("Month", { required: true })}
                            className="pd-input"
                        />
                    </div>

                    <div>
                        <label className="pd-label">OrderBooker</label>
                        <AppSelect
                            cacheOptions
                            onChange={(op) => setSelectedOrderBooker(op)}
                            options={DrpOrderBooker}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select OrderBooker"
                        />
                    </div>
                    <div>
                        <label className="pd-label">Remarks</label>
                        <input
                            type="text"
                            {...register("Remarks", { required: true })}
                            className="pd-input"
                        />
                    </div>
                    <div>
                        <label className="pd-label">Order No</label>
                        <input
                            type="text"
                            disabled
                            defaultValue={''}
                            {...register("purchase")}
                            className="pd-input pd-bg-muted"
                        />
                    </div>
                    <div>
                        <label className="pd-label">City</label>
                        <input
                            type="text"
                            disabled
                            defaultValue={City || ''}
                            className="pd-input-readonly text-sm md:text-base"
                        />
                    </div>
                </div>

                {/* Excel-like Table */}
                <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="border px-36">Product</th>
                                <th className="border p-2">Carton</th>
                                <th className="border p-2">Box</th>
                               
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id} >
                                    <td className="border p-2">
                                        <AppAsyncSelect
                                            cacheOptions
                                            onChange={(selectedOption) =>
                                                handleCellChange(row.id, 'product', selectedOption ? selectedOption.value : '')
                                            }
                                            loadOptions={loadInvoiceOptions}
                                            className="basic-single"
                                            classNamePrefix="pd-select"
                                            isSearchable
                                            placeholder="Select Product"
                                            defaultOptions={StartingProduct}
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="text"
                                            value={row.carton}
                                            onChange={(e) => handleCellChange(row.id, 'carton', e.target.value)}
                                            className="w-full p-1 border rounded"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="text"
                                            value={row.box}
                                            onChange={(e) => handleCellChange(row.id, 'box', e.target.value)}
                                            className="w-full p-1 border rounded"
                                        />
                                    </td>
                               
                                    <td className="border p-2">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="pd-btn-icon-danger hover:bg-red-600"
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
                                <tr className="pd-table-footer">
                                    <td className="border p-2">Total</td>
                                    <td className="border p-2">{totalCarton}</td>
                                    <td className="border p-2">{totalBOX}</td>
                                  
                                    <td className="border p-2"></td>
                                </tr>
                            </tfoot> : null
                        }
                    </table>
                </div>

                <div className="flex justify-between">
                    <button
                        type="button"
                        onClick={addNewRow}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                        Add Row
                    </button>


                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-gray-900 hover:pd-bg-readonly text-white py-3.5 px-4 rounded-xl text-sm font-medium transform transition-all duration-200 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <CircularProgress size={18} color="inherit" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            "Create OrderBooker SaleOrder"
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default OrderBookerTargetAdd