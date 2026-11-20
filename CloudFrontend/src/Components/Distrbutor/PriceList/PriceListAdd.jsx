import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppSelect from '../../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';


const DitributorRcAdd = () => {
  const navigate = useNavigate();
  const [poVendor, setPoVendor] = useState(null);
  const Vendor = useSelector((state) => state.Vendor.state) || []
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

  const notify = () => toast("Product Duplicate In RC Order");

  const [tableData, setTableData] = useState([]);
  const [lginerStore, setlginerStore] = useState([])
  const [lginerlocation, setlginerlocation] = useState([])

 
  const dispatch = useDispatch()

  const getData = async () => {
    const arrProduct = Products.length == 0 ? await getDataFundtion('/product') : Products.filter((item) => item.isForSND == "true")
    Products.length == 0 ? dispatch(fetchproduct(arrProduct?.data)) : null
    const totalProduct = Products.filter((item) => item.isForSND == "true")
    //console.log(totalProduct, "totalProduct")
    setFilterProduct(totalProduct)
    if (loginVendor.userType == 1) {


      const Userstore = (Store || []).find((item) => item._id == loginVendor?.Store?.[0])
      const UserLocation = (location || []).find((item) => item._id == loginVendor?.Location)
      setSelectedStore(Userstore)
      setlginerlocation(UserLocation)
      setlginerStore(Userstore)



    }
    else {
      const Userstore = (Store || []).filter((item, index) => loginVendor?.Store?.[index])
      const UserLocation = (location || []).filter((item, index) => loginVendor?.Location?.[index])
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
    const VendorProduct = Products.filter((item) => item.mastercode.slice(0, 2) == vendor)
    setFilterProduct(VendorProduct)
  }

  useEffect(() => {
    getData()
  }, [])
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const schemeDateFrom = watch('SchemeDateFrom');
  const schemeDateTo = watch('SchemeDateTo');

  const addNewRow = () => {

    setTableData([...tableData, {
      id: Date.now(),
      product: '',
      box: 0,
      carton: 0,
      Gst: 0,
      TPSale: "",
      TO: "",
      DisPer: "",
      SpecialTO: "",
      ClaimableSpecialTO: "",
      UnClaimableSpecialTO: "",
      NetSale: 0,
      SchemeStartDate: schemeDateFrom || "",
      SchemeEndDate: schemeDateTo || ""
    }]);
  };

  // Empty per-row scheme dates fall back to the global scheme dates (uper wali dates)
  useEffect(() => {
    setTableData((prev) =>
      prev.map((row) => ({
        ...row,
        SchemeStartDate: row.SchemeStartDate || schemeDateFrom || "",
        SchemeEndDate: row.SchemeEndDate || schemeDateTo || "",
      }))
    );
  }, [schemeDateFrom, schemeDateTo]);

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
            updatedRow.TO = 0
            updatedRow.DisPer = 0
            updatedRow.TPSale = 0
            updatedRow.ClaimableSpecialTO = 0
            updatedRow.UnClaimableSpecialTO = 0
            updatedRow.SpecialTO = 0
          }

        }
        if (updatedRow.product == "") {
          updatedRow.TO = 0
          updatedRow.DisPer = 0
          updatedRow.TPSale = 0
          updatedRow.ClaimableSpecialTO = 0
          updatedRow.UnClaimableSpecialTO = 0
          updatedRow.SpecialTO = 0
        }

        const findProduct = Products.find((item) => item._id === updatedRow.product);
        if (field == "product") {
          updatedRow.unit = 0
        }
        if (field == "product" || field == "TPSale" || field == "TO" || field == "DisPer" || field == "SpecialTO" ||
            field == "ClaimableSpecialTO" || field == "UnClaimableSpecialTO") {
          // SpecialTO auto-calculates from Claimable + UnClaimable
          updatedRow.SpecialTO = Number(updatedRow.ClaimableSpecialTO || 0) + Number(updatedRow.UnClaimableSpecialTO || 0)
          const base = Number(updatedRow.TPSale || 0) - Number(updatedRow.TO || 0) - Number(updatedRow.SpecialTO || 0)
          updatedRow.NetSale = base - (base / 100 * Number(updatedRow.DisPer || 0))
        }

        return updatedRow;
      }
      return row;
    }));
  };
  const totalDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0);
  const totalGST = tableData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0);
  const totalNetAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);
  const totalTPSale = tableData.reduce((sum, row) => sum + (parseFloat(row.TPSale) || 0), 0);
  const totalTO = tableData.reduce((sum, row) => sum + (parseFloat(row.TO) || 0), 0);
  const totalClaimable = tableData.reduce((sum, row) => sum + (parseFloat(row.ClaimableSpecialTO) || 0), 0);
  const totalUnClaimable = tableData.reduce((sum, row) => sum + (parseFloat(row.UnClaimableSpecialTO) || 0), 0);
  const totalScheme = tableData.reduce((sum, row) => sum + (parseFloat(row.SpecialTO) || 0), 0);
  const totalNet = tableData.reduce((sum, row) => sum + (parseFloat(row.NetSale) || 0), 0);

  const totalGrossAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.GrossAmount) || 0), 0);
  const totalValueAfterDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.ValueAfterDiscout) || 0), 0);
  const totalValuewithGst = tableData.reduce((sum, row) => sum + (parseFloat(row.ValuewithGst) || 0), 0);
  const totalAfterTaxdiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.AfterTaxdiscount) || 0), 0);
  // const totalAdvanceTax = tableData.reduce((sum, row) => sum + (parseFloat(row.AdvanceTax) || 0), 0);

  useEffect(() => {
    const value = (totalNetAmount / 100) * 0.1
    settotals({
      ...totals,
      AdvanceTax: value,
      netAmount: totalNetAmount + value
    });

  }, [totalNetAmount])

  const onSubmit = async (data) => {
    data.PriceListData = tableData
    try {
      const res = await createDataFunction("/PriceList", data)
      //console.log(res)
    } catch (err) {
      //console.log(err)
      toast.error("Something went wrong")
    }

  };
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
      <h1 className="pd-page-title text-center mb-6">Create Price List </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">Price List Date</label>
            <input
              type="date"
              {...register("PriceListDate", { required: true })}
              className="pd-input"
            />
          </div>

          <div>
            <label className="pd-label">Price List Name</label>
            <input
              type="text"
              {...register("PriceListName", { required: true })}
              className="pd-input"
            />
          </div>

          <div>
            <label className="pd-label">Status</label>
            <select name="" id="" {...register("PriceListStatus", { required: true })} className="pd-input">
              <option value="Active">Active</option>
              <option value="InActive">InActive</option>
            </select>
          </div>

          <div>
            <label className="pd-label">Scheme Date From</label>
            <input type="date" {...register("SchemeDateFrom")} className="pd-input" />
          </div>

          <div>
            <label className="pd-label">Scheme Date To</label>
            <input type="date" {...register("SchemeDateTo")} className="pd-input" />
          </div>

        </div>

        {/* Excel-like Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="text-xs">
                <th className="border px-36">Product</th>
                <th className="border p-2">TPSale</th>
                <th className="border p-2">TO</th>
                <th className="border p-2">Claimable Scheme</th>
                <th className="border p-2">UnClaimable Scheme</th>
                <th className="border p-2">Scheme Start Date</th>
                <th className="border p-2">Scheme End Date</th>
                <th className="border p-2">Scheme</th>
                <th className="border p-2">Discount %</th>
                <th className="border p-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    <AppAsyncSelect
                      openMenuOnFocus={false}
                      isSearchable
                      placeholder="Select Product..."
                      className="text-xs"
                      cacheOptions
                      onChange={(selectedOption) =>
                        handleCellChange(
                          row.id,
                          "product",
                          selectedOption ? selectedOption.value : ""
                        )
                      }
                      loadOptions={loadInvoiceOptions}
                      classNamePrefix="pd-select"
                      defaultOptions={StartingProduct}
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.TPSale}
                      onChange={(e) => handleCellChange(row.id, 'TPSale', e.target.value)}
                      className="w-full p-1 border rounded text-xs"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.TO}
                      onChange={(e) => handleCellChange(row.id, 'TO', e.target.value)}
                      className="w-full p-1 border rounded text-xs"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.ClaimableSpecialTO}
                      onChange={(e) =>
                        handleCellChange(row.id, "ClaimableSpecialTO", e.target.value)
                      }
                      className="border p-1 w-full text-xs"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.UnClaimableSpecialTO}
                      onChange={(e) =>
                        handleCellChange(row.id, "UnClaimableSpecialTO", e.target.value)
                      }
                      className="border p-1 w-full text-xs"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="date"
                      value={row.SchemeStartDate || ""}
                      onChange={(e) =>
                        handleCellChange(row.id, "SchemeStartDate", e.target.value)
                      }
                      className="border p-1 w-full text-xs"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="date"
                      value={row.SchemeEndDate || ""}
                      onChange={(e) =>
                        handleCellChange(row.id, "SchemeEndDate", e.target.value)
                      }
                      className="border p-1 w-full text-xs"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      value={row.SpecialTO || 0}
                      disabled={true}
                      className="border p-1 w-full text-xs bg-gray-100"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.DisPer}
                      onChange={(e) => handleCellChange(row.id, 'DisPer', e.target.value)}
                      className="w-full p-1 border rounded text-xs"
                    />
                  </td>

                  <td className="border p-2 text-xs">
                    {row.NetSale || 0}
                  </td>
                </tr>

              ))
              }

            </tbody>
            {
              tableData.length != 0 ? <tfoot>
                <tr className="pd-table-footer text-xs">
                  <td className="border p-2">Total</td>
                  <td className="border p-2">{totalTPSale}</td>
                  <td className="border p-2">{totalTO}</td>
                  <td className="border p-2">{totalClaimable}</td>
                  <td className="border p-2">{totalUnClaimable}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2">{totalScheme}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2">{totalNet}</td>
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


        {/* Submit Button */}
        <div className="flex justify-end mt-5">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm md:text-base"
          >
            Ditributor Rc Add
          </button>
        </div>

      </form>
    </div>
  )
}

export default DitributorRcAdd