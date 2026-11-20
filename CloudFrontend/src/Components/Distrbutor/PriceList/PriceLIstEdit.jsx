import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { ToastContainer, toast } from "react-toastify";
import { fetchproduct } from "../../../Redux/Reducers/ProductReducer";
import { getDataFundtion, updateDataFunction } from "../../../Api/CRUDFunctions";

const PriceLIstEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const Products = useSelector((state) => state.Product.product);
  const PriceListEidt = useSelector((state) => state.PricelistReducer.PricelistReducer)

  const { register, handleSubmit, setValue } = useForm();

  const [tableData, setTableData] = useState([]);
  const [filterProduct, setFilterProduct] = useState([]);

  /* -------------------- LOAD PRODUCTS -------------------- */
  const loadProducts = async () => {
    const res =
      Products.length === 0
        ? await getDataFundtion("/product")
        : { data: Products };

    if (Products.length === 0) {
      dispatch(fetchproduct(res.data));
    }

    const sndProducts = res.data.filter((p) => p.isForSND === "true");
    setFilterProduct(sndProducts);
  };

  /* -------------------- LOAD PRICE LIST -------------------- */
  const loadPriceList = async () => {
    try {

      const data = PriceListEidt.find((item) => item._id == id)

      setValue("PriceListDate", data.PriceListDate?.slice(0, 10));
      setValue("PriceListName", data.PriceListName);
      setValue("PriceListStatus", data.PriceListStatus);

      const rows = data.PriceListData.map((row) => ({
        id: Date.now() + Math.random(),
        product: row.product,
        TPSale: row.TPSale,
        TO: row.TO,
        DisPer: row.DisPer,
        SpecialTO: row.SpecialTO,
        NetSale: row.NetSale,
        ClaimableSpecialTO : row.ClaimableSpecialTO,
        UnClaimableSpecialTO : row.UnClaimableSpecialTO,
        IsSchemeRS: row.IsSchemeRS,
        isSchemeBox: row.isSchemeBox,
        schemeBox: row.schemeBox,
        onBox: row.onBox,
        SchemeStartDate: row.SchemeStartDate || "",
        SchemeEndDate: row.SchemeEndDate || ""
      }));

      setTableData(rows);
    } catch (err) {
      toast.error("Failed to load price list");
    }
  };

  useEffect(() => {
    loadProducts();
    loadPriceList();
  }, []);

  /* -------------------- TABLE LOGIC -------------------- */
  const addNewRow = () => {
    setTableData([
      ...tableData,
      {
        id: Date.now(),
        product: "",
        TPSale: "",
        TO: "",
        DisPer: "",
        NetSale: 0,
      },
    ]);
  };

  const handleRemoveRow = (id) => {

    setTableData(prev => prev.filter(row => row.id !== id));
  };

  const handleCellChange = (id, field, value) => {
    setTableData((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === "product") {
          const findduplicate = tableData.find(r => r.product === value && r.id !== id);
          if (findduplicate) {
            toast.error("Product already added in the list");
            return row;
          }
        }
        const updated = { ...row, [field]: value };
        updated.SpecialTO = Number(updated.ClaimableSpecialTO || 0) + Number(updated.UnClaimableSpecialTO || 0)
        const base = Number(updated.TPSale || 0) - Number(updated.TO || 0) - Number(updated.SpecialTO || 0);
        updated.NetSale =
          base - (base * Number(updated.DisPer || 0)) / 100;

        return updated;
      })
    );
  };

  const loadInvoiceOptions = async (inputValue) => {
    if (!inputValue) return [];
    return filterProduct
      .filter(
        (p) =>
          p.ProductName.toLowerCase().includes(inputValue.toLowerCase()) ||
          p.salesFlowRef.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 50)
      .map((p) => ({
        label: `${p.ProductName} ${p.salesFlowRef}`,
        value: p._id,
      }));
  };

  /* -------------------- SUBMIT -------------------- */
  const onSubmit = async (data) => {
    data.PriceListData = tableData;
    //console.log(data)
    try {
      await updateDataFunction(`/PriceList/UpdatePricelist/${id}`, data);
      toast.success("Price List Updated");
      navigate("/PriceList");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-3xl font-bold text-center mb-6">
        Edit Price List
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="pd-bg-surface p-6 rounded shadow"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="pd-label">Price List Date</label>
            <input
              type="date"
              {...register("PriceListDate", { required: true })}
              className="pd-input"
            />
          </div>

          <div>
            <label className="pd-label">Price List Name</label>
            <input
              type="text"
              {...register("PriceListName", { required: true })}
              className="pd-input"
            />
          </div>
          <div>
            <label className="pd-label">Status</label>
            <select name="" id="" {...register("PriceListStatus", { required: true })} className="pd-input">
              <option value="Active">Active</option>
              <option value="InActive">InActive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="pd-bg-muted">
              <tr>
                <th className="border p-2">Product</th>
                <th className="border p-2">TPSale</th>
                <th className="border p-2">TO</th>
                <th className="border p-2">Discount %</th>
                <th className="border p-2">Net</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  <td className="border p-2">
                    <AppAsyncSelect
                      closeMenuOnScroll={true}
                      value={
                        filterProduct
                          .filter((p) => p._id === row.product)
                          .map((p) => ({
                            label: `${p.ProductName} ${p.salesFlowRef}`,
                            value: p._id,
                          }))[0] || null
                      }
                      loadOptions={loadInvoiceOptions}
                      onChange={(opt) =>
                        handleCellChange(row.id, "product", opt?.value)
                      }
                      openMenuOnFocus={false}
                      isSearchable
                      placeholder="Select Product..."
                      className="text-sm"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      value={row.TPSale}
                      onChange={(e) =>
                        handleCellChange(row.id, "TPSale", e.target.value)
                      }
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      value={row.TO}
                      onChange={(e) =>
                        handleCellChange(row.id, "TO", e.target.value)
                      }
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      value={row.DisPer}
                      onChange={(e) =>
                        handleCellChange(row.id, "DisPer", e.target.value)
                      }
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="border p-2">{row.NetSale}</td>
                  <td className="border p-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            type="button"
            onClick={addNewRow}
            className="pd-btn-save transition-colors"
          >
            Add Row
          </button>

          <button
            type="submit"
            className="pd-btn-save px-6 transition-colors"
          >
            Update Price List
          </button>
        </div>
      </form>
    </div>
  );
};

export default PriceLIstEdit;