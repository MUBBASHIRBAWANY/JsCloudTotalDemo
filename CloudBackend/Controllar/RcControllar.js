
import TotalProductModal from "../Modal/TotalProductModal.js";
import VendorModel from "../Modal/VendorModal.js";
import ProductModal from "../Modal/ProductModal.js";
import mongoose from "mongoose";
import RcModal from "../Modal/RcModal.js";
import { addStock, reduceStock, recalculateAvgRate, StockError } from "../Midelware/stockMiddleware.js";

const httpError = (statusCode, message, extra) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    if (extra) err.details = extra;
    return err;
};

// export const createRc = async (req, res) => {
//     const { Vendor, RCData, createBy, RcDate, SalesFlowRef, Store, Location, } = req.body
//     try {
//         console.log(RCData)
//         const code = await RcModal.find().sort({ RcCode: -1 }).limit(1)
//         console.log(code)
//         let nextCode
//         if (code.length == 0) {
//             const nextNumber = parseInt("000000", 10) + 1;
//             nextCode = nextNumber.toString().padStart(6, '0')
//         }
//         else {
//             const nextNumber = parseInt(code[0].RcCode, 10) + 1;
//             console.log(nextNumber)
//             nextCode = nextNumber.toString().padStart(6, '0')
//         }

//         const data = await RcModal.create({
//             RcCode: nextCode,
//             RcData: RCData,
//             Vendor,
//             createBy,
//             RcDate,
//             SalesFlowRef,
//             PostStatus: true,
//             Store,
//             Location,
//         })
//         await addStock(
//             RCData.map(item => ({
//                 ProductName: item.product,
//                 Location,
//                 Store,
//                 quantity: Number(item.totalBox) || 0,
//                 amount: Number(item.ValueAfterDiscout) || 0
//             }))
//         );
//         await recalculateAvgRate(
//             RCData.map(item => ({ ProductName: item.product, Location, Store }))
//         );
//         res.status(200).send(data)

//     }
//     catch (err) {
//         console.log(err)
//         res.status(400).send("some thing went wrong")
//     }
// }

export const createRc = async (req, res) => {
    const { Vendor, RCData, createBy, RcDate, SalesFlowRef, Store, Location } = req.body;

    if (!Array.isArray(RCData) || RCData.length === 0) {
        return res.status(400).send("RCData is required");
    }

    const session = await mongoose.startSession();

    try {
        let data;

        await session.withTransaction(async () => {
            // Generate next RC code inside the transaction
            const last = await RcModal.find().sort({ RcCode: -1 }).limit(1).session(session);
            const nextNumber = last.length === 0 ? 1 : parseInt(last[0].RcCode, 10) + 1;
            const nextCode = nextNumber.toString().padStart(6, "0");

            // create() needs an array when passing { session }
            const [created] = await RcModal.create(
                [
                    {
                        RcCode: nextCode,
                        RcData: RCData,
                        Vendor,
                        createBy,
                        RcDate,
                        SalesFlowRef,
                        PostStatus: true,
                        Store,
                        Location,
                    },
                ],
                { session }
            );
            data = created;

            // Build the stock lines once, reuse for both calls
            const stockLines = RCData.map((item) => ({
                ProductName: item.product,
                Location,
                Store,
                quantity: Number(item.totalBox) || 0,
                amount: Number(item.ValueAfterDiscout) || 0,
            }));

            // Both helpers must accept and use the session — see notes below
            await addStock(stockLines, session);
            await recalculateAvgRate(
                stockLines.map(({ ProductName, Location, Store }) => ({ ProductName, Location, Store })),
                session
            );
        });

        return res.status(200).send(data);
    } catch (err) {
        console.log(err);

        // Race on the unique RcCode (two requests generating the same next code)
        if (err?.code === 11000) {
            return res.status(409).send("Duplicate RC code, please retry");
        }

        return res.status(err.statusCode || 400).send(err.message || "Something went wrong");
    } finally {
        await session.endSession();
    }
};
const productIdOf = (product) => {
    if (product && typeof product === "object") return product._id || "";
    return product || "";
};

