import AccountOpeningBalanceModal from "../Modal/AccountsOpeningModal.js";

export const createAccountOpening = async (req, res) => {
    try {
        const data = await AccountOpeningBalanceModal.create(req.body);
        res.status(200).send("Account Opening data added successfully");
    } catch (e) {
        console.log(e);
        res.status(400).send('Server Error');
    }
}

export const getAllAccountOpening = async (req, res) => {
    try {
        const AccountOpenings = await AccountOpeningBalanceModal.find();
        res.status(200).send({ status: true, data: AccountOpenings });
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}

export const updateAccountOpening = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await AccountOpeningBalanceModal.findByIdAndUpdate(id, req.body);
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}

export const deleteAccountOpening = async (req, res) => {
    const { id } = req.params;
    try {
        await AccountOpeningBalanceModal.findByIdAndDelete(id);
        res.status(200).send("Account Opening data deleted successfully");
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}

export const saveSundryCreditorAccountOpening = async (req, res) => {
    const { DateStart, DateEnd, Account, StoreBalances } = req.body;
    if (!DateStart || !DateEnd || !Account || !Array.isArray(StoreBalances)) {
        return res.status(400).json({
            success: false,
            message: "DateStart, DateEnd, Account and StoreBalances are required"
        });
    }
    try {
        const storeRows = StoreBalances.map((item) => {
            const store = String(item.store || item.Store || "0");
            const debit = Number(item.Debit || 0);
            const credit = Number(item.Credit || 0);
            if (debit === 0 && credit === 0) return null;
            return {
                id: `${Account}||${store}`,
                Account,
                store,
                Store: store,
                Debit: debit,
                Credit: credit
            };
        }).filter(Boolean);

        let doc = await AccountOpeningBalanceModal.findOne({ DateStart, DateEnd });
        if (!doc) {
            doc = await AccountOpeningBalanceModal.create({
                DateStart,
                DateEnd,
                Status: "Open",
                AccountsData: storeRows
            });
        } else {
            const rest = (Array.isArray(doc.AccountsData) ? doc.AccountsData : Object.values(doc.AccountsData || {}))
                .filter((row) => String(row.Account) !== String(Account));
            doc.AccountsData = [...rest, ...storeRows];
            doc.markModified('AccountsData');
            await doc.save();
        }

        return res.status(200).json({
            success: true,
            count: storeRows.length,
            data: doc
        });
    } catch (err) {
        console.error("Error in saveSundryCreditorAccountOpening:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
} 

