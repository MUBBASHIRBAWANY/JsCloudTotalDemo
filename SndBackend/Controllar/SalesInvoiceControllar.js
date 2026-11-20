import mongoose from "mongoose";
import ChqModal from "../modal/ChqModal.js";
import CustomorModal from "../modal/CustomorModal.js";
import DistrbutorModal from "../modal/DistributerModal.js";
import LoadFormModal from "../modal/LoadFormModal.js";
import OrderBookerModal from "../modal/OrderBookerModal.js";
import PriceListModal from "../modal/PriceListModal.js";
import ProductModal from "../modal/ProductModal.js";
import SaleOrderModal from "../modal/SaleOrderModal.js";
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";
import TotalProductModal from "../modal/TotalProductModal.js";
import { loadFormNumber } from "./LoadFormControllar.js";

export const createSalesInvoice = async (req, res) => {
    const { OrderBooker, Distributor, OrderData, MergedProducts } = req.body;
    const DistributorDetail = await DistrbutorModal.findById(Distributor);
    console.log(DistributorDetail.ShortCode);

    const session = await mongoose.startSession();

    try {
        if (!OrderData?.length) {
            return res.status(409).json({
                success: false,
                message: "No pending orders found"
            });
        }

        let insufficientStockResponse = null;
        let newLoadForm, invoiceCounter, invoices;

        await session.withTransaction(async () => {
            /* ================= DUPLICATE GUARD ================= */
            const orderNumbers = OrderData.map(o => o.SaleOrderNumber).filter(Boolean);
            const alreadyInvoicedOrders = await SalesInvoiceModal.find({
                OrderNumber: { $in: orderNumbers }
            }).select("OrderNumber").session(session);
            const alreadyInvoicedSet = new Set(alreadyInvoicedOrders.map(i => String(i.OrderNumber)));

            const freshOrders = OrderData.filter(o => !alreadyInvoicedSet.has(String(o.SaleOrderNumber)));

            if (freshOrders.length === 0) {
                insufficientStockResponse = {
                    status: 409,
                    body: {
                        success: false,
                        message: "In orders ke invoices pehle se ban chuke hain. Duplicate invoice create nahi hui."
                    }
                };
                return;
            }
            if (freshOrders.length < OrderData.length) {
                console.log(`Skipped ${OrderData.length - freshOrders.length} already-invoiced order(s) in duplicate submit`);
            }

            /* ================= MERGE PRODUCTS (Frontend se direct) ================= */
            let mergedOrder;
            if (MergedProducts && MergedProducts.length > 0) {
                mergedOrder = MergedProducts.filter(item => item.product && (Number(item.DeliveredBox) || 0) > 0);
                console.log("MergedProducts from frontend:", mergedOrder);
            } else {
                const LoadFormData = freshOrders.flatMap(o => o.SaleOrderData);
                mergedOrder = Object.values(
                    LoadFormData.reduce((acc, item) => {
                        if (!item.product || item.DeliveredBox <= 0) return acc;
                        const key = item.product.toString();
                        if (!acc[key]) {
                            acc[key] = { ...item };
                        } else {
                            acc[key].DeliveredBox += item.DeliveredBox;
                        }
                        return acc;
                    }, {})
                );
            }

            /* ================= DIRECT STOCK REDUCE (TotalProductModal) ================= */
            const bulkStock = mergedOrder.map(item => ({
                updateOne: {
                    filter: {
                        ProductName: item.product,
                        Distrbutor: Distributor,
                        TotalQuantity: { $gte: item.DeliveredBox }
                    },
                    update: {
                        $inc: { TotalQuantity: -item.DeliveredBox }
                    }
                }
            }));

            const stockResult = await TotalProductModal.bulkWrite(bulkStock, { session });

            if (stockResult.modifiedCount !== stockResult.matchedCount) {
                // Rollback: sabhi products ka stock wapas bhejo
                const rollbackOps = mergedOrder.map(item => ({
                    updateOne: {
                        filter: { ProductName: item.product, Distrbutor: Distributor },
                        update: { $inc: { TotalQuantity: item.DeliveredBox } }
                    }
                }));
                await TotalProductModal.bulkWrite(rollbackOps, { session });

                const stockProducts = await TotalProductModal.find({
                    Distrbutor: Distributor,
                    ProductName: { $in: mergedOrder.map(i => i.product) }
                }).session(session);
                const stockMap = {};
                stockProducts.forEach(p => { stockMap[p.ProductName.toString()] = p; });

                insufficientStockResponse = {
                    status: 400,
                    body: {
                        success: false,
                        message: "Stock insufficient hai — rollback kiya gaya hai.",
                        errors: mergedOrder.filter(item => {
                            const stock = stockMap[item.product.toString()];
                            return !stock || stock.TotalQuantity < item.DeliveredBox;
                        }).map(pro => ({
                            product: pro.product,
                            AvailableQty: stockMap[pro.product.toString()]?.TotalQuantity || 0,
                            delivered: pro.DeliveredBox
                        }))
                    }
                };
                return;
            }
            console.log("Stock reduced successfully from TotalProductModal");

            /* ================= LOAD FORM ================= */
            const lastLoadForm = await LoadFormModal.findOne().sort({ LoadFormNumber: -1 }).session(session);

            const LoadFormNumber = lastLoadForm
                ? (parseInt(lastLoadForm.LoadFormNumber) + 1).toString().padStart(8, "0")
                : "00000001";

            const createdLoadForm = await LoadFormModal.create([{
                LoadFormNumber,
                LoadFormDate: new Date().toISOString().split("T")[0],
                Distrbutor: Distributor,
                Status: "open",
                LoadFormData: mergedOrder
            }], { session });
            newLoadForm = createdLoadForm[0];

            /* ================= INVOICE NUMBER GENERATION (FIXED) ================= */
            const lastInvoice = await SalesInvoiceModal.findOne({
                Distrbutor: Distributor
            }).sort({ SalesInvoice: -1 }).session(session);

            invoiceCounter = lastInvoice
                ? Number(lastInvoice.SalesInvoice)
                : 0;

            /* ================= CREATE INVOICES ================= */
            invoices = [];
            const invoicedOrderIds = [];

            for (const order of freshOrders) {
                const SalesData = order.SaleOrderData;
                const InvoiceTotal = SalesData.reduce((s, c) => s + Number(c.NetSale || 0), 0);

                invoiceCounter++;

                console.log(order.SaleOrderData, order.SlabDiscount);

                invoices.push({
                    Client: order.Customer,
                    SalesInvoiceDate: new Date().toISOString().split("T")[0],
                    PostStatus: "Open",
                    Distrbutor: Distributor,
                    OrderNumber: order.SaleOrderNumber,
                    SalesInvoice: invoiceCounter,
                    DisSalesInvoice: `INV${DistributorDetail.DistrbutorSystemCode}${invoiceCounter}`,
                    OrderBooker,
                    LoadFormNumber,
                    SalesData,
                    SlabDiscount: order.SlabDiscount,
                    SlabPercentage: order.SlabPercentage,
                    Totalamount: InvoiceTotal - order.SlabDiscount,
                    Remaining: InvoiceTotal - order.SlabDiscount,
                });

                invoicedOrderIds.push(order._id);
            }
            // Pehle invoices insert karo — agar ye fail ho jaye to orders "open" hi rehte hain,
            // taake retry par duplicate na bane.
            await SalesInvoiceModal.insertMany(invoices, { session });

            // Invoices successful insert hone ke BAAD hi orders ko Invoiced mark karo
            for (const orderId of invoicedOrderIds) {
                await SaleOrderModal.updateOne(
                    { _id: orderId },
                    { $set: { Status: "Invoiced" } },
                    { session }
                );
            }
        });

        if (insufficientStockResponse) {
            return res.status(insufficientStockResponse.status).json(insufficientStockResponse.body);
        }

        /* ================= SUCCESS ================= */
        res.status(200).json({
            success: true,
            message: "Sales Invoice & LoadForm created successfully",
            newLoadForm,
            invoiceNumber: invoiceCounter,
            totalInvoices: invoices.length
        });

    } catch (err) {
        console.error("Error creating sales invoice:", err);
        res.status(500).json({
            success: false,
            error: err.message,
            message: "Something went wrong"
        });
    } finally {
        await session.endSession();
    }
};

