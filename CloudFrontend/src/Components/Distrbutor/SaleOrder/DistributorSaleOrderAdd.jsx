import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppSelect from '../../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';
import { fetchPricelistReducer } from '../../../Redux/Reducers/PricelistReducer';
import { CircularProgress } from '@mui/material';
//SndcreateDataFunction

const remainingOf = (item) =>
  Number(item?.Remaining ?? item?.RemainingAmount ?? item?.RemaingAmount ?? 0) || 0;

const formatMoney = (amount) =>
  Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const readCreditLimit = (distributor) => {
  if (!distributor || !Object.prototype.hasOwnProperty.call(distributor, "CreditLimit")) return null;
  const raw = distributor.CreditLimit;
  if (raw === undefined || raw === null || String(raw).trim() === "") return 0;
  const num = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const priceProductId = (row) => {
  const product = row?.product;
  if (product && typeof product === "object") return String(product._id || "");
  return String(product || "");
};

const isSchemeActive = (date, from, to) => {
  if (!date || !from || !to) return false;
  const d = String(date).slice(0, 10);
  const s = String(from).slice(0, 10);
  const e = String(to).slice(0, 10);
  return d >= s && d <= e;
};

// Price list uses the invoice net. A product missing from that list uses the product TP Sale only.
const invoiceAmountForBoxes = (priceRow, boxes, orderDate, product) => {
  const inPriceList = Boolean(priceRow);
  const schemeActive = inPriceList && isSchemeActive(orderDate, priceRow?.SchemeStartDate, priceRow?.SchemeEndDate);
  const TPSale = inPriceList ? Number(priceRow?.TPSale || 0) : Number(product?.TPSale || 0);
  const TO = inPriceList && priceRow?.IsSchemeRS !== false ? Number(priceRow?.TO || 0) : 0;
  const DisPer = inPriceList ? Number(priceRow?.DisPer || 0) : 0;
  const specialToRate = schemeActive ? Number(priceRow?.SpecialTO || 0) : 0;
  const qty = Number(boxes) || 0;
  const Amount = Number((TPSale * qty).toFixed(2));
  const discount = Number((qty * TO).toFixed(2));
  const specialdiscount = Number((((TPSale || 0) / 100) * DisPer * qty).toFixed(2));
  const SpecialTO = Number((qty * specialToRate).toFixed(2));
  const netAmount = Number((Amount - discount - specialdiscount - SpecialTO).toFixed(2));
  return {
    Rate: TPSale,
    Amount,
    GrossAmount: Amount,
    discount,
    specialdiscount,
    SpecialTO,
    netAmount,
    netAmunt: netAmount,
    netAmuntWithAdvnaceTax: netAmount,
    Gst: 0,
    ValueAfterDiscout: netAmount,
    ValuewithGst: netAmount,
    PerBoxValueGrs: TPSale,
  };
};

const DistributorSaleOrderAdd = () => {
  const navigate = useNavigate();
  const [Distributor, setDistributor] = useState([]);
  const Vendor = useSelector((state) => state.Vendor.state)
  const Products = useSelector((state) => state.Product.product);
  const SndProducts = Products.filter((item) => item.isForSND == "true")
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const Store = useSelector((state) => state.Store.Store)

  const Ciity = useSelector((state) => state.City.City)
  
  const location = useSelector((state) => state.Location.Location)
  const [filterProduct, setFilterProduct] = useState([])
  const [VendorDrp, setVendorDrp] = useState([])
  const [disabled, setdisabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [defVen, setDefven] = useState({})
  const [storeDrp, setStoreDrp] = useState()
  const [selectedDistributor, setSelectedDistributor] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(location[0]?._id)
  const [DrpDistriButor, setDrpDistriButor] = useState([])
  const [City, setCity] = useState("")
  const [agingAmount, setAgingAmount] = useState(null)
  const [agingLoading, setAgingLoading] = useState(false)
  const [creditLimit, setCreditLimit] = useState(null)
  const [creditLoading, setCreditLoading] = useState(false)
  const creditById = useRef(null)
  const creditRequest = useRef(0)
  const agingRequest = useRef(0)
   const AllCity = useSelector((state) => state.City.City)
  const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers)
  const PriceList = useSelector((state) => state.PricelistReducer.PricelistReducer)
  const [priceListId, setPriceListId] = useState("")
  const [priceRows, setPriceRows] = useState([])
  const distributorById = useRef(null)
  const missingPriceToast = useRef("")

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
    const EditDistributorDrp = EditDistributor.map((item) => {
    const city = Ciity.find(city => city._id == item.City)


      return {
        value: item._id,
        label: `${item.DistrbutorName} ${item.OldCode || item.DistrbutorSystemCode} (${city?.CityName || ""})`,
        City: item.City || ""

      }
    })

    setDrpDistriButor(EditDistributorDrp.slice(0, 50))
    const arrProduct = Products.length == 0 ? await getDataFundtion('/product') : Products
    Products.length == 0 ? dispatch(fetchproduct(arrProduct?.data)) : null
    const listsNow = Array.isArray(PriceList) ? PriceList : (PriceList?.data || [])
    if (listsNow.length === 0) {
      const res = await getDataFundtion('/PriceList')
      const lists = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
      if (lists.length) dispatch(fetchPricelistReducer(lists))
    }




  }




  useEffect(() => {
    getData()
  }, [])

const loadclients = async (inputValue) => {
    if (!inputValue) return [];
    const search = inputValue.toLowerCase();

    const filtered = EditDistributor
      .filter((item) =>
        (item?.DistrbutorName?.toLowerCase().includes(search)) ||
        (item?.OldCode?.toLowerCase().includes(search)) ||
        (item?.DistrbutorSystemCode?.toLowerCase().includes(search))
      )
      .slice(0, 50);
    return filtered.map((item) => ({
      label: `${item.DistrbutorName} ${item.OldCode || item.DistrbutorSystemCode}` || "Unknown",
      value: item._id,
      City: item.City || ""
    }));
  }

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();
  const orderDate = watch("OrderDate");

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
          const selectedPrice = priceRows.find((pr) => priceProductId(pr) === String(value))
          updatedRow.Rate = Number(selectedPrice?.TPSale || findProduct?.TPSale || 0)

        }

        if (field === "carton" || field === "box") {

          if (findProduct) {


            const BoxinCarton = Number(findProduct.BoxinCarton || 0);
            const PcsinBox = Number(findProduct.PcsinBox || 0);
            const Allunit = BoxinCarton * PcsinBox;
            const box = Number(updatedRow.box || 0);
            const carton = Number(Number(updatedRow.carton).toFixed(0) || 0);
            if (box === 0) {
              updatedRow.unit = Allunit * carton;
              updatedRow.Remaining = Allunit * carton;
            } else if (carton === 0) {
              updatedRow.unit = PcsinBox * box;
              updatedRow.Remaining = PcsinBox * box;
            } else {
              const totalbox = box * PcsinBox;
              updatedRow.unit = Allunit * carton + totalbox;
            }
            const totalBox = PcsinBox ? updatedRow.unit / PcsinBox : (carton * BoxinCarton) + box;
            const priceRow = priceRows.find((pr) => priceProductId(pr) === String(updatedRow.product));
            const priced = invoiceAmountForBoxes(priceRow, totalBox, orderDate, findProduct);
            updatedRow.totalBox = totalBox;
            Object.assign(updatedRow, priced);
            

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
      return toast.error("Empty table not allow")
    }
    if (!selectedDistributor?.value) {
      return toast.error("Please select distributor")
    }
    data.Distrbutor = selectedDistributor.value
    data.TotalAmount = totalNetAmount,
    data.OrderData = tableData
    data.PostStatus = "Accept"
    // Do not send form/row `id` as ClientOrderId — that triggers false "already saved"
    delete data.id
    delete data.ClientOrderId
    console.log(data)
    try {
      // await SndcreateDataFunction('/PurchaseOrder', data)
      setdisabled(true)
      setLoading(true)
      await createDataFunction("/DistributorSaleOrder", data)
      toast.success("Data Add")
      setTimeout(() => {
        //navigate(`/PurchaseInvoiceView/${res._id}`)
        navigate(`/DistributorSaleOrderListPage`)
      }, 2000)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message ||
        "Something went wrong"
      toast.error(msg)
    } finally {
      setLoading(false)
      setdisabled(false)
    }

  };
  const fetchDistributorAging = async (distributorId) => {
    if (!distributorId) {
      agingRequest.current += 1
      setAgingAmount(null)
      setAgingLoading(false)
      return
    }
    const requestId = ++agingRequest.current
    setAgingLoading(true)
    setAgingAmount(null)
    try {
      const res = await getDataFundtion(`/DistrbutorInvoice/getRemainOnlyByClinet/${distributorId}`)
      if (requestId !== agingRequest.current) return
      const invoices = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      const sum = invoices.reduce((total, item) => {
        const rem = remainingOf(item)
        return rem > 1 ? total + rem : total
      }, 0)
      setAgingAmount(sum)
    } catch (err) {
      console.error(err)
      if (requestId !== agingRequest.current) return
      setAgingAmount(null)
      toast.error("Failed to load distributor aging")
    } finally {
      if (requestId === agingRequest.current) setAgingLoading(false)
    }
  }

  const loadCreditLimit = async (distributorId, distributor) => {
    const localLimit = readCreditLimit(distributor)
    if (localLimit != null && distributor?.PriceList) {
      setCreditLimit(localLimit)
      setCreditLoading(false)
      setPriceListId(distributor.PriceList)
      return
    }

    const requestId = ++creditRequest.current
    setCreditLoading(true)
    if (distributor?.PriceList) setPriceListId(distributor.PriceList)
    if (localLimit == null) setCreditLimit(null)
    try {
      if (!creditById.current) {
        const res = await getDataFundtion("/Distrbutor?main=true")
        const list = Array.isArray(res) ? res : (res?.data || [])
        const map = new Map()
        const records = new Map()
        list.forEach((item) => {
          const limit = readCreditLimit(item)
          if (item?._id) {
            map.set(String(item._id), limit == null ? 0 : limit)
            records.set(String(item._id), item)
          }
        })
        creditById.current = map
        distributorById.current = records
      }
      if (requestId !== creditRequest.current) return
      const full = distributorById.current?.get(String(distributorId)) || distributor
      const limit = readCreditLimit(full)
      setCreditLimit(localLimit != null ? localLimit : (creditById.current.get(String(distributorId)) ?? (limit == null ? 0 : limit)))
      setPriceListId(full?.PriceList || distributor?.PriceList || "")
    } catch (err) {
      console.error(err)
      if (requestId !== creditRequest.current) return
      if (localLimit == null) setCreditLimit(null)
      toast.error("Failed to load credit limit")
    } finally {
      if (requestId === creditRequest.current) setCreditLoading(false)
    }
  }

  const setDrp = (value) => {
    setSelectedDistributor(value)
    setSelectedLocation(value)
    const cityName = AllCity.find((item) => item._id == value?.City)
    setCity(cityName?.CityName || "")
    if (!value?.value) {
      creditRequest.current += 1
      setCreditLimit(null)
      setCreditLoading(false)
      setPriceListId("")
      setPriceRows([])
      fetchDistributorAging(null)
      return
    }
    const distributor = EditDistributor.find((item) => String(item._id) === String(value.value))
    loadCreditLimit(value.value, distributor)
    fetchDistributorAging(value.value)
  }

  const availableLimit =
    creditLimit == null || agingAmount == null ? null : creditLimit - agingAmount

  useEffect(() => {
    if (!priceListId) {
      setPriceRows([])
      return
    }
    let cancelled = false
    const resolvePriceList = async () => {
      let lists = Array.isArray(PriceList) ? PriceList : (PriceList?.data || [])
      if (!lists.length) {
        try {
          const res = await getDataFundtion('/PriceList')
          lists = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
          if (lists.length) dispatch(fetchPricelistReducer(lists))
        } catch (err) {
          console.error(err)
        }
      }
      if (cancelled) return
      let priceList = lists.find((item) => String(item._id) === String(priceListId))
      if (!priceList) {
        try {
          const res = await getDataFundtion('/PriceList/GetALLPriceList')
          lists = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
          if (lists.length) dispatch(fetchPricelistReducer(lists))
          priceList = lists.find((item) => String(item._id) === String(priceListId))
        } catch (err) {
          console.error(err)
        }
      }
      if (cancelled) return
      setPriceRows(priceList?.PriceListData || [])
      if (!priceList && missingPriceToast.current !== String(priceListId)) {
        missingPriceToast.current = String(priceListId)
        toast.error("No active Price List assigned to this distributor")
      }
    }
    resolvePriceList()
    return () => { cancelled = true }
  }, [priceListId, PriceList])

  useEffect(() => {
    setTableData((prev) => {
      if (!prev.some((row) => row.product && row.totalBox != null && row.totalBox !== "")) return prev
      return prev.map((row) => {
        if (!row.product || row.totalBox == null || row.totalBox === "") return row
        const priceRow = priceRows.find((pr) => priceProductId(pr) === String(row.product))
        const product = Products.find((item) => String(item._id) === String(row.product))
        return { ...row, ...invoiceAmountForBoxes(priceRow, row.totalBox, orderDate, product) }
      })
    })
  }, [priceRows, orderDate, Products])
  
  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">Distributor SaleOrder Add </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">Order Date</label>
            <input
              type="date"
              disabled
              {...register("OrderDate", { required: true })}
              className="pd-input"
            />
          </div>

          <div>
            <label className="pd-label">Distributor</label>
            <AppAsyncSelect
              cacheOptions
              onChange={(op) => setDrp(op)}
              loadOptions={loadclients}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Distributor"
              defaultOptions={DrpDistriButor}
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
          <div>
            <label className="pd-label">Aging (Remaining)</label>
            <input
              type="text"
              disabled
              value={
                agingLoading
                  ? "Loading..."
                  : agingAmount == null
                    ? ""
                    : formatMoney(agingAmount)
              }
              className="pd-input-readonly text-sm md:text-base"
            />
          </div>
          <div>
            <label className="pd-label">Credit Limit</label>
            <input
              type="text"
              disabled
              value={
                creditLoading
                  ? "Loading..."
                  : creditLimit == null
                    ? ""
                    : formatMoney(creditLimit)
              }
              className="pd-input-readonly text-sm md:text-base"
            />
          </div>
          <div>
            <label className="pd-label">Available Limit</label>
            <input
              type="text"
              disabled
              value={
                creditLoading || agingLoading
                  ? "Loading..."
                  : availableLimit == null
                    ? ""
                    : formatMoney(availableLimit)
              }
              className="pd-input-readonly text-sm md:text-base"
              style={availableLimit != null && availableLimit < 0 ? { color: "#b91c1c" } : undefined}
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
                <th className="border p-2">Rate Per Box</th>
                <th className="border p-2">GrossAmount</th>
                <th className="border p-2">NetAmount</th>
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
                    {row.Rate}
                  </td>
                  <td className="border p-2">
                    {row.GrossAmount}
                  </td>
                  <td className="border p-2">
                    {row.netAmunt}
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
                  <td className="border p-2">{totalGrossAmount.toFixed(2)}</td>
                  <td className="border p-2">{totalNetAmount.toFixed(2)}</td>
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
                                                "Create Distributor SaleOrder"
                                            )}
                                        </button>
        </div>
      </form>
    </div>
  )
}

export default DistributorSaleOrderAdd
