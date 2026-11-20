import PurchaseOrderDcModal from "../modal/PurchaseOrderDcModal.js";
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";

export const AllStockReport = async (req , res) =>{
try{

    const { startDate, endDate , Distrbutor} = req.query;
    console.log(startDate, endDate , Distrbutor)
    const SoftwareDate =  "2025-01-01"
    const previosdate = new Date(startDate);
        previosdate.setDate(previosdate.getDate() - 1);
        const before = previosdate.toISOString().split('T')[0];
        const PurchaseData = await PurchaseOrderDcModal.aggregate([
            {
                $match: {
                    DCDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    Distrbutor : Distrbutor,
                    PostStatus : {$ne : "Cancel"}
                },
            },

            { $unwind: "$DCData" },
            {
                $group: {
                    _id: {
                        product: "$DCData.product",
                        PostStatus: "$PostStatus",
                        DCNumber: "$DCCode",
                        DCDate: "$DCDate",
                        Box: "$DCData.DeliveredBox",
                        Gst: "$DCData.Gst",
                        netAmunt: "$DCData.netAmunt",
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    date: "$_id.DCDate",
                    invoice: "$_id.DCNumber",
                    Box: "$_id.Box",
                    Type : "Current Purchase",
                    Page : "Purchase",
                    netAmount: "$_id.netAmount",

                },
            },

        ])

        const BeforePurchaseData = await PurchaseOrderDcModal.aggregate([
            {
                $match: {
                    DCDate: {
                        $gte: SoftwareDate,
                        $lte: before,
                    },
                    Distrbutor : Distrbutor,
                    PostStatus : {$ne : "Cancel"}

                },
            },

            { $unwind: "$DCData" },
            {
                $group: {
                    _id: {
                        product: "$DCData.product",
                        PostStatus: "$PostStatus",
                        DCNumber: "$DCCode",
                        DCDate: "$DCDate",
                        Box: "$DCData.DeliveredBox",
                        Gst: "$DCData.Gst",
                        netAmunt: "$DCData.netAmunt",
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    date: "$_id.DCDate",
                    invoice: "$_id.DCNumber",
                    Box: "$_id.Box",
                    Type : "Before Purchase",
                    Page : "Purchase",
                    netAmount: "$_id.netAmount",

                },
            },

        ])
const salesData = await SalesInvoiceModal.aggregate(
            [
                     {
                $match: {
                    SalesInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    Distrbutor : Distrbutor,
                    PostStatus : {$ne : "Cancel"}
                },
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
                        Type : "Current Sales",
                       SalesInvoiceDate: "$SalesInvoiceDate",
                        // Distributor Info
                        DistributorId: "$Distrbutor",
                        OrderBookerId: "$OrderBooker",
                        ProductId: "$SalesData.product",
                        ProductName: "$productInfo.ProductName", // adjust field name as per your schema
                        ProductCode: "$productInfo.code", // adjust field name as per your schema
                        NetSale: "$SalesData.NetSale",
                        DeliveredBox: "$SalesData.DeliveredBox",
                        RTGBox: "$SalesData.RTGBox",
                    PostStatus : "$PostStatus",
                    Page : "Sales",

                        
                    },
                },
            ],
            { allowDiskUse: true }
        );
        const salesDataBefore = await SalesInvoiceModal.aggregate(
            [
                     {
                $match: {
                    SalesInvoiceDate: {
                        $gte: SoftwareDate,
                        $lte: before,
                    },
                    Distrbutor : Distrbutor,
                    PostStatus : {$ne : "Cancel"}
                    
                },
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
                        Type : "Before Sales",
                    Page : "Sales",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                        // Distributor Info
                        DistributorId: "$Distrbutor",
                        OrderBookerId: "$OrderBooker",
                        ProductId: "$SalesData.product",
                        ProductName: "$productInfo.ProductName", // adjust field name as per your schema
                        ProductCode: "$productInfo.code", // adjust field name as per your schema
                        NetSale: "$SalesData.NetSale",
                    PostStatus : "$PostStatus",
                        DeliveredBox: "$SalesData.DeliveredBox",
                        RTGBox: "$SalesData.RTGBox",
                        
                        
                    },
                },
            ],
            { allowDiskUse: true }
        );
     const data = PurchaseData.concat(BeforePurchaseData).concat(salesData).concat(salesDataBefore)
     res.status(200).send(data)
}catch(err){
    res.status(400).send(err)
}

}