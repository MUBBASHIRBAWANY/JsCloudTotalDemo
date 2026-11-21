import SalesInvoiceModal from "../Modal/SalesInvoiceModal.js";
import TotalProductModal from "../Modal/TotalProductModal.js";
import OpeningInventoryModal from "../Modal/OpeningInventoryModal.js"
import InvoiceOpeningModal from "../Modal/OpeningInvoicesModal.js";
import VoucherModal from "../Modal/VoucherModal.js";
import CutomerModal from "../Modal/CutomerModal.js";
import ProductModal from "../Modal/ProductModal.js";
import { createSystemVoucher } from "./VoucherControllar.js";
import { OrderBooker } from "../App.js";
import DistrbutorInvoiceModal from "../Modal/DistrbutorInvoiceModal.js";
import DistrbutorModal from "../Modal/DistributerModal.js";
import OrderDcModal from "../Modal/SaleOrderDcModal.js";
import DistributorSaleOrderModal from "../Modal/DistributorSaleOrderModal.js";
import CustomerChqRecivedModal from "../Modal/CustomerChqRecivedModal.js";
import PaymentRecivedModal from "../Modal/PaymentRecivedModal.js";
import SalesReturnModal from "../Modal/SalesReturnModal.js";
import ClientOpeningBalanceModal from "../Modal/ClientOpeningBalanceModal.js";
import StoreModal from "../Modal/StoreModal.js";
import { checkMonthClose } from "../utils/checkMonthClose.js";
import {
    collectVoucherPayments,
    paymentsForInvoice,
    toReportNumber,
    uniqueRefs
} from "../utils/invoicePaymentAging.js";
import mongoose from "mongoose";
import { applyDistributorAgingMatch, applyRebuildOpenFromBottom, describeAgingMatch, describeRebuildOpenFromBottom } from "../utils/distributorAgingMatch.js";


export const createSalesInvoice = async (req, res) => {
    const monthCheck = await checkMonthClose(req, res, "SaleInvoiceDate");
    if (monthCheck) return;

    const { Client, SaleInvoiceData, SaleInvoiceDate, SalesFlowRef, Store, Location, RemainingAmount, TotalAmount } = req.body

    try {
        const code = await SalesInvoiceModal.findOne().sort({ _id: -1 }).limit(1)
        console.log(code)
        let nextCode
        if (code == null) {
            const nextNumber = parseInt("000000", 10) + 1;
            nextCode = nextNumber.toString().padStart(6, '0')
        }
        else {
            const nextNumber = parseInt(code.SalesInvoice, 10) + 1;
            console.log(nextNumber)
            nextCode = nextNumber.toString().padStart(6, '0')
        }
        const stockChecks = await Promise.all(
            SaleInvoiceData.map(async item => {
                const product = await TotalProductModal.findOne({
                    ProductName: item.product,
                    Location: Location,
                    Store: Store
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
                            required: item.totalBox
                        }
                )
            });
        }

        else {
            const data = await SalesInvoiceModal.create({
                SalesInvoice: nextCode,
                SalesData: SaleInvoiceData,
                Client,
                SalesInvoiceDate: SaleInvoiceDate,
                SalesFlowRef,
                PostStatus: false,
                Store,
                Location,
                RemainingAmount,
                TotalAmount

            })

            res.status(200).send(data)
        }

    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}

export const getAllSaleInvoice = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 200;
        const skip = (page - 1) * limit;
        console.log(req.query)
        // 1️⃣ Fetch paginated invoices with count in parallel for better performance
        const filter = { PostStatus: { $in: [false] } };
        const [invoices, total] = await Promise.all([
            SalesInvoiceModal.find(filter)
                .lean()
                .skip(skip)
                .limit(limit)
                .sort({ _id: -1 }),

            SalesInvoiceModal.countDocuments(filter),
        ]);
        // 2️⃣ If no invoices, return early
        if (invoices.length === 0) {
            return res.status(200).json({
                success: true,
                total: 0,
                page,
                limit,
                data: [],
            });
        }

        // 3️⃣ Collect unique customer IDs
        const customerIds = [
            ...new Set(invoices.map(inv => inv.Client).filter(Boolean))
        ].map(id => new mongoose.Types.ObjectId(id));

        // 4️⃣ Fetch all customers in one query
        const customers = await CutomerModal.find({ _id: { $in: customerIds } })
            .lean()
            .select("_id CutomerName CustomerCode City Area");

        // 5️⃣ Map customers by ID for quick lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c._id.toString()] = c;
        });

        // 6️⃣ Merge customer info into each invoice
        const mergedData = invoices.map(inv => ({
            ...inv,
            ClientDetails: customerMap[inv.Client?.toString()] || null,
        }));

        res.status(200).json({
            success: true,
            total,
            page,
            limit,
            data: mergedData,
        });

    } catch (err) {
        console.error("Error fetching invoices:", err);
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
export const getLimitedSaleInvoice = async (req, res) => {
    try {
        const data = await SalesInvoiceModal.find().sort({ _id: -1 }).limit(500)
            .sort({ SalesInvoice: -1 })
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }

}

export const UpdateSalesInvoice = async (req, res) => {
    const monthCheck = await checkMonthClose(req, res, "SaleInvoiceDate");
    if (monthCheck) return;

    const { id } = req.params
    const { Client, SaleInvoiceData, SaleInvoiceDate, SalesFlowRef, Remarks } = req.body
    try {
        const stockChecks = await Promise.all(
            SaleInvoiceData.map(async item => {
                const product = await TotalProductModal.findOne({ ProductName: item.product });
                return { product, item };
            })
        );

        const errors = stockChecks.filter(({ product, item }) =>
            !product || product.TotalQuantity < (item.totalBox || 0)
        );

        console.log(errors)
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: errors.map(({ product, item }) =>
                    !product
                        ? `${item.product}`
                        : [{
                            product: `${product.ProductName}`,
                            qty: `${product.TotalQuantity}`,
                            Req: `${item.totalBox}`
                        }]


                )
            });
        }
        else {
            const data = await SalesInvoiceModal.findByIdAndUpdate(id, {
                SalesData: SaleInvoiceData,
                Client,
                SalesInvoiceDate: SaleInvoiceDate,
                SalesFlowRef,
                Remarks,

                PostStatus: false
            })
            console.log(data)
            res.status(200).send(data)
        }

    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}


export const deleteSaleInvoice = async (req, res) => {
    const { id } = req.params
    console.log(id)
    try {
        const findTrue = await SalesInvoiceModal.find({ _id: id })
        console.log(findTrue)
        if (findTrue[0].PostStatus == true) {
            return res.status(400).send("invoice Posted");
        }
        else {
            const data = await SalesInvoiceModal.findByIdAndDelete(id)
            res.status(200).send("invoice Posted");
        }


        // res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")
    }
}
// Helper: handles one invoice post/unpost
const processSingleInvoice = async ({ status, SalesData, Location, Store, SalesInvoice, id }) => {

    if (!SalesData || !Array.isArray(SalesData)) {
        throw new Error("Missing or invalid Sales data");
    }

    if (status === true) {
        const checkPost = await SalesInvoiceModal.findById(id);

        if (checkPost.PostStatus === true) {
            throw new Error("Invoice already posted");
        }

        const stockChecks = await Promise.all(
            SalesData.map(async (item) => {
                const product = await TotalProductModal.findOne({
                    ProductName: item.product,
                    Location,
                    Store
                });
                return { product, item };
            })
        );

        const insufficientStock = stockChecks.filter(({ product, item }) =>
            !product || (product.TotalQuantity || 0) < (item.totalBox || 0)
        );
        console.log(insufficientStock)
        if (insufficientStock.length > 0) {
            console.log(insufficientStock)
            const product = await ProductModal.findById(insufficientStock[0].item.product)
            throw new Error(`${product.salesFlowRef} ${product.ProductName} your demand is ${insufficientStock[0].item.totalBox}  But Avalible ${insufficientStock[0].product.TotalQuantity}`);
        }

        const bulkOps = stockChecks.map(({ product, item }) => {
            const avgRate = product.AvgRate || 0;
            const calculatedAmount = (item.totalBox || 0) * avgRate;

            return {
                updateOne: {
                    filter: {
                        ProductName: item.product,
                        Location,
                        Store,
                        TotalQuantity: { $gte: item.totalBox }
                    },
                    update: {
                        $inc: {
                            TotalQuantity: -Number(item.totalBox) || 0,
                            Amount: -calculatedAmount
                        }
                    }
                }
            };
        });

        await TotalProductModal.bulkWrite(bulkOps);
        await SalesInvoiceModal.findByIdAndUpdate(id, { PostStatus: true });

        return { success: true, message: "Invoice posted successfully" };
    }
    else {
        const checkPost = await SalesInvoiceModal.findById(id);
        if (checkPost?.PostStatus === false) {
            throw new Error("Invoice already unposted");
        }

        const stockData = await Promise.all(
            SalesData.map(async (item) => {
                const product = await TotalProductModal.findOne({
                    ProductName: item.product,
                    Location,
                    Store
                });
                return { product, item };
            })
        );

        const bulkOps = stockData.map(({ product, item }) => {
            const avgRate = product?.AvgRate || 0;
            const restoreAmount = (item.totalBox || 0) * avgRate;

            return {
                updateOne: {
                    filter: {
                        ProductName: item.product,
                        Location,
                        Store
                    },
                    update: {
                        $inc: {
                            TotalQuantity: Number(item.totalBox) || 0,
                            Amount: restoreAmount
                        },
                        $setOnInsert: {
                            ProductName: item.product,
                            Location,
                            Store
                        }
                    },
                    upsert: true
                }
            };
        });

        await TotalProductModal.bulkWrite(bulkOps);

        await SalesInvoiceModal.findByIdAndUpdate(id, { PostStatus: false });

        return { success: true, message: "Invoice unposted successfully" };
    }
};


export const postSalesinvoice = async (req, res) => {
    const { status, data: SalesData, Location, Store, SalesInvoice } = req.body;
    const { id } = req.params;

    if (!SalesData || !Array.isArray(SalesData)) {
        return res.status(400).json({
            success: false,
            message: "Missing or invalid Sales data"
        });
    }

    const session = await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            if (status === true) {
                const checkPost = await SalesInvoiceModal.findById(id).session(session);

                if (checkPost.PostStatus === true) {
                    throw { statusCode: 400, message: "Invoice already posted" };
                }

                // Fetch all related products
                const stockChecks = await Promise.all(
                    SalesData.map(async (item) => {
                        const product = await TotalProductModal.findOne({
                            ProductName: item.product,
                            Location,
                            Store
                        }).session(session);
                        return { product, item };
                    })
                );

                // Check for stock and avg rate
                const insufficientStock = stockChecks.filter(({ product, item }) =>
                    !product || (product.TotalQuantity || 0) < (item.totalBox || 0)
                );

                if (insufficientStock.length > 0) {
                    throw {
                        statusCode: 400,
                        message: "Insufficient stock to post invoice",
                        errors: insufficientStock.map(({ product, item }) =>
                            !product
                                ? { productId: item.product, message: "Product not found" }
                                : {
                                    product: product.ProductName,
                                    available: product.TotalQuantity,
                                    tryingToSell: item.totalBox
                                }
                        )
                    };
                }

                // Build bulk operations with calculated amount
                const bulkOps = stockChecks.map(({ product, item }) => {
                    const avgRate = product.AvgRate || 0;
                    const calculatedAmount = (item.totalBox || 0) * avgRate;

                    return {
                        updateOne: {
                            filter: {
                                ProductName: item.product,
                                Location,
                                Store,
                                TotalQuantity: { $gte: item.totalBox }
                            },
                            update: {
                                $inc: {
                                    TotalQuantity: -Number(item.totalBox) || 0,
                                    Amount: -calculatedAmount
                                }
                            }
                        }
                    };
                });

                await TotalProductModal.bulkWrite(bulkOps, { session });
                await SalesInvoiceModal.findByIdAndUpdate(
                    id,
                    { PostStatus: true },
                    { session }
                );

                result = {
                    success: true,
                    message: "Invoice posted, stock reduced, and amount updated"
                };

            } else {
                const checkPost = await SalesInvoiceModal.findById(id).session(session);

                if (checkPost?.PostStatus === false) {
                    throw { statusCode: 400, message: "Invoice already Unposted" };
                }

                const stockData = await Promise.all(
                    SalesData.map(async (item) => {
                        const product = await TotalProductModal.findOne({
                            ProductName: item.product,
                            Location,
                            Store
                        }).session(session);
                        return { product, item };
                    })
                );

                const bulkOps = stockData.map(({ product, item }) => {
                    const avgRate = product?.AvgRate || 0;
                    const restoreAmount = (item.totalBox || 0) * avgRate;

                    return {
                        updateOne: {
                            filter: {
                                ProductName: item.product,
                                Location,
                                Store
                            },
                            update: {
                                $inc: {
                                    TotalQuantity: Number(item.totalBox) || 0,
                                    Amount: restoreAmount
                                },
                                $setOnInsert: {
                                    ProductName: item.product,
                                    Location,
                                    Store
                                }
                            },
                            upsert: true
                        }
                    };
                });

                await TotalProductModal.bulkWrite(bulkOps, { session });
                await VoucherModal.findOneAndDelete(
                    { VoucherNumber: `SL${SalesInvoice}` },
                    { session }
                );
                await VoucherModal.findOneAndDelete(
                    { VoucherNumber: `Co${SalesInvoice}` },
                    { session }
                );
                await SalesInvoiceModal.findByIdAndUpdate(
                    id,
                    { PostStatus: false },
                    { session }
                );

                result = {
                    success: true,
                    message: "Invoice unposted, stock and amount restored"
                };
            }
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error("Error in postSalesinvoice:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                ...(error.errors && { errors: error.errors })
            });
        }

        return res.status(500).json({
            success: false,
            message: "An error occurred while processing the sales invoice"
        });
    } finally {
        session.endSession();
    }
};

// export const postSalesinvoice = async (req, res) => {
//     const { status, data: SalesData, Location, Store, SalesInvoice } = req.body;

//     const { id } = req.params;

