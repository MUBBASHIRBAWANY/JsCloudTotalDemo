import DamageProductModal from "../Modal/DamageProductModal.js";
import OpeningInventoryModal from "../Modal/OpeningInventoryModal.js"
import TotalProductModal from "../Modal/TotalProductModal.js"
import AccountOpeningBalanceModal from "../Modal/AccountsOpeningModal.js";
import VendorOpeningModal from "../Modal/VendorOpeningModal.js";
import ClientOpeningBalanceModal from "../Modal/ClientOpeningBalanceModal.js";
import TransporterOpeningBalanceModal from "../Modal/TransportesOpeningModal.js";
import VoucherModal from "../Modal/VoucherModal.js";
import AdministrativeModal from "../Modal/AdministrativeModal.js";
import ChartofAccountsModal from "../Modal/ChartofAccountsModal.js";

const pickStoreId = (storeLower, storeUpper) => {
    const lower = storeLower != null && storeLower !== "" ? String(storeLower) : "";
    const upper = storeUpper != null && storeUpper !== "" ? String(storeUpper) : "";
    if (lower && lower !== "0") return lower;
    if (upper && upper !== "0") return upper;
    return lower || upper || "0";
};

const buildVendorOpeningRows = (rows = []) => {
    return rows.map((item) => {
        const vendor = String(item.Vendor || "").replace(/^Vendor\s*:\s*/i, "").trim();
        const store = pickStoreId(item.store, item.Store);
        const debit = Number(item.Debit || 0);
        const credit = Number(item.Credit || 0);
        if (!vendor) return null;
        if (debit === 0 && credit === 0) return null;
        return {
            id: `${vendor}||${store}`,
            Vendor: vendor,
            Store: store,
            store: store,
            Debit: debit,
            Credit: credit
        };
    }).filter(Boolean);
};

export const createOpennigBalance = async (req, res) => {
    try {
        const { DateStart, DateEnd, InvoetoryData } = req.body;

        if (!DateStart || !DateEnd || !Array.isArray(InvoetoryData)) {
            return res.status(400).send("Missing DateStart, DateEnd or InvoetoryData");
        }

        const existingRecord = await OpeningInventoryModal.findOne({ DateStart, DateEnd });

        if (existingRecord) {
            existingRecord.InvoetoryData = existingRecord.InvoetoryData.concat(InvoetoryData);
            await existingRecord.save();
            return res.status(200).send("Inventory updated on existing date record.");
        } else {
            await OpeningInventoryModal.create(req.body);
            return res.status(200).send("New inventory record created.");
        }
    } catch (err) {
        console.error("Error in createOpennigBalance:", err);
        return res.status(500).send("Something went wrong.");
    }
};



export const DeleteYear = async (req,res) =>{
try{
        const { DateStart, DateEnd, InvoetoryData } = req.body;

        const existingRecord = await OpeningInventoryModal.findOne({ DateStart, DateEnd });
        if(existingRecord) {
            await OpeningInventoryModal.findByIdAndDelete(existingRecord._id)
             return res.status(200).send("Inventory updated on existing date record.");
        }
         else {
            return res.status(200).send("New inventory record created.");
        }
}  catch (err) {
        console.error("Error in createOpennigBalance:", err);
        return res.status(500).send(err);
    }   
}

export const getAllOpeningInventory = async (req, res) => {
    try {
        const data = await OpeningInventoryModal.find()
        res.status(200).send(data)
    } catch (err) {
        res.status(400).send("Some thing went wrong", err)
    }

}

export const deleteOpeningInvetory = async (req, res) => {
    const { id } = req.params
    console.log(id)
    try {
        const data = await OpeningInventoryModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        console.log(err)
        res.status(400).send("Some thing went wrong", err)

    }
}

export const UpdateOpeningInvetory = async (req, res) => {
    const { id } = req.params
    try {
        const data = await OpeningInventoryModal.findByIdAndUpdate(id, req.body)
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("Some thing went wrong", err)

    }
}

