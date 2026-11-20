import AccountTransferModal from "../modal/AccountTransferModal.js";
import ChartofAccountsModal from "../modal/ChartofAccountsModal.js";
import VoucherModal from "../modal/VoucherModal.js";

export const createAccountTransfer = async (req, res) => {
    try {
        const { AccountFrom, AccountTo, Client, Transporter } = req.body;

        if (!AccountFrom || !AccountTo) {
            return res.status(400).send("AccountFrom and AccountTo are required");
        }

        if (AccountFrom === AccountTo) {
            return res.status(400).send("AccountFrom and AccountTo cannot be same");
        }

        // Get account names for logging
        const fromAccount = await ChartofAccountsModal.findById(AccountFrom);
        const toAccount = await ChartofAccountsModal.findById(AccountTo);

        if (!fromAccount || !toAccount) {
            return res.status(400).send("Invalid account(s)");
        }

        // ===============================
        // STEP 1: Update Vouchers - VoucherMainAccount
        // ===============================
        const updateVoucherMainAccount = await VoucherModal.updateMany(
            { VoucherMainAccount: AccountFrom },
            { $set: { VoucherMainAccount: AccountTo } }
        );

        // ===============================
        // STEP 2: Update VoucharData - Account + Client/Transporter
        // ===============================
        let updateVoucherData;

        if (Client) {
            // Update Account and add Client in VoucharData array
            updateVoucherData = await VoucherModal.updateMany(
                { "VoucharData.Account": AccountFrom },
                {
                    $set: {
                        "VoucharData.$[elem].Account": AccountTo,
                        "VoucharData.$[elem].Client": Client
                    }
                },
                { arrayFilters: [{ "elem.Account": AccountFrom }] }
            );
        } else if (Transporter) {
            // Update Account and add Transporter in VoucharData array
            updateVoucherData = await VoucherModal.updateMany(
                { "VoucharData.Account": AccountFrom },
                {
                    $set: {
                        "VoucharData.$[elem].Account": AccountTo,
                        "VoucharData.$[elem].Transporter": Transporter
                    }
                },
                { arrayFilters: [{ "elem.Account": AccountFrom }] }
            );
        } else {
            // Only update Account in VoucharData array
            updateVoucherData = await VoucherModal.updateMany(
                { "VoucharData.Account": AccountFrom },
                { $set: { "VoucharData.$[elem].Account": AccountTo } },
                { arrayFilters: [{ "elem.Account": AccountFrom }] }
            );
        }

        // ===============================
        // STEP 3: Create Transfer Record
        // ===============================
        const transferData = {
            AccountFrom,
            AccountTo,
            ...(Client && { Client }),
            ...(Transporter && { Transporter }),
            transferDate: new Date()
        };

        // const transfer = await AccountTransferModal.create(transferData);

        res.status(200).json({
            status: true,
            message: "Account transfer successful",
           
        });

    } catch (error) {
        console.error("Account Transfer Error:", error);
        res.status(500).send("Something went wrong");
    }
};

export const getAllAccountTransfers = async (req, res) => {
    try {
        const transfers = await AccountTransferModal.find()
            .sort({ transferDate: -1 });

        const enrichedTransfers = await Promise.all(
            transfers.map(async (transfer) => {
                const fromAccount = await ChartofAccountsModal.findById(transfer.AccountFrom);
                const toAccount = await ChartofAccountsModal.findById(transfer.AccountTo);
                return {
                    ...transfer.toObject(),
                    fromAccountName: fromAccount?.AccountName || "N/A",
                    toAccountName: toAccount?.AccountName || "N/A"
                };
            })
        );

        res.status(200).json({
            status: true,
            data: enrichedTransfers
        });

    } catch (error) {
        console.error("Get Transfers Error:", error);
        res.status(500).send("Something went wrong");
    }
};

export const getAccountTransferById = async (req, res) => {
    try {
        const { id } = req.params;

        const transfer = await AccountTransferModal.findById(id);

        if (!transfer) {
            return res.status(404).send("Transfer not found");
        }

        const fromAccount = await ChartofAccountsModal.findById(transfer.AccountFrom);
        const toAccount = await ChartofAccountsModal.findById(transfer.AccountTo);

        res.status(200).json({
            status: true,
            data: {
                ...transfer.toObject(),
                fromAccountName: fromAccount?.AccountName || "N/A",
                toAccountName: toAccount?.AccountName || "N/A"
            }
        });

    } catch (error) {
        console.error("Get Transfer By ID Error:", error);
        res.status(500).send("Something went wrong");
    }
};

export const deleteAccountTransfer = async (req, res) => {
    try {
        const { id } = req.params;

        const transfer = await AccountTransferModal.findByIdAndDelete(id);

        if (!transfer) {
            return res.status(404).send("Transfer not found");
        }

        res.status(200).json({
            status: true,
            message: "Transfer deleted successfully"
        });

    } catch (error) {
        console.error("Delete Transfer Error:", error);
        res.status(500).send("Something went wrong");
    }
};
