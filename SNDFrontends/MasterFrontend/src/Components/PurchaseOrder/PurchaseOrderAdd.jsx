import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import AsyncSelect from 'react-select/async';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchPurchaseInvoice, AddPurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';


const PurchaseOrderAdd = () => {
  const navigate = useNavigate();
  const [poVendor, setPoVendor] = useState(null);
  const Vendor = useSelector((state) => state.Vendor.state)
  const Products = useSelector((state) => state.Product.product);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const Store = useSelector((state) => state.Store.Store)
  const location = useSelector((state) => state.Location.Location)
  const [filterProduct, setFilterProduct] = useState([])
  const [VendorDrp, setVendorDrp] = useState([])
  const [selectedDistributor, setSelectedDistributor] = useState([])
  const [DrpDistriButor, setDrpDistriButor] = useState([])
  const [storeDrp, setStoreDrp] = useState()
  const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers)
  const [selectedLocation, setSelectedLocation] = useState(location[0]?._id)

  const notify = () => toast("Product Duplicate In Purchase Order");

  const [tableData, setTableData] = useState([]);
  const [lginerStore, setlginerStore] = useState([])
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
    const EditDistributorDrp = EditDistributor.map((item) => ({
      value: item._id,
      label: `${item.DistrbutorName} ${item.DistrbutorSystemCode}`,
    }))

    setDrpDistriButor(EditDistributorDrp)
    const arrProduct = Products.length == 0 ? await getDataFundtion('/product') : Products
    Products.length == 0 ? dispatch(fetchproduct(arrProduct?.data)) : null




  }




  useEffect(() => {
    getData()
  }, [])
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
    console.log(Products)
    const filtered = Products
      .filter((item) =>
        item.ProductName.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50); // limit to first 50 results
    console.log(filterProduct)
    return filtered.map((item) => ({
      label: `${item.ProductName} ${item.mastercode}`,
      value: item._id

    }));
  };

  const StartingProduct = Products.slice(0, 50).map((item) => ({
    label: `${item.ProductName}`,
    value: item._id
  }));;
  const handleCellChange = (id, field, value) => {
    console.log(field)
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
            console.log(Number(updatedRow.Rate))
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
            console.log(totalBox)
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
    data.Distrbutor = selectedDistributor.value
    data.TotalAmount = totalNetAmount,
      data.OrderData = tableData
    data.PostStatus = "Accept"
    console.log(data)
    try {
      await createDataFunction('/PurchaseOrder', data)
      toast.success("Data Add")
      setTimeout(() => {
        //navigate(`/PurchaseInvoiceView/${res._id}`)
        navigate(`/PurchaseOrderList`)
      }, 2000)
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
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Purchase Invoice </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Purchase Date</label>
            <input
              type="date"
              disabled
              {...register("OrderDate", { required: true })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>

            <label className="block text-gray-700 font-semibold mb-2">Distributor</label>
            <Select options={DrpDistriButor} onChange={(op) => setSelectedDistributor(op)} />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Purchace Order No</label>
            <input
              type="text"
              disabled
              defaultValue={''}
              {...register("purchase")}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
            />
          </div>

        </div>

        {/* Excel-like Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
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
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    <AsyncSelect
                      menuPortalTarget={document.body}
                      styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                      cacheOptions
                      onChange={(selectedOption) =>
                        handleCellChange(row.id, 'product', selectedOption ? selectedOption.value : '')
                      }
                      loadOptions={loadInvoiceOptions}
                      className="basic-single"
                      classNamePrefix="select"
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
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
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
                <tr className="bg-gray-100 font-semibold">
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

        <div className="flex  justify-between">
          <button
            type="button"
            onClick={addNewRow}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Add Row
          </button>

          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create Purchase Order
          </button>
        </div>
      </form>
    </div>
  )
}

export default PurchaseOrderAdd