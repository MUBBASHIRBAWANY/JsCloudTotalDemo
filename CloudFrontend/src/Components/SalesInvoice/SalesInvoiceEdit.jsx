import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppSelect from '../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, updateDataFunction } from '../../Api/CRUDFunctions';

const SalesInvoiceEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams()
  const [poClient, setPoClient] = useState(null);
  const Client = useSelector((state) => state.Client.client)
  const Products = useSelector((state) => state.Product.product);
  const SalesInvoice = useSelector((state) => state.SalesInvoice.SalesInvoice)
  const findInvoice = SalesInvoice.find((item) => item._id == id)
  const location = useSelector((state) => state.Location.Location)
  const Store = useSelector((state) => state.Store.Store)
 
  const [tableData, setTableData] = useState([]);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const AllProduct = {
    options: Products.map((item) => ({ value: item._id, label: `${item.code} ${item.ProductName}` })),
  };

  const AllClient = {
    options: Client.map((item) => ({ value: item._id, label: item.CutomerName })),
  };

  const addNewRow = () => {
    if (!poClient) {
      return toast.error("first Select Client ")
    }
    setTableData([...tableData, {
      id: Date.now(),
      product: '',
      box: 0,
      carton: 0,
      Gst: 0
    }]);
  };
  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };
  const findClient = Client.find((item) => item._id == findInvoice.Client)
  const defultClient = {
    label: findClient.CutomerName,
    value: findClient._id
  }

const findLocation = location.find((item)=> findInvoice.Location)
const disableLocation = {
  label : findLocation.LocationName,
  value : findLocation._id
}
const findStore = Store.find((item)=> item._id == findInvoice.Store)

