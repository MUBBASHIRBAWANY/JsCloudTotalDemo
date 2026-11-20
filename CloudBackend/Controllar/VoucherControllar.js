import e from "express";
import CustomerChqRecivedModal from "../modal/CustomerChqRecivedModal.js";
import InvoiceOpeningModal from "../modal/OpeningInvoicesModal.js";
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";
import VoucherModal from "../modal/VoucherModal.js";
import CutomerModal from "../modal/CutomerModal.js";
import mongoose from "mongoose";
import ChartofAccountsModel from "../modal/ChartofAccountsModal.js";
import DistrbutorInvoiceModal from "../modal/DistrbutorInvoiceModal.js";
import DistrbutorModal from "../modal/DistributerModal.js";
import { Check } from "../Check.js";
import { voucher } from "../Vouchers.js";
import jwt from "jsonwebtoken"; //YE ADD KARO
import TransporterModal from "../modal/TransporterModal.js";
import VendorModel from "../modal/VendorModal.js";
import StoreModal from "../modal/StoreModal.js";
//import { number } from "../JafferSons.voucher NUmber.js";
import logModal from "../modal/LogModal.js"
import { checkMonthClose } from "../utils/checkMonthClose.js";
import { knockOffInvoiceLines, reduceClientKnockOffLeftover, matchDistributorAgingToLedger, previewVoucherRealize, realizeVoucherAgainstInvoices, previewStrictDistributorKnockOff, applyStrictDistributorKnockOff, getKnockoffPoolVouchers, loadClientLedger } from "../utils/invoiceKnockOff.js";
import ChqBookModal from "../Modal/ChqBookModal.js";

//CHANGES IN THIS FILE CREATE VOUCHER CREATE SYSTEM VOUCHER UPDATE VOUCHER AND CREATEREALIZEVOUCHER
const httpError = (statusCode, message, extra) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    if (extra) err.details = extra;
    return err;
};
const voucherTypeMap = {
    CP: "Cash Payment",
    CR: "Cash Receipt",
    BR: "Bank Receipt",
    BP: "Bank Payment",
    PR: "Payment Reciept",
};

const shouldKnockOffOnCreate = (voucherType) =>
    voucherType === "CR" || voucherType === "JV";

export const createVoucher = async (req, res) => {
    const session = await mongoose.startSession();
    console.log("Craete Voucher req.body", req.body)


    try {
        // Month-close check sends its own response when the month is closed
        const monthCheck = await checkMonthClose(req, res, "VoucherDate");
        if (monthCheck) return;

        const token = req.headers.authorization?.split(" ")[1];
        if (token) jwt.verify(token, "peral-Dynamic"); // move secret to env
        const userId = req.user?._id || req.user?.id;

        const { VoucherNumber, ChequeNumber, VoucherType, VoucharData, ChequeBook } = req.body;

        let newVoucher;

        await session.withTransaction(async () => {
            newVoucher = undefined; // reset in case the callback is retried

            // Duplicate voucher number
            const existingVoucher = await VoucherModal
                .findOne({ VoucherNumber })
                .session(session);
            if (existingVoucher) {
                throw httpError(400, "Voucher number already exists");
            }

            // Duplicate cheque (bank payments only)
            if (ChequeNumber && ChequeNumber !== "Online" && VoucherType == "BP") {
                const existingChq = await VoucherModal
                    .findOne({ ChequeNumber })
                    .session(session);
                if (existingChq) {
                    throw httpError(400, `Cheque already used in ${existingChq.VoucherNumber}`);
                }
            }

            // STEP 1: create voucher (array form is required when passing options)
            const [created] = await VoucherModal.create([req.body], { session });
            newVoucher = created;

            // STEP 1b: mark cheque used for Bank Payment vouchers
            if (VoucherType === "BP" && ChequeNumber && ChequeNumber !== "Online" && ChequeBook) {
                const chqBook = await ChqBookModal.findById(ChequeBook).session(session);
                if (!chqBook) {
                    throw httpError(404, "Cheque book not found");
                }

                let updated = false;
                chqBook.Cheuques = chqBook.Cheuques.map((subArray) =>
                    subArray.map((cheque) => {
                        if (cheque.chq === ChequeNumber) {
                            updated = true;
                            return { ...cheque, status: "used" };
                        }
                        return cheque;
                    })
                );

                if (!updated) {
                    throw httpError(404, "No matching cheques found");
                }

                const hasUnused = (chqBook.Cheuques[0] || []).some((item) => item.status === "unUsed");
                if (!hasUnused) {
                    chqBook.Status = "Chq Book Closed";
                }

                await chqBook.save({ session });
            }

            // STEP 2: knock off invoices in the SAME transaction.
            // If this fails, the voucher above is rolled back too.
            if (shouldKnockOffOnCreate(VoucherType)) {
                await knockOffInvoiceLines(VoucharData, session);
            }
            await logModal.create({
                userId,
                action: "create",
                Page: "Voucher",
                payload: req.body,
                responseStatus: 200,
                RefNumber: VoucherNumber,
            }, { session });
        });

        // Log AFTER commit, so a log failure never fails or rolls back the voucher

        return res.status(201).json({
            message: "Voucher created successfully",
            voucher: newVoucher,
        });
    } catch (error) {
        console.log(error);

        // Race on the unique index (two requests with the same VoucherNumber)
        if (error?.code === 11000) {
            return res.status(400).json({ message: "Voucher number already exists" });
        }

        return res.status(error.statusCode || 400).json({
            message: error.message,
        });
    } finally {
        await session.endSession();
    }
};

// export const createVoucher = async (req, res) => {

//     const monthCheck = await checkMonthClose(req, res, "VoucherDate");
//     if (monthCheck) return;
//     try {
//         const token = req.headers.authorization?.split(" ")[1];
//         if (token) jwt.verify(token, "peral-Dynamic");
//         const userId = req.user?._id || req.user?.id;

//         const {
//             VoucherNumber,
//             ChequeNumber,
//             VoucherType,
//             VoucharData
//         } = req.body;

//         const existingVoucher = await VoucherModal.findOne({ VoucherNumber });
//         if (existingVoucher) {
//             return res.status(400).json({ message: "Voucher number already exists" });
//         }

//         if (ChequeNumber && ChequeNumber !== "Online" && VoucherType == "BP") {
//             const existingChq = await VoucherModal.findOne({ ChequeNumber });
//             if (existingChq) {
//                 return res.status(400).json({
//                     message: `Cheque already used in ${existingChq.VoucherNumber}`
//                 });
//             }
//         }

//         // STEP 1: CREATE voucher FIRST
//         const newVoucher = await VoucherModal.create(req.body);

//         try {
//             await logModal.create({
//                 userId: userId,
//                 action: "create",
//                 Page: "Voucher",
//                 payload: req.body,
//                 responseStatus: 200,
//                 RefNumber: VoucherNumber,
//             });
//         } catch (logErr) {
//             console.log("Voucher log failed:", logErr?.message);
//         }

//         // STEP 2: Knock off invoices AFTER voucher success (never fail the voucher)
//         if (shouldKnockOffOnCreate(VoucherType)) {
//             await knockOffInvoiceLines(VoucharData);
//         }

//         return res.status(201).json({
//             message: "Voucher created successfully",
//             voucher: newVoucher
//         });
//     } catch (error) {
//         console.log(error);
//         return res.status(400).json({
//             message: error.message
//         });
//     }
// };

export const JvUnPost = async (req, res) => {
    try {
        const { id } = req.params;

        const Voucher = await VoucherModal.findById(id);

        if (!Voucher) {
            return res.status(404).json({
                status: false,
                message: "Voucher not found"
            });
        }

        const invoiceEntries = Voucher.VoucharData.filter(item => item.Client);

        for (const value of invoiceEntries) {

            const invoiceRef = value.ClientRef2;
            const amountToApplyNum = parseFloat(value.Credit);

            const customerInvoice = await SalesInvoiceModal.findOne({
                SalesInvoice: invoiceRef
            });

            // Opening Invoice
            if (customerInvoice == null) {

                const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
                if (!AllOpeningInvoice) continue;

                const Inv = AllOpeningInvoice.InvoiceData.find(
                    In => In.Invoice == invoiceRef
                );

                if (!Inv) continue;

                const RecivedAmount = parseFloat(Inv.RecivedAmount || 0);
                const RemainingAmount = parseFloat(Inv.RemaingAmount || 0);

                // Reverse Post
                Inv.RecivedAmount = (RecivedAmount - amountToApplyNum).toString();
                Inv.RemaingAmount = (RemainingAmount + amountToApplyNum).toString();

                await InvoiceOpeningModal.findByIdAndUpdate(
                    AllOpeningInvoice._id,
                    { InvoiceData: AllOpeningInvoice.InvoiceData }
                );

            } else {

                customerInvoice.RecivedAmount =
                    Number(customerInvoice.RecivedAmount || 0) - Number(value.Credit);

                customerInvoice.RemainingAmount =
                    Number(customerInvoice.RemainingAmount || 0) + Number(value.Credit);

                await customerInvoice.save();

                await SalesInvoiceModal.findByIdAndUpdate(
                    customerInvoice._id,
                    customerInvoice
                );
            }
        }

        await VoucherModal.findByIdAndUpdate(id, {
            status: "UnPost"
        });

        res.status(200).send({
            status: true,
            message: "Voucher UnPosted Successfully"
        });

    } catch (err) {
        console.log(err);
        res.status(400).send(err);
    }
};

