import PurchaseInvoiceModal from "../modal/PurchaseInvoiceModal.js"
import TotalProductModal from "../modal/TotalProductModal.js";
import { CounterModel } from '../modal/CounterModel .js';
import VendorModel from "../modal/VendorModal.js";
import ProductModal from "../modal/ProductModal.js";
import mongoose from "mongoose";
import RcModal from "../modal/RcModal.js";
import logModal from '../modal/LogModal.js';
import { Check } from "../Check.js";
import { checkMonthClose } from "../utils/checkMonthClose.js";
export const createPurchaseInvoice = async (req, res) => {
    const monthCheck = await checkMonthClose(req, res, "PurchaseInvoiceDate");
    if (monthCheck) return;

    const { Vendor, PurchaseData, VendorCode, PurchaseInvoiceDate, SalesFlowRef, Store, Location, InvoiceRef, AdvanceTax, Discount, TotalAmount, RCNumber,Type, GST } = req.body
    const userId = req.user?._id || req.user?.id; // Adjust based on your auth setup

    try {
        const code = await PurchaseInvoiceModal.find({ Vendor: Vendor }).sort({ _id: -1 }).limit(1)
        console.log(code)
        let nextCode
        if (code.length == 0) {
            const nextNumber = parseInt("000000", 10) + 1;
            nextCode = nextNumber.toString().padStart(6, '0')
        }
        else {
            const nextNumber = parseInt(code[0].invoiceCode, 10) + 1;
            console.log(nextNumber)
            nextCode = nextNumber.toString().padStart(6, '0')
        }

        const data = await PurchaseInvoiceModal.create({
            invoiceCode: nextCode,
            PurchaseInvoice: VendorCode + nextCode,
            PurchaseData,
            Vendor,
            InvoiceRef,
            PurchaseInvoiceDate,
            SalesFlowRef,
            PostStatus: false,
            Type: Type,
            Store,
            Location,
            AdvanceTax,
            Discount,
            TotalAmount,
            RCNumber,
            GST,

        })

        await logModal.create({
            userId: userId,
            action: "create",
            Page : "Purchase",
            payload: {
                Vendor,
                VendorCode,
                PurchaseInvoice: VendorCode + nextCode,
                Type,
                Store,
                Location,
                TotalAmount,
                RCNumber,
                PurchaseDataCount: PurchaseData?.length
            },
            responseStatus: 200,
            RefNumber: VendorCode + nextCode,
        });

        if (Type !== "RC") {


            const bulkOps = PurchaseData.map(item => ({
                updateOne: {
                    filter: {
                        ProductName: item.product,
                        Location: Location,
                        Store: Store
                    },
                    update: {
                        $inc: {
                            TotalQuantity: Number(item.totalBox) || 0,
                            Amount: item.ValueAfterDiscout
                        },
                        $setOnInsert: {
                            ProductName: item.product,
                            Location: Location,
                            Store: Store
                        }
                    },
                    upsert: true
                }
            }));

            await TotalProductModal.bulkWrite(bulkOps);
            for (const item of PurchaseData) {
                const product = await TotalProductModal.findOne({
                    ProductName: item.product,
                    Location,
                    Store
                });

                if (product && product.TotalQuantity > 0) {
                    const avgRate = product.Amount / product.TotalQuantity;
                    await TotalProductModal.updateOne(
                        { _id: product._id },
                        { $set: { AvgRate: avgRate } }
                    );
                }
            }
            console.log(bulkOps)
        }
        res.status(200).send(data)

    }
    catch (err) {
        console.log(err)
       
        res.status(400).send("some thing went wrong")
    }
}


export const updateTotalAmount = async (req ,res) =>{
    try{
        for(const item of Check){
            const data = await PurchaseInvoiceModal.findOne({
                PurchaseInvoice : item.invoice
            })
            const totalInvoice = data.PurchaseData.reduce((sum, row) => sum + (Number(row.netAmunt) || 0), 0)
            const totalGST = data.PurchaseData.reduce((sum, row) => sum + (Number(row.GST) || 0), 0)
            const total = Number(totalInvoice) +  Number(data.GST || 0) + Number(data.AdvanceTax || 0) - Number(data.Discount || 0)
            console.log(total ,  "item.invoice" , item.invoice);
            await PurchaseInvoiceModal.findByIdAndUpdate(data._id , {
                TotalAmount : total
            })
              
            

        }
    }catch(err){
        console.log(err);
        
    }
}