// export const createSalesInvoice = async (req, res) => {
//     const { OrderBooker, Distributor, OrderData, MergedProducts } = req.body;
//     const DistributorDetail = await DistrbutorModal.findById(Distributor);
//     console.log(DistributorDetail.ShortCode);

//     try {
//         if (!OrderData?.length) {
//             return res.status(409).json({
//                 success: false,
//                 message: "No pending orders found"
//             });
//         }

//         /* ================= DUPLICATE GUARD ================= */
//         const orderNumbers = OrderData.map(o => o.SaleOrderNumber).filter(Boolean);
//         const alreadyInvoicedOrders = await SalesInvoiceModal.find({
//             OrderNumber: { $in: orderNumbers }
//         }).select("OrderNumber");
//         const alreadyInvoicedSet = new Set(alreadyInvoicedOrders.map(i => String(i.OrderNumber)));

//         const freshOrders = OrderData.filter(o => !alreadyInvoicedSet.has(String(o.SaleOrderNumber)));

//         if (freshOrders.length === 0) {
//             return res.status(409).json({
//                 success: false,
//                 message: "In orders ke invoices pehle se ban chuke hain. Duplicate invoice create nahi hui."
//             });
//         }
//         if (freshOrders.length < OrderData.length) {
//             console.log(`Skipped ${OrderData.length - freshOrders.length} already-invoiced order(s) in duplicate submit`);
//         }

//         /* ================= MERGE PRODUCTS (Frontend se direct) ================= */
//         // Frontend se MergedProducts aata hai — seedha TotalProductModal se stock reduce karenge
//         let mergedOrder;
//         if (MergedProducts && MergedProducts.length > 0) {
//             mergedOrder = MergedProducts.filter(item => item.product && (Number(item.DeliveredBox) || 0) > 0);
//             console.log("MergedProducts from frontend:", mergedOrder);
//         } else {
//             // Fallback: backend pe merge karo
//             const LoadFormData = freshOrders.flatMap(o => o.SaleOrderData);
//             mergedOrder = Object.values(
//                 LoadFormData.reduce((acc, item) => {
//                     if (!item.product || item.DeliveredBox <= 0) return acc;
//                     const key = item.product.toString();
//                     if (!acc[key]) {
//                         acc[key] = { ...item };
//                     } else {
//                         acc[key].DeliveredBox += item.DeliveredBox;
//                     }
//                     return acc;
//                 }, {})
//             );
//         }

//         /* ================= DIRECT STOCK REDUCE (TotalProductModal) ================= */
//         // MergedProducts ke har product ki quantity seedha TotalProductModal se reduce karo
//         const bulkStock = mergedOrder.map(item => ({
//             updateOne: {
//                 filter: {
//                     ProductName: item.product,
//                     Distrbutor: Distributor,
//                     // Atomic guard: sirf tab reduce ho jab stock sufficient ho
//                     TotalQuantity: { $gte: item.DeliveredBox }
//                 },
//                 update: {
//                     $inc: { TotalQuantity: -item.DeliveredBox }
//                 }
//             }
//         }));

//         const stockResult = await TotalProductModal.bulkWrite(bulkStock);

//         // Agar kisi bhi product mein stock insufficient tha toh poora operation rollback karo
//         if (stockResult.modifiedCount !== stockResult.matchedCount) {
//             // Rollback: sabhi products ka stock wapas bhejo
//             const rollbackOps = mergedOrder.map(item => ({
//                 updateOne: {
//                     filter: { ProductName: item.product, Distrbutor: Distributor },
//                     update: { $inc: { TotalQuantity: item.DeliveredBox } }
//                 }
//             }));
//             await TotalProductModal.bulkWrite(rollbackOps);

