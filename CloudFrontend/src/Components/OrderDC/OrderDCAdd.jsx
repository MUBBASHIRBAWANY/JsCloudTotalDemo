import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import AppAsyncSelect from '../Global/AppAsyncSelect.jsx'
import AppSelect from '../Global/AppSelect.jsx'
import { generateNextCode, generateNextCodeForOrder } from '../Global/GenrateCode';
import { update } from 'list';
import { AddSaleOrderReducer, fetchOrderDc } from '../../Redux/Reducers/OrderDCReducer';



const OrderDCAdd = () => {
  const navigate = useNavigate();
  const [poClient, setPoClient] = useState(null);
  const [customerPriceList, setCustomerPriceList] = useState([]);
  const Client = useSelector((state) => state.Client.client)
  const Products = useSelector((state) => state.Product.product);
  const PriceList = useSelector((state) => state.PricelistReducer.PricelistReducer)
  const location = useSelector((state) => state.Location.Location)
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const Store = useSelector((state) => state.Store.Store)
  const [SaleOrderDrp, SetSaleOrderDrp] = useState([])
  const [tableData, setTableData] = useState([]);
  const [OderBooker, setOderBooker] = useState([])
  const [selectedLocation, setSelectedLocation] = useState([])
  const [salesStore, setSalesStore] = useState([])
  const [storeDrp, setStoreDrp] = useState([])
  const [selectedStore, setSelectedStore] = useState([])
  const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
  const Order = useSelector((state) => state.SaleOrder.SaleOrder)
  const Location = location.filter(item => loginVendor.Location.includes(item._id))
  const TotalProduct = useSelector((state) => state.TotalProducts.TotalProducts)
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  useEffect(() => {
    const today = new Date();
    const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
    reset({
      DcDate: formatted
    })
  }, [])



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

  const getSaleOrder = (value) => {
    setPoClient(value)
    // Get customer's PriceList
    const customerData = Client.find((item) => item._id == value.value)
    if (customerData && customerData.PriceList) {
      const pl = PriceList.find((item) => item._id == customerData.PriceList)
      if (pl && pl.PriceListData) {
        setCustomerPriceList(pl.PriceListData)
      } else {
        setCustomerPriceList([])
      }
    } else {
      setCustomerPriceList([])
    }
    //console.log(Order)
    const data = Order.filter((item) => item.Customer == value.value)
      ?.map((item) => ({
        value: item.SaleOrderNumber,
        label: item.SaleOrderNumber,
        data: item.SaleOrderData,
        OrderBooker: item.OrderBookerId,
        Location: item.Location,
        Store: item.Store,
        Status: item.Status,
        id: Date.now() + Math.random()
      }))
    //console.log(data)
    SetSaleOrderDrp(data)
  }
  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };


  const getTableData = (value) => {
    const extractdata = SaleOrderDrp.filter((item) => item.value !== value.value)
    SetSaleOrderDrp(extractdata)
    const findDuplicate = tableData.find((item) => item.Order == value.value)
    //console.log(findDuplicate)
    if (findDuplicate) {
      return toast.error(`${value.value} saleOrder al ready in table`)
    }
    const output = value.data.map(item => ({
      ...item,
      OrderBooker: value.OrderBooker,
      Order: value.label,
      Location: value.Location,
      Store: value.Store,
    }));

    if (OderBooker.length === 0 || OderBooker == output[0].OrderBooker) {
      setTableData(tableData.concat(output))
      setOderBooker(output[0].OrderBooker)
    }
    else {
      toast.error("this is not blong to same order booker")
    }

  }

  const handleCellChange = (id, field, value) => {
    console.log(field)
    setTableData((prevData) =>
      prevData.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          updatedRow.product = updatedRow.product.value || updatedRow.product;

          const checking = prevData.find((item) => item.id == id);

          if (field === "product") {
            if (checking.product !== value) {
              updatedRow.rate = 0;
              updatedRow.carton = 0;
              updatedRow.Delivered = 0;
            }
            const findProduct = Products.find((item) => item._id === updatedRow.product);
            if (findProduct) {
              updatedRow.unit = 0; // Or actual value if needed
            }
          }

          // Reset fields if product is empty
          if (!updatedRow.product) {
            updatedRow.Amount = 0;
            updatedRow.carton = 0;
          }

          // If Delivered changed, update Remaingcarton
          const Remainng = updatedRow.Remaingcarton
          if (field == "Delivered") {
            updatedRow.Delivered = value
            updatedRow.Remain = Number(Remainng || 0) - Number(updatedRow.Delivered || 0)
            console.log(updatedRow.Remain)
          }

          


          // Only update Amount when carton or rate changes

          return updatedRow;
        }
        return row;
      })
    );
  };
  const dispatch = useDispatch()
  //console.log(TotalProduct ,"TotalProduct")
  const TotalAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.Amount) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
  const totalCostAmount = tableData.map((item) => ({
    amount: (TotalProduct?.find((val) => val?.ProductName == item?.product && val?.Location == loginVendor?.Location[0] && val?.Store == loginVendor?.Store[0])?.AvgRate * item?.Delivered)?.toFixed(4)
  })).reduce((sum, row) => sum + (parseInt(row.amount) || 0), 0);
  //console.log(Store[0] , "Loc")
  const onSubmit = async (data) => {
    if (tableData.length == 0) {
      return toast.error("Table Data Length not be Zero")
    }
    const checke = tableData.filter(obj => !obj.hasOwnProperty("Delivered"))
    //console.log(checke)
    if (checke.length !== 0) {
      return toast.error("Please enter Delivered value ")
    }

    // PriceList check: verify all products exist in customer's PriceList
    if (customerPriceList.length > 0) {
      const priceListProducts = customerPriceList.map(item => item.product)
      const missingProducts = tableData.filter(item => !priceListProducts.includes(item.product))
      if (missingProducts.length > 0) {
        const missingNames = missingProducts.map(p => {
          const found = Products.find(prod => prod._id === p.product)
          return found ? found.ProductName : p.product
        }).join(', ')
        return toast.error(`Following products are not in customer's PriceList: ${missingNames}`)
      }
    }

    data.Customer = poClient.value
    data.DcData = tableData
    data.Location = location[0]?._id
    data.Store = Store[0]?._id
    data.Status = "false"
    //console.log(data)

    try {
      const lastCode = await getDataFundtion("/DcOrder/lastcode")
      //console.log(lastCode.data)
      lastCode.data.length == 0 ? data.DcNumber = "000001" : data.DcNumber = generateNextCodeForOrder(lastCode.data[0].DcNumber)

      const res = await createDataFunction('/DcOrder', data)
      //console.log(res)
      dispatch(AddSaleOrderReducer(res))
      toast.success("delivery challan Add")

      setTimeout(() => {

        navigate(`/OrderDCView/${res._id}`)
      }, 2000)
    }
    catch (err) {
      //console.log(err)
      const errorMsg = err.response?.data?.message
      if (errorMsg) {
        toast.error(errorMsg)
        return
      }
      toast.error("some went gone wrong")
      const error = err.response.data.errors
      if (error) {
        try {
          const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName} on your location`
          toast.error(notAvalible)
        }
        catch {
          //console.log(err)
          const notAvalible = `Qty of ${Products.find((item) => item._id == error[0].product).ProductName} Available Qty ${error[0].qty}  you need ${error[0].required} Boxes`
          toast.error(notAvalible)
        }
      }
    }
  }


  const loadclients = async (inputValue) => {
    if (!inputValue) return [];

    const filtered = Client
      .filter((item) =>
        item.CutomerName.toLowerCase().includes(inputValue.toLowerCase()) || item.code.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50);

    return filtered.map((item) => ({
      label: `${item.CutomerName} ${item.code}`,
      value: item._id
    }));
  }

  const startingClient = Client.slice(0, 50).map((item) => ({
    label: `${item.CutomerName} ${item.code}`,
    value: item._id
  }));;
  //console.log(OrderBooker)

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:pd-page-title text-center mb-6">Create Delivery Order</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="pd-label">Sale Date</label>
            <input
              type="date"
              {...register("DcDate", { required: true })}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Client</label>
            <AppAsyncSelect
              onChange={(vals) => getSaleOrder(vals)}
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
            <label className="pd-label">Dc No</label>
            <input
              type="text"
              disabled
              defaultValue={''}
              {...register("salesInvoice")}
              className="pd-input-readonly text-sm md:text-base"
            />
          </div>
          <div>
            <label className="pd-label">Select Order</label>
            <AppSelect onChange={(v) => getTableData(v)} options={SaleOrderDrp} />
          </div>

        </div>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr>
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2">CTN</th>
                <th className="border p-2">Delivered</th>
                <th className="border p-2">Remaining</th>
                <th className="border p-2 hidden md:table-cell">Order Booker</th>
                <th className="border p-2 hidden md:table-cell">Location</th>
                <th className="border p-2 hidden md:table-cell">Store</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    {Products.find((item) => item._id === row.product).ProductName}
                  </td>
                  <td className="border p-2">
                    {row.carton}
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.delivered}
                      onChange={(e) => handleCellChange(row.id, 'Delivered', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    {row.Remain || row.Remaingcarton - (row.Delivered || 0)}
                  </td>
                  <td className="border p-2 hidden md:table-cell">
                    {OrderBooker.find((item) => item._id === row.OrderBooker).OrderBookerName}
                  </td>
                  <td className="border p-2 hidden md:table-cell">
                    {Location.find((item) => item._id === row.Location)?.LocationName || location[0]?.LocationName}
                  </td>
                  <td className="border p-2 hidden md:table-cell">
                    {Store.find((item) => item._id === row.Store)?.StoreName || Store[0]?.StoreName}
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
            {tableData.length !== 0 && (
              <tfoot>
                <tr className="pd-table-footer">
                  <td className="border p-2">Total</td>
                  <td className="border p-2">{totalCarton}</td>
                  <td className="border p-2 hidden lg:table-cell">{ }</td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-between">

          <button
            type="submit"
            className="pd-btn-save text-sm md:text-base"
          >
            Create Delivery Challan
          </button>
        </div>
      </form>
    </div>
  )
}

export default OrderDCAdd