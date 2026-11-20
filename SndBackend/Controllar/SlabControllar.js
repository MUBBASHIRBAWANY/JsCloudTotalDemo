import SlabModal from "../modal/SlabModal.js";

/* ──────────────────────────────────────────────
 *  VALIDATION HELPERS
 * ────────────────────────────────────────────── */
const validateSlabRows = (rows, headerFrom, headerTo) => {
  const errors = [];

  if (!rows || rows.length === 0) {
    return [{ row: -1, message: "At least one slab row is required" }];
  }

  rows.forEach((row, idx) => {
    const from = Number(row.from);
    const to = Number(row.to);
    const per = Number(row.percentage);

    if (!from || from <= 0) {
      errors.push({ row: idx, field: "from", message: "From amount is required and must be > 0" });
    }
    if (!to || to <= 0) {
      errors.push({ row: idx, field: "to", message: "To amount is required and must be > 0" });
    }
    if (per == null || per < 0) {
      errors.push({ row: idx, field: "percentage", message: "Percentage is required and must be >= 0" });
    }

    if (from && to && from >= to) {
      errors.push({ row: idx, message: `Row ${idx + 1}: From amount (${from}) must be less than To amount (${to})` });
    }

    // First row: From must be >= header's fromAmount
    if (idx === 0 && from < headerFrom) {
      errors.push({ row: idx, message: `First row From amount (${from}) cannot be less than header From amount (${headerFrom})` });
    }

    if (idx > 0) {
      const prev = rows[idx - 1];
      // Current from must be >= previous from
      if (from < Number(prev.from)) {
        errors.push({ row: idx, message: `Row ${idx + 1}: From amount (${from}) cannot be less than previous row's From (${prev.from})` });
      }
      // Current from must be >= previous to (no gap overlap)
      if (from < Number(prev.to)) {
        errors.push({ row: idx, message: `Row ${idx + 1}: From amount (${from}) cannot be less than previous row's To (${prev.to})` });
      }
    }

    // Last row: To must be <= header's toAmount
    if (idx === rows.length - 1 && to > headerTo) {
      errors.push({ row: idx, message: `Last row To amount (${to}) cannot exceed header To amount (${headerTo})` });
    }
  });

  return errors;
};

/* ──────────────────────────────────────────────
 *  CREATE SLAB
 * ────────────────────────────────────────────── */
