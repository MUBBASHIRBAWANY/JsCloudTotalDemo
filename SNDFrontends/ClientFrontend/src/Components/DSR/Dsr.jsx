import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios, { isCancel } from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// API Functions
import { createDataFunction, deleteDataFunction, getDataFundtion } from '../../Api/CurdFunctions.jsx';

// Redux Actions
import { fetchSaleOrder } from '../../Redux/Reducers/SaleOrderReducer.js';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { printLoadFormReport } from '../../utils/printLoadFormReport';

const DSR = () => {
  // ============= STATE MANAGEMENT =============
  const [loadForms, setLoadForms] = useState([]);
  const [selectedLoadForm, setSelectedLoadForm] = useState(null);
  const [loadFormData, setLoadFormData] = useState([]);
  console.log(loadFormData)
  const [isForward, setIsForward] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enterDetaiModal, setEnterDetaiModal] = useState(false)
  const [viewStockOpen, setViewStockOpen] = useState(false)
  const [selectedLoadFormForModal, setSelectedLoadFormForModal] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showLoadFormDetails, setShowLoadFormDetails] = useState(false);
  const [cancelAll, setCancelAll] = useState(false)
  const [forwardAll, setforwardAll] = useState(false)
  const [slabs, setSlabs] = useState([])

  function openEnterDetail() {
    setLoadFormData((prev) =>
      prev.map((item) => {
        if (item.NetSale === 0 || item.isForwarded === true || item.cashEdited) return item;
        const netSale = Number(item.NetSale || item.Totalamount) || 0;
        const chq = Number(item.Chq) || 0;
        const cash = Math.max(0, Math.round((netSale - chq) * 100) / 100);
        const credit = Math.round((netSale - cash - chq) * 100) / 100;
        return {
          ...item,
          cashAmount: cash,
          Credit: credit,
          RemainigAmount: credit,
        };
      })
    );
    setEnterDetaiModal(true);
  }
  // ============= HOOKS =============
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { register, handleSubmit, reset } = useForm();

  // ============= REDUX SELECTORS =============
  const userRights = useSelector((state) => state.UsersRights.UserRights);
  const currentUser = useSelector((state) => state.LoginerReducer.userDetail);
  const customers = useSelector((state) => state.Client.client);
  const products = useSelector((state) => state.Product.product);
  const saleOrders = useSelector((state) => state.SaleOrder.SaleOrder);
  const orderBookers = useSelector((state) => state.OrderBooker.OrderBooker);

  // ============= MEMOIZED VALUES =============
  const loadFormOptions = useMemo(() =>
    loadForms.map(form => ({
      value: form._id,
      label: form.LoadFormNumber,
      ...form
    })),
    [loadForms]
  );

  // Load form ki tamam invoices ko product par jama karta hai:
  // Order = sale order qty (orderBox), warna jo qty load par thi (DeliveredBoxWill).
  // RTG = RTGBox. Delivered = loaded qty minus RTG, taake cancel/forward par
  // Delivered aur RTG double count na hon.
  const stockSummary = useMemo(() => {
    const map = new Map();
    (loadFormData || []).forEach((inv) => {
      (inv.SalesData || []).forEach((line) => {
        const id = line.product;
        if (!id) return;
        const issued = Number(line.DeliveredBoxWill ?? line.DeliveredBox) || 0;
        const rtg = Math.min(issued, Math.max(0, Number(line.RTGBox) || 0));
        const delivered = Math.max(0, issued - rtg);
        const order = Number(line.orderBox) || issued;
        const current = map.get(id) || { order: 0, delivered: 0, rtg: 0 };
        current.order += order;
        current.delivered += delivered;
        current.rtg += rtg;
        map.set(id, current);
      });
    });

    const rows = Array.from(map.entries()).map(([id, qty]) => {
      const product = products.find((p) => p._id === id);
      return {
        id,
        code: product?.mastercode || product?.code || '',
        name: product?.ProductName || id,
        order: qty.order,
        delivered: qty.delivered,
        rtg: qty.rtg,
      };
    }).sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const totals = rows.reduce(
      (acc, row) => ({
        order: acc.order + row.order,
        delivered: acc.delivered + row.delivered,
        rtg: acc.rtg + row.rtg,
      }),
      { order: 0, delivered: 0, rtg: 0 }
    );

    return { rows, totals };
  }, [loadFormData, products]);

  // ============= SLAB DISCOUNT HELPERS =============
  // Customer ki price list ke slab ke mutabiq discount % nikalta hai.
  // Logic:
  //  - amount < fromAmount  -> 0%
  //  - amount > toAmount    -> maxPercentage
  //  - warna slabRows me range check karke us ka percentage
  const getSlabPercentage = (slabRow, amount) => {
    if (!slabRow) return 0;
    const from = Number(slabRow.fromAmount) || 0;
    const to = Number(slabRow.toAmount) || 0;
    if (amount < from) return 0;
    if (amount > to) return Number(slabRow.maxPercentage) || 0;
    const row = (slabRow.slabRows || []).find(
      (r) => amount >= Number(r.from) && amount <= Number(r.to)
    );
    return row ? Number(row.percentage) || 0 : 0;
  };

  // Customer ki PriceList ke mutabiq Active slab dhundo
  const getCustomerSlab = (clientId) => {
    const customer = customers.find(c => String(c._id) === String(clientId));
    if (!customer?.PriceList) return null;
    const priceListId = customer.PriceList?._id || customer.PriceList;
    return (slabs || []).find((s) => {
      if (s.status !== "Active") return false;
      const slabPriceListId = s.priceList?._id || s.priceList;
      return String(slabPriceListId) === String(priceListId);
    });
  };

  // SalesData (RTG ke baad) ka gross total nikaal kar slab discount values return karta hai.
  // Agar customer ka Active slab nahi mila to invoice ka purana SlabPercentage fallback ke tor par rakho
  // (taake bina slab milne par bhi legit discount wipe na ho).
  const calculateSlabValues = (salesData, clientId, fallbackSlab = {}, priceListOnly = false) => {
    // Slab Discount Gross Amount par apply hota hai (0-box / RTG lines skip)
    const lines = (salesData || []).filter((i) => (Number(i.DeliveredBox) || 0) > 0);
    const grossTotal = lines.reduce(
      (sum, i) => sum + (Number(i.GrossAmount) || Number(i.NetSale) || 0), 0
    );
    const netSaleTotal = lines.reduce(
      (sum, i) => sum + (Number(i.NetSale) || 0), 0
    );
    const customerSlab = getCustomerSlab(clientId);
    let slabPercentage = 0;
    if (customerSlab) {
      slabPercentage = getSlabPercentage(customerSlab, grossTotal);
    } else if (!priceListOnly && Number(fallbackSlab?.SlabPercentage) > 0) {
      slabPercentage = Number(fallbackSlab.SlabPercentage);
    }
    const slabDiscount = Math.round(((grossTotal * slabPercentage) / 100) * 100) / 100;
    const netTotal = Math.round((netSaleTotal - slabDiscount) * 100) / 100;
    return { grossTotal, slabPercentage, slabDiscount, netTotal };
  };

  const applyNetAndRemaining = (load, netTotal) => {
    const cash = Number(load.cashAmount) || 0;
    const chq = Number(load.Chq) || 0;
    const remaining = Math.round((netTotal - cash - chq) * 100) / 100;
    load.Totalamount = netTotal;
    load.NetSale = netTotal;
    load.Credit = remaining;
    load.RemainigAmount = remaining;
    return load;
  };

  // Load form par slab discount apply karta hai (RTG ke baad slab wapis check karke)
  const recalculateSlabDiscount = (load, priceListOnly = false) => {
    if (!load) return load;
    const { slabPercentage, slabDiscount, netTotal } = calculateSlabValues(load.SalesData || [], load.Client, load, priceListOnly);
    load.SlabPercentage = slabPercentage;
    load.SlabDiscount = slabDiscount;
    load.LessAmount = slabDiscount;
    applyNetAndRemaining(load, netTotal);
    return load;
  };

  // RTG ke hisab se product ka NetSale update karta hai (ek hi jagah formula - consistency ke liye)
  const applyRTGToSalesItem = (salesItem, rtgValue) => {
    const rtgAmount = rtgValue * (Number(salesItem.RTGRate) || 0);
    salesItem.RTGBox = rtgValue;
    salesItem.DeliveredBox = salesItem.DeliveredBoxWill - rtgValue;
    salesItem.NetSale = Math.round(((salesItem.DeliveredBoxWill * (Number(salesItem.RTGRate) || 0)) - rtgAmount) * 100) / 100;
    // GrossAmount bhi OriginalGrossAmount se proportionally update karo (taake slab discount sahi recalculate ho)
    // OriginalGrossAmount = data load hone par saved original value (RTG zero karne par wapas aa sake)
    const baseGross = Number(salesItem.OriginalGrossAmount) || 0;
    if (baseGross && salesItem.DeliveredBoxWill > 0) {
      salesItem.GrossAmount = Math.round((baseGross / salesItem.DeliveredBoxWill) * salesItem.DeliveredBox * 100) / 100;
    }
    // Scheme amounts = load-time rate (SpecialTO / DeliveredBoxWill) × remaining DeliveredBox
    const applySchemeRate = (rateKey, amountKey) => {
      const rate = Number(salesItem[rateKey]) || 0;
      salesItem[amountKey] = Math.round(rate * salesItem.DeliveredBox * 100) / 100;
    };
    applySchemeRate('SpecialTORate', 'SpecialTO');
    applySchemeRate('ClaimableSpecialTORate', 'ClaimableSpecialTO');
    applySchemeRate('UnClaimableSpecialTORate', 'UnClaimableSpecialTO');
    applySchemeRate('ToRate', 'To');
    if (salesItem.TO != null) salesItem.TO = salesItem.To;
    return salesItem;
  };

  // ============= MODAL FUNCTIONS =============
  const openEditModal = (loadIndex) => {
    setSelectedLoadFormForModal(loadFormData[loadIndex]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLoadFormForModal(null);
  };

  const handleDeliveredBoxChange = (loadIndex, itemIndex, value) => {
    const updatedData = [...loadFormData];
    const load = updatedData[loadIndex];

    if (load && load.SalesData && load.SalesData[itemIndex]) {
      const deliveredBoxValue = Number(value) || 0;
      const salesItem = load.SalesData[itemIndex];

      // Update the Delivered Box
      salesItem.DeliveredBox = deliveredBoxValue;

      // Recalculate RTG Box (if needed)
      salesItem.RTGBox = salesItem.DeliveredBoxWill - deliveredBoxValue;

      // RTG ke hisab se product ka NetSale bhi update karo
      applyRTGToSalesItem(salesItem, salesItem.RTGBox);

      // Slab Discount dobara calculate karo
      recalculateSlabDiscount(load);
      setLoadFormData(updatedData);

      // Also update modal data if open
      if (selectedLoadFormForModal && selectedLoadFormForModal._id === load._id) {
        const updatedModalData = { ...selectedLoadFormForModal };
        updatedModalData.SalesData = [...updatedModalData.SalesData];
        updatedModalData.SalesData[itemIndex] = { ...salesItem };
        recalculateSlabDiscount(updatedModalData);
        setSelectedLoadFormForModal(updatedModalData);
      }
    }
  };

  const saveModalChanges = () => {
    if (selectedLoadFormForModal) {
      // Fresh copy par slab discount dobara confirm karo
      const updatedModalData = {
        ...selectedLoadFormForModal,
        SalesData: [...selectedLoadFormForModal.SalesData]
      };
      recalculateSlabDiscount(updatedModalData);

      const updatedData = loadFormData.map(load =>
        load._id === updatedModalData._id ? updatedModalData : load
      );

      const DeliveredBox = updatedModalData.SalesData.reduce((acc, curr) => acc + curr.DeliveredBox, 0)
      if (DeliveredBox != 0) {
        setLoadFormData(updatedData);
        toast.success('Changes saved successfully');
        closeModal();
      }
      else {
        toast.error("Total Deliverd Box Not Be Zero")
      }
    }
  };

  const printSettledLoadForm = async (invoices) => {
    const loadFormNumber = selectedLoadForm?.label || invoices[0]?.LoadFormNumber || invoices[0]?.LoadForm || 'N/A';
    const loadFormRecord = (loadForms || []).find((lf) =>
      lf.LoadFormNumber === loadFormNumber || lf.LoadForm === loadFormNumber || lf._id === selectedLoadForm?.value
    );
    const orderBookerId = invoices[0]?.OrderBooker || loadFormRecord?.OrderBooker;
    const orderBooker = orderBookers.find((ob) => ob._id === orderBookerId)?.OrderBookerName || '';
    const orderNumber = invoices[0]?.SalesData?.[0]?.orderNumber;
    let orderDate = (saleOrders || []).find((order) =>
      String(order.SaleOrderNumber) === String(orderNumber) || String(order.orderNumber) === String(orderNumber)
    )?.SaleOrderDate || null;
    if (!orderDate && orderNumber) {
      try {
        const orderRes = await getDataFundtion(`/saleOrder/getSalesOrderByNumber/${orderNumber}`);
        orderDate = orderRes?.SaleOrderDate || orderRes?.data?.SaleOrderDate || null;
      } catch (err) {
        console.error(err);
      }
    }

    const productMap = new Map();
    invoices.forEach((inv) => {
      (inv.SalesData || []).forEach((line) => {
        const id = line.product;
        const current = productMap.get(id) || { delivered: 0, rtg: 0 };
        current.delivered += Number(line.DeliveredBox) || 0;
        current.rtg += Number(line.RTGBox) || 0;
        productMap.set(id, current);
      });
    });

    const productTotals = { ctn: 0, box: 0, totalIssued: 0, rtgCtn: 0, rtgBox: 0, totalReturned: 0, saleBox: 0 };
    const productRows = Array.from(productMap.entries()).map(([id, qty]) => {
      const product = products.find((p) => p._id === id);
      const boxInCarton = parseInt(product?.BoxinCarton) || 1;
      const totalIssued = qty.delivered + qty.rtg;
      const row = {
        productCode: product?.mastercode || product?.code || '',
        productName: product?.ProductName || id,
        ctn: Math.floor(totalIssued / boxInCarton),
        box: totalIssued % boxInCarton,
        totalIssued,
        rtgCtn: Math.floor(qty.rtg / boxInCarton),
        rtgBox: qty.rtg % boxInCarton,
        totalReturned: qty.rtg,
        saleBox: qty.delivered,
      };
      Object.keys(productTotals).forEach((key) => {
        productTotals[key] += row[key];
      });
      return row;
    });

    const grouped = {};
    invoices.forEach((inv) => {
      const cid = inv.Client;
      if (!grouped[cid]) {
        const client = customers.find((cl) => cl._id === cid);
        grouped[cid] = {
          code: client?.code || '',
          name: client?.CutomerName || client?.CustomorName || client?.name || cid || 'Unknown Client',
          invoiceCount: inv.DisSalesInvoice,
          RTGBox: 0,
          RTGValue: 0,
          totalDeliveredBox: 0,
          totalGross: 0,
          totalNet: 0,
          SlabDiscount: 0,
          SpecialTO: 0,
        };
      }
      const lines = inv.SalesData || [];
      const row = grouped[cid];
      row.RTGBox += lines.reduce((sum, line) => sum + (parseInt(line.RTGBox) || 0), 0);
      row.RTGValue += lines.reduce((sum, line) => sum + (parseInt((line.RTGBox || 0) * (line.RTGRate || 0)) || 0), 0);
      row.totalDeliveredBox += lines.reduce((sum, line) => sum + (parseInt(line.DeliveredBox) || 0), 0);
      row.totalGross += lines.reduce((sum, line) => sum + (parseFloat(line.GrossAmount) || 0), 0);
      row.totalNet += lines.reduce((sum, line) => sum + (parseFloat(line.NetSale) || 0), 0);
      row.SlabDiscount += parseFloat(inv.SlabDiscount) || 0;
      row.SpecialTO += lines.reduce((sum, line) => sum + (parseFloat(line.SpecialTO) || 0), 0);
    });
    const clientRows = Object.values(grouped);
    const clientTotals = {
      invoices: invoices.length,
      delivered: clientRows.reduce((sum, row) => sum + row.totalDeliveredBox, 0),
      rtg: clientRows.reduce((sum, row) => sum + row.RTGBox, 0),
      rtgValue: clientRows.reduce((sum, row) => sum + row.RTGValue, 0),
      gross: clientRows.reduce((sum, row) => sum + row.totalGross, 0),
      Scheme: clientRows.reduce((sum, row) => sum + (row.SpecialTO || 0), 0),
    };
    const printInvoices = invoices.map((inv) => ({
      DisSalesInvoice: inv.DisSalesInvoice,
      SalesInvoiceDate: inv.SalesInvoiceDate,
      Totalamount: inv.Totalamount ?? inv.NetSale ?? 0,
      Chq: inv.Chq,
      ChqDate: inv.ChqDate || inv.chqDate || '',
      ChqNumber: inv.ChqNumber || inv.chqNumber || '',
      cashAmount: inv.cashAmount,
      SlabDiscount: inv.SlabDiscount,
    }));
    const invoiceTotals = {
      totalBill: printInvoices.reduce((sum, row) => sum + (parseFloat(row.Totalamount) || 0), 0),
      SlabDiscount: printInvoices.reduce((sum, row) => sum + (parseFloat(row.SlabDiscount) || 0), 0),
      totalCash: printInvoices.reduce((sum, row) => sum + (parseFloat(row.cashAmount) || 0), 0),
      totalChq: printInvoices.reduce((sum, row) => sum + (parseFloat(row.Chq) || 0), 0),
    };

    await printLoadFormReport({
      loadFormNumber,
      orderBooker,
      distributorName: currentUser?.DistrbutorName || 'N/A',
      orderDate,
      status: loadFormRecord?.Status || loadFormRecord?.PostStatus || 'open',
      deliveryDate: loadFormRecord?.LoadFormDate || invoices[0]?.LoadFormDate,
      productRows,
      productTotals,
      clientRows,
      clientTotals,
      invoiceTotals,
      invoices: printInvoices,
    });
  };

  const downloadSettledLoadFormExcel = (invoices) => {
    const loadFormNumber = selectedLoadForm?.label || invoices[0]?.LoadFormNumber || invoices[0]?.LoadForm || 'LoadForm';
    const productMap = new Map();

    invoices.forEach((inv) => {
      (inv.SalesData || []).forEach((line) => {
        const id = line.product;
        const current = productMap.get(id) || {
          delivered: 0,
          rtg: 0,
          gross: 0,
          gst: 0,
          tax: 0,
          discount: 0,
          scheme: 0,
          net: 0,
        };
        current.delivered += Number(line.DeliveredBox) || 0;
        current.rtg += Number(line.RTGBox) || 0;
        current.gross += Number(line.GrossAmount) || 0;
        current.gst += Number(line.GST ?? line.gst) || 0;
        current.tax += Number(line.AdvanceTax) || 0;
        current.discount += Number(line.To) || 0;
        current.scheme += Number(line.SpecialTO) || 0;
        current.net += Number(line.NetSale) || 0;
        productMap.set(id, current);
      });
    });

    const totals = {
      issued: 0,
      returned: 0,
      sales: 0,
      gross: 0,
      gst: 0,
      tax: 0,
      discount: 0,
      scheme: 0,
      net: 0,
    };
    const productData = Array.from(productMap.entries()).map(([id, qty]) => {
      const issued = qty.delivered + qty.rtg;
      totals.issued += issued;
      totals.returned += qty.rtg;
      totals.sales += qty.delivered;
      totals.gross += qty.gross;
      totals.gst += qty.gst;
      totals.tax += qty.tax;
      totals.discount += qty.discount;
      totals.scheme += qty.scheme;
      totals.net += qty.net;
      const product = products.find((p) => p._id === id);
      return {
        SKU: product?.ProductName || id,
        'Total Issued (Box)': issued,
        'Returned (Box)': qty.rtg,
        'Sales (Box)': qty.delivered,
        'Sales Amount': qty.gross.toFixed(2),
        GST: qty.gst.toFixed(2),
        'Advance Tax': qty.tax.toFixed(2),
        'Total Discount': qty.discount.toFixed(2),
        Scheme: qty.scheme.toFixed(2),
        'Net Sales': qty.net.toFixed(2),
      };
    });
    productData.push({
      SKU: 'TOTAL',
      'Total Issued (Box)': totals.issued,
      'Returned (Box)': totals.returned,
      'Sales (Box)': totals.sales,
      'Sales Amount': totals.gross.toFixed(2),
      GST: totals.gst.toFixed(2),
      'Advance Tax': totals.tax.toFixed(2),
      'Total Discount': totals.discount.toFixed(2),
      Scheme: totals.scheme.toFixed(2),
      'Net Sales': totals.net.toFixed(2),
    });

    const invoiceTotals = { bill: 0, cash: 0, chq: 0, credit: 0 };
    const invoiceData = invoices.map((inv) => {
      const bill = Number(inv.NetSale || inv.Totalamount) || 0;
      const cash = Number(inv.cashAmount) || 0;
      const chq = Number(inv.Chq) || 0;
      const credit = inv.Credit != null ? Number(inv.Credit) || 0 : Math.round((bill - cash - chq) * 100) / 100;
      invoiceTotals.bill += bill;
      invoiceTotals.cash += cash;
      invoiceTotals.chq += chq;
      invoiceTotals.credit += credit;
      return {
        Invoice: inv.DisSalesInvoice || inv.SalesInvoice || '',
        'Invoice Date': inv.SalesInvoiceDate || '',
        'Bill Amount': bill,
        'Chq Amount': chq.toFixed(2),
        'Chq Date': inv.chqDate || inv.ChqDate || '',
        'Chq Number': inv.chqNumber || inv.ChqNumber || '',
        Cash: cash.toFixed(2),
        Credit: credit.toFixed(2),
      };
    });
    invoiceData.push({
      Invoice: '',
      'Invoice Date': 'TOTAL',
      'Bill Amount': invoiceTotals.bill,
      'Chq Amount': invoiceTotals.chq.toFixed(2),
      'Chq Date': '',
      'Chq Number': '',
      Cash: invoiceTotals.cash.toFixed(2),
      Credit: invoiceTotals.credit.toFixed(2),
    });

    const creditSale = invoiceTotals.credit;
    const unsettled = (creditSale + invoiceTotals.cash + invoiceTotals.chq) - invoiceTotals.bill;
    const loadformSummary = [{
      Cash: invoiceTotals.cash.toFixed(2),
      Credit: creditSale.toFixed(2),
      'Cheque Collected': invoiceTotals.chq.toFixed(2),
      UnSettled: unsettled.toFixed(2),
    }];
    const salesSummary = [{
      'Gross Amount': totals.gross.toFixed(2),
      'Discount (To)': totals.discount.toFixed(2),
      Scheme: totals.scheme.toFixed(2),
      'Net Sales': totals.net.toFixed(2),
      'Credit Sale': creditSale.toFixed(2),
      'Cheque Sale': invoiceTotals.chq.toFixed(2),
      'Cash/Deposit Slip': invoiceTotals.cash.toFixed(2),
      'Shortage/Excess': unsettled.toFixed(2),
    }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productData), 'Product Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(invoiceData), 'Invoice Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(loadformSummary), 'Loadform Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(salesSummary), 'Sales Summary');
    XLSX.writeFile(workbook, `LoadForm_${loadFormNumber}.xlsx`);
  };

  const SubmitData = async () => {
    // Double-submit guard: pehli click ke baad button disabled, taake duplicate
    // forwarded load form / double stock return na ho
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const forwardata = loadFormData.filter((item) => item.isForwarded == true)
      const canceldata = loadFormData.filter((item) => item.isCancelled == true)
      const ActullData = loadFormData
        .filter((item) => item.isCancelled !== true)
        .filter((item) => item.isForwarded !== true)
        .map((item) => {
          const copy = {
            ...item,
            SalesData: (item.SalesData || []).map((line) => ({ ...line })),
          };
          recalculateSlabDiscount(copy, true);
          const received = (Number(copy.Chq) || 0) + (Number(copy.cashAmount) || 0);
          const netSale = Number(copy.NetSale) || 0;
          const credit = Math.round((netSale - received) * 100) / 100;
          copy.Credit = credit;
          copy.RemainigAmount = credit;
          copy.paymentExceeds = received > netSale;
          return copy;
        });

      const missingChqDetail = ActullData.find((item) => {
        const chqAmount = Number(item.Chq) || 0;
        if (chqAmount <= 0) return false;
        const chqNumber = item.chqNumber || item.ChqNumber;
        const chqDate = item.chqDate || item.ChqDate;
        return !chqNumber || !chqDate;
      });
      if (missingChqDetail) {
        setIsSubmitting(false);
        toast.error(
          `Cheque number and date required for invoice ${missingChqDetail.DisSalesInvoice || missingChqDetail.SalesInvoice}`
        );
        return;
      }

      const overpaid = ActullData.find((item) => item.paymentExceeds);
      if (overpaid) {
        setIsSubmitting(false);
        toast.error(
          `Cash + Cheque slab recalculate ke baad invoice ${overpaid.DisSalesInvoice || overpaid.SalesInvoice} ke Net se zyada ho gaya`
        );
        return;
      }
      
      if(forwardata.length !== 0){
        const forward = await createDataFunction("/LoadForm", forwardata)
      }
      if(canceldata.length !== 0){
        const cancel = await createDataFunction("/SalesInvoice/cancelLoadInvoice", canceldata)

      }
      console.log(ActullData)
      if(ActullData.length !== 0){
        const payload = ActullData.map(({ paymentExceeds, ...item }) => item);
        const Actull = await createDataFunction("/SalesInvoice/SattelDsr", payload)
      }
      toast.success("Dsr Stallet")
      if (ActullData.length !== 0) {
        try {
          downloadSettledLoadFormExcel(ActullData);
        } catch (excelError) {
          console.error(excelError);
          toast.error("DSR settle ho gaya, Load Form Excel download nahi hua");
        }
        try {
          await printSettledLoadForm(ActullData);
        } catch (printError) {
          console.error(printError);
          toast.error("DSR settle ho gaya, Load Form print nahi hua");
        }
      }
      navigate(0)
    } catch (err) {
      setIsSubmitting(false)
      toast.error(err?.response?.data?.message || "some thing went wrong")

    }


  }

  // ============= API HANDLERS =============
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);

    try {
      const fetchPromises = [];

      // Fetch products if not already in store
      if (products.length === 0) {
        fetchPromises.push(
          getDataFundtion('/product').then(res => {
            dispatch(fetchproduct(res.data));
          })
        );
      }

      // Fetch customers if not already in store
      if (customers.length === 0) {
        fetchPromises.push(
          getDataFundtion('/Customor').then(res => {
            dispatch(fetchClient(res.data));
          })
        );
      }

      // Fetch load forms for current user
      if (loadForms.length === 0 && currentUser?._id) {
        fetchPromises.push(
          getDataFundtion(`/LoadForm/loadFormNumber/${currentUser._id}`).then(res => {

            setLoadForms(res.data);
          })
        );
      }

      // Fetch slabs (RTG ke baad Slab Discount recalculation ke liye)
      if (slabs.length === 0) {
        fetchPromises.push(
          getDataFundtion('/slab').then(res => {
            setSlabs(Array.isArray(res) ? res : res?.data || []);
          }).catch(err => console.error('Error fetching slabs:', err))
        );
      }

      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?._id, products.length, customers.length, loadForms.length, slabs.length, dispatch]);

  const fetchLoadFormData = async () => {
    if (!selectedLoadForm) {
      toast.warning('Please select a Load Form');
      return;
    }

    setIsLoading(true);

    try {
      const response = await getDataFundtion(`/SalesInvoice/LoadForm/${selectedLoadForm.label}`);

      const processedData = response.data.map(item => ({
        ...item,
        NetSale: item.Totalamount,
        Credit: item.Remaining != null ? Number(item.Remaining) : Number(item.Totalamount) || 0,
        RemainigAmount: item.Remaining != null ? Number(item.Remaining) : Number(item.Totalamount) || 0,
        quantity: item.SalesData.reduce((acc, curr) => acc + curr.DeliveredBox, 0),
        isCancelled: false,
        isForwarded: false,
        SalesData: item.SalesData.map(saleItem => ({
          ...saleItem,
          id: `${saleItem._id || Date.now()}_${Math.random()}`,
          RTGRate: saleItem.DeliveredBox > 0
            ? saleItem.NetSale / saleItem.DeliveredBox
            : 0,
          DeliveredBoxWill: saleItem.DeliveredBox,
          OriginalGrossAmount: saleItem.GrossAmount || 0,
          OriginalNetSale: saleItem.NetSale || 0,
          SpecialTORate: saleItem.DeliveredBox > 0
            ? (Number(saleItem.SpecialTO) || 0) / saleItem.DeliveredBox
            : 0,
          ClaimableSpecialTORate: saleItem.DeliveredBox > 0
            ? (Number(saleItem.ClaimableSpecialTO) || 0) / saleItem.DeliveredBox
            : 0,
          UnClaimableSpecialTORate: saleItem.DeliveredBox > 0
            ? (Number(saleItem.UnClaimableSpecialTO) || 0) / saleItem.DeliveredBox
            : 0,
          ToRate: saleItem.DeliveredBox > 0
            ? (Number(saleItem.To ?? saleItem.TO) || 0) / saleItem.DeliveredBox
            : 0,
          RTGBox: 0,
          isCancelled: false,
          isForwarded: false,

        }))
      }));
      console.log(processedData, "processedData")
      // Dedupe: same invoice number (SalesInvoice) + same client ki duplicate copy sirf ek baar dikhao
      // taake DSR settle ke waqt invoice double na lage (Client bhi key mein hai taake alag
      // clients ki same-number wali alag invoices hide na hon)
      const seenInv = new Set();
      const uniqueData = processedData.filter(item => {
        if (item.SalesInvoice == null) return true;
        const key = `${String(item.SalesInvoice)}|${String(item.Client || '')}`;
        if (seenInv.has(key)) return false;
        seenInv.add(key);
        return true;
      });
      setLoadFormData(uniqueData.map((item) => recalculateSlabDiscount({ ...item, SalesData: [...(item.SalesData || [])] })));
      setShowLoadFormDetails(true);
      toast.success('Load Form data loaded successfully');
    } catch (error) {
      console.error('Error fetching load form data:', error);
      toast.error('Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };

  // ============= EVENT HANDLERS =============
  const handleCellChange = (loadIndex, itemIndex, field, value) => {
    const updatedData = [...loadFormData];
    const currentLoad = updatedData[loadIndex];

    switch (field) {
      case 'RTGBox':
        handleRTGBoxChange(currentLoad, itemIndex, value);
        break;
      case 'Credit':
        updatedData[loadIndex].Credit = Number(value) || 0;
        break;
      case 'Chq':
        handleChequeChange(currentLoad, value);
        break;
      case 'Cash':
        handleCashChange(currentLoad, value);
        break;
      case 'ChqNumber':
        updatedData[loadIndex].ChqNumber = value;
        break;
      case 'ChqDate':
        updatedData[loadIndex].ChqDate = value;
        break;
      default:
        break;
    }

    setLoadFormData([...updatedData]);
  };

  const handleRTGBoxChange = (loadData, itemIndex, value) => {
    const rtgValue = Number(value) || 0;
    const salesItem = loadData.SalesData[itemIndex];

    if (rtgValue > salesItem.DeliveredBoxWill) {
      toast.error('RTG Box cannot exceed Delivered Box');
      return;
    }

    // RTG ke hisab se product ka NetSale bhi update karo
    applyRTGToSalesItem(salesItem, rtgValue);

    // RTG ke baad Slab Discount dobara calculate karo
    recalculateSlabDiscount(loadData);
  };

  const handleChequeChange = (loadData, value) => {
    loadData.Chq = Number(value) || 0;
    applyNetAndRemaining(loadData, Number(loadData.NetSale) || 0);
  };

  const handleCashChange = (loadData, value) => {
    loadData.cashEdited = true;
    loadData.cashAmount = Number(value) || 0;
    applyNetAndRemaining(loadData, Number(loadData.NetSale) || 0);
  };

  const toggleCancelStatus = (loadIndex, id) => {
    const updatedData = [...loadFormData];
    updatedData[loadIndex].isCancelled = !updatedData[loadIndex].isCancelled;
    let data = loadFormData.find((item) => item._id == id)
    console.log(data)
    if (data.isCancelled == true) {
      data.SalesData = data.SalesData.map((item) => ({
        ...item,
        RTGBox: item.DeliveredBox,
      }))
      data.NetSale = 0;
      data.RemainigAmount = 0;
      data.Credit = 0;
      data.Totalamount = 0;
      data.SlabPercentage = 0;
      data.SlabDiscount = 0;
      data.LessAmount = 0;

    }
    if (data.isCancelled == false) {
      data.SalesData = data.SalesData.map((item) => ({
        ...item,
        RTGBox: 0,
      }))
      // Wapis uncancel karne par slab discount dobara calculate karo
      recalculateSlabDiscount(data);
    }
    setLoadFormData(updatedData);
  };

  const toggleForwardStatus = (loadIndex) => {
    const updatedData = [...loadFormData];
    updatedData[loadIndex].isForwarded = !updatedData[loadIndex].isForwarded;
    setLoadFormData(updatedData);
  };

  const handleSaveDSR = async () => {
    if (loadFormData.length === 0) {
      toast.warning('No data to save');
      return;
    }

    setIsLoading(true);

    try {
      // Save logic would go here
      // const response = await createDataFunction('/DSR', loadFormData);
      toast.success('DSR saved successfully');
      setLoadFormData([]);
      setSelectedLoadForm(null);
      setShowLoadFormDetails(false);
    } catch (error) {
      console.error('Error saving DSR:', error);

      if (error.status === 408) {
        const errorData = error.response.data.errors.map(item => ({
          ...item,
          product: products.find(p => p._id === item.product)?.ProductName || 'Unknown',
        }));
        downloadErrorExcel(errorData);
        toast.error('Errors found in data. Download error file for details.');
      } else if (error.status === 409) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadErrorExcel = (errorData) => {
    const worksheet = XLSX.utils.json_to_sheet(errorData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Errors');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const fileData = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(fileData, `DSR_Errors_${new Date().toISOString().split('T')[0]}.xlsx`);
  };


  const CancelAll = () => {
    if (cancelAll == false) {
      console.log(cancelAll)
      const data = loadFormData.map((item) => ({
        ...item,
        isCancelled: true,
        isForwarded: false,
        NetSale: 0,
        RemainigAmount: 0,
        Totalamount: 0,
        SlabPercentage: 0,
        SlabDiscount: 0,
        LessAmount: 0,
        SalesData: item.SalesData.map((sales) => ({
          ...sales,
          RTGBox: sales.DeliveredBox,
        }))
      }))

      setLoadFormData(data)
      setCancelAll(true)
    }

    if (cancelAll == true) {
      const data = loadFormData.map((item) => {
        const newItem = {
          ...item,
          isCancelled: false,
          isForwarded: false,
          SalesData: item.SalesData.map((sales) => ({
            ...sales,
            RTGBox: 0,
          }))
        }
        // Uncancel par slab discount dobara calculate karo
        return recalculateSlabDiscount(newItem)
      })

      setLoadFormData(data)
      setCancelAll(false)
    }
  }

  const FarwardAll = () => {

    if (forwardAll == false) {
      console.log(forwardAll)
      const data = loadFormData.map((item) => {
        const newItem = {
          ...item,
          isCancelled: false,
          isForwarded: true,
          SalesData: item.SalesData.map((sales) => ({
            ...sales,
            RTGBox: sales.DeliveredBox,
          }))
        }
        // Forward hone par bhi slab discount current value par recalculate karo
        return recalculateSlabDiscount(newItem)
      })

      setLoadFormData(data)
      setforwardAll(true)
    }

    if (forwardAll == true) {
      const data = loadFormData.map((item) => {
        const newItem = {
          ...item,
          isCancelled: false,
          isForwarded: false,
          SalesData: item.SalesData.map((sales) => ({
            ...sales,
            RTGBox: 0,
          }))
        }
        return recalculateSlabDiscount(newItem)
      })

      setLoadFormData(data)
      setforwardAll(false)
    }
  }

  // ============= COMPONENT RENDER FUNCTIONS =============
  const renderLoadFormSelection = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-6">
        Load Form Selection
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Load Form
          </label>
          <Select
            value={selectedLoadForm}
            onChange={setSelectedLoadForm}
            options={loadFormOptions}
            className="basic-single"
            classNamePrefix="select"
            placeholder="Choose a load form..."
            isClearable
            isLoading={isLoading}
          />
          <p className="mt-1 text-sm text-gray-500">
            Select a load form to view and settle DSR details
          </p>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={fetchLoadFormData}
            disabled={!selectedLoadForm || isLoading}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            ) : 'Settle Load Form'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPaymentModal = () => {
    if (!enterDetaiModal) return null;

    const FormData = loadFormData.filter(
      item => item.NetSale !== 0 && item.isForwarded === false
    )
    const handlePaymentChange = (id, field, value) => {
      setLoadFormData(prev =>
        prev.map(item => {
          if (String(item._id) !== String(id)) return item;

          let cash = Number(item.cashAmount) || 0;
          let chq = Number(item.Chq) || 0;
          let chqNumber = item.chqNumber || item.ChqNumber || "";
          let chqDate = item.chqDate || item.ChqDate || "";
          const cashEdited = field === "cash" ? true : Boolean(item.cashEdited);

          if (field === "cash") cash = Number(value) || 0;
          if (field === "chq") chq = Number(value) || 0;
          if (field === "chqNumber") chqNumber = value;
          if (field === "chqDate") chqDate = value;

          const netSale = Number(item.NetSale) || 0;
          if (!cashEdited) {
            cash = Math.max(0, Math.round((netSale - chq) * 100) / 100);
          }
          if (cash + chq > netSale) {
            toast.error("Cash + Cheque cannot exceed Total Amount");
            return item;
          }

          const credit = Math.round((netSale - cash - chq) * 100) / 100;

          return {
            ...item,
            cashAmount: cash,
            cashEdited,
            Chq: chq,
            Credit: credit,
            RemainigAmount: credit,
            chqNumber,
            chqDate,
            ChqNumber: chqNumber,
            ChqDate: chqDate,
          };
        })
      );
    };


    return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] overflow-hidden flex flex-col">

    {/* Header */}
    <div className="flex justify-between items-center p-4 border-b shrink-0">
      <h2 className="text-xl font-bold">Load Form Statement</h2>
      <button
        onClick={() => setEnterDetaiModal(false)}
        className="text-xl font-bold"
      >
        ×
      </button>
    </div>

    {/* Body (SCROLL AREA) */}
    <div className="flex-1 overflow-y-auto p-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">
          Load Form Statement
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Customer</th>
                      <th className="px-3 py-2 text-left">DisSalesInvoice</th>
                      <th className="px-3 py-2 text-left">NetSale</th>
                      <th className="px-3 py-2 text-left">Cash</th>
                      <th className="px-3 py-2 text-left">Credit</th>
                      <th className="px-3 py-2 text-left">Chq</th>
                      <th className="px-3 py-2 text-left">Chq Number</th>
                      <th className="px-3 py-2 text-left">Chq Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FormData.map((item, index) => {

                      return (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="px-3 py-2">{customers.find(c => c._id === item.Client)?.CustomorName || item.Client}</td>
                          <td className="px-3 py-2">{item.DisSalesInvoice || 0}</td>
                          <td className="px-3 py-2">
                            {Number(item.NetSale || item.Totalamount || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={item.cashAmount || ""}
                              onChange={(e) =>
                                handlePaymentChange(item._id, "cash", e.target.value)
                              }
                              className="w-[5vw] px-3 py-2 border rounded"
                            />

                          </td>
                          <td className="px-3 py-2">
                            {item.Credit ?? ((Number(item.NetSale) || 0) - (Number(item.cashAmount) || 0) - (Number(item.Chq) || 0))}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={item.Chq || ""}
                              onChange={(e) =>
                                handlePaymentChange(item._id, "chq", e.target.value)
                              }
                              className="w-[5vw] px-3 py-2 border rounded"
                            />


                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.chqNumber || item.ChqNumber || ""}
                              onChange={(e) =>
                                handlePaymentChange(item._id, "chqNumber", e.target.value)
                              }
                              className="w-[5vw] px-3 py-2 border rounded"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="Date"
                              value={item.chqDate || item.ChqDate || ""}
                              onChange={(e) =>
                                handlePaymentChange(item._id, "chqDate", e.target.value)
                              }
                              className="w-[5vw]  py-2 border rounded"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="flex justify-end gap-3 p-4 border-t shrink-0">
      <button
        onClick={SubmitData}
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Settling..." : "Settle LoadForm"}
      </button>
      <button
        onClick={() => setEnterDetaiModal(false)}
        className="px-4 py-2 border rounded"
      >
        Close
      </button>
    </div>

  </div>
</div>

    );
  };



  const renderViewStockModal = () => {
    if (!viewStockOpen) return null;

    const { rows, totals } = stockSummary;
    const loadFormNumber = selectedLoadForm?.label || loadFormData[0]?.LoadFormNumber || '';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 border-b shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">View Stock</h2>
              <p className="text-gray-600 mt-1">
                Load Form {loadFormNumber} · {rows.length} product(s)
              </p>
            </div>
            <button
              onClick={() => setViewStockOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Order</p>
                <p className="text-xl font-semibold text-gray-800">{totals.order}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="text-xl font-semibold text-green-700">{totals.delivered}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">RTG</p>
                <p className="text-xl font-semibold text-amber-700">{totals.rtg}</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right">Order</th>
                    <th className="px-3 py-2 text-right">Delivered</th>
                    <th className="px-3 py-2 text-right">RTG</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                        Is load form par stock lines nahi hain
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">
                          {row.code ? <span className="text-gray-500 mr-2">{row.code}</span> : null}
                          {row.name}
                        </td>
                        <td className="px-3 py-2 text-right">{row.order}</td>
                        <td className="px-3 py-2 text-right">{row.delivered}</td>
                        <td className="px-3 py-2 text-right">{row.rtg}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-200 font-bold">
                      <td className="px-3 py-2" colSpan={2}>Total</td>
                      <td className="px-3 py-2 text-right">{totals.order}</td>
                      <td className="px-3 py-2 text-right">{totals.delivered}</td>
                      <td className="px-3 py-2 text-right">{totals.rtg}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 shrink-0">
            <button
              onClick={() => setViewStockOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!isModalOpen || !selectedLoadFormForModal) return null;

    const customerName = customers.find(c => c._id === selectedLoadFormForModal.Client)?.CustomorName || selectedLoadFormForModal.Client;
    const distributorName = currentUser?.DistrbutorName || selectedLoadFormForModal.Distrbutor;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Invoice Details: {selectedLoadFormForModal.DisSalesInvoice}
              </h2>
              <p className="text-gray-600 mt-1">
                Date: {new Date(selectedLoadFormForModal.SalesInvoiceDate).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={closeModal}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 gap-6">
              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Client</label>
                    <p className="text-gray-800">{customerName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Distributor</label>
                    <p className="text-gray-800">{distributorName}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Products Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Quantity (Will)</th>
                        <th className="px-3 py-2 text-left">Net Amount</th>
                        <th className="px-3 py-2 text-left">RTG Rate</th>
                        <th className="px-3 py-2 text-left">RTG Box</th>
                        <th className="px-3 py-2 text-left">Delivered Box</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLoadFormForModal.SalesData.map((item, index) => {
                        const productName = products.find(p => p._id === item.product)?.ProductName || item.product;
                        return (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="px-3 py-2">{productName}</td>
                            <td className="px-3 py-2">{item.DeliveredBoxWill || 0}</td>
                            <td className="px-3 py-2">{item.NetSale?.toLocaleString()}</td>
                            <td className="px-3 py-2">{item.RTGRate?.toFixed(2)}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                max={item.DeliveredBoxWill}
                                value={item.RTGBox}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;

                                  const originalItem = selectedLoadFormForModal.SalesData[index];

                                  // ❌ invalid input check FIRST
                                  if (val > originalItem.DeliveredBoxWill) {
                                    toast.error("RTG Box must be less than or equal to Delivered Box");
                                    return;
                                  }

                                  // RTG ke hisab se product ka NetSale update karo (common helper)
                                  const updatedItem = applyRTGToSalesItem({ ...originalItem }, val);

                                  const updatedSalesData = [...selectedLoadFormForModal.SalesData];
                                  updatedSalesData[index] = updatedItem;

                                  const newQty = updatedSalesData.reduce((sum, i) => sum + i.DeliveredBox, 0);

                                  // RTG ke baad slab dobara check karke naya discount apply karo
                                  const { slabPercentage, slabDiscount, netTotal } = calculateSlabValues(
                                    updatedSalesData,
                                    selectedLoadFormForModal.Client,
                                    selectedLoadFormForModal
                                  );

                                  const nextLoad = {
                                    ...selectedLoadFormForModal,
                                    SalesData: updatedSalesData,
                                    quantity: newQty,
                                    SlabPercentage: slabPercentage,
                                    SlabDiscount: slabDiscount,
                                    LessAmount: slabDiscount,
                                  };
                                  applyNetAndRemaining(nextLoad, netTotal);
                                  setSelectedLoadFormForModal(nextLoad);
                                }}

                                className="w-24 px-2 py-1 border rounded"
                              />
                            </td>
                            <td className="px-3 py-2">
                              {item.DeliveredBox}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-200 font-bold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2">
                          {selectedLoadFormForModal.SalesData.reduce((sum, i) => sum + (i.DeliveredBoxWill || 0), 0)}
                        </td>
                        <td className="px-3 py-2">
                          {selectedLoadFormForModal.SalesData.reduce((sum, i) => sum + (i.NetSale || 0), 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2">
                          {selectedLoadFormForModal.SalesData.reduce((sum, i) => sum + (i.RTGBox || 0), 0)}
                        </td>
                        <td className="px-3 py-2">
                          {selectedLoadFormForModal.SalesData.reduce((sum, i) => sum + (i.DeliveredBox || 0), 0)}
                        </td>
                      </tr>
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-3 py-2" colSpan={2}>
                          Slab Discount ({selectedLoadFormForModal.SlabPercentage || 0}%)
                        </td>
                        <td className="px-3 py-2">
                          - {Number(selectedLoadFormForModal.SlabDiscount || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2">
                          Net: {Number(selectedLoadFormForModal.NetSale || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Payment Information */}


            {/* Notes Section - if available */}

          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={saveModalChanges}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLoadFormDetails = () => {
    if (loadFormData.length === 0 || !showLoadFormDetails) return null;

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-700">
              Load Form Details
            </h2>
            <p className="text-gray-500 text-sm gap-5">
              {loadFormData.length} load form(s) loaded
              {forwardAll == false ?
                <button
                  onClick={() => CancelAll()}
                  disabled={isLoading}
                  className=" ml-5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {cancelAll == false ? "Cancel All" : "UnCancel"}
                </button>
                : null}
              {
                cancelAll == false ?
                  <button
                    onClick={() => FarwardAll()}
                    disabled={isLoading}
                    className=" ml-5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {forwardAll == false ? "Forward All" : "UnForwardAll"}
                  </button>
                  : null}
            </p>

          </div>

          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={openEnterDetail}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Enter Detail
            </button>
            <button
              onClick={() => setViewStockOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Stock
            </button>
          </div>
        </div>

        {loadFormData.map((load, loadIndex) => {
          const customerName = customers.find(c => c._id === load.Client)?.CustomorName || load.Client;
          const distributorName = currentUser?.DistrbutorName || load.Distrbutor;
          const orderBookerName = orderBookers.find(ob => ob._id === load.OrderBooker)?.OrderBookerName || '';

          return (
            <div key={load._id} className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              {/* Load Form Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <InfoItem label="Sales Invoice" value={load.DisSalesInvoice} />
                <InfoItem label="Order Booker" value={orderBookerName} />
                <InfoItem label="Client" value={customerName} />
                <InfoItem label="Total Amount" value={`${load.NetSale?.toLocaleString() || 0}`} />
                <InfoItem label="Total Quantity" value={load.quantity || 0} />
                <InfoItem label="Total Deliverd" value={load.DeliveredBox || 0} />
                <InfoItem label="Remaining Amount" value={`${load.RemainigAmount?.toLocaleString() || 0}`} />
                <InfoItem
                  label="Slab Discount"
                  value={Number(load.SlabDiscount || 0) > 0
                    ? `${load.SlabPercentage || 0}% (${Number(load.SlabDiscount || 0).toLocaleString()})`
                    : '0'}
                />
                <div className="flex items-center gap-4 mb-6">
                  {/* Toggle Cancel Button */}
                  {load.isForwarded !== true ?
                    <button
                      onClick={() => toggleCancelStatus(loadIndex, load._id)}
                      className={`px-4 py-2 rounded font-medium ${load.isCancelled
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      {load.isCancelled ? 'Cancelled' : 'Cancel'}
                    </button>
                    : null}
                  {/* Checkbox for Forward */}
                  {load.isCancelled !== true ?
                    <>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={load.isForwarded}
                          onChange={() => toggleForwardStatus(loadIndex)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Forward</span>
                      </label>
                      {load.isForwarded !== true ?
                        <button
                          onClick={() => openEditModal(loadIndex)}
                          className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        : null}
                    </>
                    : null}
                </div>
              </div>



            </div>
          );
        })}
      </div>
    );
  };

  // ============= HELPER COMPONENTS =============
  const InfoItem = ({ label, value }) => (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-base font-semibold text-gray-800">{value}</span>
    </div>
  );

  // ============= EFFECTS =============
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ============= MAIN RENDER =============
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-lg font-medium text-gray-700">Processing...</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Daily Sales Report (DSR)
              </h1>
              <p className="text-gray-600 mt-2">
                Manage and settle load forms for daily sales reporting
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        {renderLoadFormSelection()}
        {renderLoadFormDetails()}

        {/* Empty State */}
        {!showLoadFormDetails && loadFormData.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 text-gray-400 mb-4">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Load Form Selected</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Select a load form from the dropdown above and click "Settle Load Form" to begin creating your DSR.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {renderModal()}
      {renderPaymentModal()}
      {renderViewStockModal()}
    </div>
  );
};

export default DSR;