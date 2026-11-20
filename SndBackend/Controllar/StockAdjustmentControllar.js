import StockAdjustmentModal from "../modal/StockAdjustmentModal.js";
import TotalProductModal from "../modal/TotalProductModal.js";

// Create Stock Adjustment
export const createStockAdjustment = async (req, res) => {
  try {
    const { Distrbutor, Adjustments, AdjustmentDate, Reason, CreatedBy } =
      req.body;

    if (!Distrbutor || !Adjustments || Adjustments.length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const adjustment = new StockAdjustmentModal({
      Distrbutor,
      Adjustments,
      AdjustmentDate,
      Reason,
      CreatedBy: CreatedBy || "admin@js.com",
    });

    const saved = await adjustment.save();
    res.status(201).json({ data: saved, message: "Stock Adjustment created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get All Stock Adjustments
export const getAllStockAdjustments = async (req, res) => {
  try {
    const data = await StockAdjustmentModal.find()
      .populate("Distrbutor")
      .populate("Adjustments.product")
      .sort({ createdAt: -1 });
    res.status(200).json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get Stock Adjustments By Distributor
export const getStockAdjustmentsByDistributor = async (req, res) => {
  try {
    const { Distrbutor } = req.params;
    const { startDate, endDate } = req.query;

    let filter = { Distrbutor };

    if (startDate && endDate) {
      filter.AdjustmentDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const data = await StockAdjustmentModal.find(filter)
      .populate("Distrbutor")
      .populate("Adjustments.product")
      .sort({ createdAt: -1 });

    res.status(200).json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get Stock Adjustments for Stock Flow Report (used by PearlSND client)
export const getStockAdjustmentsForReport = async (req, res) => {
  try {
    const { Distrbutor, startDate, endDate } = req.query;

    let filter = {};

    if (Distrbutor) {
      filter.Distrbutor = Distrbutor;
    }

    if (startDate && endDate) {
      filter.AdjustmentDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const data = await StockAdjustmentModal.find(filter)
      .populate("Adjustments.product")
      .sort({ AdjustmentDate: 1 });

    // Flatten adjustments into individual records for easy report consumption
    const flattened = [];
    data.forEach((record) => {
      record.Adjustments.forEach((adj) => {
        flattened.push({
          _id: record._id,
          Distrbutor: record.Distrbutor,
          product: String(adj.product?._id || adj.product || ""),
          ProductName: adj.product?.ProductName || "Unknown",
          adjustmentType: adj.adjustmentType,
          Box: Number(adj.Box) || 0,
          Carton: Number(adj.Carton) || 0,
          Unit: Number(adj.Unit) || 0,
          AdjustmentDate: record.AdjustmentDate,
          Reason: record.Reason,
          Type: "Stock Adjustment",
          Page: "StockAdjustment",
        });
      });
    });

    res.status(200).json({ data: flattened });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get Stock Adjustment by ID
export const getStockAdjustmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await StockAdjustmentModal.findById(id)
      .populate("Distrbutor")
      .populate("Adjustments.product");
    if (!data) {
      return res.status(404).json({ message: "Stock Adjustment not found" });
    }
    res.status(200).json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Update Stock Adjustment
export const updateStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const { Distrbutor, Adjustments, AdjustmentDate, Reason } = req.body;

    const updated = await StockAdjustmentModal.findByIdAndUpdate(
      id,
      { Distrbutor, Adjustments, AdjustmentDate, Reason },
      { new: true, runValidators: true }
    )
      .populate("Distrbutor")
      .populate("Adjustments.product");

    if (!updated) {
      return res.status(404).json({ message: "Stock Adjustment not found" });
    }

    res.status(200).json({ data: updated, message: "Stock Adjustment updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Delete Stock Adjustment
export const deleteStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await StockAdjustmentModal.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Stock Adjustment not found" });
    }
    res.status(200).json({ message: "Stock Adjustment deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Post (Finalize) Stock Adjustment — updates TotalProductModal like PurchaseOrderDC
export const postStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;

    const adjustment = await StockAdjustmentModal.findById(id)
      .populate("Distrbutor")
      .populate("Adjustments.product");

    if (!adjustment) {
      return res.status(404).json({ message: "Stock Adjustment not found" });
    }

    if (adjustment.isPosted) {
      return res.status(400).json({ message: "Stock Adjustment is already posted" });
    }

    const distributorId = adjustment.Distrbutor?._id?.toString() || adjustment.Distrbutor?.toString();

    // Build bulkWrite ops to update TotalProductModal per product per distributor
    const bulkOps = adjustment.Adjustments.map((item) => {
      const productId = item.product?._id?.toString() || item.product?.toString();
      const quantityChange = item.adjustmentType === "Add" ? Number(item.Box) : -Number(item.Box);
      const cartonChange = item.adjustmentType === "Add" ? Number(item.Carton || 0) : -Number(item.Carton || 0);
      const unitChange = item.adjustmentType === "Add" ? Number(item.Unit || 0) : -Number(item.Unit || 0);

      return {
        updateOne: {
          filter: {
            ProductName: productId,
            Distrbutor: distributorId,
          },
          update: {
            $inc: {
              TotalQuantity: quantityChange,
              Carton: cartonChange,
              Box: unitChange,
            },
            $setOnInsert: {
              ProductName: productId,
              Distrbutor: distributorId,
              AvgRate: "0",
              Amount: 0,
            },
            $set: {
              Reason: adjustment.Reason || "",
              AdjustmentDate: adjustment.AdjustmentDate || "",
              Type: item.adjustmentType,
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await TotalProductModal.bulkWrite(bulkOps);
    }

    // Mark adjustment as posted
    const posted = await StockAdjustmentModal.findByIdAndUpdate(
      id,
      {
        isPosted: true,
        PostedAt: new Date(),
        PostedBy: req.body.PostedBy || "admin@js.com",
      },
      { new: true }
    )
      .populate("Distrbutor")
      .populate("Adjustments.product");

    res.status(200).json({ data: posted, message: "Stock Adjustment posted & stock updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};