//     if (!SalesData || !Array.isArray(SalesData)) {
//         return res.status(400).json({
//             success: false,
//             message: "Missing or invalid Sales data"
//         });
//     }

//     try {
//         if (status === true) {
//             const checkPost = await SalesInvoiceModal.findById(id);

//             if (checkPost.PostStatus === true) {
//                 console.log(checkPost.PostStatus)
//                 return res.status(400).json({
//                     success: false,
//                     message: "Invoice already posted"
//                 });
//             }
//             // Fetch all related products
//             const stockChecks = await Promise.all(
//                 SalesData.map(async (item) => {
//                     const product = await TotalProductModal.findOne({
//                         ProductName: item.product,
//                         Location,
//                         Store
//                     });
//                     return { product, item };
//                 })
//             );

//             // Check for stock and avg rate
//             const insufficientStock = stockChecks.filter(({ product, item }) =>
//                 !product || (product.TotalQuantity || 0) < (item.totalBox || 0)
//             );
//             console.log(insufficientStock)
//             if (insufficientStock.length > 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Insufficient stock to post invoice",
//                     errors: insufficientStock.map(({ product, item }) =>
//                         !product
//                             ? { productId: item.product, message: "Product not found" }
//                             : {
//                                 product: product.ProductName,
//                                 available: product.TotalQuantity,
//                                 tryingToSell: item.totalBox
//                             }
//                     )
//                 });
//             }

//             // Build bulk operations with calculated amount
//             const bulkOps = stockChecks.map(({ product, item }) => {
//                 const avgRate = product.AvgRate || 0;
//                 const calculatedAmount = (item.totalBox || 0) * avgRate;


//                 return {
//                     updateOne: {
//                         filter: {
//                             ProductName: item.product,
//                             Location,
//                             Store,
//                             TotalQuantity: { $gte: item.totalBox }
//                         },
//                         update: {
//                             $inc: {
//                                 TotalQuantity: -Number(item.totalBox) || 0,
//                                 Amount: -calculatedAmount
//                             }
//                         }
//                     }
//                 };
//             });

//             await TotalProductModal.bulkWrite(bulkOps);
//             await SalesInvoiceModal.findByIdAndUpdate(id, { PostStatus: true });

//             return res?.status(200).json({
//                 success: true,
//                 message: "Invoice posted, stock reduced, and amount updated"
//             });

//         } else {
//             const checkPost = await SalesInvoiceModal.findById(id);
//             if (checkPost?.PostStatus === false) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Invoice already Unposted"
//                 });
//             }
//             const stockData = await Promise.all(
//                 SalesData.map(async (item) => {
//                     const product = await TotalProductModal.findOne({
//                         ProductName: item.product,
//                         Location,
//                         Store
//                     });
//                     return { product, item };
//                 })
//             );

//             const bulkOps = stockData.map(({ product, item }) => {
//                 const avgRate = product?.AvgRate || 0;
//                 const restoreAmount = (item.totalBox || 0) * avgRate;

//                 return {
//                     updateOne: {
//                         filter: {
//                             ProductName: item.product,
//                             Location,
//                             Store
//                         },
//                         update: {
//                             $inc: {
//                                 TotalQuantity: Number(item.totalBox) || 0,
//                                 Amount: restoreAmount
//                             },
//                             $setOnInsert: {
//                                 ProductName: item.product,
//                                 Location,
//                                 Store
//                             }
//                         },
//                         upsert: true
//                     }
//                 };
//             });

//             await TotalProductModal.bulkWrite(bulkOps);
//             await VoucherModal.findOneAndDelete({ VoucherNumber: `SL${SalesInvoice}` });
//             await VoucherModal.findOneAndDelete({ VoucherNumber: `Co${SalesInvoice}` });
//             await SalesInvoiceModal.findByIdAndUpdate(id, { PostStatus: false });

//             return res.status(200).json({
//                 success: true,
//                 message: "Invoice unposted, stock and amount restored"
//             });
//         }
//     } catch (error) {
//         console.error("Error in postSalesinvoice:", error);
//         return res.status(500).json({
//             success: false,
//             message: "An error occurred while processing the sales invoice"
//         });
//     }
// };

export const BulkpostSalesinvoice = async (req, res) => {
    const { status, ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Missing or invalid invoice IDs"
        });
    }

    try {
        const invoices = await SalesInvoiceModal.find({ _id: { $in: ids } });

        if (invoices.length !== ids.length) {
            const foundIds = invoices.map(inv => inv._id.toString());
            const missing = ids.filter(id => !foundIds.includes(id));
            return res.status(404).json({
                success: false,
                message: "Some invoices not found",
                missing
            });
        }

        const allOps = [];

        for (const invoice of invoices) {
            const { SalesData, Store, Location, PostStatus } = invoice;

            if (!Array.isArray(SalesData) || SalesData.length === 0) continue;

            if (status === true && PostStatus === true) continue;
            if (status === false && PostStatus === false) continue;

            const stockChecks = await Promise.all(
                SalesData.map(async (item) => {
                    console.log("product of item", item)
                    const product = await TotalProductModal.findOne({
                        ProductName: item.product,
                        Store,
                        Location
                    });
                    return { product, item };
                })
            );


            if (status === true) {
                // const insufficient = stockChecks.filter(({ product, item }) => {
                //     !product || (product.TotalQuantity || 0) < (item.totalBox || 0)
                // }
                // );


                // if (insufficient.length > 0) {
                //     return res.status(400).json({
                //         success: false,
                //         message: `Insufficient stock for invoice ${invoice._id}`,
                //         errors: insufficient.map(({ product, item }) =>
                //             !product || product == null
                //                 ? { productId: item.product, message: "Product not found" }
                //                 : {
                //                     product: product.ProductName,
                //                     available: product.TotalQuantity,
                //                     tryingToSell: item.totalBox
                //                 }
                //         )
                //     });
                // }

                const bulkOps = stockChecks.map((item) => {
                    console.log(item?.product?.AvgRate, item.item.totalBox, Location,
                        Store,
                        item.product?.ProductName
                    )
                    const avgRate = item?.product?.AvgRate || 0;
                    const calculatedAmount = (item.item.totalBox || 0) * avgRate;
                    console.log(item.item.totalBox, item.product?.ProductName, item?.product?.AvgRate, Location, Store)

                    return {
                        updateOne: {
                            filter: {
                                ProductName: item.product?.ProductName,
                                Location,
                                Store,
                                TotalQuantity: { $gte: item.item.totalBox }
                            },
                            update: {
                                $inc: {
                                    TotalQuantity: -Number(item.item.totalBox) || 0,
                                    Amount: -calculatedAmount
                                }
                            }
                        }
                    };
                });

                await TotalProductModal.bulkWrite(bulkOps);
                invoice.PostStatus = true;
                await invoice.save();





            } else {
                // UNPOST logic: restore stock
                for (const { product, item } of stockChecks) {
                    const avgRate = product?.AvgRate || 0;
                    const amount = (item.totalBox || 0) * avgRate;

                    allOps.push({
                        updateOne: {
                            filter: {
                                _id: item.product,
                                Store,
                                Location
                            },
                            update: {
                                $inc: {
                                    TotalQuantity: Number(item.totalBox) || 0,
                                    Amount: amount
                                },
                                $setOnInsert: {
                                    _id: item.product,
                                    Store,
                                    Location
                                }
                            },
                            upsert: true
                        }
                    });
                }

                invoice.PostStatus = false;
                await invoice.save();
            }
        }

        if (allOps.length > 0) {
            await TotalProductModal.bulkWrite(allOps);
        }

        return res.status(200).json({
            success: true,
            message: `Invoices ${status ? 'posted' : 'unposted'} and stock updated`
        });

    } catch (error) {
        console.error("Error in postSalesinvoice:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while processing the sales invoices"
        });
    }
};



export const createSalesInvoiceBulk = async (req, res) => {
    const { invoices } = req.body;
    console.log(invoices)

    // Check month close for each invoice in bulk
    for (const invoice of invoices) {
        if (invoice.SalesInvoiceDate) {
            const fakeReq = { ...req, body: { SaleInvoiceDate: invoice.SalesInvoiceDate } };
            const monthCheck = await checkMonthClose(fakeReq, res, "SaleInvoiceDate");
            if (monthCheck) return;
        }
    }

    const customRound = (value) => {
        const num = parseFloat(value) || 0;
        const floor = Math.floor(num);
        const decimal = num - floor;

        if (decimal > 0.5) {
            return floor + 1; // round up
        }
        return floor; // round down (≤ 0.5)
    };

    try {
        const lastInvoice = await SalesInvoiceModal.findOne().sort({ SalesInvoice: -1 });
        let nextNumber = lastInvoice ? parseInt(lastInvoice.SalesInvoice, 10) + 1 : 1;
        const invoicePromises = invoices.map(async (invoice) => {
            const code = nextNumber.toString().padStart(6, '0');
            nextNumber++;
            return {
                SalesInvoice: code,
                SalesData: invoice.SalesData,
                Client: invoice.Client,
                SalesInvoiceDate: invoice.SalesInvoiceDate,
                SalesFlowRef: invoice.SalesFlowRef,
                PostStatus: false,
                Store: invoice.Store,
                Location: invoice.Location,
                OrderBooker: invoice.OrderBooker,
                RemainingAmount: customRound(Number(invoice.RemainingAmount)) - invoice.TTS || 0,
                RecivedAmount: invoice.RecivedAmount || 0,
                TotalAmount: customRound(Number(invoice.TotalAmount)) - invoice.TTS || 0,
                TTS: invoice.TTS || 0

            };
        });

        // Process all invoices
        const results = await Promise.allSettled(invoicePromises);

        // Handle errors
        const failedInvoices = results.filter(r => r.status === 'rejected');
        if (failedInvoices.length > 0) {
            return res.status(400).json({
                success: false,
                errors: failedInvoices.map(f => ({
                    code: f.reason.code,
                    issues: f.reason.errors
                }))
            });
        }

        // Insert successful invoices
        const validInvoices = results.map(r => r.value);
        const created = await SalesInvoiceModal.insertMany(validInvoices);

        res.status(200).json({
            success: true,
            data: created,
            message: `${created.length} invoice(s) created successfully`
        });

    } catch (err) {
        console.error('Bulk invoice error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to process bulk invoices',
            error: err.message
        });
    }
};


// Get all sales invoices where Amount is 0 (remaining amount is 0)
export const getOnlyRemain = async (req, res) => {
    console.log("first")
    try {
        //
        const data = await SalesInvoiceModal.find({ RemainingAmount: { $ne: 0, $exists: true } })

        res.status(200).send({ status: true, data });
    } catch (err) {
        res.status(400).send("some thing went wrong");
    }
};

export const getOnlyRemainInvoiceAmount = async (req, res) => {
    console.log("first")
    try {
        //
        const data = await SalesInvoiceModal.find({ RemainingAmount: { $ne: 0, $exists: true }, }, { SalesInvoice: 1, SalesInvoiceDate: 1, Client: 1, RemainingAmount: 1, SalesFlowRef: 1, Store: 1 })

        res.status(200).send({ status: true, data });
    } catch (err) {
        res.status(400).send("some thing went wrong");
    }
};

export const getOnlyRemainInvoice = async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        // Convert query params to Date
        const start = new Date(startDate);
        const end = new Date(endDate);

        // MongoDB aggregate query
        const data = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    RemainingAmount: { $ne: 0, $exists: true },
                    PostStatus: true
                },
            }
        ])

        // Fetch Opening invoices
        const OpeningInvoices = await InvoiceOpeningModal.find();

        const Opening = (OpeningInvoices[0]?.InvoiceData || []).filter((item) => {
            const d = new Date(item.date); // item.date is string like "2025-09-18"
            return d >= start && d <= end;
        });

        // console.log(Opening.length, "Filtered Opening2");
        const totaldata = Opening.concat(data)
        console.log(totaldata.length)
        res.status(200).send({ data: totaldata });
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }
};



