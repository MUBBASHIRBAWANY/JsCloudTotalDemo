import SaleOrderDcModal from "../modal/SaleOrderDcModal.js"
import SaleOrderModal from "../modal/SaleOrderModal.js";
import TotalProductModal from "../modal/TotalProductModal.js";



export const CreateSaleOrderDC = async (req, res) => {
    const { OrderBooker, Distributor } = req.body

    try {
        const OrderData = await SaleOrderModal.find({ OrderBookerId: OrderBooker, Status: true }).sort({ _id: -1 })
        console.log(OrderData)

        for (const item of OrderData) {
            const stockChecks = await Promise.all(
                item.SaleOrderData.map(async item => {

                    const product = await TotalProductModal.findOne({
                        ProductName: item.product,
                        Distrbutor: Distributor

                    });
                    return { product, item };
                })
            );

            const errors = stockChecks.filter(({ product, item }) =>
                !product || product.TotalQuantity < (item.totalBox || 0)
            );

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    errors: errors.map(({ product, item }) =>
                        !product
                            ? [`${item.product}`]
                            : {
                                product: product.ProductName,
                                qty: product.TotalQuantity,
                                required: item.Delivered
                            }
                    )
                });
            }
            else {
                const lastcode = await SaleOrderDcModal.find().sort({ _id: -1 }).limit(1)
                let nextCode
                if (lastcode.length == 0) {
                    const nextNumber = parseInt("00000000", 10) + 1;
                    nextCode = nextNumber.toString().padStart(6, '0')
                }
                else {
                    const nextNumber = parseInt(OrderNumber.OrderCode, 10) + 1;
                    console.log(nextNumber)
                    nextCode = nextNumber.toString().padStart(8, '0')

                }
                const allData = {
                    DcNumber: nextCode,
                    OrderNumber: item.SaleOrderNumber,
                    Customer: item.Customer,
                    DcDate: new Date().toISOString().split('T')[0],
                    Distrbutor: Distributor,
                    Status: "Dliverd",
                    DcData: item.SaleOrderData.map(i => ({
                        product: i.product,
                        DeliveredBox: i.totalBox,
                        box: i.box,
                        carton: i.carton,
                    })),
                }
                //const UpdateOrderStatus = await SaleOrderModal.findByIdAndUpdate(item._id, { Status: "Dc Created" })
                console.log(allData)
            }
        }

    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong", err)
    }
}

export const UpdateSaleOrderDC = async (req, res) => {
    const { DcData, Location, Store } = req.body
    const { id } = req.params
    try {
        const stockChecks = await Promise.all(
            DcData.map(async item => {
                const product = await TotalProductModal.findOne({
                    ProductName: item.product,
                    Location: Location,
                    Store: Store
                });
                return { product, item };
            })
        );

        const errors = stockChecks.filter(({ product, item }) =>
            !product || product.TotalQuantity < (item.Delivered || 0)
        );

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: errors.map(({ product, item }) =>
                    !product
                        ? [`${item.product}`]
                        : {
                            product: product.ProductName,
                            qty: product.TotalQuantity,
                            required: item.Delivered
                        }
                )
            });
        }
        else {
            const data = await SaleOrderDcModal.findByIdAndUpdate(id, req.body)
            const findedData = await SaleOrderDcModal.findById(id)
            res.send({ status: true, data: findedData });
        }
    }
    catch (err) {
        res.status(400).send("some thing went wrong", err)
    }
}

export const GetAllSaleOrderDC = async (req, res) => {
    try {
        const data = await SaleOrderDcModal.find().sort({ _id: -1 })
        res.send({ status: true, data: data });

    }
    catch (err) {
        res.status(400).send("some thing went wrong", err)
    }
}


export const LastSaleOrderDC = async (req, res) => {
    try {
        const data = await SaleOrderDcModal.find().sort({ _id: -1 }).limit(1)
        res.send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong", err)
    }
}

export const DeleteSaleOrderDC = async (req, res) => {
    const { id } = req.params
    console.log(id)
    try {
        const Dc = await SaleOrderDcModal.findById(id)
        if (Dc.Status == "true") {
            res.status(400).send("First Unpost")
        }
        const invoice = await SalesInvoiceModal.find({ DcNumber: Dc.DcNum })
        if (invoice.length !== 0) {
            res.status(400).send(`it is used in ${invoice[0].SalesInvoice}`)
        }
        else {

            const data = await SaleOrderDcModal.findByIdAndDelete(id)
            res.status(200).send("data Delete")
        }
    }
    catch (err) {
        console.log(err)
        // res.status(400).send("some thing went wrong", err)
    }
}


