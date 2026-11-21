import AdministrativeModal from "../Modal/AdministrativeModal.js";
import DistributorSaleOrderModal from "../Modal/DistributorSaleOrderModal.js";
import OrderDcModal from "../Modal/SaleOrderDcModal.js";
import TotalProductModal from "../Modal/TotalProductModal.js";
import VoucherModal from "../Modal/VoucherModal.js";
import CutomerModal from "../Modal/CutomerModal.js";
import PriceListModal from "../Modal/PriceListModal.js";
import mongoose from "mongoose";

// export const createDc = async (req, res) => {
//     const { DCData, Store, Location, Customer } = req.body
//     try {

//         // PriceList check: verify all products exist in customer's PriceList
//         if (Customer) {
//             const customer = await CutomerModal.findById(Customer);
//             if (customer && customer.PriceList) {
//                 const priceList = await PriceListModal.findById(customer.PriceList);
//                 if (priceList && priceList.PriceListData && priceList.PriceListData.length > 0) {
//                     const priceListProducts = priceList.PriceListData.map(item => item.product);
//                     const missingProducts = DCData.filter(item => !priceListProducts.includes(item.product));
//                     if (missingProducts.length > 0) {
//                         return res.status(400).json({
//                             success: false,
//                             message: `Following products are not in customer's PriceList: ${missingProducts.map(p => p.product).join(', ')}`
//                         });
//                     }
//                 }
//             }
//         }

//         const code = await OrderDcModal.findOne().sort({ _id: -1 }).limit(1)

//         let nextCode
//         if (code == null) {
//             const nextNumber = parseInt("000000", 10) + 1;
//             nextCode = nextNumber.toString().padStart(6, '0')
//         }
//         else {
//             const nextNumber = parseInt(code.DCCode, 10) + 1;
//             console.log(nextNumber)
//             nextCode = nextNumber.toString().padStart(6, '0')
//         }
//         const allData = {
//             ...req.body,
//             DCCode: nextCode,
//             PostStatus: "Deliverd"
//         }
//         const stockChecks = await Promise.all(
//             DCData.map(async item => {
//                 const product = await TotalProductModal.findOne({
//                     ProductName: item.product,
//                     Location: Location,
//                     Store: Store
//                 });
//                 return { product, item };
//             })
//         );

//         const errors = stockChecks.filter(({ product, item }) =>
//             !product || product.TotalQuantity < (item.DeliveredBox || 0)
//         );

//         if (errors.length > 0) {
//             return res.status(400).json({
//                 success: false,
//                 errors: errors.map(({ product, item }) =>
//                     !product
//                         ? [`${item.product}`]
//                         : {
//                             product: product.ProductName,
//                             qty: product.TotalQuantity,
//                             required: item.DeliveredBox
//                         }
//                 )
//             });
//         }
//         else {
//             const Admin = await AdministrativeModal.find();
//             const bulkOps = stockChecks.map(({ product, item }) => {
//                 const avgRate = product.AvgRate || 0;
//                 return {
//                     updateOne: {
//                         filter: {
//                             ProductName: item.product,
//                             Location,
//                             Store,
//                         },
//                         update: {
//                             $inc: {
//                                 TotalQuantity: -(item.DeliveredBox || 0),
//                                 Amount: -(item.DeliveredBox || 0) * avgRate,
//                             },
//                         },
//                     },
//                 };
//             });
//             const createDc = await OrderDcModal.create(allData)
//             const totalCost = stockChecks.reduce((sum, { product, item }) => {
//                 return sum + (item.DeliveredBox || 0) * (product.AvgRate || 0);
//             }, 0);

//             const Voucher = await VoucherModal.create({
//                 VoucherType: "DCV",
//                 VoucherNumber: `Dcv${nextCode}`,
//                 VoucherDate: allData.DCDate,
//                 status: "Post",
//                 VoucharData: [
//                     {
//                         Account: Admin[0].finishedGoods,
//                         Credit: totalCost,
//                         store: Store,
//                     },
//                     {
//                         Account: Admin[0].COSTOFSALES,
//                         Debit: totalCost,
//                         store: Store,
//                     },
//                 ],
//             });
//             await TotalProductModal.bulkWrite(bulkOps);
//             for (const item of DCData) {
//                 const { Order, product, DeliveredBox, CancelBox } = item;

