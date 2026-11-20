import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getDataFundtion, SndcreateDataFunction } from "../../../Api/CRUDFunctions.jsx";
import { ToastContainer, toast } from "react-toastify";

const SlabView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [slab, setSlab] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getDataFundtion(`/Slab/${id}`);
        setSlab(res.data || res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const slabSentoSND = async () =>{
    try{
      const data = await SndcreateDataFunction("/Slab" ,slab)
        toast.success("Slab created successfully");
        setTimeout(() => navigate("/Slab"), 1500);
    }catch(err){
      console.log(err)
toast.error("Some thing went wrong");
    }
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!slab) {
    return (
      <div className="p-6 text-center text-gray-500">
        Slab not found.{" "}
        <button onClick={() => navigate("/Slab")} className="text-blue-600 underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Slab Details</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/SlabEdit/${slab._id}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Edit
          </button>
           <button
            onClick={() => slabSentoSND()}
            className="px-4 py-2 bg-blue-200 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Send to SND
          </button>
          <button
            onClick={() => navigate("/Slab")}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Back to List
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="pd-card p-4 md:p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-[var(--pd-primary)]">
          Slab Header
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500">Price List</label>
            <p className="font-semibold">
              {slab.priceList?.PriceListName || "-"}
              {slab.priceList?.PriceListNumber
                ? ` (${slab.priceList.PriceListNumber})`
                : ""}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500">From Amount</label>
            <p className="font-semibold">
              {Number(slab.fromAmount || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500">To Amount</label>
            <p className="font-semibold">
              {Number(slab.toAmount || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Max Percentage</label>
            <p className="font-semibold">{slab.maxPercentage || 0}%</p>
          </div>
        </div>
      </div>

      {/* Slab Rows */}
      <div className="pd-card p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4 text-[var(--pd-primary)]">
          Slab Rows
        </h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">#</th>
                <th className="border p-2 text-left">From Amount</th>
                <th className="border p-2 text-left">To Amount</th>
                <th className="border p-2 text-left">Percentage (%)</th>
              </tr>
            </thead>
            <tbody>
              {slab.slabRows?.length > 0 ? (
                slab.slabRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">
                      {Number(row.from || 0).toLocaleString()}
                    </td>
                    <td className="border p-2">
                      {Number(row.to || 0).toLocaleString()}
                    </td>
                    <td className="border p-2">{row.percentage || 0}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="border p-4 text-center text-gray-400">
                    No slab rows defined
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SlabView;