//             // Kaunsa product insufficient tha — pata lagao
//             const stockProducts = await TotalProductModal.find({
//                 Distrbutor: Distributor,
//                 ProductName: { $in: mergedOrder.map(i => i.product) }
//             });
//             const stockMap = {};
//             stockProducts.forEach(p => { stockMap[p.ProductName.toString()] = p; });

//             return res.status(400).json({
//                 success: false,
//                 message: "Stock insufficient hai — rollback kiya gaya hai.",
//                 errors: mergedOrder.filter(item => {
//                     const stock = stockMap[item.product.toString()];
//                     return !stock || stock.TotalQuantity < item.DeliveredBox;
//                 }).map(pro => ({
//                     product: pro.product,
//                     AvailableQty: stockMap[pro.product.toString()]?.TotalQuantity || 0,
//                     delivered: pro.DeliveredBox
//                 }))
//             });
//         }
//         console.log("Stock reduced successfully from TotalProductModal");

//         /* ================= LOAD FORM ================= */
//         const lastLoadForm = await LoadFormModal.findOne().sort({ LoadFormNumber: -1 });

//         const LoadFormNumber = lastLoadForm
//             ? (parseInt(lastLoadForm.LoadFormNumber) + 1).toString().padStart(8, "0")
//             : "00000001";

//         const newLoadForm = await LoadFormModal.create({
//             LoadFormNumber,
//             LoadFormDate: new Date().toISOString().split("T")[0],
//             Distrbutor: Distributor,
//             Status: "open",
//             LoadFormData: mergedOrder
//         });

//         /* ================= INVOICE NUMBER GENERATION (FIXED) ================= */
//         // Get the last invoice for this distributor
//         const lastInvoice = await SalesInvoiceModal.findOne({
//             Distrbutor: Distributor
//         }).sort({ SalesInvoice: -1 });

//         // Start counter from last invoice number or 0
//         let invoiceCounter = lastInvoice
//             ? Number(lastInvoice.SalesInvoice)
//             : 0;

//         /* ================= CREATE INVOICES ================= */
//         const invoices = [];
//         const invoicedOrderIds = [];

//         for (const order of freshOrders) {
//             const SalesData = order.SaleOrderData;
//             const InvoiceTotal = SalesData.reduce((s, c) => s + Number(c.NetSale || 0), 0);

//             // Increment for each invoice
//             invoiceCounter++;

//             console.log(order.SaleOrderData, order.SlabDiscount);

//             invoices.push({
//                 Client: order.Customer,
//                 SalesInvoiceDate: new Date().toISOString().split("T")[0],
//                 PostStatus: "Open",
//                 Distrbutor: Distributor,
//                 OrderNumber: order.SaleOrderNumber,
//                 SalesInvoice: invoiceCounter,
//                 DisSalesInvoice: `INV${DistributorDetail.DistrbutorSystemCode}${invoiceCounter}`,
//                 OrderBooker,
//                 LoadFormNumber,
//                 SalesData,
//                 SlabDiscount: order.SlabDiscount,
//                 SlabPercentage: order.SlabPercentage,
//                 Totalamount: InvoiceTotal - order.SlabDiscount,
//                 Remaining: InvoiceTotal - order.SlabDiscount,
//             });

//             invoicedOrderIds.push(order._id);
//         }

//         // Pehle invoices insert karo — agar ye fail ho jaye to orders "open" hi rehte hain,
//         // taake retry par duplicate na bane.
//         await SalesInvoiceModal.insertMany(invoices);

//         // Invoices successful insert hone ke BAAD hi orders ko Invoiced mark karo
//         for (const orderId of invoicedOrderIds) {
//             await SaleOrderModal.updateOne(
//                 { _id: orderId },
//                 { $set: { Status: "Invoiced" } }
//             );
//         }

//         /* ================= SUCCESS ================= */
//         res.status(200).json({
//             success: true,
//             message: "Sales Invoice & LoadForm created successfully",
//             newLoadForm,
//             invoiceNumber: invoiceCounter,
//             totalInvoices: invoices.length
//         });

//     } catch (err) {
//         console.error("Error creating sales invoice:", err);
//         res.status(500).json({
//             success: false,
//             error: err.message,
//             message: "Something went wrong"
//         });
//     }
// };