const getNextInvoiceNumber = async (vendorId) => {
    const counter = await CounterModel.findByIdAndUpdate(
        vendorId,
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
    );
    return counter.seq.toString().padStart(6, '0');
}

export const updatePurchaseInvoice = async (req, res) => {
    const monthCheck = await checkMonthClose(req, res, "PurchaseInvoiceDate");
    if (monthCheck) return;

    const { id } = req.params;
    const { GST, AdvanceTax, Discount, TotalAmount, PurchaseData, PurchaseInvoiceDate, SalesFlowRef, Type, Location, Store , InvoiceRef} = req.body;
    const userId = req.user?._id || req.user?.id;

    try {
        // Get the existing invoice first
        const existingInvoice = await PurchaseInvoiceModal.findById(id);
        
        if (!existingInvoice) {
            return res.status(404).send("Invoice not found");
        }

        // Validate PurchaseData
        if (!PurchaseData || !Array.isArray(PurchaseData)) {
            return res.status(400).send("PurchaseData is required and must be an array");
        }

        // Use the existing values if not provided
        const newType = Type || existingInvoice.Type;
        const newLocation = Location || existingInvoice.Location;
        const newStore = Store || existingInvoice.Store;

        // Check if location or store changed - this is a special case
        const locationChanged = newLocation !== existingInvoice.Location || newStore !== existingInvoice.Store;

        // 1. REVERSE OLD STOCK
        if (existingInvoice.Type !== "RC") {
            // If location/store changed, reverse from old location
            const locationToReverse = locationChanged ? existingInvoice.Location : newLocation;
            const storeToReverse = locationChanged ? existingInvoice.Store : newStore;

            const oldBulkOps = existingInvoice.PurchaseData.map(item => ({
                updateOne: {
                    filter: {
                        ProductName: item.product,
                        Location: locationToReverse,
                        Store: storeToReverse
                    },
                    update: {
                        $inc: {
                            TotalQuantity: -(Number(item.totalBox) || 0),
                            Amount: -(item.ValueAfterDiscout || 0)
                        }
                    }
                }
            }));

            if (oldBulkOps.length > 0) {
                await TotalProductModal.bulkWrite(oldBulkOps);
            }

            // Recalculate AvgRate for old products
            for (const item of existingInvoice.PurchaseData) {
                const product = await TotalProductModal.findOne({
                    ProductName: item.product,
                    Location: locationToReverse,
                    Store: storeToReverse
                });

                if (product) {
                    if (product.TotalQuantity > 0) {
                        const avgRate = product.Amount / product.TotalQuantity;
                        await TotalProductModal.updateOne(
                            { _id: product._id },
                            { $set: { AvgRate: avgRate } }
                        );
                    } else if (product.TotalQuantity === 0) {
                        await TotalProductModal.updateOne(
                            { _id: product._id },
                            { $set: { AvgRate: 0 } }
                        );
                    }
                }
            }
        }

        // 2. UPDATE THE INVOICE
        const updatedInvoice = await PurchaseInvoiceModal.findByIdAndUpdate(
            id,
            {
                PurchaseData,
                PurchaseInvoiceDate,
                SalesFlowRef,
                AdvanceTax,
                Discount,
                GST,
                TotalAmount,
                Type: newType,
                Location: newLocation,
                Store: newStore,
                InvoiceRef,
            },
            { new: true }
        );

        // 3. ADD NEW STOCK
        if (newType !== "RC" && updatedInvoice.PurchaseData && updatedInvoice.PurchaseData.length > 0) {
            const newBulkOps = updatedInvoice.PurchaseData.map(item => ({
                updateOne: {
                    filter: {
                        ProductName: item.product,
                        Location: newLocation,
                        Store: newStore
                    },
                    update: {
                        $inc: {
                            TotalQuantity: Number(item.totalBox) || 0,
                            Amount: item.ValueAfterDiscout || 0
                        },
                        $setOnInsert: {
                            ProductName: item.product,
                            Location: newLocation,
                            Store: newStore
                        }
                    },
                    upsert: true
                }
            }));

            await TotalProductModal.bulkWrite(newBulkOps);

            // Recalculate AvgRate for new products
            for (const item of updatedInvoice.PurchaseData) {
                const product = await TotalProductModal.findOne({
                    ProductName: item.product,
                    Location: newLocation,
                    Store: newStore
                });

                if (product && product.TotalQuantity > 0) {
                    const avgRate = product.Amount / product.TotalQuantity;
                    await TotalProductModal.updateOne(
                        { _id: product._id },
                        { $set: { AvgRate: avgRate } }
                    );
                }
            }
        }

        // Log the update
        await logModal.create({
            userId: userId,
            action: "update",
            Page: "Purchase",
            payload: {
                oldData: {
                    PurchaseData: existingInvoice.PurchaseData,
                    TotalAmount: existingInvoice.TotalAmount,
                    Location: existingInvoice.Location,
                    Store: existingInvoice.Store
                },
                newData: {
                    PurchaseData: updatedInvoice.PurchaseData,
                    TotalAmount: updatedInvoice.TotalAmount,
                    Location: updatedInvoice.Location,
                    Store: updatedInvoice.Store
                }
            },
            responseStatus: 200,
            RefNumber: existingInvoice.PurchaseInvoice
        });

        res.status(200).json({
            message: "Invoice updated successfully",
            data: updatedInvoice
        });

    } catch (err) {
        console.error("Update error:", err);
        res.status(400).send("Something went wrong");
    }
};

