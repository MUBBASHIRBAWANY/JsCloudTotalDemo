// import { duplicate } from "../DuplicatCode.js"
import mongoose from "mongoose"
import CustomerChqRecivedModal from "../modal/CustomerChqRecivedModal.js"
import CutomerModal from "../modal/CutomerModal.js"
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js"
import VoucherModal from "../modal/VoucherModal.js"


export const creatCutomer = async (req, res) => {
    console.log(req.body)
    try {
        const data = await CutomerModal.create(req.body)
        res.status(200).send("data Add")
    } catch (e) {
        console.log(e);
        res.status(400).send('Server Error');
    }
}

export const getAllCutomer = async (req, res) => {
    try {
        const customer = await CutomerModal.find();
        res.status(200).send({ status: true, data: customer });
    } catch (err) {
        res.status(400).send("some thing went gone wrong")
    }
}

export const getCustomerName = async (req, res, next) => {
    const { id } = req.params;
    try {
        const customers = await CutomerModal.findOne({ _id: id });
        res.status(200).send({ status: true, data: customers });
    } catch (err) {
        res.status(400).send("some thing went gone wrong");
    }
}
export const getLastCutomer = async (req, res) => {
    try {
        const lastCutomer = await CutomerModal.findOne().sort({ _id: -1 }).limit(1)
        console.log(lastCutomer)
        res.send({ status: true, data: lastCutomer });
    } catch (err) {
        console.log(err)
    }
}

export const updatCutomer = async (req, res) => {
    const { id } = req.params
    console.log(id)
    try {
        const data = await CutomerModal.findByIdAndUpdate(id, req.body)
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went gone wrong")
    }
}

export const deletCutomer = async (req, res) => {
    const { id } = req.params
    try {
        const data = await CutomerModal.findByIdAndDelete(id)
        res.status(200).send("data daelete");
    } catch (err) {
        res.status(400).send("some thing went gone wrong")
    }
}

export const CustomerByVendor = async (req, res) => {
    const vendor = req.params.Vendor || req.params.vendor
    try {
        console.log(vendor)
        const data = await CutomerModal.find({ Vendor: { $in: [vendor] } });
        res.status(200).send({
            status: true,
            data: data
        });
    } catch (err) {
        console.error('Error fetching categories by vendor:', err);
        res.status(500).send({
            status: false,
            message: 'Failed to fetch categories',
            error: err.message
        });
    }
}


export const AddCustomerInBulk = async (req, res) => {
    try {
        const insertedIds = [];

        for (const item of req.body) {
            const code = await CutomerModal.find().sort({ _id: -1 }).limit(1)
            console.log(code)
            let nextCode
            if (code.length == 0) {
                const nextNumber = parseInt("00000", 10) + 1;
                nextCode = nextNumber.toString().padStart(5, '0')
            }
            else {
                const nextNumber = parseInt(code[0].code, 10) + 1;
                nextCode = nextNumber.toString().padStart(5, '0')
            }

            if (nextCode == "100") {
                res.status(500).send({
                    status: false,
                    message: 'Failed to fetch categories',
                    error: err.message
                });
            }
            const newChannel = new CutomerModal({
                Address: item.Address,
                code: nextCode,
                mastercode: item.mastercode + nextCode,
                Chanel: item.Chanel,
                ChannelType: item.ChannelType,
                CutomerName: item.CutomerName,
                Fax: item.Fax,
                Filler: item.Filler,
                JBP: item.JBP,
                NTN: item.NTN,
                OwnerCnic: item.OwnerCnic,
                Region: item.Region,
                Registered: item.Registered,
                STN: item.STN,
                SalesFlowRef: item.SalesFlowRef,
                ShopOwner: item.ShopOwner,
                ShopRegisterDate: item.ShopRegisterDate,
                Status: item.Status,
                SubChannel: item.SubChannel,
                TTS: item.TTS,
                TradeActivity: item.TradeActivity,
                TradeOffer: item.Tradeoffer,
                VDS: item.VDS,
                Vendor: item.Vendor,
                WebSite: item.WebSite,
                Terrotory: item.Terrotory,
                email: item.email,
                phone: item.phone,
                Town: item.Town,
                AdvanceTaxApply: item.AdvanceTaxApply

            });
            const savedItem = await newChannel.save();
            insertedIds.push(savedItem._id);
            console.log(`Inserted: ${item.ChannelName}`);
        }
        res.status(200).send({
            status: true,
            data: insertedIds
        });
        console.log('All documents inserted successfully!');
        return insertedIds;
    } catch (error) {
        console.error('Error inserting documents:', error.message);
        throw error;
    }
}


