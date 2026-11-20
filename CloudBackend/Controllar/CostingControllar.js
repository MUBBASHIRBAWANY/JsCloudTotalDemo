import PurchaseInvoiceModal from "../modal/PurchaseInvoiceModal.js";
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";
import VoucherModal from "../modal/VoucherModal.js";
import AdministrativeModal from "../modal/AdministrativeModal.js";
import OrderDcModal from "../modal/SaleOrderDcModal.js";
import OpeningInventoryModal from "../modal/OpeningInventoryModal.js";
import ProductModal from "../modal/ProductModal.js";
import SalesReturnModal from "../modal/SalesReturnModal.js";

const buildRateKey = (product, store) => `${String(product)}_${String(store)}`;

/** Same avg rate as SalesDumpDataWithCost: product+store first, then product-only fallback. */
const getRateInfo = (rateMap, product, store) => {
    if (!product) return null;
    const productId = String(product);
    const direct = rateMap[buildRateKey(productId, store)];
    if (direct && Number(direct.ratePerBox) > 0) return direct;

    const prefix = `${productId}_`;
    for (const [key, val] of Object.entries(rateMap)) {
        if ((key === productId || key.startsWith(prefix)) && Number(val.ratePerBox) > 0) {
            return val;
        }
    }
    return null;
};

const isDistributorFlag = (Distributor) => Distributor === true || Distributor === "true";

/** Opening inventory stores per-box rate in opneingQtyValueExclGst. Gross value = qty * rate. */
const openingLineGrossValue = (item) => {
    const qty = Number(item?.opneingQty) || 0;
    const perBox = Number(item?.opneingQtyValueExclGst) || 0;
    return qty * perBox;
};

const buildOpeningMap = (inventoryData, reqStore) => {
    const openingMap = {};
    for (const item of inventoryData || []) {
        if (reqStore && String(item.Store) !== String(reqStore)) continue;
        const key = buildRateKey(item.product, item.Store);
        const existing = openingMap[key] || { openingQty: 0, openingValue: 0 };
        existing.openingQty += Number(item.opneingQty) || 0;
        existing.openingValue += openingLineGrossValue(item);
        openingMap[key] = existing;
    }
    return openingMap;
};

/** Same net cost as SalesDumpDataWithCost: (qty * avgRate) minus product PurchaseDiscountPer. */
const lineCostFromRate = (ratePerBox, boxes, discountPercentage) => {
    const rate = Number(ratePerBox) || 0;
    const qty = Number(boxes) || 0;
    const disc = Number(discountPercentage) || 0;
    const grossCost = rate * qty;
    const cost = Number((grossCost - (grossCost / 100) * disc).toFixed(4));
    const netRate = Number((rate - (rate / 100) * disc).toFixed(4));
    return { cost, netRate, discountPercentage: disc };
};

const postedStatusMatch = { $in: [true, "true"] };

const buildProductMaps = async () => {
    const products = await ProductModal.find({}, { PurchaseDiscountPer: 1, ProductName: 1 }).lean();
    const discountMap = {};
    const nameToId = {};
    for (const p of products) {
        const id = String(p._id);
        const disc = Number(p.PurchaseDiscountPer) || 0;
        discountMap[id] = disc;
        if (p.ProductName) {
            const name = String(p.ProductName);
            discountMap[name] = disc;
            nameToId[name] = id;
        }
    }
    return { discountMap, nameToId };
};

const buildVoucherLine = (product, boxes, rateMap, store, discountMap, nameToId = {}) => {
    const raw = String(product || "");
    const productKey = nameToId[raw] || raw;
    const discountPercentage = Number(discountMap[productKey] ?? discountMap[raw]) || 0;
    const rateInfo = getRateInfo(rateMap, productKey, store) || getRateInfo(rateMap, raw, store);
    if (!rateInfo || !(Number(rateInfo.ratePerBox) > 0)) {
        return { product, boxes, rate: 0, discountPercentage, cost: 0 };
    }
    const { cost, netRate } = lineCostFromRate(rateInfo.ratePerBox, boxes, discountPercentage);
    return { product, boxes, rate: netRate, discountPercentage, cost };
};