//                 // Step 1: Fetch order containing the product
//                 const orderDoc = await DistributorSaleOrderModal.findOne({
//                     OrderCode: Order,
//                     "OrderData.product": product
//                 });

//                 if (!orderDoc) continue;

//                 const productEntry = orderDoc.OrderData.find(p => p.product == product);
//                 const existingDeliver = Number(
//                     productEntry.Deliver ?? 0
//                 );

//                 const toDeliver = Number(DeliveredBox || 0);
//                 const toCancel = Number(CancelBox || 0);
//                 const newDeliver = toDeliver + existingDeliver;

//                 // Step 2: Decrease Deliver carton

//                 await DistributorSaleOrderModal.updateOne(
//                     {
//                         OrderCode: Order,
//                         "OrderData.product": product
//                     },
//                     {
//                         $set: {
//                             "OrderData.$.Deliver": newDeliver
//                         }
//                     }
//                 );



//             }
//             // Step 3: Check if all product of the order are fully delivered (Remaingcarton === 0)
//             const updatedOrders = DCData.map((dc) => dc.Order);
//             for (const orderNumber of updatedOrders) {

//                 const order = await DistributorSaleOrderModal.findOne({
//                     OrderCode: orderNumber
//                 });

//                 if (!order || !order.OrderData?.length) continue;

//                 const isDelivered = order.OrderData.every(item =>
//                     (Number(item.Deliver || 0) + Number(item.CancelBox || 0)) === Number(item.totalBox || 0)
//                 );

//                 const isPartiallyDelivered = order.OrderData.some(item =>
//                     Number(item.Deliver || 0) > 0
//                 );

//                 let status = "Process";

//                 if (isDelivered) {
//                     status = "Delivered";
//                 } else if (isPartiallyDelivered) {
//                     status = "Partially Delivered";
//                 }

//                 await DistributorSaleOrderModal.updateOne(
//                     { OrderCode: orderNumber },
//                     { $set: { PostStatus: status } }
//                 );
//             }

//             res.status(200).send(createDc);

//         }
//     } catch (err) {
//         console.log(err)
//         res.status(400).send(err)

//     }
// }


