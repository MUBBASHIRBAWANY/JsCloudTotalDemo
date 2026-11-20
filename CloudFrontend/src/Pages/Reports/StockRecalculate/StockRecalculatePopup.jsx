import React, { useEffect, useState } from 'react';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { toast, ToastContainer } from 'react-toastify';
import ReportPopupHeader from '../../../Components/Global/ReportPopupHeader.jsx';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const StockRecalculatePopup = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [updateLog, setUpdateLog] = useState([]);

  const qtyType = data.qtyType;

  const getData = async () => {
    try {
      setIsLoading(true);
      const store = Array.isArray(data.store) ? data.store.join(",") : (data.store || "");
      const status = data.status || "Post";
      const damage = data.damage || "Fresh";
      const result = await getDataFundtion(
        `/InventoryReport/StockFlowReport?startDate=${data.startDate}&endDate=${data.endDate}&status=${status}&Store=${store}&damage=${damage}`
      );
      const source = Array.isArray(result?.rows) ? result.rows : [];
      const num = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      };
      setRows(source.map((item) => ({
        ...item,
        id: item.id || item.productId || item.product,
        productId: item.productId || item.product || item.id,
        productName: item.productName || "Unknown",
        SkuCode: item.SkuCode || "",
        TotalopenigQty: num(item.TotalopenigQty),
        purchasedBoxes: num(item.purchasedBoxes),
        soldBoxes: num(item.soldBoxes),
        totalOutBoxes: num(item.totalOutBoxes),
        totalInBoxes: num(item.totalInBoxes),
        totalBoxesReplacementFrom: num(item.totalBoxesReplacementFrom),
        remainingBoxes: num(item.remainingBoxes),
        remainingBoxesValue: num(item.remainingBoxesValue),
        remainingBoxesValueWithGst: num(item.remainingBoxesValueWithGst),
        boxInCarton: num(item.boxInCarton) || 1,
        PcsinBox: num(item.PcsinBox) || 1,
      })));
    } catch (error) {
      console.error("Error fetching stock flow report:", error);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [data]);

  // ---- RECALCULATE: send each product one-by-one to /totalproduct/updateProductRate ----
  const handleRecalculate = async () => {
    if (rows.length === 0) {
      alert('No data to recalculate. Please load the report first.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to recalculate stock for ${rows.length} products?\n\nThis will update each product one by one via API.`
    );
    if (!confirmed) return;

    setIsUpdating(true);
    setUpdateProgress({ current: 0, total: rows.length, success: 0, failed: 0 });
    setUpdateLog([]);

    const logs = [];

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      setUpdateProgress({ current: i + 1, total: rows.length, success: 0, failed: 0 });

      try {
        const payload = {
          product: item.productId || item.product || item.id,
          store: Array.isArray(data.store) ? data.store[0] : data.store,
          Rate: item.remainingBoxes > 0 ? Number((item.remainingBoxesValue / item.remainingBoxes).toFixed(4)) : 0,
          qty: item.remainingBoxes,
          amount: item.remainingBoxesValue
        };

        const res = await updateDataFunction('/totalproduct/updateProductRate', payload);
        logs.push({ name: item.productName, status: 'success', message: 'Updated' });
      } catch (err) {
        console.error(`Error updating product ${item.productName}:`, err);
        logs.push({ name: item.productName, status: 'failed', message: err.message || 'Failed' });
      }

      setUpdateProgress(prev => ({
        ...prev,
        current: i + 1,
        success: logs.filter(l => l.status === 'success').length,
        failed: logs.filter(l => l.status === 'failed').length,
      }));
    }

    setUpdateLog(logs);
    setIsUpdating(false);

    const successCount = logs.filter(l => l.status === 'success').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;
    alert(`Stock Recalculation Complete!\n\nSuccess: ${successCount}\nFailed: ${failedCount}`);
  };

  const exportToExcel = async () => {
    if (!rows.length) {
      toast.warning('No data to export');
      return;
    }

    const showBox = qtyType === 'Three' || qtyType === 'Box';
    const showCarton = qtyType === 'Three' || qtyType === 'Carton';
    const showUnit = qtyType === 'Three' || qtyType === 'Unit';
    const storeNames = data.store?.length > 0
      ? (data.allStore || []).filter((s) => data.store.includes(s._id)).map((s) => s.StoreName).join(', ')
      : 'All';

    const exportRows = rows.map((item, index) => {
      const row = {
        'Sr No': index + 1,
        'SKU Name': item.productName || '',
        'SKU Code': item.SkuCode || '',
      };
      if (showBox) row['Opening (Box)'] = Number(item.TotalopenigQty) || 0;
      if (showCarton) row['Opening (Carton)'] = Number(item.TotalopenigQty / (item.boxInCarton || 1)) || 0;
      if (showUnit) row['Opening (Unit)'] = Number(item.TotalopenigQty * (item.PcsinBox || 1)) || 0;
      if (showBox) row['Purchase (Box)'] = Number(item.purchasedBoxes) || 0;
      if (showCarton) row['Purchase (Carton)'] = Number(item.purchasedBoxes / (item.boxInCarton || 1)) || 0;
      if (showUnit) row['Purchase (Unit)'] = Number(item.purchasedBoxes * (item.PcsinBox || 1)) || 0;
      if (showBox) row['Sale (Box)'] = Number(item.soldBoxes) || 0;
      if (showCarton) row['Sale (Carton)'] = Number(item.soldBoxes / (item.boxInCarton || 1)) || 0;
      if (showUnit) row['Sale (Unit)'] = Number(item.soldBoxes * (item.PcsinBox || 1)) || 0;
      if (showBox) row['Transfer Out (Box)'] = Number(item.totalOutBoxes) || 0;
      if (showCarton) row['Transfer Out (Carton)'] = Number(item.totalOutBoxes / (item.boxInCarton || 1)) || 0;
      if (showUnit) row['Transfer Out (Unit)'] = Number(item.totalOutBoxes * (item.PcsinBox || 1)) || 0;
      if (showBox) row['Transfer In (Box)'] = Number(item.totalInBoxes) || 0;
      if (showCarton) row['Transfer In (Carton)'] = Number(item.totalInBoxes / (item.boxInCarton || 1)) || 0;
      if (showUnit) row['Transfer In (Unit)'] = Number(item.totalInBoxes * (item.PcsinBox || 1)) || 0;
      if (showBox) row['Replacement (Box)'] = Number(item.totalBoxesReplacementFrom) || 0;
      if (showCarton) row['Replacement (Carton)'] = Number(item.totalBoxesReplacementFrom / (item.boxInCarton || 1)) || 0;
      if (showUnit) row['Replacement (Unit)'] = Number(item.totalBoxesReplacementFrom * (item.PcsinBox || 1)) || 0;
      if (showBox) row['Remaining (Box)'] = Number(item.remainingBoxes) || 0;
      if (showCarton) row['Remaining (Carton)'] = Number(item.remainingBoxes / (item.boxInCarton || 1)) || 0;
      if (showUnit) row['Remaining (Unit)'] = Number(item.remainingBoxes * (item.PcsinBox || 1)) || 0;
      row['Remaining Value'] = Number(item.remainingBoxesValue) || 0;
      row['Remaining Value + GST'] = Number(item.remainingBoxesValueWithGst) || 0;
      return row;
    });

    try {
      await exportProfessionalExcel({
        title: 'Stock Recalculate',
        fileName: 'Stock_Recalculate',
        sheetName: 'Stock Recalculate',
        rows: exportRows,
        meta: [
          `Period: ${data.startDate} to ${data.endDate}`,
          `Qty: ${qtyType}`,
          `Store: ${storeNames}`,
        ],
        excludeKeys: ['_id', 'id', 'productId'],
      });
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to export Excel');
    }
  };

  return (
    <div className="sales-report-container">
      <ToastContainer />
      <ReportPopupHeader title="Stock Recalculate" />

      <div className="sales-report-header">
        <div className="company-info">
          <div className="company-name">Pearl Dynamic</div>
          <div className="company-address">123 Business Avenue, City, Country</div>
        </div>
        <div className="report-info">
          <div className="report-title">Stock Recalculate</div>
          <div className="report-date">Generated: {new Date().toLocaleDateString()}</div>
          <div className="report-range">Period: {data.startDate} to {data.endDate}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="report-controls">
        <div className="summary-stats">
          <div className="stat-item">From: {data.startDate}</div>
          <div className="stat-item">To: {data.endDate}</div>
          <div className="stat-item">Qty: {qtyType}</div>
          <div className="stat-item">Store: {
            data.store.length > 0
              ? data.allStore.filter((s) => data.store.includes(s._id)).map((s) => s.StoreName).join(', ')
              : 'All'
          }</div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isUpdating && (
            <div style={{ fontSize: '13px', color: '#333', fontWeight: 600 }}>
              {updateProgress.current}/{updateProgress.total} | ✅ {updateProgress.success} | ❌ {updateProgress.failed}
            </div>
          )}
          <button
            className="btn btn-excel"
            onClick={exportToExcel}
            disabled={isUpdating || isLoading || !rows.length}
          >
            Download Excel
          </button>
          <button
            className="btn btn-recalculate"
            onClick={handleRecalculate}
            disabled={isUpdating || isLoading}
          >
            {isUpdating ? 'Recalculating...' : 'Recalculate Stock'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading ? (
          <div className="loader-wrapper"><div className="spinner"></div></div>
        ) : (
          <table className="sales-data-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ minWidth: '200px' }}>SKU Name</th>
                <th>SKU Code</th>
                {qtyType === 'Three' || qtyType === 'Box' ? <th>Opening (Box)</th> : null}
                {qtyType === 'Three' || qtyType === 'Carton' ? <th>Opening (Carton)</th> : null}
                {qtyType === 'Three' || qtyType === 'Unit' ? <th>Opening (Unit)</th> : null}
                {qtyType === 'Three' || qtyType === 'Box' ? <th>Purchase (Box)</th> : null}
                {qtyType === 'Three' || qtyType === 'Carton' ? <th>Purchase (Carton)</th> : null}
                {qtyType === 'Three' || qtyType === 'Unit' ? <th>Purchase (Unit)</th> : null}
                {qtyType === 'Three' || qtyType === 'Box' ? <th>Sale (Box)</th> : null}
                {qtyType === 'Three' || qtyType === 'Carton' ? <th>Sale (Carton)</th> : null}
                {qtyType === 'Three' || qtyType === 'Unit' ? <th>Sale (Unit)</th> : null}
                {qtyType === 'Three' || qtyType === 'Box' ? <th>Transfer Out (Box)</th> : null}
                {qtyType === 'Three' || qtyType === 'Carton' ? <th>Transfer Out (Carton)</th> : null}
                {qtyType === 'Three' || qtyType === 'Unit' ? <th>Transfer Out (Unit)</th> : null}
                {qtyType === 'Three' || qtyType === 'Box' ? <th>Transfer In (Box)</th> : null}
                {qtyType === 'Three' || qtyType === 'Carton' ? <th>Transfer In (Carton)</th> : null}
                {qtyType === 'Three' || qtyType === 'Unit' ? <th>Transfer In (Unit)</th> : null}
                {qtyType === 'Three' || qtyType === 'Box' ? <th>Replacement (Box)</th> : null}
                {qtyType === 'Three' || qtyType === 'Carton' ? <th>Replacement (Carton)</th> : null}
                {qtyType === 'Three' || qtyType === 'Unit' ? <th>Replacement (Unit)</th> : null}
                {qtyType === 'Three' || qtyType === 'Box' ? <th>Remaining (Box)</th> : null}
                {qtyType === 'Three' || qtyType === 'Carton' ? <th>Remaining (Carton)</th> : null}
                {qtyType === 'Three' || qtyType === 'Unit' ? <th>Remaining (Unit)</th> : null}
                <th>Remaining Value</th>
                <th>Remaining Value + GST</th>
                {isUpdating ? <th>Status</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((item, index) => {
                  const log = updateLog.find(l => l.name === item.productName);
                  return (
                    <tr key={item.id} style={log?.status === 'failed' ? { backgroundColor: '#fee2e2' } : log?.status === 'success' ? { backgroundColor: '#f0fdf4' } : {}}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td>{item.productName}</td>
                      <td>{item.SkuCode}</td>
                      {qtyType === 'Three' || qtyType === 'Box' ? <td className="numeric">{item.TotalopenigQty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Carton' ? <td className="numeric">{(item.TotalopenigQty / (item.boxInCarton || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Unit' ? <td className="numeric">{(item.TotalopenigQty * (item.PcsinBox || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Box' ? <td className="numeric">{item.purchasedBoxes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Carton' ? <td className="numeric">{(item.purchasedBoxes / (item.boxInCarton || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Unit' ? <td className="numeric">{(item.purchasedBoxes * (item.PcsinBox || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Box' ? <td className="numeric">{item.soldBoxes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Carton' ? <td className="numeric">{(item.soldBoxes / (item.boxInCarton || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Unit' ? <td className="numeric">{(item.soldBoxes * (item.PcsinBox || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Box' ? <td className="numeric">{item.totalOutBoxes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Carton' ? <td className="numeric">{(item.totalOutBoxes / (item.boxInCarton || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Unit' ? <td className="numeric">{(item.totalOutBoxes * (item.PcsinBox || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Box' ? <td className="numeric">{item.totalInBoxes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Carton' ? <td className="numeric">{(item.totalInBoxes / (item.boxInCarton || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Unit' ? <td className="numeric">{(item.totalInBoxes * (item.PcsinBox || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Box' ? <td className="numeric">{item.totalBoxesReplacementFrom.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Carton' ? <td className="numeric">{(item.totalBoxesReplacementFrom / (item.boxInCarton || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Unit' ? <td className="numeric">{(item.totalBoxesReplacementFrom * (item.PcsinBox || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Box' ? <td className="numeric">{item.remainingBoxes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Carton' ? <td className="numeric">{(item.remainingBoxes / (item.boxInCarton || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      {qtyType === 'Three' || qtyType === 'Unit' ? <td className="numeric">{(item.remainingBoxes * (item.PcsinBox || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> : null}
                      <td className="numeric">{item.remainingBoxesValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="numeric">{item.remainingBoxesValueWithGst.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      {isUpdating ? <td style={{ textAlign: 'center' }}>{log?.status === 'success' ? '✅' : log?.status === 'failed' ? '❌' : isUpdating && updateProgress.current === index + 1 ? '⏳' : ''}</td> : null}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={25} className="no-data">
                    No data available for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .sales-report-container {
          font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          margin: 20px auto;
          max-width: 1400px;
          color: #333;
          position: relative;
          overflow: scroll;
        }

        .sales-report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eaeaea;
        }

        .company-name { font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0 0 8px 0; }
        .company-address, .company-contact { font-size: 12px; color: #7f8c8d; margin: 4px 0; }
        .report-title { font-size: 20px; font-weight: 600; color: #3498db; margin: 0 0 8px 0; }
        .report-date, .report-range { font-size: 12px; color: #7f8c8d; margin: 4px 0; }

        .report-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .summary-stats { display: flex; gap: 16px; flex-wrap: wrap; }
        .stat-item { font-size: 13px; color: #555; padding: 6px 12px; background: #f8f9fa; border-radius: 4px; }

        .table-container {
          overflow-x: auto;
          overflow-y: hidden;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 20px;
          min-height: 300px;
        }

        .sales-data-table {
          min-width: 1200px;
          border-collapse: collapse;
          font-size: 12px;
          width: 100%;
        }

        .sales-data-table th {
          background: #f8f9fa;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
          position: sticky;
          top: 0;
        }

        .sales-data-table td {
          padding: 8px;
          border-bottom: 1px solid #eaeaea;
        }

        .sales-data-table tbody tr:hover { background-color: #f8f9fa; }
        .numeric { text-align: right; font-family: 'Courier New', monospace; }
        .no-data { text-align: center; padding: 30px; color: #95a5a6; font-style: italic; }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-excel {
          background: #217346;
          color: white;
        }

        .btn-excel:hover:not(:disabled) {
          background: #1a5c38;
          transform: translateY(-1px);
        }

        .btn-excel:disabled {
          background: #95a5a6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-recalculate {
          background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
          color: white;
        }

        .btn-recalculate:hover:not(:disabled) {
          background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(230, 126, 34, 0.4);
        }

        .btn-recalculate:disabled {
          background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
          cursor: not-allowed;
          transform: none;
        }

        .loader-wrapper { display: flex; justify-content: center; align-items: center; height: 200px; }
        .spinner { width: 48px; height: 48px; border: 6px solid #ccc; border-top: 6px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        @media print {
          .report-controls { display: none; }
          .table-container { overflow: visible; border: none; }
        }
      `}</style>
    </div>
  );
};

export default StockRecalculatePopup;
