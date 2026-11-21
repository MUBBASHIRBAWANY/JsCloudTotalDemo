import AdministrativeModal from "../Modal/AdministrativeModal.js";
import InventoryTransferOutModal from "../Modal/InventoryTransferOutModal.js";
import OpeningInventoryModal from "../Modal/OpeningInventoryModal.js";
import PurchaseInvoiceModal from "../Modal/PurchaseInvoiceModal.js";
import OrderDcModal from "../Modal/SaleOrderDcModal.js";
import SalesInvoiceModal from "../Modal/SalesInvoiceModal.js";
import TotalProductModal from "../Modal/TotalProductModal.js";
import InventoryTransferInModal from "../Modal/TransferInModal.js";
import VoucherModal from "../Modal/VoucherModal.js";

export const getAllTransferIn = async (req, res) => {
    const data = await InventoryTransferInModal.find();
    if (data) {
        res.status(200).json({
            message: "All Transfer In Data",
            data: data
        });
    }
    else {
        res.status(404).json({
            message: "No Transfer In Data Found"
        });
    }
}
export const postTransferIn = async (req, res) => {
    const { status, TransferData, LocationTo, StoreTo, TransferCode } = req.body;
    const { id } = req.params;
    if (status === "Recived") {
        try {
            const quantityUpdates = TransferData.map(item => ({
                updateOne: {
                    filter: {
                        ProductName: item.product,
                        Location: LocationTo,
                        Store: StoreTo
                    },
                    update: {
                        $inc: {
                            TotalQuantity: Number(item.totalBox) || 0,
                            Amount: Number(item.GrossAmount) || 0
                        },
                        $setOnInsert: {
                            ProductName: item.product,
                            Location: LocationTo,
                            Store: StoreTo,
                            AvgRate: 0
                        }
                    },
                    upsert: true
                }
            }));
            console.log(quantityUpdates)
            await TotalProductModal.bulkWrite(quantityUpdates);

            // 2. Update average rates
            for (const item of TransferData) {
                const product = await TotalProductModal.findOne({
                    ProductName: item.product,
                    Location: LocationTo,
                    Store: StoreTo
                });

                if (product && product.TotalQuantity > 0) {
                    const avgRate = product.Amount / product.TotalQuantity;
                    await TotalProductModal.updateOne(
                        { _id: product._id },
                        { $set: { AvgRate: avgRate } }
                    );
                }
            }

            // 3. Update transfer statuses
            await InventoryTransferInModal.findByIdAndUpdate(id, { PostStatus: "Received" });
            await InventoryTransferOutModal.findOneAndUpdate(
                { TransferCode: TransferCode },
                { PostStatus: "Received" }
            );

            return res.status(200).json({
                success: true,
                message: "Destination quantity increased"
            });

        } catch (error) {
            console.error("Transfer In error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to update destination quantity"
            });
        }
    }
};