export const createDc = async (req, res) => {
    const { DCData, Store, Location, Customer } = req.body;

    const session = await mongoose.startSession();

    try {
        let responseData;

        await session.withTransaction(async () => {
            // PriceList check: verify all products exist in customer's PriceList
            if (Customer) {
                const customer = await CutomerModal.findById(Customer).session(session);
                if (customer && customer.PriceList) {
                    const priceList = await PriceListModal.findById(customer.PriceList).session(session);
                    if (priceList && priceList.PriceListData && priceList.PriceListData.length > 0) {
                        const priceListProducts = priceList.PriceListData.map(item => item.product);
                        const missingProducts = DCData.filter(item => !priceListProducts.includes(item.product));
                        if (missingProducts.length > 0) {
                            throw {
                                statusCode: 400,
                                message: `Following products are not in customer's PriceList: ${missingProducts.map(p => p.product).join(', ')}`
                            };
                        }
                    }
                }
            }

            const code = await OrderDcModal.findOne().sort({ _id: -1 }).limit(1).session(session);

            let nextCode;
            if (code == null) {
                const nextNumber = parseInt("000000", 10) + 1;
                nextCode = nextNumber.toString().padStart(6, '0');
            } else {
                const nextNumber = parseInt(code.DCCode, 10) + 1;
                nextCode = nextNumber.toString().padStart(6, '0');
            }

            const allData = {
                ...req.body,
                DCCode: nextCode,
                PostStatus: "Deliverd"
            };

            const stockChecks = await Promise.all(
                DCData.map(async item => {
                    const product = await TotalProductModal.findOne({
                        ProductName: item.product,
                        Location: Location,
                        Store: Store
                    }).session(session);
                    return { product, item };
                })
            );

            const errors = stockChecks.filter(({ product, item }) =>
                !product || product.TotalQuantity < (item.DeliveredBox || 0)
            );

            if (errors.length > 0) {
                throw {
                    statusCode: 400,
                    errors: errors.map(({ product, item }) =>
                        !product
                            ? [`${item.product}`]
                            : {
                                product: product.ProductName,
                                qty: product.TotalQuantity,
                                required: item.DeliveredBox
                            }
                    )
                };
            }

            const Admin = await AdministrativeModal.find().session(session);

            const bulkOps = stockChecks.map(({ product, item }) => {
                const avgRate = product.AvgRate || 0;
                return {
                    updateOne: {
                        filter: {
                            ProductName: item.product,
                            Location,
                            Store,
                        },
                        update: {
                            $inc: {
                                TotalQuantity: -(item.DeliveredBox || 0),
                                Amount: -(item.DeliveredBox || 0) * avgRate,
                            },
                        },
                    },
                };
            });

            const createDcDocs = await OrderDcModal.create([allData], { session });
            const createDc = createDcDocs[0];

            const totalCost = stockChecks.reduce((sum, { product, item }) => {
                return sum + (item.DeliveredBox || 0) * (product.AvgRate || 0);
            }, 0);

            await VoucherModal.create([{
                VoucherType: "DCV",
                VoucherNumber: `Dcv${nextCode}`,
                VoucherDate: allData.DCDate,
                status: "Post",
                VoucharData: [
                    {
                        Account: Admin[0].finishedGoods,
                        Credit: totalCost,
                        store: Store,
                    },
                    {
                        Account: Admin[0].COSTOFSALES,
                        Debit: totalCost,
                        store: Store,
                    },
                ],
            }], { session });

            await TotalProductModal.bulkWrite(bulkOps, { session });

            for (const item of DCData) {
                const { Order, product, DeliveredBox, CancelBox } = item;

                // Step 1: Fetch order containing the product
                const orderDoc = await DistributorSaleOrderModal.findOne({
                    OrderCode: Order,
                    "OrderData.product": product
                }).session(session);

                if (!orderDoc) continue;

                const productEntry = orderDoc.OrderData.find(p => p.product == product);
                const existingDeliver = Number(productEntry.Deliver ?? 0);

                const toDeliver = Number(DeliveredBox || 0);
                const newDeliver = toDeliver + existingDeliver;

                // Step 2: Increase Deliver carton
                await DistributorSaleOrderModal.updateOne(
                    {
                        OrderCode: Order,
                        "OrderData.product": product
                    },
                    {
                        $set: {
                            "OrderData.$.Deliver": newDeliver
                        }
                    },
                    { session }
                );
            }

            // Step 3: Check if all products of the order are fully delivered
            const updatedOrders = DCData.map((dc) => dc.Order);
            for (const orderNumber of updatedOrders) {
                const order = await DistributorSaleOrderModal.findOne({
                    OrderCode: orderNumber
                }).session(session);

                if (!order || !order.OrderData?.length) continue;

                const isDelivered = order.OrderData.every(item =>
                    (Number(item.Deliver || 0) + Number(item.CancelBox || 0)) === Number(item.totalBox || 0)
                );

                const isPartiallyDelivered = order.OrderData.some(item =>
                    Number(item.Deliver || 0) > 0
                );

                let status = "Process";
                if (isDelivered) {
                    status = "Delivered";
                } else if (isPartiallyDelivered) {
                    status = "Partially Delivered";
                }


                await DistributorSaleOrderModal.updateOne(
                    { OrderCode: orderNumber },
                    { $set: { PostStatus: status } },
                    { session }
                );
            }

            responseData = createDc;
        });

        return res.status(200).send(responseData);

    } catch (err) {
        console.log(err);

        if (err.statusCode) {
            return res.status(err.statusCode).json({
                success: false,
                ...(err.message && { message: err.message }),
                ...(err.errors && { errors: err.errors })
            });
        }

        return res.status(400).send(err);
    } finally {
        await session.endSession();
    }
}

