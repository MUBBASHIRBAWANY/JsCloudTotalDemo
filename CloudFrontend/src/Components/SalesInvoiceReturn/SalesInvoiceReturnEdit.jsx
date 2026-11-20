import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import AppSelect from '../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { updateDataFunction } from '../../Api/CRUDFunctions';

const recalcLineFromCarton = (row, product, client) => {
  const updatedRow = { ...row };
  if (!product) return updatedRow;

  const BoxinCarton = parseInt(product.BoxinCarton) || 0;
  const PcsinBox = parseInt(product.PcsinBox) || 0;
  const box = parseInt(updatedRow.box || 0) || 0;
  const carton = parseInt(updatedRow.carton || 0) || 0;
  const Allunit = BoxinCarton * PcsinBox;

  if (box === 0) {
    updatedRow.unit = Allunit * carton;
  } else if (carton === 0) {
    updatedRow.unit = PcsinBox * box;
  } else {
    updatedRow.unit = Allunit * carton + box * PcsinBox;
  }

  const totalBox = PcsinBox ? updatedRow.unit / PcsinBox : carton * BoxinCarton + box;
  const rate = parseFloat(updatedRow.rate) || 0;

  updatedRow.totalBox = totalBox;
  updatedRow.ValueExclGstperBox = rate;
  updatedRow.TotalValueExclGst = totalBox * rate;
  updatedRow.RPValueExclGst = totalBox * (parseFloat(product.RetailPrice) || 0);
  updatedRow.Gst =
    product.SaleTaxBy == 1 || product.SaleTaxBy === "1"
      ? (updatedRow.TotalValueExclGst / 100) * (parseInt(product.SaleTaxPercent) || 0)
      : (updatedRow.RPValueExclGst / 100) * (parseInt(product.SaleTaxPercent) || 0);
  updatedRow.GrossAmntinclGst = updatedRow.Gst + updatedRow.TotalValueExclGst;

  if (client && client.AdvanceTaxApply == 1) {
    updatedRow.AdvanceTax = parseFloat((
      client.Filler === 2
        ? (updatedRow.GrossAmntinclGst / 100) * 0.25
        : (updatedRow.GrossAmntinclGst / 100) * 0.05
    ).toFixed(2)) || 0;
  } else {
    updatedRow.AdvanceTax = client ? 0 : (Number(updatedRow.AdvanceTax) || 0);
  }

  updatedRow.RPValueInclGST = updatedRow.Gst + updatedRow.RPValueExclGst;
  updatedRow.GSTperBox = totalBox > 0 ? updatedRow.Gst / totalBox : 0;
  updatedRow.ValueAfterDis =
    updatedRow.Gst +
    updatedRow.TotalValueExclGst -
    (Number(updatedRow.discount) || 0) +
    (Number(updatedRow.AdvanceTax) || 0);
  updatedRow.netAmunt = parseFloat(
    (updatedRow.ValueAfterDis - (Number(updatedRow.TTS) || 0)).toFixed(2)
  );

  return updatedRow;
};

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
  const dis = useSelector((state) => state.DistributroReducers.DistributroReducers)
  const { register, handleSubmit, formState: { errors }, setValue } = useForm();

  const initializedRef = useRef(false);

  // Initialize once products are loaded so carton → totalBox can be calculated
  useEffect(() => {
    if (!findReturn || initializedRef.current || !Products.length) return;

    setValue("ReturnDate", findReturn.SalesInvoiceReturnDate);
    setValue("SalesFlowRef", findReturn.SalesFlowRef || "");
    setValue("Damage", findReturn.Damage || "Fresh");

    const client = Client.find((item) => item._id === findReturn.Client);
    if (client) {
      setPoClient({
        label: `${client.CutomerName || client.DistrbutorName } ${client.code}`,
        value: client._id
      });
    }

    if (findReturn.SalesReturnData) {
      setTableData(findReturn.SalesReturnData.map((item, index) => {
        const product = Products.find((p) => p._id == item.product);
        const carton = Number(item.carton) || 0;
        const box = item.box != null && item.box !== ''
          ? Number(item.box) || 0
          : (carton ? 0 : Number(item.totalBox) || 0);

        return recalcLineFromCarton({
          ...item,
          id: item._id || item.id || `sr-${Date.now()}-${index}`,
          box,
          carton,
          rate: item.rate ?? product?.TPSale ?? 0,
          discount: Number(item.discount) || 0,
          diBspass: Number(item.diBspass) || 0,
          RToffer: Number(item.RToffer) || 0,
          WToffer: Number(item.WToffer) || 0,
          RpDrive: Number(item.RpDrive) || 0,
          WHOLESALEDEAL: Number(item.WHOLESALEDEAL) || 0,
          TTS: Number(item.TTS) || 0,
          AdvanceTax: Number(item.AdvanceTax) || 0,
        }, product, client);
      }));
    }
    initializedRef.current = true;
  }, [findReturn, Client, setValue, Products]);

  const AllProduct = {
    options: Products.map((item) => ({ 
      value: item._id, 
      label: `${item.mastercode} ${item.ProductName}` 
    })),
  };

  const AllClient = {
    options: Client.map((item) => ({ 
      value: item._id, 
      label: `${item.CutomerName} ${item.code}` 
    })),
  };

  const addNewRow = () => {
    if (!poClient) {
      return toast.error("First select a client");
    }

    setTableData([...tableData, {
      id: Date.now(),
      product: '',
      box: 0,
      carton: 0,
      rate: 0,
      Gst: 0,
      discount: 0,
      netAmunt: 0
    }]);
  };

  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };

  const findLocation = location.find((item) => item._id === findReturn?.Location);
  const disableLocation = findLocation ? {
    label: findLocation.LocationName,
    value: findLocation._id
  } : null;

  const findStore = Store.find((item) => item._id === findReturn?.Store);
  //console.log(Store , "Store")
  const disableStore = findStore ? {
    label: findStore.StoreName,
    value: findStore._id
  } : null;

  const onSubmit = async (data) => {
    if (!poClient) {
      return toast.error("Please select a client");
    }
    const findClient = Client.find((item) => item._id == poClient.value);
    const SalesReturnData = tableData.map(({ id, ...row }) => {
      const product = Products.find((p) => p._id == row.product);
      return recalcLineFromCarton(row, product, findClient);
    });
    const invalid = SalesReturnData.find(
      (row) => row.product && !(Number(row.totalBox) > 0)
    );
    if (invalid) {
      return toast.error("Enter Carton or Box for all products (totalBox is 0)");
    }
    const payload = {
      ...data,
      Client: poClient.value,
      SalesReturnData,
      Location: disableLocation?.value,
      Store: disableStore?.value
    };

    try {
      //console.log(payload)
      const res = await updateDataFunction(`/SalesInvoiceReturn/UpdateSalesInvoiceReturn/${id}`, payload);
      toast.success("Return updated successfully!");
      setTimeout(() => navigate('/SalesReturnList'), 1500);
      //console.log(payload)
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
  let value = feildvalue?.value ?? feildvalue;

  setTableData(tableData.map(row => {
    if (row.id === id) {
      const updatedRow = { ...row, [field]: value };

      // Special fields mapping
      if (["diBspass", "RToffer", "WToffer", "RpDrive", "WHOLESALEDEAL", "TTS"].includes(field)) {
        updatedRow[field] = feildvalue || 0;
      }

      // Discount-related recalculations
      if (["diBspass", "RToffer", "WToffer", "RpDrive", "WHOLESALEDEAL"].includes(field)) {
        updatedRow.discount =
          parseInt(updatedRow.diBspass || 0) +
          parseInt(updatedRow.RToffer || 0) +
          parseInt(updatedRow.WToffer || 0) +
          parseInt(updatedRow.RpDrive || 0) +
          parseInt(updatedRow.WHOLESALEDEAL || 0);

        updatedRow.ValueAfterDis =
          updatedRow.Gst +
          updatedRow.TotalValueExclGst -
          updatedRow.discount +
          updatedRow.AdvanceTax;

        updatedRow.netAmunt = parseFloat(
          (updatedRow.ValueAfterDis - (updatedRow.TTS || 0)).toFixed(2)
        );
      }

      if (field === "TTS") {
        updatedRow.netAmunt = parseFloat(
          (updatedRow.ValueAfterDis - (updatedRow.TTS || 0)).toFixed(2)
        );
      }

      // When product changes
      if (field === "product") {
        const findProduct = Products.find(item => item._id == value);
        if (findProduct) {
          updatedRow.rate = findProduct.TPSale;
        }

        // Only reset qty/amounts when the product actually changes
        if (row.product != value) {
          updatedRow.AdvanceTax = 0;
          updatedRow.TotalValueExclGst = 0;
          updatedRow.RPValueExclGst = 0;
          updatedRow.GstonRpvalue = 0;
          updatedRow.box = 0;
          updatedRow.unit = 0;
          updatedRow.carton = 0;
          updatedRow.RPValueInclGST = 0;
          updatedRow.netAmunt = 0;
          updatedRow.discount = 0;
          updatedRow.GSTperBox = 0;
          updatedRow.GrossAmntinclGst = 0;
          updatedRow.diBspass = 0;
          updatedRow.RToffer = 0;
          updatedRow.WToffer = 0;
          updatedRow.RpDrive = 0;
          updatedRow.WHOLESALEDEAL = 0;
          updatedRow.TTS = 0;
          updatedRow.Gst = 0;
          updatedRow.ValueAfterDis = 0;
          updatedRow.totalBox = 0;
        }
      }

      // Handle rate changes
      if (field === "rate") {
        updatedRow.rate = parseFloat(value) || 0;
      }

      // Reset if product is cleared
      if (!updatedRow.product) {
        updatedRow.netAmunt = 0;
        updatedRow.AdvanceTax = 0;
        updatedRow.discount = 0;
        updatedRow.ValueExclGstperBox = 0;
        updatedRow.TotalValueExclGst = 0;
        updatedRow.RPValueExclGst = 0;
        updatedRow.GstonRpvalue = 0;
        updatedRow.box = 0;
        updatedRow.unit = 0;
        updatedRow.carton = 0;
        updatedRow.RPValueInclGST = 0;
        updatedRow.GSTperBox = 0;
        updatedRow.GrossAmntinclGst = 0;
        updatedRow.diBspass = 0;
        updatedRow.rate = 0;
        updatedRow.RToffer = 0;
        updatedRow.WToffer = 0;
        updatedRow.RpDrive = 0;
        updatedRow.WHOLESALEDEAL = 0;
        updatedRow.TTS = 0;
        updatedRow.Gst = 0;
        updatedRow.ValueAfterDis = 0;
      }

      const findProduct = Products.find(item => item._id == updatedRow.product);

      if (["carton", "box", "rate"].includes(field) && findProduct) {
        if (field === "carton") updatedRow.carton = feildvalue || 0;
        if (field === "box") updatedRow.box = feildvalue || 0;
        if (field === "rate") updatedRow.rate = feildvalue || 0;

        const findClient = Client.find(item => item._id === poClient?.value);
        return recalcLineFromCarton(updatedRow, findProduct, findClient);
      }

      return updatedRow;
    }
    return row;
  }));
};


  // Calculate totals
  const totalDiscount = tableData.reduce((sum, row) => sum + (Number(row.discount) || 0), 0);
  const TotalValueExclGst = tableData.reduce((sum, row) => sum + (Number(row.TotalValueExclGst) || 0), 0);
  const TotalGst = tableData.reduce((sum, row) => sum + (Number(row.Gst) || 0), 0);
  const totalBox = tableData.reduce((sum, row) => sum + (Number(row.totalBox) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (Number(row.carton) || 0), 0);
  const totalUnit = tableData.reduce((sum, row) => sum + (Number(row.unit) || 0), 0);
  const totalnetAmunt = tableData.reduce((sum, row) => sum + (Number(row.netAmunt) || 0), 0);
  const totalAdvanceTax = tableData.reduce((sum, row) => sum + (Number(row.AdvanceTax) || 0), 0);

  if (!findReturn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[color:var(--pd-primary)]"></div>
        <span className="ml-4 text-xl">Loading return data...</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:pd-page-title text-center mb-6">Edit Sales Return</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="pd-label">Return Date</label>
            <input
              type="date"
              defaultValue={findReturn.SalesInvoiceReturnDate}
              {...register("ReturnDate", { required: true })}
              className="pd-input"
            />
          </div>

          <div>
            <label className="pd-label">Client</label>
            <AppSelect
              onChange={(vals) => setPoClient(vals)}
              options={AllClient.options}
              value={poClient}
              className="basic-single" compact
              classNamePrefix="pd-select"
              isSearchable
              isDisabled={tableData.length === 0 ? false : true}
              placeholder="Select customer..."
            />
          </div>

          <div>
            <label className="pd-label">Return No</label>
            <input
              type="text"
              disabled
              value={findReturn.ReturnNumber || "Auto Generated"}
              className="pd-input-readonly text-sm md:text-base"
            />
          </div>

          <div>
            <label className="pd-label">Reference</label>
            <input
              type="text"
              defaultValue={findReturn.SalesFlowRef || ""}
              {...register("SalesFlowRef")}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Location</label>
            <AppSelect 
              value={disableLocation}
              isDisabled={true}
            />
          </div>
          <div>
            <label className="pd-label">Department</label>
            <AppSelect 
              value={disableStore}
              isDisabled={true}
            />
          </div>
          <div>
            <label className="pd-label">Condition</label>
            <select 
              defaultValue={findReturn.Damage || "Fresh"}
              {...register("Condition")} 
              className='pd-input'
            >
              <option value="Fresh"> Fresh</option>
              <option value="Damage"> Damage</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr>
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2 min-w-[200px]">Rate</th>
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
                        label: `${Products.find((p) => p._id == row.product)?.mastercode} ${Products.find((p) => p._id == row.product)?.ProductName}`
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
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.rate ?? 0}
                      onChange={(e) => handleCellChange(row.id, 'rate', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 hidden md:table-cell">{row.unit || 0}</td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.carton ?? 0}
                      onChange={(e) => handleCellChange(row.id, 'carton', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.box ?? 0}
                      onChange={(e) => handleCellChange(row.id, 'box', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2 hidden lg:table-cell">{Number(row.TotalValueExclGst || 0).toFixed(2)}</td>
                  <td className="border p-2 hidden lg:table-cell">{Number(row.Gst || 0).toFixed(2)}</td>
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
                  <td className="border p-2 hidden lg:table-cell">{Number(row?.AdvanceTax || 0).toFixed(2)}</td>
                  <td className="border p-2">{Number(row?.discount || 0)}</td>
                  <td className="border p-2 hidden xl:table-cell">{Number(row?.ValueAfterDis || 0).toFixed(2)}</td>
                  <td className="border p-2 hidden xl:table-cell">
                    <input
                      type="number"
                      value={row?.TTS || 0}
                      onChange={(e) => handleCellChange(row.id, 'TTS', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
                  </td>
                  <td className="border p-2">{Number(row?.netAmunt || 0).toFixed(2)}</td>
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
                  <td className="border p-2"></td>
                  <td className="border p-2 hidden md:table-cell">{totalUnit}</td>
                  <td className="border p-2">{totalCarton}</td>
                  <td className="border p-2">{totalBox}</td>
                  <td className="border p-2 hidden lg:table-cell">{TotalValueExclGst.toFixed(2)}</td>
                  <td className="border p-2 hidden lg:table-cell">{TotalGst.toFixed(2)}</td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2 hidden 2xl:table-cell"></td>
                  <td className="border p-2 hidden 2xl:table-cell"></td>
                  <td className="border p-2 hidden lg:table-cell">{totalAdvanceTax.toFixed(2)}</td>
                  <td className="border p-2">{totalDiscount.toFixed(2)}</td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2 hidden xl:table-cell"></td>
                  <td className="border p-2">{totalnetAmunt.toFixed(2)}</td>
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
            Update Sales Return
          </button>
        </div>
      </form>
    </div>
  )
}

export default SalesInvoiceReturnEdit;