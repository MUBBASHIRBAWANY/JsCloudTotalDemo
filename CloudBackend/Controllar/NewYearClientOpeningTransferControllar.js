import NewYearClientOpeningTransferModal from "../modal/NewYearClientOpeningTransferModal.js";
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";
import DistrbutorInvoiceModal from "../modal/DistrbutorInvoiceModal.js";
import CutomerModal from "../modal/CutomerModal.js";
import VoucherModal from "../modal/VoucherModal.js";

export const generateNewYearOpeningTransfer = async (req, res) => {
    try {
        const { DateStart, DateEnd } = req.body;

        if (!DateStart || !DateEnd) {
            return res.status(400).send("DateStart and DateEnd are required");
        }

        // Step 1: Get all unique client IDs from SalesInvoice
        const salesClients = await SalesInvoiceModal.distinct("Client");
        // Step 2: Get all unique client IDs from DistributorInvoice
        const distClients = await DistrbutorInvoiceModal.distinct("Distrbutor");

        // Merge and deduplicate
        const allClientIds = [...new Set([...salesClients, ...distClients])];

        const storeWiseData = {};

        for (const clientId of allClientIds) {
            let store = null;

            // Step 3: Find first invoice from SalesInvoiceModal
            const firstSalesInvoice = await SalesInvoiceModal.findOne({ Client: clientId })
                .sort({ SalesInvoiceDate: 1 })
                .limit(1);

            if (firstSalesInvoice) {
                store = firstSalesInvoice.Store;
            } else {
                // Step 4: If not found, check DistributorInvoiceModal
                const firstDistInvoice = await DistrbutorInvoiceModal.findOne({ Distrbutor: clientId })
                    .sort({ InvoiceDate: 1 })
                    .limit(1);

                if (firstDistInvoice) {
                    store = firstDistInvoice.Store;
                }
            }

            if (!store) continue;

            // Step 5: Get all invoices for this client in date range and sum RemainingAmount
            const salesInvoices = await SalesInvoiceModal.find({
                Client: clientId,
                SalesInvoiceDate: { $gte: DateStart, $lte: DateEnd }
            });

            const distInvoices = await DistrbutorInvoiceModal.find({
                Distrbutor: clientId,
                InvoiceDate: { $gte: DateStart, $lte: DateEnd }
            });

            let totalRemaining = 0;
            let totalAmount = 0;

            salesInvoices.forEach(inv => {
                totalRemaining += Number(inv.RemainingAmount) || 0;
                totalAmount += Number(inv.TotalAmount) || 0;
            });

            distInvoices.forEach(inv => {
                totalRemaining += Number(inv.Remaining) || 0;
                totalAmount += Number(inv.TotalAmount) || 0;
            });

            // Step 6: Get client name
            const client = await CutomerModal.findById(clientId);
            const clientName = client?.CutomerName || "Unknown";

            // Step 7: Group by store
            if (!storeWiseData[store]) {
                storeWiseData[store] = [];
            }

            storeWiseData[store].push({
                Client: clientId,
                ClientName: clientName,
                Store: store,
                RemainingAmount: totalRemaining,
                TotalAmount: totalAmount
            });
        }

        // Step 8: Save to DB
        const record = await NewYearClientOpeningTransferModal.create({
            DateStart,
            DateEnd,
            Status: "Active",
            TransferData: storeWiseData
        });

        res.status(200).json({
            success: true,
            data: record,
            message: "Opening transfer data generated successfully"
        });

    } catch (err) {
        console.error("Error in generateNewYearOpeningTransfer:", err);
        res.status(500).send("Something went wrong");
    }
}

export const transferVoucher = async (req, res) => {
    try {
        const { id, VoucherDate, VoucherMainAccount } = req.body;

        if (!id || !VoucherDate || !VoucherMainAccount) {
            return res.status(400).send("id, VoucherDate and VoucherMainAccount are required");
        }

        const record = await NewYearClientOpeningTransferModal.findById(id);
        if (!record) {
            return res.status(404).send("Record not found");
        }

        const transferData = record.TransferData;
        const createdVouchers = [];

        for (const [store, clients] of Object.entries(transferData)) {
            if (!clients || clients.length === 0) continue;

            // Filter clients with remaining amount > 0
            const clientsWithBalance = clients.filter(c => c.RemainingAmount > 0);
            if (clientsWithBalance.length === 0) continue;

            // Generate voucher number (CR prefix)
            const date = new Date(VoucherDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const prefix = `CR${year}${month}`;

            const lastVoucher = await VoucherModal.findOne({
                VoucherType: "CR",
                VoucherNumber: { $regex: `^${prefix}` }
            }).sort({ VoucherNumber: -1 });

            let serial = 1;
            if (lastVoucher) {
                const serialMatch = lastVoucher.VoucherNumber.match(new RegExp(`^${prefix}(\\d+)$`));
                if (serialMatch && serialMatch[1]) {
                    serial = parseInt(serialMatch[1], 10) + 1;
                }
            }

            const VoucherNumber = `${prefix}${String(serial).padStart(4, "0")}`;

            // Build VoucharData
            const voucharData = clientsWithBalance.map(client => ({
                Client: client.Client,
                ClientRef2: `Opening-${client.ClientName}`,
                Credit: client.RemainingAmount,
                Type: "Opening",
                Store: client.Store,
                Narration: `New Year Opening Transfer for ${client.ClientName}`
            }));

            // Add bank/cash row
            const totalCredit = clientsWithBalance.reduce((sum, c) => sum + c.RemainingAmount, 0);
            voucharData.push({
                Debit: totalCredit,
                Account: VoucherMainAccount,
                store: store,
                show: true,
                id: Date.now(),
                Narration: `New Year Opening Transfer - Store: ${store}`
            });

            // Create voucher
            const voucher = await VoucherModal.create({
                VoucherType: "CR",
                VoucherNumber,
                VoucherDate,
                VoucherMainAccount,
                VoucharData: voucharData,
                status: "UnPost",
                Remarks: `New Year Opening Transfer - Store: ${store}`
            });

            createdVouchers.push(voucher);
        }

        // Update record status
        record.Status = "Transferred";
        await record.save();

        res.status(200).json({
            success: true,
            data: createdVouchers,
            message: `${createdVouchers.length} voucher(s) created successfully`
        });

    } catch (err) {
        console.error("Error in transferVoucher:", err);
        res.status(500).send("Something went wrong");
    }
}

export const getAllNewYearOpeningTransfer = async (req, res) => {
    try {
        const data = await NewYearClientOpeningTransferModal.find();
        res.status(200).json({ status: 200, data: data });
    } catch (err) {
        console.error("Error in getAllNewYearOpeningTransfer:", err);
        res.status(500).send("Something went wrong");
    }
}

export const deleteNewYearOpeningTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await NewYearClientOpeningTransferModal.findByIdAndDelete(id);
        res.status(200).json({ status: 200, data: data });
    } catch (err) {
        console.error("Error in deleteNewYearOpeningTransfer:", err);
        res.status(500).send("Something went wrong");
    }
}
