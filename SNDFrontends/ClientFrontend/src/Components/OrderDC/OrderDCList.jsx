import axios from 'axios';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select'
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunction, deleteDataFunction, getDataFundtion } from '../../Api/CurdFunctions.jsx';
import { fetchSaleOrder } from '../../Redux/Reducers/SaleOrderReducer.js';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer.js';
import { useForm } from 'react-hook-form';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const OrderDCList = () => {
    const [rows, setRows] = useState();

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [selectedOrderBooker, setSelectedOrderBooker] = useState(null);
    const [Customer , setCustomer] = useState([])
    const currentUser = useSelector((state) => state.LoginerReducer.userDetail);

    const [Prod ,setProd] = useState([]); 
    const SaleOrder = useSelector((state) => state.SaleOrder.SaleOrder)
    const [Orders, setOrders] = useState([])
    const [selectedRows, setSelectedRows] = useState([]);
    const [tableData, setTableData] = useState([])
    console.log(tableData, "tableData")
    const [PriceList, setPriceList] = useState([])
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [Disabled, setDisabled] = useState(false);
    const [isStockAllocated, setIsStockAllocated] = useState(false);
    const [productStockMap, setProductStockMap] = useState({}); // Stock limits store karne ke liye
    const [slab, setSLab] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { register, handleSubmit, formState: { errors }, reset, getValues } = useForm();
    const downloadExcel = (data) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Errors");

        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
        });

        const fileData = new Blob([excelBuffer], {
            type: "application/octet-stream",
        });

        saveAs(fileData, "Order_Errors.xlsx");
    };
    const handleCheckboxChange = (id) => {
        setSelectedRows(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const openEditModal = (order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    // Function to close modal
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
    };

    // ===== SLAB DISCOUNT HELPER =====
    // Customer ki price list ke slab ke mutabiq discount % nikalta hai.
    // Logic:
    //  - amount < fromAmount  -> 0%
    //  - amount > toAmount    -> maxPercentage
    //  - warna slabRows me range check karke us ka percentage
    const getSlabPercentage = (slab, amount) => {
        if (!slab) return 0;
        const from = Number(slab.fromAmount) || 0;
        const to = Number(slab.toAmount) || 0;
        if (amount < from) return 0;
        if (amount > to) return Number(slab.maxPercentage) || 0;
        const row = (slab.slabRows || []).find(
            (r) => amount >= Number(r.from) && amount <= Number(r.to)
        );
        return row ? Number(row.percentage) || 0 : 0;
    };

    // TO Scheme date check: invoice date (DcDate) SchemeStartDate - SchemeEndDate ke darmy ho to hi TO apply hota hai
    // Dates ko YYYY-MM-DD string me normalize karke compare karte hain (timezone-safe)
    const normalizeDateStr = (value) => {
        if (!value) return "";
        const str = String(value).trim();
        // Already YYYY-MM-DD
        if (/^d{4}-d{2}-d{2}/.test(str)) return str.slice(0, 10);
        // Excel serial number ya timestamp
        const d = new Date(value);
        return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    };
    const isSchemeActive = (invoiceDate, schemeStart, schemeEnd) => {
        console.log(invoiceDate, schemeStart, schemeEnd)
        const today = new Date();
const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const inv = normalizeDateStr(formattedDate);
        const start = normalizeDateStr(schemeStart);
        const end = normalizeDateStr(schemeEnd);
        if (!inv || !start || !end) return false;
        return inv >= start && inv <= end;
    };

    const onSubmit = async (data) => {
        data.OrderBooker = selectedOrderBooker.value
        data.Distributor = loginVendor._id


        try {

            const OrderData = await getDataFundtion(
                `/saleOrder/getDataByBookerAndDate/?date=${data.DcDate}&OrderBooker=${selectedOrderBooker.value}`
            );
            const customers =  await getDataFundtion(`/Customor/AllCutomerByDis/${currentUser._id}`)
            const Product = await getDataFundtion("/product")
            setProd(Product.data)
            setCustomer(customers.data)
            console.log(OrderData)
            setOrders(OrderData.data)
            if (OrderData.data.length == 0) {
                toast.error("No Data Found")
            }

        } catch (err) {
            console.log(err)
        }

    }
    useEffect(() => {
        if (Orders.length > 0) {
            setSelectedRows(Orders.map(row => row._id));
        }
    }, [Orders]);

    const StockAllocate = async (data) => {
        let OrderBooker = selectedOrderBooker.value
        let Distributor = loginVendor._id


        try {
            const selectedOrders = Orders.filter((item) => selectedRows.includes(item._id))

            // ===== PRICE LIST VALIDATION (pehle check karo) =====
            const validationErrors = [];

            for (const item of selectedOrders) {
                const foundCustomer = Customer.find((cr) => cr._id === item.Customer);
                const customerName = foundCustomer?.CustomorName || "Unknown Customer";

                // Check 0: Customer usi order booker ka hona chahiye jis booker ke orders load hue hain
                const customerBooker = foundCustomer?.OrderBooker?._id || foundCustomer?.OrderBooker;
                if (!customerBooker || String(customerBooker) !== String(OrderBooker)) {
                    validationErrors.push(`${customerName} is order booker (${selectedOrderBooker?.label || "selected booker"}) ka customer nahi hai`);
                    continue;
                }

                // Check 1: Customer ko PriceList assign hai ya nahi
                if (!foundCustomer?.PriceList) {
                    validationErrors.push(`${customerName} ki Price List assign nahi hai`);
                    continue;
                }

                // Check 2: Wo PriceList exist bhi karti hai ya nahi
                const foundPriceList = PriceList.find((pr) => pr._id === foundCustomer.PriceList);
                console.log(PriceList)
                if (!foundPriceList) {
                    validationErrors.push(`${customerName} ki Price List exist nahi karti`);
                    continue;
                }

                // Check 3: Har product ka price us PriceListData mein hai ya nahi
                const priceListData = foundPriceList.PriceListData || [];
                for (const orderItem of item.SaleOrderData) {
                    const productPrice = priceListData.find((it) => it.product == orderItem.product);
                    const productName = Prod.find((pr) => pr._id === orderItem.product)?.ProductName || orderItem.product;

                    if (!productPrice) {
                        validationErrors.push(`${customerName} - ${productName} ka price PriceList mein nahi hai`);
                    }

                }
            }

            // Agar koi bhi error hai to ruko aur dikhao
            if (validationErrors.length > 0) {
                toast.error("Price List validation failed! Stock allocate nahi ho sakta.");
                // Unique errors dikhao
                const uniqueErrors = [...new Set(validationErrors)];
                uniqueErrors.forEach(err => {
                    toast.warn(err, { autoClose: 8000 });
                });
                return; // Yahan se aage mat badho
            }
            // ===== VALIDATION END =====


            const totalProdut = await getDataFundtion(`/totalproduct/${loginVendor._id}`)

            const products = totalProdut.data
            console.log(products)
            const productStockMap = {};

            products.forEach(pr => {
                productStockMap[pr.ProductName] = {
                    totalBox: pr.totalBox,
                    remainingQty: pr.TotalQuantity
                };
            });

            const AllData = selectedOrders.map(item => {
                const foundCustomer = Customer.find((cr) => cr._id === item.Customer);
                const foundPriceList = PriceList.find((pr) => pr._id === foundCustomer.PriceList);
                const priceListData = foundPriceList?.PriceListData || [];
                const orderNumber = item.SaleOrderNumber
                return {
                    ...item,
                    SaleOrderData: item.SaleOrderData.map(p => {
                        const stock = productStockMap[p.product];
                        const Product = priceListData.find((it) => it.product == p.product)

                        if (!stock) {
                            return {
                                ...p,
                                DeliveredBox: 0,
                                SpecialTO: 0,
                                To: 0,
                                ClaimableSpecialTO: 0,
                                UnClaimableSpecialTO: 0,
                                GrossAmount: 0,
                                NetSale: 0
                            };
                        }

                        const deliveredQty = Math.min(p.totalBox, stock.remainingQty);
                        stock.remainingQty -= deliveredQty;

                        // TO sirf tab apply hoga jab DcDate (invoice date) SchemeStartDate - SchemeEndDate ke darmy ho
                        const schemeActive = isSchemeActive(getValues("DcDate"), Product.SchemeStartDate, Product.SchemeEndDate);
                        console.log(Product)
                        const toPerBox = schemeActive ? (Number(Product.SpecialTO) || 0) : 0;
                        const ClaimableSpecialTO = schemeActive ? (Number(Product.ClaimableSpecialTO) || 0) : 0;
                        const UnClaimableSpecialTO = schemeActive ? (Number(Product.UnClaimableSpecialTO) || 0) : 0;
                        const tpSalePerBox = Number(Product.TPSale) || 0;
                        const disPer = Number(Product.DisPer) || 0;
                        // Scheme active na ho to NetSale bina TO ke recompute hota hai: TPSale - (TPSale * DisPer / 100)
                        const netSalePerBox = (tpSalePerBox) - (toPerBox) - (Number(Product.TO || 0)) 
                        console.log(netSalePerBox)
                        return {
                            product: p.product,
                            orderBox: p.totalBox,
                            orderNumber,
                            SpecialTO: toPerBox * deliveredQty,
                            To : Number(Product.TO || 0) * deliveredQty,
                            ClaimableSpecialTO: ClaimableSpecialTO * deliveredQty,
                            UnClaimableSpecialTO: UnClaimableSpecialTO * deliveredQty,
                            GrossAmount: tpSalePerBox * deliveredQty,
                            NetSale: netSalePerBox * deliveredQty,
                            DeliveredBox: deliveredQty
                        };
                    })
                };
            });

            const table = AllData.map((item) => {
                const allZero = item.SaleOrderData.every(p => p.DeliveredBox === 0);
                const hasAnyZero = item.SaleOrderData.some(p => p.DeliveredBox === 0);
                const foundCustomer = Customer.find((Cu) => Cu._id === item.Customer);

                // ===== SLAB DISCOUNT (Gross Amount par) =====
                const orderGrossAmount = item.SaleOrderData.reduce(
                    (sum, p) => sum + (Number(p.GrossAmount) || 0), 0
                );
                const customerSlab = (slab || []).find(
                    (s) => s.status === "Active" && s.priceList?._id === foundCustomer?.PriceList
                );
                const slabPercentage = getSlabPercentage(customerSlab, orderGrossAmount);
                const slabDiscount = Math.round(((orderGrossAmount * slabPercentage) / 100) * 100) / 100;

                return {
                    ...item,
                    SaleOrderNumber: item.SaleOrderNumber,
                    Customer: item.Customer,
                    CustomerName: foundCustomer?.CustomorName,
                    DistrbutorName: loginVendor.DistrbutorName,
                    allZero,
                    hasAnyZero,
                    SlabPercentage: slabPercentage,
                    SlabDiscount: slabDiscount,
                    LessAmount: slabDiscount,
                };
            })
            // ✅ Stock limits state mein store karo — edit aur submit pe validation ke liye
            const stockMapForState = {};
            products.forEach(pr => {
                stockMapForState[pr.ProductName] = pr.TotalQuantity;
            });
            setProductStockMap(stockMapForState);

            setTableData(table)
            setOrders([])
            setIsStockAllocated(true)
        } catch (err) {
            toast.error("Some thing Went Wrong")
            console.log(err)
        }

    }

    const getData = async () => {
        setLoading(true)
        try {

            const PriceList = await getDataFundtion("/pricelist")
            setPriceList(PriceList)

            const allSlab = await getDataFundtion("/slab")
            setSLab(allSlab)

            const product = await getDataFundtion("/product")
            dispatch(fetchproduct(product.data));




            const Client = await getDataFundtion(`/Customor/AllCutomerByDis/${loginVendor._id}`)
            dispatch(fetchClient(Client.data))


            const OderBooker = await getDataFundtion(`/orderbooker/OrderByvendor/${loginVendor._id}`)
            dispatch(fetchOrderBooker(OderBooker.data))





        } catch (err) {
            console.log(err)
        }

    }


    // DeliveredBox ke mutabiq saare amount fields dobara calculate karta hai.
    // Agar DeliveredBox 0 ho to GrossAmount / NetSale / TO sab 0 ho jate hain.
    const calculateItemAmounts = (order, item, deliveredQty) => {
        const qty = Number(deliveredQty) || 0;
        const foundCustomer = Customer.find((cr) => cr._id === order.Customer);
        const foundPriceList = PriceList.find((pr) => pr._id === foundCustomer?.PriceList);
        const Product = foundPriceList?.PriceListData?.find((it) => it.product == item.product);

        // Price list mein product na mile to amounts zero rakh do
        if (!Product) {
            return {
                ...item,
                DeliveredBox: qty,
                SpecialTO: 0,
                To: 0,
                ClaimableSpecialTO: 0,
                UnClaimableSpecialTO: 0,
                GrossAmount: 0,
                NetSale: 0
            };
        }

        const schemeActive = isSchemeActive(getValues("DcDate"), Product.SchemeStartDate, Product.SchemeEndDate);
        const toPerBox = schemeActive ? (Number(Product.SpecialTO) || 0) : 0;
        const claimablePerBox = schemeActive ? (Number(Product.ClaimableSpecialTO) || 0) : 0;
        const unclaimablePerBox = schemeActive ? (Number(Product.UnClaimableSpecialTO) || 0) : 0;
        const tpSalePerBox = Number(Product.TPSale) || 0;
        const netSalePerBox = tpSalePerBox - toPerBox - (Number(Product.TO || 0));

        return {
            ...item,
            DeliveredBox: qty,
            SpecialTO: toPerBox * qty,
            To: Number(Product.TO || 0) * qty,
            ClaimableSpecialTO: claimablePerBox * qty,
            UnClaimableSpecialTO: unclaimablePerBox * qty,
            GrossAmount: tpSalePerBox * qty,
            NetSale: netSalePerBox * qty
        };
    };

    const handleDeliveredBoxChange = (orderId, itemIndex, value) => {
        let newValue = parseInt(value) || 0;

        // ✅ STOCK VALIDATION: DeliveredBox available stock se zyada nahi ho sakta
        const item = tableData.find(o => o._id === orderId)?.SaleOrderData[itemIndex];
        if (item) {
            const maxAvailable = productStockMap[item.product] || 0;
            if (newValue > maxAvailable) {
                toast.warn(`Stock limited! Max available: ${maxAvailable} boxes. Aapne ${newValue} dala.`, { autoClose: 4000 });
                newValue = maxAvailable;
            }
        }

        // Update tableData directly
        setTableData(prevData =>
            prevData.map(order => {
                if (order._id === orderId) {
                    const updatedSaleOrderData = order.SaleOrderData.map((item, idx) =>
                        idx === itemIndex ? calculateItemAmounts(order, item, newValue) : item
                    );
                    const allZero = updatedSaleOrderData.every(p => (Number(p.DeliveredBox) || 0) === 0);
                    const hasAnyZero = updatedSaleOrderData.some(p => (Number(p.DeliveredBox) || 0) === 0);

                    // Slab discount bhi edited GrossAmount ke mutabiq dobara calculate karo
                    const foundCustomer = Customer.find((Cu) => Cu._id === order.Customer);
                    const orderGrossAmount = updatedSaleOrderData.reduce(
                        (sum, p) => sum + (Number(p.GrossAmount) || 0), 0
                    );
                    const customerSlab = (slab || []).find(
                        (s) => s.status === "Active" && s.priceList?._id === foundCustomer?.PriceList
                    );
                    const slabPercentage = getSlabPercentage(customerSlab, orderGrossAmount);
                    const slabDiscount = Math.round(((orderGrossAmount * slabPercentage) / 100) * 100) / 100;

                    return {
                        ...order,
                        SaleOrderData: updatedSaleOrderData,
                        allZero,
                        hasAnyZero,
                        SlabPercentage: slabPercentage,
                        SlabDiscount: slabDiscount,
                        LessAmount: slabDiscount
                    };
                }
                return order;
            })
        );

        // Also update the selectedOrder state for the modal
        if (selectedOrder && selectedOrder._id === orderId) {
            setSelectedOrder(prev => ({
                ...prev,
                SaleOrderData: prev.SaleOrderData.map((item, idx) =>
                    idx === itemIndex ? calculateItemAmounts(prev, item, newValue) : item
                )
            }));
        }
    };

    // ===== STOCK RECALCULATE: Current stock ke hisaab se DeliveredBox dobara calculate karo =====
    const RecalculateStock = async () => {
        try {
            setDisabled(true)

            // 1. Fresh stock fetch karo
            const freshStockRes = await getDataFundtion(`/totalproduct/${loginVendor._id}`);
            const freshProducts = freshStockRes.data || [];

            // 2. Stock map banao (ProductName -> TotalQuantity)
            const freshStockMap = {};
            freshProducts.forEach(pr => {
                freshStockMap[pr.ProductName] = pr.TotalQuantity;
            });

            // 3. Abhi ke stock map ko update karo (handleDeliveredBoxChange ke liye)
            const stockMapForState = {};
            freshProducts.forEach(pr => {
                stockMapForState[pr.ProductName] = pr.TotalQuantity;
            });
            setProductStockMap(stockMapForState);

            // 4. Har order ke liye DeliveredBox recalculate karo
            const recalculatedData = tableData.map(order => {
                const foundCustomer = Customer.find((cr) => cr._id === order.Customer);
                const foundPriceList = PriceList.find((pr) => pr._id === foundCustomer?.PriceList);
                const priceListData = foundPriceList?.PriceListData || [];

                // Is order ke liye merged stock tracking
                const orderStockTracker = { ...freshStockMap };

                const updatedSaleOrderData = order.SaleOrderData.map(item => {
                    const available = orderStockTracker[item.product] || 0;
                    const orderQty = Number(item.orderBox) || 0;

                    // DeliveredBox = min(orderQty, available)
                    const newDeliveredBox = Math.min(orderQty, available);

                    // Stock reduce karo is order ke liye
                    if (orderStockTracker[item.product] !== undefined) {
                        orderStockTracker[item.product] -= newDeliveredBox;
                    }

                    // Amounts recalculate karo
                    return calculateItemAmounts(order, item, newDeliveredBox);
                });

                const allZero = updatedSaleOrderData.every(p => (Number(p.DeliveredBox) || 0) === 0);
                const hasAnyZero = updatedSaleOrderData.some(p => (Number(p.DeliveredBox) || 0) === 0);

                // Slab discount recalculate
                const orderGrossAmount = updatedSaleOrderData.reduce(
                    (sum, p) => sum + (Number(p.GrossAmount) || 0), 0
                );
                const customerSlab = (slab || []).find(
                    (s) => s.status === "Active" && s.priceList?._id === foundCustomer?.PriceList
                );
                const slabPercentage = getSlabPercentage(customerSlab, orderGrossAmount);
                const slabDiscount = Math.round(((orderGrossAmount * slabPercentage) / 100) * 100) / 100;

                return {
                    ...order,
                    SaleOrderData: updatedSaleOrderData,
                    allZero,
                    hasAnyZero,
                    SlabPercentage: slabPercentage,
                    SlabDiscount: slabDiscount,
                    LessAmount: slabDiscount
                };
            });

            setTableData(recalculatedData);
            toast.success("Stock recalculated successfully!");
        } catch (err) {
            console.error("Recalculate failed:", err);
            toast.error("Stock recalculate failed!");
        } finally {
            setDisabled(false)
        }
    };

    const checkAcess = async () => {
        const allowAcess = await UserRihts.find((item) => item == DeleteRight)
        console.log(allowAcess)
        if (allowAcess) {
            setdeleteR(true)
        }
        const viweAcess = await UserRihts.find((item) => item == pageName)
        if (!viweAcess) {
            navigate("/")
        }
    }
    useEffect(() => {

        getData()
    }, [])

    const SubmitData = async () => {
        try {
            setDisabled(true)
            // Zero stock (DeliveredBox 0) items backend par nahi jate — sirf stock wale items submit hote hain
            const filteredData = tableData
                .map(row => ({
                    ...row,
                    SaleOrderData: row.SaleOrderData.filter(
                        p => (Number(p.DeliveredBox) || 0) > 0
                    )
                }))
                .filter(row => row.SaleOrderData.length > 0);
            if (filteredData.length === 0) {
                toast.error("No invoices with stock to submit");
                setDisabled(false)
                return;
            }

            // ===== FINAL VALIDATION: Submit se pehle ek baar phir check karo =====
            for (const row of filteredData) {
                const foundCustomer = Customer.find((cr) => cr._id === row.Customer);
                if (!foundCustomer?.PriceList) {
                    toast.error(`${row.CustomerName} ki Price List assign nahi hai! Submit nahi ho sakta.`);
                    setDisabled(false)
                    return;
                }
                const foundPriceList = PriceList.find((pr) => pr._id === foundCustomer.PriceList);
                if (!foundPriceList) {
                    toast.error(`${row.CustomerName} ki Price List exist nahi karti! Submit nahi ho sakta.`);
                    setDisabled(false)
                    return;
                }
            }

            // ✅ MERGE ALL PRODUCTS: Tamam orders ke products ko merge karo
            // e.g. Product A: 40 + Product A: 50 → Product A: 90, Product B: 40
            const allSaleOrderItems = filteredData.flatMap(row => row.SaleOrderData);
            const mergedProducts = allSaleOrderItems.reduce((acc, item) => {
                if (!item.product || (Number(item.DeliveredBox) || 0) <= 0) return acc;
                const key = item.product.toString();
                if (!acc[key]) {
                    acc[key] = {
                        product: item.product,
                        DeliveredBox: Number(item.DeliveredBox) || 0
                    };
                } else {
                    acc[key].DeliveredBox += Number(item.DeliveredBox) || 0;
                }
                return acc;
            }, {});

            const mergedArray = Object.values(mergedProducts);
            console.log("Merged Products:", mergedArray);

            // ✅ FRESH STOCK CHECK: Submit se pehle REAL-TIME stock fetch karo
            try {
                const freshStockRes = await getDataFundtion(`/totalproduct/${loginVendor._id}`);
                const freshStockMap = {};
                (freshStockRes.data || []).forEach(pr => {
                    freshStockMap[pr.ProductName] = pr.TotalQuantity;
                });

                // Merged products ke liye check karo ke total DeliveredBox available stock se zyada toh nahi
                const stockErrors = [];
                for (const merged of mergedArray) {
                    const available = freshStockMap[merged.product] || 0;
                    const prodName = Prod.find(pr => pr._id === merged.product)?.ProductName || merged.product;
                    if (merged.DeliveredBox > available) {
                        stockErrors.push(`${prodName}: Total Required=${merged.DeliveredBox}, Available=${available} — Shortage=${merged.DeliveredBox - available}`);
                    }
                }

                if (stockErrors.length > 0) {
                    toast.error("❌ Stock insufficient hai! Merged quantities check karein:");
                    stockErrors.forEach(err => toast.warn(err, { autoClose: 10000 }));
                    setDisabled(false)
                    return;
                }
            } catch (stockErr) {
                console.error("Fresh stock check failed:", stockErr);
                toast.error("Stock check fail ho gaya. Dubara try karein.");
                setDisabled(false)
                return;
            }
            // ===== MERGED STOCK VALIDATION END =====

            const data = {
                OrderBooker: selectedOrderBooker.value,
                Distributor: loginVendor._id,
                OrderData: filteredData,
                // ✅ Merged products object backend ko directly bhejo — backend se directly stock deduct hoga
                MergedProducts: mergedArray
            };

            const res = await createDataFunction(`/SalesInvoice`, data)
            toast.success("Stock Allocated Suces Fully")
            setTimeout(() => {
                navigate(0)
            }, 1500)
        } catch (err) {
            setDisabled(false)
            console.log(err)
            toast.error("Some Thing Went Wrong")
        }

    }

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(",", ""); // Removes the comma
    };


    const OrderBookerDrp = OrderBooker?.map((item) => ({
        value: item._id,
        label: item.OrderBookerName,

    }))

    return (
        <div className="p-4  ">
            <ToastContainer />
            {isModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    Order Details: {selectedOrder.SaleOrderNumber}
                                </h2>
                                <p className="text-gray-600 mt-1">
                                    Date: {formatDate(selectedOrder.SaleOrderDate)}
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
                            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                                {/* Customer Information */}


                                {/* Order Details */}
                                <div className="space-y-4">


                                    {/* Order Items - if available */}
                                    {selectedOrder.SaleOrderData && selectedOrder.SaleOrderData.length > 0 && (
                                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                                            <h3 className="font-semibold text-gray-800 mb-3">Order Items</h3>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left">Product</th>
                                                            <th className="px-3 py-2 text-left">Order Quantity</th>
                                                            <th className="px-3 py-2 text-left">DeliveredBox</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedOrder.SaleOrderData.map((item, index) => (
                                                            <tr key={index} className="border-b border-gray-100">
                                                                {console.log(Prod)}
                                                                <td className="px-3 py-2">{Prod.find((pr) => pr._id === item.product)?.ProductName || ""}</td>
                                                                <td className="px-3 py-2">{item.totalBox || 0}</td>
                                                                <input
                                                                    type="number"
                                                                    value={item.DeliveredBox || ''}
                                                                    onChange={(e) => handleDeliveredBoxChange(selectedOrder._id, index, e.target.value)}
                                                                    className="w-24 px-2 py-1 border rounded"
                                                                />
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notes Section - if available */}
                            {selectedOrder.Notes && (
                                <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
                                    <p className="text-gray-700">{selectedOrder.Notes}</p>
                                </div>
                            )}
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
                                onClick={() => {
                                    // Add your edit/save logic here
                                    console.log('Save changes for:', selectedOrder);
                                    closeModal();
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800 mb-6">Allocate Order</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Sale Date</label>
                        <input
                            type="date"
                            {...register("DcDate", { required: true })}
                            className="w-full px-3 py-2 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm md:text-base text-gray-700 font-semibold mb-2">Order Booker</label>
                        <Select onChange={(v) => setSelectedOrderBooker(v)} options={OrderBookerDrp} />
                    </div>



                </div>


                <div className="flex flex-col md:flex-row gap-4 justify-between">

                    <button
                        type="submit"
                        disabled={isStockAllocated}
                        className={`px-6 py-2 rounded-lg text-sm md:text-base ${isStockAllocated
                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                            }`}
                    >
                        LoadData DC
                    </button>
                </div>
            </form>
            {Orders.length > 0 && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                    <h2 className="text-xl font-semibold mb-4">Orders List</h2>

                    <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border px-3 py-2 text-center">
                                    <input
                                        type="checkbox"
                                        onChange={(e) =>
                                            setSelectedRows(
                                                e.target.checked ? Orders.map(r => r._id) : []
                                            )
                                        }
                                        checked={selectedRows.length === Orders.length}
                                    />
                                </th>
                                <th className="border px-3 py-2">Order No</th>
                                <th className="border px-3 py-2">Order Date</th>
                                <th className="border px-3 py-2">Distributor</th>
                                <th className="border px-3 py-2">Customer</th>
                                <th className="border px-3 py-2 text-center">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {Orders.map(row => (
                                <tr key={row._id} className="hover:bg-gray-50">
                                    <td className="border px-3 py-2 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.includes(row._id)}
                                            onChange={() => handleCheckboxChange(row._id)}
                                        />
                                    </td>

                                    <td className="border px-3 py-2">
                                        {row.SaleOrderNumber}
                                    </td>

                                    <td className="border px-3 py-2">
                                        {formatDate(row.SaleOrderDate)}
                                    </td>

                                    <td className="border px-3 py-2">
                                        {loginVendor.DistrbutorName}
                                    </td>

                                    <td className="border px-3 py-2">
                                        {Customer.find((item) => item._id == row.Customer)?.CustomorName}
                                    </td>

                                    <td className="border px-3 py-2 text-center">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-semibold ${row.Status === "true"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {row.Status === "true" ? "open" : "invoice"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button
                        type="button"
                        onClick={() => StockAllocate()}
                        className="px-6 py-2 mt-5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm md:text-base"
                    >
                        StockAllocate

                    </button>
                </div>
            )}

            {tableData.length > 0 && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                    <h2 className="text-xl font-semibold mb-4">Alocated Lifst</h2>

                    <table className="min-w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100">
                            <tr>

                                <th className="border px-3 py-2">Order No</th>
                                <th className="border px-3 py-2">Order Date</th>
                                <th className="border px-3 py-2">Distributor</th>
                                <th className="border px-3 py-2">Customer</th>
                                <th className="border px-3 py-2 text-center">Slab Discount</th>
                                <th className="border px-3 py-2 text-center">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {tableData.map(row => (
                                <tr key={row._id} className={row.allZero ? "bg-red-100" : "hover:bg-gray-50"}>

                                    <td className="border px-3 py-2">
                                        {row.SaleOrderNumber}
                                    </td>

                                    <td className="border px-3 py-2">
                                        {formatDate(row.SaleOrderDate)}
                                    </td>

                                    <td className="border px-3 py-2">
                                        {loginVendor.DistrbutorName}
                                    </td>

                                    <td className="border px-3 py-2">
                                        {row.CustomerName}
                                    </td>

                                    <td className="border px-3 py-2 text-center">
                                        {row.SlabPercentage > 0 ? (
                                            <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                                                {row.SlabPercentage}% ({Number(row.SlabDiscount || 0).toFixed(2)})
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>

                                    <td className="border px-3 py-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {row.allZero && (
                                                <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500 text-white">
                                                    No Stock
                                                </span>
                                            )}
                                            <button
                                                type='button'
                                                onClick={() => openEditModal(row)}
                                                className={`px-3 py-1 rounded text-sm ${row.hasAnyZero ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button
                        type="button"
                        disabled={Disabled}
                        onClick={() => SubmitData()}
                        className="px-6 py-2 mt-5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm md:text-base"
                    >
                        Allocation
                    </button>
                </div>
            )}
        </div>
    )
}

export default OrderDCList