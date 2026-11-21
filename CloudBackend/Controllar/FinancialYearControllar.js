import OpeningInventoryModal from "../Modal/OpeningInventoryModal.js";
import { getActiveFinancialYear, validateFinancialYear } from "../utils/checkFinancialYear.js";

/**
 * GET /FinancialYear/active
 * Returns the currently active Financial Year
 */
export const GetActiveFinancialYear = async (req, res) => {
  try {
    const activeYear = await getActiveFinancialYear();
    if (!activeYear) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No active Financial Year set. Please open a year first."
      });
    }
    res.status(200).json({ success: true, data: activeYear });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /FinancialYear/all
 * Returns all available financial years from OpeningInventory
 */
export const GetAllFinancialYears = async (req, res) => {
  try {
    const years = await OpeningInventoryModal.find()
      .select("DateStart DateEnd Status")
      .sort({ DateStart: -1 })
      .lean();

    const formatted = years.map((y) => ({
      _id: y._id,
      startDate: y.DateStart,
      endDate: y.DateEnd,
      status: y.Status,
      label: `${y.DateStart} to ${y.DateEnd}`,
      isActive: y.Status === "Open" || y.Status === "Active",
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /FinancialYear/set-active/:id
 * Set a specific OpeningInventory year as the active Financial Year
 */
export const SetActiveFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;

    // First, deactivate all years
    await OpeningInventoryModal.updateMany(
      { Status: { $in: ["Open", "Active"] } },
      { $set: { Status: "Closed" } }
    );

    // Then activate the selected year
    const updated = await OpeningInventoryModal.findByIdAndUpdate(
      id,
      { $set: { Status: "Open" } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Financial year not found" });
    }

    res.status(200).json({
      success: true,
      message: `Financial Year ${updated.DateStart} to ${updated.DateEnd} is now active`,
      data: {
        _id: updated._id,
        startDate: updated.DateStart,
        endDate: updated.DateEnd,
        status: updated.Status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /FinancialYear/validate-date
 * Validate a given date against the active financial year
 */
export const ValidateDate = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const result = await validateFinancialYear(date);
    res.status(result.valid ? 200 : 403).json({
      success: result.valid,
      message: result.message,
      activeYear: result.activeYear,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