export const CreateSlab = async (req, res) => {
  try {
    const {
      priceList,
      fromAmount,
      toAmount,
      maxPercentage,
      slabRows,
    } = req.body;

    // 1. Validate Price List
    if (!priceList) {
      return res.status(400).json({
        message: "Price List is required",
      });
    }

    // 2. Validate From Amount
    if (
      fromAmount === undefined ||
      fromAmount === null ||
      fromAmount === "" ||
      !Number.isFinite(Number(fromAmount)) ||
      Number(fromAmount) <= 0
    ) {
      return res.status(400).json({
        message: "From Amount is required and must be > 0",
      });
    }

    // 3. Validate To Amount
    if (
      toAmount === undefined ||
      toAmount === null ||
      toAmount === "" ||
      !Number.isFinite(Number(toAmount)) ||
      Number(toAmount) <= 0
    ) {
      return res.status(400).json({
        message: "To Amount is required and must be > 0",
      });
    }

    // 4. Validate Amount Range
    if (Number(fromAmount) >= Number(toAmount)) {
      return res.status(400).json({
        message: "From Amount must be less than To Amount",
      });
    }

    // 5. Validate Max Percentage
    if (
      maxPercentage === undefined ||
      maxPercentage === null ||
      maxPercentage === "" ||
      !Number.isFinite(Number(maxPercentage)) ||
      Number(maxPercentage) < 0
    ) {
      return res.status(400).json({
        message: "Max Percentage is required and must be >= 0",
      });
    }

    // 6. Validate Slab Rows
    if (!Array.isArray(slabRows) || slabRows.length === 0) {
      return res.status(400).json({
        message: "At least one Slab Row is required",
      });
    }

    const errors = validateSlabRows(
      slabRows,
      Number(fromAmount),
      Number(toAmount)
    );

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Slab row validation failed",
        errors,
      });
    }

    // 7. Validate Row Percentages
    for (let i = 0; i < slabRows.length; i++) {
      const percentage = Number(slabRows[i].percentage);

      if (!Number.isFinite(percentage) || percentage < 0) {
        return res.status(400).json({
          message: `Row ${i + 1}: Percentage must be a valid number >= 0`,
        });
      }

      if (percentage > Number(maxPercentage)) {
        return res.status(400).json({
          message: `Row ${i + 1}: Percentage (${percentage}) cannot exceed Max Percentage (${maxPercentage})`,
        });
      }
    }

    // 8. Prepare Data
    const slabData = {
      ...req.body,
      priceList,
      fromAmount: Number(fromAmount),
      toAmount: Number(toAmount),
      maxPercentage: Number(maxPercentage),
      slabRows,
    };

    // 9. Check Existing Slab
    const existingSlab = await SlabModal.findOne({
      priceList,
    });

    let data;
    let action;

    if (existingSlab) {
      // Existing Price List: Update Slab
      data = await SlabModal.findOneAndUpdate(
        { _id: existingSlab._id },
        { $set: slabData },
        {
          new: true,
          runValidators: true,
        }
      );

      action = "updated";
    } else {
      // New Price List: Create Slab
      data = await SlabModal.create(slabData);

      action = "created";
    }

    return res.status(200).json({
      success: true,
      message:
        action === "updated"
          ? "Slab updated successfully"
          : "Slab created successfully",
      action,
      data,
    });
  } catch (err) {
    console.error("CreateSlab Error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This Price List already has a Slab configured.",
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

/* ──────────────────────────────────────────────
 *  GET ALL SLABS
 * ────────────────────────────────────────────── */
export const GetAllSlabs = async (req, res) => {
  try {
    const data = await SlabModal.find().populate("priceList", "PriceListName PriceListNumber");
    res.status(200).send(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ──────────────────────────────────────────────
 *  GET SINGLE SLAB BY ID
 * ────────────────────────────────────────────── */
export const GetSlabById = async (req, res) => {
  try {
    const data = await SlabModal.findById(req.params.id).populate("priceList", "PriceListName PriceListNumber");
    if (!data) return res.status(404).json({ message: "Slab not found" });
    res.status(200).send(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ──────────────────────────────────────────────
 *  UPDATE SLAB
 * ────────────────────────────────────────────── */
export const UpdateSlab = async (req, res) => {
  try {
    const { id } = req.params;
    const { priceList, fromAmount, toAmount, maxPercentage, slabRows } = req.body;

    // If priceList is being changed, check uniqueness
    if (priceList) {
      const existing = await SlabModal.findOne({ priceList, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: "This Price List already has a Slab configured." });
      }
    }

    // Validate if slabRows provided
    if (slabRows && slabRows.length > 0) {
      const from = Number(fromAmount || req.body.fromAmount);
      const to = Number(toAmount || req.body.toAmount);

      if (!from || !to) {
        // Fallback to existing data
        const existingSlab = await SlabModal.findById(id);
        if (!existingSlab) return res.status(404).json({ message: "Slab not found" });
        const errors = validateSlabRows(slabRows, Number(existingSlab.fromAmount), Number(existingSlab.toAmount));
        if (errors.length > 0) {
          return res.status(400).json({ message: "Slab row validation failed", errors });
        }
      } else {
        const errors = validateSlabRows(slabRows, from, to);
        if (errors.length > 0) {
          return res.status(400).json({ message: "Slab row validation failed", errors });
        }
      }

      // Validate percentages
      const maxP = Number(maxPercentage || (await SlabModal.findById(id))?.maxPercentage);
      for (let i = 0; i < slabRows.length; i++) {
        if (Number(slabRows[i].percentage) > maxP) {
          return res.status(400).json({
            message: `Row ${i + 1}: Percentage (${slabRows[i].percentage}) cannot exceed Max Percentage (${maxP})`,
          });
        }
      }
    }

    const updatedData = await SlabModal.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedData) return res.status(404).json({ message: "Slab not found" });
    res.status(200).json(updatedData);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "This Price List already has a Slab configured." });
    }
    res.status(400).json({ message: err.message });
  }
};

/* ──────────────────────────────────────────────
 *  DELETE SLAB
 * ────────────────────────────────────────────── */
export const DeleteSlab = async (req, res) => {
  try {
    const data = await SlabModal.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ message: "Slab not found" });
    res.status(200).json({ message: "Slab deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ──────────────────────────────────────────────
 *  CHECK IF PRICE LIST HAS SLAB
 * ────────────────────────────────────────────── */
export const CheckPriceListSlab = async (req, res) => {
  try {
    const { priceListId } = req.params;
    const data = await SlabModal.findOne({ priceList: priceListId });
    res.status(200).json({ exists: !!data, slab: data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
