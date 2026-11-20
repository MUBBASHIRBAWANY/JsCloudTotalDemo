import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getDataFundtion, updateDataFunction } from '../../Api/CurdFunctions';
import AsyncSelect from 'react-select/async';
import { EditSalesInvoiceReturn } from '../../Redux/Reducers/SalesInvoiceReturnReducer';

const SalesInvoiceReturnEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [poClient, setPoClient] = useState(null);
  const Client = useSelector((state) => state.Client.client);
  const Products = useSelector((state) => state.Product.product);
  const SalesInvoiceReturn = useSelector((state) => state.SalesInvoiceReturn.SalesInvoiceReturn);
  const findReturn = SalesInvoiceReturn.find((item) => item._id === id);
  const location = useSelector((state) => state.Location.Location);
  const Store = useSelector((state) => state.Store.Store);
  const [tableData, setTableData] = useState([]);
  const [salesInvoice, setSalesInvoice] = useState([])
  const [clientInvoice, setclientInvoice] = useState([])
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const [invoicedata, setInvoiceData] = useState('')
  const [InvoiceRef, setInvoiceRef] = useState([])

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm();


  console.log(findReturn)
  useEffect(() => {
    setInvoiceRef({
      value: findReturn.InvoiceRef,
      label: findReturn.InvoiceRef
    })
    if (findReturn) {
      // Set form values
      reset({
        SalesInvoiceReturnDate: findReturn.SalesInvoiceReturnDate,
        purchase: findReturn.SalesReturnNumber,
        Remarks : findReturn.Remarks


      })
      setValue("ReturnDate", findReturn.SalesReturnData);
      setValue("SalesFlowRef", findReturn.SalesFlowRef || "");

      // Set client
      const client = Client.find((item) => item._id === findReturn.Client);
      if (client) {
        setPoClient({
          label: `${client.CutomerName} ${client.code}`,
          value: client._id
        });
        GetSaleinvoice({
          label: `${client.CutomerName} ${client.code}`,
          value: client._id
        })
        setInvoiceData(findReturn)

      }

      // Set table data
      if (findReturn.SalesReturnData) {
        setTableData(findReturn.SalesReturnData);
      }
    }
  }, [findReturn, Client, setValue]);



  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };

  const findLocation = location.find((item) => item._id === findReturn?.Location);
  const disableLocation = findLocation ? {
    label: findLocation.LocationName,
    value: findLocation._id
  } : null;

  const findStore = Store.find((item) => item._id === findReturn?.Store);
  const disableStore = findStore ? {
    label: findStore.StoreName,
    value: findStore._id
  } : null;
  const dispatch = useDispatch()
  const onSubmit = async (data) => {
    if (!poClient) {
      return toast.error("Please select a client");
    }
    data.InvoiceRef = InvoiceRef.value
    data.Location = location[0]._id
    data.Store = selectedStore?.value
    data.SalesReturnData = tableData
    console.log(data)
    try {
      const res = await updateDataFunction(`/SalesInvoiceReturn/UpdateSalesInvoiceReturn/${id}`, data);
      toast.success("Data Edit")
      dispatch(EditSalesInvoiceReturn(res))
      setTimeout(() => {
        navigate(`/SalesReturnInvoiceView/${res._id}`)
      }, 2000);
    } catch (err) {
      console.error(err);
      const error = err.response?.data?.errors;
      if (error) {
        try {
          const notAvailable = `This product not available: ${Products.find((item) => item._id === error[0])?.ProductName}`;
          toast.error(notAvailable);
        } catch {
          const notAvailable = `Qty of ${Products.find((item) => item._id === error[0][0].product)?.ProductName} Available Qty ${error[0][0].qty} you need ${error[0][0].Req} Boxes`;
          toast.error(notAvailable);
        }
      } else {
        toast.error("Failed to update return");
      }
    }
  };
  const handleCellChange = (id, field, feildvalue) => {
    let value = feildvalue?.value || feildvalue;

    setTableData(tableData.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };

        if (field === "return") {
          if (
            Number(updatedRow.return) > Number(updatedRow.carton) ||
            updatedRow.netAmunt > invoicedata.RemainingAmount
          ) {
            toast.error("Return Qty should be less than Delivered Qty");
            return row;
          }
        }

        if (field == "Rate") {
          const lineAmount = Number(value) * Number(updatedRow.return || 0);
          console.log(lineAmount)
          if (lineAmount > invoicedata.RemainingAmount) {
            toast.error("Amount should be less than Remaining Amount");
            return row;
          }
        }
        updatedRow.Amount = (Number(updatedRow.Rate) * Number(updatedRow.return || 0))
        updatedRow.netAmunt =
          (Number(updatedRow.Rate) * Number(updatedRow.return || 0)) -
          (Number(updatedRow.discount || 0));

        return updatedRow;
      }
      return row;
    }));
  };

  const TotalnetAmunt = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);
  const totalDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
  const startingClient = Client.slice(0, 50).map((item) => ({
    label: `${item.CutomerName} ${item.code}`,
    value: item._id
  }));;


  const loadPurchseInvoiceOptions = async (inputValue) => {

    if (!inputValue) return [];
    console.log(salesInvoice)
    const filtered = salesInvoice
      .filter((item) =>
        item.SalesInvoice.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50); // limit to first 50 results

    console.log(filtered)
    return filtered.map((item) => ({
      value: item.SalesInvoice,
      label: item.SalesInvoice

    })).slice(0, 50);
  };
  const GetSaleinvoice = async (value) => {
    console.log(value)
    setclientInvoice('')
    setPoClient(value)
    const getInvoice = await getDataFundtion(`SaleInvoice/invoiceClient/${value.value}`)
    console.log(getInvoice.data)
    setSalesInvoice(getInvoice.data)

    const data = getInvoice.data.map((item) => ({
      value: item.SalesInvoice,
      label: item.SalesInvoice
    })).slice(0, 50)
    console.log(data)
    setclientInvoice(data)
    console.log(clientInvoice)

  }
  const defultStore = Store.find((item) => item._id == loginVendor.Store[0])
  const selectedStore = {
    label: defultStore?.StoreName,
    value: defultStore?._id
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

  if (!findReturn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-xl">Loading return data...</span>
      </div>
    );
  }
  const setData = (val) => {
    setInvoiceRef(val)
    const data = salesInvoice.find((item) => item.SalesInvoice == val.value)
    setInvoiceData(data)
    setTableData(data.SalesData)
  }

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800 mb-6">Edit Sales Return</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Return Date</label>
            <input
              type="date"
              {...register("SalesInvoiceReturnDate", { required: true })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Client</label>
            <AsyncSelect
              onChange={(vals) => GetSaleinvoice(vals)}
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
            <label className="block text-gray-700 font-semibold mb-2">Select Invoice</label>
            <AsyncSelect
              defaultOptions={clientInvoice}
              loadOptions={loadPurchseInvoiceOptions}
              value={InvoiceRef}
              isDisabled={tableData.length != 0 ? true : false}
              className="basic-single"
              classNamePrefix="select"
              isSearchable
              placeholder="Select Vendor..."
              onChange={(val) => {
                setData(val)
              }}
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Purchace Return No</label>
            <input
              type="text"
              disabled
              defaultValue={''}
              {...register("purchase")}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Location</label>
            <input
              type="text"
              disabled={true}
              {...register("Location")}
              value={location[0].LocationName}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Store</label>
            <input
              type="text"
              disabled={true}
              {...register("Store")}
              value={selectedStore?.label}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Remarks</label>
            <input
              type="text"
              {...register("Remarks")}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-36">Product</th>

                <th className="border p-2">CTN</th>
                <th className="border p-2">Return</th>
                <th className="border p-2">Rate </th>
                <th className="border p-2"> Discount</th>
                <th className="border p-2">Gst</th>
                <th className="border p-2">Net Amount </th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    {Products.find((item) => item._id == row.product)?.ProductName}
                  </td>
                  <td className="border p-2">
                    {row.carton}
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.return}
                      onChange={(e) => handleCellChange(row.id, 'return', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.Rate}
                      onChange={(e) => handleCellChange(row.id, 'Rate', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.discount}
                      onChange={(e) => handleCellChange(row.id, 'discount', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    {row.Gst}
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
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2">{TotalnetAmunt}</td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot> : null
            }
          </table>
        </div>

        <div className="flex  justify-between">

          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create Purchase Return
          </button>
        </div>
      </form>
    </div>
  )
}

export default SalesInvoiceReturnEdit;