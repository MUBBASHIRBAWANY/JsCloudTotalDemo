import VoucherModal from "../modal/VoucherModal.js";

// Get next voucher number for a given type (BP, BR, CP, CR, JV)
export const GetLastVoucher = async (req, res) => {
    try {
        const { VoucherType } = req.params;

        const lastVoucher = await VoucherModal.findOne({
            VoucherType: VoucherType
        }).sort({ _id: -1 });

        if (!lastVoucher) {
            return res.status(200).json([]);
        }

        res.status(200).json([lastVoucher]);
    } catch (err) {
        console.error("Error getting last voucher:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Create new voucher with auto-generated number
export const CreateVoucher = async (req, res) => {
    try {
        const { VoucherType } = req.body;

        if (!VoucherType) {
            return res.status(400).json({ success: false, message: "VoucherType is required" });
        }

        // Get last voucher for this type
        const lastVoucher = await VoucherModal.findOne({
            VoucherType: VoucherType
        }).sort({ _id: -1 });

        let nextNumber = 1;

        if (lastVoucher && lastVoucher.VoucherNumber) {
            const numericPart = lastVoucher.VoucherNumber.slice(2);
            nextNumber = parseInt(numericPart, 10) + 1;
        }

        const VoucherNumber = `${VoucherType}${nextNumber.toString().padStart(7, '0')}`;

        const voucherData = {
            ...req.body,
            VoucherNumber
        };

        const data = await VoucherModal.create(voucherData);

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error("Error creating voucher:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get all vouchers
export const GetAllVouchers = async (req, res) => {
    try {
        const data = await VoucherModal.find().sort({ _id: -1 });
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Error getting vouchers:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get vouchers by type
export const GetVouchersByType = async (req, res) => {
    try {
        const { VoucherType } = req.params;
        const data = await VoucherModal.find({ VoucherType }).sort({ _id: -1 });
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Error getting vouchers by type:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get single voucher by ID
export const GetVoucherById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await VoucherModal.findById(id);
        if (!data) {
            return res.status(404).json({ success: false, message: "Voucher not found" });
        }
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Error getting voucher:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Update voucher
export const UpdateVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await VoucherModal.findByIdAndUpdate(id, req.body, { new: true });
        if (!data) {
            return res.status(404).json({ success: false, message: "Voucher not found" });
        }
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Error updating voucher:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Delete voucher
export const DeleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await VoucherModal.findByIdAndDelete(id);
        if (!data) {
            return res.status(404).json({ success: false, message: "Voucher not found" });
        }
        res.status(200).json({ success: true, message: "Voucher deleted" });
    } catch (err) {
        console.error("Error deleting voucher:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