const replaceVouchers = async (voucherNumbers, doc) => {
    const deleted = await VoucherModal.deleteMany({ VoucherNumber: { $in: voucherNumbers } });
    const created = await VoucherModal.create(doc);
    return { deletedCount: deleted?.deletedCount || 0, created };
};

const processCoVouchers = async ({
    startDate,
    endDate,
    reqStore,
    rateMap,
    discountMap,
    nameToId,
    finishedGoodsAccount,
    costOfSalesAccount,
}) => {
    const salesMatch = {
        SalesInvoiceDate: { $gte: startDate, $lte: endDate },
        PostStatus: postedStatusMatch,
    };
    if (reqStore) salesMatch.Store = reqStore;

    const salesInvoices = await SalesInvoiceModal.find(salesMatch);
    console.log(`Found ${salesInvoices.length} posted sales invoices for Co vouchers`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const invoice of salesInvoices) {
        try {
            let totalCost = 0;
            const productDetails = [];
            for (const item of invoice.SalesData || []) {
                const boxes = Number(item.totalBox) || Number(item.box) || 0;
                const line = buildVoucherLine(item.product, boxes, rateMap, invoice.Store, discountMap, nameToId);
                totalCost += line.cost;
                productDetails.push(line);
            }
            totalCost = Number(Number(totalCost).toFixed(4));

            const voucherNumber = `Co${invoice.SalesInvoice}`;
            const replaced = await replaceVouchers(
                [voucherNumber, `CO${invoice.SalesInvoice}`],
                {
                    VoucherType: "Co",
                    VoucherNumber: voucherNumber,
                    VoucherDate: invoice.SalesInvoiceDate,
                    status: "Post",
                    VoucharData: [
                        { Account: finishedGoodsAccount, Credit: totalCost, store: invoice.Store },
                        { Account: costOfSalesAccount, Debit: totalCost, store: invoice.Store },
                    ],
                }
            );

            successCount++;
            results.push({
                invoice: invoice.SalesInvoice,
                date: invoice.SalesInvoiceDate,
                store: invoice.Store,
                oldVoucherDeleted: replaced.deletedCount > 0,
                newTotalCost: totalCost,
                productDetails,
            });
        } catch (err) {
            errorCount++;
            results.push({
                invoice: invoice.SalesInvoice,
                error: err.message,
            });
            console.error(`Error processing Co voucher ${invoice.SalesInvoice}:`, err.message);
        }
    }

    return { salesInvoices, successCount, errorCount, results };
};

const processReturnCostVouchers = async ({
    startDate,
    endDate,
    reqStore,
    rateMap,
    discountMap,
    nameToId,
    finishedGoodsAccount,
    costOfSalesAccount,
}) => {
    const returnMatch = {
        SalesInvoiceReturnDate: { $gte: startDate, $lte: endDate },
        PostStatus: postedStatusMatch,
    };
    if (reqStore) returnMatch.Store = reqStore;

    const salesReturns = await SalesReturnModal.find(returnMatch);
    console.log(`Found ${salesReturns.length} posted sales returns for CoR vouchers`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const salesReturn of salesReturns) {
        const returnNumber = salesReturn.SalesReturnNumber;
        try {
            let totalCost = 0;
            const productDetails = [];
            for (const item of salesReturn.SalesReturnData || []) {
                const boxes = Number(item.totalBox) || Number(item.box) || 0;
                const line = buildVoucherLine(item.product, boxes, rateMap, salesReturn.Store, discountMap, nameToId);
                totalCost += line.cost;
                productDetails.push(line);
            }
            totalCost = Number(Number(totalCost).toFixed(4));

            const replaced = await replaceVouchers(
                [`CoR${returnNumber}`, `COR${returnNumber}`, `RSO${returnNumber}`],
                {
                    VoucherType: "CoR",
                    VoucherNumber: `CoR${returnNumber}`,
                    VoucherDate: salesReturn.SalesInvoiceReturnDate,
                    status: "Post",
                    VoucharData: [
                        { Account: finishedGoodsAccount, Debit: totalCost, store: salesReturn.Store },
                        { Account: costOfSalesAccount, Credit: totalCost, store: salesReturn.Store },
                    ],
                }
            );

            successCount++;
            results.push({
                invoice: returnNumber,
                date: salesReturn.SalesInvoiceReturnDate,
                store: salesReturn.Store,
                oldVoucherDeleted: replaced.deletedCount > 0,
                newTotalCost: totalCost,
                productDetails,
            });
        } catch (err) {
            errorCount++;
            results.push({
                invoice: returnNumber,
                error: err.message,
            });
            console.error(`Error processing CoR voucher ${returnNumber}:`, err.message);
        }
    }

    return { salesReturns, successCount, errorCount, results };
};