export const createSystemVoucher = async (req, res) => {
    try {

        const monthCheck = await checkMonthClose(req, res, "VoucherDate");
        if (monthCheck) return;
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, "peral-Dynamic");
        const createdByUser = decoded?.val?.firstname || "unknown";


        const { VoucherType, VoucherDate, VoucharData, status, VoucherNumber, Allow } = req.body


        const voucherNumber = await VoucherModal.find({ VoucherType: VoucherType }).sort({ _id: -1 }).limit(1)
        let nextNumber;

        if (voucherNumber.length === 0) {
            nextNumber = `${VoucherType}000001`
        } else {
            let nextVoucherNumber = (parseInt(voucherNumber[0].VoucherNumber.slice('2', "9"))) + 1
            console.log(nextVoucherNumber)
            nextNumber = `${VoucherType}${nextVoucherNumber.toString().padStart(7, '0')}`;
        }
        console.log(nextNumber)
        const data = {
            VoucherType,
            VoucherDate,
            VoucherNumber: VoucherNumber || nextNumber,
            VoucharData,
            status,
        }

        const newVoucher = await VoucherModal.create(data)



        // console.log(newVoucher)
        res.status(201).json({ message: "Voucher created successfully", voucher: newVoucher });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Error creating voucher", error: error.message });
    }
}

export const getVoucherById = async (req, res) => {
    const { id } = req.params
    try {
        const data = await VoucherModal.findById(id)
        res.status(200).json({ status: true, data: data });
    } catch (err) {
        res.status(500).json({ message: "Error fetching vouchers", error: error.message });

    }
}

export const getVouchers = async (req, res) => {
    try {
        const { VoucherType } = req.query;
        console.log(VoucherType)
        const vouchers = await VoucherModal.find({ VoucherType })
            .sort({ VoucherNumber: -1 }).limit(300)

        console.log(vouchers.length)
        res.status(200).json({ status: true, data: vouchers });
    } catch (error) {
        res.status(500).json({ message: "Error fetching vouchers", error: error.message });
    }
}
export const getVoucherByCode = async (req, res) => {
    try {
        const { VoucherType } = req.params;
        const { Voucherdate } = req.query
        const result = Voucherdate.slice(0, 7).replace("-", "");


        const date = new Date();

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");

        const prefix = Voucherdate ? `${VoucherType}${result}` : `${VoucherType}${year}${month}`;

        const voucher = await VoucherModal.find({
            VoucherType: VoucherType,
            VoucherNumber: { $regex: `^${prefix}` }
        })
            .sort({ VoucherNumber: -1 })
            .limit(1);

        if (!voucher || voucher.length === 0) {
            return res.status(200).send({
                VoucherNumber: `${prefix}0000`
            });
        }

        res.status(200).json(voucher);

    } catch (error) {
        res.status(500).json({
            message: "Error fetching voucher",
            error: error.message
        });
    }
};


export const getLastVoucherByDate = async (req, res) => {
    try {
        const { VoucherType } = req.params;


        const { prefix } = req.body
        const voucher = await VoucherModal.find({
            VoucherType: VoucherType,
            VoucherNumber: { $regex: `^${prefix}` }
        })
            .sort({ VoucherNumber: -1 })
            .limit(1);

        if (!voucher || voucher.length === 0) {
            return res.status(200).send({
                VoucherNumber: `${prefix}0000`
            });
        }

        res.status(200).json(voucher);

    } catch (error) {
        res.status(500).json({
            message: "Error fetching voucher",
            error: error.message
        });
    }
};

export const updateVoucher = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, "peral-Dynamic");
        const updatedByUser = decoded?.val?.firstname || "unknown";
        const userId = req.user?._id || req.user?.id; // Adjust based on your auth setup

        const { id } = req.params;
        const voucherData = req.body;
        const updatedVoucher = await VoucherModal.findByIdAndUpdate(id, voucherData, { new: true });
        if (!updatedVoucher) {
            return res.status(404).json({ message: "Voucher not found" });
        }
        await logModal.create({
            userId: userId,
            action: "update",
            Page: "Voucher",
            payload: req.body,
            responseStatus: 200,
            RefNumber: updatedVoucher.VoucherNumber,
        });
        res.status(200).json({ message: "Voucher updated successfully", voucher: updatedVoucher });
    } catch (error) {
        res.status(500).json({ message: "Error updating voucher", error: error.message });
    }
}
export const deleteVoucher = async (req, res) => {
    try {

        const { id } = req.params;
        const userId = req.user?._id || req.user?.id; // Adjust based on your auth setup

        const deletedVoucher = await VoucherModal.findByIdAndDelete(id);
        // console.log(deletedVoucher)

        await logModal.create({
            userId: userId,
            action: "delete",
            Page: "Voucher",
            payload: deletedVoucher,
            responseStatus: 200,
            RefNumber: deletedVoucher.VoucherNumber
        });
        if (!deletedVoucher) {
            return res.status(404).json({ message: "Voucher not found" });
        }
        res.status(200).json({ message: "Voucher deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting voucher", error: error.message });
    }
}

export const PushVoucherBulkData = async (req, res) => {
    try {
        const insertedIds = [];
        for (const item of req.body) {

            const voucher = await VoucherModal.find({ VoucherType: item.VoucherType }).sort({ _id: -1 }).limit(1)
            // console.log(voucher);
            if (voucher.length > 0) {
                let nextVoucherNumber = (parseInt(voucher[0].VoucherNumber.slice('2', "9"))) + 1;
                item.VoucherNumber = item.VoucherType + nextVoucherNumber.toString().padStart(7, '0');
            }
            else {
                item.VoucherNumber = `${item.VoucherType}0000001`; // Start with 1 if no vouchers exist
            }
            const newVoucher = new VoucherModal({
                VoucherType: item.VoucherType,
                VoucherNumber: item.VoucherNumber,
                VoucherDate: item.VoucherDate,
                VoucherMainAccount: item.VoucherMainAccount,
                VoucharData: item.VoucharData,
            });
            const savedItem = await newVoucher.save();
            insertedIds.push(savedItem._id);
            console.log(`Inserted: ${item.VoucherType}`);
        }
        res.status(200).send({
            status: true,
            data: "Data Added"
        });
        console.log('All vouchers inserted successfully!');
        return insertedIds;
    } catch (error) {
        console.error('Error inserting vouchers:', error.message);
        throw error;
    }
}

export const changeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const Voucher = await VoucherModal.findById(id);
        if (!Voucher) {
            return res.status(404).json({ message: "Voucher not found" });
        }
        else if (Voucher.status === status) {
            return res.status(400).json({ message: "Voucher status is already set to this value" });
        }
        else {
            Voucher.status = status;
            await Voucher.save();
            res.status(200).json({ message: "Voucher status updated successfully", voucher: Voucher });
        }
    } catch (error) {

        res.status(500).json({ message: "Error updating voucher status", error: error.message });
    }
}


export const getVoucherByNumber = async (req, res) => {
    const { VoucherNumber } = req.params
    try {

        const data = await VoucherModal.findOne({ VoucherNumber: VoucherNumber })

        const isValidObjectId = (id) =>
            typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

        const toId = (val) => {
            if (!val) return null;
            if (typeof val === "object") return val._id ? String(val._id) : null;
            return String(val);
        };

        const ClientIds = (data?.VoucharData || [])
            .map((item) => toId(item?.Client))
            .filter(isValidObjectId)
            .map((id) => new mongoose.Types.ObjectId(id));
        const totalClient = ClientIds.length
            ? await CutomerModal.find({ _id: { $in: ClientIds } })
            : [];

        const AccountsIds = (data?.VoucharData || [])
            .map((item) => toId(item?.Account))
            .filter(isValidObjectId)
            .map((id) => new mongoose.Types.ObjectId(id));
        const totalAccounts = AccountsIds.length
            ? await ChartofAccountsModel.find({ _id: { $in: AccountsIds } })
            : [];

        const TransporterIds = (data?.VoucharData || [])
            .map((item) => toId(item?.Transporter))
            .filter(isValidObjectId)
            .map((id) => new mongoose.Types.ObjectId(id));
        const totalTransporters = TransporterIds.length
            ? await TransporterModal.find({ _id: { $in: TransporterIds } }).select("TransporterName OldCode")
            : [];

        res.status(200).send({
            status: true,
            data: data,
            Client: totalClient,
            Accounts: totalAccounts,
            Transporters: totalTransporters,
        })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: "Error voucher", error: err.message });

    }
}

export const getOnlyVoucherByNumber = async (req, res) => {
    const { VoucherNumber } = req.params
    try {
        if (VoucherNumber.length == 0) {
            const vouchers = await VoucherModal.find({ VoucherType })
                .sort({ VoucherNumber: -1 }).limit(300)

            res.status(200).send({ status: true, data: vouchers })
        }
        const data = await VoucherModal.findOne({ VoucherNumber: VoucherNumber })
        res.status(200).send({ status: true, data: data })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: "Error voucher", error: err.message });

    }
}





export const deleteVoucherByNumber = async (req, res) => {
    try {
        const { VoucherNumber } = req.params;
        const deletedVoucher = await VoucherModal.deleteOne({ VoucherNumber: VoucherNumber });
        if (!deletedVoucher) {
            return res.status(404).json({ message: "Voucher not found" });
        }
        res.status(200).json({ message: "Voucher deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting voucher", error: error.message });
    }
}

