import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppSelect from '../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';
import { CircularProgress } from '@mui/material';
const PurchaseInvoiceEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams()
  const [poVendor, setPoVendor] = useState(null);
  const Vendor = useSelector((state) => state.Vendor.state)
  const Products = useSelector((state) => state.Product.product);
  const notify = () => toast("Product Duplicate In Purchase Order");
  const PurchaseInvoice = useSelector((state) => state.PurchaseInvoice.PurchaseInvoice)
  const [tableData, setTableData] = useState([]);

  const editInvoice = PurchaseInvoice.find((item) => item._id == id)
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const [lginerlocation, setlginerlocation] = useState([])
  const [storeDrp, setStoreDrp] = useState([])
  const [LocationDrp, setLoctionDrp] = useState([])
  const [purchasStore, setPurchaseStore] = useState([])
  const [purchaseLoction, setPurchaseLoction] = useState([])
  const [filterProduct, setFilterProduct] = useState([])
  const [disabled, setDisabled] = useState(false)

  const [selectedLocation, setSelectedLocation] = useState([])
  const Store = useSelector((state) => state.Store.Store)
  const location = useSelector((state) => state.Location.Location)
  //console.log(purchasStore)
  const AllProduct = {
    options: Products.map((item) => ({ value: item._id, label: `${item.code} ${item.ProductName}` })),
  };

  const AllVendor = {
    options: Vendor.map((item) => ({ value: item._id, label: item.VendorName })),
  };

  const { register, handleSubmit, formState: { errors } } = useForm();

  const addNewRow = () => {
    setTableData([...tableData, {
      id: Date.now(),
      product: '',
      box: 0,
      carton: 0,
      Gst: 0
    }]);
  };
  const [totals, settotals] = useState({})
  //console.log(totals, "totals")
  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };


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
          //console.log(findProduct)
          if (findProduct) {
            const BoxinCarton = parseInt(findProduct.BoxinCarton || 0);
            const PcsinBox = parseInt(findProduct.PcsinBox || 0);
            const Allunit = BoxinCarton * PcsinBox;
            // Default values if empty
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
            //console.log(totalBox)
            updatedRow.perBoxAmount = (updatedRow.inclGstAmnt / totalBox - row.discount).toFixed(4)
            updatedRow.RetailValue = (findProduct.RetailPrice * totalBox).toFixed(4)
            updatedRow.PerBoxValueGrs = (updatedRow.GrossAmount / totalBox).toFixed(4)
            const ValueAfterDiscout = ((updatedRow.GrossAmount - (updatedRow.discount || 0)))
            updatedRow.ValueAfterDiscout = ValueAfterDiscout
            findProduct.SaleTaxPercent != "0" ? findProduct.SaleTaxBy == 2 ? updatedRow.Gst = (updatedRow.RetailValue / 118 * findProduct.SaleTaxPercent).toFixed(4) : updatedRow.Gst = (updatedRow.GrossAmount / 100 * findProduct.SaleTaxPercent - (updatedRow.discount || 0)).toFixed(4) : updatedRow.Gst = 0
            updatedRow.ValuewithGst = (Number(updatedRow.Gst) + Number(updatedRow.ValueAfterDiscout)).toFixed(4)
            updatedRow.netAmunt = parseFloat(updatedRow.ValuewithGst - updatedRow.AfterTaxdiscount).toFixed(4)
            //  updatedRow.AdvanceTax = parseFloat((updatedRow.netAmunt / 100) * 0.1).toFixed(4)
            updatedRow.netAmuntWithAdvnaceTax = parseFloat(Number(updatedRow.netAmunt) + Number(updatedRow.AdvanceTax)).toFixed(5)
            updatedRow.totalBox = totalBox

          }

        }
        return updatedRow;
      }
      return row;
    }));
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
  const totalAdvanceTax = tableData.reduce((sum, row) => sum + (parseFloat(row.AdvanceTax) || 0), 0);


  //console.log(editInvoice)
  const selectVendor = Vendor.find((item) => item._id == editInvoice?.Vendor)
  const defaultVendor = {
    value: selectVendor?._id,
    label: `${selectVendor?.VendorName} ${selectVendor?.code}`
  }


  const setDrp = (value) => {
    setPurchaseLoction(value)
    const values = value.value;
    setSelectedLocation(values);
    setPurchaseStore([]);
    const updatedStoreDrp = Store?.filter(item => values.includes(item.Location))
      .map(item => ({
        value: item._id,
        label: item.StoreName,
      }));
    setStoreDrp(updatedStoreDrp);

  }

  const onSubmit = async (data) => {
    if (disabled) return;
    setDisabled(true);

    const AllTable = tableData
    data.PurchaseData = AllTable
    data.TotalAmount = totalNetAmount - Number(totals.discountAmount || 0) + Number(totals.AdvanceTax || 0) + Number(totals.GST || 0)
    data.AdvanceTax = (totals.AdvanceTax || 0)
    data.Discount = (totals.discountAmount || 0)
    data.GST = Number(totals.GST || 0)
    try {
      await updateDataFunction(`/PurchaseInvoice/PurchaseInvoiceUpdate/${id}`, data)
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
  const AllProducts = Products.map((product) => ({
    value: product._id,
    label: `${product.mastercode} ${product.ProductName}`,
  }))
  const productRef = useRef(null);
  useEffect(() => {
    if (productRef.current) {
      productRef.current.focus();
    }
  }, [tableData.length])

  const getData = () => {
    const vendor = Vendor.find((item) => item._id == editInvoice.Vendor)
    const product = Products.filter(
      (item) => item.mastercode.startsWith(vendor.code)
    );

    setFilterProduct(product)
    setTableData(editInvoice?.PurchaseData)

    //console.log(editInvoice)
    const findStore = Store.find((item) => item._id == editInvoice?.Store)
    const PurchaseStore = {
      label: findStore?.StoreName,
      value: findStore?._id
    }
    settotals({
      discountAmount: Number(editInvoice.Discount),
      AdvanceTax: Number(editInvoice.AdvanceTax),
      GST: Number(editInvoice.GST),
    })
    setPurchaseStore(PurchaseStore)
    const stores = Store.filter((item) => item.Location === editInvoice?.Location)
    const defultStore = stores.map((item) => ({
      label: item?.StoreName,
      value: item?._id
    }))

    const findLocation = location.find((item) => item?._id == editInvoice?.Location)
    const PurchaseLocation = {
      label: findLocation?.LocationName,
      value: findLocation?._id
    }
    setPurchaseLoction(PurchaseLocation)
    setStoreDrp(defultStore)

    const UserLocation = location.filter((item, index) => loginVendor?.Location[index])
      .map((item1) => ({
        label: item1?.LocationName,
        value: item1?._id
      }
      ))
    //console.log(loginVendor)
    setLoctionDrp(UserLocation)

  }

  useEffect(() => {
    getData()
  }, [])

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
              defaultValue={editInvoice?.PurchaseInvoiceDate}
              {...register("PurchaseInvoiceDate", { required: true })}
              className="pd-input"
            />
          </div>

          <div>
            <label className="pd-label">Vendor</label>
            <AppSelect
              isDisabled={true}
              onChange={(vals) => setPoVendor(vals.value)}
              defaultValue={defaultVendor}
              options={AllVendor?.options}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select customer..."
            />
          </div>

          <div>
            <label className="pd-label">Purchace Invoice No</label>
            <input
              type="text"
              disabled
              defaultValue={editInvoice?.PurchaseInvoice}
              {...register("purchase")}
              className="pd-input pd-bg-muted"
            />
          </div>
          <div>
            <label className="pd-label">DC Number</label>
            <input
              defaultValue={editInvoice?.SalesFlowRef}
              type="text"
              {...register("SalesFlowRef")}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Invoice Ref</label>
            <input
              defaultValue={editInvoice?.InvoiceRef}
              type="text"
              {...register("InvoiceRef")}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Location</label>
            {loginVendor.userType == 1 ? <input
              type="text"
              disabled={true}
              defaultValue={purchaseLoction.label}
              className="pd-input"
            /> : <AppSelect
              options={LocationDrp}
              isDisabled={tableData?.length != 0 ? true : false}
              onChange={(v) => setDrp(v)}
              value={purchaseLoction}
            />
            }
          </div>
          <div>
            <label className="pd-label">Department</label>
            {loginVendor.userType == 1 ? <input
              type="text"
              disabled={true}
              defaultValue={purchasStore.label}
              className="pd-input"
            /> :
              <AppSelect
                options={storeDrp}
                value={purchasStore || null}
                isDisabled={tableData?.length != 0 ? true : false}
                onChange={(v) => {
                  setSelectedStore(v.value);
                  setPurchaseStore(v);
                }}
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
                <th className="border p-2">Pcs</th>
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
                      value={[{
                        label: Products.find((pr) => pr._id === row.product)?.ProductName,
                        value: row.product
                      }]
                      }
                      placeholder="Select Product"
                      defaultOptions={StartingProduct}
                    />
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
                  value={totals.discountAmount}
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
                <span>Updating...</span>
              </>
            ) : (
              "Edit Purchase Invoice"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PurchaseInvoiceEdit