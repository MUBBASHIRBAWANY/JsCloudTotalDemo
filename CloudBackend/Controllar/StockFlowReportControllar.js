import OpeningInventoryModal from "../modal/OpeningInventoryModal.js";
import PurchaseInvoiceModal from "../modal/PurchaseInvoiceModal.js";
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";
import InventoryTransferOutModal from "../modal/InventoryTransferOutModal.js";
import InventoryTransferInModal from "../modal/TransferInModal.js";
import SalesReturnModal from "../modal/SalesReturnModal.js";
import PurchaseReturnModal from "../modal/PurchaseReturnModal.js";
import StockReplacementModal from "../modal/StockReplacementModal.js";
import OrderDcModal from "../modal/SaleOrderDcModal.js";
import RcModal from "../modal/RcModal.js";
import StockAdjustmentModal from "../modal/StockAdjustmentModal.js";
import ProductModal from "../modal/ProductModal.js";

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

/** Prefer totalBox (stock qty incl. cartons); fall back to box for older rows. */
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

const purchaseReturnBoxExpr = lineBoxExpr(
    "$PurchaseReturnData.totalBox",
    "$PurchaseReturnData.box"
);
const salesReturnBoxExpr = lineBoxExpr(
    "$SalesReturnData.totalBox",
    "$SalesReturnData.box"
);

/** Normalize date strings / ISO dates to YYYY-MM-DD for safe range compares. */
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

/** Sum box qty only when date is inside [from, to] (inclusive, string YYYY-MM-DD). */
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

const isPostedOrTruthy = {
    PostStatus: { $nin: [false, "false", "False", "FALSE"] },
};

/**
 * Fast Stock Flow Report — product-level Mongo aggregations in parallel.
 * One pass per collection with date buckets:
 *   pre   = opening-year start → day before FY (legacy *Before)
 *   open  = FY start → day before report start (opening window)
 *   period = report start → report end (display columns)
 */
