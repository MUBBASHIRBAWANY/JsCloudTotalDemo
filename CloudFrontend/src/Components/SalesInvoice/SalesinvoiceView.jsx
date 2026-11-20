import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { data, useNavigate, useParams } from 'react-router-dom';
import AppSelect from '../Global/AppSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../Api/CRUDFunctions';
import { fetchSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';

const SalesinvoiceView = () => {
  const { id } = useParams();
  const Client = useSelector((state) => state.Client.client);
  const Products = useSelector((state) => state.Product.product);
  const SalesInvoice = useSelector((state) => state.SalesInvoice.SalesInvoice);
  const findInvoice = SalesInvoice.find((item) => item._id === id);
  const location = useSelector((state) => state.Location.Location)
  const Store = useSelector((state) => state.Store.Store)
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const AllProduct = useSelector((state) => state.TotalProducts.TotalProducts)
  const [tableData, setTableData] = useState([]);
const [findInvoice1, setFindInvoice] = useState(null);
const [loading, setLoading] = useState(true);
const dispatch = useDispatch();
  // useEffect(() => {
  //   if (findInvoice) {
  //     setTableData(findInvoice.SalesData || []);
  //   }
  // }, [findInvoice]);

useEffect(() => {
  const init = async () => {
    try {
      let invoiceData = SalesInvoice;

      // 🔥 agar Redux empty hai to API call
      if (invoiceData.length === 0) {
        const res = await getDataFundtion("/saleInvoice");
        invoiceData = res.data;
        dispatch(fetchSalesInvoice(invoiceData));
      }

      const found = invoiceData.find((item) => item._id === id);

      // 🔥 agar phir bhi na mile → single fetch
      if (!found) {
        const res = await getDataFundtion(`/saleInvoice/${id}`);
        setFindInvoice(res.data);
      } else {
        setFindInvoice(found);
      }

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  init();
}, [id]);

  const findClient = Client.find((item) => item._id === findInvoice?.Client);
  const defultClient = {
    label: findClient?.CutomerName,
    value: findClient?._id,
  };
  const navigate = useNavigate()
  const postInvoice = async () => {
    try {
      //console.log("first")
      const data = {
        SalesInvoice: findInvoice.SalesInvoice,
        id: findInvoice._id,
        status: true,
        Location: findInvoice.Location,
        Store: findInvoice.Store,
        data: findInvoice.SalesData,
        date: findInvoice.SalesInvoiceDate
      }

      const rate = data.data.map((item) => ({
        product: item.product,
        value: (AllProduct.find((p) => p.ProductName === item.product && p.Store === findInvoice.Store && p.Location === findInvoice.Location).AvgRate * item.box).toFixed(4)
      }))

      const CostVoucherData = {
        VoucherType: "Co",
        VoucherNumber: `Co${data.SalesInvoice}`,
        VoucherDate: data.date,
        status: "Post",
        VoucharData: [
          {
            Account: Admin.finishedGoods,
            Credit: (Number(parseFloat(rate.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0)).toFixed(4))),
            store: findInvoice.Store
          },
          {
            Account: Admin.COSTOFSALES,
            Debit: (Number(parseFloat(rate.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0)).toFixed(4))),
            store: findInvoice.Store
          },
        ]
      }

      const VoucharData = [

        {
          Account: Admin.Client,
          Debit: (Number(parseFloat(findInvoice.RemainingAmount).toFixed(4))),
          store: findInvoice.Store,
        },
        {
          Account: Admin.SaleDiscount,
          Debit: data.data.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0) - data.data.reduce((sum, row) => sum + (parseFloat(row.diBspass) || 0), 0)
            + data.data.reduce((sum, row) => sum + (parseFloat(row.TTS) || 0), 0),
          store: findInvoice.Store,
        },

        {
          Account: Admin.DitributerDiscount,
          Debit: data.data.reduce((sum, row) => sum + (parseFloat(row.diBspass) || 0), 0),
          store: findInvoice.Store,
        },
        {
          Account: Admin.salesRevenue,
          Credit: data.data.reduce((sum, row) => sum + (parseFloat(row.TotalValueExclGst) || 0), 0),
          store: findInvoice.Store,
        },
        {
          Account: Admin.Gst,
          Credit: data.data.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0),
          store: findInvoice.Store,
        },
        {
          Account: Admin.AdvanceTax,
          Credit: parseFloat(data.data.reduce((sum, row) => sum + (parseFloat(row.AdvanceTax) || 0), 0).toFixed(4)),
          store: findInvoice.Store,
        }

      ].filter(
        item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
      )
      //console.log(CostVoucherData , VoucharData)
      const AccountsData = {
        VoucherType: "SL",
        VoucherNumber: `SL${data.SalesInvoice}`,
        VoucherDate: data.date,
        status: "Post",
        VoucharData : VoucharData

      }
      const res = await updateDataFunction(`SaleInvoice/ChangeStatus/${id}`, data)
      const CostVoucher = await createDataFunction("/Voucher/createSystemVoucher", CostVoucherData)
      const Voucher = await createDataFunction("/Voucher/createSystemVoucher", AccountsData)
      toast.success("Status Updated")
      setTimeout(() => {
        navigate("/SalesInvoice")
      }, 2000)
    } catch (err) {
      const error = err?.response?.data?.errors
      if (error) {
        //console.log(error)
        try {
          const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName}`
          toast.error(notAvalible)
        }
        catch {
          //console.log(error)
          const notAvalible = `Qty of ${Products.find((item) => item._id == error[0][0].product).ProductName} Available Qty ${error[0][0].qty}  you need ${error[0][0].Req} Boxes`
          toast.error(notAvalible)
        }
      }
    }
  }
  const UnpostInvoice = async () => {
    try {
      //console.log("first")
      const data = {
        SalesInvoice: findInvoice.SalesInvoice,
        id: findInvoice._id,
        status: false,
        Location: findInvoice.Location,
        Store: findInvoice.Store,
        data: findInvoice.SalesData
      }
      const res = await updateDataFunction(`SaleInvoice/ChangeStatus/${id}`, data)
      toast.success("Status Updated")
      setTimeout(() => {
        navigate("/SalesInvoice")
      }, 2000)
    } catch (err) {
      const error = err?.response?.data?.errors
      if (error) {
        //console.log(error)
        try {
          const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName}`
          toast.error(notAvalible)
        }
        catch {
          //console.log(error)
          const notAvalible = `Qty of ${Products.find((item) => item._id == error[0][0].product).ProductName} Available Qty ${error[0][0].qty}  you need ${error[0][0].Req} Boxes`
          toast.error(notAvalible)
        }
      }
    }
  }
  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:pd-page-title text-center mb-6">View Sales Invoice</h1>
      {findInvoice?.PostStatus === false ? (
        <div className="flex justify-end mb-4 space-x-4">
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-300"
            onClick={postInvoice}
          >
            Post
          </button>
        </div>
      ) : (
        <div className="flex justify-end mb-4 space-x-4">
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-300"
            onClick={UnpostInvoice}
          >
            Unpost
          </button>
        </div>
      )}

      <div className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="pd-label">Sale Date</label>
            <div className="p-2 pd-bg-muted rounded">{findInvoice?.SalesInvoiceDate || '-'}</div>
          </div>

          <div>
            <label className="pd-label">Client</label>
            <div className="p-2 pd-bg-muted rounded">{defultClient?.label || '-'}</div>
          </div>

          <div>
            <label className="pd-label">Invoice No</label>
            <div className="p-2 pd-bg-muted rounded">{findInvoice?.SalesInvoice || '-'}</div>
          </div>

          <div>
            <label className="pd-label">Sales Flow Ref</label>
            <div className="p-2 pd-bg-muted rounded">{findInvoice?.SalesFlowRef || '-'}</div>
          </div>
          <div>
            <label className="pd-label">Location</label>
            <div className="p-2 pd-bg-muted rounded">{location.find((item) => item._id == findInvoice?.Location)?.LocationName || '-'}</div>
          </div>
          <div>
            <label className="pd-label">Department</label>
            <div className="p-2 pd-bg-muted rounded">{Store.find((item) => item._id == findInvoice?.Store)?.StoreName || '-'}</div>
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2">Unit</th>
                <th className="border p-2">Carton</th>
                <th className="border p-2">Pcs</th>
                <th className="border p-2">Value Excl GST</th>
                <th className="border p-2">GST</th>
                <th className="border p-2">Discount</th>
                <th className="border p-2">Advance Tax</th>
                <th className="border p-2">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => {
                const product = Products.find((p) => p._id === row.product);
                return (
                  <tr key={row.id || index} >
                    <td className="border p-2">{product ? `${product.mastercode} ${product.ProductName}` : '-'}</td>
                    <td className="border p-2">{row.unit || 0}</td>
                    <td className="border p-2">{row.carton || 0}</td>
                    <td className="border p-2">{row.box || 0}</td>
                    <td className="border p-2">{row.TotalValueExclGst?.toFixed(2) || 0}</td>
                    <td className="border p-2">{row.Gst?.toFixed(2) || 0}</td>
                    <td className="border p-2">{row.discount?.toFixed(2) || 0}</td>
                    <td className="border p-2">{row.AdvanceTax?.toFixed(2) || 0}</td>
                    <td className="border p-2">{row.netAmunt?.toFixed(2) || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default SalesinvoiceView