export const updateBuilty = async (req, res) => {
    try {
        const { id } = req.params

        const { BiltyAmount, BiltyNumber, Biltytype, Transporter } = req.body
        const data = await OrderDcModal.findByIdAndUpdate(id, {
            BiltyAmount,
            BiltyNumber,
            Biltytype,
            Transporter
        })
        const findData = await OrderDcModal.find({ _id: id })
        console.log(id)
        res.status(200).send(data)

    } catch (err) {
        res.status(400).send(err)
    }
}

export const getAllDc = async (req, res) => {
    try {
        const Data = await OrderDcModal.find()


        res.status(200).send(Data)
    } catch (err) {
        res.status(400).send(err)

    }
}

export const getDcList = async (req, res) => {
    try {
        const data = await OrderDcModal.aggregate([
            { $sort: { DCCode: -1 } },
            {
                $project: {
                    DCCode: 1,
                    DCDate: 1,
                    Distrbutor: 1,
                    PostStatus: 1,
                    Location: 1,
                    Store: 1,
                    Transporter: 1,
                    Invoice: 1,
                    BiltyAmount: 1,
                    BiltyNumber: 1,
                    Biltytype: 1,
                    lineCount: { $size: { $ifNull: ["$DCData", []] } },
                },
            },
        ]);
        res.status(200).send(data);
    } catch (err) {
        res.status(400).send(err);
    }
}

export const getDcById = async (req, res) => {
    try {
        const data = await OrderDcModal.findById(req.params.id).lean();
        if (!data) return res.status(404).send("DC not found");
        res.status(200).send(data);
    } catch (err) {
        res.status(400).send(err);
    }
}
export const getDcNumber = async (req, res) => {
    try {
        const Data = await OrderDcModal.find().select({ DCCode: 1, BiltyAmount: 1, BiltyNumber: 1, DCDate: 1 })


        res.status(200).send(Data)
    } catch (err) {
        res.status(400).send(err)

    }
}
export const getBuiltyNumber = async (req, res) => {
    try {
        const { DCCode } = req.params
        const Data = await OrderDcModal.findOne({ DCCode: DCCode }).select({ DCCode: 1, BiltyAmount: 1, BiltyNumber: 1, DCDate: 1, DCData: 1 })


        res.status(200).send(Data)
    } catch (err) {
        res.status(400).send(err)

    }
}

export const UpdateDc = async (req, res) => {
    try {
        const { id } = req.params
        console.log(id)
        const { Store, DCData, Distrbutor, DCDate, Location } = req.body
        console.log(DCData)
        const Data = await OrderDcModal.findByIdAndUpdate(id, {
            Store, DCData, Distrbutor, DCDate, Location
        })


        res.status(200).send(Data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)

    }
}

export const UpdateDcStatus = async (req, res) => {
    try {
        const { id } = req.params
        console.log(id)
        const { status } = req.body

        const Data = await OrderDcModal.findByIdAndUpdate(id, {
            PostStatus: status
        })
        res.status(200).send(Data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)

    }
}