export const createTransferIn = async (req, res) => {
    try {
        console.log(req)
        const data = await InventoryTransferInModal.create(req.body)
        console.log(data)
        res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

export  const TransferInReport = async (req, res) => {
    const { startDate, endDate, Store, } = req.query;
    try {
        const mergedInventoryInData = await InventoryTransferInModal.aggregate([
            {
                $match: {
                    TransferInDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },

                    StoreTo: Store,
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
                        totalInBoxes: "$TransferData.totalBox" ,
                    },
                    
                },
            },
            {
                $project: {
                    _id: 0,
                    product: "$_id.product",
                    PostStatus: "$_id.PostStatus",
                    totalInBoxes: "$_id.totalInBoxes",
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
        res.status(200).send(mergedInventoryInData)
    }
    
    catch (err){
        res.status(400).send(err)

    }
 

}


export const Costing = async (req, res) => {
    try {
        const { startDate, endDate, Store, Distrbutor } = req.query;
        console.log(startDate, endDate, Store, Distrbutor)
        const Admin = await AdministrativeModal.findOne()
        const StoreArray = [...(Store?.split(",") || [])];
        const firstOpneing = await OpeningInventoryModal.find({
            DateStart: { $lte: startDate },
            DateEnd: { $gte: startDate }
        });



        const nextDate = firstOpneing[0]?.DateStart
        const previosdate = new Date(startDate);
        previosdate.setDate(previosdate.getDate() - 1);
        const before = previosdate.toISOString().split('T')[0];



        const mergedDataPurchase = await PurchaseInvoiceModal.aggregate([
            {
                $match: {
                    PurchaseInvoiceDate: {
                        $gte: firstOpneing[0].DateStart,
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
                        GrossAmount: "$PurchaseData.GrossAmount",
                        Location: "$Location",
                    },

                    totalPurchaseBox: { $sum: "$PurchaseData.totalBox" },
                    totalPurchaseUnits: { $sum: "$PurchaseData.unit" },

                    totalPurchaseGst: {
                        $sum: {
                            $toDouble: "$PurchaseData.Gst"
                        }
                    },
                    totalPurchaseNetAmount: {
                        $sum: {
                            $toDouble: "$PurchaseData.netAmunt"
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
                    invoice: `$_id.invoice`,
                    totalPurchaseGst: 1,
                    date: "$_id.PurchaseInvoiceDate",
                    totalPurchaseUnits: 1,
                    totalPurchaseGrossAmntinclGst: 1,
                    totalPurchaseValueExclGst: "$_id.GrossAmount",
                    type: "Purchase",
                    SalesFlowRef: `$_id.SalesFlowRef`,
                    Store: "$_id.Store",
                    Location: "$_id.Location",

                },
            },

        ], { allowDiskUse: true })
        const YearOpening = firstOpneing[0]?.InvoetoryData
        const truemergedDataPurchase = mergedDataPurchase.filter((item) => item.PostStatus == true)

        const truemarge = truemergedDataPurchase.concat(YearOpening)
        const data = truemarge.filter((item) => {
            const storeMatch = !Store ||
                StoreArray.includes(item?.StoreTo) ||
                StoreArray.includes(item?.StoreFrom) ||
                StoreArray.includes(item?.Store);
            return storeMatch;
        });
        const merged = Object.values(
            data.reduce((acc, item) => {
                const key = item.product;

                if (!acc[key]) {
                    acc[key] = {
                        product: item.product,
                        Location: item.Location,
                        Store: item.Store,
                        Type: item.Type,
                        totalQty: 0,
                        totalValueExclGst: 0,
                        totalValueInclGst: 0,
                    };
                }

                acc[key].totalQty += Number(item.opneingQty || 0) + Number(item.totalPurchaseBox || 0) + Number(item.totalPurchaseBoxBefore || 0);

                acc[key].totalValueExclGst +=
                    (Number(item.opneingQty || 0) * Number(item.opneingQtyValueExclGst || 0)) + Number(item.totalPurchaseValueExclGst || 0) + Number(item.totalBeforePurchaseValueExclGst || 0)

                acc[key].totalValueInclGst +=
                    (Number(item.opneingQty || 0) * Number(item.opneingQtyValueInclGst || 0));

                return acc;
            }, {})
        )
        const rate = merged.map((item) => ({
            ...item,
            Rate: item.totalValueExclGst / item.totalQty
        }))
        if (Distrbutor == "true") {
            console.log("true")
            const Invoice = await OrderDcModal.find({ Store: Store, DCDate: { $gte: startDate, $lte: endDate }, })
            
            const costingInvoice = Invoice.map(inv => {
                const updatedSalesData = inv.DCData.map(val => {
                    const foundRate = rate.find(r => r.product == val.product);
                    
                    const itemRate = foundRate ? foundRate.Rate : 0;

                    return {
                        ...val,
                        CostRate: itemRate,
                        CostValue: itemRate * val.DeliveredBox
                    };
                });

                return {
                    ...inv.toObject(),
                    SalesData: updatedSalesData
                };
            });


            const VoucherValue = costingInvoice.map((item) => ({
                ...item,
                Costvalue: item.SalesData.reduce((sum, val) => sum + (parseFloat(val.CostValue) || 0), 0)
            }))
            for (const item of VoucherValue) {
                console.log(item.DCCode)
                
                await VoucherModal.findOneAndDelete({ VoucherNumber: `Dcv${item.DCCode}` })
                await VoucherModal.create({
                    VoucherType: "DCV",
                    VoucherNumber: `Dcv${item.DCCode}`,
                    VoucherDate: item.DCDate,
                    status: "Post",
                    VoucharData: [
                        {
                            Account: Admin.finishedGoods,
                            Credit: item.Costvalue,
                            store: Store,
                        },
                        {
                            Account: Admin.COSTOFSALES,
                            Debit: item.Costvalue,
                            store: Store,
                        },]
                })

            }
        }
        else {
            const Invoice = await SalesInvoiceModal.find({ Store: Store, SalesInvoiceDate: { $gte: startDate, $lte: endDate }, PostStatus: true })
            const costingInvoice = Invoice.map(inv => {
                const updatedSalesData = inv.SalesData.map(val => {
                    const foundRate = rate.find(r => r.product == val.product);

                    const itemRate = foundRate ? foundRate.Rate : 0;

                    return {
                        ...val,
                        CostRate: itemRate,
                        CostValue: itemRate * val.totalBox
                    };
                });

                return {
                    ...inv.toObject(),
                    SalesData: updatedSalesData
                };
            });


            const VoucherValue = costingInvoice.map((item) => ({
                ...item,
                Costvalue: item.SalesData.reduce((sum, val) => sum + (parseFloat(val.CostValue) || 0), 0)
            }))
            for (const item of VoucherValue) {
                console.log(item.SalesInvoice)
                await VoucherModal.findOneAndDelete({ VoucherNumber: `Co${item.SalesInvoice}` })
                await VoucherModal.create({
                    VoucherType: "Co",
                    VoucherNumber: `Co${item.SalesInvoice}`,
                    VoucherDate: item.SalesInvoiceDate,
                    status: "Post",
                    VoucharData: [
                        {
                            Account: Admin.finishedGoods,
                            Credit: item.Costvalue,
                            store: Store,
                        },
                        {
                            Account: Admin.COSTOFSALES,
                            Debit: item.Costvalue,
                            store: Store,
                        },]
                })

            }
        }

        res.status(200).send("Cost ReCalulated")
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
}