export const PostUnPostVoucher = async (req, res) => {
    try {
        const { VoucharData, status, Type, VoucherType, VoucherDate, PaidTo } = req.body;
        const { id } = req.params
        // console.log(req.body)


        const OnlyClient = VoucharData.filter((item) => item.hasOwnProperty("Client"))
        const onlyCHq = OnlyClient.map((item) => ({
            id: item.value,
            Chq: item.Chq,
            ChqRef: item.ChqRef,
            VoucherDate: VoucherDate,
            rowid: item.id,
            ref: item.Ref || item.ClientRef2,
            Credit: item.Credit,
        }))
        console.log(onlyCHq)

        if (status !== "Post") {
            if (Type !== "Online") {
                for (const item of onlyCHq) {

                    // --- Update Invoice ---
                    if (item.ChqRef !== undefined) {

                        for (const value of item.ChqRef) {
                            if (Type != "Online") {

                                const customerChq = await CustomerChqRecivedModal.findById(value.value);
                                if (!customerChq) {
                                    return res.status(404).json({ message: "Record not found" });
                                }

                                // --- Update table ---
                                const findTable = customerChq.table.filter((ta) => ta.chq == value.Chq);
                                if (findTable) {
                                    for (const tabe of findTable) {

                                        tabe.staus = "Realize";   // use staus (same as DB field)
                                        tabe.status = "Realize";   // use staus (same as DB field)
                                        tabe.RealizationDate = item.VoucharDate
                                    }
                                }

                                // --- Update grouped -> items ---
                                const findGroup = customerChq.grouped.filter((g) =>
                                    g.chq == item.Chq
                                );

                                if (findGroup) {

                                    for (const gr of findGroup) {
                                        const groupitem = gr.items.filter(gi => gi.chq === item.Chq);
                                        if (groupitem) {
                                            for (const group of groupitem) {


                                                group.staus = "Realize";   // use staus (same as DB field)
                                                group.status = "Realize";   // use staus (same as DB field)
                                                group.RealizationDate = item.VoucharDate
                                            }
                                        }

                                    }


                                }
                                await CustomerChqRecivedModal.findByIdAndUpdate(customerChq._id, customerChq);
                                await CustomerChqRecivedModal.findByIdAndUpdate(customerChq._id, { status: "Pending" });
                                await customerChq.save();

                            }

                            const customerInvoice = await SalesInvoiceModal.findOne({ SalesInvoice: value.ref })
                            console.log(value.ref)
                            if (value.ref == "UnRealized") {
                                continue;
                            }
                            if (customerInvoice == null) {
                                const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
                                const Inv = AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == value.ref);
                                console.log(Inv)
                                const amountToApplyNum = Number(value.Am || 0);
                                const RecivedAmount = Number(Inv.RecivedAmount || 0);
                                Inv.RecivedAmount = ((RecivedAmount || 0) + amountToApplyNum).toString();
                                await InvoiceOpeningModal.findByIdAndUpdate(AllOpeningInvoice._id, { InvoiceData: AllOpeningInvoice.InvoiceData })
                            }
                            else {

                                if (!customerInvoice) {
                                    return res.status(404).json({ message: `Invoice not found for ref: ${item.ref}` });
                                }

                                customerInvoice.RecivedAmount =
                                    (Number(customerInvoice.RecivedAmount || 0) + Number(value.Am));

                                await customerInvoice.save();

                                await SalesInvoiceModal.findByIdAndUpdate(customerInvoice._id, customerInvoice);
                            }

                        }
                    }
                    else {
                        const updatedVoucher = await VoucherModal.findByIdAndUpdate(id, { status: "Post" })
                        res.status(200).send("voucher post successfully")
                    }


                }
            }
            else {
                for (const item of onlyCHq) {
                    console.log("ye hai")
                    // --- Update Invoice ---
                    if (item.Type == "Opening") {
                        console.log("Opening")
                        const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
                        const Inv = AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == item.ref);
                        const remainingAmountNum = Number(Inv.RemaingAmount);
                        const amountToApplyNum = Number(item.Credit);
                        const RecivedAmount = Number(Inv.RecivedAmount);
                        Inv.RemaingAmount = Number(remainingAmountNum - amountToApplyNum);
                        Inv.RecivedAmount = Number(RecivedAmount + amountToApplyNum);
                        console.log(AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == item.ref))
                        await InvoiceOpeningModal.findByIdAndUpdate(AllOpeningInvoice._id, { InvoiceData: AllOpeningInvoice.InvoiceData })

                    }
                    else {
                        const customerInvoice = await SalesInvoiceModal.findOne({ SalesInvoice: item.ref });
                        if (!customerInvoice) {
                            return res.status(404).json({ message: `Invoice not found for ref: ${item.ref}` });
                        }


                        customerInvoice.RecivedAmount =
                            (Number(customerInvoice.RecivedAmount || 0) + Number(item.Credit));
                        customerInvoice.RemainingAmount =
                            (Number(customerInvoice.RemainingAmount || 0) - Number(item.Credit))
                        await customerInvoice.save();

                        // update status field at root if you want
                        await SalesInvoiceModal.findByIdAndUpdate(customerInvoice._id, customerInvoice);
                    }


                }

                const updatedVoucher = await VoucherModal.findByIdAndUpdate(id, { status: "Post" })
                res.status(200).send("voucher post successfully")

            }


            const updatedVoucher = await VoucherModal.findByIdAndUpdate(id, { status: "Post" })
            res.status(200).send("voucher post successfully")

        }

        else {



            for (const item of onlyCHq) {
                // --- Update Invoice ---
                for (const value of item.ChqRef) {
                    if (Type != "Online") {


                        const customerChq = await CustomerChqRecivedModal.findById(value.value);
                        if (!customerChq) {
                            return res.status(404).json({ message: "Record not found" });
                        }

                        // --- Update table ---
                        const findTable = customerChq.table.filter((ta) => ta.chq == value.Chq);
                        if (findTable) {
                            for (const item of findTable) {




                                item.staus = "Pending";   // use staus (same as DB field)
                                item.status = "Pending";   // use staus (same as DB field)
                                item.RealizationDate = ""
                            }
                        }

                        // --- Update grouped -> items ---
                        const findGroup = customerChq.grouped.filter((g) =>
                            g.chq == item.Chq
                        );

                        if (findGroup) {

                            for (const gr of findGroup) {
                                const groupitem = gr.items.filter(gi => gi.chq === item.Chq);
                                if (groupitem) {
                                    for (const group of groupitem) {


                                        group.staus = "Pending";   // use staus (same as DB field)
                                        group.status = "Pending";   // use staus (same as DB field)
                                        group.RealizationDate = ""
                                    }
                                }

                            }


                        }
                        await CustomerChqRecivedModal.findByIdAndUpdate(customerChq._id, customerChq);
                        await CustomerChqRecivedModal.findByIdAndUpdate(customerChq._id, { status: "Pending" });
                        await customerChq.save();

                    }
                    const customerInvoice = await SalesInvoiceModal.findOne({ SalesInvoice: value.ref })
                    if (!customerInvoice) {
                        const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
                        const Inv = AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == item.ref);
                        const remainingAmountNum = parseFloat(Inv.RemaingAmount);
                        const amountToApplyNum = parseFloat(item.Credit);
                        const RecivedAmount = parseFloat(Inv.RecivedAmount);
                        Inv.RecivedAmount = (RecivedAmount + amountToApplyNum).toString();
                        await InvoiceOpeningModal.findByIdAndUpdate(AllOpeningInvoice._id, { InvoiceData: AllOpeningInvoice.InvoiceData })
                    }
                    else {
                        if (!customerInvoice) {
                            return res.status(404).json({ message: `Invoice not found for ref: ${item.ref}` });
                        }

                        customerInvoice.RecivedAmount =
                            (Number(customerInvoice.RecivedAmount || 0) - Number(value.Am));

                        await customerInvoice.save();

                        await SalesInvoiceModal.findByIdAndUpdate(customerInvoice._id, customerInvoice);
                    }

                }



            }
            const updatedVoucher = await VoucherModal.findByIdAndUpdate(id, { status: "UnPost" })
            res.status(200).send("voucher post successfully")

        }


    } catch (err) {
        console.log(err)
        res.status(400).json({
            message: err
        })

    }
}


export const PostUnPostCashReciptVoucher = async (req, res) => {
    try {
        const { VoucharData, status } = req.body
        const { id } = req.params

        console.log(req.body)
        const OnlyClient = VoucharData.filter((item) => item.hasOwnProperty("Client"))
        const onlyCHq = OnlyClient.map((item) => ({
            rowid: item.id,
            ref: item.Ref || item.ClientRef2,
            Credit: item.Credit,
            Type: item.Type
        }))
        console.log(onlyCHq)
        if (status !== "Post") {
            console.log(onlyCHq, "onlyCHq")
            for (const item of onlyCHq) {
                // --- Update Invoice ---
                if (item.Type == "Opening") {
                    console.log("Opening")
                    const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
                    const Inv = AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == item.ref);
                    const remainingAmountNum = Number(Inv.RemaingAmount);
                    const amountToApplyNum = Number(item.Credit);
                    const RecivedAmount = Number(Inv.RecivedAmount);
                    Inv.RemaingAmount = Number(remainingAmountNum - amountToApplyNum);
                    Inv.RecivedAmount = Number(RecivedAmount + amountToApplyNum);
                    console.log(AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == item.ref))
                    await InvoiceOpeningModal.findByIdAndUpdate(AllOpeningInvoice._id, { InvoiceData: AllOpeningInvoice.InvoiceData })

                }
                else {
                    const customerInvoice = await SalesInvoiceModal.findOne({ SalesInvoice: item.ref });
                    if (!customerInvoice) {
                        return res.status(404).json({ message: `Invoice not found for ref: ${item.ref}` });
                    }


                    customerInvoice.RecivedAmount =
                        (Number(customerInvoice.RecivedAmount || 0) + Number(item.Credit));
                    customerInvoice.RemainingAmount =
                        (Number(customerInvoice.RemainingAmount || 0) - Number(item.Credit))
                    await customerInvoice.save();

                    // update status field at root if you want
                    await SalesInvoiceModal.findByIdAndUpdate(customerInvoice._id, customerInvoice);
                }


            }
            const updatedVoucher = await VoucherModal.findByIdAndUpdate(id, { status: "Post" })
            const findVoucher = await VoucherModal.findById(id)
            res.status(200).send(findVoucher)
        }
        else {
            for (const item of onlyCHq) {
                // --- Update Invoice ---
                if (item.Type == "Opening") {
                    console.log("Opening")
                    const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
                    const Inv = AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == item.ref);
                    console.log(item.ref)
                    const remainingAmountNum = Inv.RemaingAmount;
                    const amountToApplyNum = item.Credit;
                    const RecivedAmount = parseFloat(Inv.RecivedAmount);
                    Inv.RemaingAmount = Number(remainingAmountNum) + Number(amountToApplyNum);
                    Inv.RecivedAmount = Number(RecivedAmount) - Number(amountToApplyNum);
                    await InvoiceOpeningModal.findByIdAndUpdate(AllOpeningInvoice._id, { InvoiceData: AllOpeningInvoice.InvoiceData })

                }
                else {
                    const customerInvoice = await SalesInvoiceModal.findOne({ SalesInvoice: item.ref });
                    if (!customerInvoice) {
                        return res.status(404).json({ message: `Invoice not found for ref: ${item.ref}` });
                    }


                    customerInvoice.RecivedAmount =
                        (Number(customerInvoice.RecivedAmount || 0) - Number(item.Credit));
                    customerInvoice.RemainingAmount =
                        (Number(customerInvoice.RemainingAmount || 0) + Number(item.Credit))
                    await customerInvoice.save();

                    // update status field at root if you want
                    await SalesInvoiceModal.findByIdAndUpdate(customerInvoice._id, customerInvoice);
                }


            }
            const updatedVoucher = await VoucherModal.findByIdAndUpdate(id, { status: "UnPost" })
            console.log(updatedVoucher)
            res.status(200).send("voucher post successfully")
        }
    } catch (err) {
        console.log(err)
        res.status(400).send("err")

    }
}