export const posteDc = async (req, res) => {
    const { PostStatus, Location, Store, DCCode, DCDate } = req.body;
    const { id } = req.params;

    console.log("posteDc", req.body)


    const session = await mongoose.startSession();

    try {
        let responsePayload;

        await session.withTransaction(async () => {
            const dcDoc = await OrderDcModal.findById(id).session(session);
            if (!dcDoc) {
                throw { statusCode: 404, message: "DC not found" };
            }
            const DCData = dcDoc.DCData;
            const Admin = await AdministrativeModal.find().session(session);

            /* =====================================================
               ======================= POST ========================
               ===================================================== */
            if (PostStatus === "False") {

                if (dcDoc.PostStatus === "Deliverd") {
                    throw { statusCode: 400, message: "DC already posted" };
                }

                /* ---------- STOCK CHECK ---------- */
                const stockChecks = await Promise.all(
                    DCData.map(async item => {
                        const product = await TotalProductModal.findOne({
                            ProductName: item.product,
                            Location,
                            Store
                        }).session(session);
                        return { product, item };
                    })
                );

                const insufficient = stockChecks.filter(
                    ({ product, item }) =>
                        !product || product.TotalQuantity < Number(item.DeliveredBox || 0)
                );

                if (insufficient.length) {
                    throw {
                        statusCode: 400,
                        data: insufficient,
                        message: "Insufficient stock"
                    };
                }

                /* ---------- STOCK DECREASE ---------- */
                const bulkOps = stockChecks.map(({ product, item }) => {
                    const rate = product.AvgRate || 0;
                    return {
                        updateOne: {
                            filter: {
                                ProductName: item.product,
                                Location,
                                Store
                            },
                            update: {
                                $inc: {
                                    TotalQuantity: -(item.DeliveredBox || 0),
                                    Amount: -(item.DeliveredBox || 0) * rate
                                }
                            }
                        }
                    };
                });

                await TotalProductModal.bulkWrite(bulkOps, { session });

                /* ---------- COGS VOUCHER ---------- */
                const totalCost = stockChecks.reduce(
                    (s, { product, item }) =>
                        s + (item.DeliveredBox || 0) * (product.AvgRate || 0),
                    0
                );

                await VoucherModal.create([{
                    VoucherType: "DCV",
                    VoucherNumber: `Dcv${DCCode}`,
                    VoucherDate: DCDate,
                    status: "Post",
                    VoucharData: [
                        { Account: Admin[0].finishedGoods, Credit: totalCost, store: Store },
                        { Account: Admin[0].COSTOFSALES, Debit: totalCost, store: Store }
                    ]
                }], { session });

                /* ---------- UPDATE ORDER DELIVER ---------- */
                for (const row of DCData) {
                    const { Order, product, DeliveredBox } = row;

                    const orderDoc = await DistributorSaleOrderModal.findOne({
                        OrderCode: Order,
                        "OrderData.product": product
                    }).session(session);

                    if (!orderDoc) continue;

                    const productRow = orderDoc.OrderData.find(p => p.product == product);
                    const existing = Number(productRow.Deliver || 0);

                    await DistributorSaleOrderModal.updateOne(
                        { OrderCode: Order, "OrderData.product": product },
                        { $set: { "OrderData.$.Deliver": existing + Number(DeliveredBox || 0) } },
                        { session }
                    );
                }

                /* ---------- ORDER STATUS ---------- */
                const uniqueOrders = [...new Set(DCData.map(d => d.Order))];

                for (const orderNo of uniqueOrders) {
                    const order = await DistributorSaleOrderModal.findOne({ OrderCode: orderNo }).session(session);
                    if (!order) continue;

                    const isDelivered = order.OrderData.every(
                        i => (Number(i.Deliver || 0) + Number(i.CancelBox || 0)) === Number(i.totalBox || 0)
                    );

                    const isPartial = order.OrderData.some(i => Number(i.Deliver || 0) > 0);

                    let status = "Process";
                    if (isDelivered) status = "Delivered";
                    else if (isPartial) status = "Partially Delivered";

                    await DistributorSaleOrderModal.updateOne(
                        { OrderCode: orderNo },
                        { $set: { PostStatus: status } },
                        { session }
                    );
                }

                await OrderDcModal.findByIdAndUpdate(id, { PostStatus: "Deliverd" }, { session });

                responsePayload = { success: true, message: "DC Posted Successfully" };
            }

            /* =====================================================
               ====================== UNPOST =======================
               ===================================================== */
            else {

                if (dcDoc.PostStatus !== "Deliverd") {
                    throw { statusCode: 400, message: "DC already unposted" };
                }

                /* ---------- RESTORE STOCK ---------- */
                const stockOps = await Promise.all(
                    DCData.map(async item => {
                        const product = await TotalProductModal.findOne({
                            ProductName: item.product,
                            Location,
                            Store
                        }).session(session);
                        const rate = product?.AvgRate || 0;

                        return {
                            updateOne: {
                                filter: { ProductName: item.product, Location, Store },
                                update: {
                                    $inc: {
                                        TotalQuantity: item.DeliveredBox || 0,
                                        Amount: (item.DeliveredBox || 0) * rate
                                    }
                                },
                                upsert: true
                            }
                        };
                    })
                );

                await TotalProductModal.bulkWrite(stockOps, { session });

                /* ---------- REVERSE ORDER DELIVER ---------- */
                for (const row of DCData) {
                    const { Order, product, DeliveredBox } = row;

                    const orderDoc = await DistributorSaleOrderModal.findOne({
                        OrderCode: Order,
                        "OrderData.product": product
                    }).session(session);

                    if (!orderDoc) continue;

                    const productRow = orderDoc.OrderData.find(p => p.product == product);
                    const newDeliver = Math.max(
                        Number(productRow.Deliver || 0) - Number(DeliveredBox || 0),
                        0
                    );

                    await DistributorSaleOrderModal.updateOne(
                        { OrderCode: Order, "OrderData.product": product },
                        { $set: { "OrderData.$.Deliver": newDeliver } },
                        { session }
                    );
                }

                /* ---------- RECHECK STATUS ---------- */
                const uniqueOrders = [...new Set(DCData.map(d => d.Order))];

                for (const orderNo of uniqueOrders) {
                    const order = await DistributorSaleOrderModal.findOne({ OrderCode: orderNo }).session(session);
                    if (!order) continue;

                    const isDelivered = order.OrderData.every(
                        i => (Number(i.Deliver || 0) + Number(i.CancelBox || 0)) === Number(i.totalBox || 0)
                    );

                    const isPartial = order.OrderData.some(i => Number(i.Deliver || 0) > 0);

                    let status = "Process";
                    if (isDelivered) status = "Delivered";
                    else if (isPartial) status = "Partially Delivered";

                    await DistributorSaleOrderModal.updateOne(
                        { OrderCode: orderNo },
                        { $set: { PostStatus: status } },
                        { session }
                    );
                }

                await VoucherModal.findOneAndDelete({ VoucherNumber: `Dcv${DCCode}` }, { session });
                await OrderDcModal.findByIdAndUpdate(id, { PostStatus: "False" }, { session });

                responsePayload = { success: true, message: "DC Unposted Successfully" };
            }
        });

        return res.json(responsePayload);

    } catch (err) {
        console.error(err);

        if (err.statusCode) {
            return res.status(err.statusCode).json({
                success: false,
                ...(err.message && { message: err.message }),
                ...(err.data && { data: err.data })
            });
        }

        return res.status(500).json({ success: false, message: "Server Error", error: err.message });
    } finally {
        await session.endSession();
    }
};