const toStockLines = (rows, location, store) =>
    (rows || [])
        .map((item) => ({
            ProductName: productIdOf(item?.product),
            Location: location,
            Store: store,
            quantity: Number(item?.totalBox) || 0,
            amount: Number(item?.ValueAfterDiscout) || 0,
        }))
        .filter((line) => line.ProductName);

const isPostedStatus = (status) => status === true || status === "true";

export const updateRc = async (req, res) => {
    const { id } = req.params;
    const { RCData, RcDate, SalesFlowRef, Store, Location, Vendor } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid RC id" });
    }

    if (!Array.isArray(RCData) || RCData.length === 0) {
        return res.status(400).send({ message: "RCData is required" });
    }

    const session = await mongoose.startSession();

    try {
        let responseData;

        await session.withTransaction(
            async () => {
                const existingRc = await RcModal.findById(id).session(session);
                if (!existingRc) {
                    throw { statusCode: 404, message: "RC not found" };
                }

                const finalLocation = Location || existingRc.Location;
                const finalStore = Store || existingRc.Store;
                const finalVendor = Vendor || existingRc.Vendor;

                const data = await RcModal.findByIdAndUpdate(
                    id,
                    {
                        RcData: RCData,
                        ...(RcDate ? { RcDate } : {}),
                        ...(SalesFlowRef !== undefined ? { SalesFlowRef } : {}),
                        Store: finalStore,
                        Location: finalLocation,
                        Vendor: finalVendor,
                        PostStatus : "true"
                    },
                    { session, new: true }
                );

                // Unposted RC ka stock Post button pe lagta hai.
                // Posted RC edit pe purana stock hata kar naya lagao, warna quantity double ho jati hai.
                if (isPostedStatus(existingRc.PostStatus)) {
                    const oldLines = toStockLines(existingRc.RcData, existingRc.Location, existingRc.Store);
                    const newLines = toStockLines(RCData, finalLocation, finalStore);

                    if (oldLines.length > 0) {
                        await reduceStock(oldLines, { session });
                    }
                    if (newLines.length > 0) {
                        await addStock(newLines, { session });
                    }

                    const rateKeys = [...oldLines, ...newLines].map(({ ProductName, Location: lineLocation, Store: lineStore }) => ({
                        ProductName,
                        Location: lineLocation,
                        Store: lineStore,
                    }));
                    if (rateKeys.length > 0) {
                        await recalculateAvgRate(rateKeys, { session });
                    }
                }

                responseData = data;
            },
            { maxCommitTimeMS: 15000 }
        );

        return res.status(200).send({ message: "Data Edit", data: responseData });
    } catch (err) {
        console.log("updateRc error:", err);

        if (err instanceof StockError || err?.name === "StockError") {
            return res.status(400).send({
                message: err.message || "Stock cannot go negative",
                error: err.details,
            });
        }

        if (err.statusCode) {
            return res.status(err.statusCode).send({ message: err.message });
        }

        return res.status(400).send({
            message: "some thing went wrong",
            error: err.message,
        });
    } finally {
        await session.endSession();
    }
};

// export const updateRc = async (req, res) => {
//     const { id } = req.params
//     const { RCData, RcDate, SalesFlowRef, Store, Location } = req.body
//     console.log(id)
//     try {
//         // 1. Get existing RC data
//         const existingRc = await RcModal.findById(id);
//         if (!existingRc) {
//             return res.status(404).send("RC not found");
//         }

//         const oldLocation = Location || existingRc.Location;
//         const oldStore = Store || existingRc.Store;

//         // 2. Update the RC data (no old stock reverse)
//         const data = await RcModal.findByIdAndUpdate(id, {
//             RcData: RCData,
//             RcDate,
//             PostStatus: "true",
//             SalesFlowRef,
//         })

