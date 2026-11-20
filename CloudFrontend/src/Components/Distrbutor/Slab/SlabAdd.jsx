import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AppSelect from "../../Global/AppSelect.jsx";
import { createDataFunction, getDataFundtion, updateDataFunction } from "../../../Api/CRUDFunctions.jsx";
import { fetchPricelistReducer } from "../../../Redux/Reducers/PricelistReducer.js";
import { fetchSlabReducer } from "../../../Redux/Reducers/SlabReducer.js";

const SlabAdd = ({ editId }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const PriceList1 = useSelector((state) => state.PricelistReducer.PricelistReducer);
  const SlabData = useSelector((state) => state.SlabReducer.SlabReducer);
console.log(PriceList1)
  const [priceListOptions, setPriceListOptions] = useState([]);
  const [selectedPriceList, setSelectedPriceList] = useState(null);

  // Header fields
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [maxPercentage, setMaxPercentage] = useState("");

  // Table rows
  const [slabRows, setSlabRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!editId;

  useEffect(() => {
    const loadData = async () => {
      if (!PriceList1 || PriceList1.length === 0) {
        const res = await getDataFundtion("/PriceList/");
        dispatch(fetchPricelistReducer(res.data));
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (PriceList1 && PriceList1.length > 0) {
      // Filter only active price lists
      const active = PriceList1.filter((p) => p.PriceListStatus === "Active");
      setPriceListOptions(
        active.map((p) => ({
          value: p._id,
          label: `${p.PriceListName} (${p.PriceListNumber})`,
        }))
      );
    }
  }, [PriceList1]);

  // Load existing data for editing
  useEffect(() => {
    if (isEdit && SlabData.length > 0) {
      const slab = SlabData.find((s) => s._id === editId);
      if (slab) {
        setSelectedPriceList(slab.priceList?._id || slab.priceList);
        setFromAmount(slab.fromAmount);
        setToAmount(slab.toAmount);
        setMaxPercentage(slab.maxPercentage);
        setSlabRows(
          slab.slabRows.map((row, idx) => ({
            id: Date.now() + idx,
            from: row.from,
            to: row.to,
            percentage: row.percentage,
          }))
        );
      }
    }
  }, [isEdit, editId, SlabData]);

  /* ─────────────────────────────────────────
   *  VALIDATION
   * ───────────────────────────────────────── */
  const validate = () => {
    const newErrors = {};
    let valid = true;

    if (!selectedPriceList) {
      newErrors.priceList = "Please select a Price List";
      valid = false;
    }
    if (!fromAmount || Number(fromAmount) <= 0) {
      newErrors.fromAmount = "From Amount must be > 0";
      valid = false;
    }
    if (!toAmount || Number(toAmount) <= 0) {
      newErrors.toAmount = "To Amount must be > 0";
      valid = false;
    }
    if (Number(fromAmount) >= Number(toAmount)) {
      newErrors.range = "From Amount must be less than To Amount";
      valid = false;
    }
    if (maxPercentage === "" || Number(maxPercentage) < 0) {
      newErrors.maxPercentage = "Max Percentage must be >= 0";
      valid = false;
    }
    if (!slabRows || slabRows.length === 0) {
      newErrors.rows = "At least one slab row is required";
      valid = false;
    }

    // Validate each row
    const rowErrors = [];
    slabRows.forEach((row, idx) => {
      const rowErr = {};
      const from = Number(row.from);
      const to = Number(row.to);
      const per = Number(row.percentage);

      if (!from || from <= 0) rowErr.from = "Required";
      if (!to || to <= 0) rowErr.to = "Required";
      if (per === "" || per < 0) rowErr.percentage = "Required";

      if (from && to && from >= to) {
        rowErr.range = "From must be < To";
      }

      // First row: from >= header fromAmount
      if (idx === 0 && from < Number(fromAmount)) {
        rowErr.from = `Cannot be < ${fromAmount}`;
      }

      if (idx > 0) {
        const prev = slabRows[idx - 1];
        if (from < Number(prev.from)) {
          rowErr.from = `Cannot be < ${prev.from}`;
        }
        if (from <= Number(prev.to)) {
          rowErr.from = `Must be > ${prev.to}`;
        }
      }

      // Last row: to <= header toAmount
      if (idx === slabRows.length - 1 && to > Number(toAmount)) {
        rowErr.to = `Cannot exceed ${toAmount}`;
      }

      // Percentage <= maxPercentage
      if (per > Number(maxPercentage)) {
        rowErr.percentage = `Max ${maxPercentage}%`;
      }

      if (Object.keys(rowErr).length > 0) {
        rowErrors[idx] = rowErr;
      }
    });

    if (rowErrors.length > 0) {
      newErrors.rowErrors = rowErrors;
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  /* ─────────────────────────────────────────
   *  ROW MANAGEMENT
   * ───────────────────────────────────────── */
  const addRow = () => {
    const lastRow = slabRows[slabRows.length - 1];
    const newFrom = lastRow ? Number(lastRow.to) + 1 : Number(fromAmount);
    const newTo = lastRow ? Number(lastRow.to) + 1000 : Number(fromAmount) + 1000;

    setSlabRows([
      ...slabRows,
      {
        id: Date.now(),
        from: newFrom,
        to: newTo > Number(toAmount) ? Number(toAmount) : newTo,
        percentage: 0,
      },
    ]);
  };

  const removeRow = (id) => {
    if (slabRows.length <= 1) {
      return toast.error("At least one row is required");
    }
    setSlabRows(slabRows.filter((row) => row.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setSlabRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  /* ─────────────────────────────────────────
   *  SUBMIT
   * ───────────────────────────────────────── */
  const onSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        priceList: selectedPriceList,
        fromAmount: Number(fromAmount),
        toAmount: Number(toAmount),
        maxPercentage: Number(maxPercentage),
        slabRows: slabRows.map((row) => ({
          from: Number(row.from),
          to: Number(row.to),
          percentage: Number(row.percentage),
        })),
      };

      if (isEdit) {
        await updateDataFunction(`/Slab/${editId}`, payload);
        toast.success("Slab updated successfully");
      } else {
        await createDataFunction("/Slab", payload);
        toast.success("Slab created successfully");
      }
      setTimeout(() => navigate("/Slab"), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────
   *  RENDER
   * ───────────────────────────────────────── */
  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:pd-page-title text-center mb-6">
        {isEdit ? "Edit Slab" : "Create Slab"}
      </h1>

      <div className="pd-card p-4 md:p-6 space-y-6">
        {/* ─── HEADER SECTION ─── */}
        <div className="border-b pb-4">
          <h2 className="text-lg font-semibold mb-4 text-[var(--pd-primary)]">
            Slab Header
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Price List */}
            <div>
              <label className="pd-label">
                Price List <span className="text-red-500">*</span>
              </label>
              <AppSelect
                options={priceListOptions}
                value={priceListOptions.find((o) => o.value === selectedPriceList) || null}
                onChange={(selected) => setSelectedPriceList(selected?.value || null)}
                placeholder="Select Price List..."
                className={errors.priceList ? "border-red-500" : ""}
              />
              {errors.priceList && (
                <p className="text-red-500 text-xs mt-1">{errors.priceList}</p>
              )}
            </div>

            {/* From Amount */}
            <div>
              <label className="pd-label">
                From Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={`pd-input ${errors.fromAmount || errors.range ? "border-red-500" : ""}`}
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0"
              />
              {errors.fromAmount && (
                <p className="text-red-500 text-xs mt-1">{errors.fromAmount}</p>
              )}
            </div>

            {/* To Amount */}
            <div>
              <label className="pd-label">
                To Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={`pd-input ${errors.toAmount || errors.range ? "border-red-500" : ""}`}
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                placeholder="0"
              />
              {errors.toAmount && (
                <p className="text-red-500 text-xs mt-1">{errors.toAmount}</p>
              )}
              {errors.range && (
                <p className="text-red-500 text-xs mt-1">{errors.range}</p>
              )}
            </div>

            {/* Max Percentage */}
            <div>
              <label className="pd-label">
                Max Percentage <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={`pd-input ${errors.maxPercentage ? "border-red-500" : ""}`}
                value={maxPercentage}
                onChange={(e) => setMaxPercentage(e.target.value)}
                placeholder="0"
                step="0.01"
              />
              {errors.maxPercentage && (
                <p className="text-red-500 text-xs mt-1">{errors.maxPercentage}</p>
              )}
            </div>
          </div>
        </div>

        {/* ─── TABLE SECTION ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--pd-primary)]">
              Slab Rows
            </h2>
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add Row
            </button>
          </div>

          {errors.rows && (
            <p className="text-red-500 text-sm mb-2">{errors.rows}</p>
          )}

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left w-12">#</th>
                  <th className="border p-2 text-left">From</th>
                  <th className="border p-2 text-left">To</th>
                  <th className="border p-2 text-left">Percentage (%)</th>
                  <th className="border p-2 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {slabRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border p-6 text-center text-gray-400">
                      No rows added yet. Click "+ Add Row" to begin.
                    </td>
                  </tr>
                ) : (
                  slabRows.map((row, idx) => {
                    const rowErr = errors.rowErrors?.[idx] || {};
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          Object.keys(rowErr).length > 0 ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="border p-2 text-center font-medium text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="border p-2">
                          <input
                            type="number"
                            className={`w-full p-1.5 border rounded text-sm ${
                              rowErr.from ? "border-red-400 bg-red-50" : ""
                            }`}
                            value={row.from}
                            onChange={(e) => handleRowChange(row.id, "from", e.target.value)}
                          />
                          {rowErr.from && (
                            <p className="text-red-500 text-xs mt-0.5">{rowErr.from}</p>
                          )}
                        </td>
                        <td className="border p-2">
                          <input
                            type="number"
                            className={`w-full p-1.5 border rounded text-sm ${
                              rowErr.to ? "border-red-400 bg-red-50" : ""
                            }`}
                            value={row.to}
                            onChange={(e) => handleRowChange(row.id, "to", e.target.value)}
                          />
                          {rowErr.to && (
                            <p className="text-red-500 text-xs mt-0.5">{rowErr.to}</p>
                          )}
                          {rowErr.range && (
                            <p className="text-red-500 text-xs mt-0.5">{rowErr.range}</p>
                          )}
                        </td>
                        <td className="border p-2">
                          <input
                            type="number"
                            className={`w-full p-1.5 border rounded text-sm ${
                              rowErr.percentage ? "border-red-400 bg-red-50" : ""
                            }`}
                            value={row.percentage}
                            onChange={(e) =>
                              handleRowChange(row.id, "percentage", e.target.value)
                            }
                            step="0.01"
                          />
                          {rowErr.percentage && (
                            <p className="text-red-500 text-xs mt-0.5">
                              {rowErr.percentage}
                            </p>
                          )}
                        </td>
                        <td className="border p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            title="Remove row"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── VALIDATION SUMMARY ─── */}
        {errors.rowErrors && errors.rowErrors.some((e) => e) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm font-semibold mb-1">
              Validation Errors:
            </p>
            <ul className="list-disc list-inside text-red-500 text-xs space-y-0.5">
              {errors.rowErrors.map(
                (rowErr, idx) =>
                  rowErr &&
                  Object.entries(rowErr).map(([field, msg]) => (
                    <li key={`${idx}-${field}`}>
                      Row {idx + 1} - {field}: {msg}
                    </li>
                  ))
              )}
            </ul>
          </div>
        )}

        {/* ─── SUBMIT ─── */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/Slab")}
            className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="pd-btn-save"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Saving..." : isEdit ? "Update Slab" : "Save Slab"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlabAdd;