export const getStockFlowReport = async (req, res) => {
    const t0 = Date.now();
    try {
        const {
            startDate,
            endDate,
            Store = "",
            status = "Post",
            damage = "Fresh",
        } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        const fyStart = fyStartFromDate(startDate);
        if (!fyStart) {
            return res.status(400).json({ error: "Invalid startDate" });
        }

        const dayBeforeFy = dayBefore(fyStart);
        const dayBeforeStart = dayBefore(startDate);
        const hasOpeningWindow = Boolean(dayBeforeStart && dayBeforeStart >= fyStart);

        const storeIds = String(Store || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        // Defaults match UI: Post + Fresh. "Both" must not apply Post/Fresh-only filters.
        const statusNorm = status || "Post";
        const damageNorm = damage || "Fresh";
        const postOnly = statusNorm === "Post";
        const unpostOnly = statusNorm === "UnPost";
        const wantFresh = damageNorm === "Fresh";
        const wantDamageOnly = damageNorm === "Damage";

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

        const openFrom = fyStart;
        const openTo = hasOpeningWindow ? dayBeforeStart : null;
        const periodFrom = startDate;
        const periodTo = endDate;
        const preFrom = nextDate;
        const preTo = dayBeforeFy;
        const rangeEnd = endDate;

        const postyFilter = postOnly
            ? isPostedOrTruthy
            : unpostOnly
              ? { PostStatus: { $in: [false, "false", "False"] } }
              : {};
        const transferInOpenOk = Boolean(openFrom && openTo);
        const purchaseReturnPostMatch = postOnly
            ? { PostStatus: { $in: [true, "true", "True"] } }
            : unpostOnly
              ? { PostStatus: { $in: [false, "false", "False"] } }
              : {};
        // Purchase Return boxes: always Condition === "Fresh" only (no Damage / blank)
        const purchaseReturnConditionStages = [
            { $match: { "PurchaseReturnData.Condition": "Fresh" } },
        ];

        const [
            purchaseAgg,
            rcAgg,
            saleAgg,
            dcAgg,
            salesReturnAgg,
            purchaseReturnAgg,
            transferOutAgg,
            transferInAgg,
            replacementFromAgg,
            replacementBeforeAgg,
            adjustmentAgg,
            products,
        ] = await Promise.all([
            // Purchase — no PostStatus filter (same as GetDataByDate Post branch)
            PurchaseInvoiceModal.aggregate(
                [
                    {
                        $match: {
                            PurchaseInvoiceDate: { $gte: preFrom, $lte: rangeEnd },
                            ...storeMatch(storeIds),
                        },
                    },
                    { $unwind: "$PurchaseData" },
                    {
                        $group: {
                            _id: "$PurchaseData.product",
                            pre: bucketSum("$PurchaseInvoiceDate", toDouble("$PurchaseData.totalBox"), preFrom, preTo),
                            open: bucketSum("$PurchaseInvoiceDate", toDouble("$PurchaseData.totalBox"), openFrom, openTo),
                            period: bucketSum("$PurchaseInvoiceDate", toDouble("$PurchaseData.totalBox"), periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // RC — posted only
            RcModal.aggregate(
                [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $gte: [{ $toDate: "$RcDate" }, new Date(preFrom)] },
                                    { $lte: [{ $toDate: "$RcDate" }, new Date(rangeEnd)] },
                                ],
                            },
                            PostStatus: { $in: ["true", true] },
                            ...storeMatch(storeIds),
                        },
                    },
                    { $unwind: "$RcData" },
                    {
                        $addFields: {
                            _rcDate: {
                                $cond: [
                                    { $eq: [{ $type: "$RcDate" }, "string"] },
                                    "$RcDate",
                                    { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$RcDate" } } },
                                ],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: "$RcData.product",
                            pre: bucketSum("$_rcDate", toDouble("$RcData.totalBox"), preFrom, preTo),
                            open: bucketSum("$_rcDate", toDouble("$RcData.totalBox"), openFrom, openTo),
                            period: bucketSum("$_rcDate", toDouble("$RcData.totalBox"), periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Sales
            SalesInvoiceModal.aggregate(
                [
                    {
                        $match: {
                            SalesInvoiceDate: { $gte: preFrom, $lte: rangeEnd },
                            ...storeMatch(storeIds),
                            ...(postOnly ? { PostStatus: true } : {}),
                            ...(unpostOnly ? { PostStatus: false } : {}),
                        },
                    },
                    { $unwind: "$SalesData" },
                    {
                        $group: {
                            _id: "$SalesData.product",
                            pre: bucketSum("$SalesInvoiceDate", toDouble("$SalesData.totalBox"), preFrom, preTo),
                            open: bucketSum("$SalesInvoiceDate", toDouble("$SalesData.totalBox"), openFrom, openTo),
                            period: bucketSum("$SalesInvoiceDate", toDouble("$SalesData.totalBox"), periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // DC
            OrderDcModal.aggregate(
                [
                    {
                        $match: {
                            DCDate: { $gte: preFrom, $lte: rangeEnd },
                            ...storeMatch(storeIds),
                            ...(postOnly ? { PostStatus: { $ne: "False" } } : {}),
                            ...(unpostOnly ? { PostStatus: "False" } : {}),
                        },
                    },
                    { $unwind: "$DCData" },
                    {
                        $group: {
                            _id: "$DCData.product",
                            pre: bucketSum("$DCDate", toDouble("$DCData.DeliveredBox"), preFrom, preTo),
                            open: bucketSum("$DCDate", toDouble("$DCData.DeliveredBox"), openFrom, openTo),
                            period: bucketSum("$DCDate", toDouble("$DCData.DeliveredBox"), periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Sales Return — totalBox with box fallback; date normalized
            SalesReturnModal.aggregate(
                [
                    {
                        $match: {
                            ...storeMatch(storeIds),
                            ...postyFilter,
                            ...(wantFresh ? { Condition: { $ne: "Damage" } } : {}),
                            ...(wantDamageOnly ? { Condition: "Damage" } : {}),
                        },
                    },
                    {
                        $addFields: {
                            _srd: ymd("$SalesInvoiceReturnDate"),
                        },
                    },
                    {
                        $match: {
                            _srd: { $gte: preFrom, $lte: rangeEnd },
                        },
                    },
                    { $unwind: "$SalesReturnData" },
                    {
                        $group: {
                            _id: "$SalesReturnData.product",
                            pre: bucketSum("$_srd", salesReturnBoxExpr, preFrom, preTo),
                            open: bucketSum("$_srd", salesReturnBoxExpr, openFrom, openTo),
                            period: bucketSum("$_srd", salesReturnBoxExpr, periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Purchase Return — totalBox (stock qty); fall back to box. Date normalized to YYYY-MM-DD.
            PurchaseReturnModal.aggregate(
                [
                    {
                        $match: {
                            ...storeMatch(storeIds),
                            ...purchaseReturnPostMatch,
                        },
                    },
                    {
                        $addFields: {
                            _prd: ymd("$PurchaseReturnDate"),
                        },
                    },
                    {
                        $match: {
                            _prd: { $gte: preFrom, $lte: rangeEnd },
                        },
                    },
                    { $unwind: "$PurchaseReturnData" },
                    ...purchaseReturnConditionStages,
                    {
                        $group: {
                            _id: "$PurchaseReturnData.product",
                            pre: bucketSum("$_prd", purchaseReturnBoxExpr, preFrom, preTo),
                            open: bucketSum("$_prd", purchaseReturnBoxExpr, openFrom, openTo),
                            period: bucketSum("$_prd", purchaseReturnBoxExpr, periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Transfer Out — filter by StoreFrom when stores selected
            InventoryTransferOutModal.aggregate(
                [
                    {
                        $match: {
                            TransferOutDate: { $gte: preFrom, $lte: rangeEnd },
                            ...storeMatch(storeIds, "StoreFrom"),
                            ...postyFilter,
                        },
                    },
                    { $unwind: "$TransferData" },
                    {
                        $group: {
                            _id: "$TransferData.product",
                            pre: bucketSum("$TransferOutDate", toDouble("$TransferData.totalBox"), preFrom, preTo),
                            open: bucketSum("$TransferOutDate", toDouble("$TransferData.totalBox"), openFrom, openTo),
                            period: bucketSum("$TransferOutDate", toDouble("$TransferData.totalBox"), periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Transfer In — preFy uses Received; open/period use non-false (matches GetDataByDate)
            InventoryTransferInModal.aggregate(
                [
                    {
                        $match: {
                            TransferInDate: { $gte: preFrom, $lte: rangeEnd },
                            ...storeMatch(storeIds, "StoreTo"),
                        },
                    },
                    { $unwind: "$TransferData" },
                    {
                        $group: {
                            _id: "$TransferData.product",
                            pre: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $gte: ["$TransferInDate", preFrom] },
                                                { $lte: ["$TransferInDate", preTo] },
                                                { $eq: ["$PostStatus", "Received"] },
                                            ],
                                        },
                                        toDouble("$TransferData.totalBox"),
                                        0,
                                    ],
                                },
                            },
                            open: transferInOpenOk
                                ? {
                                      $sum: {
                                          $cond: [
                                              {
                                                  $and: [
                                                      { $gte: ["$TransferInDate", openFrom] },
                                                      { $lte: ["$TransferInDate", openTo] },
                                                      { $ne: ["$PostStatus", false] },
                                                      { $ne: ["$PostStatus", "false"] },
                                                      { $ne: ["$PostStatus", "False"] },
                                                  ],
                                              },
                                              toDouble("$TransferData.totalBox"),
                                              0,
                                          ],
                                      },
                                  }
                                : { $sum: 0 },
                            period: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $gte: ["$TransferInDate", periodFrom] },
                                                { $lte: ["$TransferInDate", periodTo] },
                                                { $ne: ["$PostStatus", false] },
                                                { $ne: ["$PostStatus", "false"] },
                                                { $ne: ["$PostStatus", "False"] },
                                            ],
                                        },
                                        toDouble("$TransferData.totalBox"),
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Stock replacement period/open — productFrom / totalBoxesFrom
            StockReplacementModal.aggregate(
                [
                    {
                        $match: {
                            ReplacementDate: { $gte: openFrom, $lte: rangeEnd },
                            ...storeMatch(storeIds),
                            ...(postOnly ? { PostStatus: true } : {}),
                            ...(unpostOnly ? { PostStatus: false } : {}),
                        },
                    },
                    { $unwind: "$ReplacementData" },
                    {
                        $group: {
                            _id: "$ReplacementData.productFrom",
                            open: bucketSum("$ReplacementDate", toDouble("$ReplacementData.totalBoxesFrom"), openFrom, openTo),
                            period: bucketSum("$ReplacementDate", toDouble("$ReplacementData.totalBoxesFrom"), periodFrom, periodTo),
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Stock replacement preFy — productFrom / totalBoxesTo (legacy field)
            StockReplacementModal.aggregate(
                [
                    {
                        $match: {
                            ReplacementDate: { $gte: preFrom, $lte: preTo || preFrom },
                            ...storeMatch(storeIds),
                            ...(postOnly ? { PostStatus: true } : {}),
                            ...(unpostOnly ? { PostStatus: false } : {}),
                        },
                    },
                    { $unwind: "$ReplacementData" },
                    {
                        $group: {
                            _id: "$ReplacementData.productFrom",
                            pre: {
                                $sum: toDouble("$ReplacementData.totalBoxesTo"),
                            },
                        },
                    },
                ],
                AGG_OPTS
            ),

            // Adjustments: period columns = selected dates only; open kept for remaining
            StockAdjustmentModal.aggregate(
                [
                    {
                        $match: {
                            PostStatus: true,
                            ...storeMatch(storeIds),
                        },
                    },
                    {
                        $addFields: {
                            _adjDate: ymd("$AdjustmentDate"),
                        },
                    },
                    {
                        $match: {
                            _adjDate: { $gte: fyStart, $lte: rangeEnd },
                        },
                    },
                    { $unwind: "$AdjustmentData" },
                    {
                        $group: {
                            _id: "$AdjustmentData.productName",
                            openLess: bucketSum("$_adjDate", toDouble("$AdjustmentData.lessBox"), openFrom, openTo),
                            openAdd: bucketSum("$_adjDate", toDouble("$AdjustmentData.addBox"), openFrom, openTo),
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
        ]);

        const productMap = new Map(products.map((p) => [String(p._id), p]));
        const byProduct = new Map();

        // Year opening qty
        for (const line of openingLines) {
            const productId = line?.product;
            if (productId == null) continue;
            if (storeIds.length && line.Store && !storeIds.includes(String(line.Store))) continue;
            const key = String(productId);
            if (!byProduct.has(key)) {
                byProduct.set(key, { productId, pre: {}, open: {}, period: {}, adj: {}, openingQty: 0 });
            }
            byProduct.get(key).openingQty = (byProduct.get(key).openingQty || 0) + q(line.opneingQty);
        }

        const ensure = (key, productId) => {
            if (!byProduct.has(key)) {
                byProduct.set(key, { productId, pre: {}, open: {}, period: {}, adj: {}, openingQty: 0 });
            }
            return byProduct.get(key);
        };

        const applyBuckets = (rows, names) => {
            for (const row of rows) {
                if (row._id == null || row._id === "") continue;
                const key = String(row._id);
                const b = ensure(key, row._id);
                if (row.pre) b.pre[names.pre] = (b.pre[names.pre] || 0) + q(row.pre);
                if (row.open) b.open[names.open] = (b.open[names.open] || 0) + q(row.open);
                if (row.period) b.period[names.period] = (b.period[names.period] || 0) + q(row.period);
            }
        };

        applyBuckets(purchaseAgg, { pre: "purchase", open: "purchase", period: "purchase" });
        applyBuckets(rcAgg, { pre: "rc", open: "rc", period: "rc" });
        applyBuckets(saleAgg, { pre: "sale", open: "sale", period: "sale" });
        applyBuckets(dcAgg, { pre: "dc", open: "dc", period: "dc" });
        applyBuckets(salesReturnAgg, { pre: "sret", open: "sret", period: "sret" });
        applyBuckets(purchaseReturnAgg, { pre: "pret", open: "pret", period: "pret" });
        applyBuckets(transferOutAgg, { pre: "tout", open: "tout", period: "tout" });
        applyBuckets(transferInAgg, { pre: "tin", open: "tin", period: "tin" });
        applyBuckets(replacementFromAgg, { pre: "repl", open: "repl", period: "repl" });

        for (const row of replacementBeforeAgg) {
            if (row._id == null) continue;
            const key = String(row._id);
            const b = ensure(key, row._id);
            b.pre.replTo = (b.pre.replTo || 0) + q(row.pre);
        }

        for (const row of adjustmentAgg) {
            if (row._id == null) continue;
            const key = String(row._id);
            const b = ensure(key, row._id);
            // Display columns use period only (e.g. November filter ≠ earlier months)
            b.adj.less = (b.adj.less || 0) + q(row.periodLess);
            b.adj.add = (b.adj.add || 0) + q(row.periodAdd);
            // Remaining still needs FY-start → end adjustments (open window + period)
            b.adj.openLess = (b.adj.openLess || 0) + q(row.openLess);
            b.adj.openAdd = (b.adj.openAdd || 0) + q(row.openAdd);
        }

        const rows = [];
        for (const [key, b] of byProduct) {
            const product = productMap.get(key);
            const pcs = product?.PcsinBox || 1;
            const boxInCarton = pack(product?.BoxinCarton);

            const prePurchase = b.pre.purchase || 0;
            const preRc = b.pre.rc || 0;
            const preTin = b.pre.tin || 0;
            const preSret = b.pre.sret || 0;
            const prePret = b.pre.pret || 0;
            const preTout = b.pre.tout || 0;
            const preReplTo = b.pre.replTo || 0;
            const preDc = b.pre.dc || 0;
            const preSale = b.pre.sale || 0;

            const openPurchase = b.open.purchase || 0;
            const openRc = b.open.rc || 0;
            const openTin = b.open.tin || 0;
            const openSret = b.open.sret || 0;
            const openPret = b.open.pret || 0;
            const openTout = b.open.tout || 0;
            const openRepl = b.open.repl || 0;
            const openDc = b.open.dc || 0;
            const openSale = b.open.sale || 0;

            const purchasedBoxes = b.period.purchase || 0;
            const totalRCBox = b.period.rc || 0;
            const totalInBoxes = b.period.tin || 0;
            const totalReturnBox = b.period.sret || 0;
            const totalPurchaseReturnBox = b.period.pret || 0;
            const totalOutBoxes = b.period.tout || 0;
            const totalBoxesReplacementFrom = b.period.repl || 0;
            const totalDCBox = b.period.dc || 0;
            const soldBoxes = b.period.sale || 0;
            // Columns: only adjustments inside selected start→end (not prior months)
            const totalAdjustmentLessBox = b.adj.less || 0;
            const totalAdjustmentAddBox = b.adj.add || 0;
            // Opening window adj (FY → day before start) — needed for Opening = prev Remaining
            const openAdjLess = b.adj.openLess || 0;
            const openAdjAdd = b.adj.openAdd || 0;
            const adjLessForRemaining = openAdjLess + totalAdjustmentLessBox;
            const adjAddForRemaining = openAdjAdd + totalAdjustmentAddBox;
            const openingQty = b.openingQty || 0;

            const openingNet =
                openPurchase +
                openRc +
                openTin +
                openSret -
                openPret -
                openTout -
                openRepl -
                openDc -
                openSale -
                openAdjLess +
                openAdjAdd;

            const openingBoxes =
                openingQty +
                prePurchase +
                preRc +
                preTin +
                preSret -
                prePret -
                preTout -
                preReplTo -
                preDc -
                preSale +
                openingNet;

            // Remaining: FY→end movements + open+period adjustments (prior months stay in remaining, not columns)
            const remainingBoxes =
                openingQty +
                prePurchase +
                preRc +
                preTin +
                preSret -
                prePret -
                preTout -
                preReplTo -
                preDc -
                preSale +
                (openPurchase + purchasedBoxes) +
                (openRc + totalRCBox) +
                (openTin + totalInBoxes) +
                (openSret + totalReturnBox) -
                (openPret + totalPurchaseReturnBox) -
                (openTout + totalOutBoxes) -
                (openRepl + totalBoxesReplacementFrom) -
                (openDc + totalDCBox) -
                (openSale + soldBoxes) -
                adjLessForRemaining +
                adjAddForRemaining;

            const tpSale = Number(product?.TPSale || 0);
            const retailPrice = Number(product?.RetailPrice || 0);
            const remainingBoxesValue = Number.isFinite(tpSale * remainingBoxes)
                ? Number((tpSale * remainingBoxes).toFixed(2))
                : 0;
            const remainingBoxesValueWithGst = Number.isFinite(
                ((retailPrice / 100) * 18) * remainingBoxes + tpSale * remainingBoxes
            )
                ? Number(
                      (((retailPrice / 100) * 18) * remainingBoxes + tpSale * remainingBoxes).toFixed(2)
                  )
                : 0;

            const productName = product?.ProductName || "Unknown";
            const row = {
                id: b.productId,
                productId: b.productId,
                productName,
                TotalopenigQty: openingBoxes,
                TotalopenigCarton: openingBoxes / boxInCarton,
                TotalopenigUnit: openingBoxes * pcs,
                purchasedBoxes,
                soldBoxes,
                totalRCBox,
                totalDCBox,
                totalInBoxes,
                totalOutBoxes,
                totalReturnBox,
                totalPurchaseReturnBox,
                totalBoxesReplacementFrom,
                totalAdjustmentLessBox,
                totalAdjustmentLessCarton: totalAdjustmentLessBox / boxInCarton || 0,
                totalAdjustmentLessUnit: pcs * totalAdjustmentLessBox,
                totalAdjustmentAddBox,
                totalAdjustmentAddCarton: totalAdjustmentAddBox / boxInCarton || 0,
                totalAdjustmentAddUnit: pcs * totalAdjustmentAddBox,
                remainingBoxes,
                remainingUnits: remainingBoxes * pcs,
                remainingCartons: remainingBoxes / boxInCarton,
                boxInCarton: product?.BoxinCarton,
                PcsinBox: product?.PcsinBox,
                SkuCode: product?.salesFlowRef,
                purchasedUnits: pcs * purchasedBoxes,
                RCCarton: totalRCBox / boxInCarton || 0,
                RCUnits: pcs * totalRCBox,
                purchasedCarton: purchasedBoxes / boxInCarton || 0,
                soldUnits: pcs * soldBoxes,
                soldCarton: soldBoxes / boxInCarton || 0,
                totalRCUnit: pcs * totalRCBox,
                totalRCCarton: totalRCBox / boxInCarton || 0,
                totalDCUnits: pcs * totalDCBox,
                totalDCCarton: totalDCBox / boxInCarton || 0,
                totalReturnUnit: totalReturnBox * pcs || 0,
                totalReturnCarton: totalReturnBox / boxInCarton || 0,
                totalOutUnit: totalOutBoxes * pcs || 0,
                totalOutCarton: totalOutBoxes / boxInCarton || 0,
                totalInUnit: totalInBoxes * pcs || 0,
                totalInCarton: totalInBoxes / boxInCarton || 0,
                totalUnitReplacementFrom: (totalBoxesReplacementFrom || 0) * pcs,
                totalCartonReplacementFrom: totalBoxesReplacementFrom / boxInCarton || 0,
                totalPurchaseReturnUnit: totalPurchaseReturnBox * pcs || 0,
                totalPurchaseReturnCarton: totalPurchaseReturnBox / boxInCarton || 0,
                remainingBoxesValue,
                remainingBoxesValueWithGst,
            };

            const hasMovement = [
                row.TotalopenigQty,
                row.purchasedBoxes,
                row.soldBoxes,
                row.totalRCBox,
                row.totalDCBox,
                row.totalInBoxes,
                row.totalOutBoxes,
                row.totalReturnBox,
                row.totalPurchaseReturnBox,
                row.totalBoxesReplacementFrom,
                row.totalAdjustmentLessBox,
                row.totalAdjustmentAddBox,
                row.remainingBoxes,
            ].some((n) => q(n) !== 0);

            if (productName !== "Unknown" || hasMovement) {
                rows.push(row);
            }
        }

        rows.sort((a, b) => String(a.productName).localeCompare(String(b.productName)));

        res.json({
            rows,
            meta: {
                fyStart,
                dayBeforeFy,
                dayBeforeStart,
                hasOpeningWindow,
                ms: Date.now() - t0,
                products: rows.length,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};