/**
 * Costing Recalculate Controller
 *
 * Step 1: Date range se saare purchases uthao
 * Step 2: Product + Store + Location wise merge karo → GrossAmount / totalBox = rate per box
 * Step 3: Saari posted sales invoices ki Co Voucher delete karo
 * Step 4: Naye rate se Co Voucher recreate karo
 */

export const recalculateCosting = async (req, res) => {
    try {
        const { startDate: reqStart, endDate: reqEnd, Store: reqStore, Distributor } = req.body || {};

        // Co/DC Voucher processing: user ki dates
        const startDate = reqStart || "2026-01-01";
        const endDate = reqEnd || new Date().toISOString().split("T")[0];

        console.log(`Co/DC Voucher processing: ${startDate} to ${endDate}`);
        console.log(`Store: ${reqStore || 'All'}, Distributor: ${Distributor || false}`);

        // ==============================
        // STEP 1: Find Financial Year from opening-inventories
        // endDate jo hai us kis FY mein fall karta hai?
        // ==============================
        const openingInventory = await OpeningInventoryModal.findOne({
            DateStart: { $lte: endDate },
            DateEnd: { $gte: endDate },
        });

        if (!openingInventory) {
            return res.status(400).json({
                success: false,
                message: `No Opening Inventory found for date ${endDate}. Please create opening inventory first.`,
            });
        }

        const fyStartDate = openingInventory.DateStart;
        const fyEndDate = openingInventory.DateEnd;
        console.log(`Financial Year: ${fyStartDate} to ${fyEndDate}`);
        console.log(`Opening Inventory ID: ${openingInventory._id}`);

        // ==============================
        // STEP 2: Build opening inventory map (Product + Store wise)
        // Opening gross value = qty * per-box rate (same as SalesDumpDataWithCost / DCV)
        // ==============================
        const inventoryData = Array.isArray(openingInventory.InvoetoryData) ? openingInventory.InvoetoryData : [];
        const openingMap = buildOpeningMap(inventoryData, reqStore);
        console.log(`Opening inventory entries: ${Object.keys(openingMap).length}`);

        // ==============================
        // STEP 3: Get all purchases from FY start to endDate
        // ==============================
        const purchaseMatch = {
            PurchaseInvoiceDate: {
                $gte: fyStartDate,
                $lte: endDate,
            },
            PostStatus: true,
        };
        if (reqStore) {
            purchaseMatch.Store = reqStore;
        }

        const purchases = await PurchaseInvoiceModal.aggregate([
            {
                $match: purchaseMatch,
            },
            { $unwind: "$PurchaseData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseData.product",
                        Store: "$Store",
                    },
                    totalGrossAmount: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.GrossAmount",
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                    totalBox: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.totalBox",
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    Store: "$_id.Store",
                    totalGrossAmount: 1,
                    totalBox: 1,
                    ratePerBox: {
                        $cond: {
                            if: { $gt: ["$totalBox", 0] },
                            then: { $divide: ["$totalGrossAmount", "$totalBox"] },
                            else: 0,
                        },
                    },
                },
            },
        ]);

        console.log(`Found ${purchases.length} product-wise purchase entries`);

        // ==============================
        // STEP 4: First merge all purchases per product+Store (same as getAvgRateReport)
        // Then combine with opening inventory → Rate/Box
        // ==============================
        const mergedMap = {};
        for (const item of purchases) {
            const key = `${item.product}_${item.Store}`;
            const existing = mergedMap[key] || {
                product: item.product,
                Store: item.Store,
                totalGrossAmount: 0,
                totalBox: 0,
            };
            existing.totalGrossAmount += item.totalGrossAmount;
            existing.totalBox += item.totalBox;
            mergedMap[key] = existing;
        }

        // Now calculate rate = (openingValue + mergedPurchaseValue) / (openingQty + mergedPurchaseQty)
        const rateMap = {};
        for (const [key, item] of Object.entries(mergedMap)) {
            const opening = openingMap[key] || { openingQty: 0, openingValue: 0 };
            const combinedQty = opening.openingQty + item.totalBox;
            const combinedValue = opening.openingValue + item.totalGrossAmount;
            const ratePerBox = combinedQty > 0 ? combinedValue / combinedQty : 0;

            rateMap[key] = {
                ratePerBox: Number(Number(ratePerBox).toFixed(4)),
                openingQty: opening.openingQty,
                openingValue: opening.openingValue,
                purchaseQty: item.totalBox,
                purchaseValue: item.totalGrossAmount,
                combinedQty,
                combinedValue,
            };
        }

        // Also add products that are in opening inventory but have no purchases
        for (const [key, opening] of Object.entries(openingMap)) {
            if (!rateMap[key] && opening.openingQty > 0) {
                const ratePerBox = opening.openingQty > 0 ? opening.openingValue / opening.openingQty : 0;
                rateMap[key] = {
                    ratePerBox: Number(Number(ratePerBox).toFixed(4)),
                    openingQty: opening.openingQty,
                    openingValue: opening.openingValue,
                    purchaseQty: 0,
                    purchaseValue: 0,
                    combinedQty: opening.openingQty,
                    combinedValue: opening.openingValue,
                };
            }
        }

        console.log("Rate map built:", Object.keys(rateMap).length, "product+store entries (opening + purchases merged)");

        const admin = await AdministrativeModal.findOne();
        if (!admin) {
            return res.status(400).json({
                success: false,
                message: "Administrative settings not found",
            });
        }

        const finishedGoodsAccount = admin.finishedGoods;
        const costOfSalesAccount = admin.COSTOFSALES;
        const { discountMap, nameToId } = await buildProductMaps();

        const voucherOpts = {
            startDate,
            endDate,
            reqStore,
            rateMap,
            discountMap,
            nameToId,
            finishedGoodsAccount,
            costOfSalesAccount,
        };

        // Co / CoR only when Distributor is NOT true
        let coSuccessCount = 0;
        let coErrorCount = 0;
        let coResults = [];
        let salesInvoices = [];
        let corSuccessCount = 0;
        let corErrorCount = 0;
        let corResults = [];

        if (!isDistributorFlag(Distributor)) {
            const coProcessed = await processCoVouchers(voucherOpts);
            coSuccessCount = coProcessed.successCount;
            coErrorCount = coProcessed.errorCount;
            coResults = coProcessed.results;
            salesInvoices = coProcessed.salesInvoices;

            const corProcessed = await processReturnCostVouchers(voucherOpts);
            corSuccessCount = corProcessed.successCount;
            corErrorCount = corProcessed.errorCount;
            corResults = corProcessed.results;
        }

        // ==============================
        // STEP 8: Process DC Vouchers (only if Distributor is true)
        // ==============================
        let dcSuccessCount = 0;
        let dcErrorCount = 0;
        let dcResults = [];
        let dcInvoices = [];

        if (isDistributorFlag(Distributor)) {
        const dcMatch = {
            DCDate: {
                $gte: startDate,
                $lte: endDate,
            },
            PostStatus: { $ne : "False" },
        };
        if (reqStore) {
            dcMatch.Store = reqStore;
        }

        dcInvoices = await OrderDcModal.find(dcMatch);
        console.log(`Found ${dcInvoices.length} delivered DCs`);

        for (const dc of dcInvoices) {
            try {
                let totalCost = 0;
                const productDetails = [];

                for (const item of dc.DCData || []) {
                    const boxes = Number(item.DeliveredBox) || Number(item.totalBox) || Number(item.box) || 0;
                    const line = buildVoucherLine(item.product, boxes, rateMap, dc.Store, discountMap, nameToId);
                    totalCost += line.cost;
                    productDetails.push(line);
                }

                totalCost = Number(Number(totalCost).toFixed(4));

                // Delete old DC Voucher
                const oldDcVoucher = await VoucherModal.findOneAndDelete({
                    VoucherNumber: `Dcv${dc.DCCode}`,
                });

                // Create new DC Voucher with recalculated rate
                await VoucherModal.create({
                    VoucherType: "DCV",
                    VoucherNumber: `Dcv${dc.DCCode}`,
                    VoucherDate: dc.DCDate,
                    status: "Post",
                    VoucharData: [
                        {
                            Account: finishedGoodsAccount,
                            Credit: totalCost,
                            store: dc.Store,
                        },
                        {
                            Account: costOfSalesAccount,
                            Debit: totalCost,
                            store: dc.Store,
                        },
                    ],
                });

                dcSuccessCount++;
                dcResults.push({
                    dcCode: dc.DCCode,
                    date: dc.DCDate,
                    store: dc.Store,
                    oldVoucherDeleted: !!oldDcVoucher,
                    newTotalCost: totalCost,
                    productDetails,
                });

            } catch (err) {
                dcErrorCount++;
                dcResults.push({
                    dcCode: dc.DCCode,
                    error: err.message,
                });
                console.error(`Error processing DC ${dc.DCCode}:`, err.message);
            }
        }
        } // end if (Distributor)

        return res.status(200).json({
            success: true,
            message: isDistributorFlag(Distributor)
                ? `Costing recalculation completed. DC Vouchers: ${dcSuccessCount} updated.`
                : `Costing recalculation completed. Co Vouchers: ${coSuccessCount}, CoR Vouchers: ${corSuccessCount} updated.`,
            data: {
                dateRange: { startDate, endDate },
                financialYear: { start: fyStartDate, end: fyEndDate },
                openingInventoryProducts: Object.keys(openingMap).length,
                productsProcessed: Object.keys(rateMap).length,
                totalSalesInvoices: salesInvoices.length,
                totalDCs: dcInvoices.length,
                successCount: coSuccessCount,
                errorCount: coErrorCount,
                corSuccessCount,
                corErrorCount,
                dcSuccessCount,
                dcErrorCount,
                results: coResults,
                corResults,
                dcResults,
            },
        });

    } catch (err) {
        console.error("Costing recalculation error:", err);
        return res.status(500).json({
            success: false,
            message: "Costing recalculation failed",
            error: err.message,
        });
    }
};
/**
 * Get product-wise purchase rates (for preview before applying)
 */