// export const getLastProduct = async (req, res) => {
//     try {
//         const LastProduct = await PurchaseInvoiceModal.findOne().sort({ _id: -1 }).limit(1)
//         console.log(LastProduct)
//         res.send({ status: true, data: LastProduct });
//     } catch (err) {
//         console.log(err)
//     }
// }

export const getAllPurchaseInvoice = async (req, res) => {
    try {
        const data = await PurchaseInvoiceModal.find().sort({ _id: -1 })
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}

export const deletePurchcaseInvoice = async (req, res) => {
    const { id } = req.params
    try {
        const data = await PurchaseInvoiceModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getProductbyMsku = async (req, res) => {
    const { MasterSKu } = req.params
    try {
        const data = await PurchaseInvoiceModal.find({ MasterSKu: MasterSKu });
        res.status(200).send({
            status: true,
            data: data
        });
    } catch (err) {
        console.error('Error fetching categories by category:', err);
        res.status(500).send({
            status: false,
            message: 'Failed to fetch categories',
            error: err.message
        });
    }
}

export const AddPurchaseInvoiceInbulk = async (req, res) => {

    try {
        // Check month close for each invoice in bulk
        for (const item of req.body) {
            if (item.PurchaseInvoiceDate) {
                const fakeReq = { ...req, body: { PurchaseInvoiceDate: item.PurchaseInvoiceDate } };
                const monthCheck = await checkMonthClose(fakeReq, res, "PurchaseInvoiceDate");
                if (monthCheck) return;
            }
        }

        const insertedIds = [];

        for (const item of req.body) {
            const nextCode = await getNextInvoiceNumber(item.Vendor);

            const newMsku = new PurchaseInvoiceModal({
                invoiceCode: nextCode,
                PurchaseInvoice: item.VendorCode + nextCode,
                PurchaseData: item.PurchaseData,
                Vendor: item.Vendor,
                PurchaseInvoiceDate: item.PurchaseInvoiceDate,
                SalesFlowRef: item.SalesFlowRef,
                Store: item.Store,
                Location: item.Location,
                AdvanceTax: item.AdvanceTax === 0 ? (item.TotalAmount / 100) * 0.1 : item.AdvanceTax,
                Discount: item.Discount,
                TotalAmount: item.TotalAmount == 0 ? item.PurchaseData.reduce((sum, row) => sum + (parseInt(row.GrossAmount + row.Gst) || 0), 0) + item.PurchaseData.reduce((sum, row) => sum + (parseInt(row.GrossAmount + row.Gst) || 0) * 0.1, 0) - Number(item.Discount) : item.TotalAmount + (item.AdvanceTax) - Number(item.Discount),
                PostStatus: false,
            });

            const savedItem = await newMsku.save();
            insertedIds.push(savedItem._id);
        }
        res.status(200).send({
            status: true,
            data: "Data Add"
        });
        console.log('All documents inserted successfully!');
        return insertedIds;
    } catch (error) {
        console.error('Error inserting documents:', error.message);
        throw error;
    }
}

export const postPurchaseinvoice = async (req, res) => {
    const { status, data: purchaseData, Location, Store, VoucherRef , Type, RCNumber } = req.body;
    console.log(req.body)
    const { id } = req.params;

    if (status === true) {
        try {
            if(Type == "RC"){
                const data = await PurchaseInvoiceModal.findById(id)
                console.log(data.RCNumber)
                await RcModal.findOneAndUpdate({RcCode : data.RCNumber} ,{ PostStatus : "invoice"})
            }
            await PurchaseInvoiceModal.findByIdAndUpdate(id, { PostStatus: status, VoucherRef: VoucherRef });

            return res.status(200).json({
                success: true,
                message: "Invoice posted and stock increased successfully"
            });

        } catch (error) {
            console.error("Error posting stock:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to update stock during posting"
            });
        }
    }
    

     else {
        try {
            if (!purchaseData || !Array.isArray(purchaseData)) {
                return res.status(400).json({
                    success: false,
                    message: "Missing or invalid purchase data"
                });
            }

            // Check stock availability for rollback
            // const stockChecks = await Promise.all(
            //     purchaseData.map(async (item) => {
            //         const product = await TotalProductModal.findOne({
            //             ProductName: item.product,
            //             Location,
            //             Store
            //         });

            //         return { product, item };
            //     })
            // );

            // // Find products that either don't exist or have insufficient stock
            // const insufficientStock = stockChecks.filter(({ product, item }) =>
            //     !product || (product.TotalQuantity || 0) < (item.totalBox || 0)
            // );

            // if (insufficientStock.length > 0) {
            //     return res.status(400).json({
            //         success: false,
            //         message: "Insufficient stock to unpost invoice",
            //         errors: insufficientStock.map(({ product, item }) =>
            //             !product
            //                 ? { productId: item.product, message: "Product not found" }
            //                 : {
            //                     product: product.ProductName,
            //                     available: product.TotalQuantity,
            //                     tryingToDeduct: item.totalBox
            //                 }
            //         )
            //     });
            // }

            // Prepare bulk operations for rolling back stock
        

            // Update invoice post status
            await PurchaseInvoiceModal.findByIdAndUpdate(id, { PostStatus: status });

            return res.status(200).json({
                success: true,
                message: "Invoice unposted and stock reverted successfully"
            });

        } catch (error) {
            console.error("Error unposting stock:", error);
            return res.status(500).json({
                success: false,
                message: "Error occurred while unposting invoice"
            });
        }

    }
};
export const getPrInvByNumber = async (req, res) => {
    const { invNUmber } = req.params
    console.log(invNUmber)
    try {
        const data = await PurchaseInvoiceModal.findOne({ PurchaseInvoice: invNUmber })
        const Vendor = await VendorModel.findById(data.Vendor)
        const TotalProduct = data.PurchaseData.map((item) => item.product)
        const objectIds = TotalProduct.map(id => new mongoose.Types.ObjectId(id));
        const totalProduct = await ProductModal.find({ _id: { $in: objectIds } });
        console.log(totalProduct)
        res.status(200).send({ data: data, Vendor: Vendor, Product: totalProduct });

    } catch (err) {
        console.log(err)
        res.status(400).send(err);

    }
}

