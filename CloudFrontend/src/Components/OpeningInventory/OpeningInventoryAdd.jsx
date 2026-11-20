import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppSelect from '../Global/AppSelect.jsx'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction } from '../../Api/CRUDFunctions';



const OpeningInventoryAdd = () => {
  const navigate = useNavigate();
  const [poClient, setPoClient] = useState(null);
  const Client = useSelector((state) => state.Client.client)
  const Products = useSelector((state) => state.Product.product);
  const notify = () => toast("Product Duplicate In Purchase Order");

  const [tableData, setTableData] = useState([]);

  const AllProduct = {
    options: Products.map((item) => ({ value: item._id, label: `${item.code} ${item.ProductName}` })),
  };

  const AllClient = {
    options: Client.map((item) => ({ value: item._id, label: item.CutomerName })),
  };

  const { register, handleSubmit, formState: { errors } } = useForm();

  const addNewRow = () => {
    setTableData([...tableData, {
      id: Date.now(),
      product: '',
      OpeningQty: 0,
    }]);
  };

  const removeRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };

  const handleCellChange = (id, field, value) => {

    setTableData(tableData.map(row => {
      if (row.id === id) {

        const updatedRow = { ...row, [field]: value };
        const checking = tableData.find((item) => item.id == id)
        if (field == "product") {
          if (checking.product != value) {
            updatedRow.opneingQty = 0
          }
        }
        if (updatedRow.product == "") {
          updatedRow.opneingQty = 0
        }

        const findProduct = Products.find((item) => item._id === updatedRow.product);
        if (field == "product") {
          updatedRow.opneingQty == 0
        }
        const OpeningQty = updatedRow.opneingQty
        return updatedRow;
      }
      return row;
    }));
  };
  const totalOpneingQty = tableData.reduce((sum, row) => sum + (parseFloat(row.opneingQty) || 0), 0);
  const TotalValueExclGst = tableData.reduce((sum, row) => sum + (parseFloat(row.TotalValueExclGst) || 0), 0);
  const TotalGst = tableData.reduce((sum, row) => sum + (parseFloat(row.Gst) || 0), 0);
  const totalBox = tableData.reduce((sum, row) => sum + (parseInt(row.box) || 0), 0);
  const totalCarton = tableData.reduce((sum, row) => sum + (parseInt(row.carton) || 0), 0);
  const totalUnit = tableData.reduce((sum, row) => sum + (parseInt(row.unit) || 0), 0);
  const totalnetAmunt = tableData.reduce((sum, row) => sum + (parseFloat(row.netAmunt) || 0), 0);
  const totalAdvanceTax = tableData.reduce((sum, row) => sum + (parseFloat(row.AdvanceTax) || 0), 0);

  const onSubmit = async (data) => {
    data.InvoetoryData = tableData
    //console.log(data)
    try {
    const res = await createDataFunction("/Openinginventory" , data)
    //console.log(res)
      toast.success("Data Add")
      setTimeout(() => {
        navigate('/OpeningInventory')
      }, 2000)

    } catch (err) {
      //console.log(err)
      toast.error("Something went wrong")
    }




  }
  const AllProducts = Products.map((product) => ({
    value: product._id,
    label: `${product.mastercode} ${product.ProductName}`,
  }))
  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="pd-page-title text-center mb-6">Opening Inventory </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">Year From </label>
            <input
              type="date"
              {...register("DateStart", { required: true })}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Year To</label>
            <input
              type="date"
              {...register("DateEnd", { required: true })}
              className="pd-input"
            />
          </div>

        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm md:text-base">
            <thead>
              <tr>
                <th className="border p-2 min-w-[200px]">Product</th>
                <th className="border p-2">Opening Qty</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} >
                  <td className="border p-2">
                    <AppSelect
                      compact
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

                  <td className="border p-2">
                    <input
                      type="number"
                      value={row.opneingQty}
                      onChange={(e) => handleCellChange(row.id, 'opneingQty', e.target.value)}
                      className="w-full p-1 text-xs md:text-sm border rounded"
                    />
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
                  <td className="border p-2"></td>
                  <td className="border p-2 hidden md:table-cell">{totalOpneingQty}</td>
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
            Create Opening Balance
          </button>
        </div>
      </form>
    </div>
  )
}

export default OpeningInventoryAdd