export const getPurchaseRates = async (req, res) => {
    try {
        const purchaseStartDate = "2026-01-01"; // Purchase sirf 01 Jan 2026 se
        const purchaseEndDate = new Date().toISOString().split("T")[0];
        const reqStore = req.query.Store;

        console.log(`Preview purchase rates: ${purchaseStartDate} to ${purchaseEndDate}`);

        const matchStage = {
            PurchaseInvoiceDate: {
                $gte: purchaseStartDate,
                $lte: purchaseEndDate,
            },
            PostStatus: true,
        };
        if (reqStore) {
            matchStage.Store = reqStore;
        }

        const purchases = await PurchaseInvoiceModal.aggregate([
            {
                $match: matchStage,
            },
            { $unwind: "$PurchaseData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseData.product",
                        Store: "$Store",
                        Location: "$Location",
                    },
                    totalGrossAmount: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.GrossAmount",
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                    totalBox: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.totalBox",
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                    invoiceCount: { $sum: 1 },
                },
            },
            // Lookup Product Name
            {
                $lookup: {
                    from: "products",
                    localField: "_id.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
            // Lookup Store Name
            {
                $lookup: {
                    from: "stores",
                    localField: "_id.Store",
                    foreignField: "_id",
                    as: "storeInfo"
                }
            },
            { $unwind: { path: "$storeInfo", preserveNullAndEmptyArrays: true } },
            // Lookup Location Name
            {
                $lookup: {
                    from: "locations",
                    localField: "_id.Location",
                    foreignField: "_id",
                    as: "locationInfo"
                }
            },
            { $unwind: { path: "$locationInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    product: { $ifNull: ["$productInfo.ProductName", "$_id.product"] },
                    
                    Store: { $ifNull: ["$storeInfo.StoreName", "$_id.Store"] },
                    Location: { $ifNull: ["$locationInfo.LocationName", "$_id.Location"] },
                    totalGrossAmount: 1,
                    totalBox: 1,
                    invoiceCount: 1,
                    ratePerBox: {
                        $cond: {
                            if: { $gt: ["$totalBox", 0] },
                            then: { $divide: ["$totalGrossAmount", "$totalBox"] },
                            else: 0,
                        },
                    },
                },
            },
            { $sort: { product: 1 } },
        ]);

        return res.status(200).json({
            success: true,
            dateRange: { startDate: purchaseStartDate, endDate: purchaseEndDate },
            totalProducts: purchases.length,
            data: purchases,
        });

    } catch (err) {
        console.error("Get purchase rates error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch purchase rates",
            error: err.message,
        });
    }
};

