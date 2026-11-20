import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction } from '../../Api/CRUDFunctions';
import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import AppSelect from '../Global/AppSelect.jsx'

/** Carton + box → unit / totalBox (same logic as Sales Return Edit). */
const recalcLineFromCarton = (row, product, client) => {
    const updatedRow = { ...row };
    if (!product) return updatedRow;

    const BoxinCarton = parseInt(product.BoxinCarton, 10) || 0;
    const PcsinBox = parseInt(product.PcsinBox, 10) || 0;
    const box = parseInt(updatedRow.box || 0, 10) || 0;
    const carton = parseInt(updatedRow.carton || 0, 10) || 0;
    const Allunit = BoxinCarton * PcsinBox;

    if (box === 0) {
        updatedRow.unit = Allunit * carton;
    } else if (carton === 0) {
        updatedRow.unit = PcsinBox * box;
    } else {
        updatedRow.unit = Allunit * carton + box * PcsinBox;
    }

    const totalBox = PcsinBox
        ? updatedRow.unit / PcsinBox
        : carton * BoxinCarton + box;
    const rate = parseFloat(updatedRow.rate) || 0;

    updatedRow.totalBox = Number.isFinite(totalBox) ? totalBox : 0;
    updatedRow.ValueExclGstperBox = rate;
    updatedRow.TotalValueExclGst = updatedRow.totalBox * rate;
    updatedRow.RPValueExclGst = updatedRow.totalBox * (parseFloat(product.RetailPrice) || 0);
    updatedRow.Gst =
        product.SaleTaxBy == 1 || product.SaleTaxBy === "1"
            ? (updatedRow.TotalValueExclGst / 100) * (parseInt(product.SaleTaxPercent, 10) || 0)
            : (updatedRow.RPValueExclGst / 100) * (parseInt(product.SaleTaxPercent, 10) || 0);
    updatedRow.GrossAmntinclGst = updatedRow.Gst + updatedRow.TotalValueExclGst;

    if (client && client.AdvanceTaxApply == 1) {
        updatedRow.AdvanceTax = parseFloat((
            client.Filler === 2
                ? (updatedRow.GrossAmntinclGst / 100) * 0.25
                : (updatedRow.GrossAmntinclGst / 100) * 0.05
        ).toFixed(2)) || 0;
    } else {
        updatedRow.AdvanceTax = 0;
    }

    updatedRow.RPValueInclGST = updatedRow.Gst + updatedRow.RPValueExclGst;
    updatedRow.GSTperBox = updatedRow.totalBox > 0 ? updatedRow.Gst / updatedRow.totalBox : 0;
    updatedRow.ValueAfterDis =
        updatedRow.Gst +
        updatedRow.TotalValueExclGst -
        (Number(updatedRow.discount) || 0) +
        (Number(updatedRow.AdvanceTax) || 0);
    updatedRow.netAmunt = parseFloat(
        (updatedRow.ValueAfterDis - (Number(updatedRow.TTS) || 0)).toFixed(2)
    );

    return updatedRow;
};

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
    const [AllProduct, SetAllProduct] = useState([])
    const [tableData, setTableData] = useState([]);
    const [totalProduct, setTotalProduct] = useState([])
    const [selectedLocation, setSelectedLocation] = useState([])
    const [salesLoction, setSalesLoction] = useState([])
    const [salesStore, setSalesStore] = useState("")
    const dis = useSelector((state) => state.DistributroReducers.DistributroReducers)

    const [storeDrp, setStoreDrp] = useState([])

    const AllVendor = Vendor.filter((item, index) => loginVendor.Vendor[index])
        .map((item1) => (item1.code))
    //console.log(loginVendor.Vendor)

    const vendorIdSet = new Set(loginVendor.Vendor);
    const AllClient = Client.filter(customer =>
        customer?.Vendor?.some(vendorId => vendorIdSet?.has(vendorId))
    );

    const totalCli = AllClient.concat(dis)


    const Location = location.filter(item => loginVendor.Location.includes(item._id))
        .map((item) => ({
            label: item.LocationName,
            value: item._id
        }))

    const { register, handleSubmit, formState: { errors } } = useForm();

    const addNewRow = () => {
        if (!poClient) {
            return toast.error("first Select Client ")
        }

        setTableData([...tableData, {
            id: Date.now(),
            product: '',
            box: 0,
            carton: 0,
            totalBox: 0,
            unit: 0,
            Gst: 0
        }]);
    };

    const removeRow = (id) => {
        setTableData(tableData.filter(row => row.id !== id));
    };

    const handleCellChange = (id, field, feildvalue) => {
        let value = feildvalue?.value ?? feildvalue;

        setTableData(tableData.map(row => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: value };

                // Special fields mapping
                if (["diBspass", "RToffer", "WToffer", "RpDrive", "WHOLESALEDEAL", "TTS"].includes(field)) {
                    updatedRow[field] = feildvalue || 0;
                }

                // Discount-related recalculations
                if (["diBspass", "RToffer", "WToffer", "RpDrive", "WHOLESALEDEAL"].includes(field)) {
                    updatedRow.discount =
                        parseInt(updatedRow.diBspass || 0) +
                        parseInt(updatedRow.RToffer || 0) +
                        parseInt(updatedRow.WToffer || 0) +
                        parseInt(updatedRow.RpDrive || 0) +
                        parseInt(updatedRow.WHOLESALEDEAL || 0);

                    updatedRow.ValueAfterDis =
                        updatedRow.Gst +
                        updatedRow.TotalValueExclGst -
                        updatedRow.discount +
                        updatedRow.AdvanceTax;

                    updatedRow.netAmunt = parseFloat(
                        (updatedRow.ValueAfterDis - (updatedRow.TTS || 0)).toFixed(2)
                    );
                }

                if (field === "TTS") {
                    updatedRow.netAmunt = parseFloat(
                        (updatedRow.ValueAfterDis - (updatedRow.TTS || 0)).toFixed(2)
                    );
                }

                // When product changes
                if (field === "product") {
                    const findProduct = Products.find(item => item._id == value);
                    if (findProduct) {
                        updatedRow.rate = findProduct.TPSale;
                    }

                    // Reset fields
                    updatedRow.AdvanceTax = 0;
                    updatedRow.TotalValueExclGst = 0;
                    updatedRow.RPValueExclGst = 0;
                    updatedRow.GstonRpvalue = 0;
                    updatedRow.box = 0;
                    updatedRow.unit = 0;
                    updatedRow.carton = 0;
                    updatedRow.totalBox = 0;
                    updatedRow.RPValueInclGST = 0;
                    updatedRow.netAmunt = 0;
                    updatedRow.discount = 0;
                    updatedRow.GSTperBox = 0;
                    updatedRow.GrossAmntinclGst = 0;
                    updatedRow.diBspass = 0;
                    updatedRow.RToffer = 0;
                    updatedRow.WToffer = 0;
                    updatedRow.RpDrive = 0;
                    updatedRow.WHOLESALEDEAL = 0;
                    updatedRow.TTS = 0;
                    updatedRow.Gst = 0;
                    updatedRow.ValueAfterDis = 0;
                }

                // Handle rate changes
                if (field === "rate") {
                    updatedRow.rate = parseFloat(value) || 0;
                }

                // Reset if product is cleared
                if (!updatedRow.product) {
                    updatedRow.netAmunt = 0;
                    updatedRow.AdvanceTax = 0;
                    updatedRow.discount = 0;
                    updatedRow.ValueExclGstperBox = 0;
                    updatedRow.TotalValueExclGst = 0;
                    updatedRow.RPValueExclGst = 0;
                    updatedRow.GstonRpvalue = 0;
                    updatedRow.box = 0;
                    updatedRow.unit = 0;
                    updatedRow.carton = 0;
                    updatedRow.totalBox = 0;
                    updatedRow.RPValueInclGST = 0;
                    updatedRow.GSTperBox = 0;
                    updatedRow.GrossAmntinclGst = 0;
                    updatedRow.diBspass = 0;
                    updatedRow.rate = 0;
                    updatedRow.RToffer = 0;
                    updatedRow.WToffer = 0;
                    updatedRow.RpDrive = 0;
                    updatedRow.WHOLESALEDEAL = 0;
                    updatedRow.TTS = 0;
                    updatedRow.Gst = 0;
                    updatedRow.ValueAfterDis = 0;
                }

                const findProduct = Products.find(item => item._id == updatedRow.product);

                // Quantity/rate → always recompute totalBox (carton + box)
                if (["carton", "box", "rate"].includes(field) && findProduct) {
                    if (field === "carton") updatedRow.carton = value === "" || value == null ? 0 : value;
                    if (field === "box") updatedRow.box = value === "" || value == null ? 0 : value;
                    if (field === "rate") updatedRow.rate = value === "" || value == null ? 0 : value;

                    const findClient = Client.find(item => item._id == poClient?.value);
                    return recalcLineFromCarton(updatedRow, findProduct, findClient);
                }

                return updatedRow;
            }
            return row;
        }));
    };



    const totalDiscount = tableData.reduce((sum, row) => sum + (Number(row.discount) || 0), 0);
    const TotalValueExclGst = tableData.reduce((sum, row) => sum + (Number(row.TotalValueExclGst) || 0), 0);
    const TotalGst = tableData.reduce((sum, row) => sum + (Number(row.Gst) || 0), 0);
    const totalBox = tableData.reduce((sum, row) => sum + (Number(row.totalBox) || 0), 0);
    const totalCarton = tableData.reduce((sum, row) => sum + (Number(row.carton) || 0), 0);
    const totalUnit = tableData.reduce((sum, row) => sum + (Number(row.unit) || 0), 0);
    const totalnetAmunt = tableData.reduce((sum, row) => sum + (Number(row.netAmunt) || 0), 0);
    const totalAdvanceTax = tableData.reduce((sum, row) => sum + (Number(row.AdvanceTax) || 0), 0);

    const onSubmit = async (data) => {
        if (!poClient?.value) {
            return toast.error("Select Client first");
        }
        // Recalc totalBox on every line before save (carton + box)
        const findClient = Client.find((item) => item._id == poClient.value);
        const SalesReturnData = tableData.map((row) => {
            const product = Products.find((p) => p._id == row.product);
            return recalcLineFromCarton(row, product, findClient);
        });
        const invalid = SalesReturnData.find(
            (row) => row.product && !(Number(row.totalBox) > 0)
        );
        if (invalid) {
            return toast.error("Enter Carton or Box for all products (totalBox is 0)");
        }

        data.Client = poClient.value
        data.SalesReturnData = SalesReturnData
        loginVendor.userType == 1 ? data.Store = loginVendor.Store[0] : data.Store = salesStore.value
        loginVendor.userType == 1 ? data.Location = loginVendor.Location[0] : data.Location = selectedLocation


        //console.log(data)
        try {
            const res = await createDataFunction('/SalesInvoiceReturn', data)
            //console.log(res)
            navigate('/SalesReturnList')
        }
        catch (err) {
            const error = err.response.data.errors
            if (error) {
                //console.log(error)
                try {
                    const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName} on your location`
                    toast.error(notAvalible)
                }
                catch {
                    const notAvalible = `Qty of ${Products.find((item) => item._id == error[0][0].product).ProductName} Available Qty ${error[0][0].qty}  you need ${error[0][0].Req} Boxes`
                    toast.error(notAvalible)
                }
            }
        }



    }
    const clients = AllClient.filter(value =>
        value.Vendor.some(v => v == loginVendor.Vendor[0])
    ).map((ven) => ven.Vendor).flat();

    const startingvendor = Vendor.filter((item) => clients.includes(item._id))
        .map((item1) => item1.code)

    const startingProduct = Products.filter(
        product => product.mastercode.startsWith(startingvendor[0])
    ).map((p) => {
        return ({
            label: `${p.ProductName} ${p.mastercode}`,
            value: p._id
        })
    }).slice(0, 50)



   const loadclients = async (inputValue) => {
    try {
        if (!inputValue) return [];

        const search = inputValue.toLowerCase();

        const filtered = (totalCli || [])
            .filter((item) => {
                const name =
                    item.CutomerName ||
                    item.DistrbutorName ||
                    "";

                const code =
                    item.code ||
                    item.OldCode ||
                    "";

                return (
                    name.toLowerCase().includes(search) ||
                    code.toLowerCase().includes(search)
                );
            })
            .slice(0, 50);

        //console.log(filtered);

        return filtered.map((item) => ({
            label: `${
                item.CutomerName || item.DistrbutorName || ""
            } ${
                item.code || item.OldCode || ""
            }`,
            value: item._id
        }));
    } catch (err) {
        //console.log(err);
        return []; // IMPORTANT for AsyncSelect
    }
};

const startingClient = AllClient.slice(0, 50).map((item) => ({
    label: `${item.CutomerName} ${item.code}`,
    value: item._id
}));;

const loadInvoiceOptions = async (inputValue) => {
    
    const product = Products
        .map((p) => ({
            label: `${p.ProductName} ${p.mastercode}`,
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
    value: defultStore?._id
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
return (
    <div className="p-4">
        <ToastContainer />
        <h1 className="text-xl md:pd-page-title text-center mb-6">Create Sales Invoice</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                    <label className="pd-label">Sale Date</label>
                    <input
                        type="date"
                        {...register("SalesInvoiceReturnDate", { required: true })}
                        className="pd-input"
                    />
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
                    <label className="pd-label">Sales Flow Ref</label>
                    <input
                        type="text"
                        {...register("SalesFlowRef")}
                        className="pd-input"
                    />
                </div>
                <div>
                    <label className="pd-label">Location</label>
                    <AppSelect onChange={(v) => setDrp(v)} options={Location} isDisabled={loginVendor.userType == 1 ? true : false} />
                </div>
                <div>
                    <label className="pd-label">Department</label>
                    <AppSelect onChange={(v) => setSalesStore(v)} options={storeDrp} value={salesStore} isDisabled={loginVendor.userType == 1 ? true : false} />
                </div>
                <div>
                    <label className="pd-label">Condition</label>
                    <select {...register("Damage")} className='pd-input'>
                        <option value="Fresh"> Fresh</option>
                        <option value="Damage"> Damage</option>

                    </select>
                    {/**/}
                </div>
            </div>

            <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse text-sm md:text-base">
                    <thead>
                        <tr>
                            <th className="border p-2 min-w-[200px]">Product</th>
                            <th className="border p-2 min-w-[200px]">Rate</th>
                            <th className="border p-2 hidden md:table-cell">Unit</th>
                            <th className="border p-2">CTN</th>
                            <th className="border p-2">Pcs</th>
                            <th className="border p-2 hidden lg:table-cell">Value Excl Gst</th>
                            <th className="border p-2 hidden lg:table-cell">GST</th>
                            <th className="border p-2 hidden xl:table-cell">DIS PASS</th>
                            <th className="border p-2 hidden xl:table-cell">RET T</th>
                            <th className="border p-2 hidden xl:table-cell">WHOL T</th>
                            <th className="border p-2 hidden 2xl:table-cell">RET POW</th>
                            <th className="border p-2 hidden 2xl:table-cell">WHOLE DEAL</th>
                            <th className="border p-2 hidden lg:table-cell">Adv Tax</th>
                            <th className="border p-2">Discount</th>
                            <th className="border p-2 hidden xl:table-cell">After Disc</th>
                            <th className="border p-2 hidden xl:table-cell">TTS Disc</th>
                            <th className="border p-2">Net Amount</th>
                            <th className="border p-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row) => (
                            <tr key={row.id} >
                                <td className="border p-2">
                                    <AppAsyncSelect
                                        cacheOptions
                                        defaultOptions={startingProduct}
                                        loadOptions={loadInvoiceOptions}
                                        value={row.product ? {
                                            value: `${row.product} }`,
                                            label: `${Products.find((p) => p._id === row.product)?.mastercode} ${Products.find((p) => p._id === row.product)?.ProductName}`
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
                                        type="text"
                                        value={row.rate}
                                        onChange={(e) => handleCellChange(row.id, 'rate', e.target.value)}
                                        className="w-full p-1 text-xs md:text-sm border rounded"
                                    />
                                </td>
                                <td className="border p-2 hidden md:table-cell">{row.unit || 0}</td>
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
                                <td className="border p-2 hidden lg:table-cell">{Number(row.TotalValueExclGst || 0).toFixed(2)}</td>
                                <td className="border p-2 hidden lg:table-cell">{Number(row.Gst || 0).toFixed(2)}</td>
                                <td className="border p-2 hidden xl:table-cell">
                                    <input
                                        type="number"
                                        value={row?.diBspass || 0}
                                        onChange={(e) => handleCellChange(row.id, 'diBspass', e.target.value)}
                                        className="w-full p-1 text-xs md:text-sm border rounded"
                                    />
                                </td>
                                <td className="border p-2 hidden xl:table-cell">
                                    <input
                                        type="number"
                                        value={row?.RToffer || 0}
                                        onChange={(e) => handleCellChange(row.id, 'RToffer', e.target.value)}
                                        className="w-full p-1 text-xs md:text-sm border rounded"
                                    />
                                </td>
                                <td className="border p-2 hidden xl:table-cell">
                                    <input
                                        type="number"
                                        value={row?.WToffer || 0}
                                        onChange={(e) => handleCellChange(row.id, 'WToffer', e.target.value)}
                                        className="w-full p-1 text-xs md:text-sm border rounded"
                                    />
                                </td>
                                <td className="border p-2 hidden 2xl:table-cell">
                                    <input
                                        type="number"
                                        value={row?.RpDrive || 0}
                                        onChange={(e) => handleCellChange(row.id, 'RpDrive', e.target.value)}
                                        className="w-full p-1 text-xs md:text-sm border rounded"
                                    />
                                </td>
                                <td className="border p-2 hidden 2xl:table-cell">
                                    <input
                                        type="number"
                                        value={row?.WHOLESALEDEAL || 0}
                                        onChange={(e) => handleCellChange(row.id, 'WHOLESALEDEAL', e.target.value)}
                                        className="w-full p-1 text-xs md:text-sm border rounded"
                                    />
                                </td>
                                <td className="border p-2 hidden lg:table-cell">{Number(row?.AdvanceTax || 0).toFixed(2)}</td>
                                <td className="border p-2">{Number(row?.discount || 0)}</td>
                                <td className="border p-2 hidden xl:table-cell">{Number(row?.ValueAfterDis || 0).toFixed(2)}</td>
                                <td className="border p-2 hidden xl:table-cell">
                                    <input
                                        type="number"
                                        value={row?.TTS || 0}
                                        onChange={(e) => handleCellChange(row.id, 'TTS', e.target.value)}
                                        className="w-full p-1 text-xs md:text-sm border rounded"
                                    />
                                </td>
                                <td className="border p-2">{Number(row?.netAmunt || 0).toFixed(2)}</td>
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
                                <td className="border p-2"></td>
                                <td className="border p-2 hidden md:table-cell">{totalUnit}</td>
                                <td className="border p-2">{totalCarton}</td>
                                <td className="border p-2">{totalBox}</td>
                                <td className="border p-2 hidden lg:table-cell">{TotalValueExclGst.toFixed(2)}</td>
                                <td className="border p-2 hidden lg:table-cell">{TotalGst.toFixed(2)}</td>
                                <td className="border p-2 hidden xl:table-cell"></td>
                                <td className="border p-2 hidden xl:table-cell"></td>
                                <td className="border p-2 hidden xl:table-cell"></td>
                                <td className="border p-2 hidden 2xl:table-cell"></td>
                                <td className="border p-2 hidden 2xl:table-cell"></td>
                                <td className="border p-2 hidden lg:table-cell">{totalAdvanceTax.toFixed(2)}</td>
                                <td className="border p-2">{totalDiscount.toFixed(2)}</td>
                                <td className="border p-2 hidden xl:table-cell"></td>
                                <td className="border p-2 hidden xl:table-cell"></td>
                                <td className="border p-2">{totalnetAmunt.toFixed(2)}</td>
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
                    Create Sale Invoice
                </button>
            </div>
        </form>
    </div>
)
}

export default SalesInvoiceAdd