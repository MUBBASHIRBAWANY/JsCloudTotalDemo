import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction } from '../../Api/CurdFunctions';
import AsyncSelect from 'react-select/async';
import Select from 'react-select'
import { AddSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';


const SalesInvoiceAdd = () => {
  const navigate = useNavigate();
  const [poClient, setPoClient] = useState(null);
  const [filterProduct, setFilterProduct] = useState([])
  const Client = useSelector((state) => state.Client.client)
  const Products = useSelector((state) => state.Product.product);
  const Vendor = useSelector((state) => state.Vendor.state)
  const location = useSelector((state) => state.Location.Location)
  const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
  const Store = useSelector((state) => state.Store.Store)
  const [selectedOrderBooker, SetselectedOrderBooker] = useState([])
  const [tableData, setTableData] = useState([]);
  const [selecetLoction, setSelecetLoction] = useState([])
  const [selecetStore, setSelecetStore] = useState([])
  const filteredAccount = Accounts.filter((item) => item.AccountCode.length > 5)
  const [DcClient, setDcClient] = useState([])
  const [SaleOrderDc, setSaleOrderDc] = useState([])
  const [lessAccount, setlessAccount] = useState("")
  const [AddAccount, setAddAccount] = useState("")
  const [AddAmount, setAddAmount] = useState(0)
  const [LessAmount, setLessAmount] = useState(0)
  const OrderDc = useSelector((state) => state.OrderDc.OrderDc)



  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  useEffect(() => {
    const today = new Date();
    const formatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
    reset({
      SaleInvoiceDate: formatted
    })
  }, [])





  const handleCellChange = (id, field, value) => {
    console.log(field)
    setTableData(tableData.map(row => {
      if (row.id === id) {

        const updatedRow = { ...row, [field]: value };
        updatedRow.product = updatedRow.product.value || updatedRow.product
        const checking = tableData.find((item) => item.id == id)

        const findProductGst = Products.find((item) => item._id == updatedRow.product)


        updatedRow.OrderBooker = selectedOrderBooker
        console.log(selectedOrderBooker)
        updatedRow.Amount = updatedRow.rate * row.Delivered
        updatedRow.netAmunt = (updatedRow.Amount) - (updatedRow.Discount || 0)
        console.log(updatedRow.Amount)
        return updatedRow;
      }
      return row;
    }));
  };

  const loadAccounts = async (inputValue) => {
    if (!inputValue) return [];

    const filtered = filteredAccount
      .filter((item) =>
        item.AccountName.toLowerCase().includes(inputValue.toLowerCase()) || item.AccountCode.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50);

    return filtered.map((item) => ({
      label: `${item.AccountCode} ${item.AccountName}`,
      value: item._id
    }));
  }
  const dispatch = useDispatch()
  const startingAccount = filteredAccount.slice(0, 50).map((item) => ({
    label: `${item.AccountCode} ${item.AccountName}`,
    value: item._id
  }));;

  const totalAmount = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);
  let totalNetAmount = totalAmount + Number(AddAmount) - Number(LessAmount)
  console.log(totalNetAmount)
  const onSubmit = async (data) => {
    data.Client = poClient.value
    data.SaleInvoiceData = tableData
    data.Store = selecetStore,
      data.Location = selecetLoction,
      data.OrderBooker = selectedOrderBooker;
    data.RemainingAmount = totalNetAmount
    data.TotalAmount = totalNetAmount
    data.DcNumber = SaleOrderDc.value
    data.AddAccount = AddAccount,
      data.LessAccount = lessAccount
    data.AddAmount = AddAmount,
      data.LessAmount = LessAmount
    console.log(data)
    try {
      const res = await createDataFunction('/SaleInvoice', data)
      dispatch(AddSalesInvoice(res))
      toast.success("Sales Invoice Add")
      setTimeout(() => {
        navigate(`/SalesInvoiceView/${res._id}`);
      }, 2000)
    }
    catch (err) {
      const error = err.response.data.errors
      console.log(error)
      if (error) {

        try {
          const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName} on your location`
          toast.error(notAvalible)
        }
        catch {
          console.log(err)
          const notAvalible = `Qty of ${Products.find((item) => item._id == error[0].product).ProductName} Avalibale Qty ${error[0].qty}  you need ${error[0].required} Boxes`
          toast.error(notAvalible)
        }
      }
    }
  }

  const getDataDc = (value) => {
    setSaleOrderDc([])
    setPoClient(value)
    const getClientDc = OrderDc.filter((item) => item.Customer === value.value && item.Status == "true")
    console.log(getClientDc)
    const data = getClientDc.map((val) => ({
      value: val.DcNumber,
      label: val.DcNumber,
    }))
    console.log(getClientDc)
    setDcClient(data)
    setSelecetLoction(location[0]._id)
    setSelecetStore(Store[0]._id)

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






  const setDrp = (value) => {
    setSaleOrderDc(value)
    const values = value.value;
    const Order = OrderDc.find((val) => val.DcNumber === values)
    console.log(Order)

    const totalTable = Order.DcData.map((item) => ({
      id: item.id,
      product: item.product,
      Delivered: item.Delivered,
      rate: item.rate,
      Amount: item.Delivered * item.rate,
      netAmunt: item.Delivered * item.rate,
      OrderBooker: item.OrderBooker
    }))
    console.log(Order.DcData[0].OrderBooker)
    setTableData(totalTable)
    SetselectedOrderBooker(Order.DcData[0].OrderBooker)

  }

  return (
    <div className="p-4  ">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800 mb-6">Create Sales Invoice</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Sale Date</label>
            <input
              type="date"
              {...register("SaleInvoiceDate", { required: true })}
              className="w-full px-3 py-3 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Client</label>
            <AsyncSelect
              onChange={(vals) => getDataDc(vals)}
              loadOptions={loadclients}
              defaultOptions={startingClient}
              value={poClient}
              className="basic-single text-sm"
              classNamePrefix="select"
              isSearchable
              isDisabled={tableData.length === 0 ? false : true}
              placeholder="Select customer..."
              styles={{
                control: (provided) => ({
                  ...provided,
                  minHeight: '40px',
                  fontSize: '14px'
                })
              }}
            />
          </div>

          <div>
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Invoice No</label>
            <input
              type="text"
              disabled
              defaultValue={''}
              {...register("salesInvoice")}
              className="w-full px-3 py-2 text-sm md:text-base border rounded-lg bg-gray-100"
            />
          </div>


          <div>
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Dc Number</label>
            <Select onChange={(v) => setDrp(v)} options={DcClient} isDisabled={tableData.length === 0 ? false : true} />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Remarks</label>
            <input
              type="text"
              {...register("Remarks")}
              className="w-full py-3 text-sm md:text-base border rounded-lg"
            />
          </div>
        </div>
        <div className="flex flex-cols-1 lg:flex-cols-2 gap-5 mb-6">
          {/* Add Account Card */}

        </div>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2">CTN</th>
                <th className="border p-2 hidden lg:table-cell">Rate</th>
                <th className="border p-2 hidden xl:table-cell">Total Amount</th>
                <th className="border p-2 hidden xl:table-cell">Discount</th>
                <th className="border p-2 hidden lg:table-cell">GST</th>
                <th className="border p-2">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    {Products.find((item) => item._id == row.product).ProductName}
                  </td>
                  <td className="border p-2">
                    {row.Delivered}
                  </td>

                  <td className="border p-2 hidden lg:table-cell">
                    <input
                      type="number"
                      value={row?.rate}
                      onChange={(e) => handleCellChange(row.id, 'rate', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 ">
                    {row.Amount || 0}
                  </td>
                  <td className="border p-2 hidden xl:table-cell">
                    <input
                      type="number"
                      value={row?.Discount}
                      onChange={(e) => handleCellChange(row.id, 'Discount', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 hidden lg:table-cell">{row.Gst || 0.00}</td>
                  <td className="border p-2 hidden xl:table-cell">
                    {row.netAmunt}
                  </td>
                </tr>
              ))}
            </tbody>
            {tableData.length !== 0 && (
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border p-2">Total</td>
                  <td className="border p-2"></td>
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
   <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mt-6">
  {/* Create Invoice Button */}
  <div>
    <button
      type="submit"
      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-300 focus:outline-none transition-all duration-200 text-sm md:text-base shadow-md hover:shadow-lg"
    >
      Create Sale Invoice
    </button>
  </div>

  {/* Summary Card */}
  <div className="w-full lg:w-auto">
    <div className="bg-gradient-to-br from-white to-rose-50 p-5 rounded-xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-rose-100">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-rose-500">Invoice Summary</span>
        </h3>
      </div>

      {/* Amount Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column - Main Amount */}
        <div className="space-y-4">
          {/* Net Amount */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Net Amount</span>
              <span className="text-xs text-gray-400">(Tax exclusive)</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {totalAmount}
            </span>
          </div>

          {/* Less Account Card */}
          <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Less Account</span>
              <span className="text-xs text-gray-500">Deduction</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AsyncSelect
                  menuPortalTarget={document.body}
                  onChange={(selectedOption) => setlessAccount(selectedOption?.value)}
                  loadOptions={loadAccounts}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: (provided) => ({
                      ...provided,
                      backgroundColor: '#fff',
                      borderColor: '#fecdd3',
                      minHeight: '36px',
                      fontSize: '14px',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#fda4af' }
                    })
                  }}
                  defaultOptions={startingAccount}
                  isClearable={true}
                  className="flex-1 text-sm"
                  classNamePrefix="select"
                  isSearchable
                  placeholder="Select account..."
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 min-w-[50px]">Amount</span>
                <input
                  type="number"
                  {...register("LessAmount")}
                  onChange={(e) => setLessAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 text-sm text-right bg-white border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-300 focus:border-rose-400 focus:outline-none transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Add Account */}
        <div className="space-y-4">
          {/* Add Account Card */}
          <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Add Account</span>
              <span className="text-xs text-gray-500">Additional</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AsyncSelect
                  menuPortalTarget={document.body}
                  onChange={(selectedOption) => setAddAccount(selectedOption?.value)}
                  loadOptions={loadAccounts}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: (provided) => ({
                      ...provided,
                      backgroundColor: '#fff',
                      borderColor: '#a7f3d0',
                      minHeight: '36px',
                      fontSize: '14px',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#6ee7b7' }
                    })
                  }}
                  defaultOptions={startingAccount}
                  isClearable={true}
                  className="flex-1 text-sm"
                  classNamePrefix="select"
                  isSearchable
                  placeholder="Select account..."
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 min-w-[50px]">Amount</span>
                <input
                  type="number"
                  {...register("AddAmount")}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 text-sm text-right bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Total Net Amount */}
          <div className="bg-gradient-to-r from-rose-50 to-white p-4 rounded-lg border border-rose-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-800">Total Net Amount</div>
                <div className="text-xs text-gray-500">Payable amount</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-rose-600">
                  {totalNetAmount}
                </div>
                <div className="text-xs text-gray-500 mt-1">incl. adjustments</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-rose-100">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            onClick={() => {
              setLessAmount("0");
              setAddAmount("0");
            }}
          >
            Clear Adjustments
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition"
            onClick={() => {/* Add preview logic */}}
          >
            Preview Invoice
          </button>
        </div>
      </div>
    </div>
  </div>
</div>


      </form>
    </div>
  )
}

export default SalesInvoiceAdd