// export const posteDc = async (req, res) => {
//     const { PostStatus, Location, Store, DCCode, DCDate } = req.body;
//     const { id } = req.params;

//     try {


//         const dcDoc = await OrderDcModal.findById(id);
//         if (!dcDoc) {
//             return res.status(404).json({ success: false, message: "DC not found" });
//         }
//         const DCData = dcDoc.DCData
//         const Admin = await AdministrativeModal.find();

//         /* =====================================================
//            ======================= POST ========================
//            ===================================================== */
//         if (PostStatus === "False") {

//             if (dcDoc.PostStatus === "Deliverd") {
//                 return res.status(400).json({
//                     success: false,
//                     message: "DC already posted"
//                 });
//             }

//             /* ---------- STOCK CHECK ---------- */
//             const stockChecks = await Promise.all(
//                 DCData.map(async item => {
//                     const product = await TotalProductModal.findOne({
//                         ProductName: item.product,
//                         Location,
//                         Store
//                     });
//                     return { product, item };
//                 })
//             );

//             const insufficient = stockChecks.filter(
//                 ({ product, item }) =>
//                     !product || product.TotalQuantity < Number(item.DeliveredBox || 0)
//             );

//             if (insufficient.length) {
//                 return res.status(400).json({
//                     success: false,
//                     data: insufficient,
//                     message: "Insufficient stock"
//                 });
//             }

//             /* ---------- STOCK DECREASE ---------- */
//             const bulkOps = stockChecks.map(({ product, item }) => {
//                 const rate = product.AvgRate || 0;
//                 return {
//                     updateOne: {
//                         filter: {
//                             ProductName: item.product,
//                             Location,
//                             Store
//                         },
//                         update: {
//                             $inc: {
//                                 TotalQuantity: -(item.DeliveredBox || 0),
//                                 Amount: -(item.DeliveredBox || 0) * rate
//                             }
//                         }
//                     }
//                 };
//             });

