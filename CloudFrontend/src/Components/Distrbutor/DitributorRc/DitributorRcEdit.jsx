import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppSelect from '../../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { CircularProgress } from '@mui/material';

const productIdOf = (product) => {
  if (product && typeof product === 'object') return product._id || ''
  return product || ''
}

const DitributorRcEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams()
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
  const [disabled, setdisabled] = useState(false)
  const [selectedStore, setSelectedStore] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('')
  const RC = useSelector((state) => state.RC.Rc)

  const editRC = RC.find((item) => item._id == id)

  const notify = () => toast("Product Duplicate In RC Order");

  const [tableData, setTableData] = useState([]);
  const [lginerStore, setlginerStore] = useState([])
  const [lginerlocation, setlginerlocation] = useState([])

  const AllVendor1 = Vendor.find((item) => item._id == editRC?.Vendor)
  const AllVendor = { value: AllVendor1?._id, label: AllVendor1?.VendorName }
  const dispatch = useDispatch()

  const vendorStoreOptions = (vendorId, locationId) => {
    const vendorStoreIds = new Set(
      (Vendor.find((item) => item._id == productIdOf(vendorId))?.Store || [])
        .map((storeId) => String(storeId && typeof storeId === 'object' ? storeId._id : storeId))
        .filter(Boolean)
    )
    return (Store || [])
      .filter((item) => vendorStoreIds.has(String(item._id)) && (!locationId || String(item.Location) === String(locationId)))
      .map((item) => ({ value: item._id, label: item.StoreName }))
  }

  const getData = async () => {
    const arrProduct = Products.length == 0 ? await getDataFundtion('/product') : Products
    Products.length == 0 ? dispatch(fetchproduct(arrProduct?.data)) : null

    if (loginVendor.userType == 1) {
      const vendor = Vendor.find((item) => item._id == loginVendor.Vendor[0])?.code
      const source = Products.length == 0 ? (arrProduct?.data || []) : Products
      const VendorProduct = source.filter((item) => item?.mastercode && item.mastercode.slice(0, 2) == vendor)
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
        }))
      const stores = Userstore.map((item) => ({
        label: item.StoreName,
        value: item._id
      }))
      setlginerlocation(UserLocation)

      const vendorIdSet = new Set(loginVendor.Vendor);
      const AllVendor1 = Vendor.filter(vendor =>
        vendorIdSet.has(vendor._id)
      );
      const VenDrp = AllVendor1.map((item) => ({
        label: `${item.VendorName} ${item.code}`,
        value: item._id
      }))
      setVendorDrp(VenDrp)
    }
  }

  const SortProduct = (value, productList = Products) => {
    const vendorId = productIdOf(value)
    setPoVendor(vendorId)
    const vendor = Vendor.find((item) => item._id == vendorId)?.code
    if (vendor == null || vendor === '') return
    const VendorProduct = (productList || []).filter((item) => item?.mastercode && item.mastercode.slice(0, 2) == vendor)
    setFilterProduct(VendorProduct)
  }

  useEffect(() => {
    getData()
  }, [])

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

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
  }, [tableData.length]);

  const removeRow = (id) => {
    setTableData((prev) => prev.filter((row) => String(row.id || row._id) !== String(id)));
  };

  const loadInvoiceOptions = async (inputValue) => {
    if (!inputValue) return [];
    const query = inputValue.toLowerCase()

    const filtered = filterProduct
      .filter((item) => {
        const name = String(item?.ProductName || '').toLowerCase()
        const ref = String(item?.salesFlowRef || '').toLowerCase()
        return name.includes(query) || ref.includes(query)
      })
      .slice(0, 50);

    return filtered.map((item) => ({
      label: `${item.ProductName || ''} ${item.salesFlowRef || ''}`.trim(),
      value: item._id
    }));
  };

  const StartingProduct = filterProduct.slice(0, 50).map((item) => ({
    label: `${item.ProductName || ''} ${item.salesFlowRef || ''}`.trim(),
    value: item._id
  }));

  const productOption = (product) => {
    const productId = productIdOf(product)
    if (!productId) return null
    const matched = Products.find((pr) => pr._id === productId)
    return {
      value: productId,
      label: matched
        ? `${matched.ProductName || ''} ${matched.salesFlowRef || ''}`.trim()
        : 'Product'
    }
  }

  const handleCellChange = (id, field, value) => {
    setTableData((prev) => prev.map(row => {
      if (String(row.id || row._id) === String(id)) {
        const updatedRow = { ...row, [field]: field === 'product' ? productIdOf(value) : value };
        const previousProduct = productIdOf(row.product)
        if (field == "product") {
          if (previousProduct != updatedRow.product) {
            updatedRow.inclGstAmnt = ""
            updatedRow.netAmunt = ""
            updatedRow.perBoxAmount = ""
            updatedRow.PerBoxValueGrs = ""
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
        if (field == "discount") {
          updatedRow.ValueAfterDiscout = ((updatedRow.GrossAmount - updatedRow.discount).toFixed(4) || 0)
          updatedRow.Gst = parseFloat(updatedRow.ValueAfterDiscout / 100 * findProduct.SaleTaxPercent).toFixed(4)
          updatedRow.ValuewithGst = parseFloat(Number(updatedRow.ValueAfterDiscout) + Number(updatedRow.Gst)).toFixed(4)
          updatedRow.netAmunt = updatedRow.ValuewithGst
        }
        if (field == "AfterTaxdiscount") {
          updatedRow.netAmunt = updatedRow.ValuewithGst - updatedRow.AfterTaxdiscount
          updatedRow.netAmuntWithAdvnaceTax = parseFloat(Number(updatedRow.netAmunt) + Number(updatedRow.AdvanceTax)).toFixed(4)
        }

        if (field === "box" || field === "carton" || field === "product") {
          if (findProduct) {
            const BoxinCarton = parseInt(findProduct.BoxinCarton || 0);
            const PcsinBox = parseInt(findProduct.PcsinBox || 0);
            const Allunit = BoxinCarton * PcsinBox;
            const box = parseInt(updatedRow.box || 0);
            const carton = parseInt(updatedRow.carton || 0);
            if (box === 0) {
              updatedRow.unit = Allunit * carton;
            } else if (carton === 0) {
              updatedRow.unit = PcsinBox * box;
            } else {
              const totalbox = box * findProduct.PcsinBox
              updatedRow.unit = Allunit * carton + totalbox;
            }
            const boxPrice = (updatedRow.unit / findProduct.PcsinBox)
            updatedRow.GrossAmount = (boxPrice * findProduct.TPPurchase).toFixed(4)
            updatedRow.discount = ((updatedRow.GrossAmount / 100) * findProduct.PurchaseDiscountPer)
            const totalBox = updatedRow.unit / findProduct.PcsinBox
            updatedRow.perBoxAmount = (updatedRow.inclGstAmnt / totalBox - row.discount).toFixed(4)
            updatedRow.RetailValue = (findProduct.RetailPrice * totalBox).toFixed(4)
            updatedRow.PerBoxValueGrs = (updatedRow.GrossAmount / totalBox).toFixed(4)
            const ValueAfterDiscout = ((updatedRow.GrossAmount - (updatedRow.discount || 0)))
            updatedRow.ValueAfterDiscout = ValueAfterDiscout
            findProduct.SaleTaxPercent != "0" ? findProduct.SaleTaxBy == 2 ? updatedRow.Gst = (updatedRow.RetailValue / 118 * findProduct.SaleTaxPercent).toFixed(4) : updatedRow.Gst = (updatedRow.GrossAmount / 100 * findProduct.SaleTaxPercent - updatedRow.discount).toFixed(4) : updatedRow.Gst = 0
            updatedRow.ValuewithGst = (Number(updatedRow.Gst) + Number(updatedRow.ValueAfterDiscout)).toFixed(4)
            updatedRow.netAmunt = parseFloat(updatedRow.ValuewithGst - updatedRow.AfterTaxdiscount).toFixed(4)
            updatedRow.netAmuntWithAdvnaceTax = parseFloat(Number(updatedRow.netAmunt) + Number(updatedRow.AdvanceTax)).toFixed(5)
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
  const totalBox = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
  const totalUnit = tableData.reduce((sum, row) => sum + (parseInt(row.unit) || 0), 0);
  const totalGrossAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.GrossAmount) || 0), 0);
  const totalValueAfterDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.ValueAfterDiscout) || 0), 0);
  const totalValuewithGst = tableData.reduce((sum, row) => sum + (parseFloat(row.ValuewithGst) || 0), 0);
  const totalAfterTaxdiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.AfterTaxdiscount) || 0), 0);

  useEffect(() => {
    const value = (totalNetAmount / 100) * 0.1
    settotals({
      ...totals,
      AdvanceTax: value,
      netAmount: totalNetAmount + value
    });
  }, [totalNetAmount])

  const initEditData = () => {
    if (editRC) {
      const rows = (editRC.RcData || []).map((row, index) => ({
        ...row,
        id: row.id || row._id || `rc-${index}`,
        product: productIdOf(row.product),
      }))
      setTableData(rows)
      const findStore = Store.find((item) => item._id == editRC?.Store)
      setlginerStore(findStore)
      const findLocation = location.find((item) => item._id == editRC?.Location)
      if (loginVendor.userType == 1) {
        setSelectedStore(findStore)
        setlginerlocation(findLocation)
      } else {
        setSelectedStore(findStore?._id || false)
        setSelectedLocation(editRC?.Location || '')
        setStoreDrp(vendorStoreOptions(editRC.Vendor, editRC?.Location))
      }
      SortProduct(editRC.Vendor)
    }
  }

  useEffect(() => {
    initEditData()
  }, [editRC])

  useEffect(() => {
    if (loginVendor?.userType == 1 || !editRC) return
    const vendorId = poVendor || productIdOf(editRC.Vendor)
    const locationId = selectedLocation || editRC.Location
    if (!vendorId || !locationId) return
    setStoreDrp(vendorStoreOptions(vendorId, locationId))
  }, [editRC, poVendor, selectedLocation, Store, Vendor, loginVendor])

  useEffect(() => {
    const vendorId = productIdOf(editRC?.Vendor) || (loginVendor?.userType == 1 ? loginVendor?.Vendor?.[0] : null)
    if (!vendorId || !Products?.length) return
    SortProduct(vendorId, Products)
  }, [editRC, Products, Vendor, loginVendor])

  const onSubmit = async (data) => {
    if (disabled) return;
    setdisabled(true)
    const vendorId = loginVendor.userType == 1 ? loginVendor.Vendor[0] : (poVendor || productIdOf(editRC?.Vendor))
    const storeId = loginVendor.userType == 1
      ? (lginerStore?._id || editRC?.Store)
      : (selectedStore || editRC?.Store)
    const locationId = loginVendor.userType == 1
      ? (lginerlocation?._id || editRC?.Location)
      : (selectedLocation || editRC?.Location)
    data.Vendor = productIdOf(vendorId)
    data.Store = productIdOf(storeId)
    data.Location = productIdOf(locationId)
    data.RcDate = data.RcDate || editRC?.RcDate
    data.SalesFlowRef = data.SalesFlowRef ?? editRC?.SalesFlowRef ?? ""
    data.RCData = tableData.map((row) => ({
      ...row,
      product: productIdOf(row.product),
    }))
    
    

    try {
      await updateDataFunction(`/RC/RCUpdate/${id}`, data)
      toast.success("Data Updated")
      setTimeout(() => {
        navigate('/DitributorRcList')
      }, 2000)
    } catch (err) {
      toast.error("Something went wrong")
      setdisabled(false)
    }
  };

  const setDrp = (value) => {
    const vendorId = poVendor || productIdOf(editRC?.Vendor)
    const nextStores = vendorId ? vendorStoreOptions(vendorId, value) : []
    setSelectedLocation(value)
    setStoreDrp(nextStores)
    setSelectedStore((prev) => {
      const current = prev && typeof prev === 'object' ? prev._id : prev
      return nextStores.some((opt) => String(opt.value) === String(current)) ? current : false
    })
  }

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">Edit RC Invoice </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">RC Date</label>
            <input
              type="date"
              disabled={true}
              defaultValue={editRC?.RcDate}
              {...register("RcDate", { required: true })}
              className="pd-input"
            />
          </div>

          <div>
            <label className="pd-label">Vendor</label>
            <AppSelect
              onChange={(vals) => SortProduct(vals.value)}
              options={loginVendor.userType == 1 ? AllVendor : VendorDrp}
              defaultValue={AllVendor}
              isDisabled={true}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Vendor..."
            />
          </div>

          <div>
            <label className="pd-label">RC No</label>
            <input
              type="text"
              disabled
              defaultValue={editRC?.RcCode}
              {...register("RC")}
              className="pd-input pd-bg-muted"
            />
          </div>
          <div>
            <label className="block pd-text-body font-seumibold mb-2">Ref</label>
            <input
              type="text"
              defaultValue={editRC?.SalesFlowRef}
              {...register("SalesFlowRef")}
              className="pd-input"
            />
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
              value={(Array.isArray(lginerlocation) ? lginerlocation : []).find((opt) => opt.value == (selectedLocation || editRC?.Location)) || null}
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
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => {
                const lineId = row.id || row._id
                return (
                <tr key={lineId || index} >
                  <td className="border p-2">
                    <AppAsyncSelect
                      ref={index === tableData.length - 1 ? productRef : null}
                      onChange={(selectedOption) =>
                        handleCellChange(
                          lineId,
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
                      value={productOption(row.product)}
                    />
                  </td>

                  <td className="border p-2">
                    {row.unit}
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && lineId === (tableData[tableData.length - 1].id || tableData[tableData.length - 1]._id)) {
                          e.preventDefault();
                          addNewRow();
                        }
                      }}
                      value={row.carton}
                      onChange={(e) => handleCellChange(lineId, 'carton', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.box}
                      onChange={(e) => handleCellChange(lineId, 'box', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>

                  <td className="border p-2">
                    <button
                      type="button"
                      onClick={() => removeRow(lineId)}
                      className="pd-btn-icon-danger hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
                )
              })
              }

            </tbody>
            {
              tableData.length != 0 ? <tfoot>
                <tr className="pd-table-footer">
                  <td className="border p-2">Total</td>
                  <td className="border p-2">{totalUnit}</td>
                  <td className="border p-2">{totalCarton}</td>
                  <td className="border p-2">{totalBox}</td>
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
                <span>Updating...</span>
              </>
            ) : (
              "Ditributor RC Edit"
            )}
          </button>
        </div>

      </form>
    </div>
  )
}

export default DitributorRcEdit