export const getAvgRateReport = async (req, res) => {
    try {
        const { startDate: reqStartDate, endDate: reqEndDate, Store: reqStore } = req.query || {};

        // Report dates: user ki dates
        const reportStartDate = reqStartDate || "2025-07-01";
        const reportEndDate = reqEndDate || new Date().toISOString().split("T")[0];

        console.log(`Avg Rate Report: ${reportStartDate} to ${reportEndDate}`);

        // Find FY from opening inventory based on endDate
        const openingInventory = await OpeningInventoryModal.findOne({
            DateStart: { $lte: reportEndDate },
            DateEnd: { $gte: reportEndDate },
        });

        if (!openingInventory) {
            return res.status(400).json({
                success: false,
                message: `No Opening Inventory found for date ${reportEndDate}`,
            });
        }

        const fyStartDate = openingInventory.DateStart;
        console.log(`Financial Year: ${fyStartDate} to ${openingInventory.DateEnd}`);

        // Opening gross value = qty * per-box rate (same formula as Co voucher / SalesDumpDataWithCost)
        const inventoryData = Array.isArray(openingInventory.InvoetoryData) ? openingInventory.InvoetoryData : [];
        const openingMap = buildOpeningMap(inventoryData, reqStore);

        // Purchases from FY start to reportEndDate (for rate calculation)
        const matchStage = {
            PurchaseInvoiceDate: {
                $gte: fyStartDate,
                $lte: reportEndDate,
            },
            PostStatus: true,
        };
        if (reqStore) {
            matchStage.Store = reqStore;
        }

        const purchases = await PurchaseInvoiceModal.aggregate([
            { $match: matchStage },
            { $unwind: "$PurchaseData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseData.product",
                        Store: "$Store",
                    },
                    totalGrossAmount: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.GrossAmount",
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                    totalBox: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.totalBox",
                                to: "double",
                                onError: 0,
                                onNull: 0,
                            },
                        },
                    },
                    invoiceCount: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    Store: "$_id.Store",
                    totalGrossAmount: 1,
                    totalBox: 1,
                    invoiceCount: 1,
                },
            },
            { $sort: { product: 1 } },
        ]);

        console.log(`Avg Rate Report: Found ${purchases.length} purchase entries`);

        // Merge opening inventory + purchases for Product + Store
        const mergedMap = {};
        for (const item of purchases) {
            const key = `${item.product}_${item.Store}`;
            const existing = mergedMap[key] || {
                product: item.product,
                Store: item.Store,
                totalGrossAmount: 0,
                totalBox: 0,
                invoiceCount: 0,
            };
            existing.totalGrossAmount += item.totalGrossAmount;
            existing.totalBox += item.totalBox;
            existing.invoiceCount += item.invoiceCount;
            mergedMap[key] = existing;
        }

        // Calculate rate with opening inventory
        const result = [];
        for (const [key, item] of Object.entries(mergedMap)) {
            const opening = openingMap[key] || { openingQty: 0, openingValue: 0 };
            const combinedQty = opening.openingQty + item.totalBox;
            const combinedValue = opening.openingValue + item.totalGrossAmount;
            const avgRate = combinedQty > 0 ? combinedValue / combinedQty : 0;

            result.push({
                product: item.product,
                Store: item.Store,
                openingQty: opening.openingQty,
                openingValue: opening.openingValue,
                purchaseQty: item.totalBox,
                purchaseValue: item.totalGrossAmount,
                totalGrossAmount: combinedValue,
                totalBox: combinedQty,
                avgRate: Number(avgRate),
                invoiceCount: item.invoiceCount,
            });
        }

        // Add opening-only products
        for (const [key, opening] of Object.entries(openingMap)) {
            if (!mergedMap[key] && opening.openingQty > 0) {
                result.push({
                    product: key.split('_')[0],
                    Store: key.split('_')[1],
                    openingQty: opening.openingQty,
                    openingValue: opening.openingValue,
                    purchaseQty: 0,
                    purchaseValue: 0,
                    totalGrossAmount: opening.openingValue,
                    totalBox: opening.openingQty,
                    avgRate: Number((opening.openingValue / opening.openingQty)),
                    invoiceCount: 0,
                });
            }
        }

        result.sort((a, b) => a.product.localeCompare(b.product));

        // Grand totals
        const grandTotalGross = result.reduce((sum, p) => sum + (p.totalGrossAmount || 0), 0);
        const grandTotalBox = result.reduce((sum, p) => sum + (p.totalBox || 0), 0);
        const grandAvgRate = grandTotalBox > 0 ? grandTotalGross / grandTotalBox : 0;

        return res.status(200).json({
            success: true,
            financialYear: { start: fyStartDate, end: openingInventory.DateEnd },
            dateRange: { startDate: reportStartDate, endDate: reportEndDate },
            totalProducts: result.length,
            grandTotal: {
                grossAmount: grandTotalGross,
                totalBox: grandTotalBox,
                avgRate: Number(grandAvgRate.toFixed(4)),
            },
            data: result,
        });

    } catch (err) {
        console.error("Get avg rate report error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch avg rate report",
            error: err.message,
        });
    }
};


