import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../Api/CurdFunctions';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { listFromResponse, reportDistributorIds } from '../../Components/Global/distributorAccess';

const StockReport = () => {
  const [stockData, setStockData] = useState([])
  const [product, setProduct] = useState([])
  const [distributors, setDistributors] = useState([])
  const [priceLists, setPriceLists] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const dispatch = useDispatch()
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail)

  const firstPriceList = [...priceLists].sort((a, b) =>
    String(a?.PriceListNumber || '').localeCompare(String(b?.PriceListNumber || ''), undefined, { numeric: true })
  )[0]

  const distributorName = (id) => {
    const key = id && typeof id === 'object' ? (id._id || id.id) : id
    return distributors.find((item) => String(item._id) === String(key))?.DistrbutorName || ''
  }

  const getData = async () => {
    try {
      setLoading(true)
      setLoadError('')
      const ids = reportDistributorIds(loginuser)
      let stockList = []
      if (ids === null) {
        const data = await getDataFundtion('/TotalProduct')
        stockList = listFromResponse(data)
      } else if (ids.length) {
        const chunks = await Promise.all(ids.map(async (id) => {
          try {
            return listFromResponse(await getDataFundtion(`/TotalProduct/${id}`))
          } catch (err) {
            console.log(err)
            return []
          }
        }))
        stockList = chunks.flat()
      } else {
        setStockData([])
        setLoadError('No distributor assigned')
        return
      }
      const [productRes, priceListRes, distributorRes] = await Promise.all([
        getDataFundtion('/product'),
        getDataFundtion('/PriceList').catch(() => []),
        getDataFundtion('/Distrbutor').catch(() => []),
      ])
      const inStock = stockList.filter((item) => Number(item.TotalQuantity) !== 0)
      setProduct(listFromResponse(productRes))
      setPriceLists(listFromResponse(priceListRes))
      setDistributors(listFromResponse(distributorRes))
      setStockData(inStock)
      dispatch(fetchTotalProducts(inStock))
    } catch (err) {
      console.error('AllStock load error:', err)
      setLoadError('Stock report load nahi ho saki')
    } finally {
      setLoading(false)
    }
  }

  const lineValue = (item) => {
    const priceRow = firstPriceList?.PriceListData?.find(
      (row) => String(row.product) === String(item.ProductName)
    )
    const tpSale = Number(priceRow?.TPSale) || 0
    const totalBox = Number(item.TotalQuantity) || 0
    return Math.round(totalBox * tpSale * 100) / 100
  }

  const splitStockQty = (item) => {
    const productItem = product.find((p) => String(p._id) === String(item.ProductName))
    const boxInCarton = Number(productItem?.BoxinCarton) || 0
    const totalBox = Number(item.TotalQuantity) || 0
    if (!boxInCarton) {
      return { carton: 0, box: totalBox, totalBox, productItem }
    }
    return {
      carton: Math.floor(totalBox / boxInCarton),
      box: totalBox % boxInCarton,
      totalBox,
      productItem,
    }
  }

  const showAmount = (value) =>
    (Math.round((Number(value) || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })

  const rowView = (item, index) => {
    const qty = splitStockQty(item)
    return {
      serial: index + 1,
      distributor: distributorName(item.Distrbutor),
      product: qty.productItem?.ProductName || '',
      carton: qty.productItem?.BoxinCarton ? Number(qty.carton).toFixed(2) : 0,
      box: qty.box,
      totalBox: qty.totalBox,
      value: lineValue(item),
    }
  }

  const exportToExcel = () => {
    const excelData = stockData.map((item, index) => {
      const row = rowView(item, index)
      return {
        '#': row.serial,
        Distributor: row.distributor,
        Product: row.product,
        Carton: row.carton,
        Box: row.box,
        'Total Box': row.totalBox,
        Value: row.value,
      }
    })
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'StockReport')
    XLSX.writeFile(workbook, `Stock_Report_${Date.now()}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const tableColumn = ['#', 'Distributor', 'Product', 'Carton', 'Box', 'Total Box', 'Value']
    const tableRows = stockData.map((item, index) => {
      const row = rowView(item, index)
      return [row.serial, row.distributor, row.product, row.carton, row.box, row.totalBox, row.value]
    })
    doc.text('Stock Report', 14, 15)
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
    })
    doc.save(`Stock_Report_${Date.now()}.pdf`)
  }

  useEffect(() => {
    if (!loginuser || Array.isArray(loginuser)) return
    getData()
  }, [loginuser])

  const stockTotals = stockData.reduce(
    (acc, item) => {
      const qty = splitStockQty(item)
      acc.carton += qty.carton
      acc.box += qty.box
      acc.totalBox += qty.totalBox
      acc.value += lineValue(item)
      return acc
    },
    { carton: 0, box: 0, totalBox: 0, value: 0 }
  )

  return (
    <div className="p-6 ">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Stock Report</h1>
      <p className="text-center text-sm text-gray-600 mb-6">
        Value = Total Box × {firstPriceList?.PriceListName || 'first Price List'} TP Sale
      </p>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <div className="mb-4 flex gap-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
            onClick={exportToExcel}
          >
            Export to Excel
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow"
            onClick={exportToPDF}
          >
            Export to PDF
          </button>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 text-gray-700 text-left text-sm uppercase tracking-wider">
            <tr>
              <th className="px-[1%] py-3">#</th>
              <th className="px-[1%] py-3">Distributor</th>
              <th className="px-[1%] py-3">Product</th>
              <th className="px-[1%] py-3">Carton</th>
              <th className="px-[1%] py-3">Box</th>
              <th className="px-[1%] py-3">Total Box</th>
              <th className="px-[1%] py-3">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-[1%] py-6 text-center text-gray-500">Loading stock...</td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan="7" className="px-[1%] py-6 text-center text-red-600">{loadError}</td>
              </tr>
            ) : stockData.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-[1%] py-6 text-center text-gray-500">No stock rows</td>
              </tr>
            ) : null}
            {stockData.map((item, index) => {
              const row = rowView(item, index)
              return (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-[1%] py-4 font-medium text-gray-700">{row.serial}</td>
                  <td className="px-[1%] py-4 text-blue-700">{row.distributor}</td>
                  <td className="px-[1%] py-4 text-blue-700">{row.product}</td>
                  <td className="px-[1%] py-4 text-blue-700">{row.carton}</td>
                  <td className="px-[1%] py-4 text-blue-700">{row.box}</td>
                  <td className="px-[1%] py-4 text-blue-700">{row.totalBox}</td>
                  <td className="px-[1%] py-4 text-blue-700">{showAmount(row.value)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50 text-gray-800 text-sm font-semibold">
            <tr>
              <td className="px-[1%] py-3" colSpan="3">Total Stock</td>
              <td className="px-[1%] py-3">{stockTotals.carton}</td>
              <td className="px-[1%] py-3">{stockTotals.box}</td>
              <td className="px-[1%] py-3">{stockTotals.totalBox}</td>
              <td className="px-[1%] py-3">{showAmount(stockTotals.value)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default StockReport
