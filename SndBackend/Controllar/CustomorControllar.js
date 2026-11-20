import CutomerModal from "../modal/CustomorModal.js"
import { withCustomerAging } from "./customerAging.js";


export const creatCutomer = async (req, res) => {
    console.log(req.body)
    try {
        const lastCustomer = await CutomerModal.findOne().sort({code : -1})
         const code = (parseInt(lastCustomer.code) + 1).toString().padStart(10, "0")
         const reqData = {
            ...req.body,
            code : code,
         }
        const data = await CutomerModal.create(reqData)
        res.status(200).send("data Add")
    } catch (e) {
        console.log(e);
        res.status(400).send('Server Error');
    }
}

export const getAllCutomer = async (req, res) => {
    try {
        const Customor = await CutomerModal.find();
        res.status(200).send({ status: true, data: Customor });
    } catch (err) {
        res.status(400).send("some thing went gone wrong")
    }
}

export const getAllCutomerByBooker = async (req, res) => {
    try {
        const { OrderBooker } = req.params;
        // Mobile home needs every customer assigned to this order booker + aging balance.
        const Customor = await CutomerModal.find({ OrderBooker }).sort({ CustomorName: 1 }).lean();
        const data = await withCustomerAging(Customor);
        res.status(200).send({ status: true, data });
    } catch (err) {
        console.error(err);
        res.status(400).send("some thing went gone wrong")
    }
}


export const getAllCutomerByDis = async (req, res) => {
    try {
        const Customor = await CutomerModal.find({ Distributor: req.params.Distributor });
        res.status(200).send({ status: true, data: Customor });
    } catch (err) {
        res.status(400).send("some thing went gone wrong")
    }
}

export const getCustomorName = async (req, res, next) => {
    const { id } = req.params;
    try {
        const Customors = await CutomerModal.findOne({ _id: id });
        res.status(200).send({ status: true, data: Customors });
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

export const CustomorByDistributor = async (req, res) => {
    const { Distributor } = req.params
    try {
        console.log(Distributor)
        const data = await CutomerModal.find({ Distributor: Distributor });
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


export const AddCustomorInBulk = async (req, res) => {
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


export const UpdateCustomorLocalityInBulk = async (req, res) => {
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

export const CustomorNameid = async (req, res) => {
    try {
        const data = await CutomerModal.find({}, { CutomerName: 1 , code : 1 , NTN : 1, STN : 1 , SalesFlowRef : 1 , OwnerCnic : 1 , Registered : 1 , Vendor : 1}, { _id: 1 },)
        console.log(data)
        res.status(200).send({
            status: true,
            data: data
        });
    } catch (err) {
        console.error('Error fetching Customor names:', err);
        res.status(500).send({
            status: false,
            message: 'Failed to fetch Customor names',
            error: err.message
        });
    }
}

// export const duplicatesmerge = async (req, res) => {
//     try {
//         const issues = [];
//         const notFound = [];

//         for (const item of duplicate) {

//             const Customors = await CutomerModal.find({ SalesFlowRef: item.Code });

//             if (Customors.length === 2) {

//                 const mainCustomor = Customors[1]._id;
//                 console.log(mainCustomor.length)
//                if(mainCustomor) {
//                 const invoices = await SalesInvoiceModal.find({ Client: mainCustomor });

//                 if (invoices.length > 0) {
//                     console.log("Invoices found:", invoices.length);
//                     issues.push({ type: "invoice", data: invoices });
//                 } else {
//                     console.log("No Invoice found for", mainCustomor);
//                 }

//                 // ----- Vouchers -----
//                 const vouchers = await VoucherModal.find({ "VoucharData.Client": mainCustomor });

//                 if (vouchers.length > 0) {
//                     console.log("Voucher found:", vouchers.length);
//                     issues.push({ type: "voucher", data: vouchers });
//                 } else {
//                     console.log("No Voucher found for", mainCustomor);
//                 }

//                 // ----- Customor Cheques -----
//                 const cheques = await CustomorChqRecivedModal.find({ Customor: mainCustomor });

//                 if (cheques.length > 0) {
//                     console.log("CustomorChqRecived found:", cheques.length);
//                     issues.push({ type: "cheque", data: cheques });
//                 } else {
//                     console.log("No CustomorChqRecived found for", mainCustomor);
//                 }

//                 // If nothing found → store Customor in notFound list
//                 if (invoices.length === 0 && vouchers.length === 0 && cheques.length === 0) {
//                     notFound.push(mainCustomor);
//                     const deletCustomor = await CutomerModal.findByIdAndDelete(mainCustomor)
//                     console.log(deletCustomor)
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

