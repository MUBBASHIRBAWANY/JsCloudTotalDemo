import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import AppSelect from '../../Global/AppSelect.jsx'
import { update } from 'list';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { fetchOrderDc } from '../../../Redux/Reducers/OrderDCReducer';


const OrderDCAdd = () => {
  const navigate = useNavigate();
  const [poClient, setPoClient] = useState(null);
  const Client = useSelector((state) => state.Client.client)
  const Products = useSelector((state) => state.Product.product);
  const location = useSelector((state) => state.Location.Location)
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const Store = useSelector((state) => state.Store.Store)

  const City = useSelector((state) => state.City.City)

  const [SaleOrderDrp, SetSaleOrderDrp] = useState([])
  const [tableData, setTableData] = useState([]);
  const [OderBooker, setOderBooker] = useState([])
  const [StoreDrp, setStoreDrp] = useState([])
  const [salesStore, setSalesStore] = useState([])
  const [selectedDistributor, setSelectedDistributor] = useState([])
  const [DrpDistriButor, setDrpDistriButor] = useState([])
  const [disabled, setdisabled] = useState(false)
  const [SelectedTransporter, setSelectedTransporter] = useState('')
  const Order = useSelector((state) => state.DistributorOrder.DistributorOrder)
  const Transort = useSelector((state) => state.Transport.Transport)
  const OrderDc = useSelector((state) => state.OrderDc.OrderDc)
  const TotalProduct = useSelector((state) => state.TotalProducts.TotalProducts)
  const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers)

  const AllTransporter = Transort.map((item) => ({
    value: item._id,
    label: item.TransporterName,
  }))


  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  useEffect(() => {
    const today = new Date();
    const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const StoreDrp = Store.map((item) => ({
      value: item._id,
      label: item.StoreName
    }))
    setStoreDrp(StoreDrp)
    const EditDistributorDrp = EditDistributor.map((item) => {
      const city = City.find(city => city._id == item.City)
      return {
        value: item._id,
        label: `${item.DistrbutorName} ${item.DistrbutorSystemCode} (${city?.CityName})`,
        Transporter: item.Transporter
      }
    })

    setDrpDistriButor(EditDistributorDrp)
    reset({
      DCDate: formatted
    })
  }, [])





  const getSaleOrder = (value) => {
    setSelectedDistributor(value)
    setSelectedTransporter(value.Transporter)
    const data = Order.filter((item) => item.Distrbutor == value.value && (item.PostStatus == "Process" || item.PostStatus == "Partially Delivered"))
      ?.map((item) => ({
        value: item.OrderCode,
        label: item.OrderCode,
        data: item.OrderData,
        Store: item.Store,
        Status: item.PostStatus,
        id: Date.now() + Math.random()
      }))

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
    const output = value.data
      .filter((val) => val.totalBox !== val.Deliver)
      .map((item) => {
        const product = Products.find((pr) => pr._id === item.product);
        console.log(product)
        console.log(item)
        return {
          ...item,
          Order: value.label,
          Store: value.Store,
          DeliveredBox: Number(item.totalBox || 0) - Number(item.Deliver || 0),
          ReamingBox: Number(item.totalBox || 0) - Number(item.Deliver || 0),
          OriginalRemainingBox: Number(item.totalBox || 0) - Number(item.Deliver || 0),
          carton: item.box !== 0 ? 0 : (Number(item.totalBox || 0) - Number(item.Deliver || 0)) / (product?.BoxinCarton || 1),
        };
      })
      .filter((item) => item.ReamingBox > 0);
    ;


    setTableData(tableData.concat(output))



  }

  const handleCellChange = (id, field, value) => {
    console.log(id, field, value)
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
            if (findProduct) {
              updatedRow.unit = 0; // Or actual value if needed
            }
          }


          // Reset fields if product is empty
          if (!updatedRow.product) {
            updatedRow.Amount = 0;
            updatedRow.carton = 0;
          }


         if (field === "carton" || field === "box") {
  const findProduct = Products.find(
    (item) => item._id === updatedRow.product
  );

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
      updatedRow.unit =
        Allunit * carton + (box * PcsinBox);
    }

    const totalBox = updatedRow.unit / PcsinBox;

    updatedRow.DeliveredBox = totalBox;

    // IMPORTANT FIX
    
    updatedRow.ReamingBox =
      updatedRow.OriginalRemainingBox - totalBox;
  }
}




          // Only update Amount when carton or rate changes

          return updatedRow;
        }
        return row;
      })
    );
  };
  const dispatch = useDispatch()
  //console.log(TotalProduct, "TotalProduct")
  const TotalAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.Amount) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
  const totalReamingBox = tableData.reduce((sum, row) => sum + (parseInt(row.ReamingBox) || 0), 0);
  const totalBOX = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
  const totalCostAmount = tableData.map((item) => ({
    amount: (TotalProduct?.find((val) => val?.ProductName == item?.product && val?.Location == loginVendor?.Location[0] && val?.Store == loginVendor?.Store[0])?.AvgRate * item?.Delivered)?.toFixed(4)
  })).reduce((sum, row) => sum + (parseInt(row.amount) || 0), 0);
  //console.log(Store[0], "Loc")
  const onSubmit = async (data) => {
    setdisabled(true)
    if (tableData.length == 0) {
      return toast.error("Table Data Length not be Zero")
    }

    const checke = tableData.filter(obj => !obj.hasOwnProperty("DeliveredBox"))
    //console.log(checke)
    if (checke.length !== 0) {
      return toast.error("Please enter Delivered value ")
    }
    data.Distrbutor = selectedDistributor.value
    data.DCData = tableData
    data.PostStatus = "False"
    data.Location = location[0]?._id
    data.Store = salesStore.value
    data.Status = "false"
    data.Transporter = SelectedTransporter
    try {

console.log(data)
      const res = await createDataFunction('/DcOrder', data)
      // const orders = tableData.map((t) => t.Order);
      // for (const item of orders) {
      //   await updateDataFunction(`/DistributorSaleOrder/UpdateOrderStatusByNumber/${item}`, {
      //     status: "Deliverd",
      //   });
      // }
      toast.success("delivery challan Add")
      const order = [
        ...OrderDc,
        res,
      ]
      dispatch(fetchOrderDc(order))
      setTimeout(() => {

        navigate(`/OrderDCView/${res._id}`)
      }, 2000)
    }
    catch (err) {
      //console.log(err)
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

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">Create Delivery Challan</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-bg-surface p-4 md:p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="pd-label">Delivery Date</label>
            <input
              type="date"
              disabled
              {...register("DCDate", { required: true })}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Distributor</label>
            <AppSelect options={DrpDistriButor} onChange={(op) => getSaleOrder(op)} isDisabled={tableData.length !== 0 ? true : false} />

          </div>
          <div>
            <label className="pd-label">Transporter</label>
            <AppSelect options={AllTransporter} value={AllTransporter.filter((item) => item.value === SelectedTransporter)} onChange={(e) => setSelectedTransporter(e.value)} isDisabled={tableData.length !== 0 ? true : false} />

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
            <label className="pd-label">Store</label>
            <AppSelect onChange={(v) => setSalesStore(v)} options={StoreDrp} isDisabled={tableData.length !== 0 ? true : false} />
          </div>
          <div>
            <label className="pd-label">Select Order</label>
            <AppSelect onChange={(v) => getTableData(v)} options={SaleOrderDrp} />
          </div>

        </div>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="border px-36">Product</th>
                <th className="border p-2">Remaining Box</th>
                <th className="border p-2">Carton</th>
                <th className="border p-2">Box</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    {Products.find((item) => item._id == row.product).ProductName}
                  </td>
                  <td
                    className="border p-2"
                  >
                    {row.ReamingBox}
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
                  <td className="border p-2">{totalReamingBox}</td>
                  <td className="border p-2">{totalCarton}</td>
                  <td className="border p-2">{totalBOX}</td>
                  <td className="border p-2"></td>


                </tr>
              </tfoot> : null
            }
          </table>
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-between">

          <button
            type="submit"
            disabled={disabled}
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