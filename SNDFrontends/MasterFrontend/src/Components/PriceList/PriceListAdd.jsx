import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AsyncSelect from 'react-select/async';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { createDataFunction, getDataFundtion } from '../../Api/CurdFunctions';


const DitributorRcAdd = () => {
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

  const notify = () => toast("Product Duplicate In RC Order");

  const [tableData, setTableData] = useState([]);
  const [lginerStore, setlginerStore] = useState([])
  const [lginerlocation, setlginerlocation] = useState([])

  const AllVendor1 = Vendor.find((item) => item._id == loginVendor.Vendor[0])
  const AllVendor = { value: AllVendor1?._id, label: AllVendor1?.VendorName }
  const dispatch = useDispatch()

  const getData = async () => {
    const arrProduct = Products.length == 0 ? await getDataFundtion('/product') : Products.filter((item) => item.isForSND == "true")
    Products.length == 0 ? dispatch(fetchproduct(arrProduct?.data)) : null
    const totalProduct = Products.filter((item) => item.isForSND == "true")
    console.log(totalProduct, "totalProduct")
    setFilterProduct(totalProduct)
    if (loginVendor.userType == 1) {


      const Userstore = Store.find((item) => item._id == loginVendor?.Store[0])
      const UserLocation = location.find((item) => item._id == loginVendor?.Location)
      setSelectedStore(Userstore)
      setlginerlocation(UserLocation)
      setlginerStore(Userstore)



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
      console.log(UserLocation)
      setlginerlocation(UserLocation)


      const vendorIdSet = new Set(loginVendor.Vendor);
      const AllVendor1 = Vendor.filter(vendor =>
        vendorIdSet.has(vendor._id)
      );
      console.log(AllVendor1)
      const VenDrp = AllVendor1.map((item) => ({
        label: `${item.VendorName} ${item.code}`,
        value: item._id

      }))

      setVendorDrp(VenDrp)

    }


  }
  const SortProduct = (value) => {
    setPoVendor(value)
    console.log(Products)
    const vendor = Vendor.find((item) => item._id == value)?.code
    const VendorProduct = Products.filter((item) => item.mastercode.slice(0, 2) == vendor)
    setFilterProduct(VendorProduct)
  }

  useEffect(() => {
    getData()
  }, [])
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
          }

        }
        if (updatedRow.product == "") {
          updatedRow.TO = 0
          updatedRow.DisPer = 0
          updatedRow.TPSale = 0
        }

        const findProduct = Products.find((item) => item._id === updatedRow.product);
        if (field == "product") {
          updatedRow.unit == 0
        }
        if (field == "TPSale") {
          updatedRow.TPSale = value
          updatedRow.NetSale = (Number(updatedRow.TPSale || 0) - Number(updatedRow.TO || 0))
          updatedRow.NetSale -= ((Number(updatedRow.TPSale || 0) - Number(updatedRow.TO || 0)) / 100 * Number(updatedRow.DisPer))

          // updatedRow.AdvanceTax = parseFloat((updatedRow.netAmunt / 100) * 0.1).toFixed(4)
          // updatedRow.netAmuntWithAdvnaceTax = parseFloat(Number(updatedRow.netAmunt) + Number(updatedRow.AdvanceTax)).toFixed(4)
        }
        if (field == "TO") {
          updatedRow.NetSale = (Number(updatedRow.TPSale || 0) - Number(updatedRow.TO || 0))
          updatedRow.NetSale -= ((Number(updatedRow.TPSale || 0) - Number(updatedRow.TO || 0)) / 100 * Number(updatedRow.DisPer))

        }

        if (field == "DisPer") {
          updatedRow.NetSale = (Number(updatedRow.TPSale || 0) - Number(updatedRow.TO || 0))
          updatedRow.NetSale -= ((Number(updatedRow.TPSale || 0) - Number(updatedRow.TO || 0)) / 100 * Number(updatedRow.DisPer))

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
      console.log(res)
      toast.success("Successfully added")
      navigate("/PriceList") 
    } catch (err) {
      console.log(err)
      toast.error("Some Thing Went Wrong")
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
    <div className=" p-4">
      <ToastContainer />
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Create Price List </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Price List Date</label>
            <input
              type="date"
              {...register("PriceListDate", { required: true })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Price List Name</label>
            <input
              type="text"
              {...register("PriceListName", { required: true })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Status</label>
            <select name="" id="" {...register("PriceListStatus", { required: true })} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Active">Active</option>
              <option value="InActive">InActive</option>
            </select>
          </div>

        </div>

        {/* Excel-like Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-36">Product</th>
                <th className="border p-2">TPSale</th>
                <th className="border p-2">TO</th>
                <th className="border p-2">DiscountPer</th>
                <th className="border p-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    <AsyncSelect
                      openMenuOnFocus={false}
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 })
                      }}
                      isSearchable
                      placeholder="Select Product..."
                      className="text-sm"
                      cacheOptions
                      onChange={(selectedOption) =>
                        handleCellChange(
                          row.id,
                          "product",
                          selectedOption ? selectedOption.value : ""
                        )
                      }
                      loadOptions={loadInvoiceOptions}
                      classNamePrefix="select"
                      // isSearchable
                      // placeholder="Select Product"
                      defaultOptions={StartingProduct}
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.TPSale}
                      onChange={(e) => handleCellChange(row.id, 'TPSale', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.TO}
                      onChange={(e) => handleCellChange(row.id, 'TO', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.DisPer}
                      onChange={(e) => handleCellChange(row.id, 'DisPer', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>

                  <td className="border p-2">
                    {row.NetSale || 0}
                  </td>
                </tr>

              ))
              }

            </tbody>
            {
              tableData.length != 0 ? <tfoot>
                <tr className="bg-gray-100 font-semibold">
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