//         // 3. Add new stock
//         if (RCData && RCData.length > 0) {
//             await addStock(
//                 RCData.map(item => ({
//                     ProductName: item.product,
//                     Location: oldLocation,
//                     Store: oldStore,
//                     quantity: Number(item.totalBox) || 0,
//                     amount: Number(item.ValueAfterDiscout) || 0
//                 }))
//             );
//             await recalculateAvgRate(
//                 RCData.map(item => ({ ProductName: item.product, Location: oldLocation, Store: oldStore }))
//             );
//         }

//         res.status(200).send("Data Edit")
//     }
//     catch (err) {
//         console.log(err)
//         res.status(400).send("some thing went wrong")
//     }
// }


export const getAllRcByVendor = async (req, res) => {
    try {
        const { Vendor } = req.params
        console.log(Vendor)
        const data = await RcModal.find({ Vendor: Vendor }).sort({ _id: -1 }).limit(200)
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")

    }
}

export const getAllRc = async (req, res) => {
    try {
        const data = await RcModal.find().sort({ _id: -1 }).limit(200)
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")

    }
}

export const getAllPostRC = async (req, res) => {
    try {
        const data = await RcModal.find({ PostStatus: { $ne: "invoice" } }).sort({ _id: -1 }).limit(200)
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")

    }
}

// export const postRc = async (req, res) => {
//     const { status, data: RCData, Location, Store } = req.body;
//     console.log(req.body)
//     const { id } = req.params;

//     if (status === true) {
//         try {
//             // Check if all products exist in TotalProductModal before adding
//             const stockChecks = await Promise.all(
//                 RCData.map(async (item) => {
//                     const product = await TotalProductModal.findOne({
//                         ProductName: item.product,
//                         Location,
//                         Store
//                     });
//                     return { product, item };
//                 })
//             );

//             // Find products that don't exist in TotalProductModal
//             const missingProducts = stockChecks.filter(({ product }) => !product);

//             if (missingProducts.length > 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Some products not found in TotalProductModal",
//                     errors: missingProducts.map(({ item }) => ({
//                         productId: item.product,
//                         message: "Product not found in inventory"
//                     }))
//                 });
//             }

//             await addStock(
//                 RCData.map(item => ({
//                     ProductName: item.product,
//                     Location,
//                     Store,
//                     quantity: Number(item.totalBox) || 0,
//                     amount: Number(item.ValueAfterDiscout) || 0
//                 }))
//             );
//             await recalculateAvgRate(
//                 RCData.map(item => ({ ProductName: item.product, Location, Store }))
//             );
//             await RcModal.findByIdAndUpdate(id, { PostStatus: true });

//             return res.status(200).json({
//                 success: true,
//                 message: "RC posted and stock increased successfully"
//             });

//         } catch (error) {
//             console.error("Error posting stock:", error);
//             return res.status(500).json({
//                 success: false,
//                 message: "Failed to update stock during posting"
//             });
//         }

//     } else {
//         try {
//             if (!RCData || !Array.isArray(RCData)) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Missing or invalid RC data"
//                 });
//             }

//             // Check if all products exist in TotalProductModal before unposting
//             const stockChecks = await Promise.all(
//                 RCData.map(async (item) => {
//                     const product = await TotalProductModal.findOne({
//                         ProductName: item.product,
//                         Location,
//                         Store
//                     });
//                     return { product, item };
//                 })
//             );

//             // Find products that either don't exist or have insufficient stock
//             const insufficientStock = stockChecks.filter(({ product, item }) =>
//                 !product || (product.TotalQuantity || 0) < (item.totalBox || 0)
//             );

//             if (insufficientStock.length > 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Insufficient stock to unpost RC",
//                     errors: insufficientStock.map(({ product, item }) =>
//                         !product
//                             ? { productId: item.product, message: "Product not found in inventory" }
//                             : {
//                                 product: product.ProductName,
//                                 available: product.TotalQuantity,
//                                 tryingToDeduct: item.totalBox
//                             }
//                     )
//                 });
//             }