export const getAllSalesInvoiceByDistributer = async (req, res) => {
    const { Distributer } = req.params;
    console.log(Distributer)
    try {
        const SalesInvoiceData = await SalesInvoiceModal.find({
            Distrbutor: Distributer,
            PostStatus: { $ne: "Cancel" }
        }).sort({ _id: -1 });
        res.status(200).json({
            success: true,
            data: SalesInvoiceData
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

export const getAllSalesInvoices = async (req, res) => {
    // Get all sales invoices from all distributors (for admin/superuser)
    try {
        const SalesInvoiceData = await SalesInvoiceModal.find({
            PostStatus: { $ne: "Cancel" }
        }).sort({ _id: -1 });
        res.status(200).json({
            success: true,
            data: SalesInvoiceData
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

export const getAllSalesInvoicesByMultipleDistributers = async (req, res) => {
    // Get sales invoices for multiple distributors
    const { distributors } = req.query; // comma-separated distributor IDs
    try {
        let filter = { PostStatus: { $ne: "Cancel" } };
        if (distributors && distributors !== 'all') {
            const distArray = distributors.split(',');
            filter.Distrbutor = { $in: distArray };
        }
        const SalesInvoiceData = await SalesInvoiceModal.find(filter).sort({ _id: -1 });
        res.status(200).json({
            success: true,
            data: SalesInvoiceData
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

export const getAllSalesInvoiceByLoadForm = async (req, res) => {
    const { LoadForm } = req.params;
    console.log(LoadForm)
    try {
        const SalesInvoiceData = await SalesInvoiceModal.find({
            LoadFormNumber: LoadForm,
            PostStatus: { $ne: "Cancel" }
        }).sort({ _id: -1 });
        // DEDUPE: same SalesInvoice number + same Client ki duplicate copies ko sirf EK baar dikhao
        // (DSR settle screen / LoadForm view / PrintInvoice mein double rows na aayen).
        // Client bhi key mein hai taake alag clients ki alag invoices (same number wali) hide na hon.
        const seen = new Set();
        const deduped = SalesInvoiceData.filter(inv => {
            if (inv.SalesInvoice == null) return true;
            const key = `${String(inv.SalesInvoice)}|${String(inv.Client || '')}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        res.status(200).json({
            success: true,
            data: deduped
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


export const getInvoiceByLoadForm = async (req, res) => {
    const { LoadFormNumber } = req.params;
    try {
        const SalesInvoiceData = await SalesInvoiceModal.findOne({ LoadFormNumber: LoadFormNumber }).sort({ _id: -1 });
        res.status(200).json({
            success: true,
            data: SalesInvoiceData
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

export const cancelLoad = async (req, res) => {
    try {
        const CancelData = req.body
        if (!Array.isArray(CancelData) || CancelData.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid cancel data" })
        }

        for (const item of CancelData) {
            const existing = await SalesInvoiceModal.findOne({
                SalesInvoice: item.SalesInvoice,
                ...(item.Client ? { Client: item.Client } : {}),
            })
            if (!existing || existing.PostStatus === "Cancel") continue

            const dist = item.Distrbutor || existing.Distrbutor
            const lines = item.SalesData || existing.SalesData || []

            for (const RTD of lines) {
                const qty = Number(RTD.RTGBox) || Number(RTD.DeliveredBoxWill) || Number(RTD.DeliveredBox) || 0
                if (qty < 0) {
                    return res.status(400).json({
                        success: false,
                        message: `RTGBox negative nahi ho sakta for product ${RTD.product}`
                    })
                }
            }

            const bulkOps = lines
                .map((RTD) => {
                    const qty = Number(RTD.RTGBox) || Number(RTD.DeliveredBoxWill) || Number(RTD.DeliveredBox) || 0
                    if (!RTD.product || qty <= 0) return null
                    return {
                        updateOne: {
                            filter: {
                                ProductName: RTD.product,
                                Distrbutor: dist,
                            },
                            update: {
                                $inc: { TotalQuantity: qty },
                                $setOnInsert: {
                                    ProductName: RTD.product,
                                    Distrbutor: dist,
                                    AvgRate: "0",
                                    Amount: 0,
                                },
                            },
                            upsert: true,
                        },
                    }
                })
                .filter(Boolean)

            if (bulkOps.length > 0) {
                await TotalProductModal.bulkWrite(bulkOps)
            }

            await SalesInvoiceModal.updateMany(
                {
                    SalesInvoice: item.SalesInvoice,
                    ...(item.Client ? { Client: item.Client } : { Distrbutor: dist }),
                },
                {
                    $set: {
                        PostStatus: "Cancel",
                        ...(item.SalesData ? { SalesData: item.SalesData } : {}),
                    },
                }
            )
        }
        const UpdatePreviweous = await LoadFormModal.findOneAndUpdate({ LoadFormNumber: CancelData[0].LoadFormNumber }, { Status: "Serviced" })
        res.status(200).send(UpdatePreviweous)
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Cancel load failed", error: err.message })
    }
}

export const SattelDsr = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const DsrData = req.body;
        const currentDate = new Date().toISOString().split('T')[0];

        if (!Array.isArray(DsrData) || DsrData.length === 0) {
            return res.status(400).json({ message: "Invalid DSR Data" });
        }

        /* 🔹 0. DEDUPE INCOMING DATA */
        const seenInvoices = new Set();
        const uniqueDsrData = DsrData.filter(item => {
            if (item.SalesInvoice == null) return true;
            const key = `${String(item.SalesInvoice)}|${String(item.Client || '')}`;
            if (seenInvoices.has(key)) return false;
            seenInvoices.add(key);
            return true;
        });

        // ✅ RTGBox validation: negative values ko roko — do this BEFORE the transaction
        const RTgDataPreCheck = uniqueDsrData.flatMap((dsr) =>
            (dsr.SalesData || []).map((line) => ({ ...line, Distrbutor: dsr.Distrbutor }))
        );
        for (const RTD of RTgDataPreCheck) {
            const rtgQty = Number(RTD.RTGBox) || 0;
            if (rtgQty < 0) {
                return res.status(400).json({
                    success: false,
                    message: `RTGBox negative nahi ho sakta for product ${RTD.product}`
                });
            }
        }

        let updatedLoadForm;

        await session.withTransaction(async () => {
            /* 🔹 0b. SKIP ALREADY SETTLED / CANCELLED INVOICES */
            const lookup = uniqueDsrData.filter((item) => item.SalesInvoice != null);
            const existingInvoices = lookup.length
                ? await SalesInvoiceModal.find({
                    $or: lookup.map((item) => ({
                        SalesInvoice: item.SalesInvoice,
                        ...(item.Client ? { Client: item.Client } : {}),
                    })),
                }).select("SalesInvoice Client PostStatus").session(session)
                : [];

            const skipKeys = new Set(
                existingInvoices
                    .filter((inv) => inv.PostStatus === "Serviced" || inv.PostStatus === "Cancel")
                    .map((inv) => `${String(inv.SalesInvoice)}|${String(inv.Client || "")}`)
            );
            const toProcess = uniqueDsrData.filter((item) => {
                const key = `${String(item.SalesInvoice)}|${String(item.Client || "")}`;
                return !skipKeys.has(key);
            });

            /* 🔹 1. RTG DATA */
            const RTgData = toProcess.flatMap((dsr) =>
                (dsr.SalesData || []).map((line) => ({ ...line, Distrbutor: dsr.Distrbutor }))
            );

            const bulkOps = RTgData
                .filter((RTD) => RTD.product && RTD.Distrbutor && (Number(RTD.RTGBox) || 0) > 0)
                .map((RTD) => ({
                    updateOne: {
                        filter: { ProductName: RTD.product, Distrbutor: RTD.Distrbutor },
                        update: {
                            $inc: { TotalQuantity: Number(RTD.RTGBox) || 0 },
                            $setOnInsert: {
                                ProductName: RTD.product,
                                Distrbutor: RTD.Distrbutor,
                                AvgRate: "0",
                                Amount: 0,
                            }
                        },
                        upsert: true
                    }
                }));

            /* 🔹 2. UPDATE SALES INVOICES */
            for (const item of toProcess) {
                const { _id, __v, Remaining, Recived, Credit, RemainigAmount, ...updateData } = item;
                const received = (Number(item.Chq) || 0) + (Number(item.cashAmount) || 0);
                const netSale = Number(item.NetSale) || 0;
                const remaining = Math.round((
                    item.Credit != null && item.Credit !== ""
                        ? Number(item.Credit)
                        : netSale - received
                ) * 100) / 100;

                await SalesInvoiceModal.updateMany(
                    { SalesInvoice: item.SalesInvoice, Client: item.Client },
                    {
                        $set: {
                            ...updateData,
                            Totalamount: netSale,
                            Recived: received,
                            Remaining: Number.isFinite(remaining) ? remaining : 0,
                            SlabDiscount: Number(item.SlabDiscount) || 0,
                            SlabPercentage: Number(item.SlabPercentage) || 0,
                            ChqDate: item.chqDate,
                            ChqNumber: item.chqNumber,
                            PostStatus: "Serviced"
                        }
                    },
                    { session }
                );

                if (item.Chq > 0) {
                    await ChqModal.findOneAndUpdate(
                        { SalesInvoice: item.SalesInvoice, ChqNumber: item.chqNumber },
                        {
                            $setOnInsert: {
                                Amount: item.Chq,
                                ChqDate: item.chqDate,
                                Distrbutor: item.Distrbutor,
                                Customer: item.Client,
                                Status: "Pending"
                            }
                        },
                        { upsert: true, session }
                    );
                }
            }

            /* 🔹 3. UPDATE STOCK ONCE */
            if (bulkOps.length > 0) {
                await TotalProductModal.bulkWrite(bulkOps, { session });
            }
            /* 🔹 4. UPDATE LOAD FORM */
            updatedLoadForm = await LoadFormModal.findOneAndUpdate(
                { LoadFormNumber: uniqueDsrData[0].LoadFormNumber },
                { Status: "Serviced", LoadFormDate: currentDate },
                { new: true, session }
            );
        });

        return res.status(200).json({
            success: true,
            data: updatedLoadForm
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            error: err.message || err,
            message: "Internal Server Error"
        });
    } finally {
        await session.endSession();
    }
};

// export const SattelDsr = async (req, res) => {
//     try {
//         const DsrData = req.body;
//         const currentDate = new Date().toISOString().split('T')[0];


//         if (!Array.isArray(DsrData) || DsrData.length === 0) {
//             return res.status(400).json({ message: "Invalid DSR Data" });
//         }

//         /* 🔹 0. DEDUPE INCOMING DATA */
//         // Agar frontend se koi invoice 2 baar aaye (duplicate load form data), to sirf EK baar process karo
//         // Key = SalesInvoice + Client (taake alag clients ki same-number wali invoices drop na hon)
//         const seenInvoices = new Set();
//         const uniqueDsrData = DsrData.filter(item => {
//             if (item.SalesInvoice == null) return true;
//             const key = `${String(item.SalesInvoice)}|${String(item.Client || '')}`;
//             if (seenInvoices.has(key)) return false;
//             seenInvoices.add(key);
//             return true;
//         });

//         /* 🔹 0b. SKIP ALREADY SETTLED / CANCELLED INVOICES */
//         const lookup = uniqueDsrData.filter((item) => item.SalesInvoice != null)
//         const existingInvoices = lookup.length
//             ? await SalesInvoiceModal.find({
//                 $or: lookup.map((item) => ({
//                     SalesInvoice: item.SalesInvoice,
//                     ...(item.Client ? { Client: item.Client } : {}),
//                 })),
//             }).select("SalesInvoice Client PostStatus")
//             : []
//         const skipKeys = new Set(
//             existingInvoices
//                 .filter((inv) => inv.PostStatus === "Serviced" || inv.PostStatus === "Cancel")
//                 .map((inv) => `${String(inv.SalesInvoice)}|${String(inv.Client || "")}`)
//         )
//         const toProcess = uniqueDsrData.filter((item) => {
//             const key = `${String(item.SalesInvoice)}|${String(item.Client || "")}`
//             return !skipKeys.has(key)
//         })

//         /* 🔹 1. RTG DATA – ONLY ONCE, invoice header Distrbutor par */
//         const RTgData = toProcess.flatMap((dsr) =>
//             (dsr.SalesData || []).map((line) => ({
//                 ...line,
//                 Distrbutor: dsr.Distrbutor,
//             }))
//         )

//         // ✅ RTGBox validation: negative values ko roko — stock kabhi minus nahi hona chahiye
//         for (const RTD of RTgData) {
//             const rtgQty = Number(RTD.RTGBox) || 0;
//             if (rtgQty < 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `RTGBox negative nahi ho sakta for product ${RTD.product}`
//                 });
//             }
//         }

//         const bulkOps = RTgData
//             .filter((RTD) => RTD.product && RTD.Distrbutor && (Number(RTD.RTGBox) || 0) > 0)
//             .map((RTD) => ({
//             updateOne: {
//                 filter: {
//                     ProductName: RTD.product,
//                     Distrbutor: RTD.Distrbutor
//                 },
//                 update: {
//                     $inc: {
//                         TotalQuantity: Number(RTD.RTGBox) || 0
//                     },
//                     $setOnInsert: {
//                         ProductName: RTD.product,
//                         Distrbutor: RTD.Distrbutor,
//                         AvgRate: "0",
//                         Amount: 0,
//                     }
//                 },
//                 upsert: true
//             }
//         }));

//         /* 🔹 2. UPDATE SALES INVOICES */
//         for (const item of toProcess) {
//              const { _id, __v, Remaining, Recived, Credit, RemainigAmount, ...updateData } = item;
//             const received = (Number(item.Chq) || 0) + (Number(item.cashAmount) || 0);
//             const netSale = Number(item.NetSale) || 0;
//             const remaining = Math.round((
//                 item.Credit != null && item.Credit !== ""
//                     ? Number(item.Credit)
//                     : netSale - received
//             ) * 100) / 100;

//             // updateMany: agar same invoice ki koi duplicate copy mojood ho (same number + same client)
//             // to wo bhi settle ho jaye — taake koi copy "Open" reh kar dobara double na dikhe.
//             // Kisi aur customer ki invoice galti se update na ho isliye Client bhi match karte hain.
//             await SalesInvoiceModal.updateMany(
//                 { SalesInvoice: item.SalesInvoice, Client: item.Client },
//             {
//             $set: {
//                 ...updateData,
//                 Totalamount: netSale,
//                 Recived: received,
//                 Remaining: Number.isFinite(remaining) ? remaining : 0,
//                 SlabDiscount: Number(item.SlabDiscount) || 0,
//                 SlabPercentage: Number(item.SlabPercentage) || 0,
//                 ChqDate: item.chqDate,
//                 ChqNumber: item.chqNumber,
//                 PostStatus: "Serviced"
//             }
//         }
//             );
//             if (item.Chq > 0) {
//                 await ChqModal.findOneAndUpdate(
//                     {
//                         SalesInvoice: item.SalesInvoice,
//                         ChqNumber: item.chqNumber
//                     },
//                     {
//                         $setOnInsert: {
//                             Amount: item.Chq,
//                             ChqDate: item.chqDate,
//                             Distrbutor: item.Distrbutor,
//                             Customer: item.Client,
//                             Status : "Pending"
//                         }
//                     },
//                     { upsert: true }
//                 );

//             }
//         }

//         /* 🔹 3. UPDATE STOCK ONCE */
//         if (bulkOps.length > 0) {
//             await TotalProductModal.bulkWrite(bulkOps);
//         }

//         /* 🔹 4. UPDATE LOAD FORM */
//         const updatedLoadForm = await LoadFormModal.findOneAndUpdate(
//             { LoadFormNumber: uniqueDsrData[0].LoadFormNumber },
//             { Status: "Serviced", LoadFormDate : currentDate},

//             { new: true }
//         );

//         return res.status(200).json({
//             success: true,
//             data: updatedLoadForm
//         });

//     } catch (err) {
//         console.log(err);

//         return res.status(500).json({
//             success: false,
//             error : err,
//             message: "Internal Server Error"
//         });
//     }
// };

export const OnlyReaminInvoice = async (req, res) => {
    try {
        const { Distrbutor } = req.params;

        const data = await SalesInvoiceModal.find({
            Remaining: { $ne: 0 },
            Distrbutor: Distrbutor,
            PostStatus: "Serviced"
        }).select("DisSalesInvoice Remaining Client");

        res.status(200).send({
            data: data
        });

    } catch (err) {
        res.status(400).send({
            data: err
        });
    }
};

export const AgingData = async (req, res) => {

    try {
        const { startDate, endDate, Distrbutor } = req.query
        console.log(Distrbutor, startDate, endDate)
        const data = await SalesInvoiceModal.find({
            SalesInvoiceDate: { $gte: startDate, $lte: endDate },
            Distrbutor: Distrbutor,
            PostStatus: "Serviced",
            $expr: { $ne: ["$Recived", "$Totalamount"] },
        },).select("Recived Remaining Totalamount SalesInvoice LoadFormNumber Client SalesInvoiceDate Distrbutor OrderBooker");
        const chqInv = await ChqModal.find({ Status: "Pending", Distrbutor: Distrbutor }).select(`SalesInvoice Amount ChqNumber ChqDate`)
        const noInv = chqInv.map((item) => item.SalesInvoice)
        const invoices = await SalesInvoiceModal.find({
            SalesInvoice: { $in: noInv }
        }).select("Recived Remaining Totalamount SalesInvoice LoadFormNumber OrderBooker");
        const uniqueInvoices = invoices.filter(i => !data.some(d => d.SalesInvoice === i.SalesInvoice)).map(i => i.SalesInvoice);
        const uniqueInvoices2 = await SalesInvoiceModal.find({
            SalesInvoice: { $in: uniqueInvoices }
        }).select(
            "Recived Remaining Totalamount SalesInvoice LoadFormNumber Client SalesInvoiceDate Distrbutor OrderBooker"
        );
        const alldata = data.concat(uniqueInvoices2)

        const mergedAmounts = {};

        chqInv.forEach(item => {
            const invoice = item.SalesInvoice;
            const amount = parseFloat(item.Amount);

            if (mergedAmounts[invoice]) {
                mergedAmounts[invoice] += amount;
            } else {
                mergedAmounts[invoice] = amount;
            }
        });

        const result = Object.entries(mergedAmounts).map(([SalesInvoice, Amount]) => ({
            SalesInvoice,
            Amount
        }));
        // Merge amounts
        const chqAmounts = {};
        chqInv.forEach(item => {
            const invoice = item.SalesInvoice;
            const amount = parseFloat(item.Amount);
            chqAmounts[invoice] = (chqAmounts[invoice] || 0) + amount;
        });

        // Update original alldata
        alldata.forEach(item => {
            const chqAmount = chqAmounts[item.SalesInvoice] || 0;
            if (chqAmount !== 0) {
                item.Remaining += (chqAmount || 0);
                item.Recived -= (chqAmount || 0);
            }
        });


        return res.status(200).send({
            success: true,
            alldata,
            chqInv
        });
    } catch (err) {
        return res.status(500).send({
            success: false,
            message: err.message,
        });
    }
};

export const getDistributorAnalytics = async (req, res) => {
    try {
        const { distributorId, year } = req.query;
        const currentYear = year || new Date().getFullYear().toString();

        if (!distributorId) {
            return res.status(400).json({
                success: false,
                message: "distributorId is required"
            });
        }

        // Build match conditions for current year invoices
        const matchConditions = {
            Distrbutor: distributorId,
            SalesInvoiceDate: {
                $gte: `${currentYear}-01-01`,
                $lte: `${currentYear}-12-31`,
            }
        };

        // Aggregate monthly sales and receivables
        const analytics = await SalesInvoiceModal.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: { $month: { $dateFromString: { dateString: "$SalesInvoiceDate" } } },
                    totalSales: { $sum: "$Totalamount" },
                    totalReceived: { $sum: "$Recived" },
                    totalRemaining: { $sum: "$Remaining" },
                    invoiceCount: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    month: "$_id",
                    totalSales: 1,
                    totalReceived: 1,
                    totalRemaining: 1,
                    invoiceCount: 1,
                    _id: 0
                }
            }
        ]);

        // Get overall outstanding (all time, not just current year)
        const outstandingData = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    Distrbutor: distributorId,
                    PostStatus: "Serviced",
                    Remaining: { $ne: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOutstanding: { $sum: "$Remaining" },
                    totalInvoices: { $sum: 1 }
                }
            }
        ]);

        // Get current month data
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const currentMonthData = analytics.find(a => a.month === parseInt(currentMonth)) || {
            month: parseInt(currentMonth),
            totalSales: 0,
            totalReceived: 0,
            totalRemaining: 0,
            invoiceCount: 0
        };

        // Get distributor info
        const distributor = await DistrbutorModal.findById(distributorId).select("DistrbutorName DistrbutorSystemCode ShortCode");

        res.status(200).json({
            success: true,
            data: {
                distributor: distributor || null,
                monthlyData: analytics,
                currentMonth: currentMonthData,
                outstanding: outstandingData.length > 0 ? outstandingData[0] : { totalOutstanding: 0, totalInvoices: 0 },
                year: currentYear
            }
        });

    } catch (err) {
        console.error("Error in getDistributorAnalytics:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getOrderBookerSale = async (req, res) => {
    try {
        const { startDate, endDate, Distrbutor } = req.query;

        const matchConditions = {
            PostStatus: "Serviced",
        };

        if (startDate && endDate) {
            matchConditions.SalesInvoiceDate = { $gte: startDate, $lte: endDate };
        }

        if (Distrbutor) {
            matchConditions.Distrbutor = Distrbutor;
        }

        const data = await SalesInvoiceModal.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: "$OrderBooker",
                    TotalAmount: { $sum: "$Totalamount" },
                    invoiceCount: { $sum: 1 },
                    TotalReceived: { $sum: "$Recived" },
                    TotalRemaining: { $sum: "$Remaining" },
                }
            },
            { $sort: { TotalAmount: -1 } },
            {
                $project: {
                    _id: 0,
                    OrderBooker: "$_id",
                    TotalAmount: 1,
                    invoiceCount: 1,
                    TotalReceived: 1,
                    TotalRemaining: 1,
                }
            }
        ]);

        res.status(200).json(data);
    } catch (err) {
        console.error("Error in getOrderBookerSale:", err);
        res.status(500).json({ message: err.message });
    }
};

export const SalesDumpData = async (req, res) => {
    const { startDate, endDate, Store, Distributor, Client, PostStatus } = req.query;

    try {
        // Build match conditions
        const matchConditions = {
            SalesInvoiceDate: {
                $gte: startDate,
                $lte: endDate,
            },
            PostStatus: { $ne: "Cancel" },
        };

        // Add optional filters
        if (PostStatus && PostStatus !== "" && PostStatus !== "Both" && PostStatus !== "Cancel") {
            matchConditions.PostStatus = PostStatus;
        }

        if (Distributor && Distributor !== "") {
            matchConditions.Distrbutor = Distributor;
        }

        if (Client && Client !== "") {
            matchConditions.Client = Client;
        }

        /* =====================
           SALES DUMP DATA
        ====================== */
        const salesData = await SalesInvoiceModal.aggregate(
            [
                {
                    $match: matchConditions,
                },
                { $unwind: "$SalesData" },
                {
                    $lookup: {
                        from: "products", // assuming your product collection name
                        localField: "SalesData.product",
                        foreignField: "_id",
                        as: "productInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$productInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "clients", // assuming your client collection name
                        localField: "Client",
                        foreignField: "_id",
                        as: "clientInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$clientInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "distributors", // assuming your distributor collection name
                        localField: "Distrbutor",
                        foreignField: "_id",
                        as: "distributorInfo",
                    },
                },
                {
                    $unwind: {
                        path: "$distributorInfo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 0,
                        // Invoice Info
                        SalesInvoice: "$SalesInvoice",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                        OrderNumber: "$OrderNumber",
                        LoadFormNumber: "$LoadFormNumber",
                        PostStatus: "$PostStatus",

                        // Client Info
                        ClientId: "$Client",
                        ClientName: "$clientInfo.name", // adjust field name as per your schema

                        // Distributor Info
                        DistributorId: "$Distrbutor",
                        DistributorName: "$distributorInfo.name", // adjust field name as per your schema

                        // Order Booker Info
                        OrderBookerId: "$OrderBooker",

                        // Product/Sales Data
                        ProductId: "$SalesData.product",
                        ProductName: "$productInfo.ProductName", // adjust field name as per your schema
                        ProductCode: "$productInfo.code", // adjust field name as per your schema
                        orderBox: "$SalesData.orderBox",
                        orderNumber: "$SalesData.orderNumber",
                        To: "$SalesData.To",
                        GrossAmount: "$SalesData.GrossAmount",
                        NetSale: "$SalesData.NetSale",
                        DeliveredBox: "$SalesData.DeliveredBox",
                        DeliveredBoxWill: "$SalesData.DeliveredBoxWill",
                        RTGRate: "$SalesData.RTGRate",
                        RTGBox: "$SalesData.RTGBox",
                        SpecialTO: "$SalesData.SpecialTO",
                        isCancelled: "$SalesData.isCancelled",
                        isForwarded: "$SalesData.isForwarded",


                    },
                },
            ],
            { allowDiskUse: true }
        );

        let data = salesData;


        // Group by SalesInvoice for summary
        const summaryByInvoice = data.reduce((acc, item) => {
            const invoiceKey = item.SalesInvoice;
            if (!acc[invoiceKey]) {
                acc[invoiceKey] = {
                    SalesInvoice: item.SalesInvoice,
                    SalesInvoiceDate: item.SalesInvoiceDate,
                    OrderNumber: item.OrderNumber,
                    ClientName: item.ClientName,
                    DistributorName: item.DistributorName,
                    PostStatus: item.PostStatus,
                    Totalamount: item.Totalamount,
                    Recived: item.Recived,
                    Remaining: item.Remaining,
                    cashAmount: item.cashAmount,
                    Chq: item.Chq,
                    ChqNumber: item.ChqNumber,
                    ChqDate: item.ChqDate,
                    TotalBoxes: 0,
                    TotalGrossAmount: 0,
                    TotalNetSale: 0,
                    Products: [],
                };
            }

            acc[invoiceKey].TotalBoxes += (item.DeliveredBox || item.orderBox || 0);
            acc[invoiceKey].TotalGrossAmount += (item.GrossAmount || 0);
            acc[invoiceKey].TotalNetSale += (item.NetSale || 0);
            acc[invoiceKey].Products.push({
                ProductName: item.ProductName,
                ProductCode: item.ProductCode,
                orderBox: item.orderBox,
                DeliveredBox: item.DeliveredBox,
                GrossAmount: item.GrossAmount,
                NetSale: item.NetSale,
            });

            return acc;
        }, {});

        const summaryData = Object.values(summaryByInvoice);

        res.status(200).send({
            success: true,
            data: data,
            summary: summaryData,
            totalRecords: data.length,
            totalInvoices: summaryData.length,
        });

    } catch (err) {
        console.error(err);
        res.status(400).send({
            success: false,
            error: err.message,
            message: "Error fetching sales dump data"
        });
    }
};

// Sales Invoice Summary Report
export const SalesInvoiceSummary = async (req, res) => {
    const { startDate, endDate, Distributor } = req.query;

    try {
        const matchConditions = {
            SalesInvoiceDate: {
                $gte: startDate,
                $lte: endDate,
            },
            PostStatus: { $ne: "Cancel" },
        };

        if (Distributor && Distributor !== "" && String(Distributor).toLowerCase() !== "all") {
            const ids = String(Distributor)
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean);
            if (ids.length === 1) {
                matchConditions.Distrbutor = ids[0];
            } else if (ids.length > 1) {
                matchConditions.Distrbutor = { $in: ids };
            }
        }

        // Get all sales invoices in the date range
        const invoices = await SalesInvoiceModal.find(matchConditions).sort({ SalesInvoiceDate: 1 });

        // Get all LoadForm numbers to fetch dump dates
        const loadFormNumbers = [...new Set(invoices.map(inv => inv.LoadFormNumber).filter(Boolean))];
        const loadForms = await LoadFormModal.find({ LoadFormNumber: { $in: loadFormNumbers } });
        const loadFormMap = new Map();
        loadForms.forEach(lf => loadFormMap.set(lf.LoadFormNumber, lf.LoadFormDate));

        // Get all client IDs to resolve names
        const clientIds = [...new Set(invoices.map(inv => inv.Client).filter(Boolean))];
        const clients = await CustomorModal.find({ _id: { $in: clientIds } });
        const clientMap = new Map();
        clients.forEach(c => clientMap.set(c._id.toString(), c.CustomorName));

        // Get all OrderBooker IDs to resolve names
        const obIds = [...new Set(invoices.map(inv => inv.OrderBooker).filter(Boolean))];
        const orderBookers = await OrderBookerModal.find({ _id: { $in: obIds } });
        const obMap = new Map();
        orderBookers.forEach(ob => obMap.set(ob._id.toString(), ob.OrderBookerName));

        const distIds = [...new Set(invoices.map((inv) => inv.Distrbutor).filter(Boolean))];
        const distributors = await DistrbutorModal.find({ _id: { $in: distIds } });
        const distMap = new Map();
        distributors.forEach((d) => distMap.set(d._id.toString(), d.DistrbutorName));

        // Build summary per invoice
        const summary = invoices.map(inv => {
            const salesData = inv.SalesData || [];
            const totalGross = salesData.reduce((sum, item) => sum + (Number(item.GrossAmount) || 0), 0);
            const totalTo = salesData.reduce((sum, item) => {
                const box = Number(item.DeliveredBox) || 0;
                if (box === 0) return sum;
                return sum + (Number(item.To || item.TO) || 0);
            }, 0);
            const totalScheme = salesData.reduce((sum, item) => {
                const box = Number(item.DeliveredBox) || 0;
                if (box === 0) return sum;
                return sum + (Number(item.SpecialTO) || 0);
            }, 0);
            const totalNetSale = salesData.reduce((sum, item) => sum + (Number(item.NetSale) || 0), 0);
            const distributorId = inv.Distrbutor ? String(inv.Distrbutor) : "";

            return {
                SalesInvoice: inv.SalesInvoice,
                DisSalesInvoice: inv.DisSalesInvoice,
                SalesInvoiceDate: inv.SalesInvoiceDate,
                Client: clientMap.get(inv.Client) || inv.Client,
                OrderBooker: obMap.get(inv.OrderBooker) || inv.OrderBooker,
                Distrbutor: distributorId,
                DistrbutorName: distMap.get(distributorId) || distributorId || "Unknown",
                GrossAmount: totalGross,
                To: totalTo,
                Scheme: totalScheme,
                SlabDiscount: Number(inv.SlabDiscount) || 0,
                SlabPercentage: Number(inv.SlabPercentage) || 0,
                TotalAmount: inv.Totalamount || totalNetSale,
                SalesDumpDate: loadFormMap.get(inv.LoadFormNumber) || "",
                PostStatus: inv.PostStatus,
                LoadFormNumber: inv.LoadFormNumber,
            };
        });

        summary.sort((a, b) => {
            const nameCmp = String(a.DistrbutorName || "").localeCompare(String(b.DistrbutorName || ""));
            if (nameCmp !== 0) return nameCmp;
            return String(a.SalesInvoiceDate || "").localeCompare(String(b.SalesInvoiceDate || ""));
        });

        res.status(200).send({
            success: true,
            data: summary,
            totalInvoices: summary.length,
        });

    } catch (err) {
        console.error(err);
        res.status(400).send({
            success: false,
            error: err.message,
            message: "Error fetching sales invoice summary"
        });
    }
};