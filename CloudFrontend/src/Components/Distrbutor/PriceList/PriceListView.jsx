import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { fetchproduct } from "../../../Redux/Reducers/ProductReducer";
import { getDataFundtion, SndcreateDataFunction, SndupdateDataFunction } from "../../../Api/CRUDFunctions";
import * as XLSX from "xlsx";

const todayKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

// Same per-box net as DistrbutorInvoiceAdd for one billed box.
// Discount % is taken from TPSale. SpecialTO applies only inside the row scheme dates.
const invoiceNetPerBox = (row, onDate = todayKey()) => {
  const from = row?.SchemeStartDate ? String(row.SchemeStartDate).slice(0, 10) : "";
  const to = row?.SchemeEndDate ? String(row.SchemeEndDate).slice(0, 10) : "";
  const TPSale = Number(row?.TPSale || 0);
  const TO = Number(row?.TO || 0);
  const DisPer = Number(row?.DisPer || 0);
  const schemeActive = Boolean(from && to && onDate >= from && onDate <= to);
  const specialToRate = schemeActive && row?.IsSchemeRS !== false ? Number(row?.SpecialTO || 0) : 0;
  const amount = Number(TPSale.toFixed(2));
  const discount = Number(TO.toFixed(2));
  const specialdiscount = Number(((TPSale / 100) * DisPer).toFixed(2));
  const specialTO = Number(specialToRate.toFixed(2));
  return Number((amount - discount - specialdiscount - specialTO).toFixed(2));
};

const freeBoxLabel = (row) => {
  if (!row?.SchemeStartDate || !row?.SchemeEndDate) return "—";
  if (row?.isSchemeBox !== true) return "—";
  const free = Number(row.schemeBox) || 0;
  const on = Number(row.onBox) || 24;
  if (free <= 0 || on <= 0) return "—";
  return `${free} per ${on}`;
};

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

const sendToSND = async ()=>{
try{
const data = PriceListEdit.find((item) => item._id == id);
  const res = await SndupdateDataFunction(`/pricelist/UpdatePricelist/${id}` ,data )
  toast.success("Send Succesfully to Snd")
  setTimeout(() => {
  navigate("/PriceList");
  }, 1500);
}
catch{
  toast.error("Some Thing Went Wrong")

}
  
}

  /* ---------------- LOAD PRICE LIST ---------------- */
  const loadPriceList = () => {
    const data = PriceListEdit.find((item) => item._id == id);
    if (!data) return;

    setValue("PriceListDate", data.PriceListDate?.slice(0, 10));
    setValue("PriceListName", data.PriceListName);
    setValue("PriceListStatus", data.PriceListStatus);
    setValue("SchemeDateFrom", data.SchemeDateFrom);
      setValue("SchemeDateTo", data.SchemeDateTo);

    const rows = data.PriceListData.map((row) => ({
      id: row._id || Math.random(),
      product: row.product,
      TPSale: row.TPSale,
      TO: row.TO,
      DisPer: row.DisPer,
      SpecialTO: row.SpecialTO,
      IsSchemeRS: row.IsSchemeRS,
      isSchemeBox: row.isSchemeBox,
      schemeBox: row.schemeBox,
      onBox: row.onBox,
      NetSale: row.NetSale,
      SchemeStartDate: row.SchemeStartDate,
      SchemeEndDate: row.SchemeEndDate,
    }));

    setTableData(rows);
  };

  useEffect(() => {
    loadProducts();
    loadPriceList();
  }, []);

  const getProductName = (id) => {
    const p = Products.find((item) => item._id === id);
    return p ? `${p.ProductName} ${p.salesFlowRef}` : "-";
  };

  /* ---------------- DOWNLOAD EXCEL ---------------- */
  const exportToExcel = () => {
    const exportData = tableData.map((row) => ({
      Product: getProductName(row.product),
      TPSale: row.TPSale,
      TO:  row.TO,
      "Scheme Start Date": row.SchemeStartDate || "-",
      "Scheme End Date": row.SchemeEndDate || "-",
      Scheme: row.SchemeStartDate && row.SchemeEndDate ? Number(row.SpecialTO || 0) : 0,
      "Free per Boxes": freeBoxLabel(row),
      "Discount %": row.DisPer,
      "Net Amount": invoiceNetPerBox(row),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Price List");
    XLSX.writeFile(workbook, `PriceList_${id}.xlsx`);
  };

  return (
    <div className="p-4">
      <ToastContainer />

      <h1 className="text-3xl font-bold text-center mb-6">
        View Price List
      </h1>

      <div className="pd-bg-surface p-6 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="font-semibold">Price List Date</label>
            <input
              type="date"
              {...register("PriceListDate")}
              readOnly
              className="w-full px-4 py-2 border rounded pd-bg-muted"
            />
          </div>

          <div>
            <label className="font-semibold">Price List Name</label>
            <input
              type="text"
              {...register("PriceListName")}
              readOnly
              className="w-full px-4 py-2 border rounded pd-bg-muted"
            />
          </div>
          <div>
            <label className="font-semibold">Scheme Date From</label>
            <input
              type="text"
              {...register("SchemeDateFrom")}
              readOnly
              className="w-full px-4 py-2 border rounded pd-bg-muted"
            />
          </div><div>
            <label className="font-semibold">Scheme Date To</label>
            <input
              type="text"
              {...register("SchemeDateTo")}
              readOnly
              className="w-full px-4 py-2 border rounded pd-bg-muted"
            />
          </div>
          <div>
            <label className="font-semibold">Status</label>
            <input
              type="text"
              {...register("PriceListStatus")}
              readOnly
              className="w-full px-4 py-2 border rounded pd-bg-muted"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="pd-bg-muted">
              <tr>
                <th className="border p-2">Product</th>
                <th className="border p-2">TPSale</th>
                <th className="border p-2">TO</th>
                <th className="border p-2">Scheme Start Date</th>
                <th className="border p-2">Scheme End Date</th>
                <th className="border p-2">Scheme </th>
                <th className="border p-2">Free per Boxes</th>
                <th className="border p-2">Discount %</th>
                <th className="border p-2">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  <td className="border p-2">
                    {getProductName(row.product)}
                  </td>
                  <td className="border p-2">{row.TPSale}</td>
                  <td className="border p-2">{ row.TO}</td>
                  <td className="border p-2">{row.SchemeStartDate || "-"}</td>
                  <td className="border p-2">{row.SchemeEndDate || "-"}</td>
                  <td className="border p-2">{row.SchemeStartDate && row.SchemeEndDate ? Number(row.SpecialTO || 0) : 0}</td>
                  <td className="border p-2">{freeBoxLabel(row)}</td>
                  <td className="border p-2">{row.DisPer}</td>
                  <td className="border p-2 font-semibold">
                    {invoiceNetPerBox(row).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-6 py-2 rounded mr-5"
          >
            Download Excel
          </button>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() =>  sendToSND()}
            className="bg-blue-600 text-white px-6 py-2 rounded mr-5"
          >
            Send to SND
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