export const changeStatusOnly = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const currentDoc = await OpeningInventoryModal.findById(id);
        const allDocs = await OpeningInventoryModal.find();

        if (!currentDoc) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }

        const inventoryData = currentDoc.InvoetoryData || [];

        if (status === "Open") {
            if (allDocs.length === 1) {
                const TotalProducts = inventoryData.map(item => ({
                    ProductName: item.product,
                    IncrementQuantity: item.opneingQty || 0,
                    Amount: (item.opneingQty || 0) * (item.opneingQtyValueExclGst || 0),
                    Location: item.Location,
                    Store: item.Store,
                    Type: item.Type
                }));

                const freshProducts = TotalProducts.filter(p => p.Type === "Fresh");
                const damageProducts = TotalProducts.filter(p => p.Type !== "Fresh");

                if (freshProducts.length) {
                    const bulkOps = freshProducts.map(product => ({
                        updateOne: {
                            filter: {
                                ProductName: product.ProductName,
                                Location: product.Location,
                                Store: product.Store,
                            },
                            update: {
                                $inc: {
                                    TotalQuantity: product.IncrementQuantity,
                                    Amount: product.Amount,
                                },
                                $setOnInsert: {
                                    ProductName: product.ProductName,
                                    Location: product.Location,
                                    Store: product.Store,
                                },
                            },
                            upsert: true,
                        },
                    }));

                    await TotalProductModal.bulkWrite(bulkOps);

                    for (const product of freshProducts) {
                        const existingProduct = await TotalProductModal.findOne({
                            ProductName: product.ProductName,
                            Location: product.Location,
                            Store: product.Store,
                        });

                        if (existingProduct && existingProduct.TotalQuantity > 0) {
                            const avgRate = existingProduct.Amount / existingProduct.TotalQuantity;
                            await TotalProductModal.updateOne(
                                { _id: existingProduct._id },
                                { $set: { AvgRate: avgRate } }
                            );
                        }
                    }
                }

                if (damageProducts.length) {
                    const bulkOps = damageProducts.map(product => ({
                        updateOne: {
                            filter: {
                                ProductName: product.ProductName,
                                Location: product.Location,
                                Store: product.Store,
                            },
                            update: {
                                $inc: {
                                    TotalQuantity: product.IncrementQuantity,
                                    Amount: product.Amount,
                                },
                                $setOnInsert: {
                                    ProductName: product.ProductName,
                                    Location: product.Location,
                                    Store: product.Store,
                                },
                            },
                            upsert: true,
                        },
                    }));

                    await DamageProductModal.bulkWrite(bulkOps);

                    for (const product of damageProducts) {
                        const existingProduct = await DamageProductModal.findOne({
                            ProductName: product.ProductName,
                            Location: product.Location,
                            Store: product.Store,
                        });

                        if (existingProduct && existingProduct.TotalQuantity > 0) {
                            const avgRate = existingProduct.Amount / existingProduct.TotalQuantity;
                            await DamageProductModal.updateOne(
                                { _id: existingProduct._id },
                                { $set: { AvgRate: avgRate } }
                            );
                        }
                    }
                }

                await OpeningInventoryModal.findByIdAndUpdate(id, { Status: status });
                return res.status(200).json({
                    success: true,
                    message: "Invoice posted and stock increased successfully",
                });
                

            } else {
                await OpeningInventoryModal.findByIdAndUpdate(id, { Status: status });
                return res.status(200).json({
                    success: true,
                    message: "Invoice status updated to Open",
                });
            }

        } else if (status === "Unpost") {
            if (allDocs.length === 1) {
                const TotalProducts = inventoryData.map(item => ({
                    ProductName: item.product,
                    DecrementQuantity: item.opneingQty || 0,
                    Amount: (item.opneingQty || 0) * (item.opneingQtyValueExclGst || 0),
                    Location: item.Location,
                    Store: item.Store,
                    Type: item.Type
                }));

                const freshProducts = TotalProducts.filter(p => p.Type === "Fresh");
                const damageProducts = TotalProducts.filter(p => p.Type !== "Fresh");

                if (freshProducts.length) {
                    const bulkOps = freshProducts.map(product => ({
                        updateOne: {
                            filter: {
                                ProductName: product.ProductName,
                                Location: product.Location,
                                Store: product.Store,
                            },
                            update: {
                                $inc: {
                                    TotalQuantity: -product.DecrementQuantity,
                                    Amount: -product.Amount,
                                },
                            },
                        },
                    }));

                    await TotalProductModal.bulkWrite(bulkOps);

                    for (const product of freshProducts) {
                        const updatedProduct = await TotalProductModal.findOne({
                            ProductName: product.ProductName,
                            Location: product.Location,
                            Store: product.Store,
                        });

                        const newAvgRate =
                            updatedProduct && updatedProduct.TotalQuantity > 0
                                ? updatedProduct.Amount / updatedProduct.TotalQuantity
                                : 0;

                        await TotalProductModal.updateOne(
                            { _id: updatedProduct?._id },
                            { $set: { AvgRate: newAvgRate } }
                        );
                    }
                }

                if (damageProducts.length) {
                    const bulkOps = damageProducts.map(product => ({
                        updateOne: {
                            filter: {
                                ProductName: product.ProductName,
                                Location: product.Location,
                                Store: product.Store,
                            },
                            update: {
                                $inc: {
                                    TotalQuantity: -product.DecrementQuantity,
                                    Amount: -product.Amount,
                                },
                            },
                        },
                    }));

                    await DamageProductModal.bulkWrite(bulkOps);

                    for (const product of damageProducts) {
                        const updatedProduct = await DamageProductModal.findOne({
                            ProductName: product.ProductName,
                            Location: product.Location,
                            Store: product.Store,
                        });

                        const newAvgRate =
                            updatedProduct && updatedProduct.TotalQuantity > 0
                                ? updatedProduct.Amount / updatedProduct.TotalQuantity
                                : 0;

                        await DamageProductModal.updateOne(
                            { _id: updatedProduct._id },
                            { $set: { AvgRate: newAvgRate } }
                        );
                    }
                }

                await OpeningInventoryModal.findByIdAndUpdate(id, { Status: status });
                return res.status(200).json({
                    success: true,
                    message: "Unposted successfully and stock reduced",
                });

            } else {
                console.log(status)
                await OpeningInventoryModal.findByIdAndUpdate(id, { Status: status });
                return res.status(200).json({
                    success: true,
                    message: "Invoice closed successfully",
                });
            }
        }
        else if (status === "Closed") {
            await OpeningInventoryModal.findByIdAndUpdate(id, { Status: status });
            return res.status(200).json({
                success: true,
                message: "Year End Successfully",
            });

        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Something went wrong", error: err });
    }
};