export const getOnlySummry = async (req, res) => {
    const { startDate, endDate, Store } = req.query;

    try {
        // MongoDB aggregate query
        const data = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    RemainingAmount: { $ne: 0, $exists: true },
                    RecivedAmount: { $eq: 0, $exists: true },

                    PostStatus: true
                },
            }
        ])
        //AccountArray.includes(item?.Account)
        // Fetch Opening invoices

        if (Store && Store !== "") {
            const allData = data.filter(item => Store.includes(item?.Store));
            console.log(Store)
            res.status(200).send({ data: allData });
        }
        else {
            console.log(data)
            res.status(200).send({ data: data });
        }
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }
};
export const SalesinvoiceSummry = async (req, res) => {
    const { startDate, endDate, Store } = req.query;

    try {
        /* =========================
           NORMAL SALES (data1)
        ========================== */
        const data1 = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: {
                        $gte: startDate,
                        $lte: endDate
                    },
                    PostStatus: true
                }
            },
            { $unwind: "$SalesData" },

            {
                $group: {
                    _id: {
                        SalesInvoice: "$SalesInvoice",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                        Store: "$Store",
                        Location: "$Location",
                        Client: "$Client",
                        OrderBooker: "$OrderBooker",
                        SalesFlowRef: "$SalesFlowRef",
                        TTS: "$TTS",
                        TotalAmount: "$TotalAmount"
                    },

                    carton: { $sum: { $convert: { input: "$SalesData.totalBox", to: "double", onError: 0, onNull: 0 } } },
                    Gst: { $sum: { $convert: { input: "$SalesData.Gst", to: "double", onError: 0, onNull: 0 } } },
                    GrossAmount: { $sum: { $convert: { input: "$SalesData.TotalValueExclGst", to: "double", onError: 0, onNull: 0 } } },
                    ProductAmount: { $sum: { $convert: { input: "$SalesData.netAmunt", to: "double", onError: 0, onNull: 0 } } },
                    Advancetax: { $sum: { $convert: { input: "$SalesData.AdvanceTax", to: "double", onError: 0, onNull: 0 } } },

                    // Discounts
                    diBspass: { $sum: { $convert: { input: "$SalesData.diBspass", to: "double", onError: 0, onNull: 0 } } },
                    RToffer: { $sum: { $convert: { input: "$SalesData.RToffer", to: "double", onError: 0, onNull: 0 } } },
                    WToffer: { $sum: { $convert: { input: "$SalesData.WToffer", to: "double", onError: 0, onNull: 0 } } },
                    RpDrive: { $sum: { $convert: { input: "$SalesData.RpDrive", to: "double", onError: 0, onNull: 0 } } },
                    WHOLESALEDEAL: { $sum: { $convert: { input: "$SalesData.WHOLESALEDEAL", to: "double", onError: 0, onNull: 0 } } },
                    RTWholeSale: { $sum: { $convert: { input: "$SalesData.RTWholeSale", to: "double", onError: 0, onNull: 0 } } },
                    SubDisTPromotion: { $sum: { $convert: { input: "$SalesData.SubDisTPromotion", to: "double", onError: 0, onNull: 0 } } },
                    TradeOffer: { $sum: { $convert: { input: "$SalesData.TradeOffer", to: "double", onError: 0, onNull: 0 } } },
                    HOTZONEDRIVE: { $sum: { $convert: { input: "$SalesData.HOTZONEDRIVE", to: "double", onError: 0, onNull: 0 } } },
                    SPECIALDISCOUNT: { $sum: { $convert: { input: "$SalesData.SPECIALDISCOUNT", to: "double", onError: 0, onNull: 0 } } },
                    SpecialTO: { $sum: { $convert: { input: "$SalesData.SpecialTO", to: "double", onError: 0, onNull: 0 } } },
                    ClaimableSpecialTO: { $sum: { $convert: { input: "$SalesData.ClaimableSpecialTO", to: "double", onError: 0, onNull: 0 } } },
                    UnClaimableSpecialTO: { $sum: { $convert: { input: "$SalesData.UnClaimableSpecialTO", to: "double", onError: 0, onNull: 0 } } }
                }
            },

            {
                $addFields: {
                    discount: {
                        $add: [
                            "$diBspass",
                            "$RToffer",
                            "$WToffer",
                            "$RpDrive",
                            "$WHOLESALEDEAL",
                            "$RTWholeSale",
                            "$SubDisTPromotion",
                            "$TradeOffer",
                            "$HOTZONEDRIVE",
                            "$SPECIALDISCOUNT",
                            "$SpecialTO"
                        ]
                    }
                }
            },

            {
                $project: {
                    _id: 0,
                    SalesInvoice: "$_id.SalesInvoice",
                    SalesInvoiceDate: "$_id.SalesInvoiceDate",
                    Store: "$_id.Store",
                    Location: "$_id.Location",
                    Client: "$_id.Client",
                    SalesFlowRef: "$_id.SalesFlowRef",
                    OrderBooker: "$_id.OrderBooker",
                    TTS: "$_id.TTS",
                    TotalAmount: { $convert: { input: "$_id.TotalAmount", to: "double", onError: 0, onNull: 0 } },

                    carton: 1,
                    Gst: 1,
                    GrossAmount: 1,
                    ProductAmount: 1,
                    Advancetax: 1,
                    discount: 1,
                    SpecialTO: 1,
                    ClaimableSpecialTO: 1,
                    UnClaimableSpecialTO: 1
                }
            }
        ], { allowDiskUse: true });


        /* =========================
           DISTRIBUTOR SALES (data2)
        ========================== */
        const data2 = await DistrbutorInvoiceModal.aggregate([
            {
                $match: {
                    InvoiceDate: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },

            { $unwind: "$InvoiceData" },

            {
                $group: {
                    _id: {
                        SalesInvoice: "$DitributorInvoiceCode",
                        SalesInvoiceDate: "$InvoiceDate",
                        Store: "$Store",
                        Client: "$Distrbutor",
                        TTS: "$LessAdvanceDis"
                    },

                    TotalAmount: { $first: { $convert: { input: "$TotalAmount", to: "double", onError: 0, onNull: 0 } } },
                    AddAmount: { $first: { $convert: { input: "$AddAmount", to: "double", onError: 0, onNull: 0 } } },
                    LessAmount: { $first: { $convert: { input: "$LessAmount", to: "double", onError: 0, onNull: 0 } } },

                    carton: { $sum: { $convert: { input: "$InvoiceData.DeliveredBox", to: "double", onError: 0, onNull: 0 } } },
                    Gst: { $sum: { $convert: { input: "$InvoiceData.Gst", to: "double", onError: 0, onNull: 0 } } },
                    GrossAmount: { $sum: { $convert: { input: "$InvoiceData.Amount", to: "double", onError: 0, onNull: 0 } } },
                    ProductAmount: { $sum: { $convert: { input: "$InvoiceData.netAmount", to: "double", onError: 0, onNull: 0 } } },

                    // ✅ FIXED SpecialTO
                    SpecialTO: {
                        $sum: {
                            $convert: {
                                input: "$InvoiceData.SpecialTO",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    specialdiscount: {
                        $sum: {
                            $convert: {
                                input: {
                                    $cond: [
                                        { $eq: ["$InvoiceData.specialdiscount", "NaN"] },
                                        null,
                                        "$InvoiceData.specialdiscount"
                                    ]
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    ClaimableSpecialTO: { $sum: { $convert: { input: "$InvoiceData.ClaimableSpecialTO", to: "double", onError: 0, onNull: 0 } } },
                    UnClaimableSpecialTO: { $sum: { $convert: { input: "$InvoiceData.UnClaimableSpecialTO", to: "double", onError: 0, onNull: 0 } } },
                    discount: {
                        $sum: {
                            $add: [
                                { $convert: { input: "$InvoiceData.discount", to: "double", onError: 0, onNull: 0 } },

                            ]
                        }
                    }
                }
            },

            {
                $project: {
                    _id: 0,
                    SalesInvoice: "$_id.SalesInvoice",
                    SalesInvoiceDate: "$_id.SalesInvoiceDate",
                    Store: "$_id.Store",
                    Client: "$_id.Client",
                    TTS: "$_id.TTS",
                    specialdiscount: 1,
                    TotalAmount: 1,
                    AddAmount: 1,
                    LessAmount: 1,
                    carton: 1,
                    Gst: 1,
                    GrossAmount: 1,
                    ProductAmount: 1,
                    discount: 1,
                    SpecialTO: 1,
                    ClaimableSpecialTO: 1,
                    UnClaimableSpecialTO: 1
                }
            }
        ], { allowDiskUse: true });


        /* =========================
           MERGE
        ========================== */
        let data = [...data1, ...data2];

        if (Store && Store !== "") {
            data = data.filter(item => Store.includes(item.Store));
        }

        res.status(200).send({ data });

    } catch (err) {
        console.error("Error in SalesinvoiceSummry:", err);
        res.status(400).send({
            error: err.message,
            details: err
        });
    }
};

export const ProductSalesSummry = async (req, res) => {
    const { startDate, endDate, Store } = req.query;

    try {
        /* =========================
           NORMAL SALES (Product wise)
        ========================== */
        const normalSales = await SalesInvoiceModal.aggregate(
            [
                {
                    $match: {
                        SalesInvoiceDate: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                        PostStatus: true,
                    },
                },
                { $unwind: "$SalesData" },
                {
                    $group: {
                        _id: {
                            Product: "$SalesData.product",
                            Store: "$Store",
                            Location: "$Location",
                            Client: "$Client"
                        },
                        carton: { $sum: "$SalesData.totalBox" },
                        Gst: { $sum: "$SalesData.Gst" },
                        GrossAmount: { $sum: "$SalesData.TotalValueExclGst" },
                        ProductAmount: { $sum: "$SalesData.netAmunt" },
                        Advancetax: { $sum: "$SalesData.AdvanceTax" },

                        diBspass: { $sum: "$SalesData.diBspass" },
                        RToffer: { $sum: "$SalesData.RToffer" },
                        WToffer: { $sum: "$SalesData.WToffer" },
                        RpDrive: { $sum: "$SalesData.RpDrive" },
                        WHOLESALEDEAL: { $sum: "$SalesData.WHOLESALEDEAL" },
                        RTWholeSale: { $sum: "$SalesData.RTWholeSale" },
                        SubDisTPromotion: { $sum: "$SalesData.SubDisTPromotion" },
                        TradeOffer: { $sum: "$SalesData.TradeOffer" },
                        HOTZONEDRIVE: { $sum: "$SalesData.HOTZONEDRIVE" },
                        SPECIALDISCOUNT: { $sum: "$SalesData.SPECIALDISCOUNT" },
                    },
                },
                {
                    $addFields: {
                        discount: {
                            $add: [
                                "$diBspass",
                                "$RToffer",
                                "$WToffer",
                                "$RpDrive",
                                "$WHOLESALEDEAL",
                                "$RTWholeSale",
                                "$SubDisTPromotion",
                                "$TradeOffer",
                                "$HOTZONEDRIVE",
                                "$SPECIALDISCOUNT",
                            ],
                        },
                        SaleType: "Normal",
                    },
                },
                {
                    $project: {
                        _id: 0,
                        Product: "$_id.Product",
                        Store: "$_id.Store",
                        Location: "$_id.Location",
                        Client: "$_id.Client",
                        carton: 1,
                        Gst: 1,
                        GrossAmount: 1,
                        ProductAmount: 1,
                        Advancetax: 1,
                        discount: 1,
                        SaleType: 1,
                    },
                },
            ],
            { allowDiskUse: true }
        );

        /* ==============================
           DISTRIBUTOR SALES (Product wise)
        =============================== */
        const distributorSales = await DistrbutorInvoiceModal.aggregate(
            [
                {
                    $match: {
                        InvoiceDate: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                    },
                },
                { $unwind: "$InvoiceData" },
                {
                    $group: {
                        _id: {
                            Product: "$InvoiceData.product",
                            Store: "$Store",
                            Client: "$Distrbutor"
                        },
                        carton: { $sum: "$InvoiceData.DeliveredBox" },
                        Gst: { $sum: "$InvoiceData.Gst" },
                        GrossAmount: {
                            $sum: {
                                $ifNull: [
                                    "$InvoiceData.Amount",
                                    "$InvoiceData.GrossAmount",
                                ],
                            },
                        },
                        ProductAmount: { $sum: "$InvoiceData.netAmount" },
                        discount: {
                            $sum: {
                                $add: [
                                    { $ifNull: ["$InvoiceData.discount", 0] },
                                    { $ifNull: ["$InvoiceData.specialdiscount", 0] },
                                ],
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        Advancetax: 0, // distributor invoices usually don’t have it
                        SaleType: "Distributor",
                    },
                },
                {
                    $project: {
                        _id: 0,
                        Product: "$_id.Product",
                        Store: "$_id.Store",
                        Client: "$_id.Client",
                        carton: 1,
                        Gst: 1,
                        GrossAmount: 1,
                        ProductAmount: 1,
                        Advancetax: 1,
                        discount: 1,
                        SaleType: 1,
                    },
                },
            ],
            { allowDiskUse: true }
        );

        /* =====================
           MERGE BOTH RESULTS
        ====================== */
        let data = normalSales.concat(distributorSales);

        if (Store && Store !== "") {
            data = data.filter((item) => Store.includes(item.Store));
        }

        res.status(200).send({ data });
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }
};


export const SalesDumpData = async (req, res) => {
    const { startDate, endDate, Store } = req.query;

    try {
        /* =====================
           NORMAL SALES DUMP
        ====================== */
        const normalSales = await SalesInvoiceModal.aggregate(
            [
                {
                    $match: {
                        SalesInvoiceDate: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                        PostStatus: true,
                    },
                },
                { $unwind: "$SalesData" },
                {
                    $project: {
                        _id: 0,
                        SaleType: "Normal",

                        Store: "$Store",
                        Location: "$Location",
                        SalesInvoice: "$SalesInvoice",
                        SalesInvoiceDate: "$SalesInvoiceDate",
                        SalesFlowRef: "$SalesFlowRef",
                        OrderBooker: "$OrderBooker",
                        Client: "$Client",
                        Product: "$SalesData.product",
                        carton: "$SalesData.totalBox",
                        Gst: "$SalesData.Gst",
                        GrossAmount: "$SalesData.TotalValueExclGst",
                        ProductAmount: "$SalesData.netAmunt",
                        Advancetax: "$SalesData.AdvanceTax",
                        diBspass: "$SalesData.diBspass",
                        RToffer: "$SalesData.RToffer",
                        WToffer: "$SalesData.WToffer",
                        RpDrive: "$SalesData.RpDrive",
                        WHOLESALEDEAL: "$SalesData.WHOLESALEDEAL",
                        RTWholeSale: "$SalesData.RTWholeSale",
                        SubDisTPromotion: "$SalesData.SubDisTPromotion",
                        TradeOffer: "$SalesData.TradeOffer",
                        HOTZONEDRIVE: "$SalesData.HOTZONEDRIVE",
                        SPECIALDISCOUNT: "$SalesData.SPECIALDISCOUNT",
                        SpecialTO: "$SalesData.SpecialTO",
                        ClaimableSpecialTO: "$SalesData.ClaimableSpecialTO",
                        UnClaimableSpecialTO: "$SalesData.UnClaimableSpecialTO",
                    },
                },
            ],
            { allowDiskUse: true }
        );

        /* =========================
           DISTRIBUTOR SALES DUMP
        ========================== */
        const distributorSales = await DistrbutorInvoiceModal.aggregate(
            [
                {
                    $match: {
                        InvoiceDate: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                    },
                },
                { $unwind: "$InvoiceData" },
                {
                    $project: {
                        _id: 0,
                        SaleType: "Distributor",
                        Client: "$Distrbutor",
                        Store: "$Store",
                        Location: null,
                        SalesInvoice: "$DitributorInvoiceCode",
                        SalesInvoiceDate: "$InvoiceDate",
                        SalesFlowRef: null,
                        OrderBooker: null,
                        DCNumber: "$DcNumber",
                        Product: "$InvoiceData.product",
                        Gst: "$InvoiceData.Gst",
                        GrossAmount: "$InvoiceData.Amount",
                        SpecialTO: "$InvoiceData.SpecialTO",
                        ClaimableSpecialTO: "$InvoiceData.ClaimableSpecialTO",
                        UnClaimableSpecialTO: "$InvoiceData.UnClaimableSpecialTO",
                        ProductAmount: "$InvoiceData.netAmount",
                        carton: "$InvoiceData.DeliveredBox",
                        totalBOX: "$InvoiceData.totalBox",
                        BOX: "$InvoiceData.BOX",
                        SPECIALDISCOUNT: "$InvoiceData.specialdiscount",
                        SpecialTo: "$InvoiceData.SpecialTo",
                        discount: "$InvoiceData.discount",
                    },
                },
            ],
            { allowDiskUse: true }
        );

        /* =====================
           SALES RETURN DUMP (negative qty/amounts)
        ====================== */
        const salesReturnsRaw = await SalesReturnModal.aggregate(
            [
                {
                    $match: {
                        SalesInvoiceReturnDate: {
                            $gte: startDate,
                            $lte: endDate,
                        },
                        PostStatus: true,
                    },
                },
                { $unwind: "$SalesReturnData" },
                {
                    $project: {
                        _id: 0,
                        SaleType: "Return",
                        Store: "$Store",
                        Location: "$Location",
                        SalesInvoice: "$SalesReturnNumber",
                        SalesInvoiceDate: "$SalesInvoiceReturnDate",
                        SalesFlowRef: "$SalesFlowRef",
                        OrderBooker: "$OrderBooker",
                        Client: "$Client",
                        Product: "$SalesReturnData.product",
                        carton: "$SalesReturnData.totalBox",
                        Gst: "$SalesReturnData.Gst",
                        GrossAmount: "$SalesReturnData.TotalValueExclGst",
                        ProductAmount: "$SalesReturnData.netAmunt",
                        Advancetax: "$SalesReturnData.AdvanceTax",
                        diBspass: "$SalesReturnData.diBspass",
                        RToffer: "$SalesReturnData.RToffer",
                        WToffer: "$SalesReturnData.WToffer",
                        RpDrive: "$SalesReturnData.RpDrive",
                        WHOLESALEDEAL: "$SalesReturnData.WHOLESALEDEAL",
                        RTWholeSale: "$SalesReturnData.RTWholeSale",
                        SubDisTPromotion: "$SalesReturnData.SubDisTPromotion",
                        TradeOffer: "$SalesReturnData.TradeOffer",
                        HOTZONEDRIVE: "$SalesReturnData.HOTZONEDRIVE",
                        SPECIALDISCOUNT: "$SalesReturnData.SPECIALDISCOUNT",
                        TTS: "$SalesReturnData.TTS",
                    },
                },
            ],
            { allowDiskUse: true }
        );

        const asNegative = (value) => {
            const n = Number(value);
            return Number.isFinite(n) ? -n : 0;
        };

        const salesReturns = salesReturnsRaw.map((item) => ({
            ...item,
            SaleType: "Return",
            carton: asNegative(item.carton),
            Gst: asNegative(item.Gst),
            GrossAmount: asNegative(item.GrossAmount),
            ProductAmount: asNegative(item.ProductAmount),
            Advancetax: asNegative(item.Advancetax),
            diBspass: asNegative(item.diBspass),
            RToffer: asNegative(item.RToffer),
            WToffer: asNegative(item.WToffer),
            RpDrive: asNegative(item.RpDrive),
            WHOLESALEDEAL: asNegative(item.WHOLESALEDEAL),
            RTWholeSale: asNegative(item.RTWholeSale),
            SubDisTPromotion: asNegative(item.SubDisTPromotion),
            TradeOffer: asNegative(item.TradeOffer),
            HOTZONEDRIVE: asNegative(item.HOTZONEDRIVE),
            SPECIALDISCOUNT: asNegative(item.SPECIALDISCOUNT),
            discount: 0,
            TTS: asNegative(item.TTS),
        }));

        let AllOrder = [];
        /* =====================
           MERGE SALES + DISTRIBUTOR + RETURNS
        ====================== */
        if (distributorSales.length > 0) {
            const DCS = distributorSales.map(item => item.DCNumber);
            console.log(distributorSales)
            const OrderDetails = await OrderDcModal.find({ DCCode: { $in: DCS } }, { DCCode: 1, "DCData.Order": 1 });
            console.log(OrderDetails)
            const orderMap = OrderDetails.flatMap(item => ({
                DCNumber: item.DCCode,
                Orders: item.DCData[0]?.Order || ""
            }));
            const ordersArray = orderMap.map(item => item.Orders)
            const SalesOrder = await DistributorSaleOrderModal.find({ OrderCode: { $in: ordersArray } }, { OrderCode: 1, OrderDate: 1 });
            const orderDateMap = SalesOrder.map(item => ({
                OrderCode: item.OrderCode,
                OrderDate: item.OrderDate,
                dcNumber: orderMap.find(order => order.Orders === item.OrderCode)?.DCNumber || ""
            }));

            AllOrder = orderDateMap;
        }

        let data = normalSales.concat(distributorSales).concat(salesReturns);

        if (Store && Store !== "") {
            data = data.filter((item) => Store.includes(item.Store));
        }

        res.status(200).send({ data, AllOrder });
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }
};



export const getOnlyInvoiceAging = async (req, res) => {
    const { startDate, endDate, Store, onlyCurrunt, OrderBooker, store } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    console.log(store)
    // store may be a single id or a comma-separated list of ids (multi-store selection)
    const storeArray = store ? String(store).split(",").map(s => s.trim()).filter(Boolean) : [];
    const storeMatch = storeArray.length > 0 ? { Store: { $in: storeArray } } : {};
    const batchSize = 1500;
    let skip = 0;
    let hasMore = true;

    let data = [];

    try {
        while (hasMore) {
            const batch = await SalesInvoiceModal.aggregate([
                {
                    $match: {
                        SalesInvoiceDate: { $gte: startDate, $lte: endDate },
                        PostStatus: true,
                        ...storeMatch,

                    }
                },
                {
                    // Project only the fields the reports use. Full documents
                    // include the large SalesData arrays, which made this
                    // endpoint extremely slow (80k+ rows, 10s+ for one store).
                    $project: {
                        SalesInvoice: 1,
                        SalesInvoiceDate: 1,
                        Client: 1,
                        Store: 1,
                        PostStatus: 1,
                        TotalAmount: 1,
                        RecivedAmount: 1,
                        RemainingAmount: 1,
                        SalesFlowRef: 1,
                        OrderBooker: 1,
                        OrderBookerTo: 1,
                        OrderBookerFrom: 1,
                        Remarks: 1,
                    }
                },
                { $skip: skip },
                { $limit: batchSize }
            ]);

            if (batch.length === 0) {
                hasMore = false;
            } else {
                data.push(...batch);
                skip += batchSize;
                console.log("Total Sales Invoices Loaded:", data.length);
            }
        }

        console.log("Total Sales Invoices Loaded:", data.length);

        if (onlyCurrunt == "true") {
            console.log("first")
            if (OrderBooker !== "All") {
                const OrderBookerArray = [...OrderBooker?.split(",")];
                const OrderBookerData = data.filter((item) => {

                    const OrderBookerMatch = !OrderBooker ||
                        OrderBookerArray.includes(item?.OrderBookerTo) ||
                        OrderBookerArray.includes(item?.OrderBookerFrom) ||
                        OrderBookerArray.includes(item?.OrderBooker);
                    return OrderBookerMatch;

                })
                return res.status(200).send({ data: OrderBookerData });
            } else {

                return res.status(200).send({ data: data });
            }
        }
        // Optional store filter
        const OpeningInvoices = await InvoiceOpeningModal.find();

        const Opening = (OpeningInvoices[0]?.InvoiceData || []).filter((item) => {
            const d = new Date(item.date); // item.date is string like "2025-09-18"
            return d >= start && d <= end;
        });

        const openingFIleter = Opening.filter((item) => Number(item?.Amount) !== Number(item.RecivedAmount)).map((val) => ({
            ...val,
            PostStatus: true
        }))

        const totaldata = openingFIleter.concat(data)

        let allData = totaldata.filter(item => item?.TotalAmount !== item?.RecivedAmount);

        if (Store && Store !== "") {
            console.log(Store)
            allData = totaldata.filter(item => storeArray.includes(item?.Store?.toString()));
        }

        const distributorInvoices = await DistrbutorInvoiceModal.find({
            InvoiceDate: { $gte: startDate, $lte: endDate },
            ...storeMatch,

            $expr: {
                $ne: [
                    { $toDouble: "$TotalAmount" },
                    { $toDouble: "$RecivedAmount" }
                ]
            }
        });

        const totalData = allData.concat(distributorInvoices)
        console.log(totalData.length)
        res.status(200).send({ data: totalData });
    } catch (err) {
        console.error("Error in getOnlyInvoiceAging:", err);
        res.status(400).send(err);
    }
};

const num = (field) => ({
    $convert: { input: field, to: "double", onError: 0, onNull: 0 },
});

// RemainingAmount ya RemaingAmount (spelling alag alag hai), jo maujood ho
const remainingOf = num({ $ifNull: ["$RemainingAmount", "$RemaingAmount"] });

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const newOnegetOnlyInvoiceAging = async (req, res) => {
    const { startDate, endDate, Store, store, onlyCurrunt, OrderBooker } = req.query;

    // store ya Store: single id ya comma-separated list (string + ObjectId dono)
    const rawStore = store || Store;
    const storeArray = rawStore
        ? String(rawStore).split(",").map(s => s.trim()).filter(Boolean)
        : [];
    const storeIds = storeArray.flatMap(id =>
        mongoose.isValidObjectId(id) ? [id, new mongoose.Types.ObjectId(id)] : [id]
    );
    const storeMatch = storeArray.length > 0 ? { Store: { $in: storeIds } } : {};

    // OrderBooker filter (sirf onlyCurrunt me)
    let orderBookerMatch = {};
    if (onlyCurrunt == "true" && OrderBooker && OrderBooker !== "All") {
        const list = OrderBooker.split(",").map(s => s.trim());
        orderBookerMatch = {
            $or: [
                { OrderBookerTo: { $in: list } },
                { OrderBookerFrom: { $in: list } },
                { OrderBooker: { $in: list } },
            ],
        };
    }

    try {
        const pipeline = [
            // 1) Sales invoices
            {
                $match: {
                    SalesInvoiceDate: { $gte: startDate, $lte: endDate },
                    PostStatus: true,
                    ...storeMatch,
                    ...orderBookerMatch,
                },
            },
            { $project: { _id: 0, Store: 1, remaining: remainingOf } },
        ];

        // 2) Opening + 3) Distributor (onlyCurrunt me nahi)
        if (onlyCurrunt != "true") {
            pipeline.push(
                {
                    $unionWith: {
                        coll: InvoiceOpeningModal.collection.name,
                        pipeline: [
                            { $limit: 1 },
                            { $unwind: "$InvoiceData" },
                            { $replaceRoot: { newRoot: "$InvoiceData" } },
                            { $match: { date: { $gte: startDate, $lte: endDate }, ...storeMatch } },
                            { $project: { _id: 0, Store: 1, remaining: remainingOf } },
                        ],
                    },
                },
                {
                    $unionWith: {
                        coll: DistrbutorInvoiceModal.collection.name,
                        pipeline: [
                            { $match: { InvoiceDate: { $gte: startDate, $lte: endDate }, ...storeMatch } },
                            { $project: { _id: 0, Store: 1, remaining: remainingOf } },
                        ],
                    },
                }
            );
        }

        // 4) Store-wise group: remaining ka total
        pipeline.push(
            { $match: { remaining: { $gt: 0 } } },   // zero / negative hat gaye
            {
                $group: {
                    _id: { $toString: "$Store" },
                    remainingTotal: { $sum: "$remaining" },
                },
            },
            { $sort: { remainingTotal: -1 } }
        );

        const result = await SalesInvoiceModal.aggregate(pipeline).allowDiskUse(true);

        const data = result.map(r => ({
            Store: r._id,
            remainingTotal: round2(r.remainingTotal),
        }));

        return res.status(200).send({
            data,
            grandTotal: round2(data.reduce((s, g) => s + g.remainingTotal, 0)),
        });
    } catch (err) {
        console.error("Error in getOnlyInvoiceAging:", err);
        return res.status(400).send({ message: err.message });
    }
};

export const getOnlyInvoiceAging1 = async (req, res) => {
    const { startDate, endDate, Store, onlyCurrunt, OrderBooker, store } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    // store may be a single id or a comma-separated list of ids (multi-store selection)
    const storeArray = store ? String(store).split(",").map(s => s.trim()).filter(Boolean) : [];
    const storeMatch = storeArray.length > 0 ? { Store: { $in: storeArray } } : {};

    try {
        const Salesmatch = {
            SalesInvoiceDate: {
                $gte: startDate,
                $lte: endDate,
            },
            PostStatus: true

        }
        if (store && store !== "All") {
            console.log(store)
            Salesmatch.Store = storeMatch.Store
        }
        const Distmatch = {
            InvoiceDate: {
                $gte: startDate,
                $lte: endDate,
            },
            PostStatus: "true"

        }
        if (store && store !== "All") {
            Distmatch.Store = storeMatch.Store
        }

        const data = await SalesInvoiceModal.aggregate([
            {
                $match: Salesmatch
            }
        ]);
        console.log(data.length, "SalesInvoiceRetunModal")
        const distributor = await DistrbutorInvoiceModal.aggregate([
            {
                $match: Distmatch
            }
        ]);
        console.log(data.length, distributor.length, "Filtered Invoices");
        if (onlyCurrunt == "true") {
            console.log("first")
            if (OrderBooker !== "All") {
                const OrderBookerArray = [...OrderBooker?.split(",")];
                const OrderBookerData = data.filter((item) => {

                    const OrderBookerMatch = !OrderBooker ||
                        OrderBookerArray.includes(item?.OrderBookerTo) ||
                        OrderBookerArray.includes(item?.OrderBookerFrom) ||
                        OrderBookerArray.includes(item?.OrderBooker);
                    return OrderBookerMatch;

                })
                return res.status(200).send({ data: OrderBookerData });
            } else {

                return res.status(200).send({ data: data.concat(distributor) });
            }
        }
        // Optional store filter
        const OpeningInvoices = await InvoiceOpeningModal.find();

        const Opening = (OpeningInvoices[0]?.InvoiceData || []).filter((item) => {
            const d = new Date(item.date); // item.date is string like "2025-09-18"
            return d >= start && d <= end;
        });
        const openingFIleter = Opening.filter((item) => Number(item?.Amount) !== Number(item.RecivedAmount)).map((val) => ({
            ...val,
            PostStatus: true
        }))
        const totaldata = openingFIleter.concat(data)
        let allData = totaldata.filter(item => item?.TotalAmount !== item?.RecivedAmount);
        console.log(allData)
        if (Store && Store !== "") {
            console.log(Store)
            allData = totaldata.filter(item => storeArray.includes(item?.Store?.toString()));
        }

        res.status(200).send({ data: allData });
    } catch (err) {
        console.error("Error in getOnlyInvoiceAging:", err);
        res.status(400).send(err);
    }
};

const unusedChequeStatus = (status) => {
    const s = String(status || "");
    return (
        s !== "Bounce" &&
        s !== "Realize" &&
        s !== "Reject" &&
        s !== "Clear" &&
        s !== "ReturntoCustomer" &&
        s !== "Return to customer"
    );
};

export const getInvoicePaymentAging = async (req, res) => {
    const { startDate, endDate, store } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({
            status: false,
            message: "startDate and endDate are required"
        });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const storeArray = store ? String(store).split(",").map((s) => s.trim()).filter(Boolean) : [];
        const storeMatch = storeArray.length > 0 && !storeArray.includes("All")
            ? { Store: { $in: storeArray } }
            : {};

        const salesInvoices = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    SalesInvoiceDate: { $gte: startDate, $lte: endDate },
                    PostStatus: true,
                    ...storeMatch
                }
            },
            {
                $project: {
                    SalesInvoice: 1,
                    SalesInvoiceDate: 1,
                    Client: 1,
                    Store: 1,
                    TotalAmount: 1,
                    RecivedAmount: 1,
                    RemainingAmount: 1,
                    SalesFlowRef: 1,
                    OrderBooker: 1,
                    Remarks: 1
                }
            }
        ]);

        const distributorInvoices = await DistrbutorInvoiceModal.find({
            InvoiceDate: { $gte: startDate, $lte: endDate },
            ...storeMatch
        }).select({
            DitributorInvoiceCode: 1,
            InvoiceDate: 1,
            Distrbutor: 1,
            Store: 1,
            TotalAmount: 1,
            RecivedAmount: 1,
            Remaining: 1
        }).lean();

        const OpeningInvoices = await InvoiceOpeningModal.find();
        const openingRows = (OpeningInvoices[0]?.InvoiceData || []).filter((item) => {
            const d = new Date(item.date);
            return d >= start && d <= end;
        }).filter((item) =>
            !storeArray.length ||
            storeArray.includes("All") ||
            !item?.Store ||
            storeArray.includes(String(item.Store))
        );

        const invoices = [];

        salesInvoices.forEach((item) => {
            invoices.push({
                type: "Sales",
                invoice: item.SalesInvoice,
                salesFlowRef: item.SalesFlowRef || "",
                date: item.SalesInvoiceDate,
                clientId: item.Client,
                store: item.Store || "",
                orderBooker: item.OrderBooker || "",
                remarks: item.Remarks || "",
                totalAmount: toReportNumber(item.TotalAmount),
                recivedAmount: toReportNumber(item.RecivedAmount),
                agingRemaining: toReportNumber(
                    item.RemainingAmount ?? (toReportNumber(item.TotalAmount) - toReportNumber(item.RecivedAmount))
                ),
                refs: uniqueRefs([item.SalesInvoice, item.SalesFlowRef])
            });
        });

        distributorInvoices.forEach((item) => {
            const invoiceNo = item.DitributorInvoiceCode;
            invoices.push({
                type: "Distributor",
                invoice: invoiceNo,
                salesFlowRef: invoiceNo || "",
                date: item.InvoiceDate,
                clientId: item.Distrbutor,
                store: item.Store || "",
                orderBooker: "",
                remarks: "",
                totalAmount: toReportNumber(item.TotalAmount),
                recivedAmount: toReportNumber(item.RecivedAmount),
                agingRemaining: toReportNumber(
                    item.Remaining ?? (toReportNumber(item.TotalAmount) - toReportNumber(item.RecivedAmount))
                ),
                refs: uniqueRefs([invoiceNo])
            });
        });

        openingRows.forEach((item) => {
            const invoiceNo = item.Invoice || item.SalesInvoice || item.invoice;
            invoices.push({
                type: "Opening",
                invoice: invoiceNo,
                salesFlowRef: item.SalesFlowRef || invoiceNo || "",
                date: item.date,
                clientId: item.Client,
                store: item.Store || "",
                orderBooker: item.OrderBooker || "",
                remarks: item.Remarks || "",
                totalAmount: toReportNumber(item.Amount || item.TotalAmount),
                recivedAmount: toReportNumber(item.RecivedAmount),
                agingRemaining: toReportNumber(item.Amount || item.TotalAmount) - toReportNumber(item.RecivedAmount),
                refs: uniqueRefs([invoiceNo, item.SalesFlowRef])
            });
        });

        const allRefs = uniqueRefs(invoices.flatMap((inv) => inv.refs));
        const paymentMap = {};
        const processedVoucherIds = new Set();

        const chunkSize = 1000;
        for (let i = 0; i < allRefs.length; i += chunkSize) {
            const chunk = allRefs.slice(i, i + chunkSize);
            const vouchers = await VoucherModal.find({
                $or: [
                    { "VoucharData.ClientRef2": { $in: chunk } },
                    { "VoucharData.Ref": { $in: chunk } },
                    { "VoucharData.ChqRef.ref": { $in: chunk } },
                    { VoucharData: { $elemMatch: { "ChqRef.ref": { $in: chunk } } } }
                ]
            }).select({ VoucherNumber: 1, ChequeNumber: 1, VoucharData: 1, status: 1 }).lean();

            const fresh = vouchers.filter((voucher) => {
                const id = String(voucher._id);
                if (processedVoucherIds.has(id)) return false;
                processedVoucherIds.add(id);
                return true;
            });

            const chunkMap = collectVoucherPayments(fresh);
            Object.entries(chunkMap).forEach(([key, row]) => {
                if (!paymentMap[key]) {
                    paymentMap[key] = {
                        payment: 0,
                        debit: 0,
                        vouchers: [],
                        chequeNumbers: []
                    };
                }
                paymentMap[key].payment += toReportNumber(row.payment);
                paymentMap[key].debit += toReportNumber(row.debit);
                paymentMap[key].vouchers.push(...(row.vouchers || []));
                paymentMap[key].chequeNumbers.push(...(row.chequeNumbers || []));
            });
        }

        const pendingReceipts = await PaymentRecivedModal.find({
            status: { $in: ["False", "false", false, "Pending", "pending"] }
        }).select({ ReciptNumber: 1, ReciptData: 1, status: 1 }).lean();

        pendingReceipts.forEach((receipt) => {
            const rows = Array.isArray(receipt.ReciptData) ? receipt.ReciptData : [];
            rows.forEach((row) => {
                const key = String(row.ClientRef2 || row.Ref || "").trim();
                if (!key || key === "Advance" || key === "UnRealized") return;
                const credit = toReportNumber(row.Credit);
                const debit = toReportNumber(row.Debit);
                if (!credit && !debit) return;
                if (!paymentMap[key]) {
                    paymentMap[key] = {
                        payment: 0,
                        debit: 0,
                        vouchers: [],
                        chequeNumbers: []
                    };
                }
                paymentMap[key].payment += credit;
                paymentMap[key].debit += debit;
                if (receipt.ReciptNumber) {
                    paymentMap[key].vouchers.push(receipt.ReciptNumber);
                }
                const chqNo = row.Chq || row.chq || row.ChqNumber;
                if (chqNo) paymentMap[key].chequeNumbers.push(chqNo);
            });
        });

        const chqDocs = await CustomerChqRecivedModal.find({}).select({ grouped: 1 }).lean();
        const unusedChqs = chqDocs.flatMap((doc) => {
            const groups = Array.isArray(doc.grouped) ? doc.grouped : (doc.grouped ? [doc.grouped] : []);
            return groups.flatMap((group) => {
                const items = Array.isArray(group.items) ? group.items : (group.items ? [group.items] : []);
                return items.map((item) => ({
                    ...item,
                    chq: item.chq || group.chq,
                    status: item.status || item.staus || group.status
                }));
            });
        }).filter((item) => unusedChequeStatus(item.status) && unusedChequeStatus(item.staus));

        const chqMap = {};
        unusedChqs.forEach((chq) => {
            const key = String(chq.Invoice || "");
            if (!key) return;
            if (!chqMap[key]) {
                chqMap[key] = { amount: 0, numbers: [], dates: [] };
            }
            chqMap[key].amount += toReportNumber(chq.Amount);
            if (chq.chq) chqMap[key].numbers.push(chq.chq);
            if (chq.RealizeDate || chq.ChqDate) chqMap[key].dates.push(chq.RealizeDate || chq.ChqDate);
        });

        const clientIds = [...new Set(invoices.map((inv) => inv.clientId).filter(Boolean))];
        const [customers, distributors] = await Promise.all([
            CutomerModal.find({ _id: { $in: clientIds } }).select({ CutomerName: 1, SalesFlowRef: 1, code: 1 }).lean(),
            DistrbutorModal.find({ _id: { $in: clientIds } }).select({ DistrbutorName: 1, OldCode: 1, DistrbutorSystemCode: 1 }).lean()
        ]);

        const clientMap = {};
        customers.forEach((c) => {
            clientMap[String(c._id)] = {
                name: c.CutomerName || "",
                code: c.SalesFlowRef || c.code || ""
            };
        });
        distributors.forEach((d) => {
            clientMap[String(d._id)] = {
                name: d.DistrbutorName || "",
                code: d.OldCode || d.DistrbutorSystemCode || ""
            };
        });

        const data = invoices.map((inv) => {
            const pay = paymentsForInvoice(inv.refs, paymentMap);

            const chq = inv.refs.reduce((acc, ref) => {
                const row = chqMap[ref];
                if (!row) return acc;
                acc.amount += toReportNumber(row.amount);
                acc.numbers.push(...(row.numbers || []));
                acc.dates.push(...(row.dates || []));
                return acc;
            }, { amount: 0, numbers: [], dates: [] });

            const client = clientMap[String(inv.clientId)] || { name: "", code: "" };
            const voucherPayment = toReportNumber(pay.payment);
            const chqAmount = toReportNumber(chq.amount);
            const agingRemaining = toReportNumber(inv.agingRemaining) + chqAmount;
            const balanceAfterPayment = toReportNumber(inv.totalAmount) - voucherPayment;

            return {
                type: inv.type,
                invoice: inv.invoice,
                salesFlowRef: inv.salesFlowRef,
                date: inv.date,
                clientId: inv.clientId,
                clientName: client.name,
                clientCode: client.code,
                store: inv.store,
                orderBooker: inv.orderBooker,
                remarks: inv.remarks,
                totalAmount: toReportNumber(inv.totalAmount),
                recivedAmount: toReportNumber(inv.recivedAmount),
                voucherPayment,
                voucherNumbers: [...new Set(pay.vouchers.filter(Boolean))].join(", "),
                agingRemaining,
                chqAmount,
                chqNumbers: [...new Set([...chq.numbers, ...pay.chequeNumbers].filter(Boolean))].join(", "),
                chqDates: [...new Set(chq.dates.filter(Boolean))].join(", "),
                balanceAfterPayment
            };
        });

        res.status(200).json({ status: true, data });
    } catch (err) {
        console.error("Error in getInvoicePaymentAging:", err);
        res.status(500).json({ status: false, message: err.message });
    }
};

const invoiceRemainingAmount = (item) => {
    const remaining = item?.RemainingAmount ?? item?.RemaingAmount ?? item?.Remaining;
    if (remaining !== undefined && remaining !== null && remaining !== "") {
        return toReportNumber(remaining);
    }
    return toReportNumber(item?.TotalAmount ?? item?.Amount) - toReportNumber(item?.RecivedAmount);
};

const addClientAmount = (map, clientId, field, amount) => {
    const key = String(clientId ?? "").trim();
    if (!key) return;
    if (!map[key]) {
        map[key] = { clientId: key, aging: 0, ledger: 0, knockoff: 0 };
    }
    map[key][field] += toReportNumber(amount);
};

const addClientStoreAmount = (map, clientId, storeId, field, amount) => {
    const cid = String(clientId ?? "").trim();
    if (!cid) return;
    const sid = String(storeId ?? "").trim();
    const key = `${cid}::${sid}`;
    if (!map[key]) {
        map[key] = { clientId: cid, storeId: sid, aging: 0, ledger: 0, knockoff: 0 };
    }
    map[key][field] += toReportNumber(amount);
};

const invoiceAgingRemaining = (item) =>
    Number(
        item?.RemainingAmount ??
        item?.RemaingAmount ??
        item?.Remaining ??
        (Number(item?.Amount || 0) - Number(item?.RecivedAmount || 0))
    ) || 0;

const flattenUnusedCheques = (chqDocs = []) =>
    chqDocs.flatMap((doc) => {
        const groups = Array.isArray(doc.grouped) ? doc.grouped : (doc.grouped ? [doc.grouped] : []);
        return groups.flatMap((group) => {
            const items = Array.isArray(group.items) ? group.items : (group.items ? [group.items] : []);
            return items.map((item) => ({
                ...item,
                chq: item.chq || group.chq,
                status: item.status || item.staus || group.status,
                staus: item.staus
            }));
        });
    }).filter((item) => unusedChequeStatus(item.status) && unusedChequeStatus(item.staus));

const lineStoreId = (row) => String(row?.store || row?.Store || row?.BigStore || row?.SmallStore || "").trim();

const matchesStoreFilter = (storeId, storeArray) => {
    if (!storeArray.length || storeArray.includes("All")) return true;
    if (!storeId) return true;
    return storeArray.includes(String(storeId));
};

export const getClientAgingLedger = async (req, res) => {
    const { startDate, endDate, store } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({
            status: false,
            message: "startDate and endDate are required"
        });
    }

    try {
        const end = new Date(endDate);
        const storeArray = store ? String(store).split(",").map((s) => s.trim()).filter(Boolean) : [];
        const storeMatch = storeArray.length > 0 && !storeArray.includes("All")
            ? { Store: { $in: storeArray } }
            : {};

        const agingStart = startDate && startDate < "2020-01-01" ? startDate : "2020-01-01";
        const agingEnd = new Date(endDate);
        const storeIds = storeArray.length ? storeArray : [null];

        // Fetch distributor IDs for filtering - only show distributor clients
        const distributorDocs = await DistrbutorModal.find().select({ _id: 1 }).lean();
        const distributorIds = new Set((distributorDocs || []).map(d => String(d._id)));

        const [openingDocs, chqDocs, firstOpening, storeDocs] = await Promise.all([
            InvoiceOpeningModal.find().select({ InvoiceData: 1 }).lean(),
            CustomerChqRecivedModal.find({}).select({ grouped: 1, Customer: 1 }).lean(),
            ClientOpeningBalanceModal.find({
                DateStart: { $lte: startDate },
                DateEnd: { $gte: startDate }
            }).lean(),
            StoreModal.find().select({ StoreName: 1 }).lean()
        ]);

        const unusedChqs = flattenUnusedCheques(chqDocs);
        const chqByInvoice = {};
        unusedChqs.forEach((chq) => {
            const key = String(chq.Invoice || "").trim();
            if (!key) return;
            chqByInvoice[key] = (chqByInvoice[key] || 0) + toReportNumber(chq.Amount);
        });

        const storeNameById = {};
        (storeDocs || []).forEach((s) => {
            storeNameById[String(s._id)] = s.StoreName || "";
        });

        const openingAll = (openingDocs[0]?.InvoiceData || []).filter((item) => {
            const d = new Date(item.date);
            return d >= new Date(agingStart) && d <= agingEnd && Number(item?.Amount) !== Number(item?.RecivedAmount);
        });

        const clientMap = {};
        const applyAgingInvoice = (clientId, item, refs, storeId) => {
            if (!matchesStoreFilter(storeId, storeArray)) return;
            const remaining = invoiceAgingRemaining(item);
            const chqAmount = (Array.isArray(refs) ? refs : [refs]).reduce((sum, ref) => {
                const key = String(ref || "").trim();
                return sum + (key ? toReportNumber(chqByInvoice[key]) : 0);
            }, 0);
            const aging = remaining + chqAmount;
            if (aging > 1) {
                addClientStoreAmount(clientMap, clientId, storeId, "aging", aging);
            }
        };

        for (const storeId of storeIds) {
            const oneStoreMatch = storeId ? { Store: storeId } : storeMatch;

            const [salesInvoices, distributorInvoices] = await Promise.all([
                SalesInvoiceModal.aggregate([
                    {
                        $match: {
                            SalesInvoiceDate: { $gte: agingStart, $lte: endDate },
                            PostStatus: true,
                            ...oneStoreMatch
                        }
                    },
                    {
                        $project: {
                            SalesInvoice: 1,
                            SalesFlowRef: 1,
                            Client: 1,
                            Store: 1,
                            TotalAmount: 1,
                            RecivedAmount: 1,
                            RemainingAmount: 1
                        }
                    }
                ]),
                DistrbutorInvoiceModal.find({
                    InvoiceDate: { $gte: agingStart, $lte: endDate },
                    ...oneStoreMatch,
                    $expr: {
                        $ne: [
                            { $toDouble: { $ifNull: ["$TotalAmount", 0] } },
                            { $toDouble: { $ifNull: ["$RecivedAmount", 0] } }
                        ]
                    }
                }).select({
                    DitributorInvoiceCode: 1,
                    Distrbutor: 1,
                    Store: 1,
                    TotalAmount: 1,
                    RecivedAmount: 1,
                    Remaining: 1
                }).lean()
            ]);

            const salesFiltered = salesInvoices.filter((item) =>
                toReportNumber(item?.TotalAmount) !== toReportNumber(item?.RecivedAmount)
            );

            salesFiltered.forEach((item) => {
                applyAgingInvoice(
                    item.Client,
                    item,
                    uniqueRefs([item.SalesInvoice, item.SalesFlowRef]),
                    item.Store || storeId
                );
            });

            distributorInvoices.forEach((item) => {
                applyAgingInvoice(
                    item.Distrbutor,
                    item,
                    uniqueRefs([item.DitributorInvoiceCode]),
                    item.Store || storeId
                );
            });

            openingAll.forEach((item) => {
                const openingStore = String(item?.Store || "").trim();
                if (storeId) {
                    if (openingStore) {
                        if (openingStore !== String(storeId)) return;
                    } else if (String(storeIds[0]) !== String(storeId)) {
                        return;
                    }
                } else if (!matchesStoreFilter(item?.Store, storeArray)) {
                    return;
                }
                applyAgingInvoice(
                    item.Client,
                    item,
                    uniqueRefs([item.Invoice, item.SalesInvoice, item.SalesFlowRef]),
                    openingStore || storeId || ""
                );
            });
        }

        const openingStart = firstOpening[0]?.DateStart;
        const previousDate = new Date(startDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const before = previousDate.toISOString().split("T")[0];

        const [periodVouchers, beforeVouchers, knockoffRows] = await Promise.all([
            VoucherModal.aggregate([
                { $match: { VoucherDate: { $gte: startDate, $lte: endDate } } },
                { $unwind: "$VoucharData" },
                { $match: { "VoucharData.Client": { $exists: true, $nin: [null, ""] } } },
                {
                    $project: {
                        Client: "$VoucharData.Client",
                        Debit: { $ifNull: ["$VoucharData.Debit", 0] },
                        Credit: { $ifNull: ["$VoucharData.Credit", 0] },
                        store: {
                            $cond: {
                                if: {
                                    $or: [
                                        { $eq: ["$VoucharData.store", null] },
                                        { $eq: ["$VoucharData.store", ""] },
                                        { $eq: ["$VoucharData.store", "0"] }
                                    ]
                                },
                                then: "$VoucharData.Store",
                                else: "$VoucharData.store"
                            }
                        }
                    }
                }
            ]),
            openingStart
                ? VoucherModal.aggregate([
                    { $match: { VoucherDate: { $gte: openingStart, $lte: before } } },
                    { $unwind: "$VoucharData" },
                    { $match: { "VoucharData.Client": { $exists: true, $nin: [null, ""] } } },
                    {
                        $project: {
                            Client: "$VoucharData.Client",
                            Debit: { $ifNull: ["$VoucharData.Debit", 0] },
                            Credit: { $ifNull: ["$VoucharData.Credit", 0] },
                            store: {
                                $cond: {
                                    if: {
                                        $or: [
                                            { $eq: ["$VoucharData.store", null] },
                                            { $eq: ["$VoucharData.store", ""] },
                                            { $eq: ["$VoucharData.store", "0"] }
                                        ]
                                    },
                                    then: "$VoucharData.Store",
                                    else: "$VoucharData.store"
                                }
                            }
                        }
                    }
                ])
                : Promise.resolve([]),
            VoucherModal.aggregate([
                { $match: { VoucherDate: { $lte: endDate } } },
                { $unwind: "$VoucharData" },
                { $match: { "VoucharData.Client": { $exists: true, $nin: [null, ""] } } },
                {
                    $project: {
                        Client: "$VoucharData.Client",
                        Credit: {
                            $convert: {
                                input: { $ifNull: ["$VoucharData.Credit", 0] },
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        },
                        Remain: {
                            $convert: {
                                input: { $ifNull: ["$VoucharData.Remain", 0] },
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        },
                        store: {
                            $cond: {
                                if: {
                                    $or: [
                                        { $eq: ["$VoucharData.store", null] },
                                        { $eq: ["$VoucharData.store", ""] },
                                        { $eq: ["$VoucharData.store", "0"] }
                                    ]
                                },
                                then: "$VoucharData.Store",
                                else: "$VoucharData.store"
                            }
                        }
                    }
                },
                { $match: { Credit: { $gt: 0 } } },
                {
                    $addFields: {
                        knockoff: { $subtract: ["$Credit", "$Remain"] }
                    }
                }
            ])
        ]);

        const openingClientData = Array.isArray(firstOpening[0]?.ClientData)
            ? firstOpening[0].ClientData
            : Object.values(firstOpening[0]?.ClientData || {});
        openingClientData.forEach((item) => {
            if (!matchesStoreFilter(item?.Store, storeArray)) return;
            addClientStoreAmount(clientMap, item.Client, item.Store, "ledger", toReportNumber(item.Debit) - toReportNumber(item.Credit));
        });

        beforeVouchers.forEach((row) => {
            if (!matchesStoreFilter(lineStoreId(row), storeArray)) return;
            addClientStoreAmount(clientMap, row.Client, lineStoreId(row), "ledger", toReportNumber(row.Debit) - toReportNumber(row.Credit));
        });

        periodVouchers.forEach((row) => {
            if (!matchesStoreFilter(lineStoreId(row), storeArray)) return;
            addClientStoreAmount(clientMap, row.Client, lineStoreId(row), "ledger", toReportNumber(row.Debit) - toReportNumber(row.Credit));
        });

        knockoffRows.forEach((row) => {
            if (!matchesStoreFilter(lineStoreId(row), storeArray)) return;
            addClientStoreAmount(clientMap, row.Client, lineStoreId(row), "knockoff", toReportNumber(row.knockoff));
        });

        const mapKeys = Object.keys(clientMap);
        const objectIds = [...new Set(mapKeys.map((key) => key.split("::")[0]))].filter((id) => mongoose.Types.ObjectId.isValid(id));
        const [customers, distributors] = await Promise.all([
            CutomerModal.find({ _id: { $in: objectIds } }).select({ CutomerName: 1, SalesFlowRef: 1, code: 1 }).lean(),
            DistrbutorModal.find({ _id: { $in: objectIds } }).select({ DistrbutorName: 1, OldCode: 1, DistrbutorSystemCode: 1 }).lean()
        ]);

        const names = {};
        customers.forEach((c) => {
            names[String(c._id)] = {
                name: c.CutomerName || "",
                code: c.SalesFlowRef || c.code || ""
            };
        });
        distributors.forEach((d) => {
            names[String(d._id)] = {
                name: d.DistrbutorName || "",
                code: d.OldCode || d.DistrbutorSystemCode || ""
            };
        });

        const data = mapKeys.map((key) => {
            const row = clientMap[key];
            const aging = toReportNumber(row.aging);
            const ledger = toReportNumber(row.ledger);
            const knockoff = toReportNumber(row.knockoff);
            const client = names[row.clientId] || { name: "", code: "" };

            // Filter: only include distributor clients
            if (!distributorIds.has(String(row.clientId))) {
                return null;
            }

            return {
                clientId: row.clientId,
                storeId: row.storeId || "",
                storeName: storeNameById[String(row.storeId)] || (row.storeId ? row.storeId : "Opening / No Store"),
                clientCode: client.code,
                clientName: client.name,
                aging: Number(aging.toFixed(2)),
                ledger: Number(ledger.toFixed(2)),
                knockoff: Number(knockoff.toFixed(2)),
                difference: Number((aging + knockoff - ledger).toFixed(2))
            };
        }).filter(row => row !== null && (
            Math.abs(row.aging) > 0.5 ||
            Math.abs(row.ledger) > 0.5 ||
            Math.abs(row.knockoff) > 0.5 ||
            Math.abs(row.difference) > 0.5
        )).sort((a, b) =>
            String(a.storeName || "").localeCompare(String(b.storeName || "")) ||
            Math.abs(b.difference) - Math.abs(a.difference) ||
            String(a.clientName).localeCompare(String(b.clientName))
        );

        return res.status(200).json({ status: true, data });
    } catch (err) {
        console.error("Error in getClientAgingLedger:", err);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Makes the on-screen Aging equal to the on-screen Ledger Balance for one
// distributor. The only documents written are DistrbutorInvoice rows.
export const matchClientAgingToLedger = async (req, res) => {
    const { clientId, aging, ledger, startDate, endDate, store } = req.body || {};
    if (!clientId) {
        return res.status(400).json({ status: false, message: "clientId is required" });
    }
    if (!endDate) {
        return res.status(400).json({ status: false, message: "endDate is required" });
    }
    if (!Number.isFinite(Number(aging)) || !Number.isFinite(Number(ledger))) {
        return res.status(400).json({ status: false, message: "aging and ledger must be numbers" });
    }

    try {
        const result = await applyDistributorAgingMatch({
            clientId,
            aging: Number(aging),
            ledger: Number(ledger),
            startDate,
            endDate,
            store
        });
        const summary = { ...result };
        delete summary.invoices;
        return res.status(200).json({
            status: true,
            message: describeAgingMatch(result),
            data: summary
        });
    } catch (err) {
        console.error("Error in matchClientAgingToLedger:", err);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Closes every distributor invoice, then opens from the newest until the open
// amount equals a positive ledger. Vouchers are not written, so the ledger stays.
export const rebuildClientAgingFromBottom = async (req, res) => {
    const { clientId, ledger, startDate, endDate, store } = req.body || {};
    if (!clientId) {
        return res.status(400).json({ status: false, message: "clientId is required" });
    }
    if (!endDate) {
        return res.status(400).json({ status: false, message: "endDate is required" });
    }
    if (!Number.isFinite(Number(ledger))) {
        return res.status(400).json({ status: false, message: "ledger must be a number" });
    }

    try {
        const result = await applyRebuildOpenFromBottom({
            clientId,
            ledger: Number(ledger),
            startDate,
            endDate,
            store
        });
        const summary = { ...result };
        delete summary.invoices;
        return res.status(200).json({
            status: true,
            message: describeRebuildOpenFromBottom(result),
            data: summary
        });
    } catch (err) {
        console.error("Error in rebuildClientAgingFromBottom:", err);
        return res.status(500).json({ status: false, message: err.message });
    }
};


export const getInvByNumber = async (req, res) => {
    const { invNUmber } = req.params
    console.log(invNUmber)
    try {
        const data = await SalesInvoiceModal.findOne({ SalesInvoice: invNUmber })
        const Client = await CutomerModal.findById(data.Client)
        const TotalProduct = data.SalesData.map((item) => item.product)
        const objectIds = TotalProduct.map(id => new mongoose.Types.ObjectId(id));
        const totalProduct = await ProductModal.find({ _id: { $in: objectIds } });
        console.log(totalProduct)
        res.status(200).send({ data: data, Client: Client, Product: totalProduct });

    } catch (err) {
        console.log(err)
        res.status(400).send(err);

    }
}


export const getSalesInvoiceNumber = async (req, res) => {
    const { status } = req.params;
    console.log(status)
    try {
        // Only fetch the SalesInvoiceNumber field (and exclude _id)
        const invoices = await SalesInvoiceModal.find(
            { PostStatus: status },
            { SalesInvoice: 1, _id: 0 }
        );

        res.status(200).json(invoices);
    } catch (err) {
        console.error("Error fetching invoice numbers:", err);
        res.status(400).send("Something went wrong");
    }
};
export const getSalesInvoiceNumberWithouStatus = async (req, res) => {
    try {
        // Only fetch the SalesInvoiceNumber field (and exclude _id)
        const invoices = await SalesInvoiceModal.find(
            {},
            { SalesInvoice: 1, Store: 1, _id: 0, SalesFlowRef: 1, OrderBooker: 1, SalesInvoiceDate: 1 }
        );

        res.status(200).json(invoices);
    } catch (err) {
        console.error("Error fetching invoice numbers:", err);
        res.status(400).send("Something went wrong");
    }
};

export const postSalesinvoiceBulk = async (req, res) => {
    const { numberfrom, numberto, Admin, invstatus } = req.body;
    console.log(req.body, 'req.body');

    try {
        const errInvoices = [];
        const AllProduct = await TotalProductModal.find();

        const SaleInvoiceData = await SalesInvoiceModal.aggregate([
            { $addFields: { invoiceNum: { $toInt: "$SalesInvoice" } } },
            {
                $match: {
                    invoiceNum: { $gte: parseInt(numberfrom), $lte: parseInt(numberto) },
                    PostStatus: false
                }
            }
        ]);

        // 🔹 Build all invoice data objects (no DB writes here, so no rollback needed)
        const data = SaleInvoiceData.map((item) => ({
            SalesInvoice: item.SalesInvoice,
            id: item._id,
            status: invstatus,
            SalesData: item.SalesData,
            Location: item.Location,
            Store: item.Store,
            inv: item.SalesInvoice,
            AccountsData: {
                VoucherType: "SL",
                VoucherNumber: `SL${item.SalesInvoice}`,
                VoucherDate: item.SalesInvoiceDate,
                status: "Post",
                Store: item.Store,
                VoucharData: (() => {
                    const totalTTS = +(item.TTS || 0).toFixed(3);
                    const totalDistDiscount = +(item.SalesData.reduce((s, r) => s + (+r.diBspass || 0), 0)).toFixed(3);
                    const totalRetailTradeOffer = +(item.SalesData.reduce((s, r) => s + (+r.RToffer || 0), 0)).toFixed(3);
                    const totalWholeSaleTradeOffer = +(item.SalesData.reduce((s, r) => s + (+r.WToffer || 0), 0)).toFixed(3);
                    const totalRetailPowerDrive = +(item.SalesData.reduce((s, r) => s + (+r.RpDrive || 0), 0)).toFixed(3);
                    const TotalWHOLESALEDEAL = +(item.SalesData.reduce((s, r) => s + (+r.WHOLESALEDEAL || 0), 0)).toFixed(3);
                    const TotalRTWholeSale = +(item.SalesData.reduce((s, r) => s + (+r.RTWholeSale || 0), 0)).toFixed(3);
                    const TotalSubDisTPromotion = +(item.SalesData.reduce((s, r) => s + (+r.SubDisTPromotion || 0), 0)).toFixed(3);
                    const TotalHOTZONEDRIVE = +(item.SalesData.reduce((s, r) => s + (+r.HOTZONEDRIVE || 0), 0)).toFixed(3);
                    const TotalSPECIALDISCOUNT = +(item.SalesData.reduce((s, r) => s + (+r.SPECIALDISCOUNT || 0), 0)).toFixed(3);
                    const TotalTradeOffer = +(item.SalesData.reduce((s, r) => s + (+r.TradeOffer || 0), 0)).toFixed(3);
                    const totalExclGst = +(item.SalesData.reduce((s, r) => s + (+r.TotalValueExclGst || 0), 0)).toFixed(3);
                    const totalGst = +(item.SalesData.reduce((s, r) => s + (+r.Gst || 0), 0)).toFixed(3);
                    const totalAdvTax = +(item.SalesData.reduce((s, r) => s + (+r.AdvanceTax || 0), 0)).toFixed(3);

                    const entries = [
                        { Account: Admin.Client, Debit: item.TotalAmount || 0, store: item.Store, Client: item.Client },
                        { Account: Admin.TTS, Debit: totalTTS, store: item.Store },
                        { Account: Admin.DitributerDiscount, Debit: totalDistDiscount, store: item.Store },
                        { Account: Admin.RetailTradeOffer, Debit: totalRetailTradeOffer, store: item.Store },
                        { Account: Admin.RetailPowerDrive, Debit: totalRetailPowerDrive, store: item.Store },
                        { Account: Admin.WholeSaleTradeOffer, Debit: totalWholeSaleTradeOffer, store: item.Store },
                        { Account: Admin.WholeSaleDeal, Debit: TotalWHOLESALEDEAL, store: item.Store },
                        { Account: Admin.RetailWholeSale, Debit: TotalRTWholeSale, store: item.Store },
                        { Account: Admin.SubDistributionPromotion, Debit: TotalSubDisTPromotion, store: item.Store },
                        { Account: Admin.HotZoneDrive, Debit: TotalHOTZONEDRIVE, store: item.Store },
                        { Account: Admin.SpecialDiscount, Debit: TotalSPECIALDISCOUNT, store: item.Store },
                        { Account: Admin.TradeOffer, Debit: TotalTradeOffer, store: item.Store },
                        { Account: Admin.salesRevenue, Credit: totalExclGst, store: item.Store },
                        { Account: Admin.Gst, Credit: totalGst, store: item.Store },
                        { Account: Admin.AdvanceTax, Credit: totalAdvTax, store: item.Store },
                    ].filter(e => (e.Debit ?? 0) !== 0 || (e.Credit ?? 0) !== 0);

                    const totalDebit = +(entries.reduce((s, e) => s + (e.Debit || 0), 0)).toFixed(3);
                    const totalCredit = +(entries.reduce((s, e) => s + (e.Credit || 0), 0)).toFixed(3);
                    const difference = +(totalDebit - totalCredit).toFixed(3);
                    const PositiveDiff = Math.abs(difference);

                    if (PositiveDiff > 0.55) {
                        errInvoices.push({ inv: item.SalesInvoice, Diffrecc: difference, Error: `Debit and Credit not balanced Diffrence is ${difference}` });
                    }
                    if (difference !== 0) {
                        entries.push({
                            Account: Admin.DifferenceExpense,
                            Debit: difference < 0 ? Math.abs(difference) : 0,
                            Credit: difference > 0 ? Math.abs(difference) : 0,
                            store: item.Store,
                        });
                    }

                    return entries;
                })(),
            },

            CostVoucherData: {
                VoucherType: "Co",
                VoucherNumber: `Co${item.SalesInvoice}`,
                VoucherDate: item.SalesInvoiceDate,
                status: "Post",
                VoucharData: (() => {
                    const totalCost = parseFloat(
                        item.SalesData.reduce((sum, row) => {
                            const product = AllProduct.find(
                                (p) =>
                                    p.ProductName == row.product &&
                                    p.Store == item.Store &&
                                    p.Location == item.Location
                            );
                            const rate = (Number(product?.AvgRate).toFixed(4) || 0);
                            return sum + (rate) * (row.totalBox || 0);
                        }, 0).toFixed(4)
                    );

                    return [
                        { Account: Admin.finishedGoods, Credit: totalCost, store: item.Store },
                        { Account: Admin.COSTOFSALES, Debit: totalCost, store: item.Store },
                    ];
                })(),
            },
        }));

        const validInvoices = data.filter(inv => !errInvoices.some(err => err.inv === inv.inv));

        console.log("Valid Invoices:", validInvoices[0]?.CostVoucherData?.VoucharData);
        console.log("Skipped due to imbalance:", errInvoices);

        // 🔹 Process each invoice — rollback happens automatically per invoice
        for (const inv of validInvoices) {
            const session = await mongoose.startSession();

            try {
                await session.withTransaction(async () => {
                    // ⚠️ processSingleInvoice ko session yahin pass ho raha hai.
                    // Us function ke andar HAR query (findOne, bulkWrite, findByIdAndUpdate)
                    // mein bhi { session } pass hona ZAROORI hai, warna wo writes
                    // is transaction ka hissa nahi banenge aur rollback nahi honge.
                    const getRes = await processSingleInvoice(inv, session);

                    if (!getRes || getRes.success === false) {
                        // 🔴 Yahan throw hote hi is invoice ke andar processSingleInvoice
                        // ke sab stock/amount changes automatically UNDO ho jayenge —
                        // kuch bhi commit nahi hoga.
                        const err = new Error(getRes?.message || "Stock update failed");
                        err.details = getRes?.errors;
                        throw err;
                    }

                    if (invstatus === true) {
                        try {
                            await VoucherModal.create([inv.AccountsData], { session });

                            await VoucherModal.create([inv.CostVoucherData], { session });
                        } catch (voucherErr) {
                            // 🔴 Agar voucher creation fail ho (validation error, duplicate
                            // VoucherNumber, DB error waghera), to yahan bhi throw karke
                            // pura transaction abort karte hain — jisse processSingleInvoice
                            // ka stock/amount update bhi automatically rollback ho jayega.
                            throw new Error(`Voucher creation failed: ${voucherErr.message}`);
                        }
                    } else {
                        await VoucherModal.findOneAndDelete(
                            { VoucherNumber: `SL${inv.SalesInvoice}` },
                            { session }
                        );
                        await VoucherModal.findOneAndDelete(
                            { VoucherNumber: `Co${inv.SalesInvoice}` },
                            { session }
                        );
                    }
                });

                // ✅ Agar yahan tak pahunch gaye, matlab transaction commit ho chuka hai —
                // stock update + vouchers dono successfully save hue.

            } catch (error) {
                // 🔴 withTransaction ke andar kahin bhi throw ho (ya khud MongoDB error de),
                // to MongoDB is transaction ke saare writes ko khud rollback kar deta hai.
                // Yahan hum sirf failure ko log/record kar rahe hain — koi manual rollback
                // code likhne ki zaroorat nahi, MongoDB ne already kar diya hai.
                console.error(`Invoice ${inv.inv} rolled back due to error:`, error.message);
                errInvoices.push({
                    inv: inv.inv,
                    error: error.message || "Exception during posting",
                    ...(error.details && { errors: error.details })
                });
            } finally {
                await session.endSession();
            }
        }

        return res.status(200).json({
            success: true,
            message: "Bulk posting completed",
            totalInvoices: SaleInvoiceData.length,
            processed: validInvoices.length,
            failed: errInvoices.length,
            errInvoices,
        });
    } catch (err) {
        console.error("Error in postSalesinvoiceBulk:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while posting bulk invoices",
            error: err.message,
        });
    }
};

// export const postSalesinvoiceBulk = async (req, res) => {
//     const { numberfrom, numberto, Admin, invstatus } = req.body;

//     try {
//         const errInvoices = [];
//         const AllProduct = await TotalProductModal.find();

//         const SaleInvoiceData = await SalesInvoiceModal.aggregate([
//             {
//                 $addFields: { invoiceNum: { $toInt: "$SalesInvoice" } }
//             },
//             {
//                 $match: {
//                     invoiceNum: { $gte: parseInt(numberfrom), $lte: parseInt(numberto) },
//                     PostStatus: false
//                 }
//             }
//         ]);

//         const customRound = (value) => {
//             const num = parseFloat(value) || 0;
//             const floor = Math.floor(num);
//             const decimal = num - floor;
//             return decimal > 0.01 ? floor + 1 : floor;
//         };

//         // 🔹 Build all invoice data objects
//         const data = SaleInvoiceData.map((item) => ({
//             SalesInvoice: item.SalesInvoice,
//             id: item._id,
//             status: invstatus,
//             SalesData: item.SalesData,
//             Location: item.Location,
//             Store: item.Store,
//             inv: item.SalesInvoice,
//             AccountsData: {
//                 VoucherType: "SL",
//                 VoucherNumber: `SL${item.SalesInvoice}`,
//                 VoucherDate: item.SalesInvoiceDate,
//                 status: "Post",
//                 Store: item.Store,
//                 VoucharData: (() => {
//                     const totalTTS = +(item.TTS || 0).toFixed(3);
//                     const totalDistDiscount = +(item.SalesData.reduce((s, r) => s + (+r.diBspass || 0), 0)).toFixed(3);
//                     const totalRetailTradeOffer = +(item.SalesData.reduce((s, r) => s + (+r.RToffer || 0), 0)).toFixed(3);
//                     const totalWholeSaleTradeOffer = +(item.SalesData.reduce((s, r) => s + (+r.WToffer || 0), 0)).toFixed(3);
//                     const totalRetailPowerDrive = +(item.SalesData.reduce((s, r) => s + (+r.RpDrive || 0), 0)).toFixed(3);
//                     const TotalWHOLESALEDEAL = +(item.SalesData.reduce((s, r) => s + (+r.WHOLESALEDEAL || 0), 0)).toFixed(3);
//                     const TotalRTWholeSale = +(item.SalesData.reduce((s, r) => s + (+r.RTWholeSale || 0), 0)).toFixed(3);
//                     const TotalSubDisTPromotion = +(item.SalesData.reduce((s, r) => s + (+r.SubDisTPromotion || 0), 0)).toFixed(3);
//                     const TotalHOTZONEDRIVE = +(item.SalesData.reduce((s, r) => s + (+r.HOTZONEDRIVE || 0), 0)).toFixed(3);
//                     const TotalSPECIALDISCOUNT = +(item.SalesData.reduce((s, r) => s + (+r.SPECIALDISCOUNT || 0), 0)).toFixed(3);
//                     const TotalTradeOffer = +(item.SalesData.reduce((s, r) => s + (+r.TradeOffer || 0), 0)).toFixed(3);
//                     const totalExclGst = +(item.SalesData.reduce((s, r) => s + (+r.TotalValueExclGst || 0), 0)).toFixed(3);
//                     const totalGst = +(item.SalesData.reduce((s, r) => s + (+r.Gst || 0), 0)).toFixed(3);
//                     const totalAdvTax = +(item.SalesData.reduce((s, r) => s + (+r.AdvanceTax || 0), 0)).toFixed(3);

//                     const entries = [
//                         { Account: Admin.Client, Debit: item.TotalAmount || 0, store: item.Store, Client: item.Client },
//                         { Account: Admin.TTS, Debit: totalTTS, store: item.Store },
//                         { Account: Admin.DitributerDiscount, Debit: totalDistDiscount, store: item.Store },
//                         { Account: Admin.RetailTradeOffer, Debit: totalRetailTradeOffer, store: item.Store },
//                         { Account: Admin.RetailPowerDrive, Debit: totalRetailPowerDrive, store: item.Store },
//                         { Account: Admin.WholeSaleTradeOffer, Debit: totalWholeSaleTradeOffer, store: item.Store },
//                         { Account: Admin.WholeSaleDeal, Debit: TotalWHOLESALEDEAL, store: item.Store },
//                         { Account: Admin.RetailWholeSale, Debit: TotalRTWholeSale, store: item.Store },
//                         { Account: Admin.SubDistributionPromotion, Debit: TotalSubDisTPromotion, store: item.Store },
//                         { Account: Admin.HotZoneDrive, Debit: TotalHOTZONEDRIVE, store: item.Store },
//                         { Account: Admin.SpecialDiscount, Debit: TotalSPECIALDISCOUNT, store: item.Store },
//                         { Account: Admin.TradeOffer, Debit: TotalTradeOffer, store: item.Store },
//                         { Account: Admin.salesRevenue, Credit: totalExclGst, store: item.Store },
//                         { Account: Admin.Gst, Credit: totalGst, store: item.Store },
//                         { Account: Admin.AdvanceTax, Credit: totalAdvTax, store: item.Store },
//                     ].filter(e => (e.Debit ?? 0) !== 0 || (e.Credit ?? 0) !== 0);

//                     const totalDebit = +(entries.reduce((s, e) => s + (e.Debit || 0), 0)).toFixed(3);
//                     const totalCredit = +(entries.reduce((s, e) => s + (e.Credit || 0), 0)).toFixed(3);
//                     const difference = +(totalDebit - totalCredit).toFixed(3);
//                     const PositiveDiff = Math.abs(difference);

//                     if (PositiveDiff > 0.55) {
//                         errInvoices.push({ inv: item.SalesInvoice, Diffrecc: difference, Error: `Debit and Credit not balanced Diffrence is ${difference}` });
//                     }
//                     if (difference !== 0) {
//                         entries.push({
//                             Account: Admin.DifferenceExpense,
//                             Debit: difference < 0 ? Math.abs(difference) : 0,
//                             Credit: difference > 0 ? Math.abs(difference) : 0,
//                             store: item.Store,
//                         });
//                     }

//                     return entries;
//                 })(),

//             },




//             CostVoucherData: {
//                 VoucherType: "Co",
//                 VoucherNumber: `Co${item.SalesInvoice}`,
//                 VoucherDate: item.SalesInvoiceDate,
//                 status: "Post",
//                 VoucharData: (() => {
//                     // total cost calculation once
//                     const totalCost = parseFloat(
//                         item.SalesData.reduce((sum, row) => {
//                             const product = AllProduct.find(
//                                 (p) =>
//                                     p.ProductName == row.product &&
//                                     p.Store == item.Store &&
//                                     p.Location == item.Location
//                             );
//                             const rate = (Number(product?.AvgRate).toFixed(4) || 0)
//                             console.log(rate)
//                             return sum + (rate) * (row.totalBox || 0);
//                         }, 0).toFixed(4)

//                     );
//                     console.log(totalCost, item.Store, item.Location)

//                     return [
//                         {
//                             Account: Admin.finishedGoods,
//                             Credit: totalCost,
//                             store: item.Store,
//                         },
//                         {
//                             Account: Admin.COSTOFSALES,
//                             Debit: totalCost,
//                             store: item.Store,
//                         },
//                     ];
//                 })(),
//             },
//         }));

//         // 🔹 Exclude invoices already marked as error
//         const validInvoices = data.filter(inv => !errInvoices.some(err => err.inv === inv.inv));

//         console.log("Valid Invoices:", validInvoices[0]?.CostVoucherData?.VoucharData);
//         console.log("Skipped due to imbalance:", errInvoices);

//         // 🔹 Process each invoice safely
//         for (const inv of validInvoices) {
//             try {

//                 const getRes = await processSingleInvoice(inv)


//                 if (!getRes || getRes.success === false) {
//                     errInvoices.push({ inv: inv.inv, error: getRes?.message || "post failed" });
//                     continue;
//                 }
//                 else {
//                     if (invstatus === true) {
//                         const voucherData = await VoucherModal.create(inv.AccountsData);
//                         const costVoucherData = await VoucherModal.create(inv.CostVoucherData);
//                         console.log(costVoucherData)
//                     }
//                     else {
//                         // await VoucherModal.findOneAndDelete({ VoucherNumber: `SL${inv.SalesInvoice}` });
//                         //await VoucherModal.findOneAndDelete({ VoucherNumber: `Co${inv.SalesInvoice}` });
//                     }
//                 }

//             } catch (error) {
//                 errInvoices.push({ inv: inv.inv, error: error.message || "Exception during posting" });
//             }
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Bulk posting completed",
//             totalInvoices: SaleInvoiceData.length,
//             processed: validInvoices.length,
//             failed: errInvoices.length,
//             errInvoices,
//         });
//     } catch (err) {
//         console.error("Error in postSalesinvoiceBulk:", err);
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong while posting bulk invoices",
//             error: err.message,
//         });
//     }
// };

// export const UnpostSalesinvoiceBulk = async (req, res) => {
//     const { numberfrom, numberto, Admin, invstatus } = req.body;

//     try {
//         const errInvoices = [];
//         const AllProduct = await TotalProductModal.find();

//         const SaleInvoiceData = await SalesInvoiceModal.aggregate([
//             {
//                 $addFields: { invoiceNum: { $toInt: "$SalesInvoice" } }
//             },
//             {
//                 $match: {
//                     invoiceNum: { $gte: parseInt(numberfrom), $lte: parseInt(numberto) },
//                     PostStatus: true
//                 }
//             }
//         ]);




//         // 🔹 Build all invoice data objects
//         const data = SaleInvoiceData.map((item) => ({
//             SalesInvoice: item.SalesInvoice,
//             id: item._id,
//             status: invstatus,
//             SalesData: item.SalesData,
//             Location: item.Location,
//             Store: item.Store,
//             inv: item.SalesInvoice,
//         }));

//         // 🔹 Exclude invoices already marked as error
//         const validInvoices = data.filter(inv => !errInvoices.some(err => err.inv === inv.inv));
//         console.log("Skipped due to imbalance:", errInvoices?.length);

//         // 🔹 Process each invoice safely
//         for (const inv of validInvoices) {
//             try {

//                 const getRes = await processSingleInvoice(inv)


//                 if (!getRes || getRes.success === false) {
//                     errInvoices.push({ inv: inv.inv, error: getRes?.message || "post failed" });
//                     continue;
//                 }
//                 else {
//                     if (invstatus === false) {
//                         await VoucherModal.findOneAndDelete({ VoucherNumber: `SL${inv.SalesInvoice}` });
//                         await VoucherModal.findOneAndDelete({ VoucherNumber: `Co${inv.SalesInvoice}` });
//                     }
//                 }

//             } catch (error) {
//                 errInvoices.push({ inv: inv.inv, error: error.message || "Exception during posting" });
//             }
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Bulk posting completed",
//             totalInvoices: SaleInvoiceData.length,
//             processed: validInvoices.length,
//             failed: errInvoices.length,
//             errInvoices,
//         });
//     } catch (err) {
//         console.error("Error in postSalesinvoiceBulk:", err);
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong while posting bulk invoices",
//             error: err.message,
//         });
//     }
// };


export const UnpostSalesinvoiceBulk = async (req, res) => {
    const { numberfrom, numberto, invstatus } = req.body;
    const isUnpost = invstatus === false || invstatus === "false";

    try {
        // 1) Range ke posted invoices
        const invoices = await SalesInvoiceModal.aggregate([
            { $addFields: { invoiceNum: { $toInt: "$SalesInvoice" } } },
            {
                $match: {
                    invoiceNum: { $gte: parseInt(numberfrom), $lte: parseInt(numberto) },
                    PostStatus: true,
                },
            },
        ]);

        // 2) Checks: kuch bhi unpost hone se pehle, pehli error par response
        if (isUnpost) {
            const chqs = await CustomerChqRecivedModal.aggregate([
                { $unwind: "$grouped" },
                { $unwind: "$grouped.items" },
                {
                    $addFields: {
                        itemStatus: {
                            $ifNull: [
                                "$grouped.items.status",
                                { $ifNull: ["$grouped.items.staus", "$grouped.status"] },
                            ],
                        },
                    },
                },
                { $match: { itemStatus: { $in: ["Pending", "Received"] } } },
                { $project: { _id: 0, Invoice: "$grouped.items.Invoice" } },
            ]);
            const chqInvoices = new Set(chqs.map((c) => Number(c.Invoice)));

            for (const item of invoices) {
                const inv = item.SalesInvoice;

                if (Number(item.TotalAmount) !== Number(item.RecivedAmount)) {
                    return res.status(400).json({
                        success: false,
                        invoice: inv,
                        message: `Invoice ${inv}: Total aur Received amount barabar nahi hain`,
                    });
                }
                if (chqInvoices.has(Number(inv))) {
                    return res.status(400).json({
                        success: false,
                        invoice: inv,
                        message: `Invoice ${inv}: is invoice par cheque maujood hai`,
                    });
                }
            }
        }

        // 3) Har invoice apni transaction me unpost
        let processed = 0;

        for (const item of invoices) {
            const inv = item.SalesInvoice;
            const session = await mongoose.startSession();

            try {
                await session.withTransaction(async () => {
                    const result = await processSingleInvoice(
                        {
                            SalesInvoice: inv,
                            id: item._id,
                            status: invstatus,
                            SalesData: item.SalesData,
                            Location: item.Location,
                            Store: item.Store,
                            inv,
                        },
                        session
                    );

                    // throw karne se is invoice ki transaction rollback ho jati hai
                    if (!result || result.success === false) {
                        throw new Error(result?.message || "unpost failed");
                    }

                    if (isUnpost) {
                        await VoucherModal.deleteOne({ VoucherNumber: `SL${inv}` }, { session });
                        await VoucherModal.deleteOne({ VoucherNumber: `Co${inv}` }, { session });
                    }
                });

                processed++;
            } catch (error) {
                // Pehli error par ruk jao aur seedha error bhej do
                return res.status(400).json({
                    success: false,
                    invoice: inv,
                    processed, // is se pehle kitni unpost ho chuki hain
                    message: `Invoice ${inv}: ${error.message || "Exception during processing"}`,
                });
            } finally {
                await session.endSession();
            }
        }

        return res.status(200).json({
            success: true,
            message: "Bulk unposting completed",
            totalInvoices: invoices.length,
            processed,
        });
    } catch (err) {
        console.error("Error in UnpostSalesinvoiceBulk:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Something went wrong while unposting bulk invoices",
        });
    }
};


export const UpdateSaleData = async (req, res) => {
    try {
        const { SalesData, SalesFlowRef } = req.body;

        const updatedInvoice = await SalesInvoiceModal.findOneAndUpdate(
            { SalesFlowRef },
            { $set: { SalesData } },   // 🔁 old array replaced
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedInvoice) {
            return res.status(404).json({
                success: false,
                message: "Sales invoice not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Sales data updated successfully",
            data: updatedInvoice
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const updateRemarks = async (req, res) => {
    try {
        const { id } = req.params
        const { Remarks } = req.body
        const data = await SalesInvoiceModal.findByIdAndUpdate(id, { Remarks: Remarks })
        res.status(200).send(data)
    } catch (err) {
        res.status(400).send(err)
    }
}


export const getInvoiceByref = async (req, res) => {
    try {
        const { SalesFlowRef } = req.params
        const data = await SalesInvoiceModal.findOne({ SalesFlowRef: SalesFlowRef })
        res.status(200).send(data)
    } catch (err) {
        res.status(400).send(err)
    }
}


export const getRemainOnlyByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;

        // Fetch sales invoices with remaining amount for this customer
        const data = await SalesInvoiceModal.find({
            RemainingAmount: { $ne: 0, $exists: true },
            Client: customerId,
            PostStatus: true
        })
            .select("SalesInvoice Client RemainingAmount RecivedAmount Store SalesFlowRef SalesInvoiceDate");

        // Fetch Opening invoices that belong to this customer
        const OpeningInvoices = await InvoiceOpeningModal.findOne();
        let Opening = [];
        if (OpeningInvoices && OpeningInvoices.InvoiceData) {
            Opening = OpeningInvoices.InvoiceData.filter((item) => {
                return Number(item.RemaingAmount) !== 0 && item.Client == customerId
            });
        }

        const totaldata = Opening.concat(data);
        res.status(200).send({ data: totaldata });
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }
};