export const createRealizeVoucher = async (req, res) => {
    try {
        // ----------------------------
        // 1. AUTH CHECK
        // ----------------------------

        const monthCheck = await checkMonthClose(req, res, "VoucherDate");
        if (monthCheck) return;
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided",
            });
        }

        const decoded = jwt.verify(token, "peral-Dynamic");
        const createdByUser = decoded?.val?.firstname || "unknown";

        const { VoucharData = [], VoucherDate, VoucherMainAccount, Shortage, ShortageAccount } = req.body;

        // Validate required data
        if (!VoucharData.length) {
            return res.status(400).json({
                success: false,
                message: "VoucharData is required and cannot be empty",
            });
        }

        if (!VoucherDate) {
            return res.status(400).json({
                success: false,
                message: "VoucherDate is required",
            });
        }

        if (!VoucherMainAccount) {
            return res.status(400).json({
                success: false,
                message: "VoucherMainAccount is required",
            });
        }

        // ----------------------------
        // 2. FILTER CLIENT ITEMS
        // ----------------------------
        const OnlyClient = VoucharData.filter((item) =>
            item.hasOwnProperty("Client")
        );

        if (!OnlyClient.length) {
            1
            return res.status(400).json({
                success: false,
                message: "No client items found in VoucharData",
            });
        }

        const onlyCHq = await Promise.all(
            OnlyClient.map(async (item) => {
                const invoice = await SalesInvoiceModal.findOne({
                    SalesFlowRef: item.ClientRef2,
                });

                const client = await CutomerModal.findOne({
                    SalesFlowRef: item.Client,
                });

                const ref = item.Ref || invoice?.SalesInvoice;

                return {
                    rowid: item.id,
                    ClientRef2: invoice?.SalesInvoice || item.ClientRef2,
                    Store: invoice?.Store,
                    ref: ref,
                    Client: client?._id?.toString(),
                    Credit: Number(item.Credit) || 0,
                    Shortage: Number(item.Shortage) || 0,
                    Type: item.Type,
                    Narration: invoice?.SalesInvoice
                        ? `Cash received against invoice ${invoice?.SalesInvoice} from ${client?.CutomerName || "Unknown Client"
                        }`
                        : item.Narration || "",
                };
            })
        );

        // ----------------------------
        // 3. VALIDATION
        // ----------------------------
        const errors = [];

        for (const item of onlyCHq) {
            let customerInvoice;
            let openingDoc;

            if (item.Type === "Current") {
                customerInvoice = await SalesInvoiceModal.findOne({
                    SalesInvoice: item.ref,
                });
            } else if (item.Type === "Opening") {
                openingDoc = await InvoiceOpeningModal.findOne({
                    "InvoiceData.Invoice": item.ref,
                });

                customerInvoice = openingDoc?.InvoiceData?.find(
                    (inv) => inv.Invoice === item.ref
                );
            }

            if (!customerInvoice) {
                errors.push(
                    `Invoice not found for ref: ${item.ref} (${item.Type})`
                );
                continue;
            }

            const remaining =
                Number(
                    customerInvoice.RemaingAmount ||
                    customerInvoice.RemainingAmount
                ) || 0;

            const credit = Number(item.Credit) || 0;

            if (credit <= 0) {
                errors.push(
                    `Credit amount must be greater than 0 for invoice ${item.ref}`
                );
            }

            if (credit > remaining) {
                errors.push(
                    `Credit amount (${credit}) exceeds remaining balance (${remaining}) for invoice ${item.ref}`
                );
            }

            if (remaining <= 0) {
                errors.push(
                    `Invoice ${item.ref} is already fully paid.`
                );
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed before posting voucher.",
                errors,
            });
        }

        // ----------------------------
        // 4. VOUCHER NUMBER GENERATION (FIXED)
        // ----------------------------
        const date = new Date(VoucherDate);

        // Validate date
        if (isNaN(date.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid VoucherDate format",
            });
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const prefix = `CR${year}${month}`;

        // Get the highest voucher number for this prefix
        const existingVouchers = [await VoucherModal.findOne({
            VoucherType: "CR",
            VoucherNumber: { $regex: `^${prefix}` }
        }).sort({ VoucherNumber: -1 })];

        let serial = 1;
        console.log(existingVouchers, "existingVouchers")
        if (existingVouchers[0] == null) {
            const lastVoucherNumber = `${prefix}0000`;
            console.log(lastVoucherNumber, "lastVoucherNumber")
            // Extract serial number from the last voucher
            const serialMatch = lastVoucherNumber.match(new RegExp(`^${prefix}(\\d+)$`));

            if (serialMatch && serialMatch[1]) {
                const lastSerial = parseInt(serialMatch[1], 10);
                console.log("Last Serial:", lastSerial);
                if (!isNaN(lastSerial)) {
                    serial = lastSerial + 1;
                }
            }
        }
        else if (existingVouchers.length > 0 && existingVouchers[0] !== null) {
            const lastVoucherNumber = existingVouchers[0].VoucherNumber;
            console.log(lastVoucherNumber, "lastVoucherNumber")
            // Extract serial number from the last voucher
            const serialMatch = lastVoucherNumber.match(new RegExp(`^${prefix}(\\d+)$`));

            if (serialMatch && serialMatch[1]) {
                const lastSerial = parseInt(serialMatch[1], 10);
                console.log("Last Serial:", lastSerial);
                if (!isNaN(lastSerial)) {
                    serial = lastSerial + 1;
                }
            }
        }
        else {
            const lastVoucherNumber = `${prefix}0000`;
            console.log(lastVoucherNumber, "lastVoucherNumber")
            // Extract serial number from the last voucher
            const serialMatch = lastVoucherNumber.match(new RegExp(`^${prefix}(\\d+)$`));

            if (serialMatch && serialMatch[1]) {
                const lastSerial = parseInt(serialMatch[1], 10);
                console.log("Last Serial:", lastSerial);
                if (!isNaN(lastSerial)) {
                    serial = lastSerial + 1;
                }
            }
        }

        // Ensure serial doesn't exceed 9999
        if (serial > 9999) {
            return res.status(400).json({
                success: false,
                message: `Voucher number limit reached for ${prefix}. Maximum 9999 vouchers per month.`,
            });
        }

        const VoucherNumber = `${prefix}${String(serial).padStart(4, "0")}`;

        // ----------------------------
        // 5. ADD TOTAL ENTRY
        // ----------------------------
        const totalDebit = onlyCHq.reduce(
            (a, b) => a + (b.Credit || 0),
            0
        );

        if (totalDebit <= 0) {
            return res.status(400).json({
                success: false,
                message: "Total credit amount must be greater than 0",
            });
        }

        onlyCHq.push({
            Debit: totalDebit - Shortage,
            Account: VoucherMainAccount,
            store: onlyCHq[0]?.Store || null,
            show: true,
            id: Date.now(),
            Narration: "Petty Cash Account",
        });

        onlyCHq.push({
            Debit: Shortage,
            Account: ShortageAccount,
            store: onlyCHq[0]?.Store || null,
            show: true,
            id: Date.now(),
            Narration: "Shortage Account",
        });

        // ----------------------------
        // 6. SAVE VOUCHER
        // ----------------------------
        const Voucher = {
            ...req.body,
            VoucharData: onlyCHq,
            VoucherNumber,
            createdByUser,
            status: "Pending", // Initial status
            createdAt: new Date(),
        };

        const newVoucher = new VoucherModal(Voucher);
        await newVoucher.save();

        // ----------------------------
        // 7. UPDATE INVOICES
        // ----------------------------
        const updateResults = [];

        for (const item of onlyCHq) {
            // Skip the total entry (it doesn't have Type)
            if (!item.Type) continue;

            const credit = Number(item.Credit) || 0;
            const shortage = Number(item.Shortage) || 0;
            // CURRENT TYPE INVOICE
            if (item.Type === "Current") {
                const customerInvoice = await SalesInvoiceModal.findOne({
                    SalesInvoice: item.ref,
                });

                if (!customerInvoice) {
                    updateResults.push({
                        ref: item.ref,
                        status: "failed",
                        message: "Invoice not found",
                    });
                    continue;
                }

                const remaining = Number(customerInvoice.RemainingAmount) || 0;
                const received = Number(customerInvoice.RecivedAmount) || 0;
                const shortage = Number(customerInvoice.Shortage) || 0;
                const itemShortage = Number(item.Shortage) || 0;

                const newRemaining = remaining - credit;
                const newReceived = received + credit;
                const newShortage = shortage + itemShortage;
                console.log(newRemaining, newReceived, newShortage);

                if (!Array.isArray(customerInvoice.PaymentDetail)) {
                    customerInvoice.PaymentDetail = [];
                }

                customerInvoice.PaymentDetail.push({
                    type: "Cash",
                    Amount: credit,
                    voucherNumber: VoucherNumber,
                    date: new Date(),
                    createdBy: createdByUser,
                });

                await SalesInvoiceModal.findByIdAndUpdate(
                    customerInvoice._id,
                    {
                        RemainingAmount: newRemaining,
                        RecivedAmount: newReceived,
                        Shortage: newShortage,
                        PaymentDetail: customerInvoice.PaymentDetail,
                    },
                    { new: true, runValidators: true }
                );

                updateResults.push({
                    ref: item.ref,
                    type: "Current",
                    status: "success",
                    newRemaining,
                    newReceived,
                });
            }

            // OPENING TYPE INVOICE
            //   if (item.Type === "Opening") {
            //     const openingDoc = await InvoiceOpeningModal.findOne({
            //       "InvoiceData.Invoice": item.ref,
            //     });

            //     if (!openingDoc) {
            //       updateResults.push({
            //         ref: item.ref,
            //         status: "failed",
            //         message: "Opening document not found",
            //       });
            //       continue;
            //     }

            //     const index = openingDoc.InvoiceData.findIndex(
            //       (inv) => inv.Invoice === item.ref
            //     );

            //     if (index === -1) {
            //       updateResults.push({
            //         ref: item.ref,
            //         status: "failed",
            //         message: "Invoice not found in opening document",
            //       });
            //       continue;
            //     }

            //     const current = openingDoc.InvoiceData[index];

            //     const remaining = Number(current.RemaingAmount) || 0;
            //     const received = Number(current.RecivedAmount) || 0;
            //     const itemShortage = Number(item.Shortage) || 0;

            //     const newRemaining = remaining - credit - itemShortage;
            //     const newReceived = received + credit;

            //     openingDoc.InvoiceData[index].RemaingAmount = newRemaining;
            //     openingDoc.InvoiceData[index].RecivedAmount = newReceived;

            //     if (!Array.isArray(openingDoc.InvoiceData[index].PaymentDetail)) {
            //       openingDoc.InvoiceData[index].PaymentDetail = [];
            //     }

            //     openingDoc.InvoiceData[index].PaymentDetail.push({
            //       type: "Cash",
            //       Amount: credit,
            //       voucherNumber: VoucherNumber,
            //       date: new Date(),
            //       createdBy: createdByUser,
            //     });

            //     await openingDoc.save();

            //     updateResults.push({
            //       ref: item.ref,
            //       type: "Opening",
            //       status: "success",
            //       newRemaining,
            //       newReceived,
            //     });
            //   }
        }

        // ----------------------------
        // 8. FINAL UPDATE - MARK AS POSTED
        // ----------------------------
        // const updatedVoucher = await VoucherModal.findByIdAndUpdate(
        //   newVoucher._id,
        //   { 
        //     status: "Post",
        //     updatedAt: new Date(),
        //     postedBy: createdByUser,
        //     postedAt: new Date(),
        //   },
        //   { new: true, runValidators: true }
        // );

        // ----------------------------
        // 9. RETURN SUCCESS RESPONSE
        // ----------------------------
        return res.status(200).json({
            success: true,
            message: "Voucher successfully created and posted.",
            data: {
                // voucher: updatedVoucher,
                voucherNumber: VoucherNumber,
                totalAmount: totalDebit,
                invoiceUpdates: updateResults,
                createdBy: createdByUser,
            },
        });

    } catch (err) {
        console.error("Error in createRealizeVoucher:", err);

        // Handle specific JWT errors
        if (err.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token",
                error: err.message,
            });
        }

        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired",
                error: err.message,
            });
        }

        // Handle duplicate key errors (voucher number already exists)
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Voucher number already exists. Please try again.",
                error: err.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message,
        });
    }
};