//             // Reduce stock only after all checks pass
//             try {
//                 await reduceStock(
//                     RCData.map(item => ({
//                         ProductName: item.product,
//                         Location,
//                         Store,
//                         quantity: Number(item.totalBox) || 0,
//                         amount: Number(item.ValueAfterDiscout) || 0
//                     }))
//                 );
//             } catch (stockErr) {
//                 if (stockErr instanceof StockError) {
//                     return res.status(400).json({
//                         success: false,
//                         message: "Insufficient stock to unpost RC",
//                         errors: stockErr.details
//                     });
//                 }
//                 throw stockErr;
//             }

//             // Update RC post status to false
//             await RcModal.findByIdAndUpdate(id, { PostStatus: false });

//             return res.status(200).json({
//                 success: true,
//                 message: "RC unposted and stock reverted successfully"
//             });

//         } catch (error) {
//             console.error("Error unposting stock:", error);
//             return res.status(500).json({
//                 success: false,
//                 message: "Error occurred while unposting RC"
//             });
//         }

//     }
// };


export const postRc = async (req, res) => {
    const { status, data: RCData, Location, Store } = req.body;
    const { id } = req.params;

    if (!RCData || !Array.isArray(RCData)) {
        return res.status(400).json({
            success: false,
            message: "Missing or invalid RC data",
        });
    }

    const session = await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            result = undefined; // reset in case the callback is retried

            // Check all products exist, inside the transaction
            const stockChecks = await Promise.all(
                RCData.map(async (item) => {
                    const product = await TotalProductModal.findOne({
                        ProductName: item.product,
                        Location,
                        Store,
                    }).session(session);
                    return { product, item };
                })
            );

            if (status === true) {
                // ---- POST ----
                const missingProducts = stockChecks.filter(({ product }) => !product);

                if (missingProducts.length > 0) {
                    throw httpError(
                        400,
                        "Some products not found in TotalProductModal",
                        missingProducts.map(({ item }) => ({
                            productId: item.product,
                            message: "Product not found in inventory",
                        }))
                    );
                }

                const stockLines = RCData.map((item) => ({
                    ProductName: item.product,
                    Location,
                    Store,
                    quantity: Number(item.totalBox) || 0,
                    amount: Number(item.ValueAfterDiscout) || 0,
                }));

                // These helpers must accept and use the session — see notes below
                await addStock(stockLines, { session });
                await recalculateAvgRate(
                    stockLines.map(({ ProductName, Location, Store }) => ({ ProductName, Location, Store })),
                    { session }
                );
                await RcModal.findByIdAndUpdate(id, { PostStatus: true }, { session });

                result = {
                    status: 200,
                    body: { success: true, message: "RC posted and stock increased successfully" },
                };
            } else {
                // ---- UNPOST ----
                const insufficientStock = stockChecks.filter(
                    ({ product, item }) => !product || (product.TotalQuantity || 0) < (item.totalBox || 0)
                );

                if (insufficientStock.length > 0) {
                    throw httpError(
                        400,
                        "Insufficient stock to unpost RC",
                        insufficientStock.map(({ product, item }) =>
                            !product
                                ? { productId: item.product, message: "Product not found in inventory" }
                                : {
                                    product: product.ProductName,
                                    available: product.TotalQuantity,
                                    tryingToDeduct: item.totalBox,
                                }
                        )
                    );
                }

                const stockLines = RCData.map((item) => ({
                    ProductName: item.product,
                    Location,
                    Store,
                    quantity: Number(item.totalBox) || 0,
                    amount: Number(item.ValueAfterDiscout) || 0,
                }));

                try {
                    await reduceStock(stockLines, session);
                } catch (stockErr) {
                    if (stockErr instanceof StockError) {
                        throw httpError(400, "Insufficient stock to unpost RC", stockErr.details);
                    }
                    throw stockErr;
                }
                await RcModal.findByIdAndUpdate(id, { PostStatus: false }, { session });

                result = {
                    status: 200,
                    body: { success: true, message: "RC unposted and stock reverted successfully" },
                };
            }
        });

        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error(status === true ? "Error posting stock:" : "Error unposting stock:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : status === true
                    ? "Failed to update stock during posting"
                    : "Error occurred while unposting RC",
            ...(error.details ? { errors: error.details } : {}),
        });
    } finally {
        await session.endSession();
    }
};