export const recalculateWithAvgRates = async (req, res) => {
    try {
        const { startDate: reqStart, endDate: reqEnd, Store: reqStore, Distributor, rateData } = req.body || {};

        if (!rateData || !Array.isArray(rateData) || rateData.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No rate data provided. Please load Avg Rate Report first.",
            });
        }

        // Co/DC Voucher processing: user ki dates
        const startDate = reqStart || "2026-01-01";
        const endDate = reqEnd || new Date().toISOString().split("T")[0];

        console.log(`Recalculate with Avg Rates: ${startDate} to ${endDate}`);
        console.log(`Store: ${reqStore || 'All'}, Distributor: ${Distributor || false}`);
        console.log(`Rate data entries: ${rateData.length}`);

        // Build rate map from frontend data (same keys as avg-rate-report / dump)
        const rateMap = {};
        for (const item of rateData) {
            const key = buildRateKey(item.product, item.Store);
            rateMap[key] = {
                ratePerBox: Number(item.avgRate) || 0,
                openingQty: Number(item.openingQty) || 0,
                openingValue: Number(item.openingValue) || 0,
                purchaseQty: Number(item.purchaseQty) || 0,
                purchaseValue: Number(item.purchaseValue) || 0,
                combinedQty: Number(item.totalBox) || 0,
                combinedValue: Number(item.totalGrossAmount) || 0,
            };
        }

        console.log("Rate map built from frontend data:", Object.keys(rateMap).length, "entries");

        // Get Admin accounts
        const admin = await AdministrativeModal.findOne();
        if (!admin) {
            return res.status(400).json({
                success: false,
                message: "Administrative settings not found",
            });
        }

        const finishedGoodsAccount = admin.finishedGoods;
        const costOfSalesAccount = admin.COSTOFSALES;
        const { discountMap, nameToId } = await buildProductMaps();

        const voucherOpts = {
            startDate,
            endDate,
            reqStore,
            rateMap,
            discountMap,
            nameToId,
            finishedGoodsAccount,
            costOfSalesAccount,
        };

        let coSuccessCount = 0;
        let coErrorCount = 0;
        let coResults = [];
        let salesInvoices = [];
        let corSuccessCount = 0;
        let corErrorCount = 0;
        let corResults = [];

        if (!isDistributorFlag(Distributor)) {
            const coProcessed = await processCoVouchers(voucherOpts);
            coSuccessCount = coProcessed.successCount;
            coErrorCount = coProcessed.errorCount;
            coResults = coProcessed.results;
            salesInvoices = coProcessed.salesInvoices;

            const corProcessed = await processReturnCostVouchers(voucherOpts);
            corSuccessCount = corProcessed.successCount;
            corErrorCount = corProcessed.errorCount;
            corResults = corProcessed.results;
        }

        // DC Vouchers (only if Distributor is true)
        let dcSuccessCount = 0;
        let dcErrorCount = 0;
        let dcResults = [];
        let dcInvoices = [];

        if (isDistributorFlag(Distributor)) {
            const dcMatch = {
                DCDate: {
                    $gte: startDate,
                    $lte: endDate,
                },
                PostStatus: { $in: ["Deliverd", "Delivered"] },
            };
            if (reqStore) {
                dcMatch.Store = reqStore;
            }

            dcInvoices = await OrderDcModal.find(dcMatch);
            console.log(`Found ${dcInvoices.length} delivered DCs`);

            for (const dc of dcInvoices) {
                try {
                    let totalCost = 0;
                    const productDetails = [];

                    for (const item of dc.DCData || []) {
                        const boxes = Number(item.DeliveredBox) || Number(item.totalBox) || Number(item.box) || 0;
                        const line = buildVoucherLine(item.product, boxes, rateMap, dc.Store, discountMap, nameToId);
                        totalCost += line.cost;
                        productDetails.push(line);
                    }

                    totalCost = Number(Number(totalCost).toFixed(4));

                    // Delete old DC Voucher
                    const oldDcVoucher = await VoucherModal.findOneAndDelete({
                        VoucherNumber: `Dcv${dc.DCCode}`,
                    });

                    // Create new DC Voucher
                    await VoucherModal.create({
                        VoucherType: "DCV",
                        VoucherNumber: `Dcv${dc.DCCode}`,
                        VoucherDate: dc.DCDate,
                        status: "Post",
                        VoucharData: [
                            {
                                Account: finishedGoodsAccount,
                                Credit: totalCost,
                                store: dc.Store,
                            },
                            {
                                Account: costOfSalesAccount,
                                Debit: totalCost,
                                store: dc.Store,
                            },
                        ],
                    });

                    dcSuccessCount++;
                    dcResults.push({
                        dcCode: dc.DCCode,
                        date: dc.DCDate,
                        store: dc.Store,
                        oldVoucherDeleted: !!oldDcVoucher,
                        newTotalCost: totalCost,
                        productDetails,
                    });

                } catch (err) {
                    dcErrorCount++;
                    dcResults.push({
                        dcCode: dc.DCCode,
                        error: err.message,
                    });
                    console.error(`Error processing DC ${dc.DCCode}:`, err.message);
                }
            }
        } // end if (Distributor)

        return res.status(200).json({
            success: true,
            message: isDistributorFlag(Distributor)
                ? `Costing recalculation completed (from Avg Rates). DC Vouchers: ${dcSuccessCount} updated.`
                : `Costing recalculation completed (from Avg Rates). Co Vouchers: ${coSuccessCount}, CoR Vouchers: ${corSuccessCount} updated.`,
            data: {
                dateRange: { startDate, endDate },
                rateDataUsed: rateData.length,
                totalSalesInvoices: salesInvoices?.length || 0,
                totalDCs: dcInvoices.length,
                successCount: coSuccessCount,
                errorCount: coErrorCount,
                corSuccessCount,
                corErrorCount,
                dcSuccessCount,
                dcErrorCount,
                rateMap,
                results: coResults,
                corResults,
                dcResults,
            },
        });

    } catch (err) {
        console.error("Recalculate with avg rates error:", err);
        return res.status(500).json({
            success: false,
            message: "Costing recalculation with avg rates failed",
            error: err.message,
        });
    }
};

