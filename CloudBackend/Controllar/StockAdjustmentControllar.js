import StockAdjustmentModal from "../Modal/StockAdjustmentModal.js";
import TotalProductModal from "../Modal/TotalProductModal.js";
import { addStock, reduceStock, recalculateAvgRate, StockError } from "../Midelware/stockMiddleware.js";

// Create Stock Adjustment
export const createStockAdjustment = async (req, res) => {
    const { AdjustmentDate, AdjustmentData, Store, Location, SalesFlowRef } = req.body;
    try {
        const lastDoc = await StockAdjustmentModal.findOne().sort({ _id: -1 });
        let nextCode;
        if (!lastDoc || !lastDoc.AdjustmentNumber) {
            nextCode = "000001";
        } else {
            const currentNumber = parseInt(lastDoc.AdjustmentNumber, 10) || 0;
            nextCode = (currentNumber + 1).toString().padStart(6, '0');
        }

        const data = await StockAdjustmentModal.create({
            AdjustmentNumber: nextCode,
            AdjustmentDate,
            AdjustmentData,
            Store,
            Location,
            SalesFlowRef: SalesFlowRef || "",
            PostStatus: false
        });

        res.status(200).send(data);
    } catch (err) {
        console.error("Create stock adjustment error:", err);
        res.status(400).json({ success: false, message: "Something went wrong", error: err.message });
    }
};

// Get All Stock Adjustments
export const getAllStockAdjustment = async (req, res) => {
    try {
        const data = await StockAdjustmentModal.find().sort({ AdjustmentNumber: -1 });
        res.status(200).json({ status: true, data: data });
    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong");
    }
};

// Update Stock Adjustment
export const updateStockAdjustment = async (req, res) => {
    const { id } = req.params;
    const { AdjustmentDate, AdjustmentData, Store, Location, SalesFlowRef } = req.body;
    try {
        const existing = await StockAdjustmentModal.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }
        if (existing.PostStatus === true) {
            return res.status(400).json({ success: false, message: "Posted records cannot be edited" });
        }

        await StockAdjustmentModal.findByIdAndUpdate(id, {
            AdjustmentDate,
            AdjustmentData,
            Store,
            Location,
            SalesFlowRef: SalesFlowRef || ""
        });

        res.status(200).json({ success: true, message: "Updated successfully" });
    } catch (err) {
        console.log(err);
        res.status(400).send("Something went wrong");
    }
};

// Delete Stock Adjustment
export const deleteStockAdjustment = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await StockAdjustmentModal.findById(id);
        if (existing.PostStatus === true) {
            return res.status(400).send("Posted records cannot be deleted");
        }
        await StockAdjustmentModal.findByIdAndDelete(id);
        res.status(200).send("Deleted successfully");
    } catch (err) {
        res.status(500).send("Deletion failed");
    }
};

// Post / Unpost Stock Adjustment
export const postStockAdjustment = async (req, res) => {
    const { AdjustmentData, Store, Location, status } = req.body;
    const { id } = req.params;

    if (!id || !Array.isArray(AdjustmentData)) {
        return res.status(400).json({ success: false, message: "Missing or invalid data" });
    }

    try {
        const record = await StockAdjustmentModal.findById(id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        if (status === true) {
            // POSTING: apply adjustments
            for (const item of AdjustmentData) {
                const lessBox = Number(item.lessBox) || 0;
                const addBox = Number(item.addBox) || 0;

                if (lessBox > 0 && addBox > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Product "${item.productName}": Less Box and Add Box cannot both be entered`
                    });
                }

                if (lessBox > 0) {
                    // Reduce stock
                    try {
                        await reduceStock([{
                            ProductName: item.productName,
                            Location,
                            Store,
                            quantity: lessBox,
                            amount: Number(item.lessAmount) || 0
                        }]);
                    } catch (stockErr) {
                        if (stockErr instanceof StockError) {
                            return res.status(400).json({
                                success: false,
                                message: "Insufficient stock to post adjustment",
                                errors: stockErr.details
                            });
                        }
                        throw stockErr;
                    }
                    // Recalculate avg rate
                    await recalculateAvgRate([{ ProductName: item.productName, Location, Store }]);
                }

                if (addBox > 0) {
                    // Add stock
                    await addStock([{
                        ProductName: item.productName,
                        Location,
                        Store,
                        quantity: addBox,
                        amount: Number(item.addAmount) || 0
                    }]);
                    // Recalculate avg rate
                    await recalculateAvgRate([{ ProductName: item.productName, Location, Store }]);
                }
            }

            await StockAdjustmentModal.findByIdAndUpdate(id, { PostStatus: true });
            return res.status(200).json({ success: true, message: "Adjustment posted successfully" });

        } else {
            // UNPOSTING: reverse adjustments
            for (const item of AdjustmentData) {
                const lessBox = Number(item.lessBox) || 0;
                const addBox = Number(item.addBox) || 0;

                if (lessBox > 0) {
                    // Was reduced, now add back
                    await addStock([{
                        ProductName: item.productName,
                        Location,
                        Store,
                        quantity: lessBox,
                        amount: Number(item.lessAmount) || 0
                    }]);
                    await recalculateAvgRate([{ ProductName: item.productName, Location, Store }]);
                }

                if (addBox > 0) {
                    // Was added, now reduce back
                    try {
                        await reduceStock([{
                            ProductName: item.productName,
                            Location,
                            Store,
                            quantity: addBox,
                            amount: Number(item.addAmount) || 0
                        }]);
                    } catch (stockErr) {
                        if (stockErr instanceof StockError) {
                            return res.status(400).json({
                                success: false,
                                message: "Insufficient stock to unpost adjustment",
                                errors: stockErr.details
                            });
                        }
                        throw stockErr;
                    }
                    await recalculateAvgRate([{ ProductName: item.productName, Location, Store }]);
                }
            }

            await StockAdjustmentModal.findByIdAndUpdate(id, { PostStatus: false });
            return res.status(200).json({ success: true, message: "Adjustment unposted successfully" });
        }
    } catch (error) {
        console.error("Stock Adjustment Error:", error);            return res.status(500).json({
                success: false,
                message: "An error occurred while processing stock adjustment",
                error: error.message
            });
    }
};

// Bulk Create Stock Adjustments
export const createStockAdjustmentBulk = async (req, res) => {
    const { adjustments } = req.body;

    try {
        const lastRecord = await StockAdjustmentModal.findOne().sort({ _id: -1 });
        let nextNumber = lastRecord ? parseInt(lastRecord.AdjustmentNumber, 10) + 1 : 1;

        const records = adjustments.map((adj) => {
            const code = nextNumber.toString().padStart(6, '0');
            nextNumber++;

            return {
                AdjustmentNumber: code,
                AdjustmentDate: adj.AdjustmentDate,
                AdjustmentData: adj.AdjustmentData,
                Store: adj.Store,
                Location: adj.Location,
                SalesFlowRef: adj.SalesFlowRef || "",
                PostStatus: false
            };
        });

        const created = await StockAdjustmentModal.insertMany(records);

        res.status(200).json({
            success: true,
            data: created,
            message: `${created.length} stock adjustment(s) created successfully`
        });
    } catch (err) {
        console.error("Bulk stock adjustment error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to process bulk stock adjustments",
            error: err.message
        });
    }
};
