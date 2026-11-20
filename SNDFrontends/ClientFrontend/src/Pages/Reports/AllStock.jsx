import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../Api/CurdFunctions';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';




const StockReport = () => {
  const [stockData, setStockData] = useState([])
  const [product, setProduct] = useState([])
  const [priceLists, setPriceLists] = useState([])
  const [vendor, setVendor] = useState([])
  const [totalunit, setTotalUnit] = useState([])
  const [AllStore, setAllStore] = useState([])
  const [AllLocation, setLocation] = useState([])
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)

  const dispatch = useDispatch()

  // Active lists mein sab se pehli Price List (number 001). Amount isi ki TPSale se banta hai.
  const firstPriceList = [...priceLists].sort((a, b) =>
    String(a?.PriceListNumber || '').localeCompare(String(b?.PriceListNumber || ''), undefined, { numeric: true })
  )[0]

  const getData = async () => {
    const data = await getDataFundtion(`/TotalProduct/${loginVendor?._id}`)
    // const vendor = await getDataFundtion('/vendor')
    const product = await getDataFundtion('/product')
    const priceListRes = await getDataFundtion('/pricelist').catch(() => [])
    // const store = await getDataFundtion('/Store')
    // const location = await getDataFundtion("/location")
    setProduct(product.data)
    const lists = Array.isArray(priceListRes) ? priceListRes : (priceListRes?.data || [])
    setPriceLists(lists)
    // setVendor(vendor.data)
    const graterthenZero = data.data.filter((item)=> Number(item.TotalQuantity) !== 0)
    console.log(data.data , graterthenZero)
    setStockData( graterthenZero)
    // setAllStore(store.data)
    // setLocation(location.data)
    dispatch(fetchTotalProducts(graterthenZero))

  }

  const lineValue = (item) => {
    const priceRow = firstPriceList?.PriceListData?.find(
      (row) => String(row.product) === String(item.ProductName)
    )
    const tpSale = Number(priceRow?.TPSale) || 0
    const totalBox = Number(item.TotalQuantity) || 0
    return {
      tpSale,
      amount: Math.round(totalBox * tpSale * 100) / 100,
    }
  }

  const exportToExcel = () => {
    const excelData = stockData.map((item, index) => {
      const productItem = product.find(p => p._id === item.ProductName);
      const vendorItem = vendor.find(v => v.code === productItem?.mastercode.slice(0, 2));
      const store = AllStore.find(s => s._id === item.Store);
      const location = AllLocation.find(l => l._id === item.Location);
      const carton = Math.floor(item.TotalQuantity / (productItem?.BoxinCarton || 1));
      const boxes = Math.round(item.TotalQuantity % (productItem?.BoxinCarton || 1));
      const value = lineValue(item);

      return {
        '#': index + 1,
        Vendor: vendorItem?.VendorName,
        Store: loginVendor.DistrbutorName,
        Location: location?.LocationName,
        ProductCode: productItem?.mastercode,
        Product: productItem?.ProductName,
        SalesFlowRef: productItem?.salesFlowRef,
        Boxes: boxes,
        Cartons: carton,
        TotalBoxes: item.TotalQuantity,
        PriceList: firstPriceList?.PriceListName || '',
        TPSale: value.tpSale,
        Amount: value.amount,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'StockReport');
    XLSX.writeFile(workbook, `Stock_Report_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["#", "Vendor", "Store", "Location", "Product Code", "Product", "SalesFlowRef", "Cartons", "Boxes", "Total Boxes", "TP Sale", "Amount"];
    const tableRows = [];

    stockData.forEach((item, index) => {
      const productItem = product.find(p => p._id === item.ProductName);
      const vendorItem = vendor.find(v => v.code === productItem?.mastercode.slice(0, 2));
      const store = AllStore.find(s => s._id === item.Store);
      const location = AllLocation.find(l => l._id === item.Location);
      const carton = Math.floor(item.TotalQuantity / (productItem?.BoxinCarton || 1));
      const boxes = Math.round(item.TotalQuantity % (productItem?.BoxinCarton || 1));
      const value = lineValue(item);

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
        item.TotalQuantity,
        value.tpSale,
        value.amount,
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

  const splitStockQty = (item) => {
    const productItem = product.find((p) => p._id === item.ProductName);
    const boxInCarton = Number(productItem?.BoxinCarton) || 0;
    const totalBox = Number(item.TotalQuantity) || 0;
    if (!boxInCarton) {
      return { carton: 0, box: totalBox, totalBox };
    }
    return {
      carton: Math.floor(totalBox / boxInCarton),
      box: totalBox % boxInCarton,
      totalBox,
    };
  };

  const stockTotals = stockData.reduce(
    (acc, item) => {
      const qty = splitStockQty(item);
      const value = lineValue(item);
      acc.carton += qty.carton;
      acc.box += qty.box;
      acc.totalBox += qty.totalBox;
      acc.amount += value.amount;
      return acc;
    },
    { carton: 0, box: 0, totalBox: 0, amount: 0 }
  );

  const showAmount = (value) =>
    (Math.round((Number(value) || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <div className="p-6 ">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">📦 Stock Report</h1>
      <p className="text-center text-sm text-gray-600 mb-6">
        Amount = Total Box × {firstPriceList?.PriceListName || 'first Price List'} TP Sale
      </p>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <div className="mb-4 flex gap-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
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

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-gray-700 text-left text-sm uppercase tracking-wider">
            <tr>
              <th className="px-[1%] py-3">#</th>
              <th className="px-[1%]   py-3">Distrbutor</th>
              <th className="px-[1%]   py-3">Product</th>
              <th className="px-[1%] py-3">Box</th>
              <th className="px-[1%] py-3">Carton</th>
              <th className="px-[1%] py-3">Total Box</th>
              <th className="px-[1%] py-3">TP Sale</th>
              <th className="px-[1%] py-3">Amount</th>

            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {stockData.map((item, index) => {
              const qty = splitStockQty(item);
              const value = lineValue(item);
              const productItem = product.find((p) => p._id === item.ProductName);
              return (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-[1%] py-4 font-medium text-gray-700">{index + 1}</td>
                <td className="px-[1%] py-4 text-blue-700">{loginVendor.DistrbutorName}</td>
                <td className="px-[1%] py-4 text-blue-700">{productItem?.ProductName}</td>
                <td className="px-[1%] py-4 text-blue-700">{qty.box}</td>
                <td className="px-[1%] py-4 text-blue-700">
                  {productItem?.BoxinCarton ? qty.carton.toFixed(2) : 0}
                </td>
                <td className="px-[1%] py-4 text-blue-700">{qty.totalBox}</td>
                <td className="px-[1%] py-4 text-blue-700">{showAmount(value.tpSale)}</td>
                <td className="px-[1%] py-4 text-blue-700">{showAmount(value.amount)}</td>
              </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 text-gray-800 text-sm font-semibold">
            <tr>
              <td className="px-[1%] py-3" colSpan="2">Total Stock</td>
              <td className="px-[1%] py-3"></td>
              <td className="px-[1%] py-3">{stockTotals.box}</td>
              <td className="px-[1%] py-3">{stockTotals.carton}</td>
              <td className="px-[1%] py-3">{stockTotals.totalBox}</td>
              <td className="px-[1%] py-3"></td>
              <td className="px-[1%] py-3">{showAmount(stockTotals.amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default StockReport;