const disableStore = {
  label : findStore.StoreName,
  value : findStore._id
}
  useEffect(() => {
    setPoClient(defultClient.value)
    setTableData(findInvoice.SalesData)
  }, [])
  const onSubmit = async (data) => {
    data.Client = poClient
    data.SaleInvoiceData = tableData
    try {
      const res = await updateDataFunction(`SaleInvoice/UpdateSalesInvoice/${id}`, data)
      //console.log(res)
      toast.success("Data Add")
      setTimeout(() => {
        navigate('/SalesInvoice')
      }, 2000)
    }
    catch (err) {
      const errorMsg = err.response?.data?.message
      if (errorMsg) {
        toast.error(errorMsg)
        return
      }
      const error = err.response.data.errors
      if (error) {
        //console.log(error)
        try {
          const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName}`
          toast.error(notAvalible)
        }
        catch (err) {
          //console.log(err)
          const notAvalible = `Qty of ${Products.find((item) => item._id == error[0][0].product).ProductName} Available Qty ${error[0][0].qty}  you need ${error[0][0].Req} Boxes`
          toast.error(notAvalible)
        }
      }
    }
  }

  const handleCellChange = (id, field, value) => {

    setTableData(tableData.map(row => {
      if (row.id === id) {

        const updatedRow = { ...row, [field]: value };
        const checking = tableData.find((item) => item.id == id)
        if (field == "product") {
          if (checking.product != value) {
            updatedRow.AdvanceTax = 0
            updatedRow.TotalValueExclGst = ''
            updatedRow.RPValueExclGst = ''
            updatedRow.GstonRpvalue = 0
            updatedRow.box = 0
            updatedRow.unit = 0
            updatedRow.carton = 0
            updatedRow.RPValueInclGST = 0
            updatedRow.netAmunt = 0
            updatedRow.discount = 0
            updatedRow.GSTperBox = 0
            updatedRow.GrossAmntinclGst = 0
            updatedRow.AdvanceTax = 0
            updatedRow.diBspass = 0
            updatedRow.RToffer = 0
            updatedRow.WToffer = 0
            updatedRow.RpDrive = 0
            updatedRow.WHOLESALEDEAL = 0
            updatedRow.TTS = 0
            updatedRow.Gst = 0;
            updatedRow.ValueAfterDis = 0
          }
        }
        if (updatedRow.product == "") {
          updatedRow.netAmunt = 0
          updatedRow.AdvanceTax = 0
          updatedRow.discount = 0
          updatedRow.ValueExclGstperBox = ""
          updatedRow.TotalValueExclGst = ''
          updatedRow.RPValueExclGst = ''
          updatedRow.GstonRpvalue = 0
          updatedRow.box = ""
          updatedRow.unit = ""
          updatedRow.carton = ''
          updatedRow.RPValueInclGST = 0
          updatedRow.GSTperBox = 0
          updatedRow.GrossAmntinclGst = 0
          updatedRow.AdvanceTax = 0
          updatedRow.diBspass = 0
          updatedRow.RToffer = 0
          updatedRow.WToffer = 0
          updatedRow.RpDrive = 0
          updatedRow.WHOLESALEDEAL = 0
          updatedRow.TTS = 0;
          updatedRow.Gst = 0;
          updatedRow.ValueAfterDis = 0
        }

        const findProduct = Products.find((item) => item._id === updatedRow.product);
        if (field == "product") {
          updatedRow.unit == 0
        }
        if (field == "diBspass" || field == "RToffer" || field == "WToffer" || field == "RpDrive" || field == "WHOLESALEDEAL") {
          updatedRow.discount = parseInt(updatedRow.diBspass) + parseInt(updatedRow.RToffer) + parseInt(updatedRow.WToffer) + parseInt(updatedRow.RpDrive) + parseInt(updatedRow.WHOLESALEDEAL)
          updatedRow.ValueAfterDis = updatedRow.Gst + updatedRow.TotalValueExclGst - updatedRow.discount + updatedRow.AdvanceTax  //- updatedRow.discount + updatedRow.AdvanceTax
          updatedRow.netAmunt = updatedRow.ValueAfterDis - updatedRow.TTS
        }
        if (field == "TTS") {
          updatedRow.netAmunt = updatedRow.ValueAfterDis - updatedRow.TTS
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
            const totalBox = updatedRow.unit / findProduct.PcsinBox
            //console.log(totalBox)
            updatedRow.ValueExclGstperBox = findProduct.TPSale
            updatedRow.TotalValueExclGst = totalBox * findProduct.TPSale
            updatedRow.RPValueExclGst = totalBox * findProduct.RetailPrice
            findProduct.SaleTaxBy == "1" ? updatedRow.Gst = (updatedRow.TotalValueExclGst / 100) * parseInt(findProduct.SaleTaxPercent) : updatedRow.Gst = (updatedRow.RPValueExclGst / 100) * parseInt(findProduct.SaleTaxPercent)

            updatedRow.RPValueInclGST = updatedRow.Gst + updatedRow.RPValueExclGst
            updatedRow.RPValueInclGST.toFixed(2)
            updatedRow.GSTperBox = updatedRow.Gst / totalBox
            updatedRow.GSTperBox.toFixed(2)
            updatedRow.totalBox = totalBox
            updatedRow.GrossAmntinclGst = updatedRow.Gst + updatedRow.TotalValueExclGst
            updatedRow.GrossAmntinclGst.toFixed(2)
            updatedRow.ValueAfterDis = updatedRow.Gst + updatedRow.TotalValueExclGst - updatedRow.discount + updatedRow.AdvanceTax
            updatedRow.netAmunt = updatedRow.ValueAfterDis - updatedRow.TTS
            if (!updatedRow.discount) {
              updatedRow.netAmunt = updatedRow.GrossAmntinclGst + updatedRow.AdvanceTax
              updatedRow.netAmunt.toFixed(2)

            } else {
              updatedRow.netAmunt = updatedRow.GrossAmntinclGst + updatedRow.AdvanceTax - updatedRow.discount
              updatedRow.netAmunt.toFixed(2)
              updatedRow.discount.toFixed(2)

            }
            updatedRow.RPValuePerBox = updatedRow.RPValueInclGST / totalBox
            const findClient = Client.find((item) => item._id == poClient)
            if (findClient) {
              if (findClient.AdvanceTaxApply == 1) {
                if (findClient.Filler == 2) {
                  updatedRow.AdvanceTax = updatedRow.GrossAmntinclGst / 100 * 0.25
                } else {
                  updatedRow.AdvanceTax = updatedRow.GrossAmntinclGst / 100 * 0.05
                }
              }
            }
            updatedRow.AdvanceTax.toFixed(2)
            updatedRow.netAmunt.toFixed(2)
          }

        }
        return updatedRow;
      }
      return row;
    }));
  };
  const totalDiscount = tableData.reduce((sum, row) => sum + (parseFloat(row.discount) || 0), 0);
  const TotalValueExclGst = tableData.reduce((sum, row) => sum + (parseFloat(row.TotalValueExclGst) || 0), 0);
  const TotalGst = tableData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0);
  const totalBox = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
  const totalUnit = tableData.reduce((sum, row) => sum + (parseInt(row.unit) || 0), 0);
  const totalnetAmunt = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);
  const totalAdvanceTax = tableData.reduce((sum, row) => sum + (parseFloat(row.AdvanceTax) || 0), 0);

  const AllProducts = Products.map((product) => ({
    value: product._id,
    label: `${product.mastercode} ${product.ProductName}`,
  }))
  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:pd-page-title text-center mb-6">Update Sales Invoice</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="pd-label">Sale Date</label>
            <input
              type="date"
              defaultValue={findInvoice.SalesInvoiceDate}
              {...register("SaleInvoiceDate", { required: true })}
              className="pd-input"
            />
          </div>

          <div>
            <label className="pd-label">Client</label>
            <AppSelect
              onChange={(vals) => setPoClient(vals.value)}
              options={AllClient.options}
              defaultValue={defultClient}
              className="basic-single" compact
              classNamePrefix="pd-select"
              isSearchable
              isDisabled={tableData.length === 0 ? false : true}
              placeholder="Select customer..."
            />
          </div>

          <div>
            <label className="pd-label">Invoice No</label>
            <input
              type="text"
              disabled
              defaultValue={findInvoice.SalesInvoice}
              {...register("salesInvoice")}
              className="pd-input-readonly text-sm md:text-base"
            />
          </div>

          <div>
            <label className="pd-label">Sales Flow Ref</label>
            <input
              type="text"
              defaultValue={findInvoice.SalesFlowRef}
              {...register("SalesFlowRef")}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Location</label>
            <AppSelect onChange={(v) => setDrp(v)} isDisabled={true}  value={disableLocation} />
          </div>
          <div>
            <label className="pd-label">Department</label>
            <AppSelect onChange={(v) => setDrp(v)} isDisabled={true}  value={disableStore} />
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr>
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2 hidden md:table-cell">Unit</th>
                <th className="border p-2">CTN</th>
                <th className="border p-2">Pcs</th>
                <th className="border p-2 hidden lg:table-cell">Value Excl Gst</th>
                <th className="border p-2 hidden lg:table-cell">GST</th>
                <th className="border p-2 hidden xl:table-cell">DIS PASS</th>
                <th className="border p-2 hidden xl:table-cell">RET T</th>
                <th className="border p-2 hidden xl:table-cell">WHOL T</th>
                <th className="border p-2 hidden 2xl:table-cell">RET POW</th>
                <th className="border p-2 hidden 2xl:table-cell">WHOLE DEAL</th>
                <th className="border p-2 hidden lg:table-cell">Adv Tax</th>
                <th className="border p-2">Discount</th>
                <th className="border p-2 hidden xl:table-cell">After Disc</th>
                <th className="border p-2 hidden xl:table-cell">TTS Disc</th>
                <th className="border p-2">Net Amount</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    <AppSelect
                      value={row.product ? {
                        value: row.product,
                        label: `${Products.find((p) => p._id === row.product)?.mastercode} ${Products.find((p) => p._id === row.product)?.ProductName}`
                      } : null}
                      onChange={(selectedOption) =>
                        handleCellChange(row.id, 'product', selectedOption?.value || '')
                      }
                      options={AllProduct.options}
                      className="text-sm"
                      classNamePrefix="pd-select"
                      placeholder="Select Product..."
                      isSearchable
                      isClearable
                    />
                  </td>
                  <td className="border p-2 hidden md:table-cell">{row.unit || 0}</td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.carton}
                      onChange={(e) => handleCellChange(row.id, 'carton', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.box}
                      onChange={(e) => handleCellChange(row.id, 'box', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 hidden lg:table-cell">{row.TotalValueExclGst || 0.00}</td>
                  <td className="border p-2 hidden lg:table-cell">{row.Gst?.toFixed(2) || 0.00}</td>
                  <td className="border p-2 hidden xl:table-cell">
                    <input
                      type="number"
                      value={row?.diBspass || 0}
                      onChange={(e) => handleCellChange(row.id, 'diBspass', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 hidden xl:table-cell">
                    <input
                      type="number"
                      value={row?.RToffer || 0}
                      onChange={(e) => handleCellChange(row.id, 'RToffer', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 hidden xl:table-cell">
                    <input
                      type="number"
                      value={row?.WToffer || 0}
                      onChange={(e) => handleCellChange(row.id, 'WToffer', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 hidden 2xl:table-cell">
                    <input
                      type="number"
                      value={row?.RpDrive || 0}
                      onChange={(e) => handleCellChange(row.id, 'RpDrive', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 hidden 2xl:table-cell">
                    <input
                      type="number"
                      value={row?.WHOLESALEDEAL || 0}
                      onChange={(e) => handleCellChange(row.id, 'WHOLESALEDEAL', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 hidden lg:table-cell">{row?.AdvanceTax?.toFixed(2) || 0.00}</td>
                  <td className="border p-2">{row?.discount || 0}</td>
                  <td className="border p-2 hidden xl:table-cell">{row?.ValueAfterDis?.toFixed(2) || 0.00}</td>
                  <td className="border p-2 hidden xl:table-cell">
                    <input
                      type="number"
                      value={row?.TTS || 0}
                      onChange={(e) => handleCellChange(row.id, 'TTS', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2">{row?.netAmunt?.toFixed(2) || 0.00}</td>
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
                  <td className="border p-2 hidden md:table-cell">{totalUnit}</td>
                  <td className="border p-2">{totalCarton}</td>
                  <td className="border p-2">{totalBox}</td>
                  <td className="border p-2 hidden lg:table-cell">{TotalValueExclGst?.toFixed(2)}</td>
                  <td className="border p-2 hidden lg:table-cell">{TotalGst?.toFixed(2)}</td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2 hidden 2xl:table-cell"></td>
                  <td className="border p-2 hidden 2xl:table-cell"></td>
                  <td className="border p-2 hidden lg:table-cell">{totalAdvanceTax?.toFixed(2)}</td>
                  <td className="border p-2">{totalDiscount?.toFixed(2)}</td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2">{totalnetAmunt?.toFixed(2)}</td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <button
            type="button"
            onClick={addNewRow}
            className="pd-btn-success px-4 py-2 text-sm md:text-base"
          >
            Add Row
          </button>
          <button
            type="submit"
            className="pd-btn-save text-sm md:text-base"
          >
            Update Sale Invoice
          </button>
        </div>
      </form>
    </div>
  )
}

export default SalesInvoiceEdit