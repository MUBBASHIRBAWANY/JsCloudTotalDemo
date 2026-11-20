import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../Api/CRUDFunctions';
import { useDispatch } from 'react-redux';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer';
import ReportPageLayout from '../../Components/Global/ReportPageLayout.jsx';
import { exportProfessionalExcel } from '../../utils/exportProfessionalExcel';





const StockReport = () => {
  const [stockData, setStockData] = useState([])
  const [product, setProduct] = useState([])
  const [vendor, setVendor] = useState([])
  const [totalunit, setTotalUnit] = useState([])
  const [AllStore, setAllStore] = useState([])
  const [AllLocation, setLocation] = useState([])
  const dispatch = useDispatch()
  const getData = async () => {
    const data = await getDataFundtion('/TotalProduct')
    const vendor = await getDataFundtion('/vendor')
    const product = await getDataFundtion('/product')
    const store = await getDataFundtion('/Store')
    const location = await getDataFundtion("/location")
    setProduct(product.data)
    setVendor(vendor.data)
    setStockData(data.data)
    setAllStore(store.data)
    setLocation(location.data)
    dispatch(fetchTotalProducts(data.data))

  }
  const exportToExcel = async () => {
    const excelData = stockData.map((item, index) => {
      const productItem = product.find(p => p._id === item.ProductName);
      const vendorItem = vendor.find(v => v.code === productItem?.mastercode.slice(0, 2));
      const store = AllStore.find(s => s._id === item.Store);
      const location = AllLocation.find(l => l._id === item.Location);
      const carton = Math.floor(item.TotalQuantity / (productItem?.BoxinCarton || 1));
      const boxes = Math.round(item.TotalQuantity % (productItem?.BoxinCarton || 1));

      return {
        '#': index + 1,
        Vendor: vendorItem?.VendorName,
        Store: store?.StoreName,
        Location: location?.LocationName,
        ProductCode: productItem?.mastercode,
        Product: productItem?.ProductName,
        SalesFlowRef: productItem?.salesFlowRef,
        Cartons: carton,
        Boxes: boxes,
        AvgRate: item.AvgRate,
        Amount: item.Amount,
        TotalBoxes: item.TotalQuantity,
      };
    });

    await exportProfessionalExcel({
      title: 'Stock Report',
      fileName: 'Stock_Report',
      sheetName: 'StockReport',
      rows: excelData,
      excludeKeys: ['_id', 'id'],
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["#", "Vendor", "Store", "Location", "Product Code", "Product", "SalesFlowRef", "Cartons", "Boxes", "Total Boxes"];
    const tableRows = [];

    stockData.forEach((item, index) => {
      const productItem = product.find(p => p._id === item.ProductName);
      const vendorItem = vendor.find(v => v.code === productItem?.mastercode.slice(0, 2));
      const store = AllStore.find(s => s._id === item.Store);
      const location = AllLocation.find(l => l._id === item.Location);
      const carton = Math.floor(item.TotalQuantity / (productItem?.BoxinCarton || 1));
      const boxes = Math.round(item.TotalQuantity % (productItem?.BoxinCarton || 1));

      tableRows.push([
        index + 1,
        vendorItem?.VendorName,
        store?.StoreName,
        location?.LocationName,
        productItem?.mastercode,
        productItem?.ProductName,
        productItem?.salesFlowRef,
        carton,
        boxes,
        item.AvgRate,
        item.Amount,
        item.TotalQuantity
      ]);
    });

    doc.text("Stock Report", 14, 15);
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 }
    });
    doc.save(`Stock_Report_${Date.now()}.pdf`);
  };

  useEffect(() => {
    getData()
  }, [])

  return (
    <ReportPageLayout title="All Stock">
    <div className="p-6">
      <h1 className="text-3xl font-bold text-center pd-text-body mb-6">📦 Stock Report</h1>

      <div className="overflow-x-auto pd-bg-surface shadow-md rounded-lg">
        <div className="mb-4 flex gap-4">
          <button
            className="bg-blue-600 hover:pd-btn-save px-4 py-2 rounded-lg shadow"
            onClick={exportToExcel}
          >
            📊 Export to Excel
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow"
            onClick={exportToPDF}
          >
            📄 Export to PDF
          </button>
        </div>

        <table className="min-w-full divide-y divide-[color:var(--pd-border-card)]">
          <thead className="pd-bg-muted pd-text-body text-left text-sm uppercase tracking-wider">
            <tr>
              <th className="px-[1%] py-3">#</th>
              <th className="px-[1%] py-3">Vendor</th>
              <th className="px-[1%] py-3">Department</th>
              <th className="px-[1%] py-3">Location</th>
              <th className="px-[1%] py-3">Product Code</th>
              <th className="px-[1%] py-3">Product</th>
              <th className="px-[1%] py-3">SalesFlowRef</th>
              <th className="px-[1%] py-3">Carton</th>
              <th className="px-[1%] py-3">Boxes</th>
              <th className="px-[1%] py-3">Avg Rate</th>
              <th className="px-[1%] py-3">Amount</th>
              <th className="px-[1%] py-3">Total Boxes</th>

            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--pd-border-card)] text-sm">
            {stockData.map((item, index) => (
              <tr key={item._id} className="hover:pd-bg-muted">
                <td className="px-[1%] py-4 font-medium pd-text-body">{index + 1}</td>
                <td className="px-[1%] py-4 pd-text-primary">{vendor.find((item1) => item1.code == product.find((item1) => item1._id == item.ProductName)?.mastercode.slice(0, 2))?.VendorName}</td>
                <td className="px-[1%] py-4 pd-text-primary">{AllStore.find((item1) => item1._id == item.Store)?.StoreName}</td>
                <td className="px-[1%] py-4 pd-text-primary">{AllLocation.find((item1) => item1._id == item.Location)?.LocationName}</td>
                <td className="px-[1%] py-4 pd-text-primary">{product.find((item1) => item1._id == item.ProductName)?.mastercode}</td>
                <td className="px-[1%] py-4 pd-text-primary">{product.find((item1) => item1._id == item.ProductName)?.ProductName}</td>
                <td className="px-[1%] py-4 pd-text-primary">{product.find((item1) => item1._id == item.ProductName)?.salesFlowRef}</td>

                <td className="px-[1%] py-4 pd-stat-positive font-semibold">{((item.TotalQuantity / product.find((item1) => item1._id == item.ProductName)?.BoxinCarton).toString()).split('.')[0]}</td>
                <td className="px-[1%] py-4 pd-stat-positive font-semibold">{((product.find((item1) => item1._id == item.ProductName)?.BoxinCarton) * (`.` + (((item.TotalQuantity / product.find((item1) => item1._id == item.ProductName)?.BoxinCarton).toString()).split('.')[1] || 0))).toFixed(0)}</td>
                <td className="px-[1%] py-4 pd-text-primary">{Number(Number(item.AvgRate || 0).toFixed(2))}</td>
                <td className="px-[1%] py-4 pd-text-primary">{Number(Number(item.Amount || 0).toFixed(2))}</td>
                <td className="px-[1%] py-4 pd-text-primary">{Number(Number(item.TotalQuantity || 0).toFixed(2))}</td>

              </tr>
            ))}
          </tbody>
          <tfoot className="pd-bg-muted pd-text-body text-sm font-semibold">
            <tr>
              <td className="px-[1%] py-3" colSpan="2">Total Stock</td>
              <td className="px-[1%] py-3"></td>
              <td className="px-[1%] py-3"></td>
              <td className="px-[1%] py-3"></td>
              <td className="px-[1%] py-3"></td>
              <td className="px-[1%] py-3"></td>
              <td className="px-[1%] py-3">
                {
                  stockData.reduce((acc, item) => {
                    const productItem = product.find((p) => p._id === item.ProductName);
                    const boxInCarton = productItem?.BoxinCarton || 1;
                    const cartons = Math.floor(item.TotalQuantity / boxInCarton);
                    return acc + cartons;
                  }, 0)
                }
              </td>
              <td className="px-[1%] py-3">
                {
                  stockData.reduce((acc, item) => {
                    const productItem = product.find((p) => p._id === item.ProductName);
                    const boxInCarton = productItem?.BoxinCarton || 1;
                    const fractionalPart = item.TotalQuantity / boxInCarton;
                    const boxes = Math.round((fractionalPart % 1) * boxInCarton);
                    return acc + boxes;
                  }, 0)
                }
              </td>
              <td className="px-6 py-3">

              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </ReportPageLayout>
  );
};

export default StockReport;
