import OpeningInventoryModal from "../modal/OpeningInventoryModal.js";
import OrderDcModal from "../modal/SaleOrderDcModal.js";
import RcModal from "../modal/RcModal.js";
import StockAdjustmentModal from "../modal/StockAdjustmentModal.js";
import SalesReturnModal from "../modal/SalesReturnModal.js";
import PurchaseReturnModal from "../modal/PurchaseReturnModal.js";
import ProductModal from "../modal/ProductModal.js";
import StoreModal from "../modal/StoreModal.js";

const AGG_OPTS = { allowDiskUse: true };
const MAX_LINE_QTY = 1e9;

const q = (value) => {
    if (value == null || value === "") return 0;
    const raw = typeof value === "string" ? value.replace(/,/g, "").trim() : value;
    const n = Number(raw);
    if (!Number.isFinite(n) || Math.abs(n) > MAX_LINE_QTY) return 0;
    return n;
};

const pack = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 1;
};

const fyStartFromDate = (dateStr) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return month >= 7 ? `${year}-07-01` : `${year - 1}-07-01`;
};

const dayBefore = (dateStr) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
};

const toDouble = (path) => ({
    $convert: { input: path, to: "double", onError: 0, onNull: 0 },
});

const ymd = (path) => ({
    $substrCP: [
        {
            $cond: [
                { $eq: [{ $type: path }, "date"] },
                { $dateToString: { format: "%Y-%m-%d", date: path } },
                { $toString: path },
            ],
        },
        0,
        10,
    ],
});

const bucketSum = (datePath, boxExpr, from, to) => {
    if (!from || !to || from > to) {
        return { $sum: 0 };
    }
    return {
        $sum: {
            $cond: [
                {
                    $and: [
                        { $gte: [datePath, from] },
                        { $lte: [datePath, to] },
                    ],
                },
                boxExpr,
                0,
            ],
        },
    };
};

const storeMatch = (storeIds, field = "Store") =>
    storeIds.length ? { [field]: { $in: storeIds } } : {};

const productIdExpr = (productPath) => ({
    $let: {
        vars: { p: productPath },
        in: {
            $toString: {
                $cond: [
                    { $eq: [{ $type: "$$p" }, "object"] },
                    { $ifNull: ["$$p.value", { $ifNull: ["$$p._id", "$$p"] }] },
                    "$$p",
                ],
            },
        },
    },
});

const storeIdExpr = {
    $toString: { $ifNull: ["$Store", ""] },
};

const lineBoxExpr = (totalBoxPath, boxPath) => ({
    $let: {
        vars: {
            tb: toDouble(totalBoxPath),
            b: toDouble(boxPath),
        },
        in: {
            $cond: [{ $gt: [{ $abs: "$$tb" }, 0] }, "$$tb", "$$b"],
        },
    },
});

const rcBoxExpr = lineBoxExpr("$RcData.totalBox", "$RcData.box");
const salesReturnBoxExpr = lineBoxExpr("$SalesReturnData.totalBox", "$SalesReturnData.box");
const purchaseReturnBoxExpr = lineBoxExpr("$PurchaseReturnData.totalBox", "$PurchaseReturnData.box");

const emptyBucket = (storeId, productId) => ({
    storeId: String(storeId || ""),
    productId,
    openingQty: 0,
    rcThroughStart: 0,
    rcPeriod: 0,
    dcThroughStart: 0,
    dcPeriod: 0,
    sretThroughStart: 0,
    sretPeriod: 0,
    pretThroughStart: 0,
    pretPeriod: 0,
    adjLessThroughStart: 0,
    adjAddThroughStart: 0,
    adjLessPeriod: 0,
    adjAddPeriod: 0,
});

const rowKey = (storeId, productId) => `${String(storeId || "")}::${String(productId || "")}`;

/**
 * Distributor Stock Flow — store/department-wise
 * Formula: Opening + RC + SaleReturn − DC − PurchaseReturn + AdjustIn − AdjustOut = Closing
 */
