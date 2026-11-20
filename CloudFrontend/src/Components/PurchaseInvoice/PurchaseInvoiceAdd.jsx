import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppSelect from '../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion } from '../../Api/CRUDFunctions';
import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { logTransaction } from '../Accounts/Vouchers/logTransaction';
import { CircularProgress } from '@mui/material';
import {
  applyQtyToLine,
  buildPurchaseAccounts,
  buildRCOptions,
  filterProductsByVendorCode,
  invoiceHeaderTotal,
  productNameOf,
  purchaseLineTotals,
  rcRowsFromSelection,
  voucherTotals,
} from './purchaseInvoiceAdd.js';

const PurchaseInvoiceAdd = () => {
  const navigate = useNavigate();
  const [poVendor, setPoVendor] = useState(null);
  const Vendor = useSelector((state) => state.Vendor.state)
  const Products = useSelector((state) => state.Product.product);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const Store = useSelector((state) => state.Store.Store)
  const location = useSelector((state) => state.Location.Location)
  const [filterProduct, setFilterProduct] = useState([])
  const [VendorDrp, setVendorDrp] = useState([])
  const [totals, settotals] = useState({})

  const [storeDrp, setStoreDrp] = useState([])
  const [selectedStore, setSelectedStore] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('')

  const notify = () => toast("Product Duplicate In Purchase Order");

  const [tableData, setTableData] = useState([]);
  const [RcNumber, setRcNumber] = useState();
  const [lginerStore, setlginerStore] = useState([])
  const [lginerlocation, setlginerlocation] = useState([])
  const [disabled, setDisabled] = useState(false)
  const [type, settype] = useState("")
  const [RCDrp, setRCDrp] = useState([])
  const RC = useSelector((state) => state.RC.Rc)
  const AllVendor1 = Vendor.find((item) => item._id == loginVendor.Vendor[0])
  const AllVendor = { value: AllVendor1?._id, label: AllVendor1?.VendorName }
  const dispatch = useDispatch()

  // ---------------------------------------------------------------
  // Selected vendor ki RC hi dropdown mein dikhao
  // NOTE: RC object mein jo vendor field ho wo rakhein, baqi hata dein
  // ---------------------------------------------------------------
  const buildRCDropdown = (vendorId) => {
    setRCDrp(buildRCOptions(RC, Vendor, vendorId))
  }

  const getData = async () => {
    const arrProduct = Products.length == 0 ? await getDataFundtion('/product') : Products
    Products.length == 0 ? dispatch(fetchproduct(arrProduct?.data)) : null

    if (loginVendor.userType == 1) {

      const vendor = Vendor.find((item) => item._id == loginVendor.Vendor[0])?.code
      const sourceProducts = Products.length == 0 ? arrProduct.data : Products
      const VendorProduct = filterProductsByVendorCode(sourceProducts, vendor)
      const Userstore = Store.find((item) => item._id == loginVendor?.Store[0])
      const UserLocation = location.find((item) => item._id == loginVendor?.Location)
      setSelectedStore(Userstore)
      setlginerlocation(UserLocation)
      setlginerStore(Userstore)
      setFilterProduct(VendorProduct)
    }
    else {
      const Userstore = Store.filter((item, index) => loginVendor?.Store[index])
      const UserLocation = location.filter((item, index) => loginVendor?.Location[index])
        .map((item1) => ({
          label: item1.LocationName,
          value: item1._id
        }
        ))
      const stores = Userstore.map((item) => ({
        label: item.StoreName,
        value: item._id
      }))
      //console.log(UserLocation)
      setlginerlocation(UserLocation)


      const vendorIdSet = new Set(loginVendor.Vendor);
      const AllVendor1 = Vendor.filter(vendor =>
        vendorIdSet.has(vendor._id)
      );
      //console.log(AllVendor1)
      const VenDrp = AllVendor1.map((item) => ({
        label: `${item.VendorName} ${item.code}`,
        value: item._id

      }))

      setVendorDrp(VenDrp)

    }


  }
  const SortProduct = (value) => {
    setPoVendor(value)
    //console.log(Products)
    const vendor = Vendor.find((item) => item._id == value)?.code
    const VendorProduct = filterProductsByVendorCode(Products, vendor)
    setFilterProduct(VendorProduct)

    // vendor change hone par purani selected RC clear
    setRcNumber(undefined)
  }

  useEffect(() => {
    getData()
  }, [])

  // Vendor ya RC data change ho to RC dropdown dobara banao
  useEffect(() => {
    const vendorId = loginVendor.userType == 1 ? loginVendor.Vendor[0] : poVendor
    buildRCDropdown(vendorId)
  }, [RC, poVendor])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const addNewRow = () => {
    if (selectedStore == false) {
      return toast.error("please select DepartMent")
    }
    setTableData([...tableData, {
      id: Date.now(),
      product: '',
      box: 0,
      carton: 0,
      Gst: 0
    }]);
  };
  const productRef = useRef(null);
  useEffect(() => {
    if (productRef.current) {
      productRef.current.focus();
    }
  }, [tableData.length]); // jab new row add ho



  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };
  const loadInvoiceOptions = async (inputValue) => {
    if (!inputValue) return [];

    const filtered = filterProduct
      .filter((item) =>
        item.ProductName.toLowerCase().includes(inputValue.toLowerCase()) || item.salesFlowRef.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50); // limit to first 50 results

    return filtered.map((item) => ({
      label: `${item.ProductName} ${item.salesFlowRef}`,
      value: item._id

    }));
  };

  const StartingProduct = filterProduct.slice(0, 50).map((item) => ({
    label: `${item.ProductName} ${item.salesFlowRef}`,
    value: item._id
  }));;

  const handleCellChange = (id, field, value) => {

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
            updatedRow.AfterTaxdiscount = 0
          }

        }
        if (updatedRow.product == "") {
          updatedRow.inclGstAmnt = ""
          updatedRow.netAmunt = ""
          updatedRow.perBoxAmount = ""
          updatedRow.PerBoxValueGrs = ""
          updatedRow.box = 0
          updatedRow.unit = ""
          updatedRow.carton = 0
          updatedRow.GrossAmount = ""
          updatedRow.Gst = ''
          updatedRow.AfterTaxdiscount = 0
        }

        const findProduct = Products.find((item) => item._id === updatedRow.product);
        if (field == "product") {
          updatedRow.unit == 0
        }
        if (field == "discount") {
          updatedRow.ValueAfterDiscout = ((updatedRow.GrossAmount - updatedRow.discount).toFixed(4) || 0)
          updatedRow.Gst = findProduct.SaleTaxBy == 2 ? updatedRow.Gst = (updatedRow.RetailValue / 118 * findProduct.SaleTaxPercent).toFixed(4) : parseFloat(updatedRow.ValueAfterDiscout / 100 * findProduct.SaleTaxPercent).toFixed(4)

          updatedRow.ValuewithGst = parseFloat(Number(updatedRow.ValueAfterDiscout) + Number(updatedRow.Gst)).toFixed(4)
          updatedRow.netAmunt = updatedRow.ValuewithGst

          // updatedRow.AdvanceTax = parseFloat((updatedRow.netAmunt / 100) * 0.1).toFixed(4)
          // updatedRow.netAmuntWithAdvnaceTax = parseFloat(Number(updatedRow.netAmunt) + Number(updatedRow.AdvanceTax)).toFixed(4)
        }
        if (field == "GST") {
          const gst = value
          updatedRow.ValueAfterDiscout = ((updatedRow.GrossAmount - updatedRow.discount).toFixed(4) || 0)
          updatedRow.Gst = gst
          updatedRow.ValuewithGst = parseFloat(Number(updatedRow.ValueAfterDiscout) + Number(gst)).toFixed(4)
          //console.log(updatedRow.ValuewithGst)
          updatedRow.netAmunt = updatedRow.ValuewithGst

          // updatedRow.AdvanceTax = parseFloat((updatedRow.netAmunt / 100) * 0.1).toFixed(4)
          // updatedRow.netAmuntWithAdvnaceTax = parseFloat(Number(updatedRow.netAmunt) + Number(updatedRow.AdvanceTax)).toFixed(4)
        }
        if (field == "AfterTaxdiscount") {
          updatedRow.netAmunt = updatedRow.ValuewithGst - updatedRow.AfterTaxdiscount
          //updatedRow.AdvanceTax = parseFloat((updatedRow.netAmunt / 100) * 0.1).toFixed(4)
          updatedRow.netAmuntWithAdvnaceTax = parseFloat(Number(updatedRow.netAmunt) + Number(updatedRow.AdvanceTax)).toFixed(4)

        }

        if (field === "box" || field === "carton") {
          return applyQtyToLine(updatedRow, row, findProduct);
        }
        return updatedRow;
      }
      return row;
    }));
  };
  const {
    totalDiscount,
    totalGST,
    totalNetAmount,
    totalBox,
    totalCarton,
    totalUnit,
    totalGrossAmount,
    totalValueAfterDiscount,
    totalValuewithGst,
    totalAfterTaxdiscount,
    totalAdvanceTax,
  } = purchaseLineTotals(tableData);


  const onSubmit = async (data) => {
    if (disabled) return;
    setDisabled(true)
    loginVendor.userType == 1 ? data.Vendor = loginVendor.Vendor[0] : data.Vendor = poVendor
    data.PurchaseData = tableData
    data.VendorCode = loginVendor.userType == 1 ? Vendor.find((item) => item._id == loginVendor.Vendor).code : Vendor.find((item) => item._id == poVendor).code
    data.Location = loginVendor.userType == 1 ? lginerlocation._id : selectedLocation
    data.Store = loginVendor.userType == 1 ? lginerStore._id : selectedStore
    data.TotalAmount = invoiceHeaderTotal(totalNetAmount, totals)
    data.Discount = (totals.discountAmount || 0)
    data.AdvanceTax = (totals.AdvanceTax || 0)
    data.GST = totals.GST
    data.Type = type
    data.RCNumber = RcNumber

    //console.log(data)
    const AccountsData = buildPurchaseAccounts({
      totalGrossAmount,
      totalGST,
      totalDiscount,
      totalNetAmount,
      totals,
    })

    const { debit: TotalDebit, credit: TotalCredit } = voucherTotals(AccountsData);
    //console.log(AccountsData)

    if (TotalDebit.toFixed(2) !== (TotalCredit).toFixed(2)) {
      setDisabled(false)
      return toast.error(`Vocuher Immbalce ${TotalDebit.toFixed(2) - (TotalCredit).toFixed(2)}`)
    }
    try {
      //console.log(data)
      const res = await createDataFunction('/PurchaseInvoice', data)
      data.VoucherNumber = res?.PurchaseInvoice || null
      await logTransaction({
        data,

        loginVendor,
        type: 'Purchase',
      });
      //console.log(res)
      toast.success("Data Add")
      setTimeout(() => {
        navigate('/PurchaseInvoiceList')
      }, 2000)
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Something went wrong"
      toast.error(errorMsg)
      setDisabled(false)
    }

  };
  const setTable = (val) => {
    try {
      setRcNumber(val.value)

      // Auto-fill SalesFlowRef from RC
      if (val.SalesFlowRef) {
        setValue("SalesFlowRef", val.SalesFlowRef)
      }

      // Auto-fill Location and Store from RC (for non-userType 1)
      if (loginVendor.userType != 1 && val.Location && val.Store) {
        // Set Location and populate Store dropdown
        setSelectedLocation(val.Location)
        const StoreDrp = Store?.filter((item) => item.Location == val.Location).map((item) => ({
          value: item._id,
          label: item.StoreName
        }))
        setStoreDrp(StoreDrp)
        setSelectedStore(val.Store)
      }

      setTableData(rcRowsFromSelection(val?.data))
    } catch (err) {

    }
  }
  const setDrp = (value) => {
    setSelectedLocation(value)
    setStoreDrp([])
    const StoreDrp = Store?.filter((item) => item.Location == value).map((item) => {
      return { value: item._id, label: item.StoreName }
    })
    setStoreDrp(StoreDrp)
  }
  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">Create Purchase Invoice </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">Purchase Date</label>
            <input
              type="date"
              {...register("PurchaseInvoiceDate", { required: true })}
              className="pd-input"
            />
          </div>

          <div>
            <label className="pd-label">Vendor</label>
            <AppSelect
              onChange={(vals) => SortProduct(vals.value)}
              options={loginVendor.userType == 1 ? AllVendor : VendorDrp}
              defaultValue={loginVendor.userType == 1 ? AllVendor : null}
              isDisabled={loginVendor.userType == 1 || tableData.length != 0}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Vendor..."
            />
          </div>

          <div>
            <label className="pd-label">Purchace Invoice No</label>
            <input
              type="text"
              disabled
              defaultValue={''}
              {...register("purchase")}
              className="pd-input pd-bg-muted"
            />
          </div>
          <div>
            <label className="block pd-text-body font-seumibold mb-2">DC Number</label>
            <input
              type="text"
              {...register("SalesFlowRef")}
              className="pd-input"
            />
          </div>
          <div>
            <label className="block pd-text-body font-seumibold mb-2">Invoice Ref</label>
            <input
              type="text"
              {...register("InvoiceRef")}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Type</label>
            <select name="" id="" onChange={(e) => settype(e.target.value)} className="pd-input">
              <option value="Inv" >Invoice</option>
              <option value="RC">RC</option>
            </select>
          </div>
          <div>

            <label className="pd-label">Location</label>
            {loginVendor.userType == 1 ? <input
              type="text"
              disabled={true}
              defaultValue={lginerlocation?.LocationName}
              className="pd-input"
            /> : <AppSelect
              options={lginerlocation}
              isDisabled={tableData.length != 0 ? true : false}
              onChange={(v) => setDrp(v.value)}
              value={lginerlocation?.find(opt => opt.value === selectedLocation) || null}
            />
            }
          </div>
          <div>
            <label className="pd-label">Department</label>
            {loginVendor.userType == 1 ? <input
              type="text"
              disabled={true}
              defaultValue={lginerStore?.StoreName}
              className="pd-input"
            /> :
              <AppSelect
                options={storeDrp}
                isDisabled={tableData.length != 0 ? true : false}
                onChange={(v) => setSelectedStore(v.value)}
                value={storeDrp.find(opt => opt.value === selectedStore) || null}
              />
            }
          </div>
          {type == "RC" ?
            <div>
              <>
                <label className="pd-label">RC</label>

                <AppSelect
                  options={RCDrp}
                  isDisabled={tableData.length != 0 || (loginVendor.userType != 1 && !poVendor)}
                  placeholder={
                    loginVendor.userType != 1 && !poVendor
                      ? "Pehle Vendor select karein"
                      : "Select RC..."
                  }
                  onChange={(v) => setTable(v)}
                />
              </>
            </div>

            : null}
        </div>



        {/* Excel-like Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="border px-36">Product</th>
                <th className="border p-2">Unit</th>
                <th className="border p-2">CTN</th>
                <th className="border p-2">Box</th>
                <th className="border p-2">Trade Value Exc. All Taxes</th>
                <th className="border p-2">Per Box Value exclusive gst</th>
                <th className="border p-2">Discount </th>
                <th className="border p-2"> Trade Value After Discount</th>
                <th className="border p-2">Gst</th>
                <th className="border p-2">Trade Value with Gst</th>
                <th className="border p-2">Net Amount </th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    {type === "RC" ? (
                      <>
                        {productNameOf(Products, row)}
                      </>
                    ) : (
                      <AppAsyncSelect
                        ref={index === tableData.length - 1 ? productRef : null}
                        cacheOptions
                        onChange={(selectedOption) =>
                          handleCellChange(
                            row.id,
                            "product",
                            selectedOption ? selectedOption.value : ""
                          )
                        }
                        loadOptions={loadInvoiceOptions}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Product"
                        defaultOptions={StartingProduct}
                      />
                    )}
                  </td>


                  <td className="border p-2">
                    {row.unit}
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && row.id === tableData[tableData.length - 1].id) {
                          e.preventDefault();
                          addNewRow();
                        }
                      }}
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
                    {Number(row.GrossAmount || 0).toLocaleString()}
                  </td>
                  <td className="border p-2">
                    {Number(row.PerBoxValueGrs || 0).toLocaleString() || 0}
                  </td>
                  <td className='border p-2'>
                    <input
                      type="text"
                      value={row.discount}
                      onChange={(e) => handleCellChange(row.id, 'discount', e.target.value)}
                      className="w-full p-1 border rounded"
                    />

                  </td>
                  <td className='border p-2'>
                    {Number(row.ValueAfterDiscout || 0).toLocaleString() || 0}
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.Gst}
                      onChange={(e) => handleCellChange(row.id, 'GST', e.target.value)}
                      className="w-full p-1 border rounded"
                    />

                  </td>
                  <td className="border p-2">
                    {Number(row.ValuewithGst || 0).toLocaleString() || 0}

                  </td>

                  <td className="border p-2">
                    {Number(row.netAmunt || 0).toLocaleString() || 0}

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
                  <td className="border p-2">{totalUnit}</td>
                  <td className="border p-2">{totalCarton}</td>
                  <td className="border p-2">{totalBox}</td>
                  <td className="border p-2">{totalGrossAmount.toLocaleString() || 0}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2">{totalDiscount.toLocaleString()}</td>
                  <td className="border p-2">{totalValueAfterDiscount.toLocaleString()}</td>
                  <td className="border p-2">{totalGST.toLocaleString()}</td>
                  <td className="border p-2">{totalValuewithGst.toLocaleString()}</td>

                  <td className="border p-2">{totalNetAmount.toLocaleString()}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot> : null
            }
          </table>
        </div>
        <div>
          <button
            type="button"
            onClick={addNewRow}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNewRow();
              }
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Add Row
          </button>
        </div>
        {/* Right Panel Summary Card */}
        <div className="flex justify-end">
          <div className="bg-gradient-to-br from-rose-50 to-white w-[24vw] p-4 rounded-lg border border-rose-100 shadow space-y-4">

            {/* Net Amount */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-rose-600">Net Amount:</span>
              <span className="text-lg font-bold text-rose-600">{totalNetAmount.toLocaleString()}</span>
            </div>

            {/* Less Amount */}

            <div className="space-y-1">
              <label className="text-xs font-semibold pd-text-body">Discount Amount</label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  onChange={(e) => {
                    const value = e.target.value;

                    settotals({
                      ...totals,
                      discountAmount: value,
                      netAmount: totals.subTotal - value
                    });
                  }}
                  placeholder="0"
                  className="w-[8vw] px-2 py-1 text-xs text-right bg-rose-50 border border-rose-200 rounded focus:ring-1 focus:ring-rose-300"
                />
              </div>
            </div>

            {/* Add Amount */}
            <div className="space-y-1">
              <label className="text-xs font-semibold pd-text-body">GST</label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  onChange={(e) => {
                    const value = e.target.value;

                    settotals({
                      ...totals,
                      GST: value,
                      netAmount: totals.subTotal + value
                    });
                  }}
                  value={totals.GST}
                  placeholder="0"
                  className="w-[8vw] px-2 py-1 text-xs text-right bg-rose-50 border border-rose-200 rounded focus:ring-1 focus:ring-rose-300"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold pd-text-body">Advance Tax</label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    onChange={(e) => {
                      const value = e.target.value;

                      settotals({
                        ...totals,
                        AdvanceTax: value,
                        netAmount: totals.subTotal - value
                      });
                    }}
                    value={totals.AdvanceTax}
                    placeholder="0"
                    className="w-[8vw] px-2 py-1 text-xs text-right bg-rose-50 border border-rose-200 rounded focus:ring-1 focus:ring-rose-300"
                  />
                </div>
              </div>


            </div>
            {/* Total Net Amount */}
            <div className="pt-3 border-t border-rose-100">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold pd-text-body">Total Net:</span>
                <span className="text-lg font-bold text-rose-600">{Number(Number(totalNetAmount) + Number(totals.AdvanceTax || 0) + Number(totals.GST || 0) - (totals.discountAmount || 0)).toLocaleString()}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-5">
          <button
            type="submit"
            disabled={disabled}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {disabled ? (
              <>
                <CircularProgress size={18} color="inherit" />
                <span>Creating...</span>
              </>
            ) : (
              "Create Purchase Invoice"
            )}
          </button>
        </div>

      </form>
    </div>
  )
}

export default PurchaseInvoiceAdd