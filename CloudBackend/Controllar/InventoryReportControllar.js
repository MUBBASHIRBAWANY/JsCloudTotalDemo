import OpeningInventoryModal from "../Modal/OpeningInventoryModal.js";
import PurchaseInvoiceModal from "../Modal/PurchaseInvoiceModal.js";
import SalesInvoiceModal from "../Modal/SalesInvoiceModal.js";
import InventoryTransferOutModal from "../Modal/InventoryTransferOutModal.js";
import InventoryTransferInModal from "../Modal/TransferInModal.js";
import SalesReturnModal from "../Modal/SalesReturnModal.js"
import PurchaseReturnModal from "../Modal/PurchaseReturnModal.js";
import StockReplacementModal from "../Modal/StockReplacementModal.js";
import OrderDcModal from "../Modal/SaleOrderDcModal.js";
import RcModal from "../Modal/RcModal.js";
import StockAdjustmentModal from "../Modal/StockAdjustmentModal.js";

// The report popups only consume per-product aggregates of these rows (they
// key by product/productFrom and sum the numeric fields), so collapsing the
// per-invoice/per-line rows here shrinks the response from hundreds of MB to a
// few MB without changing any number the frontend computes. The group key keeps
// product, type, date and the store/location fields so client-side store
// filtering (StoreTo/StoreFrom) and date-ordered processing still work.
const collapseRows = (rows) => {
    const map = new Map();
    for (const row of rows) {
        const key = [
            row?.product || row?.productFrom || row?.productTo || "",
            row?.type || "",
            row?.date || "",
            row?.Store || "",
            row?.StoreTo || "",
            row?.StoreFrom || "",
            row?.Condition || "",
            row?.PostStatus ?? "",
        ].join("|");
        let acc = map.get(key);
        if (!acc) {
            acc = { ...row };
            map.set(key, acc);
            continue;
        }
        for (const [k, v] of Object.entries(row)) {
            if (typeof v === "number" && !["_id", "id", "Rate"].includes(k)) {
                acc[k] = (acc[k] || 0) + v;
            }
        }
    }
    return [...map.values()];
};


