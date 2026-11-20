import PurchaseOrderDcModal from "../modal/PurchaseOrderDcModal.js"
import TotalProductModal from "../modal/TotalProductModal.js"

export const createPurchaseOrderDC = async (req, res) => {
    try {
        const data = await PurchaseOrderDcModal.create(req.body)
        res.status(200).send(data)

    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}


export const DeletePurchaseOrderDC = async (req, res) => {
    try {
        const { id } = req.params
        const data = await PurchaseOrderDcModal.findByIdAndDelete(id)
        res.status(200).send(data)

    } catch (err) {
        res.status(400).send(err)
    }
}

export const getAllPurchaseOrderDC = async (req, res) => {
    try {


        const data = await PurchaseOrderDcModal.find()
        res.status(200).send(data)

    } catch (err) {
        res.status(400).send(err)
    }
}

export const getPurchaseOrderDCByDistributor = async (req, res) => {
    try {
        const { Distrbutor } = req.params
        console.log(Distrbutor)
        const data = await PurchaseOrderDcModal.find({ Distrbutor: Distrbutor });
        res.status(200).send(data)

    } catch (err) {
        res.status(400).send(err)
    }
}

const purchaseQty = (item) =>
    Number(item?.DeliveredBox ?? item?.totalBox ?? item?.box) || 0

export const PostPurchaseOrderDC = async (req, res) => {
    const { DCData, Distrbutor } = req.body;
    const { id } = req.params
    console.log(DCData, Distrbutor)
    try {
        const existingDc = await PurchaseOrderDcModal.findById(id)
        if (!existingDc) {
            return res.status(404).json({ success: false, message: "Purchase DC not found" })
        }
        if (existingDc.PostStatus === "Received") {
            return res.status(400).json({
                success: false,
                message: "Purchase DC already posted — stock dobara add nahi hoga"
            })
        }

        const bulkOps = DCData.map(item => ({
            updateOne: {
                filter: {
                    ProductName: item.product,
                    Distrbutor: Distrbutor
                },
                update: {
                    $inc: {
                        TotalQuantity: purchaseQty(item),
                        Amount: Number(item.ValueAfterDiscout) || 0
                    },
                    $setOnInsert: {
                        ProductName: item.product,
                        Distrbutor: Distrbutor
                    }
                },
                upsert: true
            }
        }));

        await TotalProductModal.bulkWrite(bulkOps);

        // --- Recalculate Weighted AvgRate ---
        for (const item of DCData) {
            const product = await TotalProductModal.findOne({
                ProductName: item.product,
                Distrbutor: Distrbutor
            });

            if (product && product.TotalQuantity > 0) {
                const avgRate = product.Amount / product.TotalQuantity;

                await TotalProductModal.updateOne(
                    { _id: product._id },
                    { $set: { AvgRate: avgRate } }
                );
            }
        }

        // --- Update Invoice Status ---
        await PurchaseOrderDcModal.findByIdAndUpdate(
            id,
            { PostStatus: "Received" }
        );

        return res.status(200).json({
            success: true,
            message: "Invoice posted and stock increased successfully"
        });

    } catch (err) {
        console.log(err);
        res.status(400).json({ success: false, error: err.message });
    }
};

export const allPurchaseDumpData = async (req, res) => {

    const { startDate, endDate , Distrbutor} = req.query;
    console.log(startDate, endDate , Distrbutor)
    try {
        const allPurchaseData = await PurchaseOrderDcModal.aggregate([
            {
                $match: {
                    DCDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    Distrbutor : Distrbutor,
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
                    netAmount: "$_id.netAmount",

                },
            },

        ])

        res.status(200).send(allPurchaseData)
    } catch (err) {
        res.status(400).send(err)
    }
}
