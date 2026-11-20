import React, { useState, useEffect } from 'react';
import { getDataFundtion } from '../../Api/CRUDFunctions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReportPageLayout from '../../Components/Global/ReportPageLayout.jsx';
import { exportProfessionalExcel } from '../../utils/exportProfessionalExcel';


const InventoryValuationReport = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [date, setDate] = useState(null);
  const [Allproduct, setAllproduct] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const getData = async (date) => {
    setLoading(true);
    try {
      const data = await getDataFundtion(`InventoryReport/GetDataByDate?startDate=${date}&endDate=${date}&status=Post`);
      const openingData = data.filter((item) => "opneingQty" in item);
      const purchaseDataBefore = data.filter((item) => "totalPurchaseBoxBefore" in item);
      const purchaseData = data.filter((item) => "totalPurchaseBox" in item);
      const totalSaleBox = data.filter((item) => "totalSaleBox" in item);
      const totalSaleBoxBefore = data.filter((item) => "totalSaleBoxBefore" in item);
      const products = await getDataFundtion('/product');
      setAllproduct(products.data);

      const aggregateSales = () => {
        const combined = {};
        totalSaleBox.forEach(item => {
          const id = item.product;
          if (!combined[id]) {
            combined[id] = { product: id, totalSaleBox: 0, totalSaleUnits: 0, totalValueExclGst: 0 };
          }
          combined[id].totalSaleBox += Number(item.totalSaleBox) || 0;
          combined[id].totalSaleUnits += Number(item.totalSaleUnits) || 0;
          combined[id].totalValueExclGst += Number(item.totalValueExclSaleGst) || 0;
        });
        totalSaleBoxBefore.forEach(item => {
          const id = item.product;
          if (!combined[id]) {
            combined[id] = { product: id, totalSaleBox: 0, totalSaleUnits: 0, totalValueExclGst: 0 };
          }
          combined[id].totalSaleBox += Number(item.totalSaleBoxBefore) || 0;
          combined[id].totalValueExclGst += Number(item.TotalValueExclGstBefore) || 0;
        });
        return Object.values(combined);
      };

      const aggregatedSalesData = aggregateSales();

      const aggregatePurchases = () => {
        const combined = {};
        purchaseDataBefore.forEach(item => {
          const id = item.product;
          if (!combined[id]) {
            combined[id] = { product: id, totalPurchaseBox: 0, totalPurchaseValueExclGst: 0 };
          }
          combined[id].totalPurchaseBox += Number(item.totalPurchaseBoxBefore) || 0;
          combined[id].totalPurchaseValueExclGst += Number(item.totalPurchaseValueExclGst) || 0;
        });
        purchaseData.forEach(item => {
          const id = item.product;
          if (!combined[id]) {
            combined[id] = { product: id, totalPurchaseBox: 0, totalPurchaseValueExclGst: 0 };
          }
          combined[id].totalPurchaseBox += Number(item.totalPurchaseBox) || 0;
          combined[id].totalPurchaseValueExclGst += item.totalPurchaseValueExclGst || 0;
        });
        return Object.values(combined);
      };

      const aggregatedData = aggregatePurchases();
      const summary = calculateFinalSummary(openingData, aggregatedData, aggregatedSalesData);
      setRows(summary);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  function calculateFinalSummary(opening, purchases, sales) {
    const allProducts = new Set([
      ...opening.map((o) => o.product),
      ...purchases.map((p) => p.product),
      ...sales.map((s) => s.product)
      
    ]);
    const summary = [];

    allProducts.forEach((product) => {
      const productTransactions = [];
      opening.filter(o => o.product === product).forEach((o) => {
        productTransactions.push({ date: new Date('2025-01-01'), type: 'Opening', qty: o.opneingQty, unitCost: o.ValueExclGst });
      });
      purchases.filter(p => p.product === product).forEach((p) => {
        productTransactions.push({ date: new Date(p.PurchaseInvoiceDate), type: 'Purchase', qty: p.totalPurchaseBox, unitCost: p.totalPurchaseValueExclGst / p.totalPurchaseBox });
      });
      sales.filter(s => s.product === product).forEach((s) => {
        productTransactions.push({ date: new Date(s.SalesInvoiceDate), type: 'Issue', qty: s.totalSaleBox });
      });
      productTransactions.sort((a, b) => a.date - b.date);

      let balanceQty = 0;
      let balanceCost = 0;
      let avgCost = 0;
      let OpeningQty = 0;
      let OpeningCost = 0;
      let OpeningAvgCost = 0;
      let PurchaseQty = 0;
      let PurchaseCost = 0;
      let PurchaseAvgCost = 0;
      let SaleQty = 0;
      let SaleCost = 0;
      let SaleAvg = 0;

      productTransactions.forEach((t) => {
        if (t.type === 'Purchase') {
          const transactionCost = Number(t.qty || 0) * Number(t.unitCost || 0);
          balanceCost += Number(transactionCost);
          balanceQty += Number(t.qty);
          avgCost = balanceQty !== 0 ? balanceCost / balanceQty : 0;
          PurchaseCost += Number(transactionCost);
          PurchaseQty += Number(t.qty);
          PurchaseAvgCost = balanceQty !== 0 ? balanceCost / balanceQty : 0;
        } else if (t.type === 'Opening') {
          const transactionCost = Number(t.qty || 0) * Number(t.unitCost || 0);
          balanceCost += Number(transactionCost);
          balanceQty += Number(t.qty);
          avgCost = balanceQty !== 0 ? balanceCost / balanceQty : 0;
          OpeningQty += Number(t.qty);
          OpeningCost += Number(transactionCost);
          OpeningAvgCost = OpeningQty !== 0 ? Number(OpeningCost) / Number(OpeningQty) : 0;
        } else if (t.type === 'Issue') {
          const issueQty = Number(t.qty);
          const issueCost = issueQty * Number(avgCost);
          balanceQty -= issueQty;
          balanceCost -= issueCost;
          SaleQty += issueQty;
          SaleCost += issueCost;
          SaleAvg = Number(issueCost) / Number(issueQty);
        }
      });

      summary.push({
        id: product,
        product,
        date: formatDate(date),
        balanceQty,
        balanceCost: balanceCost.toFixed(5),
        avgCost: avgCost.toFixed(5),
        OpeningCost: OpeningCost,
        OpeningQty: OpeningQty.toFixed(5),
        OpeningAvgCost: OpeningAvgCost.toFixed(5),
        PurchaseQty: PurchaseQty,
        PurchaseCost: PurchaseCost,
        PurchaseAvgCost: PurchaseAvgCost,
        SaleQty,
        SaleCost,
        SaleAvg,
      });
    });
    return summary;
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(",", "");
  };

  const handleSubmit = () => {
    if (date) {
      getData(date);
      setIsModalOpen(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [['Product', 'Date', 'Balance Qty', 'Balance Cost', 'Avg Cost of Box']],
      body: rows.map(row => [
        Allproduct.find(p => p._id === row.product)?.ProductName || 'Unknown',
        row.date, row.balanceQty, row.balanceCost, row.avgCost
      ])
    });
    doc.save('Inventory_Valuation_Report.pdf');
  };

  const downloadExcel = async () => {
    const dataWithProductNames = rows.map(row => {
      const product = Allproduct.find(p => p._id === row.product);
      return {
        Product: product ? product.ProductName : 'Unknown',
        Date: row.date,
        'Balance Qty': row.balanceQty,
        'Balance Cost': row.balanceCost,
        'Avg Cost of Box': row.avgCost
      };
    });

    await exportProfessionalExcel({
      title: 'Inventory Valuation Report',
      fileName: 'Inventory_Valuation_Report',
      sheetName: 'Report',
      rows: dataWithProductNames,
      meta: date ? [`As of Date: ${date}`] : [],
      excludeKeys: ['_id', 'id'],
    });
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = rows.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(rows.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  return (
    <ReportPageLayout title="Inventory Valuation">
    <div className="pd-page min-h-screen">
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 pd-modal-overlay flex items-center justify-center z-50">
          <div className="pd-bg-surface rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="pd-page-title">Select Date</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="pd-text-muted hover:pd-text-body"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-4">
              <label className="pd-label">Date</label>
              <input
                type="date"
                value={date || ''}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border pd-border-default border rounded-md"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!date}
              className={`w-full py-2 px-4 rounded-md text-white ${date ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              Generate Report
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="pd-bg-surface rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="pd-page-title mb-4 md:mb-0">Inventory Valuation Summary</h2>
          <div className="flex flex-wrap gap-2"> 
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Open Filter
            </button>
            <button 
              onClick={downloadPDF}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
            <button 
              onClick={downloadExcel}
              className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[color:var(--pd-primary)]"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[color:var(--pd-border-card)]">
                <thead className="pd-bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Opening Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Opening Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Opening Avg Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Purchase Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Purchase Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Purchase Avg Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Sale Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Sale Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Sale Avg Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Balance Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Balance Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium pd-text-muted uppercase tracking-wider">Avg Cost of Box</th>
                  </tr>
                </thead>
                <tbody className="pd-bg-surface divide-y divide-[color:var(--pd-border-card)]">
                  {currentItems.map((row, index) => {
                    const product = Allproduct.find(p => p._id === row.product);
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'pd-bg-muted'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium pd-text-body">
                          {product ? `${product.ProductName} (${product.code})` : 'Product Not Found'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{row.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.OpeningQty || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.OpeningCost || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.OpeningAvgCost || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.PurchaseQty || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.PurchaseCost || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.PurchaseAvgCost || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.SaleQty || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.SaleCost || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.SaleAvg || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.balanceQty || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.balanceCost || 0).toFixed(2))}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-muted">{Number(Number(row.avgCost || 0).toFixed(2))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {rows.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between mt-6 px-4 py-3 pd-bg-surface border-t pd-border-default border sm:px-6">
                <div className="flex items-center mb-4 md:mb-0">
                  <span className="text-sm pd-text-body">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-medium">
                      {indexOfLastItem > rows.length ? rows.length : indexOfLastItem}
                    </span>{' '}
                    of <span className="font-medium">{rows.length}</span> results
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="ml-4 px-2 py-1 border pd-border-default border rounded-md text-sm"
                  >
                    <option value="5">5 per page</option>
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'pd-bg-readonly pd-text-muted cursor-not-allowed' : 'pd-bg-readonly pd-text-body hover:bg-gray-300'}`}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded-md ${currentPage === page ? 'bg-blue-600 text-white' : 'pd-bg-readonly pd-text-body hover:bg-gray-300'}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'pd-bg-readonly pd-text-muted cursor-not-allowed' : 'pd-bg-readonly pd-text-body hover:bg-gray-300'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </ReportPageLayout>
  );
};

export default InventoryValuationReport;