export const genrateNewYear = async (req, res) => {
    const { oldStartDate, oldEndDate, newStartDate, newEndDate, Expenses, Revenue, RetainedearningsAccount, vendorOpeningData, sundryCreditorAccountData } = req.body;

    if (!oldStartDate || !oldEndDate || !newStartDate || !newEndDate) {
        return res.status(400).json({
            success: false,
            message: "oldStartDate, oldEndDate, newStartDate, newEndDate are required"
        });
    }

    try {
        const AdminData = await AdministrativeModal.findOne().lean();
        const vendorAccount = AdminData?.Vendor || "";
        const clientAccount = AdminData?.Client || "";
        const storeWiseAccounts = new Set(
            [vendorAccount, clientAccount].filter(Boolean).map((id) => String(id))
        );
        const isStoreWiseAccount = (accountId) => storeWiseAccounts.has(String(accountId || ""));
        const results = {};

        // 1. Account Opening Transfer
        const oldAccountOpening = await AccountOpeningBalanceModal.findOne({
            DateStart: oldStartDate,
            DateEnd: oldEndDate
        }).lean();

        const allAccounts = await ChartofAccountsModal.find().select('_id AccountCode').lean();

        // ✅ FIXED: Group vouchers by Account + Store with proper accumulators
        const accountVouchers = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: { $gte: oldStartDate, $lte: oldEndDate }
                }
            },
            { $unwind: "$VoucharData" },
            {
                $group: {
                    _id: {
                        Account: "$VoucharData.Account",
                        Store: "$VoucharData.Store",
                        StoreLower: "$VoucharData.store"
                    },
                    TotalDebit: {
                        $sum: {
                            $convert: {
                                input: "$VoucharData.Debit",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    TotalCredit: {
                        $sum: {
                            $convert: {
                                input: "$VoucharData.Credit",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                }
            }
        ]);

        // Prefer voucher `store` (purchase/sales post this), then `Store`
        const normalizedVouchers = accountVouchers.map((v) => ({
            Account: v._id.Account,
            Store: pickStoreId(v._id.StoreLower, v._id.Store),
            TotalDebit: v.TotalDebit,
            TotalCredit: v.TotalCredit
        }));

        // Separate old opening: store-wise vs normal
        const oldAccountMapStoreWise = {};
        const oldAccountMapNormal = {};

        if (oldAccountOpening?.AccountsData) {
            for (const item of oldAccountOpening.AccountsData) {
                const isStoreWise = isStoreWiseAccount(item.Account);

                if (isStoreWise) {
                    const store = pickStoreId(item.store, item.Store);
                    const key = `${item.Account}||${store}`;
                    if (!oldAccountMapStoreWise[key]) {
                        oldAccountMapStoreWise[key] = {
                            Account: item.Account,
                            Store: store,
                            Debit: 0,
                            Credit: 0
                        };
                    }
                    oldAccountMapStoreWise[key].Debit += Number(item.Debit || 0);
                    oldAccountMapStoreWise[key].Credit += Number(item.Credit || 0);
                } else {
                    const key = item.Account;
                    if (!oldAccountMapNormal[key]) {
                        oldAccountMapNormal[key] = {
                            Account: item.Account,
                            Debit: 0,
                            Credit: 0
                        };
                    }
                    oldAccountMapNormal[key].Debit += Number(item.Debit || 0);
                    oldAccountMapNormal[key].Credit += Number(item.Credit || 0);
                }
            }
        }

        // Merge vouchers
        const mergedStoreWise = { ...oldAccountMapStoreWise };
        const mergedNormal = { ...oldAccountMapNormal };

        for (const v of normalizedVouchers) {
            const isStoreWise = isStoreWiseAccount(v.Account);

            if (isStoreWise) {
                const key = `${v.Account}||${v.Store}`;
                if (!mergedStoreWise[key]) {
                    mergedStoreWise[key] = {
                        Account: v.Account,
                        Store: v.Store,
                        Debit: 0,
                        Credit: 0
                    };
                }
                mergedStoreWise[key].Debit += Number(v.TotalDebit || 0);
                mergedStoreWise[key].Credit += Number(v.TotalCredit || 0);
            } else {
                const key = v.Account;
                if (!mergedNormal[key]) {
                    mergedNormal[key] = {
                        Account: v.Account,
                        Debit: 0,
                        Credit: 0
                    };
                }
                mergedNormal[key].Debit += Number(v.TotalDebit || 0);
                mergedNormal[key].Credit += Number(v.TotalCredit || 0);
            }
        }

        // Build new accounts - store-wise for vendor + sundry debtor, normal for rest
        const newAccountsDataStoreWise = Object.values(mergedStoreWise)
            .map((item) => {
                const net = Number(item.Debit || 0) - Number(item.Credit || 0);
                if (net === 0) return null;

                const accountDoc = allAccounts.find(
                    (a) => a._id?.toString() === item.Account?.toString()
                );
                if (!accountDoc) return null;

                const code = Number(accountDoc.AccountCode) || 0;
                const firstDigit = String(code).charAt(0);
                if (firstDigit !== "1" && firstDigit !== "2") return null;

                return {
                    id: `${item.Account}||${item.Store}`,
                    Account: item.Account,
                    store: item.Store,
                    Store: item.Store,
                    Debit: net > 0 ? net : 0,
                    Credit: net < 0 ? Math.abs(net) : 0
                };
            })
            .filter(Boolean);

        const newAccountsDataNormal = Object.values(mergedNormal)
            .map((item) => {
                const net = Number(item.Debit || 0) - Number(item.Credit || 0);
                if (net === 0) return null;

                const accountDoc = allAccounts.find(
                    (a) => a._id?.toString() === item.Account?.toString()
                );
                if (!accountDoc) return null;

                const code = Number(accountDoc.AccountCode) || 0;
                const firstDigit = String(code).charAt(0);
                if (firstDigit !== "1" && firstDigit !== "2") return null;

                return {
                    id: item.Account,
                    Account: item.Account,
                    Debit: net > 0 ? net : 0,
                    Credit: net < 0 ? Math.abs(net) : 0
                };
            })
            .filter(Boolean);

        let newAccountsData = [...newAccountsDataStoreWise, ...newAccountsDataNormal];

        // Frontend store-wise Sundry Creditor (control account) closing -> Account Opening
        const creditorAccountRows = Array.isArray(sundryCreditorAccountData) && sundryCreditorAccountData.length > 0
            ? sundryCreditorAccountData
            : null;
        if (creditorAccountRows && vendorAccount) {
            newAccountsData = newAccountsData.filter(
                (a) => String(a.Account) !== String(vendorAccount)
            );
            for (const row of creditorAccountRows) {
                const store = pickStoreId(row.store, row.Store);
                const debit = Number(row.Debit || 0);
                const credit = Number(row.Credit || 0);
                if (debit === 0 && credit === 0) continue;
                newAccountsData.push({
                    id: `${vendorAccount}||${store}`,
                    Account: vendorAccount,
                    store,
                    Store: store,
                    Debit: debit,
                    Credit: credit
                });
            }
        } else if (Array.isArray(vendorOpeningData) && vendorOpeningData.length > 0 && vendorAccount) {
            newAccountsData = newAccountsData.filter(
                (a) => String(a.Account) !== String(vendorAccount)
            );
            const vendorByStore = {};
            for (const row of vendorOpeningData) {
                const store = pickStoreId(row.store, row.Store);
                if (!vendorByStore[store]) {
                    vendorByStore[store] = { Store: store, Debit: 0, Credit: 0 };
                }
                vendorByStore[store].Debit += Number(row.Debit || 0);
                vendorByStore[store].Credit += Number(row.Credit || 0);
            }
            for (const item of Object.values(vendorByStore)) {
                const net = Number(item.Debit) - Number(item.Credit);
                if (net === 0) continue;
                newAccountsData.push({
                    id: `${vendorAccount}||${item.Store}`,
                    Account: vendorAccount,
                    store: item.Store,
                    Store: item.Store,
                    Debit: net > 0 ? net : 0,
                    Credit: net < 0 ? Math.abs(net) : 0
                });
            }
        }

        await AccountOpeningBalanceModal.findOneAndDelete({
            DateStart: newStartDate,
            DateEnd: newEndDate
        });
        await AccountOpeningBalanceModal.create({
            DateStart: newStartDate,
            DateEnd: newEndDate,
            AccountsData: newAccountsData,
            Status: "Open"
        });
        results.Accounts = newAccountsData.length;

        // 2. Client Opening Transfer - store-wise (Client + Store)
        const oldClientOpening = await ClientOpeningBalanceModal.findOne({
            DateStart: oldStartDate,
            DateEnd: oldEndDate
        }).lean();

        const clientVouchers = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: { $gte: oldStartDate, $lte: oldEndDate }
                }
            },
            { $unwind: "$VoucharData" },
            {
                $match: { "VoucharData.Client": { $exists: true, $ne: null, $ne: "" } }
            },
            {
                $addFields: {
                    _normStore: {
                        $cond: {
                            if: {
                                $or: [
                                    { $eq: ["$VoucharData.store", null] },
                                    { $eq: ["$VoucharData.store", ""] },
                                    { $eq: ["$VoucharData.store", "0"] }
                                ]
                            },
                            then: { $ifNull: ["$VoucharData.Store", "0"] },
                            else: "$VoucharData.store"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        Client: "$VoucharData.Client",
                        Store: "$_normStore"
                    },
                    TotalDebit: {
                        $sum: {
                            $convert: {
                                input: "$VoucharData.Debit",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    TotalCredit: {
                        $sum: {
                            $convert: {
                                input: "$VoucharData.Credit",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                }
            }
        ]);

        const oldClientRows = Array.isArray(oldClientOpening?.ClientData)
            ? oldClientOpening.ClientData
            : Object.values(oldClientOpening?.ClientData || {});

        const oldClientMap = {};
        for (const item of oldClientRows) {
            const store = String(item.store || item.Store || "0") || "0";
            const key = `${item.Client}||${store}`;
            if (!oldClientMap[key]) {
                oldClientMap[key] = { Client: item.Client, Store: store, Debit: 0, Credit: 0 };
            }
            oldClientMap[key].Debit += Number(item.Debit || 0);
            oldClientMap[key].Credit += Number(item.Credit || 0);
        }

        const mergedClientMap = { ...oldClientMap };
        for (const v of clientVouchers) {
            const store = String(v._id.Store || "0") || "0";
            const key = `${v._id.Client}||${store}`;
            if (!mergedClientMap[key]) {
                mergedClientMap[key] = { Client: v._id.Client, Store: store, Debit: 0, Credit: 0 };
            }
            mergedClientMap[key].Debit += Number(v.TotalDebit || 0);
            mergedClientMap[key].Credit += Number(v.TotalCredit || 0);
        }

        const newClientData = [];
        for (const item of Object.values(mergedClientMap)) {
            const net = Number(item.Debit) - Number(item.Credit);
            if (net === 0) continue;

            newClientData.push({
                id: `${item.Client}||${item.Store}`,
                Store: item.Store,
                store: item.Store,
                Client: item.Client,
                Debit: net > 0 ? net : 0,
                Credit: net < 0 ? Math.abs(net) : 0
            });
        }

        await ClientOpeningBalanceModal.findOneAndDelete({
            DateStart: newStartDate,
            DateEnd: newEndDate
        });
        await ClientOpeningBalanceModal.create({
            DateStart: newStartDate,
            DateEnd: newEndDate,
            ClientData: newClientData,
            Status: "Open"
        });
        results.Clients = newClientData.length;

        // 3. Vendor Opening Transfer - prefer frontend store-wise sundry creditor closing
        let newVendorData = [];
        if (Array.isArray(vendorOpeningData) && vendorOpeningData.length > 0) {
            newVendorData = buildVendorOpeningRows(vendorOpeningData);
        } else {
            const oldVendorOpening = await VendorOpeningModal.findOne({
                DateStart: oldStartDate,
                DateEnd: oldEndDate
            }).lean();

            const vendorVouchers = await VoucherModal.aggregate([
                {
                    $match: {
                        VoucherDate: { $gte: oldStartDate, $lte: oldEndDate }
                    }
                },
                { $unwind: "$VoucharData" },
                {
                    $match: { "VoucharData.Vendor": { $exists: true, $nin: [null, ""] } }
                },
                {
                    $addFields: {
                        _normStore: {
                            $cond: {
                                if: {
                                    $or: [
                                        { $eq: ["$VoucharData.store", null] },
                                        { $eq: ["$VoucharData.store", ""] },
                                        { $eq: ["$VoucharData.store", "0"] }
                                    ]
                                },
                                then: { $ifNull: ["$VoucharData.Store", "0"] },
                                else: "$VoucharData.store"
                            }
                        },
                        _normVendor: {
                            $replaceOne: {
                                input: { $toString: { $ifNull: ["$VoucharData.Vendor", ""] } },
                                find: "Vendor : ",
                                replacement: ""
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            Vendor: "$_normVendor",
                            Store: "$_normStore"
                        },
                        TotalDebit: {
                            $sum: {
                                $convert: {
                                    input: "$VoucharData.Debit",
                                    to: "double",
                                    onError: 0,
                                    onNull: 0
                                }
                            }
                        },
                        TotalCredit: {
                            $sum: {
                                $convert: {
                                    input: "$VoucharData.Credit",
                                    to: "double",
                                    onError: 0,
                                    onNull: 0
                                }
                            }
                        }
                    }
                }
            ]);

            const oldVendorRows = Array.isArray(oldVendorOpening?.VendorData)
                ? oldVendorOpening.VendorData
                : Object.values(oldVendorOpening?.VendorData || {});

            const oldVendorMap = {};
            for (const item of oldVendorRows) {
                const vendor = String(item.Vendor || "").replace(/^Vendor\s*:\s*/i, "").trim();
                if (!vendor) continue;
                const store = pickStoreId(item.store, item.Store);
                const key = `${vendor}||${store}`;
                if (!oldVendorMap[key]) {
                    oldVendorMap[key] = { Vendor: vendor, Store: store, Debit: 0, Credit: 0 };
                }
                oldVendorMap[key].Debit += Number(item.Debit || 0);
                oldVendorMap[key].Credit += Number(item.Credit || 0);
            }

            const mergedVendorMap = { ...oldVendorMap };
            for (const v of vendorVouchers) {
                const vendor = String(v._id.Vendor || "").replace(/^Vendor\s*:\s*/i, "").trim();
                if (!vendor) continue;
                const store = pickStoreId(null, v._id.Store);
                const key = `${vendor}||${store}`;
                if (!mergedVendorMap[key]) {
                    mergedVendorMap[key] = { Vendor: vendor, Store: store, Debit: 0, Credit: 0 };
                }
                mergedVendorMap[key].Debit += Number(v.TotalDebit || 0);
                mergedVendorMap[key].Credit += Number(v.TotalCredit || 0);
            }

            for (const item of Object.values(mergedVendorMap)) {
                const net = Number(item.Debit) - Number(item.Credit);
                if (net === 0) continue;
                newVendorData.push({
                    id: `${item.Vendor}||${item.Store}`,
                    Vendor: item.Vendor,
                    Store: item.Store,
                    store: item.Store,
                    Debit: net > 0 ? net : 0,
                    Credit: net < 0 ? Math.abs(net) : 0
                });
            }
        }

        await VendorOpeningModal.findOneAndDelete({
            DateStart: newStartDate,
            DateEnd: newEndDate
        });
        await VendorOpeningModal.create({
            DateStart: newStartDate,
            DateEnd: newEndDate,
            VendorData: newVendorData,
            Status: "Open"
        });
        results.Vendors = newVendorData.length;

        // 4. Transporter Opening Transfer
        const oldTransporterOpening = await TransporterOpeningBalanceModal.findOne({
            DateStart: oldStartDate,
            DateEnd: oldEndDate
        }).lean();

        const transporterVouchers = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: { $gte: oldStartDate, $lte: oldEndDate }
                }
            },
            { $unwind: "$VoucharData" },
            {
                $match: { "VoucharData.Transporter": { $exists: true, $ne: null, $ne: "" } }
            },
            {
                $group: {
                    _id: { Transporter: "$VoucharData.Transporter" },
                    TotalDebit: {
                        $sum: {
                            $convert: {
                                input: "$VoucharData.Debit",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    },
                    TotalCredit: {
                        $sum: {
                            $convert: {
                                input: "$VoucharData.Credit",
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                }
            }
        ]);

        const oldTransporterMap = {};
        if (oldTransporterOpening?.TransporterData) {
            for (const item of oldTransporterOpening.TransporterData) {
                const key = item.Transporter;
                if (!oldTransporterMap[key]) {
                    oldTransporterMap[key] = { Transporter: item.Transporter, Debit: 0, Credit: 0 };
                }
                oldTransporterMap[key].Debit += Number(item.Debit || 0);
                oldTransporterMap[key].Credit += Number(item.Credit || 0);
            }
        }

        const mergedTransporterMap = { ...oldTransporterMap };
        for (const v of transporterVouchers) {
            const key = v._id.Transporter;
            if (!mergedTransporterMap[key]) {
                mergedTransporterMap[key] = { Transporter: v._id.Transporter, Debit: 0, Credit: 0 };
            }
            mergedTransporterMap[key].Debit += Number(v.TotalDebit || 0);
            mergedTransporterMap[key].Credit += Number(v.TotalCredit || 0);
        }

        const newTransporterData = [];
        for (const item of Object.values(mergedTransporterMap)) {
            const net = Number(item.Debit) - Number(item.Credit);
            if (net === 0) continue;

            newTransporterData.push({
                id: item.Transporter,
                Transporter: item.Transporter,
                Debit: net > 0 ? net : 0,
                Credit: net < 0 ? Math.abs(net) : 0
            });
        }

        await TransporterOpeningBalanceModal.findOneAndDelete({
            DateStart: newStartDate,
            DateEnd: newEndDate
        });
        await TransporterOpeningBalanceModal.create({
            DateStart: newStartDate,
            DateEnd: newEndDate,
            TransporterData: newTransporterData,
            Status: "Open"
        });
        results.Transporters = newTransporterData.length;

        // 4. ✅ SUCCESS RESPONSE - SIRF COUNTS
        return res.status(200).json({
            success: true,
            message: "New year openings generated successfully",
            stats: {
                accountsCreated: results.Accounts || 0,
                clientsCreated: results.Clients || 0,
                vendorsCreated: results.Vendors || 0,
                transportersCreated: results.Transporters || 0,
                systemVouchersCreated: results.SystemVoucher || 0
            }
        });

    } catch (err) {
        console.error("Error in generateNewYear:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: err.message
        });
    }
};

export const saveYearVendorOpening = async (req, res) => {
    const { DateStart, DateEnd, VendorData } = req.body;
    if (!DateStart || !DateEnd || !Array.isArray(VendorData)) {
        return res.status(400).json({
            success: false,
            message: "DateStart, DateEnd and VendorData are required"
        });
    }
    try {
        const rows = buildVendorOpeningRows(VendorData);
        await VendorOpeningModal.findOneAndDelete({ DateStart, DateEnd });
        const record = await VendorOpeningModal.create({
            DateStart,
            DateEnd,
            VendorData: rows,
            Status: "Open"
        });
        return res.status(200).json({
            success: true,
            count: rows.length,
            data: record
        });
    } catch (err) {
        console.error("Error in saveYearVendorOpening:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getClientVouchers = async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const vouchers = await VoucherModal.aggregate([
            {
                $match: {
                    VoucherDate: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: "$VoucharData" },
            {
                $match: {
                    "VoucharData.Client": { $exists: true, $ne: "" }
                }
            },
            {
                $project: {
                    _id: 0,
                    VoucherNumber: 1,
                    VoucherDate: 1,
                    VoucherType: 1,
                    status: 1,
                    Client: "$VoucharData.Client",
                    Account: "$VoucharData.Account",
                    Debit: { $convert: { input: "$VoucharData.Debit", to: "double", onError: 0, onNull: 0 } },
                    Credit: { $convert: { input: "$VoucharData.Credit", to: "double", onError: 0, onNull: 0 } },
                    store: { $ifNull: ["$VoucharData.store", "0"] },
                    Ref: "$VoucharData.Ref",
                    Narration: "$VoucharData.Narration"
                }
            }
        ]);
        res.status(200).json({ status: true, count: vouchers.length, data: vouchers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Something went wrong", error: err.message });
    }
}

export const updateClientVoucherAccounts = async (req, res) => {
    const newAccountId  = "68821bd2f93ac76a141e26c0"
    try {
        const vouchers = await VoucherModal.find();

        let updatedCount = 0;
        for (const voucher of vouchers) {
            let changed = false;
            for (const row of voucher.VoucharData) {
                if (row.Client && row.Client !== "" && row.Client !== null) {
                    if (row.Account !== newAccountId) {
                        row.Account = newAccountId;
                        changed = true;
                    }
                }
            }
            if (changed) {
                await VoucherModal.findByIdAndUpdate(voucher._id , voucher);
                updatedCount++;
            }
        }

        res.status(200).json({ status: true, message: `${updatedCount} vouchers updated`, updatedCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Something went wrong", error: err.message });
    }
}

export const getAllYear = async (req, res) => {
    try {
        const onlyYear = await OpeningInventoryModal
            .find()
            .select("DateStart DateEnd");

        res.status(200).send(onlyYear);
    } catch (err) {
        res.status(500).send(err);
    }
};
