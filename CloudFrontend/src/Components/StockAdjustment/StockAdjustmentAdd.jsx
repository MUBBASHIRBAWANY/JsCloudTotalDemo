import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import AppSelect from '../Global/AppSelect.jsx'
import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../Api/CRUDFunctions';
import { useNavigate, useParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';

const StockAdjustmentAdd = () => {
    const { register, handleSubmit, formState: { errors }, reset } = useForm();
    const [tableData, setTableData] = useState([])
    const [loading, setLoading] = useState(false)
    const [storeDrp, setStoreDrp] = useState([])
    const [selectedLocation, setSelectedLocation] = useState('')
    const [selectedStore, setSelectedStore] = useState('')
    const location = useSelector((state) => state.Location.Location)
    const Store = useSelector((state) => state.Store.Store)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const AllProducts = useSelector((state) => state.Product.product);
    const [Products, setProducts] = useState([])
    const navigate = useNavigate()
    const { id } = useParams()

    const Location = location.filter(item => loginVendor.Location.includes(item._id))
        .map((item) => ({
            label: item.LocationName,
            value: item._id
        }))

    const getData = async () => {
        if (AllProducts.length === 0) {
            const productdata = await getDataFundtion("/product")
            setProducts(productdata.data)
        } else {
            setProducts(AllProducts)
        }

        if (id) {
            try {
                const res = await getDataFundtion(`/StockAdjustment`)
                const record = res.data.find(item => item._id === id)
                if (record) {
                    reset({
                        AdjustmentDate: record.AdjustmentDate,
                        SalesFlowRef: record.SalesFlowRef || ""
                    })
                    setSelectedLocation(record.Location)
                    setSelectedStore(record.Store)

                    // Load stores for the selected location
                    const userStore = loginVendor.Store
                    const updatedStoreDrp = Store?.filter(item => record.Location.includes(item.Location))
                        .filter(store => userStore.includes(store._id))
                        .map((st) => ({
                            label: st.StoreName,
                            value: st._id
                        }))
                    setStoreDrp(updatedStoreDrp)

                    // Map adjustment data to table rows
                    const mappedData = (record.AdjustmentData || []).map((item, idx) => ({
                        id: Date.now() + idx,
                        productName: item.productName,
                        lessBox: item.lessBox || 0,
                        addBox: item.addBox || 0,
                        lessAmount: item.lessAmount || 0,
                        addAmount: item.addAmount || 0,
                    }))
                    setTableData(mappedData)
                }
            } catch (err) {
                console.error(err)
            }
        }
    }

    useEffect(() => {
        getData()
    }, [id])

    const setDrp = (value) => {
        const values = value.value;
        setSelectedLocation(values);
        setSelectedStore('');
        setStoreDrp([]);
        const userStore = loginVendor.Store
        const updatedStoreDrp = Store?.filter(item => values.includes(item.Location))
            .filter(store => userStore.includes(store._id))
            .map((st) => ({
                label: st.StoreName,
                value: st._id
            }))
        setStoreDrp(updatedStoreDrp);
    }

    const loadProductOptions = async (inputValue) => {
        if (!inputValue) return [];
        const filtered = Products
            .filter((item) =>
                item.ProductName.toLowerCase().includes(inputValue.toLowerCase()) ||
                (item.mastercode && item.mastercode.toLowerCase().includes(inputValue.toLowerCase()))
            )
            .slice(0, 50);
        return filtered.map((item) => ({
            label: `${item.ProductName} (${item.mastercode || ''})`,
            value: item._id
        }));
    };

    const handleCellChange = (id, field, value) => {
        setTableData(tableData.map(row => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: value };

                // Enforce mutual exclusivity: Less Box and Add Box cannot both be > 0
                if (field === 'lessBox' && Number(value) > 0) {
                    updatedRow.addBox = 0;
                    updatedRow.addAmount = 0;
                    // Calculate less amount
                    const product = Products.find(p => p._id === updatedRow.productName);
                    if (product) {
                        const TPSale = parseFloat(product.TPSale || 0);
                        updatedRow.lessAmount = parseFloat((TPSale * Number(value)).toFixed(2));
                    }
                }

                if (field === 'addBox' && Number(value) > 0) {
                    updatedRow.lessBox = 0;
                    updatedRow.lessAmount = 0;
                    // Calculate add amount
                    const product = Products.find(p => p._id === updatedRow.productName);
                    if (product) {
                        const TPPurchase = parseFloat(product.TPPurchase || 0);
                        updatedRow.addAmount = parseFloat((TPPurchase * Number(value)).toFixed(2));
                    }
                }

                if (field === 'productName') {
                    updatedRow.productName = value.value;
                    updatedRow.lessBox = 0;
                    updatedRow.addBox = 0;
                    updatedRow.lessAmount = 0;
                    updatedRow.addAmount = 0;
                }

                return updatedRow;
            }
            return row;
        }));
    };

    const addNewRow = () => {
        if (!selectedLocation || !selectedStore) {
            return toast.error("Please select Location and Store first");
        }
        setTableData([...tableData, {
            id: Date.now(),
            productName: '',
            lessBox: 0,
            addBox: 0,
            lessAmount: 0,
            addAmount: 0,
        }]);
    };

    const removeRow = (id) => {
        setTableData(tableData.filter(row => row.id !== id));
    };

    const onSubmit = async (data) => {
        if (!selectedLocation || !selectedStore) {
            return toast.error("Please select Location and Store");
        }
        if (tableData.length === 0) {
            return toast.error("Please add at least one product row");
        }

        // Validate: no row should have both lessBox and addBox > 0
        const invalidRow = tableData.find(row => Number(row.lessBox) > 0 && Number(row.addBox) > 0);
        if (invalidRow) {
            return toast.error("Less Box and Add Box cannot both be entered for the same product");
        }

        // Validate: every row must have a product selected
        const noProduct = tableData.find(row => !row.productName);
        if (noProduct) {
            return toast.error("Please select a product for all rows");
        }

        data.AdjustmentData = tableData.map(row => ({
            productName: row.productName,
            lessBox: Number(row.lessBox) || 0,
            addBox: Number(row.addBox) || 0,
            lessAmount: Number(row.lessAmount) || 0,
            addAmount: Number(row.addAmount) || 0,
        }));
        data.Location = selectedLocation;
        data.Store = selectedStore;

        try {
            setLoading(true);
            if (id) {
                await updateDataFunction(`/StockAdjustment/UpdateStockAdjustment/${id}`, data);
                toast.success("Stock Adjustment Updated");
            } else {
                await createDataFunction('/StockAdjustment', data);
                toast.success("Stock Adjustment Created");
            }
            setTimeout(() => {
                navigate('/StockAdjustment');
            }, 1500);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='mx-5'>
            <ToastContainer />
            <h1 className="text-xl md:pd-page-title text-center mb-6">
                {id ? 'Edit Stock Adjustment' : 'Create Stock Adjustment'}
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="pd-label">Adjustment Date</label>
                        <input
                            type="date"
                            {...register("AdjustmentDate", { required: true })}
                            className="pd-input"
                        />
                    </div>

                    <div>
                        <label className="pd-label">Sales Flow Ref</label>
                        <input
                            type="text"
                            {...register("SalesFlowRef")}
                            className="pd-input"
                            placeholder="Enter Sales Flow Ref"
                        />
                    </div>

                    <div>
                        <label className="pd-label">Location</label>
                        <AppSelect
                            onChange={(v) => setDrp(v)}
                            options={Location}
                            value={Location.find(l => l.value === selectedLocation)}
                            isDisabled={loginVendor.userType == 1 || !!id}
                        />
                    </div>
                    <div>
                        <label className="pd-label">Store</label>
                        <AppSelect
                            onChange={(v) => setSelectedStore(v.value)}
                            options={storeDrp}
                            value={storeDrp.find(s => s.value === selectedStore)}
                            isDisabled={loginVendor.userType == 1 || !!id}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr>
                                <th className="border p-2 min-w-[200px]">Product</th>
                                <th className="border p-2 min-w-[120px]">Less Box</th>
                                <th className="border p-2 min-w-[120px]">Less Amount</th>
                                <th className="border p-2 min-w-[120px]">Add Box</th>
                                <th className="border p-2 min-w-[120px]">Add Amount</th>
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id}>
                                    <td className="border p-2">
                                        <AppAsyncSelect
                                            cacheOptions
                                            loadOptions={loadProductOptions}
                                            value={row.productName ? {
                                                value: row.productName,
                                                label: Products.find((p) => p._id === row.productName)
                                                    ? `${Products.find((p) => p._id === row.productName).ProductName} (${Products.find((p) => p._id === row.productName).mastercode || ''})`
                                                    : row.productName
                                            } : null}
                                            onChange={(selectedOption) =>
                                                handleCellChange(row.id, 'productName', selectedOption || '')
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
                                            min="0"
                                            value={row.lessBox}
                                            onChange={(e) => handleCellChange(row.id, 'lessBox', e.target.value)}
                                            disabled={Number(row.addBox) > 0}
                                            className={`w-full p-1 text-xs md:text-sm border rounded ${Number(row.addBox) > 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.lessAmount}
                                            readOnly
                                            className="w-full p-1 text-xs md:text-sm border rounded bg-gray-50"
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.addBox}
                                            onChange={(e) => handleCellChange(row.id, 'addBox', e.target.value)}
                                            disabled={Number(row.lessBox) > 0}
                                            className={`w-full p-1 text-xs md:text-sm border rounded ${Number(row.lessBox) > 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.addAmount}
                                            readOnly
                                            className="w-full p-1 text-xs md:text-sm border rounded bg-gray-50"
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
                        disabled={loading}
                        className="bg-gray-900 hover:pd-bg-readonly text-white py-3.5 px-4 rounded-xl text-sm font-medium transform transition-all duration-200 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <CircularProgress size={18} color="inherit" />
                                <span>{id ? 'Updating...' : 'Creating...'}</span>
                            </>
                        ) : (
                            id ? "Update Stock Adjustment" : "Create Stock Adjustment"
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default StockAdjustmentAdd
