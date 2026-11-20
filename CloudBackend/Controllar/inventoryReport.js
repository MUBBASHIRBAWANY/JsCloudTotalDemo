const TransferIn = async (req,res) =>{

        

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
        ],{ allowDiskUse: true });
        re
}