//             await TotalProductModal.bulkWrite(bulkOps);

//             /* ---------- COGS VOUCHER ---------- */
//             const totalCost = stockChecks.reduce(
//                 (s, { product, item }) =>
//                     s + (item.DeliveredBox || 0) * (product.AvgRate || 0),
//                 0
//             );

//             await VoucherModal.create({
//                 VoucherType: "DCV",
//                 VoucherNumber: `Dcv${DCCode}`,
//                 VoucherDate: DCDate,
//                 status: "Post",
//                 VoucharData: [
//                     { Account: Admin[0].finishedGoods, Credit: totalCost, store: Store },
//                     { Account: Admin[0].COSTOFSALES, Debit: totalCost, store: Store }
//                 ]
//             });

//             /* ---------- UPDATE ORDER DELIVER ---------- */
//             for (const row of DCData) {
//                 const { Order, product, DeliveredBox } = row;

//                 const orderDoc = await DistributorSaleOrderModal.findOne({
//                     OrderCode: Order,
//                     "OrderData.product": product
//                 });

//                 if (!orderDoc) continue;

//                 const productRow = orderDoc.OrderData.find(p => p.product == product);
//                 const existing = Number(productRow.Deliver || 0);

//                 await DistributorSaleOrderModal.updateOne(
//                     { OrderCode: Order, "OrderData.product": product },
//                     { $set: { "OrderData.$.Deliver": existing + Number(DeliveredBox || 0) } }
//                 );
//             }

//             /* ---------- ORDER STATUS ---------- */
//             const uniqueOrders = [...new Set(DCData.map(d => d.Order))];

//             for (const orderNo of uniqueOrders) {
//                 const order = await DistributorSaleOrderModal.findOne({ OrderCode: orderNo });
//                 if (!order) continue;

//                 const isDelivered = order.OrderData.every(
//                     i => (Number(i.Deliver || 0) + Number(i.CancelBox || 0)) === Number(i.totalBox || 0)
//                 );

//                 const isPartial = order.OrderData.some(i => Number(i.Deliver || 0) > 0);

//                 let status = "Process";
//                 if (isDelivered) status = "Delivered";
//                 else if (isPartial) status = "Partially Delivered";
//                 console.log(status)
//                 await DistributorSaleOrderModal.updateOne(
//                     { OrderCode: orderNo },
//                     { $set: { PostStatus: status } }
//                 );
//             }

//             await OrderDcModal.findByIdAndUpdate(id, { PostStatus: "Deliverd" });

//             return res.json({ success: true, message: "DC Posted Successfully" });
//         }

//         /* =====================================================
//            ====================== UNPOST =======================
//            ===================================================== */
//         else {

//             if (dcDoc.PostStatus !== "Deliverd") {
//                 return res.status(400).json({
//                     success: false,
//                     message: "DC already unposted"
//                 });
//             }

//             /* ---------- RESTORE STOCK ---------- */
//             const stockOps = await Promise.all(
//                 DCData.map(async item => {
//                     const product = await TotalProductModal.findOne({
//                         ProductName: item.product,
//                         Location,
//                         Store
//                     });
//                     const rate = product?.AvgRate || 0;

//                     return {
//                         updateOne: {
//                             filter: { ProductName: item.product, Location, Store },
//                             update: {
//                                 $inc: {
//                                     TotalQuantity: item.DeliveredBox || 0,
//                                     Amount: (item.DeliveredBox || 0) * rate
//                                 }
//                             },
//                             upsert: true
//                         }
//                     };
//                 })
//             );

//             await TotalProductModal.bulkWrite(stockOps);

//             /* ---------- REVERSE ORDER DELIVER ---------- */
//             for (const row of DCData) {
//                 const { Order, product, DeliveredBox } = row;

//                 const orderDoc = await DistributorSaleOrderModal.findOne({
//                     OrderCode: Order,
//                     "OrderData.product": product
//                 });

//                 if (!orderDoc) continue;

//                 const productRow = orderDoc.OrderData.find(p => p.product == product);
//                 const newDeliver = Math.max(
//                     Number(productRow.Deliver || 0) - Number(DeliveredBox || 0),
//                     0
//                 );

