import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchPricelistReducer } from '../../../Redux/Reducers/PricelistReducer';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';
import { fetchOrderDc } from '../../../Redux/Reducers/OrderDCReducer';
import { fetchStore } from '../../../Redux/Reducers/StoreReducer';
import { advanceAfterDcSelect, applyAdvanceDiscount, canChooseAdvanceDiscount, normalizePolicyList, resolveAdvanceDiscountPercent } from './advanceDiscount.js';
import { canCreateInvoice } from './invoiceCreate.js';



const DistrbutorInvoiceAdd = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [poClient, setPoClient] = useState(null);
  const priceRowsRef = useRef([]);
  const Client = useSelector((state) => state.Client.client)
  const Products = useSelector((state) => state.Product.product);

  const City = useSelector((state) => state.City.City)

  const location = useSelector((state) => state.Location.Location)
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const Store = useSelector((state) => state.Store.Store)
  const [SaleOrderDrp, SetSaleOrderDrp] = useState([])
  const [tableData, setTableData] = useState([]);
  console.log(tableData)
  const [selectedDc, setSelectedDc] = useState([])
  const [StoreDrp, setStoreDrp] = useState([])
  const [Builty, setBuilty] = useState([])
  const [Advance, setAdvance] = useState("no")
  const [AdvanceDis, setAdvanceDis] = useState(0)
  const [netAmount, setNetAmount] = useState(0)
  const [OtherAmount, setOtherAmount] = useState(0)
  const [salesStore, setSalesStore] = useState([])
  const [advanceDiscountPolicies, setAdvanceDiscountPolicies] = useState([])
  const [advanceDiscountPercent, setAdvanceDiscountPercent] = useState(0)

  const [selectedDistributor, setSelectedDistributor] = useState([])
  const [DrpDistriButor, setDrpDistriButor] = useState([])
  const [Price, setPrice] = useState([])
  const [disabled, setDisabled] = useState(false)
  const [Transporter, setTransporter] = useState()
  const TotalProduct = useSelector((state) => state.TotalProducts.TotalProducts)
  const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers)
  const PriceList = useSelector((state) => state.PricelistReducer.PricelistReducer)
  const OrderDc = useSelector((state) => state.OrderDc.OrderDc);
  console.log(OrderDc , "OrderDc")
  const Channel = useSelector((state) => state.Channel.channel)
  const [date, setDate] = useState()
  const [Balance, setBalance] = useState()
  const [view, setview] = useState(false)
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const fetchLedgerBalance = async (clientId, asOfDate) => {
    if (!clientId) {
      setBalance("")
      return
    }
    const balanceDate = asOfDate || date || new Date().toISOString().split("T")[0]
    try {
      const ClientlBalance = await getDataFundtion(
        `/GernalLager/ClientlBalance?startDate=${balanceDate}&endDate=${balanceDate}&Client=${clientId}`
      )
      const total = Number(ClientlBalance?.data?.totalBalance)
      setBalance(Number.isFinite(total) ? total.toFixed(2) : "0.00")
    } catch (err) {
      console.error("Failed to load ledger balance", err)
      setBalance("")
    }
  }

  useEffect(() => {
    if (tableData.length !== 0) {
      setview(true)
      fetchLedgerBalance(selectedDistributor?.value, date)
    }
  }, [tableData, date])

  const normalizePriceLists = (lists) =>
    Array.isArray(lists) ? lists : (Array.isArray(lists?.data) ? lists.data : []);

  const priceListIdOf = (value) => {
    if (!value) return "";
    if (typeof value === "object") return String(value._id || value.value || value.id || "");
    return String(value);
  };

  useEffect(() => {
    const today = new Date();
    const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const StoreDrp = Store.map((item) => ({
      value: item._id,
      label: item.StoreName
    }))
    setStoreDrp(StoreDrp)
    //console.log(EditDistributor)
    const EditDistributorDrp = (EditDistributor || []).map((item) => {
      const city = City.find(city => city._id == item.City)

      return {
        value: item._id,
        label: `${item.DistrbutorName} ${item.DistrbutorSystemCode} (${city?.CityName || ""})`,
        PriceList: item.PriceList,
        Type: item.Type,
        Channel: item.Channel,
        advanceDiscountPolicy: item.advanceDiscountPolicy,
      }


    })

    setDrpDistriButor(EditDistributorDrp)
    reset({
      InvoiceDate: formatted
    })
  }, [EditDistributor, City, Store])


  const addNewRow = () => {
    if (!poClient) {
      return toast.error("first Select Client ")
    }

    setTableData([...tableData, {
      id: Date.now(),
      product: '',
      carton: 0,
      Delivered: 0

    }]);
  };

  const ensurePriceLists = async () => {
    let lists = normalizePriceLists(PriceList);
    if (lists.length === 0) {
      const res = await getDataFundtion('/PriceList');
      lists = normalizePriceLists(res);
      if (lists.length) dispatch(fetchPricelistReducer(lists));
    }
    return lists;
  };

  const ensureOrderDcs = async () => {
    let dcs = Array.isArray(OrderDc) ? OrderDc : [];
    if (dcs.length === 0) {
      const res = await getDataFundtion('/DcOrder/GetDcNotEqualFalse');
      dcs = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      if (dcs.length) dispatch(fetchOrderDc(dcs));
    }
    return dcs;
  };

  const buildDcOptions = (dcs, distributorId) =>
    (dcs || [])
      .filter((item) => String(item.Distrbutor) === String(distributorId))
      .map((item) => ({
        value: item.DCCode,
        label: item.DCCode,
        data: item.DCData,
        Store: item.Store,
        Status: item.PostStatus,
        BiltyNumber: item.BiltyNumber,
        Biltytype: item.Biltytype,
        BiltyAmount: item.BiltyAmount,
        PriceList: item.PriceList,
        DCDate: item.DCDate,
        id: Date.now() + Math.random(),
      }));

  const getSaleOrder = async (value) => {
    if (!value?.value) {
      setSelectedDistributor([])
      setPrice([])
      SetSaleOrderDrp([])
      setAdvance("no")
      setAdvanceDis(0)
      setAdvanceDiscountPercent(0)
      setBalance("")
      setview(false)
      return
    }
    setSelectedDistributor(value)

    const distributor =
      (EditDistributor || []).find((item) => String(item._id) === String(value.value)) || value;
    setAdvanceDiscountPercent(resolveAdvanceDiscountPercent(distributor))
    setAdvance("no")
    setAdvanceDis(0)
    // Show ledger balance as soon as customer is selected
    const today = new Date().toISOString().split("T")[0]
    fetchLedgerBalance(value.value, today)
    const assignedPriceListId = priceListIdOf(distributor?.PriceList || value?.PriceList);

    try {
      const [dcs, listsStart] = await Promise.all([ensureOrderDcs(), ensurePriceLists()]);
      let lists = listsStart;
      let ProductPrice = assignedPriceListId
        ? lists.find((item) => String(item._id) === assignedPriceListId)
        : null;

      // Active list miss (Inactive / not in redux) → try all price lists
      if (assignedPriceListId && !ProductPrice) {
        const res = await getDataFundtion('/PriceList/GetALLPriceList');
        lists = normalizePriceLists(res);
        if (lists.length) dispatch(fetchPricelistReducer(lists));
        ProductPrice = lists.find((item) => String(item._id) === assignedPriceListId);
      }

      // Set DC options once after data is ready (avoid remount wiping selection)
      SetSaleOrderDrp(buildDcOptions(dcs, value.value));

      if (!assignedPriceListId || !ProductPrice) {
        priceRowsRef.current = []
        setPrice([])
        return toast.error('No active Price List assigned to this distributor')
      }

      const rows = ProductPrice.PriceListData || []
      priceRowsRef.current = rows
      setPrice(rows)
    } catch (err) {
      console.error(err)
      priceRowsRef.current = []
      setPrice([])
      toast.error('Failed to load distributor data')
    }
  }
  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };


  const getTableData = (value) => {
    if (!value?.value) return;

    const dcLines = Array.isArray(value.data) ? value.data : [];
    if (dcLines.length === 0) {
      return toast.error(`No products found in DC ${value.value}`);
    }

    const Store1 = (Store || []).find((item) => String(item._id) === String(value.Store));
    setSelectedDc(value.value)
    setSalesStore(
      Store1
        ? { value: Store1._id, label: Store1.StoreName }
        : { value: value.Store || "", label: value.Store || "Store" }
    )
    setDate(value.DCDate)
    //console.log(value.DCDate)
    reset({
      InvoiceDate: value.DCDate
    })
const checkDate = value.DCDate;
    const isBetween = (date, from, to, product) => {
      if (!date || !from || !to) return false;
      // Compare YYYY-MM-DD date-only strings directly to avoid timezone/time-of-day issues
      const d = String(date).slice(0, 10);
      const s = String(from).slice(0, 10);
      const e = String(to).slice(0, 10);
console.log(date, from, to , product)
      return d >= s && d <= e;
    };

    const extractdata = SaleOrderDrp.filter((item) => item.value !== value.value)
    SetSaleOrderDrp(extractdata)
    const findDuplicate = tableData.find((item) => item.Order == value.value)
    //console.log(findDuplicate)

    if (findDuplicate) {
      return toast.error(`${value.value} saleOrder al ready in table`)
    }
    const priceRows = priceRowsRef.current.length ? priceRowsRef.current : (Price || []);
    const output = dcLines.map(item => {
      const product = Products.find(pr => String(pr._id) === String(item.product));
      const ProductPrice = priceRows.find(pr => String(pr.product) === String(item.product));
      // SpecialTO applies ONLY when the product itself has a scheme window
      // (SchemeStartDate/SchemeEndDate) and the invoice date falls inside it.
      // Products without their own scheme dates get SpecialTO = 0.
      const schemeFrom = ProductPrice?.SchemeStartDate;
      const schemeTo = ProductPrice?.SchemeEndDate;
      const schemeActive = isBetween(checkDate, schemeFrom, schemeTo , ProductPrice);

      const TPSale = Number(ProductPrice?.TPSale || 0);
      const TO = Number(ProductPrice?.TO || 0);
      const DisPer = Number(ProductPrice?.DisPer || 0);

      // Scheme flags from price list (IsSchemeRS defaults true)
      const IsSchemeRS = schemeActive && ProductPrice?.IsSchemeRS !== false;
      const isSchemeBox = schemeActive && ProductPrice?.isSchemeBox === true;
      const onBox = Number(ProductPrice?.onBox) || 24;
      const schemeBoxQty = Number(ProductPrice?.schemeBox) || 0;

      const originalBox = Number(item?.DeliveredBox ?? item?.box ?? 0);

      // Box scheme: every `onBox` boxes → `schemeBoxQty` free boxes
      let FreeBox = 0;
      if (isSchemeBox && onBox > 0 && schemeBoxQty > 0) {
        FreeBox = Math.floor(originalBox / onBox) * schemeBoxQty;
        if (FreeBox > originalBox) FreeBox = originalBox;
      }

      // Billed boxes after free-box deduction
      const billedBox = Math.max(0, originalBox - FreeBox);

      // RS scheme money only when IsSchemeRS is true (on billed boxes)
      const specialToRate = IsSchemeRS ? Number(ProductPrice?.SpecialTO || 0) : 0;
      const claimableRate = IsSchemeRS ? Number(ProductPrice?.ClaimableSpecialTO || 0) : 0;
      const unclaimableRate = IsSchemeRS ? Number(ProductPrice?.UnClaimableSpecialTO || 0) : 0;

      return {
        ...item,
        Order: value?.label,
        Store: value?.Store,
        OriginalBox: originalBox,
        FreeBox,
        box: billedBox,
        DeliveredBox: originalBox,
        IsSchemeRS,
        isSchemeBox,
        onBox: isSchemeBox ? onBox : 0,
        schemeBox: isSchemeBox ? schemeBoxQty : 0,
        Rate: TPSale,
        hasPriceList: Boolean(ProductPrice),
        Amount: TPSale * billedBox,
        discount: Number(billedBox * TO),
        SpecialTO: Number(billedBox * specialToRate),
        specialdiscount: Number(((TPSale || 0) / 100 * DisPer) * billedBox),
        ClaimableSpecialTO: Number(billedBox * claimableRate),
        UnClaimableSpecialTO: Number(billedBox * unclaimableRate),
      };
    }).map((val)=>({
      ...val,
      netAmount: Number((Number(val.Amount || 0) - Number(val.discount || 0) - Number(val.specialdiscount || 0) - Number(val.SpecialTO || 0)).toFixed(2)),
      specialdiscount: Number(Number(val.specialdiscount || 0).toFixed(2)),
      discount: Number(Number(val.discount || 0).toFixed(2)),
      Amount: Number(Number(val.Amount || 0).toFixed(2)),
    }));
    setTableData(tableData.concat(output))
    setBuilty({
      BiltyNumber: value.BiltyNumber,
      Biltytype: value.Biltytype,
      BiltyAmount: Number(value.BiltyAmount),

    })


    let netAmount =
      output.reduce(
        (sum, row) => sum + (Number(row.netAmount) || 0),
        0
      )

    if (value.Biltytype == "LTP") {
      //console.log(value.Biltytype)
      netAmount = netAmount - value.BiltyAmount
    }

    const clearedAdvance = advanceAfterDcSelect()
    setAdvance(clearedAdvance.advance)
    setAdvanceDis(clearedAdvance.advanceDis)
    setNetAmount(netAmount)
    setOtherAmount(netAmount)
  }

  const handleCellChange = (id, field, value) => {
    setTableData(prevData =>
      prevData.map(row => {
        if (row.id !== id) return row;

        let updatedRow = { ...row, [field]: value };
        updatedRow.product = updatedRow.product?.value || updatedRow.product;

        // Always resolve product once
        const findProduct = Products.find(p => p._id === updatedRow.product);

        /** ===============================
         * PRODUCT CHANGE
         * =============================== */
        if (field === "product") {
          if (row.product !== value) {
            updatedRow.rate = 0;
            updatedRow.carton = 0;
            updatedRow.box = 0;
            updatedRow.unit = 0;
            updatedRow.DeliveredBox = 0;
            updatedRow.Amount = 0;
            updatedRow.Gst = 0;
            updatedRow.netAmount = 0;
          }
        }

        /** ===============================
         * BOX / CARTON CALCULATION
         * =============================== */
        if (field === "carton" || field === "box") {
          if (findProduct) {
            const BoxinCarton = Number(findProduct.BoxinCarton || 0);
            const PcsinBox = Number(findProduct.PcsinBox || 0);
            const totalUnitsInCarton = BoxinCarton * PcsinBox;

            const carton = Number(updatedRow.carton || 0);
            const box = Number(updatedRow.box || 0);

            updatedRow.unit = (carton * totalUnitsInCarton) + (box * PcsinBox);
            updatedRow.DeliveredBox = updatedRow.unit / PcsinBox;
          }
        }

        /** ===============================
         * DISCOUNT BEFORE GST
         * =============================== */
        if (field === "BeforeGstDiscount") {
          const before = Number(updatedRow.BeforeGstDiscount || 0);
          updatedRow.AmountWithGst = (updatedRow.Amount - before);

          if (findProduct) {
            updatedRow.Gst =
              ((updatedRow.AmountWithGst / 100) * findProduct.SaleTaxPercent).toFixed(2);
          }

          updatedRow.netAmount =
            updatedRow.AmountWithGst - Number(updatedRow.AfterGstDiscount || 0);
        }

        /** ===============================
         * DISCOUNT AFTER GST
         * =============================== */
        if (field === "AfterGstDiscount") {
          updatedRow.netAmount =
            updatedRow.AmountWithGst - Number(updatedRow.AfterGstDiscount || 0);
        }

        return updatedRow;
      })
    );
  };

  // Load master data if the redux store is empty (direct navigation / page refresh)
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const listsNow = normalizePriceLists(PriceList);
        if (listsNow.length === 0) {
          const res = await getDataFundtion('/PriceList');
          const lists = normalizePriceLists(res);
          if (lists.length) dispatch(fetchPricelistReducer(lists));
        }
        if (Products.length === 0) {
          const res = await getDataFundtion('/product');
          dispatch(fetchproduct(res));
        }
        if (OrderDc.length === 0) {
          const res = await getDataFundtion('/DcOrder/GetDcNotEqualFalse');
          dispatch(fetchOrderDc(res));
        }
        if (!Store || Store.length === 0) {
          const res = await getDataFundtion('/store');
          const stores = Array.isArray(res) ? res : (res?.data || []);
          if (stores.length) dispatch(fetchStore(stores));
        }
      } catch (err) {
        console.error('Failed to load master data', err);
      }
      try {
        const policyRes = await getDataFundtion('/AdvanceDiscountPolicy');
        setAdvanceDiscountPolicies(normalizePolicyList(policyRes));
      } catch (err) {
        console.error('Failed to load advance discount policy', err);
        setAdvanceDiscountPolicies([]);
      }
    };
    loadMasterData();
  }, []);

  // If policies load after customer select, refresh percent from distributor policy
  useEffect(() => {
    if (!selectedDistributor?.value || !advanceDiscountPolicies.length) return
    const distributor =
      (EditDistributor || []).find((item) => String(item._id) === String(selectedDistributor.value)) ||
      selectedDistributor
    const percent = resolveAdvanceDiscountPercent(distributor, advanceDiscountPolicies)
    setAdvanceDiscountPercent(percent)
    if (Advance === "yes") {
      const result = applyAdvanceDiscount({
        choice: "yes",
        invoiceNet: totalNetAmount,
        percent,
        biltyType: Builty?.Biltytype,
        biltyAmount: Builty?.BiltyAmount,
        otherAmount: OtherAmount,
      })
      setAdvance(result.advance)
      setAdvanceDis(result.advanceDis)
      setNetAmount(result.netAmount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceDiscountPolicies, selectedDistributor?.value, Advance])

  //console.log(TotalProduct, "TotalProduct")
  const TotalAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.Amount) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
  const totalBOX = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
  const totalFreeBox = tableData.reduce((sum, row) => sum + (parseInt(row.FreeBox) || 0), 0);
  const totalDiscountBeforeGst = tableData.reduce((sum, row) => sum + (parseInt(row.discount) || 0), 0);
  const totalGst = tableData.reduce((sum, row) => sum + (parseInt(row.Gst) || 0), 0);
  const totalspecialdiscount = tableData.reduce((sum, row) => sum + (parseInt(row.specialdiscount) || 0), 0);
  const totalspecialTo = tableData.reduce((sum, row) => sum + (parseInt(row.SpecialTO) || 0), 0);
  const totalDiscountAfterGst = tableData.reduce((sum, row) => sum + (parseInt(row.AfterGstDiscount) || 0), 0);
  const totalNetAmount = tableData.reduce((sum, row) => sum + (parseInt(row.netAmount) || 0), 0);

  const totalCostAmount = tableData.map((item) => ({
    amount: (TotalProduct?.find((val) => val?.ProductName == item?.product && val?.Location == loginVendor?.Location[0] && val?.Store == loginVendor?.Store[0])?.AvgRate * item?.Delivered)?.toFixed(4)
  })).reduce((sum, row) => sum + (parseInt(row.amount) || 0), 0);
  //console.log(Store[0], "Loc")
  const onSubmit = async (data) => {
    if (!canCreateInvoice(tableData)) {
      return toast.error("Price list is not applied")
    }
    const findZeroNetAmount = tableData.find((item) => item.Amount == 0)
    if (findZeroNetAmount) {
      return toast.error(` ${findZeroNetAmount.product} Net Amount is zero Please Check`)
    }
    else {
      setDisabled(true)
      data.Distrbutor = selectedDistributor.value;
      data.Store = salesStore.value,
        data.DcNumber = selectedDc
      data.InvoiceData = tableData.map((item) => ({
        ...item,
        Amount: Number(item.Amount || 0),
        discount: Number(item.discount || 0),
        specialdiscount: Number(item.specialdiscount || 0),
        netAmount: Number(item.netAmount || 0),
      }))
      data.PostStatus = "False"
      data.Advance = AdvanceDis
      data.Transporter = Transporter
      data.TotalAmount = netAmount
      data.AdvancePay = Advance
console.log(data)
      try {
        const res = await createDataFunction("/DistrbutorInvoice", data)
        toast.success("Data Add")
        setTimeout(() => {
          navigate("/DistrbutorInvoice")
        }, 1500);
      } catch (err) {
        const errorMsg = err.response?.data?.message || "Something went wrong"
        toast.error(errorMsg)

      }

    }


  }

  const ApplyDiscount = (value, percent = advanceDiscountPercent) => {
    const result = applyAdvanceDiscount({
      choice: value,
      invoiceNet: totalNetAmount,
      percent,
      biltyType: Builty?.Biltytype,
      biltyAmount: Builty?.BiltyAmount,
      otherAmount: OtherAmount,
    })
    setAdvance(result.advance)
    setAdvanceDis(result.advanceDis)
    setNetAmount(result.netAmount)
  }

  const advanceDiscountEnabled = canChooseAdvanceDiscount(Balance, totalNetAmount, advanceDiscountPercent)
  const priceListApplied = canCreateInvoice(tableData)
  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">Create Customer Invoice</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-bg-surface p-4 md:p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="pd-label">Delivery Date</label>
            <input
              type="date"
              disabled

              {...register("InvoiceDate", { required: true })}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Customer</label>
            <AppSelect options={DrpDistriButor} onChange={(op) => getSaleOrder(op)} isDisabled={tableData.length !== 0 ? true : false} />

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
            <label className="pd-label">Store</label>
            <AppSelect isDisabled={true} value={salesStore} options={StoreDrp} />
          </div>
          <div>
            <label className="pd-label">DC Number</label>
            <AppSelect
              onChange={(v) => getTableData(v)}
              options={SaleOrderDrp}
              isDisabled={tableData.length !== 0}
              placeholder="Select DC..."
            />
          </div>
          <div>
            <label className="pd-label">Ledger Balance</label>
            <input
              type="text"
              readOnly
              value={Balance !== undefined && Balance !== null && Balance !== "" ? Number(Balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
              placeholder="Select customer"
              className="pd-input-readonly text-sm md:text-base font-semibold"
            />
          </div>
          <div>
            <label className="pd-label">Advance Discount ({advanceDiscountPercent}%)</label>
            <select
              value={Advance === "yes" ? "yes" : "no"}
              disabled={!advanceDiscountEnabled}
              onChange={(e) => ApplyDiscount(e.target.value)}
              className={advanceDiscountEnabled ? "pd-input" : "pd-input-readonly"}
              title={
                advanceDiscountEnabled
                  ? `Negative ledger is within ${advanceDiscountPercent}% plus 0.5% of this invoice — choose Yes or No`
                  : "Advance discount opens when the negative ledger covers this invoice within the profile percent plus 0.5%"
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="border px-36">Product</th>
                <th className="border p-2">Carton</th>
                <th className="border p-2">Box</th>
                <th className="border p-2">Free Box</th>
                <th className="border p-2">Rate</th>
                <th className="border p-2">Amount</th>
                <th className="border p-2">Special Discount</th>
                <th className="border p-2">Discount</th>
                <th className="border p-2">Scheme </th>
                <th className="border p-2">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    {Products.find((item) => String(item._id) === String(row.product))?.ProductName || row.productName || row.product}
                  </td>
                  <td className="border p-2">
                    {Number(row.carton)?.toFixed(0)}
                  </td>
                  <td className="border p-2">
                    {row.box}
                  </td>
                  <td className="border p-2">
                    {row.FreeBox || 0}
                  </td>
                  <td className="border p-2">
                    {row.Rate}
                  </td>
                  <td className="border p-2">
                    {Number(row.Amount || 0).toFixed(2)}
                  </td> 
                  <td className="border p-2">{Number(row.specialdiscount || 0).toFixed(2)}</td>

                  <td className="border p-2">
                    {Number(row.discount || 0).toFixed(2)}
                  </td>

                  
                  <td className="border p-2">
                    {row.SpecialTO || 0}
                  </td>
                  

                  <td className="border p-2">
                    {Number(row.netAmount || 0).toFixed(2)}
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
                  <td className="border p-2">{totalFreeBox}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2">{TotalAmount}</td>
                  <td className="border p-2">{totalspecialdiscount}</td>
                  <td className="border p-2">{totalDiscountBeforeGst}</td>
                  <td className="border p-2">{totalspecialTo}</td>
                  <td className="border p-2">{totalNetAmount}</td>


                </tr>
              </tfoot> : null
            }
          </table>
        </div>
        <div className='ml-[80%]'>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-rose-600">Net Amount:</span>
            <span className="text-sm font-bold text-rose-600">{totalNetAmount.toLocaleString()}</span>
          </div>

          {/* Less Amount */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Add Freight Charges:</span>
              <span className="text-sm font-bold">{Builty?.Biltytype == "BTP" ? Number(Builty?.BiltyAmount || 0) : 0}</span>
            </div>

          </div>

          {/* Add Amount */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Less Freight Charges:</span>
              <span className="text-sm font-bold">{Number(Builty?.BiltyAmount || 0)}</span>
            </div>


          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Less Advance Payment Discount:</span>
              <span className="text-sm font-bold">{Number(AdvanceDis || 0)}</span>
            </div>

          </div>
          {/* Total Net Amount */}
          <div className="pt-3 border-t border-rose-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold pd-text-body">Total Net:</span>
              <span className="text-sm font-bold text-rose-600">
                {netAmount}
              </span>

            </div>
          </div>

        </div>
        {view ? 
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          
            <button
              type="submit"
              disabled={disabled || !priceListApplied}
              title={priceListApplied ? undefined : "Price list is not applied"}
              className="pd-btn-save text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Customer Invoice
            </button>
          
        </div>
        : null}
      </form>

    </div>
  )
}

export default DistrbutorInvoiceAdd