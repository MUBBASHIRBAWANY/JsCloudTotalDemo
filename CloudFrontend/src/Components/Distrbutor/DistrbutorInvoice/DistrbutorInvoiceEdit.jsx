import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';


const DistrbutorInvoiceEdit = () => {

  const navigate = useNavigate();
  const { id } = useParams();

  const Products = useSelector((state) => state.Product.product);
  const Store = useSelector((state) => state.Store.Store);
  const DitributorInvoice = useSelector((state) => state.DitributorInvoice.DitributorInvoice);
  const invoicesRef = useRef(DitributorInvoice);
  invoicesRef.current = DitributorInvoice;
  const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers)

  const [EditData, setEditData] = useState(false)

  const [tableData, setTableData] = useState([]);
  const [salesStore, setSalesStore] = useState({});
  const [selectedDistributor, setSelectedDistributor] = useState({});
  const [selectedDc, setSelectedDc] = useState("");

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let invoice;
      try {
        invoice = await getDataFundtion(`/DistrbutorInvoice/${id}`);
      } catch (err) {
        invoice = invoicesRef.current.find((item) => item._id == id && Array.isArray(item.InvoiceData));
        if (!invoice) console.log(err);
      }
      if (cancelled || !invoice?.InvoiceData) return;
      setEditData(invoice);
      reset({
        InvoiceDate: invoice.InvoiceDate,
        salesInvoice: invoice.DitributorInvoiceCode
      });
      setSelectedDc(invoice.DcNumber);
      setTableData(
        invoice.InvoiceData.map((item) => ({
          ...item,
          id: Date.now() + Math.random()
        }))
      );
    };
    if (id) load().catch((err) => console.log(err));
    return () => { cancelled = true; };
  }, [id, reset]);

  useEffect(() => {
    if (!EditData) return;
    const distributor = EditDistributor.find((item) => item._id == EditData.Distrbutor);
    if (distributor) {
      setSelectedDistributor({
        label: distributor.DistrbutorName || "",
        value: distributor._id
      });
    }
    const storeObj = Store.find((item) => item._id == EditData.Store);
    if (storeObj) {
      setSalesStore({
        value: storeObj._id,
        label: storeObj.StoreName
      });
    }
  }, [EditData, EditDistributor, Store]);


  const handleCellChange = (id, field, value) => {
    setTableData(prev =>
      prev.map(row => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };

        if (field === "BeforeGstDiscount") {
          const before = Number(value || 0);
          updated.AmountWithGst = Number(row.Amount) - before + Number(row.Gst);
          updated.netAmount = updated.AmountWithGst - Number(row.AfterGstDiscount || 0);
        }

        if (field === "AfterGstDiscount") {
          updated.netAmount =
            Number(row.AmountWithGst || 0) - Number(value || 0);
        }

        return updated;
      })
    );
  };


  const onSubmit = async (data) => {
    data.InvoiceData = tableData;
    data.DcNumber = selectedDc;
    data.Store = salesStore.value;
    data.Distrbutor = selectedDistributor.value;
    data.PostStatus = "False";

    try {
      await updateDataFunction(`/DistrbutorInvoice/DistrbutorInvoiceUpdate/${id}`, data);
      toast.success("Invoice Updated Successfully");
      setTimeout(() => navigate("/DistrbutorInvoice"), 1200);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Something Went Wrong"
      toast.error(errorMsg);
    }
  };


  const TotalAmount = tableData.reduce((sum, row) => sum + Number(row.Amount || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + Number(row.carton || 0), 0);
  const totalBOX = tableData.reduce((sum, row) => sum + Number(row.box || 0), 0);
  const totalDiscountBeforeGst = tableData.reduce((sum, row) => sum + Number(row.BeforeGstDiscount || 0), 0);
  const totalGst = tableData.reduce((sum, row) => sum + Number(row.Gst || 0), 0);
  const totalAmountWithGst = tableData.reduce((sum, row) => sum + Number(row.AmountWithGst || 0), 0);
  const totalDiscountAfterGst = tableData.reduce((sum, row) => sum + Number(row.AfterGstDiscount || 0), 0);
  const totalNetAmount = tableData.reduce((sum, row) => sum + Number(row.netAmount || 0), 0);


  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">
        Edit Distributor Invoice
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-bg-surface p-4 md:p-6 rounded-lg shadow-md">
        {/* HEADER */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

          <div>
            <label className="block text-sm pd-text-body font-semibold mb-2">Delivery Date</label>
            <input
              type="date"
              disabled
              {...register("InvoiceDate")}
              className="w-full px-3 py-2 border rounded-lg pd-bg-muted"
            />
          </div>

          <div>
            <label className="pd-label">Distributor</label>
            <AppSelect value={selectedDistributor} isDisabled />
          </div>

          <div>
            <label className="block text-sm pd-text-body font-semibold mb-2">Invoice No</label>
            <input
              type="text"
              disabled
              {...register("salesInvoice")}
              className="w-full px-3 py-2 border rounded-lg pd-bg-muted"
            />
          </div>

          <div>
            <label className="block text-sm pd-text-body font-semibold mb-2">Store</label>
            <AppSelect value={salesStore} isDisabled />
          </div>

          <div>
            <label className="block text-sm pd-text-body font-semibold mb-2">DC Number</label>
            <AppSelect value={{ label: selectedDc, value: selectedDc }} isDisabled />
          </div>

        </div>

        {/* TABLE */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="border px-36">Product</th>
                <th className="border p-2">Carton</th>
                <th className="border p-2">Box</th>
                <th className="border p-2">Rate</th>
                <th className="border p-2">Amount</th>
                <th className="border p-2">Discount Before Gst</th>
                <th className="border p-2">GSt</th>
                <th className="border p-2">Amount With Gst</th>
                <th className="border p-2">Discount After Gst</th>
                <th className="border p-2">Net Amount</th>
              </tr>
            </thead>

            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    {Products.find((p) => p._id == row.product)?.ProductName}
                  </td>
                  <td className="border p-2">{row.carton}</td>
                  <td className="border p-2">{row.box}</td>
                  <td className="border p-2">{row.Rate}</td>
                  <td className="border p-2">{row.Amount}</td>

                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.BeforeGstDiscount}
                      onChange={(e) =>
                        handleCellChange(row.id, "BeforeGstDiscount", e.target.value)
                      }
                      className="w-full p-1 border rounded"
                    />
                  </td>

                  <td className="border p-2">{row.Gst}</td>
                  <td className="border p-2">{row.AmountWithGst}</td>

                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.AfterGstDiscount}
                      onChange={(e) =>
                        handleCellChange(row.id, "AfterGstDiscount", e.target.value)
                      }
                      className="w-full p-1 border rounded"
                    />
                  </td>

                  <td className="border p-2">{row.netAmount}</td>
                </tr>
              ))}
            </tbody>

            {tableData.length !== 0 && (
              <tfoot>
                <tr className="pd-table-footer">
                  <td className="border p-2">Total</td>
                  <td className="border p-2">{totalCarton}</td>
                  <td className="border p-2">{totalBOX}</td>
                  <td className="border p-2"></td>
                  <td className="border p-2">{TotalAmount}</td>
                  <td className="border p-2">{totalDiscountBeforeGst}</td>
                  <td className="border p-2">{totalGst}</td>
                  <td className="border p-2">{totalAmountWithGst}</td>
                  <td className="border p-2">{totalDiscountAfterGst}</td>
                  <td className="border p-2">{totalNetAmount}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex justify-end">
          <button className="pd-btn-save">
            Update Distributor Invoice
          </button>
        </div>

      </form>
    </div>
  );
};

export default DistrbutorInvoiceEdit;