export const updateOrderStatusDC = async (req, res) => {
    const {
        Store,
        CostAccount,
        ProductData,
        FinshedAccount,
        Location,
        status,
        DcNum,
        Date,
        data,
        id,
    } = req.body;

    console.log(req.body, "first");

    try {
        const AccountValue = data.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

        // ✅ Correct method
        const OrderDC = await SaleOrderDcModal.findById(id);

        // ✅ Build stock checks
        const stockChecks = await Promise.all(
            ProductData.map(async (item) => {
                const product = await TotalProductModal.findOne({
                    ProductName: item.product,
                    Store: item.Store,
                    Location: item.Location,
                });
                return { product, item };
            })
        );

        if (status === true) {


            if (!OrderDC) {
                return res.status(404).json({ success: false, message: "DC not found" });
            }

            // ✅ If already posted or serviced → exit
            if (OrderDC.Status === true || OrderDC.Status === "Serviced") {
                return res
                    .status(400)
                    .json({ success: false, message: `DC ${OrderDC._id} is already ${OrderDC.Status}` });
            }
            // ✅ Check stock availability
            const insufficient = stockChecks.filter(({ product, item }) => {
                return !product || (product.TotalQuantity || 0) < (item.Delivered || 0);
            });

            if (insufficient.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for OrderDC ${OrderDC?._id}`,
                    errors: insufficient.map(({ product, item }) =>
                        !product
                            ? { productId: item.product, message: "Product not found" }
                            : {
                                product: product.ProductName,
                                available: product.TotalQuantity,
                                tryingToSell: item.Delivered,
                            }
                    ),
                });
            }

            // ✅ Deduct stock
            const bulkOps = stockChecks.map(({ product, item }) => {
                const avgRate = product?.AvgRate || 0;
                const calculatedAmount = (item.Delivered || 0) * avgRate;

                return {
                    updateOne: {
                        filter: {
                            ProductName: product?.ProductName,
                            Location,
                            Store,
                            TotalQuantity: { $gte: item.Delivered },
                        },
                        update: {
                            $inc: {
                                TotalQuantity: -Number(item.Delivered) || 0,
                                Amount: -calculatedAmount,
                            },
                        },
                    },
                };
            });

            const totalAmount = data.reduce((sum, item) => {
                return sum + parseFloat(item.netAmount || 0); // ✅ fixed typo
            }, 0);

            const AccountsData = [
                {
                    VoucherType: "Dc",
                    VoucherNumber: `Dc${DcNum}`,
                    status: "Post",
                    VoucherDate: Date,
                    VoucharData: [
                        {
                            Account: CostAccount,
                            Debit: AccountValue,
                            store: Store,
                        },
                        {
                            Account: FinshedAccount,
                            Credit: AccountValue,
                            store: Store,
                        },
                    ],
                },
            ];

            // ✅ Update SaleOrder remaining cartons
            for (const item of ProductData) {
                const { Order, product, Delivered } = item;

                const orderDoc = await SaleOrderModal.findOne({
                    SaleOrderNumber: Order,
                    "SaleOrderData.product": product,
                });

                if (!orderDoc) continue;

                const productEntry = orderDoc.SaleOrderData.find((p) => p.product == product);
                const remaining = Number(productEntry?.Remaingcarton || 0);
                const toDeliver = Number(Delivered);
                const newRemaining = remaining - toDeliver;

                if (remaining >= toDeliver) {
                    await SaleOrderModal.updateOne(
                        {
                            SaleOrderNumber: Order,
                            "SaleOrderData.product": product,
                        },
                        {
                            $set: {
                                "SaleOrderData.$.Remaingcarton": String(newRemaining),
                            },
                        }
                    );
                }
            }

            // ✅ Mark orders as complete if all delivered
            const updatedOrders = data.map((dc) => dc.Order);
            for (const orderNumber of updatedOrders) {
                const order = await SaleOrderModal.findOne({ SaleOrderNumber: orderNumber });

                if (order && order.SaleOrderData.every((p) => Number(p.Remaingcarton) === 0)) {
                    await SaleOrderModal.updateOne(
                        { SaleOrderNumber: orderNumber },
                        { $set: { Status: "Complete" } }
                    );
                }
            }
            await TotalProductModal.bulkWrite(bulkOps);
            await SaleOrderDcModal.findByIdAndUpdate(id, { Status: "true" }); // ✅ boolean
            await VoucherModal.create(AccountsData);

            return res.status(200).send("Status Updated");
        } else if (status === false) {
            // ✅ UNPOST logic
            const Dc = await SaleOrderDcModal.findById(id);
            const invoice = await SalesInvoiceModal.find({ DcNumber: Dc.DcNum });

            if (invoice.length !== 0) {
                return res.status(400).send(`it is used in ${invoice[0].SalesInvoice}`);
            }

            const allOps = [];
            for (const { product, item } of stockChecks) {
                const avgRate = product?.AvgRate || 0;
                const amount = (item.Delivered || 0) * avgRate;

                allOps.push({
                    updateOne: {
                        filter: {
                            ProductName: item.product,
                            Store,
                            Location,
                        },
                        update: {
                            $inc: {
                                TotalQuantity: Number(item.Delivered) || 0,
                                Amount: amount,
                            },
                            $setOnInsert: {
                                ProductName: item.product,
                                Store,
                                Location,
                            },
                        },
                        upsert: true,
                    },
                });
            }

            await TotalProductModal.bulkWrite(allOps);
            await SaleOrderDcModal.findByIdAndUpdate(id, { Status: false });
            await VoucherModal.deleteOne({ VoucherNumber: `Dc${DcNum}` });

            return res.status(200).send("Stock Reverted Successfully");
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
};


export const GetOnlyTrueDC = async (req, res) => {
    try {
        const data = await SaleOrderDcModal.find({ Status: true }).sort({ _id: -1 })
        res.status(200).send({
            status: true,
            data: data
        });
    }
    catch (err) {
        res.status(400).send("some thing went wrong", err)
    }
}