export const getSalesInvoiceByDate = async (req, res) => {
    try {
        const { startDate, endDate, status, product, Location, Store, damage } = req.query;
console.log(startDate, endDate);

        const StoreArray = [...(Store?.split(",") || [])];
        const firstOpneing = await OpeningInventoryModal.find({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate }
        });



        const nextDate = firstOpneing[0]?.DateStart
        const previosdate = new Date(startDate);
        previosdate.setDate(previosdate.getDate() - 1);
        const before = previosdate.toISOString().split('T')[0];

        const mergedDataPurchaseBefore = await PurchaseInvoiceModal.aggregate([
            {
                $match: {
                    PurchaseInvoiceDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$PurchaseData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseData.product",
                        PostStatus: "$PostStatus",
                        Store: "$Store",
                        Location: "$Location",
                        PurchaseInvoiceDate: "$PurchaseInvoiceDate",
                    },
                    totalPurchaseBoxBefore: {
                        $sum: { $ifNull: ["$PurchaseData.totalBox", 0] }
                    },
                    totalPurchaseValueExclGst: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.GrossAmount",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                }
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalPurchaseBoxBefore: 1,
                    date: "$_id.PurchaseInvoiceDate",
                    totalPurchaseValueExclGst: 1,
                    type: "PurchaseBefore",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ], { allowDiskUse: true })

        const mergedDataPurchase = await PurchaseInvoiceModal.aggregate([
            {
                $match: {
                    PurchaseInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$PurchaseData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseData.product",
                        PostStatus: "$PostStatus",
                        PurchaseInvoiceDate: "$PurchaseInvoiceDate",
                        invoice: "$PurchaseInvoice",
                        SalesFlowRef: `$SalesFlowRef`,
                        Store: "$Store",
                        Location: "$Location",
                    },
                    totalPurchaseBox: {
                        $sum: { $ifNull: ["$PurchaseData.totalBox", 0] }
                    },
                    totalPurchaseUnits: { $sum: "$PurchaseData.unit" },
                    totalPurchaseValueExclGst: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.GrossAmount",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    totalPurchaseGst: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.Gst",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    totalPurchaseNetAmount: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.netAmunt",  // Fix the typo in your schema
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalPurchaseBox: 1,
                    invoice: `$_id.invoice`,
                    totalPurchaseGst: 1,
                    date: "$_id.PurchaseInvoiceDate",
                    totalPurchaseUnits: 1,
                    totalPurchaseValueExclGst: 1,
                    type: "Purchase",
                    SalesFlowRef: `$_id.SalesFlowRef`,
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ], { allowDiskUse: true })

        const mergedDataRCBefore = await RcModal.aggregate([
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: [{ $toDate: "$RcDate" }, new Date(nextDate)] },
                            { $lte: [{ $toDate: "$RcDate" }, new Date(before)] }
                        ]
                    },
                    PostStatus: "true"
                }
            },
            { $unwind: "$RcData" },
            {
                $group: {
                    _id: {
                        product: "$RcData.product",
                        Store: "$Store",
                        Location: "$Location",
                        RcDate : "$RcDate",
                    },
                    totalRCBoxBefore: { $sum: "$RcData.totalBox" },
                    totalRCValueExclGst: {
                        $sum: { $toDouble: "$RcData.GrossAmount" }
                    }
                }
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalRCBoxBefore: 1,
                    date : "$_id.RcDate",
                    totalRCValueExclGst: 1,
                    type: "RC"
                }
            }
        ])


        const mergedDataRC = await RcModal.aggregate([
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: [{ $toDate: "$RcDate" }, new Date(startDate)] },
                            { $lte: [{ $toDate: "$RcDate" }, new Date(endDate)] }
                        ]
                    },
                    PostStatus: { $in: ["true", true] }
                }
            },
            { $unwind: "$RcData" },
            {
                $group: {
                    _id: {
                        product: "$RcData.product",
                        Store: "$Store",
                        RcDate : "$RcDate",
                        Location: "$Location"

                    },
                    totalRCBox: { $sum: "$RcData.totalBox" },
                    totalRCValueExclGst: {
                        $sum: { $toDouble: "$RcData.GrossAmount" }
                    }
                }
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    Store: "$_id.Store",
                    date : "$_id.RcDate",
                    Location: "$_id.Location",
                    totalRCBox: 1,
                    totalRCValueExclGst: 1,
                    type: "RC"
                }
            }
        ])
        //totalRCBoxBefore
        console.log(mergedDataRCBefore, "Rcdata")

        const TotalSalesDataBefore = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$SalesData" },

            {
                $group: {
                    _id: {
                        product: "$SalesData.product",
                        PostStatus: "$PostStatus",
                        Store: "$Store",
                        Location: "$Location",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                    },
                    totalSaleBoxBefore: { $sum: "$SalesData.totalBox" },
                    TotalValueExclGstBefore: { $sum: "$SalesData.TotalValueExclGst" },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalSaleBoxBefore: 1,
                    date: "$_id.SalesInvoiceDate",
                    TotalValueExclGstBefore: 1,
                    type: "IssueBefore",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ], { allowDiskUse: true });
        const mergedDataSale = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$SalesData" },
            {
                $group: {
                    _id: {
                        product: "$SalesData.product",
                        PostStatus: "$PostStatus",
                        Client: "$Client",
                        invoice: "$InvoiceNo",
                        SalesFlowRef: "$SalesFlowRef",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                        Store: "$Store",
                        Location: "$Location",
                        totalSaleBox: "$SalesData.totalBox",
                        totalSaleUnits: "$SalesData.unit",
                        totalGrossSaleAmntinclGst: "$SalesData.GrossAmntinclGst",
                        totalValueExclSaleGst: "$SalesData.TotalValueExclGst",
                        totalSaleGst: "$SalesData.Gst",
                        totalNetSaleAmount: "$SalesData.netAmunt",

                    },

                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    OrderBooker: "$_id.OrderBooker",
                    Client: "$_id.Client",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.invoice",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalSaleBox: "$_id.totalSaleBox",
                    totalSaleUnits: "$_id.totalSaleUnits",
                    totalGrossSaleAmntinclGst: "$_id.totalGrossSaleAmntinclGst",
                    totalValueExclSaleGst: "$_id.totalValueExclSaleGst",
                    totalSaleGst: "$_id.totalSaleGst",
                    date: "$_id.SalesInvoiceDate",
                    totalNetSaleAmount: 1,
                    type: "Issue",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ])


        const TotalDcDataBefore = await OrderDcModal.aggregate(
            [
                {
                    $match: {
                        DCDate: {
                            $gte: nextDate,
                            $lte: before,
                        },
                    },
                },
                { $unwind: "$DCData" },

                {
                    $group: {
                        _id: {
                            id: "$_id",
                            product: "$DCData.product",
                            DCCode: "$DCCode",
                            date: "$DCDate",
                            Store: "$Store",
                            Location: "$Location",
                            totalDCBoxBefore: "$DCData.DeliveredBox",
                            TotalValueExclGstBefore: "$DCData.TotalValueExclGst",
                        },
                        PostStatus: { $first: "$PostStatus" },
                    },
                },

                {
                    $project: {
                        id: "$_id._id",
                        product: "$_id.product",

                        PostStatus: {
                            $cond: {
                                if: { $eq: ["$PostStatus", "False"] },
                                then: false,
                                else: true,
                            },
                        },

                        totalDCBoxBefore: "$_id.totalDCBoxBefore",
                        date: "$_id.date",
                        TotalValueExclGstBefore: 1,
                        type: "IssueBefore",
                        Store: "$_id.Store",
                        Location: "$_id.Location",
                    },
                },
            ],
            { allowDiskUse: true }
        );


        const mergedDCData = await OrderDcModal.aggregate([
            {
                $match: {
                    DCDate: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: "$DCData" },
            {
                $group: {
                    _id: {
                        id: "$_id",
                        product: "$DCData.product",
                        DCCode: "$DCCode",
                        DCDate: "$DCDate",
                        Store: "$Store",
                        Location: "$Location",
                        totalDCBox: "$DCData.DeliveredBox", // ✅ correct
                    },
                    PostStatus: { $first: "$PostStatus" }
                }
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    DCDate: "$_id.DCDate",
                    DCCode: "$_id.DCCode",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalDCBox: "$_id.totalDCBox",
                    type: "Issue",
                    PostStatus: {
                        $cond: {
                            if: { $eq: ["$PostStatus", "False"] },
                            then: false,
                            else: true
                        }
                    }
                }
            }
        ], { allowDiskUse: true });
        // ✅ put here!


        const TotalSalesReturnDataBefore = await SalesReturnModal.aggregate([
            {
                $match: {
                    SalesInvoiceReturnDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$SalesReturnData" },
            {
                $group: {
                    _id: {
                        product: "$SalesReturnData.product",
                        PostStatus: "$PostStatus",
                        SalesReturnNumber: "$SalesReturnNumber",
                        SalesInvoiceReturnDate: "$SalesInvoiceReturnDate",
                        Store: "$Store",
                        Location: "$Location",
                        Condition: "$Condition"
                    },
                    totalReturnBoxBefore: { $sum: "$SalesReturnData.totalBox" },
                    TotalSRValueExclGstBefore: { $sum: "$SalesReturnData.TotalValueExclGst" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalReturnBoxBefore: 1,
                    date: "$_id.SalesInvoiceReturnDate",
                    TotalSRValueExclGstBefore: 1,
                    type: "ReturnBefore",
                    Store: "$_id.Store",
                    Condition: "$_id.Condition",
                    Location: "$_id.Location",
                },
            },
        ], { allowDiskUse: true });

        const mergedDataReturn = await SalesReturnModal.aggregate([
            {
                $match: {
                    SalesInvoiceReturnDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$SalesReturnData" },
            {
                $group: {
                    _id: {
                        product: "$SalesReturnData.product",
                        OrderBooker: "$OrderBooker",
                        PostStatus: "$PostStatus",
                        SalesReturnNumber: "$SalesReturnNumber",
                        SalesFlowRef: "$SalesFlowRef",
                        SalesInvoiceReturnDate: "$SalesInvoiceReturnDate",
                        Store: "$Store",
                        Condition: "$Condition",
                        Location: "$Location",
                    },
                    totalReturnBox: { $sum: "$SalesReturnData.totalBox" },
                    totalReturnUnits: { $sum: "$SalesReturnData.unit" },
                    totalGrossReturnAmntinclGst: { $sum: "$SalesReturnData.GrossAmntinclGst" },
                    totalValueExclReturnGst: { $sum: "$SalesReturnData.TotalValueExclGst" },
                    totalReturnGst: { $sum: "$SalesReturnData.Gst" },
                    totalNetReturnAmount: { $sum: "$SalesReturnData.netAmunt" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    OrderBooker: "$_id.OrderBooker",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.SalesReturnNumber",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalReturnBox: 1,
                    totalReturnUnits: 1,
                    totalGrossReturnAmntinclGst: 1,
                    totalValueExclReturnGst: 1,
                    totalReturnGst: 1,
                    date: "$_id.SalesInvoiceReturnDate",
                    totalNetReturnAmount: 1,
                    type: "Return",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Condition: "$_id.Condition"
                },
            },
        ], { allowDiskUse: true });

        const mergedInventoryOutData = await InventoryTransferOutModal.aggregate([
            {
                $match: {
                    TransferOutDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferOutDate: "$TransferOutDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreFrom: "$StoreFrom",
                        StoreTo: "$StoreTo",
                        GrossAmount: "$TransferData.GrossAmount",
                        totalOutBoxes: "$TransferData.totalBox"
                    },

                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalOutBoxes: "$_id.totalOutBoxes",
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TrsferOutGrossAmount: `$_id.GrossAmount`,
                    date: "$_id.TransferOutDate",
                    type: "TransferOut",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });
        const mergedInventoryOutDataBefore = await InventoryTransferOutModal.aggregate([
            {
                $match: {
                    TransferOutDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferOutDate: "$TransferOutDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreFrom: "$StoreFrom",
                        StoreTo: "$StoreTo",
                        GrossAmount: "$TransferData.GrossAmount",

                    },
                    TransferOutBoxesBefore: {
                        $sum: { $toDouble: "$TransferData.totalBox" }
                    }
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    TransferOutBoxesBefore: 1,
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TransferOutAmountBefore: `$_id.GrossAmount`,
                    date: "$_id.TransferOutDate",
                    type: "TransferOutBefore",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });
        const mergedInventoryInData = await InventoryTransferInModal.aggregate([
            {
                $match: {
                    TransferInDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferInDate: "$TransferInDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreTo: "$StoreTo",
                        StoreFrom: "$StoreFrom",
                        GrossAmount: "$TransferData.GrossAmount",

                    },
                    totalInBoxes: { $sum: "$TransferData.totalBox" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalInBoxes: 1,
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TransferInAmount: `$_id.GrossAmount`,
                    date: "$_id.TransferInDate",
                    type: "TransferIn",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });

        const mergedInventoryinDataBefore = await InventoryTransferInModal.aggregate([
            {
                $match: {
                    TransferInDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferInDate: "$TransferInDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreFrom: "$StoreFrom",
                        StoreTo: "$StoreTo",
                        GrossAmount: "$TransferData.GrossAmount",
                    },
                    TransferInBoxesBefore: { $sum: "$TransferData.totalBox" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    TransferInBoxesBefore: 1,
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TransferInAmountBefore: `$_id.GrossAmount`,
                    date: "$_id.TransferinDate",
                    type: "TransferinBefore",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });
        const mergedPurchaseReturnData = await PurchaseReturnModal.aggregate([
            {
                $match: {
                    PurchaseReturnDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$PurchaseReturnData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseReturnData.product",
                        Vendor: "$Vendor",
                        PostStatus: "$PostStatus",
                        PurchaseReturn: "$PurchaseReturn",
                        SalesFlowRef: "$SalesFlowRef",
                        PurchaseReturnDate: "$PurchaseReturnDate",
                        Store: "$Store",
                        Location: "$Location",
                        Condition: "$PurchaseReturnData.Condition"

                    },
                    totalPurchaseReturnBox: { $sum: "$PurchaseReturnData.box" },
                    totalPurchaseReturnUnits: { $sum: "$PurchaseReturnData.unit" },
                    totalGrossReturnAmntinclGst: { $sum: "$PurchaseReturnData.netAmunt" },
                    totalValueExclReturnGst: { $sum: "$PurchaseReturnData.TotalValueExclGst" },
                    totalPurchaseReturnGst: { $sum: "$PurchaseReturnData.Gst" },
                    totalNetReturnAmount: { $sum: "$PurchaseReturnData.netAmunt" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    Vendor: "$_id.Vendor",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.PurchaseReturn",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalPurchaseReturnBox: 1,
                    totalPurchaseReturnUnits: 1,
                    totalGrossReturnAmntinclGst: 1,
                    totalValueExclReturnGst: 1,
                    totalPurchaseReturnGst: 1,
                    date: "$_id.PurchaseReturnDate",
                    totalNetReturnAmount: 1,
                    type: "PurchaseReturn",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Condition: "$_id.Condition",

                },
            },
        ], { allowDiskUse: true });
        const TotalPurchaseReturnBefore = await PurchaseReturnModal.aggregate([
            {
                $match: {
                    PurchaseReturnDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$PurchaseReturnData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseReturnData.product",
                        PostStatus: "$PostStatus",
                        invoice: "$PurchaseReturn",
                        PurchaseReturnDate: "$PurchaseReturnDate",
                        Store: "$Store",
                        Location: "$Location",
                        Condition: "$PurchaseReturnData.Condition",

                    },
                    totalPurchaseReturnBoxBefore: { $sum: "$PurchaseReturnData.box" },

                    TotalValueExclGstBefore: { $sum: "$PurchaseReturnData.TotalValueExclGst" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalPurchaseReturnBoxBefore: 1,
                    date: "$_id.PurchaseReturnDate",
                    TotalValueExclGstBefore: 1,
                    type: "PurchaseReturnBefore",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Condition: "$_id.Condition",
                },
            },
        ], { allowDiskUse: true });
        const mergedStockReplacementData = await StockReplacementModal.aggregate([
            {
                $match: {
                    ReplacementDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$ReplacementData" },
            {
                $group: {
                    _id: {
                        productFrom: "$ReplacementData.productFrom",
                        productTo: "$ReplacementData.productTo",
                        Customer: "$Customer",
                        PostStatus: "$PostStatus",
                        SalesFlowRef: "$SalesFlowRef",
                        ReplacementDate: "$ReplacementDate",
                        Store: "$Store",
                        Location: "$Location",
                    },
                    totalBoxesReplacementFrom: { $sum: { $toDouble: "$ReplacementData.totalBoxesFrom" } },
                    totalBoxesReplacementTo: { $sum: { $toDouble: "$ReplacementData.totalBoxesTo" } },
                    totalUnitsReplacementFrom: { $sum: "$ReplacementData.unitFrom" },
                    totalUnitsTo: { $sum: "$ReplacementData.unitTo" },
                    totalValueReplacementFrom: { $sum: "$ReplacementData.fromValue" },
                    totalValueReplacementTo: { $sum: "$ReplacementData.ToValue" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    productFrom: "$_id.productFrom",
                    productTo: "$_id.productTo",
                    Customer: "$_id.Customer",
                    PostStatus: "$_id.PostStatus",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    date: "$_id.ReplacementDate",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalBoxesReplacementFrom: 1,
                    totalBoxesReplacementTo: 1,
                    totalUnitsFrom: 1,
                    totalUnitsTo: 1,
                    totalValueFrom: 1,
                    totalValueTo: 1,
                    type: "StockReplacement"
                },
            },
        ], { allowDiskUse: true });
        const TotalStockReplacementBefore = await StockReplacementModal.aggregate([
            {
                $match: {
                    ReplacementDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$ReplacementData" },
            {
                $group: {
                    _id: {
                        productFrom: "$ReplacementData.productFrom",
                        PostStatus: "$PostStatus",
                        ReplacementDate: "$ReplacementDate",
                        Store: "$Store",
                        Location: "$Location",
                        type: "StockReplacementBefore"
                    },
                    totalBoxesToReplacementBefore: { $sum: { $toDouble: "$ReplacementData.totalBoxesTo" } },
                    totalValueToReplacementBefore: { $sum: "$ReplacementData.ToValue" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    productFrom: "$_id.productFrom",
                    PostStatus: "$_id.PostStatus",
                    date: "$_id.ReplacementDate",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalBoxesToReplacementBefore: 1,
                    totalValueToReplacementBefore: 1,
                    type: "StockReplacementBefore"
                },
            },
        ], { allowDiskUse: true });

        // Stock Adjustment - Current Period
        const mergedStockAdjustmentData = await StockAdjustmentModal.aggregate([
            {
                $match: {
                    AdjustmentDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    PostStatus: true
                },
            },
            { $unwind: "$AdjustmentData" },
            {
                $group: {
                    _id: {
                        product: "$AdjustmentData.productName",
                        Store: "$Store",
                        Location: "$Location",
                        AdjustmentDate: "$AdjustmentDate",
                    },
                    totalAdjustmentLessBox: { $sum: { $toDouble: "$AdjustmentData.lessBox" } },
                    totalAdjustmentAddBox: { $sum: { $toDouble: "$AdjustmentData.addBox" } },
                    totalAdjustmentLessAmount: { $sum: { $toDouble: "$AdjustmentData.lessAmount" } },
                    totalAdjustmentAddAmount: { $sum: { $toDouble: "$AdjustmentData.addAmount" } },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    date: "$_id.AdjustmentDate",
                    totalAdjustmentLessBox: 1,
                    totalAdjustmentAddBox: 1,
                    totalAdjustmentLessAmount: 1,
                    totalAdjustmentAddAmount: 1,
                    type: "StockAdjustment"
                },
            },
        ], { allowDiskUse: true });

        // Stock Adjustment - Before Period
        const mergedStockAdjustmentBefore = await StockAdjustmentModal.aggregate([
            {
                $match: {
                    AdjustmentDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                    PostStatus: true
                },
            },
            { $unwind: "$AdjustmentData" },
            {
                $group: {
                    _id: {
                        product: "$AdjustmentData.productName",
                        Store: "$Store",
                        Location: "$Location",
                        AdjustmentDate: "$AdjustmentDate",
                    },
                    totalAdjustmentLessBoxBefore: { $sum: { $toDouble: "$AdjustmentData.lessBox" } },
                    totalAdjustmentAddBoxBefore: { $sum: { $toDouble: "$AdjustmentData.addBox" } },
                    totalAdjustmentLessAmountBefore: { $sum: { $toDouble: "$AdjustmentData.lessAmount" } },
                    totalAdjustmentAddAmountBefore: { $sum: { $toDouble: "$AdjustmentData.addAmount" } },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    date: "$_id.AdjustmentDate",
                    totalAdjustmentLessBoxBefore: 1,
                    totalAdjustmentAddBoxBefore: 1,
                    totalAdjustmentLessAmountBefore: 1,
                    totalAdjustmentAddAmountBefore: 1,
                    type: "StockAdjustmentBefore"
                },
            },
        ], { allowDiskUse: true });

        const YearOpening = firstOpneing[0]?.InvoetoryData


        if (status == "Post") {
            const truemergedStockReplacementData = mergedStockReplacementData.filter((item) => item.PostStatus == true)
            const trueTotalStockReplacementBefore = TotalStockReplacementBefore.filter((item) => item.PostStatus == true)
            const truemergedDataPurchase = mergedDataPurchase
            const truemergedDataSale = mergedDataSale.filter((item) => item.PostStatus == true)
            const truemergedDCData = mergedDCData.filter((item) => item.PostStatus == true)
            const turemergedPurchaseReturnData = damage == "Fresh" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == true && item.Condition == "Fresh") : damage == "Damage" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == true && item.Condition == "Damage") : mergedPurchaseReturnData.filter((item) => item.PostStatus == true)
            const trueTotalPurchaseReturnBefore = damage == "Fresh" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == true && item.Condition == "Fresh") : damage == "Damage" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == true && item.Condition == "Damage") : TotalPurchaseReturnBefore.filter((item) => item.PostStatus == true)
            const truemergedDataPurchaseBefore = mergedDataPurchaseBefore
            const trueTotalSalesDataBefore = TotalSalesDataBefore.filter((item) => item.PostStatus == true)
            const trueTotalDcDataBefore = TotalDcDataBefore.filter((item) => item.PostStatus == true)
            const truemergedInventoryOutData = mergedInventoryOutData.filter((item) => item.PostStatus !== false)
            const trurmergedInventoryOutDataBefore = mergedInventoryOutDataBefore.filter((item) => item.PostStatus !== false)
            const truemergedInventoryinDataBefore = mergedInventoryinDataBefore.filter((item) => item.PostStatus == "Received")
            const truemergedInventoryinData = mergedInventoryInData.filter((item) => item.PostStatus !== false)
            const truemergedDataReturn = damage == "Fresh" ? mergedDataReturn.filter((item) => item.PostStatus !== false && item.Condition !== "Damage") : damage == "Damage" ? mergedDataReturn.filter((item) => item.PostStatus !== false && item.Condition == "Damage") : mergedDataReturn.filter((item) => item.PostStatus !== false)
            const trueTotalSalesReturnDataBefore = damage == "Fresh" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == true && item.Condition !== "Damage") : damage == "Damage" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == true && item.Condition == "Damage") : TotalSalesReturnDataBefore.filter((item) => item.PostStatus == true)
            const truemarge = truemergedDataPurchase.concat(truemergedDataSale).concat(truemergedDataPurchaseBefore).concat(trueTotalSalesDataBefore).concat(YearOpening).concat(truemergedInventoryOutData).concat(trurmergedInventoryOutDataBefore).concat(truemergedInventoryinDataBefore).concat(truemergedInventoryinData).concat(trueTotalSalesReturnDataBefore).concat(truemergedDataReturn).concat(turemergedPurchaseReturnData).concat(trueTotalPurchaseReturnBefore).concat(truemergedStockReplacementData).concat(trueTotalStockReplacementBefore).concat(trueTotalDcDataBefore).concat(truemergedDCData).concat(mergedDataRC).concat(mergedDataRCBefore).concat(mergedStockAdjustmentData).concat(mergedStockAdjustmentBefore)
            console.log("send")
            if (damage == "Damage") {

                const Damagedata = truemarge.filter((item) => item.Condition === "Damage")
                res.json(collapseRows(Damagedata))
            }

            else if (damage == "Fresh") {
                if (product || Location || Store) {
                    const data = truemarge.filter((item) => {

                        const productMatch = product
                            ? item?.product == product
                            || item?.productTo === product ||
                            item?.productTo === product : true;
                        const locationMatch = Location
                            ? item?.LocationTo === Location ||
                            item?.LocationFrom === Location ||
                            item?.Location === Location
                            : true;

                        const storeMatch = !Store ||
                            StoreArray.includes(item?.StoreTo) ||
                            StoreArray.includes(item?.StoreFrom) ||
                            StoreArray.includes(item?.Store);
                        return productMatch && locationMatch && storeMatch;
                    });


                    res.json(collapseRows(data));
                }
                else {
                    res.json(collapseRows(truemarge))

                }
            }
            else {
                res.json(collapseRows(truemarge))
            }





        }

        else if (status == "UnPost") {

            const falsemergedStockReplacementData = mergedStockReplacementData.filter((item) => item.PostStatus == false)
            const falseTotalStockReplacementBefore = TotalStockReplacementBefore.filter((item) => item.PostStatus == false)
            const falsemergedDataPurchase = mergedDataPurchase.filter((item) => item.PostStatus == false)
            const falsemergedDataSale = mergedDataSale.filter((item) => item.PostStatus == false)
            const falsemergedDCData = mergedDCData.filter((item) => item.PostStatus == false)
            const falsemergedPurchaseReturnData = damage == "Fresh" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == false && item.Condition == "Fresh") : damage == "Damage" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == false && item.Condition == "Damage") : mergedPurchaseReturnData.filter((item) => item.PostStatus == false)
            const falseTotalPurchaseReturnBefore = damage == "Fresh" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == false && item.Condition == "Fresh") : damage == "Damage" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == false && item.Condition == "Damage") : TotalPurchaseReturnBefore.filter((item) => item.PostStatus == false)
            const falsemergedDataPurchaseBefore = mergedDataPurchaseBefore.filter((item) => item.PostStatus == false)
            const falseTotalSalesDataBefore = TotalSalesDataBefore.filter((item) => item.PostStatus == false)
            const falsemergedInventoryOutData = mergedInventoryOutData.filter((item) => item.PostStatus == false)
            const falseTotalDcDataBefore = TotalDcDataBefore.filter((item) => item.PostStatus == false)
            const falsemergedInventoryOutDataBefore = mergedInventoryOutDataBefore.filter((item) => item.PostStatus == false)
            const falsemergedInventoryinDataBefore = mergedInventoryinDataBefore.filter((item) => item.PostStatus == "Received")
            const falsemergedInventoryinData = mergedInventoryInData.filter((item) => item.PostStatus == false)
            const falseTotalSalesReturnDataBefore = damage == "Fresh" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == false && item.Condition !== "Damage") : damage == "Damage" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == false && item.Condition == "Damage") : TotalSalesReturnDataBefore.filter((item) => item.PostStatus == false)
            const falsemarge = falsemergedDataPurchase.concat(falsemergedDataSale).concat(falsemergedDataPurchaseBefore).concat(falseTotalSalesDataBefore).concat(YearOpening).concat(falsemergedInventoryOutData).concat(falsemergedInventoryOutDataBefore).concat(falsemergedInventoryinDataBefore).concat(falsemergedInventoryinData).concat(falseTotalSalesReturnDataBefore).concat(falsemergedDataReturn).concat(falsemergedPurchaseReturnData).concat(falseTotalPurchaseReturnBefore).concat(falsemergedStockReplacementData).concat(falseTotalStockReplacementBefore).concat(falseTotalDcDataBefore).concat(falsemergedDCData).concat(mergedStockAdjustmentData).concat(mergedStockAdjustmentBefore)
            if (damage == "Damage") {

                const Damagedata = falsemarge.filter((item) => item.Condition === "Damage" || item.Type == 'Damage' || item.type == "StockReplacement")
                res.json(collapseRows(Damagedata))
            }
            else if (damage == "Fresh") {
                if (Location || Store) {
                    const data = falsemarge.filter((item) => {
                        const locationMatch = Location
                            ? item?.LocationTo === Location ||
                            item?.LocationFrom === Location ||
                            item?.Location === Location
                            : true;

                        const storeMatch = !Store ||
                            StoreArray.includes(item?.StoreTo) ||
                            StoreArray.includes(item?.StoreFrom) ||
                            StoreArray.includes(item?.Store);
                        return locationMatch && storeMatch;
                    });


                    res.json(collapseRows(data));
                }
                else {
                    res.json(collapseRows(falsemarge))

                }
            }
            else {
                res.json(collapseRows(falsemarge))
            }

        }
        else {
            const bothdata = mergedStockReplacementData.concat(YearOpening).concat(mergedDataPurchase).concat(mergedDataSale).concat(mergedPurchaseReturnData).concat(TotalPurchaseReturnBefore).concat(mergedDataPurchaseBefore).concat(TotalSalesDataBefore).concat(mergedInventoryOutData).concat(mergedInventoryOutDataBefore).concat(mergedInventoryinDataBefore).concat(mergedInventoryInData).concat(mergedDataReturn).concat(TotalSalesReturnDataBefore).concat(TotalDcDataBefore).concat(mergedDCData).concat(mergedStockAdjustmentData).concat(mergedStockAdjustmentBefore)
            if (Location || Store) {
                const data = bothdata.filter((item) => {
                    const locationMatch = Location
                        ? item?.LocationTo === Location ||
                        item?.LocationFrom === Location ||
                        item?.Location === Location
                        : true;

                    const storeMatch = !Store ||
                        StoreArray.includes(item?.StoreTo) ||
                        StoreArray.includes(item?.StoreFrom) ||
                        StoreArray.includes(item?.Store);
                    return locationMatch && storeMatch;
                });


                res.json(collapseRows(data));
            }
            else {

                res.json(collapseRows(bothdata));
            }
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
}


export const getSalesInvoiceByDateByProduct = async (req, res) => {
    try {
        const { startDate, endDate, status, product, Location, Store, damage } = req.query;
        console.log(product)
        const StoreArray = [...(Store?.split(",") || [])];
        const firstOpneing = await OpeningInventoryModal.find({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate }
        });



        const nextDate = firstOpneing[0]?.DateStart
        const previosdate = new Date(startDate);
        previosdate.setDate(previosdate.getDate() - 1);
        const before = previosdate.toISOString().split('T')[0];

       const mergedDataPurchaseBefore = await PurchaseInvoiceModal.aggregate([
    {
        $match: {
            PurchaseInvoiceDate: {
                $gte: nextDate,
                $lte: before,
            },
            "PurchaseData.product": product
        },
    },
    { $unwind: "$PurchaseData" },
    {
        $group: {
            _id: {
                product: "$PurchaseData.product",
                PostStatus: "$PostStatus",
                Store: "$Store",
                Location: "$Location",
                PurchaseInvoiceDate: "$PurchaseInvoiceDate",
            },
              totalPurchaseBoxBefore: {
                $sum: { $ifNull: ["$PurchaseData.totalBox", 0] }
            },
            totalPurchaseValueExclGst: {
                $sum: {
                    $convert: {
                        input: "$PurchaseData.GrossAmount",
                        to: "double",
                        onError: 0,  // Default to 0 if conversion fails
                        onNull: 0     // Default to 0 if value is null
                    }
                }
            },
        }
    },
    {
        $project: {
            _id: 0,
            product: "$_id.product",
            PostStatus: "$_id.PostStatus",
            totalPurchaseBoxBefore: 1,
            date: "$_id.PurchaseInvoiceDate",
            totalPurchaseValueExclGst: 1,
            type: "PurchaseBefore",
            Store: "$_id.Store",
            Location: "$_id.Location",
        },
    },
], { allowDiskUse: true });

console.log(mergedDataPurchaseBefore.length);

const mergedDataPurchase = await PurchaseInvoiceModal.aggregate([
    {
        $match: {
            PurchaseInvoiceDate: {
                $gte: startDate,
                $lte: endDate,
            },
            "PurchaseData.product": product
        },
    },
    { $unwind: "$PurchaseData" },
    {
        $group: {
            _id: {
                product: "$PurchaseData.product",
                PostStatus: "$PostStatus",
                PurchaseInvoiceDate: "$PurchaseInvoiceDate",
                invoice: "$PurchaseInvoice",
                SalesFlowRef: "$SalesFlowRef",
                Store: "$Store",
                Location: "$Location",
            },
           totalPurchaseBox: {
                $sum: { $ifNull: ["$PurchaseData.totalBox", 0] }
            },
            totalPurchaseUnits: { $sum: "$PurchaseData.unit" },
            totalPurchaseValueExclGst: { 
                $sum: {
                    $convert: {
                        input: "$PurchaseData.GrossAmount",
                        to: "double",
                        onError: 0,
                        onNull: 0
                    }
                }
            },
            totalPurchaseGst: {
                $sum: {
                    $convert: {
                        input: "$PurchaseData.Gst",
                        to: "double",
                        onError: 0,
                        onNull: 0
                    }
                }
            },
            totalPurchaseNetAmount: {
                $sum: {
                    $convert: {
                        input: "$PurchaseData.netAmunt",  // Fix the typo in your schema
                        to: "double",
                        onError: 0,
                        onNull: 0
                    }
                }
            }
        },
    },
    {
        $project: {
            _id: 0,
            product: "$_id.product",
            PostStatus: "$_id.PostStatus",
            totalPurchaseBox: 1,
            invoice: "$_id.invoice",
            totalPurchaseGst: 1,
            date: "$_id.PurchaseInvoiceDate",
            totalPurchaseUnits: 1,
            totalPurchaseGrossAmntinclGst: 1,
            totalPurchaseValueExclGst: 1,
            type: "Purchase",
            SalesFlowRef: "$_id.SalesFlowRef",
            Store: "$_id.Store",
            Location: "$_id.Location",
        },
    },
], { allowDiskUse: true });
        console.log(mergedDataPurchase[0] , "Purchase Data")
        const TotalSalesDataBefore = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                    "SalesData.product": product
                },
            },
            { $unwind: "$SalesData" },

            {
                $group: {
                    _id: {
                        product: "$SalesData.product",
                        PostStatus: "$PostStatus",
                        invoice: "$SalesInvoice",
                        Client: "$Client",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                        Store: "$Store",
                        Location: "$Location",

                    },
                    totalSaleBoxBefore: { $sum: "$SalesData.totalBox" },
                    TotalValueExclGstBefore: { $sum: "$SalesData.TotalValueExclGst" },

                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalSaleBoxBefore: 1,
                    date: "$_id.SalesInvoiceDate",
                    TotalValueExclGstBefore: 1,
                    type: "IssueBefore",
                    Store: "$_id.Store",
                    Client: "$_id.Client",
                    Location: "$_id.Location",

                },
            },
        ], { allowDiskUse: true });
        const mergedDataSale = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$SalesData" },
            {
                $group: {
                    _id: {
                        product: "$SalesData.product",
                        PostStatus: "$PostStatus",
                        Client: "$Client",
                        invoice: "$InvoiceNo",
                        SalesFlowRef: "$SalesFlowRef",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                        Store: "$Store",
                        Location: "$Location",
                        totalSaleBox: "$SalesData.totalBox",
                        totalSaleUnits: "$SalesData.unit",
                        totalGrossSaleAmntinclGst: "$SalesData.GrossAmntinclGst",
                        totalValueExclSaleGst: "$SalesData.TotalValueExclGst",
                        totalSaleGst: "$SalesData.Gst",
                        totalNetSaleAmount: "$SalesData.netAmunt",

                    },

                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    OrderBooker: "$_id.OrderBooker",
                    Client: "$_id.Client",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.invoice",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalSaleBox: "$_id.totalSaleBox",
                    totalSaleUnits: "$_id.totalSaleUnits",
                    totalGrossSaleAmntinclGst: "$_id.totalGrossSaleAmntinclGst",
                    totalValueExclSaleGst: "$_id.totalValueExclSaleGst",
                    totalSaleGst: "$_id.totalSaleGst",
                    date: "$_id.SalesInvoiceDate",
                    totalNetSaleAmount: 1,
                    type: "Issue",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ])
            .allowDiskUse(true); // ✅ put here!




        const TotalSalesReturnDataBefore = await SalesReturnModal.aggregate([
            {
                $match: {
                    SalesInvoiceReturnDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$SalesReturnData" },
            {
                $group: {
                    _id: {
                        product: "$SalesReturnData.product",
                        PostStatus: "$PostStatus",
                        SalesReturnNumber: "$SalesReturnNumber",
                        SalesInvoiceReturnDate: "$SalesInvoiceReturnDate",
                        Store: "$Store",
                        Location: "$Location",
                        Condition: "$Condition"
                    },
                    totalReturnBoxBefore: { $sum: "$SalesReturnData.totalBox" },
                    TotalSRValueExclGstBefore: { $sum: "$SalesReturnData.TotalValueExclGst" },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalReturnBoxBefore: 1,
                    date: "$_id.SalesInvoiceReturnDate",
                    TotalSRValueExclGstBefore: 1,
                    type: "ReturnBefore",
                    Store: "$_id.Store",
                    Condition: "$_id.Condition",
                    Location: "$_id.Location",
                },
            },
        ], { allowDiskUse: true });
        const TotalDcDataBefore = await OrderDcModal.aggregate(
            [
                {
                    $match: {
                        DCDate: {
                            $gte: nextDate,
                            $lte: before,
                        },
                        "DCData.product": product
                    },
                },
                { $unwind: "$DCData" },

                {
                    $group: {
                        _id: {
                            product: "$DCData.product",
                            DCCode: "$DCCode",
                            DCDate: "$DCDate",
                            Store: "$Store",
                            Location: "$Location",
                        },
                        totalDCBoxBefore: { $sum: "$DCData.DeliveredBox" },
                        TotalValueExclGstBefore: { $sum: "$DCData.TotalValueExclGst" },
                        PostStatus: { $first: "$PostStatus" },
                    },
                },

                {
                    $project: {
                        _id: 0,
                        product: "$_id.product",

                        PostStatus: {
                            $cond: {
                                if: { $eq: ["$PostStatus", "False"] },
                                then: false,
                                else: true,
                            },
                        },

                        totalDCBoxBefore: 1,
                        date: "$_id.DCDate",
                        TotalValueExclGstBefore: 1,
                        type: "IssueBefore",
                        Store: "$_id.Store",
                        Location: "$_id.Location",
                    },
                },
            ],
            { allowDiskUse: true }
        );


        const mergedDCData = await OrderDcModal.aggregate([
            {
                $match: {
                    DCDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    "DCData.product": product
                    
                },
            },
            { $unwind: "$DCData" },
            {
                $group: {
                    _id: {
                        product: "$DCData.product",
                        DCCode: "$DCCode",
                        Client: "$Distrbutor",
                        DCDate: "$DCDate",
                        Store: "$Store",
                        Location: "$Location",
                        DCDataBox: "$DCData.DeliveredBox",

                    },
                    PostStatus: { $first: "$PostStatus" },

                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: {
                        $cond: {
                            if: { $eq: ["$PostStatus", "False"] },
                            then: false,
                            else: true,
                        },
                    },

                    totalDCBox: "$_id.DCDataBox",
                    date: "$_id.DCDate",
                    type: "Issue",
                    Client: "$_id.Client",
                    DCCode: "$_id.DCCode",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ])
            .allowDiskUse(true);
        const mergedDataReturn = await SalesReturnModal.aggregate([
            {
                $match: {
                    SalesInvoiceReturnDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$SalesReturnData" },
            {
                $group: {
                    _id: {
                        product: "$SalesReturnData.product",
                        OrderBooker: "$OrderBooker",
                        PostStatus: "$PostStatus",
                        SalesReturnNumber: "$SalesReturnNumber",
                        SalesFlowRef: "$SalesFlowRef",
                        SalesInvoiceReturnDate: "$SalesInvoiceReturnDate",
                        Store: "$Store",
                        Condition: "$Condition",
                        Location: "$Location",
                    },
                    totalReturnBox: { $sum: "$SalesReturnData.totalBox" },
                    totalReturnUnits: { $sum: "$SalesReturnData.unit" },
                    totalGrossReturnAmntinclGst: { $sum: "$SalesReturnData.GrossAmntinclGst" },
                    totalValueExclReturnGst: { $sum: "$SalesReturnData.TotalValueExclGst" },
                    totalReturnGst: { $sum: "$SalesReturnData.Gst" },
                    totalNetReturnAmount: { $sum: "$SalesReturnData.netAmunt" },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    OrderBooker: "$_id.OrderBooker",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.SalesReturnNumber",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalReturnBox: 1,
                    totalReturnUnits: 1,
                    totalGrossReturnAmntinclGst: 1,
                    totalValueExclReturnGst: 1,
                    totalReturnGst: 1,
                    date: "$_id.SalesInvoiceReturnDate",
                    totalNetReturnAmount: 1,
                    type: "Return",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Condition: "$_id.Condition"
                },
            },
        ], { allowDiskUse: true });

        const mergedInventoryOutData = await InventoryTransferOutModal.aggregate([
            {
                $match: {
                    TransferOutDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferOutDate: "$TransferOutDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreFrom: "$StoreFrom",
                        StoreTo: "$StoreTo",
                        GrossAmount: "$TransferData.GrossAmount",
                        totalOutBoxes: "$TransferData.totalBox"
                    },

                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalOutBoxes: "$_id.totalOutBoxes",
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TrsferOutGrossAmount: `$_id.GrossAmount`,
                    date: "$_id.TransferOutDate",
                    type: "TransferOut",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });
        const mergedInventoryOutDataBefore = await InventoryTransferOutModal.aggregate([
            {
                $match: {
                    TransferOutDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferOutDate: "$TransferOutDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreFrom: "$StoreFrom",
                        StoreTo: "$StoreTo",
                        GrossAmount: "$TransferData.GrossAmount",

                    },
                    TransferOutBoxesBefore: {
                        $sum: { $toDouble: "$TransferData.totalBox" }
                    }
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    TransferOutBoxesBefore: 1,
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TransferOutAmountBefore: `$_id.GrossAmount`,
                    date: "$_id.TransferOutDate",
                    type: "TransferOutBefore",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });
        const mergedInventoryInData = await InventoryTransferInModal.aggregate([
            {
                $match: {
                    TransferInDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferInDate: "$TransferInDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreTo: "$StoreTo",
                        StoreFrom: "$StoreFrom",
                        GrossAmount: "$TransferData.GrossAmount",

                    },
                    totalInBoxes: { $sum: "$TransferData.totalBox" },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalInBoxes: 1,
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TransferInAmount: `$_id.GrossAmount`,
                    date: "$_id.TransferInDate",
                    type: "TransferIn",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });

        const mergedInventoryinDataBefore = await InventoryTransferInModal.aggregate([
            {
                $match: {
                    TransferInDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferInDate: "$TransferInDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreFrom: "$StoreFrom",
                        StoreTo: "$StoreTo",
                        GrossAmount: "$TransferData.GrossAmount",
                    },
                    TransferInBoxesBefore: { $sum: "$TransferData.totalBox" },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    TransferInBoxesBefore: 1,
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TransferInAmountBefore: `$_id.GrossAmount`,
                    date: "$_id.TransferinDate",
                    type: "TransferinBefore",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });
        const mergedPurchaseReturnData = await PurchaseReturnModal.aggregate([
            {
                $match: {
                    PurchaseReturnDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$PurchaseReturnData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseReturnData.product",
                        Vendor: "$Vendor",
                        PostStatus: "$PostStatus",
                        PurchaseReturn: "$PurchaseReturn",
                        SalesFlowRef: "$SalesFlowRef",
                        PurchaseReturnDate: "$PurchaseReturnDate",
                        Store: "$Store",
                        Location: "$Location",
                        Condition: "$PurchaseReturnData.Condition"

                    },
                    totalPurchaseReturnBox: { $sum: "$PurchaseReturnData.box" },
                    totalPurchaseReturnUnits: { $sum: "$PurchaseReturnData.unit" },
                    totalGrossReturnAmntinclGst: { $sum: "$PurchaseReturnData.netAmunt" },
                    totalValueExclReturnGst: { $sum: "$PurchaseReturnData.TotalValueExclGst" },
                    totalPurchaseReturnGst: { $sum: "$PurchaseReturnData.Gst" },
                    totalNetReturnAmount: { $sum: "$PurchaseReturnData.netAmunt" },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    Vendor: "$_id.Vendor",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.PurchaseReturn",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalPurchaseReturnBox: 1,
                    totalPurchaseReturnUnits: 1,
                    totalGrossReturnAmntinclGst: 1,
                    totalValueExclReturnGst: 1,
                    totalPurchaseReturnGst: 1,
                    date: "$_id.PurchaseReturnDate",
                    totalNetReturnAmount: 1,
                    type: "PurchaseReturn",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Condition: "$_id.Condition",

                },
            },
        ], { allowDiskUse: true });
        const TotalPurchaseReturnBefore = await PurchaseReturnModal.aggregate([
            {
                $match: {
                    PurchaseReturnDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$PurchaseReturnData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseReturnData.product",
                        PostStatus: "$PostStatus",
                        invoice: "$PurchaseReturn",
                        PurchaseReturnDate: "$PurchaseReturnDate",
                        Store: "$Store",
                        Location: "$Location",
                        Condition: "$PurchaseReturnData.Condition",

                    },
                    totalPurchaseReturnBoxBefore: { $sum: "$PurchaseReturnData.box" },

                    TotalValueExclGstBefore: { $sum: "$PurchaseReturnData.TotalValueExclGst" },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalPurchaseReturnBoxBefore: 1,
                    date: "$_id.PurchaseReturnDate",
                    TotalValueExclGstBefore: 1,
                    type: "PurchaseReturnBefore",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Condition: "$_id.Condition",
                },
            },
        ], { allowDiskUse: true });
        const mergedStockReplacementData = await StockReplacementModal.aggregate([
            {
                $match: {
                    ReplacementDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$ReplacementData" },
            {
                $group: {
                    _id: {
                        productFrom: "$ReplacementData.productFrom",
                        productTo: "$ReplacementData.productTo",
                        Customer: "$Customer",
                        PostStatus: "$PostStatus",
                        SalesFlowRef: "$SalesFlowRef",
                        ReplacementDate: "$ReplacementDate",
                        Store: "$Store",
                        Location: "$Location",
                    },
                    totalBoxesReplacementFrom: { $sum: { $toDouble: "$ReplacementData.totalBoxesFrom" } },
                    totalBoxesReplacementTo: { $sum: { $toDouble: "$ReplacementData.totalBoxesTo" } },
                    totalUnitsReplacementFrom: { $sum: "$ReplacementData.unitFrom" },
                    totalUnitsTo: { $sum: "$ReplacementData.unitTo" },
                    totalValueReplacementFrom: { $sum: "$ReplacementData.fromValue" },
                    totalValueReplacementTo: { $sum: "$ReplacementData.ToValue" },
                },
            },
            {
                $project: {
                    _id: 0,
                    productFrom: "$_id.productFrom",
                    productTo: "$_id.productTo",
                    Customer: "$_id.Customer",
                    PostStatus: "$_id.PostStatus",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    date: "$_id.ReplacementDate",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalBoxesReplacementFrom: 1,
                    totalBoxesReplacementTo: 1,
                    totalUnitsFrom: 1,
                    totalUnitsTo: 1,
                    totalValueFrom: 1,
                    totalValueTo: 1,
                    type: "StockReplacement"
                },
            },
        ], { allowDiskUse: true });
        const TotalStockReplacementBefore = await StockReplacementModal.aggregate([
            {
                $match: {
                    ReplacementDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$ReplacementData" },
            {
                $group: {
                    _id: {
                        productFrom: "$ReplacementData.productFrom",
                        PostStatus: "$PostStatus",
                        ReplacementDate: "$ReplacementDate",
                        Store: "$Store",
                        Location: "$Location",
                        type: "StockReplacementBefore"
                    },
                    totalBoxesToReplacementBefore: { $sum: { $toDouble: "$ReplacementData.totalBoxesTo" } },
                    totalValueToReplacementBefore: { $sum: "$ReplacementData.ToValue" },
                },
            },
            {
                $project: {
                    _id: 0,
                    productFrom: "$_id.productFrom",
                    PostStatus: "$_id.PostStatus",
                    date: "$_id.ReplacementDate",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalBoxesToReplacementBefore: 1,
                    totalValueToReplacementBefore: 1,
                    type: "StockReplacementBefore"
                },
            },
        ], { allowDiskUse: true });

        // Stock Adjustment - Current Period (By Product)
        const mergedStockAdjustmentData = await StockAdjustmentModal.aggregate([
            {
                $match: {
                    AdjustmentDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    PostStatus: true
                },
            },
            { $unwind: "$AdjustmentData" },
            {
                $group: {
                    _id: {
                        product: "$AdjustmentData.productName",
                        Store: "$Store",
                        Location: "$Location",
                        AdjustmentDate: "$AdjustmentDate",
                    },
                    totalAdjustmentLessBox: { $sum: { $toDouble: "$AdjustmentData.lessBox" } },
                    totalAdjustmentAddBox: { $sum: { $toDouble: "$AdjustmentData.addBox" } },
                    totalAdjustmentLessAmount: { $sum: { $toDouble: "$AdjustmentData.lessAmount" } },
                    totalAdjustmentAddAmount: { $sum: { $toDouble: "$AdjustmentData.addAmount" } },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    date: "$_id.AdjustmentDate",
                    totalAdjustmentLessBox: 1,
                    totalAdjustmentAddBox: 1,
                    totalAdjustmentLessAmount: 1,
                    totalAdjustmentAddAmount: 1,
                    type: "StockAdjustment"
                },
            },
        ], { allowDiskUse: true });

        // Stock Adjustment - Before Period (By Product)
        const mergedStockAdjustmentBefore = await StockAdjustmentModal.aggregate([
            {
                $match: {
                    AdjustmentDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                    PostStatus: true
                },
            },
            { $unwind: "$AdjustmentData" },
            {
                $group: {
                    _id: {
                        product: "$AdjustmentData.productName",
                        Store: "$Store",
                        Location: "$Location",
                        AdjustmentDate: "$AdjustmentDate",
                    },
                    totalAdjustmentLessBoxBefore: { $sum: { $toDouble: "$AdjustmentData.lessBox" } },
                    totalAdjustmentAddBoxBefore: { $sum: { $toDouble: "$AdjustmentData.addBox" } },
                    totalAdjustmentLessAmountBefore: { $sum: { $toDouble: "$AdjustmentData.lessAmount" } },
                    totalAdjustmentAddAmountBefore: { $sum: { $toDouble: "$AdjustmentData.addAmount" } },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    date: "$_id.AdjustmentDate",
                    totalAdjustmentLessBoxBefore: 1,
                    totalAdjustmentAddBoxBefore: 1,
                    totalAdjustmentLessAmountBefore: 1,
                    totalAdjustmentAddAmountBefore: 1,
                    type: "StockAdjustmentBefore"
                },
            },
        ], { allowDiskUse: true });

        const YearOpening = firstOpneing[0]?.InvoetoryData


        if (status == "Post") {
            console.log("first time post aya hai")
            const truemergedStockReplacementData = mergedStockReplacementData.filter((item) => item.PostStatus == true)
            const trueTotalStockReplacementBefore = TotalStockReplacementBefore.filter((item) => item.PostStatus == true)
            const trueTotalDcDataBefore = TotalDcDataBefore.filter((item) => item.PostStatus == true)
            const truemergedDataPurchase = mergedDataPurchase.filter((item) => item.PostStatus == true)
            const truemergedDataSale = mergedDataSale.filter((item) => item.PostStatus == true)
            const truemergedDCData = mergedDCData.filter((item) => item.PostStatus == true)
            const turemergedPurchaseReturnData = damage == "Fresh" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == true && item.Condition == "Fresh") : damage == "Damage" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == true && item.Condition == "Damage") : mergedPurchaseReturnData.filter((item) => item.PostStatus == true)
            const trueTotalPurchaseReturnBefore = damage == "Fresh" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == true && item.Condition == "Fresh") : damage == "Damage" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == true && item.Condition == "Damage") : TotalPurchaseReturnBefore.filter((item) => item.PostStatus == true)
            const truemergedDataPurchaseBefore = mergedDataPurchaseBefore.filter((item) => item.PostStatus == true)
            const trueTotalSalesDataBefore = TotalSalesDataBefore.filter((item) => item.PostStatus == true)
            const truemergedInventoryOutData = mergedInventoryOutData.filter((item) => item.PostStatus !== false)
            const trurmergedInventoryOutDataBefore = mergedInventoryOutDataBefore.filter((item) => item.PostStatus !== false)
            const truemergedInventoryinDataBefore = mergedInventoryinDataBefore.filter((item) => item.PostStatus == "Received")
            const truemergedInventoryinData = mergedInventoryInData.filter((item) => item.PostStatus !== false)
            const truemergedDataReturn = damage == "Fresh" ? mergedDataReturn.filter((item) => item.PostStatus !== false && item.Condition !== "Damage") : damage == "Damage" ? mergedDataReturn.filter((item) => item.PostStatus !== false && item.Condition == "Damage") : mergedDataReturn.filter((item) => item.PostStatus !== false)
            const trueTotalSalesReturnDataBefore = damage == "Fresh" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == true && item.Condition !== "Damage") : damage == "Damage" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == true && item.Condition == "Damage") : TotalSalesReturnDataBefore.filter((item) => item.PostStatus == true)
            const truemarge = truemergedDataPurchase.concat(truemergedDataSale).concat(truemergedDataPurchaseBefore).concat(trueTotalSalesDataBefore).concat(YearOpening).concat(truemergedInventoryOutData).concat(trurmergedInventoryOutDataBefore).concat(truemergedInventoryinDataBefore).concat(truemergedInventoryinData).concat(trueTotalSalesReturnDataBefore).concat(truemergedDataReturn).concat(turemergedPurchaseReturnData).concat(trueTotalPurchaseReturnBefore).concat(truemergedStockReplacementData).concat(trueTotalStockReplacementBefore).concat(trueTotalDcDataBefore).concat(truemergedDCData).concat(mergedStockAdjustmentData).concat(mergedStockAdjustmentBefore)

            if (damage == "Damage") {

                const Damagedata = truemarge.filter((item) => item.Condition === "Damage")
                res.json(collapseRows(Damagedata))
            }

            else if (damage == "Fresh") {
                if (product || Location || Store) {
                    const data = truemarge.filter((item) => {

                        const productMatch = product
                            ? item?.product == product
                            || item?.productTo === product ||
                            item?.productTo === product : true;
                        const locationMatch = Location
                            ? item?.LocationTo === Location ||
                            item?.LocationFrom === Location ||
                            item?.Location === Location
                            : true;

                        const storeMatch = !Store ||
                            StoreArray.includes(item?.StoreTo) ||
                            StoreArray.includes(item?.StoreFrom) ||
                            StoreArray.includes(item?.Store);
                        return productMatch && locationMatch && storeMatch;
                    });


                    res.json(collapseRows(data));
                }
                else {
                    res.json(collapseRows(truemarge))

                }
            }
            else {
                res.json(collapseRows(truemarge))
            }





        }

        else if (status == "UnPost") {

            const falsemergedStockReplacementData = mergedStockReplacementData.filter((item) => item.PostStatus == false)
            const falseTotalStockReplacementBefore = TotalStockReplacementBefore.filter((item) => item.PostStatus == false)
            const falsemergedDataPurchase = mergedDataPurchase.filter((item) => item.PostStatus == false)
            const falsemergedDataSale = mergedDataSale.filter((item) => item.PostStatus == false)
            const falsemergedPurchaseReturnData = damage == "Fresh" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == false && item.Condition == "Fresh") : damage == "Damage" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == false && item.Condition == "Damage") : mergedPurchaseReturnData.filter((item) => item.PostStatus == false)
            const falseTotalPurchaseReturnBefore = damage == "Fresh" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == false && item.Condition == "Fresh") : damage == "Damage" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == false && item.Condition == "Damage") : TotalPurchaseReturnBefore.filter((item) => item.PostStatus == false)
            const falsemergedDataPurchaseBefore = mergedDataPurchaseBefore.filter((item) => item.PostStatus == false)
            const falseTotalSalesDataBefore = TotalSalesDataBefore.filter((item) => item.PostStatus == false)
            const falsemergedInventoryOutData = mergedInventoryOutData.filter((item) => item.PostStatus == false)
            const falsemergedInventoryOutDataBefore = mergedInventoryOutDataBefore.filter((item) => item.PostStatus == false)
            const falsemergedInventoryinDataBefore = mergedInventoryinDataBefore.filter((item) => item.PostStatus == "Received")
            const falsemergedInventoryinData = mergedInventoryInData.filter((item) => item.PostStatus == false)
            const falseTotalSalesReturnDataBefore = damage == "Fresh" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == false && item.Condition !== "Damage") : damage == "Damage" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == false && item.Condition == "Damage") : TotalSalesReturnDataBefore.filter((item) => item.PostStatus == false)
            const falsemarge = falsemergedDataPurchase.concat(falsemergedDataSale).concat(falsemergedDataPurchaseBefore).concat(falseTotalSalesDataBefore).concat(YearOpening).concat(falsemergedInventoryOutData).concat(falsemergedInventoryOutDataBefore).concat(falsemergedInventoryinDataBefore).concat(falsemergedInventoryinData).concat(falseTotalSalesReturnDataBefore).concat(falsemergedDataReturn).concat(falsemergedPurchaseReturnData).concat(falseTotalPurchaseReturnBefore).concat(falsemergedStockReplacementData).concat(falseTotalStockReplacementBefore).concat(mergedStockAdjustmentData).concat(mergedStockAdjustmentBefore)
            if (damage == "Damage") {

                const Damagedata = falsemarge.filter((item) => item.Condition === "Damage" || item.Type == 'Damage' || item.type == "StockReplacement")
                res.json(collapseRows(Damagedata))
            }
            else if (damage == "Fresh") {
                if (Location || Store) {
                    const data = falsemarge.filter((item) => {
                        const locationMatch = Location
                            ? item?.LocationTo === Location || item?.LocationFrom === Location || item?.Location === Location
                            : true;

                        const storeMatch = !Store ||
                            StoreArray.includes(item?.StoreTo) ||
                            StoreArray.includes(item?.StoreFrom) ||
                            StoreArray.includes(item?.Store);
                        return locationMatch && storeMatch;
                    });


                    res.json(collapseRows(data));
                }
                else {
                    res.json(collapseRows(falsemarge))

                }
            }
            else {
                res.json(collapseRows(falsemarge))
            }

        }
        else {
            const bothdata = mergedDataPurchase.concat(mergedDataSale).concat(mergedDataPurchaseBefore).concat(TotalSalesDataBefore).concat(YearOpening).concat(mergedInventoryOutData).concat(mergedInventoryOutDataBefore).concat(mergedInventoryinDataBefore).concat(mergedInventoryInData).concat(TotalSalesReturnDataBefore).concat(mergedDataReturn).concat(mergedPurchaseReturnData).concat(TotalPurchaseReturnBefore).concat(mergedStockReplacementData).concat(TotalStockReplacementBefore).concat(TotalDcDataBefore).concat(mergedDCData).concat(mergedStockAdjustmentData).concat(mergedStockAdjustmentBefore)
            if (product || Location || Store) {
                const data = bothdata.filter((item) => {

                    const productMatch = product
                        ? item?.product == product
                        || item?.productTo === product ||
                        item?.productTo === product : true;
                    const locationMatch = Location
                        ? item?.LocationTo === Location ||
                        item?.LocationFrom === Location ||
                        item?.Location === Location
                        : true;

                    const storeMatch = !Store ||
                        StoreArray.includes(item?.StoreTo) ||
                        StoreArray.includes(item?.StoreFrom) ||
                        StoreArray.includes(item?.Store);
                    return productMatch && locationMatch && storeMatch;
                });


                res.json(collapseRows(data));
            }
            else {

                res.json(collapseRows(bothdata));
            }
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
}

export const getSalesInvoiceByDateFrYearEnd = async (req, res) => {
    try {
        const { startDate, endDate, status, product, Location, Store, damage } = req.query;
console.log(startDate, endDate);

        
        const firstOpneing = await OpeningInventoryModal.find({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate }
        });



        const nextDate = firstOpneing[0]?.DateStart
        const previosdate = new Date(startDate);
        previosdate.setDate(previosdate.getDate() - 1);
        const before = previosdate.toISOString().split('T')[0];

        const mergedDataPurchaseBefore = await PurchaseInvoiceModal.aggregate([
            {
                $match: {
                    PurchaseInvoiceDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$PurchaseData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseData.product",
                        PostStatus: "$PostStatus",
                        PurchaseInvoiceDate: "$PurchaseInvoiceDate",
                        invoice: "$PurchaseInvoice",
                        SalesFlowRef: `$SalesFlowRef`,
                        Store: "$Store",
                        Location: "$Location",
                    },
                    totalPurchaseBox: {
                        $sum: { $ifNull: ["$PurchaseData.totalBox", 0] }
                    },
                    totalPurchaseUnits: { $sum: "$PurchaseData.unit" },
                    totalPurchaseValueExclGst: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.GrossAmount",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    totalPurchaseGst: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.Gst",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    totalPurchaseNetAmount: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.netAmunt",  // Fix the typo in your schema
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalPurchaseBox: 1,
                    invoice: `$_id.invoice`,
                    totalPurchaseGst: 1,
                    date: "$_id.PurchaseInvoiceDate",
                    totalPurchaseUnits: 1,
                    totalPurchaseValueExclGst: 1,
                    type: "PurchaseBefore",
                    SalesFlowRef: `$_id.SalesFlowRef`,
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ], { allowDiskUse: true })

        const mergedDataPurchase = await PurchaseInvoiceModal.aggregate([
            {
                $match: {
                    PurchaseInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$PurchaseData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseData.product",
                        PostStatus: "$PostStatus",
                        PurchaseInvoiceDate: "$PurchaseInvoiceDate",
                        invoice: "$PurchaseInvoice",
                        SalesFlowRef: `$SalesFlowRef`,
                        Store: "$Store",
                        Location: "$Location",
                    },
                    totalPurchaseBox: {
                        $sum: { $ifNull: ["$PurchaseData.totalBox", 0] }
                    },
                    totalPurchaseUnits: { $sum: "$PurchaseData.unit" },
                    totalPurchaseValueExclGst: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.GrossAmount",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    totalPurchaseGst: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.Gst",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    totalPurchaseNetAmount: {
                        $sum: {
                            $convert: {
                                input: "$PurchaseData.netAmunt",  // Fix the typo in your schema
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalPurchaseBox: 1,
                    invoice: `$_id.invoice`,
                    totalPurchaseGst: 1,
                    date: "$_id.PurchaseInvoiceDate",
                    totalPurchaseUnits: 1,
                    totalPurchaseValueExclGst: 1,
                    type: "Purchase",
                    SalesFlowRef: `$_id.SalesFlowRef`,
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ], { allowDiskUse: true })

        const mergedDataRCBefore = await RcModal.aggregate([
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: [{ $toDate: "$RcDate" }, new Date(nextDate)] },
                            { $lte: [{ $toDate: "$RcDate" }, new Date(before)] }
                        ]
                    },
                    PostStatus: "true"
                }
            },
            { $unwind: "$RcData" },
            {
                $group: {
                    _id: {
                        product: "$RcData.product",
                        Store: "$Store",
                        Location: "$Location",
                        RcDate : "$RcDate",
                    },
                    totalRCBoxBefore: { $sum: "$RcData.totalBox" },
                    totalRCValueExclGst: {
                        $sum: { $toDouble: "$RcData.GrossAmount" }
                    }
                }
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalRCBoxBefore: 1,
                    date : "$_id.RcDate",
                    totalRCValueExclGst: 1,
                    type: "RC"
                }
            }
        ])


        const mergedDataRC = await RcModal.aggregate([
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: [{ $toDate: "$RcDate" }, new Date(startDate)] },
                            { $lte: [{ $toDate: "$RcDate" }, new Date(endDate)] }
                        ]
                    },
                    PostStatus: { $in: ["true", true] }
                }
            },
            { $unwind: "$RcData" },
            {
                $group: {
                    _id: {
                        product: "$RcData.product",
                        Store: "$Store",
                        RcDate : "$RcDate",
                        Location: "$Location"

                    },
                    totalRCBox: { $sum: "$RcData.totalBox" },
                    totalRCValueExclGst: {
                        $sum: { $toDouble: "$RcData.GrossAmount" }
                    }
                }
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    Store: "$_id.Store",
                    date : "$_id.RcDate",
                    Location: "$_id.Location",
                    totalRCBox: 1,
                    totalRCValueExclGst: 1,
                    type: "RC"
                }
            }
        ])
        //totalRCBoxBefore
        console.log(mergedDataRCBefore, "Rcdata")

        const TotalSalesDataBefore = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$SalesData" },

            {
                $group: {
                    _id: {
                        product: "$SalesData.product",
                        PostStatus: "$PostStatus",
                        Client: "$Client",
                        invoice: "$InvoiceNo",
                        SalesFlowRef: "$SalesFlowRef",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                        Store: "$Store",
                        Location: "$Location",
                        totalSaleBox: "$SalesData.totalBox",
                        totalSaleUnits: "$SalesData.unit",
                        totalGrossSaleAmntinclGst: "$SalesData.GrossAmntinclGst",
                        totalValueExclSaleGst: "$SalesData.TotalValueExclGst",
                        totalSaleGst: "$SalesData.Gst",
                        totalNetSaleAmount: "$SalesData.netAmunt",

                    },

                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    OrderBooker: "$_id.OrderBooker",
                    Client: "$_id.Client",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.invoice",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalSaleBox: "$_id.totalSaleBox",
                    totalSaleUnits: "$_id.totalSaleUnits",
                    totalGrossSaleAmntinclGst: "$_id.totalGrossSaleAmntinclGst",
                    totalValueExclSaleGst: "$_id.totalValueExclSaleGst",
                    totalSaleGst: "$_id.totalSaleGst",
                    date: "$_id.SalesInvoiceDate",
                    totalNetSaleAmount: 1,
                    type: "IssueBefore",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ], { allowDiskUse: true });
        const mergedDataSale = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$SalesData" },
            {
                $group: {
                    _id: {
                        product: "$SalesData.product",
                        PostStatus: "$PostStatus",
                        Client: "$Client",
                        invoice: "$InvoiceNo",
                        SalesFlowRef: "$SalesFlowRef",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                        Store: "$Store",
                        Location: "$Location",
                        totalSaleBox: "$SalesData.totalBox",
                        totalSaleUnits: "$SalesData.unit",
                        totalGrossSaleAmntinclGst: "$SalesData.GrossAmntinclGst",
                        totalValueExclSaleGst: "$SalesData.TotalValueExclGst",
                        totalSaleGst: "$SalesData.Gst",
                        totalNetSaleAmount: "$SalesData.netAmunt",

                    },

                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    OrderBooker: "$_id.OrderBooker",
                    Client: "$_id.Client",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.invoice",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalSaleBox: "$_id.totalSaleBox",
                    totalSaleUnits: "$_id.totalSaleUnits",
                    totalGrossSaleAmntinclGst: "$_id.totalGrossSaleAmntinclGst",
                    totalValueExclSaleGst: "$_id.totalValueExclSaleGst",
                    totalSaleGst: "$_id.totalSaleGst",
                    date: "$_id.SalesInvoiceDate",
                    totalNetSaleAmount: 1,
                    type: "Issue",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                },
            },
        ])


        const TotalDcDataBefore = await OrderDcModal.aggregate(
            [
                {
                    $match: {
                        DCDate: {
                            $gte: nextDate,
                            $lte: before,
                        },
                    },
                },
                { $unwind: "$DCData" },

                {
                    $group: {
                        _id: {
                            id: "$_id",
                            product: "$DCData.product",
                            DCCode: "$DCCode",
                            date: "$DCDate",
                            Store: "$Store",
                            Location: "$Location",
                            totalDCBoxBefore: "$DCData.DeliveredBox",
                            TotalValueExclGstBefore: "$DCData.TotalValueExclGst",
                        },
                        PostStatus: { $first: "$PostStatus" },
                    },
                },

                {
                    $project: {
                        id: "$_id._id",
                        product: "$_id.product",

                        PostStatus: {
                            $cond: {
                                if: { $eq: ["$PostStatus", "False"] },
                                then: false,
                                else: true,
                            },
                        },

                        totalDCBoxBefore: "$_id.totalDCBoxBefore",
                        date: "$_id.date",
                        TotalValueExclGstBefore: 1,
                        type: "IssueBefore",
                        Store: "$_id.Store",
                        Location: "$_id.Location",
                    },
                },
            ],
            { allowDiskUse: true }
        );


        const mergedDCData = await OrderDcModal.aggregate([
            {
                $match: {
                    DCDate: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: "$DCData" },
            {
                $group: {
                    _id: {
                        id: "$_id",
                        product: "$DCData.product",
                        DCCode: "$DCCode",
                        DCDate: "$DCDate",
                        Store: "$Store",
                        Location: "$Location",
                        totalDCBox: "$DCData.DeliveredBox", // ✅ correct
                    },
                    PostStatus: { $first: "$PostStatus" }
                }
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    DCDate: "$_id.DCDate",
                    DCCode: "$_id.DCCode",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalDCBox: "$_id.totalDCBox",
                    type: "Issue",
                    PostStatus: {
                        $cond: {
                            if: { $eq: ["$PostStatus", "False"] },
                            then: false,
                            else: true
                        }
                    }
                }
            }
        ], { allowDiskUse: true });
        // ✅ put here!


        const TotalSalesReturnDataBefore = await SalesReturnModal.aggregate([
            {
                $match: {
                    SalesInvoiceReturnDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$SalesReturnData" },
            {
                $group: {
                    _id: {
                        product: "$SalesReturnData.product",
                        PostStatus: "$PostStatus",
                        SalesReturnNumber: "$SalesReturnNumber",
                        SalesInvoiceReturnDate: "$SalesInvoiceReturnDate",
                        Store: "$Store",
                        Location: "$Location",
                        Condition: "$Condition"
                    },
                    totalReturnBoxBefore: { $sum: "$SalesReturnData.totalBox" },
                    TotalSRValueExclGstBefore: { $sum: "$SalesReturnData.TotalValueExclGst" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalReturnBoxBefore: 1,
                    date: "$_id.SalesInvoiceReturnDate",
                    TotalSRValueExclGstBefore: 1,
                    type: "ReturnBefore",
                    Store: "$_id.Store",
                    Condition: "$_id.Condition",
                    Location: "$_id.Location",
                },
            },
        ], { allowDiskUse: true });

        const mergedDataReturn = await SalesReturnModal.aggregate([
            {
                $match: {
                    SalesInvoiceReturnDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$SalesReturnData" },
            {
                $group: {
                    _id: {
                        product: "$SalesReturnData.product",
                        OrderBooker: "$OrderBooker",
                        PostStatus: "$PostStatus",
                        SalesReturnNumber: "$SalesReturnNumber",
                        SalesFlowRef: "$SalesFlowRef",
                        SalesInvoiceReturnDate: "$SalesInvoiceReturnDate",
                        Store: "$Store",
                        Condition: "$Condition",
                        Location: "$Location",
                    },
                    totalReturnBox: { $sum: "$SalesReturnData.totalBox" },
                    totalReturnUnits: { $sum: "$SalesReturnData.unit" },
                    totalGrossReturnAmntinclGst: { $sum: "$SalesReturnData.GrossAmntinclGst" },
                    totalValueExclReturnGst: { $sum: "$SalesReturnData.TotalValueExclGst" },
                    totalReturnGst: { $sum: "$SalesReturnData.Gst" },
                    totalNetReturnAmount: { $sum: "$SalesReturnData.netAmunt" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    OrderBooker: "$_id.OrderBooker",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.SalesReturnNumber",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalReturnBox: 1,
                    totalReturnUnits: 1,
                    totalGrossReturnAmntinclGst: 1,
                    totalValueExclReturnGst: 1,
                    totalReturnGst: 1,
                    date: "$_id.SalesInvoiceReturnDate",
                    totalNetReturnAmount: 1,
                    type: "Return",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Condition: "$_id.Condition"
                },
            },
        ], { allowDiskUse: true });

        const mergedInventoryOutData = await InventoryTransferOutModal.aggregate([
            {
                $match: {
                    TransferOutDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferOutDate: "$TransferOutDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreFrom: "$StoreFrom",
                        StoreTo: "$StoreTo",
                        GrossAmount: "$TransferData.GrossAmount",
                        totalOutBoxes: "$TransferData.totalBox"
                    },

                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalOutBoxes: "$_id.totalOutBoxes",
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TrsferOutGrossAmount: `$_id.GrossAmount`,
                    date: "$_id.TransferOutDate",
                    type: "TransferOut",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });
        const mergedInventoryOutDataBefore = await InventoryTransferOutModal.aggregate([
            {
                $match: {
                    TransferOutDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferOutDate: "$TransferOutDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreFrom: "$StoreFrom",
                        StoreTo: "$StoreTo",
                        GrossAmount: "$TransferData.GrossAmount",

                    },
                    TransferOutBoxesBefore: {
                        $sum: { $toDouble: "$TransferData.totalBox" }
                    }
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    TransferOutBoxesBefore: 1,
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TransferOutAmountBefore: `$_id.GrossAmount`,
                    date: "$_id.TransferOutDate",
                    type: "TransferOutBefore",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });
        const mergedInventoryInData = await InventoryTransferInModal.aggregate([
            {
                $match: {
                    TransferInDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferInDate: "$TransferInDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreTo: "$StoreTo",
                        StoreFrom: "$StoreFrom",
                        GrossAmount: "$TransferData.GrossAmount",

                    },
                    totalInBoxes: { $sum: "$TransferData.totalBox" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalInBoxes: 1,
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TransferInAmount: `$_id.GrossAmount`,
                    date: "$_id.TransferInDate",
                    type: "TransferIn",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });

        const mergedInventoryinDataBefore = await InventoryTransferInModal.aggregate([
            {
                $match: {
                    TransferInDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$TransferData" },

            {
                $group: {
                    _id: {
                        product: "$TransferData.product",
                        PostStatus: "$PostStatus",
                        TransferCode: `$TransferCode`,
                        SalesFlowRef: '$SalesFlowRef',
                        TransferInDate: "$TransferInDate",
                        LocationFrom: "$LocationFrom",
                        LocationTo: "$LocationTo",
                        StoreFrom: "$StoreFrom",
                        StoreTo: "$StoreTo",
                        GrossAmount: "$TransferData.GrossAmount",
                    },
                    TransferInBoxesBefore: { $sum: "$TransferData.totalBox" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    TransferInBoxesBefore: 1,
                    TransferCode: `$_id.TransferCode`,
                    SalesFlowRef: '$_id.SalesFlowRef',
                    TransferInAmountBefore: `$_id.GrossAmount`,
                    date: "$_id.TransferinDate",
                    type: "TransferinBefore",
                    LocationFrom: "$_id.LocationFrom",
                    LocationTo: "$_id.LocationTo",
                    StoreFrom: "$_id.StoreFrom",
                    StoreTo: "$_id.StoreTo",
                    Rate: "$_id.Rate"

                },
            },
        ], { allowDiskUse: true });
        const mergedPurchaseReturnData = await PurchaseReturnModal.aggregate([
            {
                $match: {
                    PurchaseReturnDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$PurchaseReturnData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseReturnData.product",
                        Vendor: "$Vendor",
                        PostStatus: "$PostStatus",
                        PurchaseReturn: "$PurchaseReturn",
                        SalesFlowRef: "$SalesFlowRef",
                        PurchaseReturnDate: "$PurchaseReturnDate",
                        Store: "$Store",
                        Location: "$Location",
                        Condition: "$PurchaseReturnData.Condition"

                    },
                    totalPurchaseReturnBox: { $sum: "$PurchaseReturnData.box" },
                    totalPurchaseReturnUnits: { $sum: "$PurchaseReturnData.unit" },
                    totalGrossReturnAmntinclGst: { $sum: "$PurchaseReturnData.netAmunt" },
                    totalValueExclReturnGst: { $sum: "$PurchaseReturnData.TotalValueExclGst" },
                    totalPurchaseReturnGst: { $sum: "$PurchaseReturnData.Gst" },
                    totalNetReturnAmount: { $sum: "$PurchaseReturnData.netAmunt" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    Vendor: "$_id.Vendor",
                    PostStatus: "$_id.PostStatus",
                    invoice: "$_id.PurchaseReturn",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    totalPurchaseReturnBox: 1,
                    totalPurchaseReturnUnits: 1,
                    totalGrossReturnAmntinclGst: 1,
                    totalValueExclReturnGst: 1,
                    totalPurchaseReturnGst: 1,
                    date: "$_id.PurchaseReturnDate",
                    totalNetReturnAmount: 1,
                    type: "PurchaseReturn",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Condition: "$_id.Condition",

                },
            },
        ], { allowDiskUse: true });
        const TotalPurchaseReturnBefore = await PurchaseReturnModal.aggregate([
            {
                $match: {
                    PurchaseReturnDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$PurchaseReturnData" },
            {
                $group: {
                    _id: {
                        product: "$PurchaseReturnData.product",
                        PostStatus: "$PostStatus",
                        invoice: "$PurchaseReturn",
                        PurchaseReturnDate: "$PurchaseReturnDate",
                        Store: "$Store",
                        Location: "$Location",
                        Condition: "$PurchaseReturnData.Condition",

                    },
                    totalPurchaseReturnBoxBefore: { $sum: "$PurchaseReturnData.box" },

                    TotalValueExclGstBefore: { $sum: "$PurchaseReturnData.TotalValueExclGst" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalPurchaseReturnBoxBefore: 1,
                    date: "$_id.PurchaseReturnDate",
                    TotalValueExclGstBefore: 1,
                    type: "PurchaseReturnBefore",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Condition: "$_id.Condition",
                },
            },
        ], { allowDiskUse: true });
        const mergedStockReplacementData = await StockReplacementModal.aggregate([
            {
                $match: {
                    ReplacementDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            { $unwind: "$ReplacementData" },
            {
                $group: {
                    _id: {
                        productFrom: "$ReplacementData.productFrom",
                        productTo: "$ReplacementData.productTo",
                        Customer: "$Customer",
                        PostStatus: "$PostStatus",
                        SalesFlowRef: "$SalesFlowRef",
                        ReplacementDate: "$ReplacementDate",
                        Store: "$Store",
                        Location: "$Location",
                    },
                    totalBoxesReplacementFrom: { $sum: { $toDouble: "$ReplacementData.totalBoxesFrom" } },
                    totalBoxesReplacementTo: { $sum: { $toDouble: "$ReplacementData.totalBoxesTo" } },
                    totalUnitsReplacementFrom: { $sum: "$ReplacementData.unitFrom" },
                    totalUnitsTo: { $sum: "$ReplacementData.unitTo" },
                    totalValueReplacementFrom: { $sum: "$ReplacementData.fromValue" },
                    totalValueReplacementTo: { $sum: "$ReplacementData.ToValue" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    productFrom: "$_id.productFrom",
                    productTo: "$_id.productTo",
                    Customer: "$_id.Customer",
                    PostStatus: "$_id.PostStatus",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    date: "$_id.ReplacementDate",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalBoxesReplacementFrom: 1,
                    totalBoxesReplacementTo: 1,
                    totalUnitsFrom: 1,
                    totalUnitsTo: 1,
                    totalValueFrom: 1,
                    totalValueTo: 1,
                    type: "StockReplacement"
                },
            },
        ], { allowDiskUse: true });
        const TotalStockReplacementBefore = await StockReplacementModal.aggregate([
            {
                $match: {
                    ReplacementDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                },
            },
            { $unwind: "$ReplacementData" },
            {
                $group: {
                    _id: {
                        productFrom: "$ReplacementData.productFrom",
                        PostStatus: "$PostStatus",
                        ReplacementDate: "$ReplacementDate",
                        Store: "$Store",
                        Location: "$Location",
                        type: "StockReplacementBefore"
                    },
                    totalBoxesToReplacementBefore: { $sum: { $toDouble: "$ReplacementData.totalBoxesTo" } },
                    totalValueToReplacementBefore: { $sum: "$ReplacementData.ToValue" },
                },
            },
            {
                $project: {
                    _id: "$_id._id",
                    productFrom: "$_id.productFrom",
                    PostStatus: "$_id.PostStatus",
                    date: "$_id.ReplacementDate",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    totalBoxesToReplacementBefore: 1,
                    totalValueToReplacementBefore: 1,
                    type: "StockReplacementBefore"
                },
            },
        ], { allowDiskUse: true });
const mergedStockAdjustmentData = await StockAdjustmentModal.aggregate([
            {
                $match: {
                    AdjustmentDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    PostStatus: true
                },
            },
            { $unwind: "$AdjustmentData" },
            {
                $group: {
                    _id: {
                        product: "$AdjustmentData.productName",
                        Store: "$Store",
                        Location: "$Location",
                        AdjustmentDate: "$AdjustmentDate",
                    },
                    totalAdjustmentLessBox: { $sum: { $toDouble: "$AdjustmentData.lessBox" } },
                    totalAdjustmentAddBox: { $sum: { $toDouble: "$AdjustmentData.addBox" } },
                    totalAdjustmentLessAmount: { $sum: { $toDouble: "$AdjustmentData.lessAmount" } },
                    totalAdjustmentAddAmount: { $sum: { $toDouble: "$AdjustmentData.addAmount" } },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    date: "$_id.AdjustmentDate",
                    totalAdjustmentLessBox: 1,
                    totalAdjustmentAddBox: 1,
                    totalAdjustmentLessAmount: 1,
                    totalAdjustmentAddAmount: 1,
                    type: "StockAdjustment"
                },
            },
        ], { allowDiskUse: true });

        // Stock Adjustment - Before Period
        const mergedStockAdjustmentBefore = await StockAdjustmentModal.aggregate([
            {
                $match: {
                    AdjustmentDate: {
                        $gte: nextDate,
                        $lte: before,
                    },
                    PostStatus: true
                },
            },
            { $unwind: "$AdjustmentData" },
            {
                $group: {
                    _id: {
                        product: "$AdjustmentData.productName",
                        Store: "$Store",
                        Location: "$Location",
                        AdjustmentDate: "$AdjustmentDate",
                    },
                    totalAdjustmentLessBoxBefore: { $sum: { $toDouble: "$AdjustmentData.lessBox" } },
                    totalAdjustmentAddBoxBefore: { $sum: { $toDouble: "$AdjustmentData.addBox" } },
                    totalAdjustmentLessAmountBefore: { $sum: { $toDouble: "$AdjustmentData.lessAmount" } },
                    totalAdjustmentAddAmountBefore: { $sum: { $toDouble: "$AdjustmentData.addAmount" } },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    date: "$_id.AdjustmentDate",
                    totalAdjustmentLessBoxBefore: 1,
                    totalAdjustmentAddBoxBefore: 1,
                    totalAdjustmentLessAmountBefore: 1,
                    totalAdjustmentAddAmountBefore: 1,
                    type: "StockAdjustmentBefore"
                },
            },
        ], { allowDiskUse: true });


        const YearOpening = firstOpneing[0]?.InvoetoryData


           if (status == "Post") {
            const truemergedStockReplacementData = mergedStockReplacementData.filter((item) => item.PostStatus == true)
            const trueTotalStockReplacementBefore = TotalStockReplacementBefore.filter((item) => item.PostStatus == true)
            const truemergedDataPurchase = mergedDataPurchase
            const truemergedDataSale = mergedDataSale.filter((item) => item.PostStatus == true)
            const truemergedDCData = mergedDCData.filter((item) => item.PostStatus == true)
            const turemergedPurchaseReturnData = damage == "Fresh" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == true && item.Condition == "Fresh") : damage == "Damage" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == true && item.Condition == "Damage") : mergedPurchaseReturnData.filter((item) => item.PostStatus == true)
            const trueTotalPurchaseReturnBefore = damage == "Fresh" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == true && item.Condition == "Fresh") : damage == "Damage" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == true && item.Condition == "Damage") : TotalPurchaseReturnBefore.filter((item) => item.PostStatus == true)
            const truemergedDataPurchaseBefore = mergedDataPurchaseBefore
            const trueTotalSalesDataBefore = TotalSalesDataBefore.filter((item) => item.PostStatus == true)
            const trueTotalDcDataBefore = TotalDcDataBefore.filter((item) => item.PostStatus == true)
            const truemergedInventoryOutData = mergedInventoryOutData.filter((item) => item.PostStatus !== false)
            const trurmergedInventoryOutDataBefore = mergedInventoryOutDataBefore.filter((item) => item.PostStatus !== false)
            const truemergedInventoryinDataBefore = mergedInventoryinDataBefore.filter((item) => item.PostStatus == "Received")
            const truemergedInventoryinData = mergedInventoryInData.filter((item) => item.PostStatus !== false)
            const truemergedDataReturn = damage == "Fresh" ? mergedDataReturn.filter((item) => item.PostStatus !== false && item.Condition !== "Damage") : damage == "Damage" ? mergedDataReturn.filter((item) => item.PostStatus !== false && item.Condition == "Damage") : mergedDataReturn.filter((item) => item.PostStatus !== false)
            const trueTotalSalesReturnDataBefore = damage == "Fresh" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == true && item.Condition !== "Damage") : damage == "Damage" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == true && item.Condition == "Damage") : TotalSalesReturnDataBefore.filter((item) => item.PostStatus == true)
          const truemarge = truemergedDataPurchase.concat(truemergedDataSale).concat(truemergedDataPurchaseBefore).concat(trueTotalSalesDataBefore).concat(YearOpening).concat(truemergedInventoryOutData).concat(trurmergedInventoryOutDataBefore).concat(truemergedInventoryinDataBefore).concat(truemergedInventoryinData).concat(trueTotalSalesReturnDataBefore).concat(truemergedDataReturn).concat(turemergedPurchaseReturnData).concat(trueTotalPurchaseReturnBefore).concat(truemergedStockReplacementData).concat(trueTotalStockReplacementBefore).concat(trueTotalDcDataBefore).concat(truemergedDCData).concat(mergedDataRC).concat(mergedDataRCBefore).concat(mergedStockAdjustmentData).concat(mergedStockAdjustmentBefore)
            
            console.log("send")
            
            if (damage == "Damage") {
                const Damagedata = truemarge.filter((item) => item.Condition === "Damage")
                res.json(Damagedata)
            }
            else if (damage == "Fresh") {
                if (product || Location) {  // Store hataya
                    const data = truemarge.filter((item) => {
                        const productMatch = product
                            ? item?.product == product || item?.productTo === product
                            : true;
                        
                        const locationMatch = Location
                            ? item?.LocationTo === Location || item?.LocationFrom === Location || item?.Location === Location
                            : true;

                        return productMatch && locationMatch;
                    });
                    res.json(data);
                }
                else {
                    res.json(truemarge)
                }
            }
            else {
                res.json(truemarge)
            }
        }

        else if (status == "UnPost") {

            const falsemergedStockReplacementData = mergedStockReplacementData.filter((item) => item.PostStatus == false)
            const falseTotalStockReplacementBefore = TotalStockReplacementBefore.filter((item) => item.PostStatus == false)
            const falsemergedDataPurchase = mergedDataPurchase.filter((item) => item.PostStatus == false)
            const falsemergedDataSale = mergedDataSale.filter((item) => item.PostStatus == false)
            const falsemergedDCData = mergedDCData.filter((item) => item.PostStatus == false)
            const falsemergedPurchaseReturnData = damage == "Fresh" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == false && item.Condition == "Fresh") : damage == "Damage" ? mergedPurchaseReturnData.filter((item) => item.PostStatus == false && item.Condition == "Damage") : mergedPurchaseReturnData.filter((item) => item.PostStatus == false)
            const falseTotalPurchaseReturnBefore = damage == "Fresh" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == false && item.Condition == "Fresh") : damage == "Damage" ? TotalPurchaseReturnBefore.filter((item) => item.PostStatus == false && item.Condition == "Damage") : TotalPurchaseReturnBefore.filter((item) => item.PostStatus == false)
            const falsemergedDataPurchaseBefore = mergedDataPurchaseBefore.filter((item) => item.PostStatus == false)
            const falseTotalSalesDataBefore = TotalSalesDataBefore.filter((item) => item.PostStatus == false)
            const falsemergedInventoryOutData = mergedInventoryOutData.filter((item) => item.PostStatus == false)
            const falseTotalDcDataBefore = TotalDcDataBefore.filter((item) => item.PostStatus == false)
            const falsemergedInventoryOutDataBefore = mergedInventoryOutDataBefore.filter((item) => item.PostStatus == false)
            const falsemergedInventoryinDataBefore = mergedInventoryinDataBefore.filter((item) => item.PostStatus == "Received")
            const falsemergedInventoryinData = mergedInventoryInData.filter((item) => item.PostStatus == false)
            const falseTotalSalesReturnDataBefore = damage == "Fresh" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == false && item.Condition !== "Damage") : damage == "Damage" ? TotalSalesReturnDataBefore.filter((item) => item.PostStatus == false && item.Condition == "Damage") : TotalSalesReturnDataBefore.filter((item) => item.PostStatus == false)
            const falsemarge = falsemergedDataPurchase.concat(falsemergedDataSale).concat(falsemergedDataPurchaseBefore).concat(falseTotalSalesDataBefore).concat(YearOpening).concat(falsemergedInventoryOutData).concat(falsemergedInventoryOutDataBefore).concat(falsemergedInventoryinDataBefore).concat(falsemergedInventoryinData).concat(falseTotalSalesReturnDataBefore).concat(falsemergedDataReturn).concat(falsemergedPurchaseReturnData).concat(falseTotalPurchaseReturnBefore).concat(falsemergedStockReplacementData).concat(falseTotalStockReplacementBefore).concat(falseTotalDcDataBefore).concat(falsemergedDCData)
            if (damage == "Damage") {

                const Damagedata = falsemarge.filter((item) => item.Condition === "Damage" || item.Type == 'Damage' || item.type == "StockReplacement")
                res.json(Damagedata)
            }
            else if (damage == "Fresh") {
                if (Location || Store) {
                    const data = falsemarge.filter((item) => {
                        const locationMatch = Location
                            ? item?.LocationTo === Location ||
                            item?.LocationFrom === Location ||
                            item?.Location === Location
                            : true;

                        const storeMatch = !Store ||
                            StoreArray.includes(item?.StoreTo) ||
                            StoreArray.includes(item?.StoreFrom) ||
                            StoreArray.includes(item?.Store);
                        return locationMatch && storeMatch;
                    });


                    res.json(data);
                }
                else {
                    res.json(falsemarge)

                }
            }
            else {
                res.json(falsemarge)
            }

        }
        else {
            const bothdata = mergedStockReplacementData.concat(YearOpening).concat(mergedDataPurchase).concat(mergedDataSale).concat(mergedPurchaseReturnData).concat(TotalPurchaseReturnBefore).concat(mergedDataPurchaseBefore).concat(TotalSalesDataBefore).concat(mergedInventoryOutData).concat(mergedInventoryOutDataBefore).concat(mergedInventoryinDataBefore).concat(mergedInventoryInData).concat(mergedDataReturn).concat(TotalSalesReturnDataBefore).concat(TotalDcDataBefore).concat(mergedDCData)
            if (Location || Store) {
                const data = bothdata.filter((item) => {
                    const locationMatch = Location
                        ? item?.LocationTo === Location ||
                        item?.LocationFrom === Location ||
                        item?.Location === Location
                        : true;

                    const storeMatch = !Store ||
                        StoreArray.includes(item?.StoreTo) ||
                        StoreArray.includes(item?.StoreFrom) ||
                        StoreArray.includes(item?.Store);
                    return locationMatch && storeMatch;
                });


                res.json(data);
            }
            else {

                res.json(bothdata);
            }
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
}