export const UpdateCustomerLocalityInBulk = async (req, res) => {
    try {
        const updatedResults = [];

        for (const item of req.body) {
            const updated = await CutomerModal.findOneAndUpdate(
                { code: item.code },
                { $set: { Locality: item.Locality } },
                { new: true }
            );

            if (updated) {
                updatedResults.push({ id: updated._id, status: 'updated' });
            } else {
                updatedResults.push({ code: item.code, status: 'not found' });
            }
        }

        res.status(200).send({
            status: true,
            data: updatedResults
        });

    } catch (error) {
        console.error('Error updating locality:', error.message);
        res.status(500).send({
            status: false,
            message: 'Failed to update Locality in bulk',
            error: error.message
        });
    }
};

export const syncStoreFromFirstInvoice = async (req, res) => {
    try {
        const firstInvoices = await SalesInvoiceModal.aggregate([
            {
                $match: {
                    Client: { $exists: true, $nin: [null, ""] },
                    Store: { $exists: true, $nin: [null, ""] }
                }
            },
            { $sort: { SalesInvoiceDate: 1, _id: 1 } },
            {
                $group: {
                    _id: "$Client",
                    Store: { $first: "$Store" }
                }
            }
        ]).allowDiskUse(true);

        if (!firstInvoices.length) {
            return res.status(200).send({
                status: true,
                updated: 0,
                matched: 0,
                skipped: 0,
                clientsWithInvoice: 0,
                message: "No invoices with store found"
            });
        }

        const ops = firstInvoices
            .filter((item) => item.Store && mongoose.isValidObjectId(item._id))
            .map((item) => ({
                updateOne: {
                    filter: { _id: item._id },
                    update: { $set: { Store: item.Store } }
                }
            }));

        let modifiedCount = 0;
        let matchedCount = 0;
        const batchSize = 1000;
        for (let i = 0; i < ops.length; i += batchSize) {
            const result = await CutomerModal.bulkWrite(ops.slice(i, i + batchSize), { ordered: false });
            modifiedCount += result.modifiedCount || 0;
            matchedCount += result.matchedCount || 0;
        }

        res.status(200).send({
            status: true,
            updated: modifiedCount,
            matched: matchedCount,
            skipped: firstInvoices.length - matchedCount,
            clientsWithInvoice: firstInvoices.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({
            status: false,
            message: err.message || "Failed to sync store from first invoice"
        });
    }
};

export const customerNameid = async (req, res) => {
    try {
        const data = await CutomerModal.find({}, { CutomerName: 1 , code : 1 , NTN : 1, STN : 1 , SalesFlowRef : 1 , OwnerCnic : 1 , Registered : 1 , Vendor : 1}, { _id: 1 },)
        console.log(data)
        res.status(200).send({
            status: true,
            data: data
        });
    } catch (err) {
        console.error('Error fetching customer names:', err);
        res.status(500).send({
            status: false,
            message: 'Failed to fetch customer names',
            error: err.message
        });
    }
}


// export const duplicatesmerge = async (req, res) => {
//     try {
//         const issues = [];
//         const notFound = [];

//         for (const item of duplicate) {

//             const customers = await CutomerModal.find({ SalesFlowRef: item.Code });
// console.log(customers.length)
//             if (customers.length === 2) {

//                 const mainCustomer = customers[1]._id;
//                if(mainCustomer) {
//                 const invoices = await SalesInvoiceModal.find({ Client: mainCustomer });

//                 if (invoices.length > 0) {
//                     console.log("Invoices found:", invoices.length);
//                     issues.push({ type: "invoice", data: invoices });
//                 } else {
//                     console.log("No Invoice found for", mainCustomer);
//                 }

//                 // ----- Vouchers -----
//                 const vouchers = await VoucherModal.find({ "VoucharData.Client": mainCustomer });

//                 if (vouchers.length > 0) {
//                     console.log("Voucher found:", vouchers.length);
//                     issues.push({ type: "voucher", data: vouchers });
//                 } else {
//                     console.log("No Voucher found for", mainCustomer);
//                 }

//                 // ----- Customer Cheques -----
//                 const cheques = await CustomerChqRecivedModal.find({ Customer: mainCustomer });

//                 if (cheques.length > 0) {
//                     console.log("CustomerChqRecived found:", cheques.length);
//                     issues.push({ type: "cheque", data: cheques });
//                 } else {
//                     console.log("No CustomerChqRecived found for", mainCustomer);
//                 }

//                 // If nothing found → store customer in notFound list
//                 if (invoices.length === 0 && vouchers.length === 0 && cheques.length === 0) {
//                     notFound.push(mainCustomer);
//                     const deletCustomer = await CutomerModal.findByIdAndDelete(mainCustomer)
//                     console.log(deletCustomer)
//                 }

//                }
//                 // ----- Invoices -----
                
//             }
//         }

//         console.log("Not Found Count:", notFound.length);

//         return res.status(200).send({
//             issues,
//             notFoundCount: notFound.length,
//             notFound
//         });

//     } catch (error) {
//         console.log("Error:", error);
//         return res.status(500).send({ message: "Internal Server Error", error });
//     }
// };