export const getDistributorStockFlowReport = async (req, res) => {
    const t0 = Date.now();
    try {
        const {
            startDate,
            endDate,
            Store = "",
            damage = "Fresh",
        } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        const fyStart = fyStartFromDate(startDate);
        if (!fyStart) {
            return res.status(400).json({ error: "Invalid startDate" });
        }

        const dayBeforeStart = dayBefore(startDate);
        const hasOpeningWindow = Boolean(dayBeforeStart && dayBeforeStart >= fyStart);

        const storeIds = String(Store || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        const firstOpening = await OpeningInventoryModal.find({
            DateStart: { $lte: fyStart },
            DateEnd: { $gte: fyStart },
        })
            .select("DateStart DateEnd InvoetoryData")
            .lean();

        const nextDate = firstOpening[0]?.DateStart || fyStart;
        const openingLines = Array.isArray(firstOpening[0]?.InvoetoryData)
            ? firstOpening[0].InvoetoryData
            : [];

        const periodFrom = startDate;
        const periodTo = endDate;
        const preFrom = nextDate;
        const rangeEnd = endDate;
        const throughStartFrom = preFrom;
        const throughStartTo = hasOpeningWindow ? dayBeforeStart : dayBefore(fyStart);

        const damageNorm = damage || "Fresh";
        const wantFresh = damageNorm === "Fresh";
        const wantDamageOnly = damageNorm === "Damage";

        const rcPostedMatch = {
            PostStatus: { $ne: "false" },
        };
        const dcDeliveredMatch = {
            PostStatus: { $in: ["Invoiced", "Deliverd"] },
        };
        // Purchase Return + Sales Invoice Return: only posted (PostStatus true)
        const returnPostedMatch = {
            PostStatus: { $in: [true, "true", "True"] },
        };

        const [rcAgg, dcAgg, salesReturnAgg, purchaseReturnAgg, adjustmentAgg, products, stores] =
            await Promise.all([
            RcModal.aggregate(
                [
                    { $match: { ...rcPostedMatch, ...storeMatch(storeIds) } },
                    { $addFields: { _rcDate: ymd("$RcDate"), _storeId: storeIdExpr } },
                    { $match: { _rcDate: { $gte: preFrom, $lte: rangeEnd }, _storeId: { $ne: "" } } },
                    { $unwind: "$RcData" },
                    {
                        $addFields: {
                            _productId: productIdExpr("$RcData.product"),
                            _rcBox: rcBoxExpr,
                        },
                    },
                    {
                        $match: {
                            _productId: { $nin: [null, "", "null", "undefined"] },
                        },
                    },
                    {
                        $group: {
                            _id: { storeId: "$_storeId", productId: "$_productId" },
                            throughStart: bucketSum("$_rcDate", "$_rcBox", throughStartFrom, throughStartTo),
                            period: bucketSum("$_rcDate", "$_rcBox", periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            OrderDcModal.aggregate(
                [
                    { $match: { ...dcDeliveredMatch, ...storeMatch(storeIds) } },
                    { $addFields: { _dcDate: ymd("$DCDate"), _storeId: storeIdExpr } },
                    { $match: { _dcDate: { $gte: preFrom, $lte: rangeEnd }, _storeId: { $ne: "" } } },
                    { $unwind: "$DCData" },
                    {
                        $addFields: {
                            _productId: productIdExpr("$DCData.product"),
                            _dcBox: toDouble("$DCData.DeliveredBox"),
                        },
                    },
                    {
                        $match: {
                            _productId: { $nin: [null, "", "null", "undefined"] },
                            _dcBox: { $gt: 0 },
                        },
                    },
                    {
                        $group: {
                            _id: { storeId: "$_storeId", productId: "$_productId" },
                            throughStart: bucketSum("$_dcDate", "$_dcBox", throughStartFrom, throughStartTo),
                            period: bucketSum("$_dcDate", "$_dcBox", periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Sales Return — adds to stock (PostStatus true only)
            SalesReturnModal.aggregate(
                [
                    {
                        $match: {
                            ...storeMatch(storeIds),
                            ...returnPostedMatch,
                            ...(wantFresh ? { Condition: { $ne: "Damage" } } : {}),
                            ...(wantDamageOnly ? { Condition: "Damage" } : {}),
                        },
                    },
                    { $addFields: { _srd: ymd("$SalesInvoiceReturnDate"), _storeId: storeIdExpr } },
                    { $match: { _srd: { $gte: preFrom, $lte: rangeEnd }, _storeId: { $ne: "" } } },
                    { $unwind: "$SalesReturnData" },
                    {
                        $addFields: {
                            _productId: productIdExpr("$SalesReturnData.product"),
                            _sretBox: salesReturnBoxExpr,
                        },
                    },
                    {
                        $match: {
                            _productId: { $nin: [null, "", "null", "undefined"] },
                        },
                    },
                    {
                        $group: {
                            _id: { storeId: "$_storeId", productId: "$_productId" },
                            throughStart: bucketSum("$_srd", "$_sretBox", throughStartFrom, throughStartTo),
                            period: bucketSum("$_srd", "$_sretBox", periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Purchase Return — reduces stock (PostStatus true + Fresh lines only)
            PurchaseReturnModal.aggregate(
                [
                    {
                        $match: {
                            ...storeMatch(storeIds),
                            ...returnPostedMatch,
                        },
                    },
                    { $addFields: { _prd: ymd("$PurchaseReturnDate"), _storeId: storeIdExpr } },
                    { $match: { _prd: { $gte: preFrom, $lte: rangeEnd }, _storeId: { $ne: "" } } },
                    { $unwind: "$PurchaseReturnData" },
                    { $match: { "PurchaseReturnData.Condition": "Fresh" } },
                    {
                        $addFields: {
                            _productId: productIdExpr("$PurchaseReturnData.product"),
                            _pretBox: purchaseReturnBoxExpr,
                        },
                    },
                    {
                        $match: {
                            _productId: { $nin: [null, "", "null", "undefined"] },
                        },
                    },
                    {
                        $group: {
                            _id: { storeId: "$_storeId", productId: "$_productId" },
                            throughStart: bucketSum("$_prd", "$_pretBox", throughStartFrom, throughStartTo),
                            period: bucketSum("$_prd", "$_pretBox", periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            StockAdjustmentModal.aggregate(
                [
                    {
                        $match: {
                            PostStatus: { $in: [true, "true", "True"] },
                            ...storeMatch(storeIds),
                        },
                    },
                    { $addFields: { _adjDate: ymd("$AdjustmentDate"), _storeId: storeIdExpr } },
                    { $match: { _adjDate: { $gte: preFrom, $lte: rangeEnd }, _storeId: { $ne: "" } } },
                    { $unwind: "$AdjustmentData" },
                    {
                        $addFields: {
                            _productId: productIdExpr({
                                $ifNull: [
                                    "$AdjustmentData.productName",
                                    { $ifNull: ["$AdjustmentData.product", "$AdjustmentData.Product"] },
                                ],
                            }),
                        },
                    },
                    {
                        $group: {
                            _id: { storeId: "$_storeId", productId: "$_productId" },
                            throughStartLess: bucketSum("$_adjDate", toDouble("$AdjustmentData.lessBox"), throughStartFrom, throughStartTo),
                            throughStartAdd: bucketSum("$_adjDate", toDouble("$AdjustmentData.addBox"), throughStartFrom, throughStartTo),
                            periodLess: bucketSum("$_adjDate", toDouble("$AdjustmentData.lessBox"), periodFrom, periodTo),
                            periodAdd: bucketSum("$_adjDate", toDouble("$AdjustmentData.addBox"), periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            ProductModal.find({})
                .select("ProductName BoxinCarton PcsinBox TPSale RetailPrice salesFlowRef")
                .lean(),

            StoreModal.find(storeIds.length ? { _id: { $in: storeIds } } : {})
                .select("StoreName")
                .lean(),
        ]);

        const productMap = new Map(products.map((p) => [String(p._id), p]));
        const storeMap = new Map(stores.map((s) => [String(s._id), s]));
        const byKey = new Map();

        const ensure = (storeId, productId) => {
            const sid = String(storeId || "");
            const pid = String(productId || "");
            if (!sid || !pid || pid === "null" || pid === "undefined") return null;
            const key = rowKey(sid, pid);
            if (!byKey.has(key)) {
                byKey.set(key, emptyBucket(sid, pid));
            }
            return byKey.get(key);
        };

        // Only store+product combos that actually exist for that store
        // (opening / RC / DC / adjustment) — do NOT seed every product into every store
        const storeIdSet = new Set(storeIds.map(String));

        for (const line of openingLines) {
            const productId = line?.product;
            const sid = line?.Store;
            if (productId == null || !sid) continue;
            if (storeIds.length && !storeIds.includes(String(sid))) continue;
            storeIdSet.add(String(sid));
            const b = ensure(sid, productId);
            if (b) b.openingQty += q(line.opneingQty);
        }

        for (const row of rcAgg) {
            const sid = row._id?.storeId;
            const pid = row._id?.productId;
            if (sid) storeIdSet.add(String(sid));
            const b = ensure(sid, pid);
            if (!b) continue;
            b.rcThroughStart += q(row.throughStart);
            b.rcPeriod += q(row.period);
        }

        for (const row of dcAgg) {
            const sid = row._id?.storeId;
            const pid = row._id?.productId;
            if (sid) storeIdSet.add(String(sid));
            const b = ensure(sid, pid);
            if (!b) continue;
            b.dcThroughStart += q(row.throughStart);
            b.dcPeriod += q(row.period);
        }

        for (const row of salesReturnAgg) {
            const sid = row._id?.storeId;
            const pid = row._id?.productId;
            if (sid) storeIdSet.add(String(sid));
            const b = ensure(sid, pid);
            if (!b) continue;
            b.sretThroughStart += q(row.throughStart);
            b.sretPeriod += q(row.period);
        }

        for (const row of purchaseReturnAgg) {
            const sid = row._id?.storeId;
            const pid = row._id?.productId;
            if (sid) storeIdSet.add(String(sid));
            const b = ensure(sid, pid);
            if (!b) continue;
            b.pretThroughStart += q(row.throughStart);
            b.pretPeriod += q(row.period);
        }

        for (const row of adjustmentAgg) {
            const sid = row._id?.storeId;
            const pid = row._id?.productId;
            if (sid) storeIdSet.add(String(sid));
            const b = ensure(sid, pid);
            if (!b) continue;
            b.adjLessThroughStart += q(row.throughStartLess);
            b.adjAddThroughStart += q(row.throughStartAdd);
            b.adjLessPeriod += q(row.periodLess);
            b.adjAddPeriod += q(row.periodAdd);
        }

        // Load any missing store names
        if (storeIdSet.size) {
            const missing = [...storeIdSet].filter((id) => !storeMap.has(id));
            if (missing.length) {
                const extra = await StoreModal.find({ _id: { $in: missing } }).select("StoreName").lean();
                for (const s of extra) storeMap.set(String(s._id), s);
            }
        }

        const rows = [];
        for (const b of byKey.values()) {
            const product = productMap.get(String(b.productId));
            if (!product) continue;

            const store = storeMap.get(String(b.storeId));
            const storeName = store?.StoreName || String(b.storeId);
            const pcs = product?.PcsinBox || 1;
            const boxInCarton = pack(product?.BoxinCarton);

            const openingBalance =
                (b.openingQty || 0) +
                (b.rcThroughStart || 0) +
                (b.sretThroughStart || 0) -
                (b.dcThroughStart || 0) -
                (b.pretThroughStart || 0) +
                (b.adjAddThroughStart || 0) -
                (b.adjLessThroughStart || 0);

            const rc = b.rcPeriod || 0;
            const dc = b.dcPeriod || 0;
            const saleReturn = b.sretPeriod || 0;
            const purchaseReturn = b.pretPeriod || 0;
            const adjustIn = b.adjAddPeriod || 0;
            const adjustOut = b.adjLessPeriod || 0;
            const closingBalance =
                openingBalance + rc + saleReturn - dc - purchaseReturn + adjustIn - adjustOut;

            // Skip empty rows (no opening and no period movement for this store+product)
            const hasData = [
                openingBalance,
                rc,
                dc,
                saleReturn,
                purchaseReturn,
                adjustIn,
                adjustOut,
                closingBalance,
            ].some((n) => q(n) !== 0);
            if (!hasData) continue;

            const tpSale = Number(product?.TPSale || 0);
            const retailPrice = Number(product?.RetailPrice || 0);
            const closingValue = Number.isFinite(tpSale * closingBalance)
                ? Number((tpSale * closingBalance).toFixed(2))
                : 0;
            const closingValueWithGst = Number.isFinite(
                ((retailPrice / 100) * 18) * closingBalance + tpSale * closingBalance
            )
                ? Number(
                    (((retailPrice / 100) * 18) * closingBalance + tpSale * closingBalance).toFixed(2)
                )
                : 0;

            rows.push({
                id: `${b.storeId}_${b.productId}`,
                storeId: b.storeId,
                storeName,
                Department: storeName,
                productId: b.productId,
                productName: product.ProductName,
                SkuCode: product?.salesFlowRef,
                boxInCarton: product?.BoxinCarton,
                PcsinBox: product?.PcsinBox,

                openingBalance,
                totalRCBox: rc,
                totalDCBox: dc,
                totalReturnBox: saleReturn,
                totalPurchaseReturnBox: purchaseReturn,
                totalAdjustmentAddBox: adjustIn,
                totalAdjustmentLessBox: adjustOut,
                closingBalance,

                TotalopenigQty: openingBalance,
                TotalopenigCarton: openingBalance / boxInCarton,
                TotalopenigUnit: openingBalance * pcs,
                remainingBoxes: closingBalance,
                remainingCartons: closingBalance / boxInCarton,
                remainingUnits: closingBalance * pcs,
                remainingBoxesValue: closingValue,
                remainingBoxesValueWithGst: closingValueWithGst,

                totalRCCarton: rc / boxInCarton || 0,
                totalRCUnit: pcs * rc,
                totalDCCarton: dc / boxInCarton || 0,
                totalDCUnits: pcs * dc,
                totalReturnCarton: saleReturn / boxInCarton || 0,
                totalReturnUnit: pcs * saleReturn,
                totalPurchaseReturnCarton: purchaseReturn / boxInCarton || 0,
                totalPurchaseReturnUnit: pcs * purchaseReturn,
                adjustInCarton: adjustIn / boxInCarton || 0,
                adjustInUnit: pcs * adjustIn,
                adjustOutCarton: adjustOut / boxInCarton || 0,
                adjustOutUnit: pcs * adjustOut,
                closingCarton: closingBalance / boxInCarton || 0,
                closingUnit: pcs * closingBalance,
            });
        }

        rows.sort((a, b) => {
            const s = String(a.storeName).localeCompare(String(b.storeName));
            if (s !== 0) return s;
            return String(a.productName).localeCompare(String(b.productName));
        });

        res.json({
            rows,
            meta: {
                fyStart,
                dayBeforeStart,
                hasOpeningWindow,
                throughStartFrom,
                throughStartTo,
                periodFrom,
                periodTo,
                storeCount: storeIdSet.size,
                rcGroups: rcAgg.length,
                dcGroups: dcAgg.length,
                salesReturnGroups: salesReturnAgg.length,
                purchaseReturnGroups: purchaseReturnAgg.length,
                formula:
                    "Opening + RC + SaleReturn - DC - PurchaseReturn + AdjustIn - AdjustOut = Closing (per Department/Store)",
                ms: Date.now() - t0,
                products: rows.length,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};