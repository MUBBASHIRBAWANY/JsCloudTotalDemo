import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import { fetchproduct } from "../../Redux/Reducers/ProductReducer";
import { getDataFundtion } from "../../Api/CurdFunctions";

const PriceListView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const Products = useSelector((state) => state.Product.product);
  const PriceListEdit = useSelector(
    (state) => state.PricelistReducer.PricelistReducer
  );

  const { register, setValue } = useForm();
  const [tableData, setTableData] = useState([]);

  /* ---------------- LOAD PRODUCTS ---------------- */
  const loadProducts = async () => {
    if (Products.length === 0) {
      const res = await getDataFundtion("/product");
      dispatch(fetchproduct(res.data));
    }
  };

  /* ---------------- LOAD PRICE LIST ---------------- */
  const loadPriceList = () => {
    const data = PriceListEdit.find((item) => item._id == id);
    if (!data) return;

    setValue("PriceListDate", excelDateToJSDate(data.PriceListDate));
    setValue("PriceListName", data.PriceListName);
    setValue("PriceListStatus", data.PriceListStatus);

    const rows = data.PriceListData.map((row) => ({
      id: row._id || Math.random(),
      product: row.product,
      TPSale: row.TPSale,
      TO: row.TO,
      DisPer: row.DisPer,
      NetSale: row.NetSale,
    }));

    setTableData(rows);
  };

  useEffect(() => {
    loadProducts();
    loadPriceList();
  }, []);
function excelDateToJSDate(serial) {
  if (!serial) return "";

  if (typeof serial === "string" && serial.includes("-")) {
    return serial.slice(0, 10);
  }

  const utc_days = serial - 25569;
  const utc_value = utc_days * 86400 * 1000;
  const date = new Date(utc_value);

  return date.toISOString().split("T")[0];
}
  const getProductName = (id) => {
    const p = Products.find((item) => item._id === id);
    return p ? `${p.ProductName} ${p.salesFlowRef}` : "-";
  };

  const generateExcel = () => {
    const rows = tableData.map((row, index) => ({
      "#": index + 1,
      Product: getProductName(row.product),
      TPSale: row.TPSale,
      TO: row.TO,
      "Discount %": row.DisPer,
      Net: row.NetSale,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Price List");
    XLSX.writeFile(wb, `PriceList_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="p-4">
      <ToastContainer />

      <h1 className="text-3xl font-bold text-center mb-6">
        View Price List
      </h1>

      <div className="bg-white p-6 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="font-semibold">Price List Date</label>
            <input
              type="date"
              {...register("PriceListDate")}
              readOnly
              className="w-full px-4 py-2 border rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="font-semibold">Price List Name</label>
            <input
              type="text"
              {...register("PriceListName")}
              readOnly
              className="w-full px-4 py-2 border rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="font-semibold">Status</label>
            <input
              type="text"
              {...register("PriceListStatus")}
              readOnly
              className="w-full px-4 py-2 border rounded bg-gray-100"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Product</th>
                <th className="border p-2">TPSale</th>
                <th className="border p-2">TO</th>
                <th className="border p-2">Discount %</th>
                <th className="border p-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  <td className="border p-2">
                    {getProductName(row.product)}
                  </td>
                  <td className="border p-2">{row.TPSale}</td>
                  <td className="border p-2">{row.TO}</td>
                  <td className="border p-2">{row.DisPer}</td>
                  <td className="border p-2 font-semibold">
                    {row.NetSale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={generateExcel}
            className="bg-green-600 text-white px-6 py-2 rounded"
          >
            Download Excel
          </button>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-600 text-white px-6 py-2 rounded"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceListView;
