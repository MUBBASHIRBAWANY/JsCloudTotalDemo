import OpeningInventoryModal from "../Modal/OpeningInventoryModal.js";

/**
 * Get the currently active Financial Year record.
 * Returns the OpeningInventory document whose Status is "Open" and
 * whose date range covers today's date (or the next upcoming open year).
 */
export const getActiveFinancialYear = async () => {
  try {
    const activeYear = await OpeningInventoryModal.findOne({
      Status: { $in: ["Open", "Active"] }
    }).sort({ DateStart: -1 }).lean();

    if (!activeYear) return null;

    return {
      _id: activeYear._id,
      startDate: activeYear.DateStart,
      endDate: activeYear.DateEnd,
      label: `${activeYear.DateStart} to ${activeYear.DateEnd}`
    };
  } catch (err) {
    console.error("getActiveFinancialYear error:", err);
    return null;
  }
};

/**
 * Validate that the given date falls within the active Financial Year.
 * @param {string|Date} dateValue - The date to validate (string or Date object)
 * @returns {Promise<{valid: boolean, message?: string, activeYear?: object}>}
 */
export const validateFinancialYear = async (dateValue) => {
  try {
    if (!dateValue) {
      return { valid: false, message: "Date is required for financial year validation" };
    }

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return { valid: false, message: "Invalid date format" };
    }

    const activeYear = await getActiveFinancialYear();
    if (!activeYear) {
      return {
        valid: false,
        message: "No active Financial Year found. Please set an active Financial Year first."
      };
    }

    const startDate = new Date(activeYear.startDate);
    const endDate = new Date(activeYear.endDate);

    // Set endDate to end of day for inclusive comparison
    endDate.setHours(23, 59, 59, 999);

    if (date < startDate || date > endDate) {
      return {
        valid: false,
        message: `Transaction date is outside the active Financial Year (${activeYear.label}). You can only make entries between ${activeYear.startDate} and ${activeYear.endDate}.`,
        activeYear
      };
    }

    return { valid: true, activeYear };
  } catch (err) {
    console.error("validateFinancialYear error:", err);
    return { valid: false, message: "Error validating financial year" };
  }
};

/**
 * Middleware to validate transaction date against the active Financial Year.
 * Expects the date field name in req.body (default: "VoucherDate").
 * Usage: router.post("/", financialYearMiddleware("VoucherDate"), controller)
 */
export const financialYearMiddleware = (dateField = "VoucherDate") => {
  return async (req, res, next) => {
    // Skip validation for Admin/Setup users if needed
    const dateValue = req.body[dateField] || req.query[dateField];
    
    // Some requests might have date nested differently
    // e.g., req.body.DateStart, req.body.InvoiceDate, etc.
    
    if (!dateValue) {
      // If no date provided, let the controller handle it
      return next();
    }

    const result = await validateFinancialYear(dateValue);
    if (!result.valid) {
      return res.status(403).json({
        success: false,
        message: result.message,
        activeYear: result.activeYear
      });
    }

    next();
  };
};

/**
 * Get the financial year range for a given date.
 * Useful for setting default values on the frontend.
 */
export const getFinancialYearForDate = async (dateValue) => {
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;

    const allYears = await OpeningInventoryModal.find()
      .select("DateStart DateEnd Status")
      .sort({ DateStart: -1 })
      .lean();

    for (const year of allYears) {
      const start = new Date(year.DateStart);
      const end = new Date(year.DateEnd);
      end.setHours(23, 59, 59, 999);

      if (date >= start && date <= end) {
        return {
          _id: year._id,
          startDate: year.DateStart,
          endDate: year.DateEnd,
          status: year.Status,
          label: `${year.DateStart} to ${year.DateEnd}`
        };
      }
    }

    return null;
  } catch (err) {
    console.error("getFinancialYearForDate error:", err);
    return null;
  }
};