//                 await DistributorSaleOrderModal.updateOne(
//                     { OrderCode: Order, "OrderData.product": product },
//                     { $set: { "OrderData.$.Deliver": newDeliver } }
//                 );
//             }

//             /* ---------- RECHECK STATUS ---------- */
//             const uniqueOrders = [...new Set(DCData.map(d => d.Order))];

//             for (const orderNo of uniqueOrders) {
//                 const order = await DistributorSaleOrderModal.findOne({ OrderCode: orderNo });
//                 if (!order) continue;

//                 const isDelivered = order.OrderData.every(
//                     i => (Number(i.Deliver || 0) + Number(i.CancelBox || 0)) === Number(i.totalBox || 0)
//                 );

//                 const isPartial = order.OrderData.some(i => Number(i.Deliver || 0) > 0);

//                 let status = "Process";
//                 if (isDelivered) status = "Delivered";
//                 else if (isPartial) status = "Partially Delivered";

//                 await DistributorSaleOrderModal.updateOne(
//                     { OrderCode: orderNo },
//                     { $set: { PostStatus: status } }
//                 );
//             }

//             await VoucherModal.findOneAndDelete({ VoucherNumber: `Dcv${DCCode}` });
//             await OrderDcModal.findByIdAndUpdate(id, { PostStatus: "False" });

//             return res.json({ success: true, message: "DC Unposted Successfully" });
//         }

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, message: "Server Error", error: err.message });
//     }
// };


export const GetDcNotEqualFalse = async (req, res) => {
    try {
        const data = await OrderDcModal.find({ PostStatus: "Deliverd", Invoice: { $eq: null }, BiltyAmount: { $ne: null } })
        console.log(data)
        res.status(200).send(data)
    }
    catch (err) {
        res.status(400).send(err)
    }
}


export const deleteSaleOrderDC = async (req, res) => {
    try {
        const { id } = req.params
        const data = await OrderDcModal.findByIdAndDelete(id)
        res.status(200).send(data)
    }
    catch (err) {
        res.status(400).send(err)
    }
}



export const closeAllOrder = async (req, res) => {
    try {
        const data = await OrderDcModal.find();

        for (const item of data) {
            for (const dc of item.DCData) {
                console.log(dc)
                await DistributorSaleOrderModal.findOneAndUpdate(
                    { OrderCode: dc.Order },
                    { PostStatus: "Deliverd" }
                );
            }
        }

        res.status(200).send({ message: "All orders marked as delivered." });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Something went wrong." });
    }
};

export const DcByDate = async (req, res) => {
    try {
        const { startDate, endDate } = req.query
        const data = await DistributorSaleOrderModal.aggregate([
            {
                $addFields: {
                    OrderDateObj: { $toDate: "$OrderDate" }
                }
            },
            {
                $match: {
                    OrderDateObj: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate),
                    },

                },
            },
            { $unwind: "$OrderData" },
            {
                $group: {
                    _id: {
                        Client: "$Distrbutor",
                        Rowid: "$OrderData.id",
                        OrderCode: "$OrderCode",
                        status: "$PostStatus",
                        DCDate: "$OrderDateObj",
                        Order: "$OrderData.Order",
                        Store: "$Store",
                        Product: "$OrderData.product",
                        OrderBox: "$OrderData.totalBox",
                        DeliveredBox: "$OrderData.Deliver",
                        CancelBox: "$OrderData.CancelBox"
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    row: "$_id.Rowid",
                    Client: "$_id.Client",
                    OrderCode: "$_id.OrderCode",
                    status: "$_id.status",
                    DCDate: "$_id.DCDate",
                    Order: "$_id.Order",
                    Product: "$_id.Product",
                    OrderBox: "$_id.OrderBox",
                    DeliveredBox: "$_id.DeliveredBox",
                    Store: "$_id.Store",
                    CanceledBox: "$_id.CancelBox",
                },
            },
        ]);

        const findData = data.filter((item) => item.status == "Partially Delivered" || item.status == "Process")

        res.status(200).send(findData);

    } catch (err) {
        console.log(err)
        res.status(400).send(err)

    }
}
