import ChartofAccountsModal from "../modal/ChartofAccountsModal.js"
import VoucherModal from "../modal/VoucherModal.js"
import AccountOpeningBalanceModal from "../modal/AccountsOpeningModal.js"

export const CreateChartofAccounts = async (req, res) => {
    try {
        const { AccountCode, AccountName, Stage, Stage1, Stage2, Stage3, Type, masterCode } = req.body

        let code;

        if (Stage == "4") {
            const LastChartofAccountsCode = await ChartofAccountsModal.findOne({ masterCode: masterCode }).sort({ AccountCode: -1 }).limit(1)
            if (!LastChartofAccountsCode) {
                const code1 = "001";
                code = masterCode + code1
            } else {
                const nextNumber = parseInt(LastChartofAccountsCode.AccountCode, 10) + 1;
                code = nextNumber.toString().padStart(3, '0');
                if (code == "999") {
                    return res.status(400).send("All ready 999 is open")
                }

            }

            const data = {
                AccountCode: code,
                AccountName,
                Stage,
                Stage1,
                Stage2,
                Stage3,
                Type,
                masterCode,
                isActive: true
            }
            const sendRes = await ChartofAccountsModal.create(data)
            res.status(200).send("data Add")
        }

        else if (Stage == "2" || Stage == "3") {
            console.log("Stage ye hai", Stage)

            console.log(Stage)
            const LastChartofAccountsCode = await ChartofAccountsModal.findOne({ masterCode: masterCode }).sort({ _id: -1 }).limit(1)
            if (!LastChartofAccountsCode) {
                const code1 = "01";
                code = masterCode + code1
            } else {
                const nextNumber = parseInt(LastChartofAccountsCode.AccountCode, 10) + 1;
                code = nextNumber.toString().padStart(2, '0');
                if (code == "99") {
                    return res.status(400).send("All ready 999 is open")
                }
            }

            const data = {
                AccountCode: code,
                AccountName,
                Stage,
                Stage1,
                Stage2,
                Type,
                masterCode,
                isActive: true,
                ...(Stage === 3 && { Stage3 })
            }
            const sendRes = await ChartofAccountsModal.create(data)
            res.status(200).send("data Add")
        }
        else if (Stage == "1") {


            const LastChartofAccountsCode = await ChartofAccountsModal.findOne({ Stage: "1" }).sort({ _id: -1 }).limit(1)
            if (!LastChartofAccountsCode) {
                code = "1";
            } else {
                const nextNumber = parseInt(LastChartofAccountsCode.AccountCode, 10) + 1;
                code = nextNumber.toString().padStart(1, '0');
                if (code == "10") {
                    return res.status(400).send("All ready 9 is open")
                }

            }

            const data = {
                AccountCode: code,
                AccountName,
                Stage,
                Stage1,
                isActive: true
            }
            console.log(data)
            const sendRes = await ChartofAccountsModal.create(data)
            res.status(200).send("data Add")
        }

    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}


export const updateChartofAccounts = async (req, res) => {
    const { id } = req.params
    const { AccountName } = req.body
    try {
        const data = await ChartofAccountsModal.findByIdAndUpdate(id, {
            AccountName: AccountName
        })
        res.status(200).send("Data Edit")
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllChartofAccounts = async (req, res) => {
    try {
        const data = await ChartofAccountsModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}
export const deleteChartofAccounts = async (req, res) => {
    const { id } = req.params
    try {
        const data = await ChartofAccountsModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getONlyStage4 = async (req, res) => {
    try {
        const data = await ChartofAccountsModal.find({Stage : "4", isActive: {$ne : false}})
        res.status(200).send({ status: true, data: data });
        
    } catch (err) {
        res.status(400).send("some thing went wrong" , { err : err})

    }
}

// ===============================
// Get Account Balance
// ===============================
export const getAccountBalance = async (accountId) => {
    try {
        const account = await ChartofAccountsModal.findById(accountId);
        if (!account) {
            return { balance: 0, exists: false };
        }

        // Get opening balance
        const openingBalance = await AccountOpeningBalanceModal.findOne();
        let totalOpeningDebit = 0;
        let totalOpeningCredit = 0;

        if (openingBalance && openingBalance.AccountsData) {
            const accountOpening = openingBalance.AccountsData.filter(
                (item) => item.Account === accountId
            );
            totalOpeningDebit = accountOpening.reduce((sum, item) => sum + Number(item.Debit || 0), 0);
            totalOpeningCredit = accountOpening.reduce((sum, item) => sum + Number(item.Credit || 0), 0);
        }

        // Get all voucher entries for this account
        const vouchers = await VoucherModal.find({
            "VoucharData.Account": accountId
        });

        let totalDebit = totalOpeningDebit;
        let totalCredit = totalOpeningCredit;

        vouchers.forEach((voucher) => {
            voucher.VoucharData.forEach((item) => {
                if (item.Account === accountId) {
                    totalDebit += Number(item.Debit || 0);
                    totalCredit += Number(item.Credit || 0);
                }
            });
        });

        const balance = totalDebit - totalCredit;

        return { balance, exists: true, totalDebit, totalCredit };
    } catch (error) {
        console.error("Get Account Balance Error:", error);
        return { balance: 0, exists: false, error: error.message };
    }
};

// ===============================
// Toggle Account Active/Inactive
// ===============================
export const toggleAccountStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const account = await ChartofAccountsModal.findById(id);

        if (!account) {
            return res.status(404).json({
                status: false,
                message: "Account not found"
            });
        }

        // Only Stage 4 accounts can be deactivated
        if (account.Stage !== "4") {
            return res.status(400).json({
                status: false,
                message: "Only Stage 4 accounts can be deactivated"
            });
        }

        // If deactivating, check balance
        if (isActive === false) {
            const { balance, exists } = await getAccountBalance(id);

            if (!exists) {
                return res.status(404).json({
                    status: false,
                    message: "Account not found"
                });
            }

            if (balance !== 0) {
                return res.status(400).json({
                    status: false,
                    message: `Account cannot be deactivated. Balance is not zero (Balance: ${balance})`,
                    balance: balance
                });
            }
        }

        // Update status
        const updatedAccount = await ChartofAccountsModal.findByIdAndUpdate(
            id,
            { isActive: isActive },
            { new: true }
        );

        res.status(200).json({
            status: true,
            message: `Account ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedAccount
        });

    } catch (error) {
        console.error("Toggle Account Status Error:", error);
        res.status(500).json({
            status: false,
            message: "Something went wrong"
        });
    }
};

// ===============================
// Check Account Balance
// ===============================
export const checkAccountBalance = async (req, res) => {
    try {
        const { id } = req.params;

        const account = await ChartofAccountsModal.findById(id);

        if (!account) {
            return res.status(404).json({
                status: false,
                message: "Account not found"
            });
        }

        const { balance, totalDebit, totalCredit } = await getAccountBalance(id);

        res.status(200).json({
            status: true,
            data: {
                accountId: id,
                accountName: account.AccountName,
                accountCode: account.AccountCode,
                balance: balance,
                totalDebit: totalDebit,
                totalCredit: totalCredit,
                canDeactivate: balance === 0
            }
        });

    } catch (error) {
        console.error("Check Account Balance Error:", error);
        res.status(500).json({
            status: false,
            message: "Something went wrong"
        });
    }
};