export const createPreviouseVoucher = async (req, res) => {
    try {

        const { VoucharData, VoucherMainAccount } = req.body;

        const monthCheck = await checkMonthClose(req, res, "VoucherDate");
        if (monthCheck) return;
        // ===============================
        // STEP 1 — PREPARE CLIENT ENTRIES
        // ===============================

        const OnlyClient = VoucharData.filter(v => v.Client);

        const preparedRows = await Promise.all(
            OnlyClient.map(async (item) => {

                // try sales invoice first
                const invoice = await SalesInvoiceModal.findOne({
                    SalesFlowRef: item.ClientRef2
                });

                const client = await CutomerModal.findOne({
                    SalesFlowRef: item.Client
                });

                const ref = invoice?.SalesInvoice || item.ClientRef2;

                return {
                    rowid: item.id,
                    Client: client?._id,
                    ClientRef2: ref,
                    ref: ref,
                    Store: invoice?.Store || null,
                    Credit: Number(item.Credit) || 0,
                    Type: item.Type, // Current / Opening
                    Narration: invoice
                        ? `Cash received against invoice ${ref} from ${client?.CutomerName || "Unknown Client"}`
                        : item.Narration || ""
                };
            })
        );

        // ===============================
        // STEP 2 — VALIDATION (IMPORTANT)
        // ===============================

        const errors = [];

        for (const item of preparedRows) {

            // ---- CURRENT INVOICE ----


            const invoice = await SalesInvoiceModal.findOne({
                SalesInvoice: item.ref
            });

            if (!invoice) {
                const opening = await InvoiceOpeningModal.findOne();
                const inv = opening?.InvoiceData.find(i => i.Invoice == item.ref);
                console.log(opening, "opening")
                if (!inv) {
                    errors.push(`Opening invoice not found: ${item.ref}`);
                    continue;
                }

                if (Number(inv.RemaingAmount) < Number(item.Credit)) {
                    errors.push(`Insufficient opening balance in invoice ${item.ref}`);
                }
            }

            if (invoice) {
                if (Number(invoice?.RemainingAmount || 0) < Number(item.Credit)) {
                    console.log(invoice)

                    errors.push(`Insufficient remaining balance in invoice ${item.ref}`);
                }
            }

        }    // ---- OPENING INVOICE ----




        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        // ===============================
        // STEP 3 — GENERATE VOUCHER NUMBER
        // ===============================

        const lastVoucher = await VoucherModal.find({ VoucherType: "CR" })
            .sort({ _id: -1 })
            .limit(1);

        let VoucherNumber;

        if (!lastVoucher.length) {
            VoucherNumber = "CR0000001";
        } else {
            const next = parseInt(lastVoucher[0].VoucherNumber.slice(2)) + 1;
            VoucherNumber = `CR${next.toString().padStart(7, "0")}`;
        }

        // ===============================
        // STEP 4 — ADD CASH/BANK ROW
        // ===============================

        const totalCredit = preparedRows.reduce((a, b) => a + b.Credit, 0);

        preparedRows.push({
            Debit: totalCredit,
            Account: VoucherMainAccount,
            store: preparedRows[0]?.Store || null,
            show: true,
            id: Date.now(),
            Narration: "Branch Cash Account"
        });

        // ===============================
        // STEP 5 — SAVE VOUCHER FIRST
        // ===============================

        const Voucher = new VoucherModal({
            ...req.body,
            VoucherNumber,
            VoucharData: preparedRows,
            status: "UnPost"
        });

        await Voucher.save();

        // ===============================
        // STEP 6 — POSTING (VERY IMPORTANT)
        // ===============================

        for (const item of preparedRows) {

            if (!item.Client) continue;

            // ---------- CURRENT SALES INVOICE ----------


            const invoice = await SalesInvoiceModal.findOne({
                SalesInvoice: item.ref
            });
            if (!invoice) {
                const opening = await InvoiceOpeningModal.findOne();
                const inv = opening.InvoiceData.find(i => i.Invoice === item.ref);

                inv.RecivedAmount =
                    Number(inv.RecivedAmount || 0) + Number(item.Credit);

                inv.RemaingAmount =
                    Number(inv.RemaingAmount || 0) - Number(item.Credit);

                await InvoiceOpeningModal.findByIdAndUpdate(opening._id, {
                    InvoiceData: opening.InvoiceData
                })
            }


            else {

                invoice.RecivedAmount =
                    Number(invoice.RecivedAmount || 0) + Number(item.Credit);

                invoice.RemainingAmount =
                    Number(invoice.RemainingAmount || 0) - Number(item.Credit);


                await invoice.save();
            }
        }

        // ---------- OPENING INVOICE ----------




        // ===============================
        // STEP 7 — FINAL POST STATUS
        // ===============================

        Voucher.status = "Post";
        await Voucher.save();

        // ===============================
        // RESPONSE
        // ===============================

        res.status(200).json({
            success: true,
            message: "Previous voucher created & posted successfully",
            voucher: Voucher
        });

    } catch (err) {

        console.error("PREVIOUS VOUCHER ERROR:", err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


export const getOnlyCredit = async (req, res) => {
    try {
        const { distributor } = req.params;
        const data = await getKnockoffPoolVouchers(distributor, { flatten: true });
        res.status(200).json(data);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
};


export const getAllCredit = async (req, res) => {
    try {
        const data = await getKnockoffPoolVouchers("", { distributorsOnly: true });
        res.status(200).json(data);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
};



export const AdjustVoucher = async (req, res) => {
    try {
        const table = req.body[0]; // ✅ FIX 1
        console.log(table)
        // 1️⃣ Find voucher
        const voucher = await VoucherModal.findOne({
            VoucherNumber: table.Recipt.value
        });

        if (!voucher) {
            return res.status(404).json({ message: "Voucher not found" });
        }

        // 2️⃣ Adjust voucher entry
        voucher.VoucharData = voucher.VoucharData.map(item => {
            if (item.id === table.EntryId) { // ✅ FIX 2
                return {
                    ...item,
                    ClientRef2: `${item.ClientRef2} , ${table?.Invoice?.value}`,
                    Remain:
                        Number(item.Remain || 0) +
                        Number(table.invoiceAmount || 0)
                };

            }
            return item;
        });

        // 3️⃣ Opening invoice check
        const AllOpeningInvoice = await InvoiceOpeningModal.findOne();

        const Inv = AllOpeningInvoice?.InvoiceData.find(
            inv => inv.Invoice === table?.Invoice?.value
        );

        if (Inv) {
            Inv.RecivedAmount = (
                Number(Inv.RecivedAmount || 0) +
                Number(table.invoiceAmount)
            ).toFixed(2);

            Inv.RemaingAmount = (
                Number(Inv.RemaingAmount || 0) -
                Number(table.invoiceAmount)
            ).toFixed(2);

            await InvoiceOpeningModal.findByIdAndUpdate(
                AllOpeningInvoice._id,
                { InvoiceData: AllOpeningInvoice.InvoiceData }
            );

            // 5️⃣ Save voucher
            await voucher.save();

            return res.status(200).json({
                message: "Voucher adjusted successfully",
                voucher
            });
        }

        // 4️⃣ Try Distributor invoice update
        const distInvoice = await DistrbutorInvoiceModal.findOne({
            DitributorInvoiceCode: table.Invoice.value
        });

        if (distInvoice) {
            await DistrbutorInvoiceModal.findOneAndUpdate(
                { DitributorInvoiceCode: table.Invoice.value },
                {
                    Remaining: (
                        Number(distInvoice.Remaining) -
                        Number(table.invoiceAmount)
                    ).toString(),
                    RecivedAmount: (
                        Number(distInvoice.RecivedAmount || 0) +
                        Number(table.invoiceAmount)
                    ).toString()
                }
            );

            // 5️⃣ Save voucher
            await voucher.save();

            return res.status(200).json({
                message: "Voucher adjusted successfully",
                voucher
            });
        }

        // 5️⃣ Try Sales Invoice update (Customers)
        const salesInvoice = await SalesInvoiceModal.findOne({
            SalesInvoice: table.Invoice.value
        });

        if (salesInvoice) {
            await SalesInvoiceModal.findByIdAndUpdate(
                salesInvoice._id,
                {
                    RemainingAmount: (
                        Number(salesInvoice.RemainingAmount) -
                        Number(table.invoiceAmount)
                    ),
                    RecivedAmount: (
                        Number(salesInvoice.RecivedAmount || 0) +
                        Number(table.invoiceAmount)
                    )
                }
            );

            // 5️⃣ Save voucher
            await voucher.save();

            return res.status(200).json({
                message: "Voucher adjusted successfully",
                voucher
            });
        }

        return res.status(404).json({ message: "Invoice not found" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

export const GetVoucherRealizePreview = async (req, res) => {
    try {
        const { VoucherNumber } = req.params;
        const data = await previewVoucherRealize(VoucherNumber);
        if (!data) {
            return res.status(404).json({ status: false, message: "Voucher not found" });
        }
        return res.status(200).json({ status: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: err.message });
    }
};

export const RealizeVoucherLine = async (req, res) => {
    try {
        const { voucherNumber, lineId } = req.body || {};
        const data = await realizeVoucherAgainstInvoices(voucherNumber, lineId);
        const applied = (data?.realized || []).reduce((sum, row) => sum + Number(row.applied || 0), 0);
        if (applied <= 0) {
            return res.status(400).json({
                status: false,
                message: "Invoice realize nahi ho saka. Invoice remaining 0 hai ya voucher ke against invoice nahi mila.",
                data
            });
        }
        return res.status(200).json({
            status: true,
            message: "Invoice realized successfully",
            data
        });
    } catch (err) {
        console.error(err);
        return res.status(err.statusCode || 500).json({ status: false, message: err.message });
    }
};

export const GetClientLedgerBalance = async (req, res) => {
    try {
        const clientId = req.params.clientId || req.query.clientId;
        if (!String(clientId || "").trim()) {
            return res.status(400).json({ status: false, message: "Client is required" });
        }
        const ledger = await loadClientLedger(clientId);
        return res.status(200).json({ status: true, data: { ledger } });
    } catch (err) {
        console.error("GetClientLedgerBalance error:", err);
        return res.status(err.statusCode || 500).json({ status: false, message: err.message });
    }
};

export const GetStrictKnockOffPreview = async (req, res) => {
    try {
        const clientId = req.params.clientId || req.query.clientId;
        const data = await previewStrictDistributorKnockOff(clientId);
        return res.status(200).json({ status: true, data });
    } catch (err) {
        console.error("GetStrictKnockOffPreview error:", err);
        return res.status(err.statusCode || 500).json({ status: false, message: err.message });
    }
};

export const ApplyStrictKnockOff = async (req, res) => {
    try {
        const clientId = req.body?.clientId || req.params.clientId;
        const data = await applyStrictDistributorKnockOff(clientId);
        const count = data?.summary?.invoices || 0;
        return res.status(200).json({
            status: true,
            message: count
                ? `${count} distributor invoice(s) strictly knocked off`
                : "No distributor invoice payments to strictly knock off",
            data
        });
    } catch (err) {
        console.error("ApplyStrictKnockOff error:", err);
        return res.status(err.statusCode || 500).json({ status: false, message: err.message });
    }
};


const knockOffField = (row, names) => {
    const map = {};
    Object.keys(row || {}).forEach((key) => {
        map[String(key).toLowerCase().replace(/[\s_]/g, "")] = row[key];
    });
    for (const name of names) {
        const value = map[String(name).toLowerCase().replace(/[\s_]/g, "")];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
        }
    }
    return "";
};

const knockOffAmount = (value) => {
    const n = Number(String(value ?? 0).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
};

const normMatch = (value) => String(value ?? "").trim().toLowerCase();

const resolveKnockOffClient = (row, distributors, customers) => {
    const clientId = String(knockOffField(row, ["clientId", "_id", "id"]) || "").trim();
    const code = String(knockOffField(row, ["code", "clientCode", "oldCode", "DistrbutorSystemCode", "SalesFlowRef"]) || "").trim();
    const name = String(knockOffField(row, ["name", "clientName", "distributor", "distributorName", "customer", "customerName", "CutomerName", "DistrbutorName"]) || "").trim();

    if (clientId) {
        const dist = distributors.find((item) => String(item._id) === clientId);
        if (dist) {
            return {
                _id: String(dist._id),
                name: dist.DistrbutorName || "",
                code: dist.OldCode || dist.DistrbutorSystemCode || "",
                type: "Distributor"
            };
        }
        const cust = customers.find((item) => String(item._id) === clientId);
        if (cust) {
            return {
                _id: String(cust._id),
                name: cust.CutomerName || "",
                code: cust.SalesFlowRef || cust.code || "",
                type: "Customer"
            };
        }
    }

    if (code) {
        const codeKey = normMatch(code);
        const dist = distributors.find((item) =>
            normMatch(item.OldCode) === codeKey ||
            normMatch(item.DistrbutorSystemCode) === codeKey
        );
        if (dist) {
            return {
                _id: String(dist._id),
                name: dist.DistrbutorName || "",
                code: dist.OldCode || dist.DistrbutorSystemCode || "",
                type: "Distributor"
            };
        }
        const cust = customers.find((item) =>
            normMatch(item.SalesFlowRef) === codeKey ||
            normMatch(item.code) === codeKey
        );
        if (cust) {
            return {
                _id: String(cust._id),
                name: cust.CutomerName || "",
                code: cust.SalesFlowRef || cust.code || "",
                type: "Customer"
            };
        }
    }

    if (name) {
        const nameKey = normMatch(name);
        const dist = distributors.find((item) => normMatch(item.DistrbutorName) === nameKey);
        if (dist) {
            return {
                _id: String(dist._id),
                name: dist.DistrbutorName || "",
                code: dist.OldCode || dist.DistrbutorSystemCode || "",
                type: "Distributor"
            };
        }
        const cust = customers.find((item) => normMatch(item.CutomerName) === nameKey);
        if (cust) {
            return {
                _id: String(cust._id),
                name: cust.CutomerName || "",
                code: cust.SalesFlowRef || cust.code || "",
                type: "Customer"
            };
        }
    }

    return null;
};

// export const MatchAgingLedger = async (req, res) => {
//     try {
//         const payload = req.body || {};
//         const rows = Array.isArray(payload.rows) ? payload.rows : (Array.isArray(payload) ? payload : []);

//         if (!rows.length) {
//             return res.status(400).json({ status: false, message: "No distributor codes to process" });
//         }

//         const distributors = await DistrbutorModal.find()
//             .select({ DistrbutorName: 1, DistrbutorSystemCode: 1, OldCode: 1 })
//             .lean();

//         const data = [];
//         for (const row of rows) {
//             const resolved = resolveKnockOffClient(row, distributors, []);
//             if (!resolved || resolved.type !== "Distributor") {
//                 data.push({
//                     clientId: "",
//                     clientName: String(knockOffField(row, ["name", "clientName", "distributor"]) || ""),
//                     clientCode: String(knockOffField(row, ["code", "clientCode", "oldCode", "DistrbutorSystemCode"]) || ""),
//                     aging: 0,
//                     ledger: 0,
//                     agingAfter: 0,
//                     action: "not_found",
//                     invoices: []
//                 });
//                 continue;
//             }

//             const result = await matchDistributorAgingToLedger(resolved._id);
//             data.push({
//                 clientId: resolved._id,
//                 clientName: resolved.name,
//                 clientCode: resolved.code,
//                 type: "Distributor",
//                 aging: result.aging,
//                 ledger: result.ledger,
//                 agingAfter: result.agingAfter,
//                 action: result.action,
//                 invoices: result.invoices
//             });
//         }

//         return res.status(200).json({ status: true, data });
//     } catch (err) {
//         console.error("MatchAgingLedger error:", err);
//         return res.status(500).json({ status: false, message: err.message });
//     }
// };

// export const ReduceKnockOff = MatchAgingLedger;

export const JvPost = async (req, res) => {
    try {
        const { id } = req.params
        const Voucher = await VoucherModal.findById(id)
        const invoiceEntries = Voucher.VoucharData.filter(item => item.Client);
        for (const value of invoiceEntries) {

            const invoiceRef = value.ClientRef2; // same as old: value.ref
            const amountToApplyNum = parseFloat(value.Credit);

            const customerInvoice = await SalesInvoiceModal.findOne({
                SalesInvoice: invoiceRef
            });
            console.log(customerInvoice)

            //  OLD BEHAVIOR: if invoice NOT found → opening invoice
            if (customerInvoice == null) {

                const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
                if (!AllOpeningInvoice) continue;

                const Inv = AllOpeningInvoice.InvoiceData.find(
                    In => In.Invoice == invoiceRef
                );
                if (!Inv) continue;

                const RecivedAmount = parseFloat(Inv.RecivedAmount || 0);
                const RemainingAmount = parseFloat(Inv.RemaingAmount || 0);
                //  EXACT SAME calculation (string result)
                Inv.RecivedAmount = (RecivedAmount + amountToApplyNum).toString();
                Inv.RemaingAmount = (RemainingAmount - amountToApplyNum).toString();
                await InvoiceOpeningModal.findByIdAndUpdate(
                    AllOpeningInvoice._id,
                    { InvoiceData: AllOpeningInvoice.InvoiceData }
                );

            } else {

                //  OLD redundant check preserved logically
                if (!customerInvoice) {
                    return res.status(404).json({
                        message: `Invoice not found for ref: ${invoiceRef}`
                    });
                }

                customerInvoice.RecivedAmount =
                    Number(customerInvoice.RecivedAmount || 0) + Number(value.Credit);

                customerInvoice.RemainingAmount =
                    Number(customerInvoice.RemainingAmount || 0) - Number(value.Credit);
                await customerInvoice.save();

                //  same as old
                await SalesInvoiceModal.findByIdAndUpdate(
                    customerInvoice._id,
                    customerInvoice
                );
            }
        }
        await VoucherModal.findByIdAndUpdate(id, { status: "Post" })
        res.status(200).send(200)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)

    }
}


export const VoucherNumber = async (req, res) => {
    try {
        const { voucher } = req.params;
        // Assuming Check is an array of voucher numbers
        // temp fix if only one voucher
        const Allupdate = [];

        for (const num of Check) {
            const data = await VoucherModal.findOne({ VoucherNumber: num.Number });
            if (!data) {
                // Push error for this voucher but continue
                Allupdate.push({ VoucherNumber: num.Number, error: "Voucher not found" });
                continue;
            }

            for (let i = 0; i < data.VoucharData.length; i++) {
                const item = data.VoucharData[i];
                const splitRef = item.ClientRef2
                if (!item.ClientRef2) continue;
                if (!item.ClientRef2 == "Advance") {
                    item.Store = "69589f74bed54ca7db54930c";
                }
                // 1️⃣ Sales Invoice
                const sale = await SalesInvoiceModal.findOne(
                    { SalesInvoice: splitRef },
                    { Store: 1 }
                );
                if (sale?.Store) {
                    item.Store = sale.Store;
                    continue;
                }

                // 2️⃣ Distributor Invoice
                const distributorSale = await DistrbutorInvoiceModal.findOne(
                    { DitributorInvoiceCode: splitRef },
                    { Store: 1 }
                );
                if (distributorSale?.Store) {
                    item.Store = distributorSale.Store;
                    continue;
                }

                // 3️⃣ Opening Invoice
                const openingInvoice = await InvoiceOpeningModal.findOne();
                if (openingInvoice) {
                    const inv = openingInvoice.InvoiceData.find(
                        i => i.Invoice === splitRef
                    );
                    if (inv?.Store) {
                        item.Store = inv.Store;
                    }
                }
            }

            // Update DB
            await VoucherModal.findByIdAndUpdate(data._id, { VoucharData: data.VoucharData });
            Allupdate.push({ VoucherNumber: num.Number, data: data.VoucharData });
        }

        res.status(200).json({
            success: true,
            data: Allupdate,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};


const SKIP_STORE_REFS = new Set(["", "Advance", "UnRealized", "undefined", "null"]);

const isBossUser = (user) => user?.isBoss === true || user?.isBoss === "true";

const clientMatchValues = (clientId) => {
    const id = String(clientId || "").trim();
    if (!id) return [];
    const values = [id];
    if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id) {
        values.push(new mongoose.Types.ObjectId(id));
    }
    return values;
};

const invoiceRefsOf = (line) =>
    String(line?.ClientRef2 || line?.Ref || line?.ref || "")
        .split(",")
        .map((part) => part.trim())
        .filter((ref) => ref && !SKIP_STORE_REFS.has(ref));

const pickStore = (rows) => {
    const counts = new Map();
    for (const row of rows || []) {
        const store = String(row?.Store || "").trim();
        if (!store) continue;
        counts.set(store, (counts.get(store) || 0) + 1);
    }
    let best = "";
    let bestCount = 0;
    for (const [store, count] of counts) {
        if (count > bestCount) {
            best = store;
            bestCount = count;
        }
    }
    return best;
};

export const FillVoucherClientStore = async (req, res) => {
    try {
        if (!isBossUser(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Only boss can fill voucher stores",
            });
        }

        const numbers = [...new Set(
            (Array.isArray(voucher) ? voucher : [])
                .map((item) => String(item?.voucher || item?.Voucher || item?.VoucherNumber || "").trim())
                .filter(Boolean)
        )];

        if (!numbers.length) {
            return res.status(400).json({
                success: false,
                message: "No voucher numbers found in Vouchers.js",
            });
        }

        const vouchers = await VoucherModal.find({ VoucherNumber: { $in: numbers } }).lean();
        const found = new Set(vouchers.map((doc) => doc.VoucherNumber));
        const missing = numbers.filter((num) => !found.has(num));

        const refs = new Set();
        const clientIds = new Set();
        for (const doc of vouchers) {
            for (const line of doc.VoucharData || []) {
                const clientId = String(line?.Client || "").trim();
                if (!clientId) continue;
                clientIds.add(clientId);
                for (const ref of invoiceRefsOf(line)) refs.add(ref);
            }
        }

        const refList = [...refs];
        const clientValues = [...clientIds].flatMap(clientMatchValues);

        const [salesByRef, distByRef, salesByClient, distByClient] = await Promise.all([
            refList.length
                ? SalesInvoiceModal.find({
                    $or: [
                        { SalesInvoice: { $in: refList } },
                        { SalesFlowRef: { $in: refList } },
                    ],
                }).select({ SalesInvoice: 1, SalesFlowRef: 1, Store: 1 }).lean()
                : [],
            refList.length
                ? DistrbutorInvoiceModal.find({ DitributorInvoiceCode: { $in: refList } })
                    .select({ DitributorInvoiceCode: 1, Store: 1 }).lean()
                : [],
            clientValues.length
                ? SalesInvoiceModal.find({ Client: { $in: clientValues } })
                    .select({ Client: 1, Store: 1 }).lean()
                : [],
            clientValues.length
                ? DistrbutorInvoiceModal.find({ Distrbutor: { $in: clientValues } })
                    .select({ Distrbutor: 1, Store: 1 }).lean()
                : [],
        ]);

        const salesRefMap = new Map();
        for (const row of salesByRef) {
            const store = String(row.Store || "").trim();
            if (!store) continue;
            if (row.SalesInvoice) salesRefMap.set(String(row.SalesInvoice).trim(), store);
            if (row.SalesFlowRef) salesRefMap.set(String(row.SalesFlowRef).trim(), store);
        }
        const distRefMap = new Map();
        for (const row of distByRef) {
            const store = String(row.Store || "").trim();
            const code = String(row.DitributorInvoiceCode || "").trim();
            if (store && code) distRefMap.set(code, store);
        }

        const salesClientMap = new Map();
        for (const row of salesByClient) {
            const key = String(row.Client || "").trim();
            if (!key) continue;
            if (!salesClientMap.has(key)) salesClientMap.set(key, []);
            salesClientMap.get(key).push(row);
        }
        const distClientMap = new Map();
        for (const row of distByClient) {
            const key = String(row.Distrbutor || "").trim();
            if (!key) continue;
            if (!distClientMap.has(key)) distClientMap.set(key, []);
            distClientMap.get(key).push(row);
        }

        let updatedVouchers = 0;
        let updatedLines = 0;
        let skippedLines = 0;

        for (const doc of vouchers) {
            let changed = false;
            const nextLines = (doc.VoucharData || []).map((line) => {
                const clientId = String(line?.Client || "").trim();
                if (!clientId) return line;

                let store = "";
                for (const ref of invoiceRefsOf(line)) {
                    store = salesRefMap.get(ref) || distRefMap.get(ref) || "";
                    if (store) break;
                }
                if (!store) {
                    store = pickStore(salesClientMap.get(clientId))
                        || pickStore(distClientMap.get(clientId));
                }
                if (!store) {
                    skippedLines += 1;
                    return line;
                }

                if (String(line.Store || "") === store && String(line.store || "") === store) {
                    return line;
                }

                changed = true;
                updatedLines += 1;
                return { ...line, Store: store, store };
            });

            if (!changed) continue;

            await VoucherModal.updateOne(
                { _id: doc._id },
                { $set: { VoucharData: nextLines } }
            );
            updatedVouchers += 1;
        }

        return res.status(200).json({
            success: true,
            message: `Store filled on ${updatedLines} client line(s) in ${updatedVouchers} voucher(s). ${missing.length} voucher(s) were not found. ${skippedLines} client line(s) had no invoice store.`,
            updatedVouchers,
            updatedLines,
            skippedLines,
            missing,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message || "Could not fill voucher stores",
        });
    }
};

export const UpdateClient = async (req, res) => {
    try {


        for (const item of voucher) {
            const data = await VoucherModal.findOne({ VoucherNumber: item.Voucher })
            if (data) {
                for (const Nestitem of data.VoucharData) {
                    const invoice = await SalesInvoiceModal.findOne({ SalesInvoice: Nestitem.ClientRef2 })
                    console.log(invoice)
                    if (invoice) {
                        Nestitem.Store = invoice.Store
                    }
                }
                await VoucherModal.findByIdAndUpdate(data._id, {
                    VoucharData: data.VoucharData
                })
            }


        }
        res.status(200).send("Hogia")
    } catch (err) {
        console.log(err)
        res.status(200).send("Nahi howa")

    }
}

export const DeleteVocuher = async (req, res) => {
    try {
        for (const item of voucher) {
            await VoucherModal.findOneAndDelete({ VoucherNumber: `Pr${item.Voucher}` })
        }
        res.send("hogaia")
    } catch (err) {
        clg(err)
    }
}




export const VoucherByID = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({
                success: false,
                message: "Invalid voucher ID provided"
            });
        }

        // 1. Fetch voucher with proper error handling
        const data = await VoucherModal.findById(id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Voucher not found"
            });
        }

        // 2. Validate VoucharData exists
        if (!data.VoucharData || !Array.isArray(data.VoucharData)) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        const VoucharData = data.VoucharData;

        // 3. Extract IDs with better filtering (handle null, undefined, empty strings)
        const AccountID = VoucharData
            .map(item => item?.Account)
            .filter(val => val && val !== 'undefined' && val !== 'null');

        const transporterID = VoucharData
            .map(item => item?.Transporter)
            .filter(val => val && val !== 'undefined' && val !== 'null');

        const VendorID = VoucharData
            .map(item => item?.Vendor)
            .filter(val => val && val !== 'undefined' && val !== 'null');

        const ClientID = VoucharData
            .map(item => item?.Client)
            .filter(val => val && val !== 'undefined' && val !== 'null');

        const isValidObjectId = (id) => {
            return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
        };
        const StoreID = VoucharData
            .map(item => item?.store ? item.store.toString() : null)
            .filter(id => isValidObjectId(id)); // ✅ only valid IDs
        console.log(StoreID);

        // 4. Optimize: Only query if IDs exist
        const promises = [];

        if (AccountID.length > 0) {
            promises.push(
                ChartofAccountsModel.find({ _id: { $in: AccountID } })
                    .select("AccountName")
                    .lean() // Use lean() for better performance
                    .then(accounts => accounts.map(acc => ({ ...acc, type: 'Account' })))
            );
        } else {
            promises.push(Promise.resolve([]));
        }

        if (transporterID.length > 0) {
            promises.push(
                TransporterModal.find({ _id: { $in: transporterID } })
                    .select("TransporterName OldCode")
                    .lean()
                    .then(transporters => transporters.map(t => ({ ...t, type: 'Transporter' })))
            );
        } else {
            promises.push(Promise.resolve([]));
        }

        if (VendorID.length > 0) {
            promises.push(
                VendorModel.find({ _id: { $in: VendorID } })
                    .select("VendorName")
                    .lean()
                    .then(vendors => vendors.map(v => ({ ...v, type: 'Vendor' })))
            );
        } else {
            promises.push(Promise.resolve([]));
        }

        if (ClientID.length > 0) {
            promises.push(
                CutomerModal.find({ _id: { $in: ClientID } })
                    .select("CutomerName")
                    .lean()
                    .then(clients => clients.map(c => ({ ...c, type: 'Client' })))
            );
        } else {
            promises.push(Promise.resolve([]));
        }
        if (StoreID.length > 0) {
            promises.push(
                StoreModal.find({ _id: { $in: StoreID } })
                    .select("StoreName")
                    .lean()
                    .then(stores => stores.map(s => ({ ...s, type: 'Store' })))
            );
        } else {
            promises.push(Promise.resolve([]));
        }


        // 5. Execute all queries in parallel
        const [accounts, transporters, vendors, clients, stores] = await Promise.all(promises);

        // 6. Merge with type information
        const mergeData = [...accounts, ...transporters, ...vendors, ...clients, ...stores];

        // 7. Return structured response
        res.status(200).json({
            success: true,
            data: mergeData,
            voucher: data,
            metadata: {
                voucherId: id,
                totalReferences: mergeData.length,

                breakdown: {
                    accounts: accounts.length,
                    transporters: transporters.length,
                    vendors: vendors.length,
                    clients: clients.length
                }
            }
        });

    } catch (err) {
        console.error("Error in VoucherByID:", {
            message: err.message,
            stack: err.stack,
            params: req.params
        });

        // Send proper error response based on error type
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid ID format"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later."
        });
    }
}

const EMPTY_INVOICE_REFS = new Set(["", "Advance", "UnRealized", "undefined", "null"]);

const isFilledInvoiceRef = (val) => {
    const s = String(val ?? "").trim();
    return Boolean(s) && !EMPTY_INVOICE_REFS.has(s);
};

export const getVoucherInvoiceRefReport = async (req, res) => {
    const { startDate, endDate, store } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({
            status: false,
            message: "startDate and endDate are required"
        });
    }

    try {
        const storeArray = store
            ? String(store).split(",").map((s) => s.trim()).filter(Boolean)
            : [];

        const vouchers = await VoucherModal.find({
            VoucherDate: { $gte: startDate, $lte: endDate },
            VoucherType: { $in: ["CR", "BR", "JV"] }
        }).select({
            VoucherNumber: 1,
            VoucherDate: 1,
            VoucherType: 1,
            status: 1,
            Type: 1,
            ChequeNumber: 1,
            VoucharData: 1
        }).lean();

        const rows = [];
        for (const voucher of vouchers) {
            const lines = Array.isArray(voucher.VoucharData) ? voucher.VoucharData : [];
            for (const line of lines) {
                const clientId = String(line?.Client ?? "").trim();
                if (!clientId) continue;

                const clientRef2 = String(line?.ClientRef2 ?? "").trim();
                const ref = String(line?.Ref ?? "").trim();
                if (!isFilledInvoiceRef(clientRef2) && !isFilledInvoiceRef(ref)) continue;

                const lineStore = String(line?.store || line?.Store || "");
                if (
                    storeArray.length &&
                    !storeArray.includes("All") &&
                    lineStore &&
                    !storeArray.includes(lineStore)
                ) {
                    continue;
                }

                rows.push({
                    voucherNumber: voucher.VoucherNumber || "",
                    date: voucher.VoucherDate || "",
                    voucherType: voucher.VoucherType || "",
                    status: voucher.status || "",
                    type: voucher.Type || "",
                    clientId,
                    clientRef2,
                    ref,
                    credit: Number(line?.Credit) || 0,
                    debit: Number(line?.Debit) || 0,
                    chq: line?.Chq || voucher.ChequeNumber || "",
                    narration: line?.Narration || "",
                    store: lineStore
                });
            }
        }

        const clientIds = [...new Set(rows.map((r) => r.clientId).filter(Boolean))];
        const [customers, distributors] = await Promise.all([
            CutomerModal.find({ _id: { $in: clientIds } }).select({ CutomerName: 1, SalesFlowRef: 1, code: 1 }).lean(),
            DistrbutorModal.find({ _id: { $in: clientIds } }).select({ DistrbutorName: 1, OldCode: 1, DistrbutorSystemCode: 1 }).lean()
        ]);

        const clientMap = {};
        customers.forEach((c) => {
            clientMap[String(c._id)] = {
                name: c.CutomerName || "",
                code: c.SalesFlowRef || c.code || ""
            };
        });
        distributors.forEach((d) => {
            clientMap[String(d._id)] = {
                name: d.DistrbutorName || "",
                code: d.OldCode || d.DistrbutorSystemCode || ""
            };
        });

        const data = rows
            .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.voucherNumber).localeCompare(String(b.voucherNumber)))
            .map((row, index) => {
                const client = clientMap[String(row.clientId)] || { name: "", code: "" };
                return {
                    ...row,
                    id: index + 1,
                    clientName: client.name,
                    clientCode: client.code
                };
            });

        return res.status(200).json({ status: true, data });
    } catch (err) {
        console.error("Error in getVoucherInvoiceRefReport:", err);
        return res.status(500).json({ status: false, message: err.message });
    }
};


