import React, { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction } from '../../Api/CurdFunctions';
import { isAdminUser } from '../Global/distributorAccess';

const StockAdjustmentUpload = () => {
  const navigate = useNavigate();
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail);
  const Products = useSelector((state) => state.Product.product);
  const Distributors = useSelector((state) => state.DistributroReducers.DistributroReducers);

  useEffect(() => {
    if (!isAdminUser(loginuser)) {
      navigate('/');
    }
  }, [loginuser, navigate]);
console.log(Distributors)
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [hide, setHide] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build a lookup map for products by salesFlowRef (code)
  const productMap = useMemo(() => {
    const map = {};
    Products.forEach((p) => {
      if (p.salesFlowRef) map[p.salesFlowRef.toString().trim()] = p;
    });
    return map;
  }, [Products]);

  // Build a lookup map for distributors by name (case-insensitive)
  const distributorMap = useMemo(() => {
    const map = {};
    Distributors.forEach((d) => {
      map[d.DistrbutorName.toString().trim().toLowerCase()] = d;
    });
    return map;
  }, [Distributors]);

  const downloadTemplate = () => {
    const template = [
      {
        Distributor: 'Enter Distributor Name',
        'Product Code': 'Enter SKU / salesFlowRef',
        'Adjustment Date': 'YYYY-MM-DD',
        Type: 'Add',
        Box: 1,
        Carton: 0,
        Unit: 0,
        Reason: 'Optional reason',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Stock_Adjustment_Upload_Template.xlsx');
    toast.success('Template downloaded!');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'array' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      const firstRow = XLSX.utils.sheet_to_json(ws, { header: 1 })[0];

      if (jsonData.length === 0) {
        toast.error('Excel file is empty');
        return;
      }

      setData(jsonData);
      setHeaders(firstRow);
      setHide(true);
      toast.success(`${jsonData.length} rows loaded`);
    };

    reader.readAsArrayBuffer(file);
  };

  // Validate and resolve each row
  const resolvedData = useMemo(() => {
    return data.map((row, index) => {
      const distName = (row.Distributor || '').toString().trim();
      const distMatch = distributorMap[distName.toLowerCase()];
      const productCode = (row['Product Code'] || '').toString().trim();
      const prodMatch = productMap[productCode];
      const type = (row.Type || '').toString().trim();
      const adjustmentDate = (row['Adjustment Date'] || '').toString().trim();

      return {
        _rowNum: index + 1,
        distributorName: distName,
        distributorId: distMatch?._id || null,
        distributorFound: !!distMatch,
        productCode: productCode,
        productId: prodMatch?._id || null,
        productName: prodMatch?.ProductName || '',
        productFound: !!prodMatch,
        adjustmentDate: adjustmentDate,
        type: type === 'Add' || type === 'Less' ? type : '',
        typeValid: type === 'Add' || type === 'Less',
        Box: parseInt(row.Box) || 0,
        Carton: parseInt(row.Carton) || 0,
        Unit: parseInt(row.Unit) || 0,
        Reason: (row.Reason || '').toString().trim(),
        dateValid: /^\d{4}-\d{2}-\d{2}$/.test(adjustmentDate),
      };
    });
  }, [data, distributorMap, productMap]);

  const errorCount = resolvedData.filter(
    (r) => !r.distributorFound || !r.productFound || !r.typeValid || !r.dateValid || r.Box <= 0
  ).length;

  const downloadErrors = () => {
    const errorRows = resolvedData
      .filter(
        (r) => !r.distributorFound || !r.productFound || !r.typeValid || !r.dateValid || r.Box <= 0
      )
      .map((r) => {
        const errors = [];
        if (!r.distributorFound) errors.push(`Distributor "${r.distributorName}" not found`);
        if (!r.productFound) errors.push(`Product "${r.productCode}" not found`);
        if (!r.typeValid) errors.push(`Type must be "Add" or "Less"`);
        if (!r.dateValid) errors.push(`Date must be YYYY-MM-DD format`);
        if (r.Box <= 0) errors.push(`Box must be > 0`);
        return {
          Row: r._rowNum,
          Distributor: r.distributorName,
          'Product Code': r.productCode,
          'Adjustment Date': r.adjustmentDate,
          Type: r.type,
          Box: r.Box,
          Errors: errors.join('; '),
        };
      });
    const ws = XLSX.utils.json_to_sheet(errorRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');
    XLSX.writeFile(wb, 'Stock_Adjustment_Upload_Errors.xlsx');
    toast.error(`Downloaded ${errorRows.length} error rows`);
  };

  const onSubmit = async () => {
    if (errorCount > 0) {
      toast.error(`Please fix ${errorCount} error(s) first. Download error file to see details.`);
      return;
    }

    setIsSubmitting(true);

    // Group rows by Distributor + Date + Reason
    const grouped = {};
    resolvedData.forEach((row) => {
      const key = `${row.distributorId}|${row.adjustmentDate}|${row.Reason}`;
      if (!grouped[key]) {
        grouped[key] = {
          Distrbutor: row.distributorId,
          AdjustmentDate: row.adjustmentDate,
          Reason: row.Reason,
          CreatedBy: loginuser?._id || loginuser?.email,
          Adjustments: [],
        };
      }
      grouped[key].Adjustments.push({
        product: row.productId,
        adjustmentType: row.type,
        Box: row.Box,
        Carton: row.Carton,
        Unit: row.Unit,
      });
    });

    const payloads = Object.values(grouped);
    let successCount = 0;
    let failCount = 0;

    for (const payload of payloads) {
      try {
        await createDataFunction('/StockAdjustment', payload);
        successCount++;
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    setIsSubmitting(false);

    if (failCount === 0) {
      toast.success(`${successCount} Stock Adjustment(s) created successfully!`);
      setTimeout(() => navigate('/StockAdjustmentList'), 2000);
    } else {
      toast.warning(`${successCount} created, ${failCount} failed`);
      if (successCount > 0) {
        setTimeout(() => navigate('/StockAdjustmentList'), 2000);
      }
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800 mb-6">
        Stock Adjustment - Bulk Upload
      </h1>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        {/* Step 1: Template */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Step 1: Download Template</h2>
          <p className="text-sm text-gray-500 mb-3">
            Download the Excel template, fill in your data, then upload it below.
          </p>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
          >
            📥 Download Template
          </button>
        </div>

        {/* Step 2: Upload */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Step 2: Upload Excel File</h2>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Error Summary */}
        {hide && errorCount > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-700 font-semibold">
                ⚠️ {errorCount} row(s) have errors. Fix them before uploading.
              </p>
              <button
                onClick={downloadErrors}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                📥 Download Errors
              </button>
            </div>
          </div>
        )}

        {/* Data Preview */}
        {hide && data.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Step 3: Preview Data ({data.length} rows)
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md max-h-[500px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Row
                    </th>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"
                      >
                        {header}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-red-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {resolvedData.map((row, rowIndex) => {
                    const hasError =
                      !row.distributorFound ||
                      !row.productFound ||
                      !row.typeValid ||
                      !row.dateValid ||
                      row.Box <= 0;
                    return (
                      <tr
                        key={rowIndex}
                        className={
                          hasError
                            ? 'bg-red-50'
                            : rowIndex % 2 === 0
                            ? 'bg-white'
                            : 'bg-gray-50'
                        }
                      >
                        <td className="px-4 py-3 text-gray-700 font-medium">{row._rowNum}</td>
                        {headers.map((header, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-4 py-3 whitespace-nowrap text-gray-700"
                          >
                            {row[header] || ''}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          {hasError ? (
                            <span className="text-red-600 text-xs font-semibold">
                              {!row.distributorFound && '❌ Distributor not found '}
                              {!row.productFound && '❌ Product not found '}
                              {!row.typeValid && '❌ Invalid Type '}
                              {!row.dateValid && '❌ Invalid Date '}
                              {row.Box <= 0 && '❌ Box must be > 0 '}
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs font-semibold">✅ OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Submit */}
        {hide && data.length > 0 && (
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => {
                setData([]);
                setHeaders([]);
                setHide(false);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
            >
              Clear
            </button>
            <button
              onClick={onSubmit}
              disabled={isSubmitting || errorCount > 0}
              className={`px-6 py-2 text-white rounded-lg text-sm font-semibold ${
                isSubmitting || errorCount > 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isSubmitting ? '⏳ Submitting...' : `🚀 Upload ${data.length} Rows`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockAdjustmentUpload;
