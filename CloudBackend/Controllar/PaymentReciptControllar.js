import AdministrativeModal from "../modal/AdministrativeModal.js";
import DistrbutorInvoiceModal from "../modal/DistrbutorInvoiceModal.js";
import InvoiceOpeningModal from "../modal/OpeningInvoicesModal.js";
import PaymentRecivedModal from "../modal/PaymentRecivedModal.js";
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";
import VoucherModal from "../modal/VoucherModal.js";
import jwt from "jsonwebtoken"; //ADD KARO
import logModal from "../modal/LogModal.js"
import { checkMonthClose } from "../utils/checkMonthClose.js";
import { assertKnockOffWithinRemaining, knockOffInvoiceLines, replaceKnockOffInvoiceLines } from "../utils/invoiceKnockOff.js";
import mongoose from "mongoose";

// CHANGES YAHAN SE
const voucherTypeMap = {
    CP: "Cash Payment",
    CR: "Cash Receipt",
    BR: "Bank Receipt",
    BP: "Bank Payment",
    PR: "Payment Reciept",
};

const withSession = (query, session) => (session ? query.session(session) : query);

const nextReceiptNumber = async (session) => {
    const code = await withSession(
        PaymentRecivedModal.findOne().sort({ ReciptNumber: -1 }).limit(1),
        session
    );
    if (code == null) {
        return (parseInt("000000", 10) + 1).toString().padStart(6, "0");
    }
    return (parseInt(code.ReciptNumber, 10) + 1).toString().padStart(6, "0");
};

const nextBrVoucherNumber = async (reciptDate, session) => {
    const VoucherType = "BR";
    const date = new Date(reciptDate || new Date());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const prefix = `${VoucherType}${year}${month}`;

    const lastVoucher = await withSession(VoucherModal.findOne({
        VoucherType,
        VoucherNumber: { $regex: `^${prefix}` }
    }).sort({ VoucherNumber: -1 }), session);

    let serial = 1;
    if (lastVoucher?.VoucherNumber) {
        const lastSerial = parseInt(lastVoucher.VoucherNumber.replace(prefix, ""), 10);
        serial = isNaN(lastSerial) ? 1 : lastSerial + 1;
    }

    return {
        VoucherType,
        voucherNumber: `${prefix}${String(serial).padStart(4, "0")}`
    };
};

const buildPaymentReceiptVoucher = async (data, voucherNumber, voucherType, session) => {
    const rows = Array.isArray(data.ReciptData) ? data.ReciptData : [];
    const TotalDebit = rows.reduce((sum, row) => sum + (Number(row.Credit) || 0), 0);
    const TotalCredit = rows.reduce((sum, row) => sum + (Number(row.Debit) || 0), 0);
    const Admin = await withSession(AdministrativeModal.find(), session);
    const clientAccount = Admin[0]?.Client;

    const allData = rows.map((item) => ({
        ...item,
        Account: item.Client == item.Account ? clientAccount : item.Account,
        InvoiceRef: item.InvoiceRef || item.ClientRef2 || item.Ref || ""
    }));

    allData.push({
        Account: data.ReciptMainAccount,
        Debit: TotalDebit - TotalCredit,
        Credit: 0,
        Store: rows[0]?.store,
        Narration: "Payment Receipt Posting",
    });

    return {
        VoucherType: voucherType,
        VoucherNumber: voucherNumber,
        VoucherDate: data.ReciptDate,
        VoucherMainAccount: data.ReciptMainAccount,
        VoucharData: allData,
        status: "Post",
        TotalDebit,
        TotalCredit,
    };
};

export const CreatePaymentRecived = async (req, res) => {
    try {
        const monthCheck = await checkMonthClose(req, res, "ReciptDate");
        if (monthCheck) return;
        const token = req.headers.authorization?.split(" ")[1];
        if (token) jwt.verify(token, "peral-Dynamic");
        const userId = req.user?._id || req.user?.id;

        const session = await mongoose.startSession();
        let allData;
        try {
            await session.withTransaction(async () => {
                const knockOffOptions = { forDis: req.body.forDis, session };
                await assertKnockOffWithinRemaining(req.body.ReciptData, knockOffOptions);

                const reciptNumber = await nextReceiptNumber(session);
                const { VoucherType, voucherNumber } = await nextBrVoucherNumber(req.body.ReciptDate, session);
                

                allData = {
                    ...req.body,
                    ReciptNumber: reciptNumber,
                    status: "False",
                
                };

                await PaymentRecivedModal.create([allData], { session });

                await knockOffInvoiceLines(allData.ReciptData, knockOffOptions);
                await logModal.create([{
                    userId,
                    action: "create",
                    Page: "PaymentReciept",
                    payload: allData,
                    responseStatus: 200,
                    RefNumber: reciptNumber,
                }], { session });
            });
        } finally {
            await session.endSession();
        }

        return res.status(200).send(allData);
    } catch (err) {
        console.log(err);
        const needsReplicaSet = /replica set member or mongos/i.test(String(err.message || err.errmsg || ""));
        return res.status(err.statusCode || 400).json({
            message: needsReplicaSet
                ? "MongoDB transactions require a replica set. Add replication.replSetName: rs0 to mongod.cfg, restart MongoDB, then run rs.initiate() and retry."
                : (err.message || "Error creating payment received"),
            details: err.details
        });
    }
};

const paymentReceiptEditError = (receipt) => {
    const status = String(receipt?.status ?? "").trim().toLowerCase();
    if (status !== "false") {
        return "Only receipts with status False can be updated";
    }
    if (receipt?.Voucher && String(receipt.Voucher).trim()) {
        return "Receipt already has a voucher number and cannot be updated";
    }
    return "";
};

const receiptError = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

export const UpdatePaymentRecived = async (req, res) => {
    let session;
    try {
        const monthCheck = await checkMonthClose(req, res, "ReciptDate");
        if (monthCheck) return;

        const token = req.headers.authorization?.split(" ")[1];
        if (token) jwt.verify(token, "peral-Dynamic");
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid payment receipt id" });
        }
        if (req.body?.ReciptData != null && !Array.isArray(req.body.ReciptData)) {
            return res.status(400).json({ message: "ReciptData must be an array" });
        }

        const existingPreview = await PaymentRecivedModal.findById(id).lean();
        if (!existingPreview) {
            return res.status(404).json({ message: "Payment receipt not found" });
        }
        const previewError = paymentReceiptEditError(existingPreview);
        if (previewError) {
            return res.status(400).json({ message: previewError });
        }

        if (
            existingPreview.ReciptDate &&
            req.body?.ReciptDate &&
            String(existingPreview.ReciptDate) !== String(req.body.ReciptDate)
        ) {
            const oldMonthCheck = await checkMonthClose(
                { headers: req.headers, body: { ReciptDate: existingPreview.ReciptDate } },
                res,
                "ReciptDate"
            );
            if (oldMonthCheck) return;
        }

        session = await mongoose.startSession();
        let updated;
        await session.withTransaction(async () => {
            updated = undefined;

            const existing = await PaymentRecivedModal.findById(id).session(session);
            if (!existing) throw receiptError(404, "Payment receipt not found");
            const existingError = paymentReceiptEditError(existing);
            if (existingError) throw receiptError(400, existingError);

            const nextLines = Array.isArray(req.body?.ReciptData)
                ? req.body.ReciptData
                : (existing.ReciptData || []);
            const nextForDis = req.body?.forDis !== undefined ? req.body.forDis : existing.forDis;

            await replaceKnockOffInvoiceLines(existing.ReciptData, nextLines, {
                oldForDis: existing.forDis,
                newForDis: nextForDis,
                session
            });

            const {
                ReciptNumber: _reciptNumber,
                status: _status,
                Voucher: _voucher,
                RejectReson: _rejectReson,
                _id: _ignoreId,
                __v: _version,
                ...editable
            } = req.body || {};

            updated = await PaymentRecivedModal.findByIdAndUpdate(
                id,
                {
                    ...editable,
                    ReciptData: nextLines,
                    ...(nextForDis !== undefined ? { forDis: nextForDis } : {})
                },
                { new: true, session }
            );

            await logModal.create([{
                userId,
                action: "update",
                Page: "PaymentReciept",
                payload: updated?.toObject?.() || updated,
                responseStatus: 200,
                RefNumber: existing.ReciptNumber,
            }], { session });
        });

        return res.status(200).send(updated);
    } catch (err) {
        console.log(err);
        const needsReplicaSet = /replica set member or mongos/i.test(String(err.message || err.errmsg || ""));
        return res.status(err.statusCode || 400).json({
            message: needsReplicaSet
                ? "MongoDB transactions require a replica set. Add replication.replSetName: rs0 to mongod.cfg, restart MongoDB, then run rs.initiate() and retry."
                : (err.message || "Error updating payment received"),
            details: err.details
        });
    } finally {
        if (session) await session.endSession();
    }
}

//YAHAN TAK

export const getPaymentRecipt = async (req, res) => {
    try {
        const Data = await PaymentRecivedModal.find({ status: { $ne: "true" } })


        res.status(200).send(Data)
    } catch (err) {
        res.status(400).send(err)

    }
}

export const getPaymentReciptNumvoucher = async (req, res) => {
    try {
        const Data = await PaymentRecivedModal
            .find()
            .select("ReciptNumber Voucher ReciptDate");

        res.status(200).send(Data);
    } catch (err) {
        res.status(400).send(err);
    }
};

export const getPaymentReciptByMainAccounts = async (req, res) => {
    try {
        const { Account } = req.params
        const { startDate, endDate } = req.query
        console.log(startDate, endDate)
        const Data = await PaymentRecivedModal.find({ ReciptDate: { $gte: startDate, $lte: endDate }, ReciptMainAccount: Account, status: "False" })


        res.status(200).send(Data)
    } catch (err) {
        res.status(400).send(err)

    }
}


const mergeReceiptData = (data) => {
    const map = {};

    data.forEach(item => {
        const key = `${item.Client}_${item.ClientRef2}`;

        if (!map[key]) {
            map[key] = {
                ...item,
                Credit: Number(item.Credit) || 0,
                Debit: Number(item.Debit) || 0,
                Narration: item.Narration ? [item.Narration] : [],
                Ref: item.Ref ? [item.Ref] : [],
            };
        } else {
            map[key].Credit += Number(item.Credit) || 0;
            map[key].Debit += Number(item.Debit) || 0;

            if (item.Narration && !map[key].Narration.includes(item.Narration)) {
                map[key].Narration.push(item.Narration);
            }

            if (item.Ref && !map[key].Ref.includes(item.Ref)) {
                map[key].Ref.push(item.Ref);
            }
        }
    });

    // Convert arrays to comma-separated strings
    return Object.values(map).map(item => ({
        ...item,
        Ref: item.Ref.join(", "),
    }));
};



const isStatusTrue = (status) =>
    status === true || String(status).toLowerCase() === "true";

const hasVoucherNumber = (voucher) =>
    Boolean(voucher && String(voucher).trim());

export const PostPaymentRecipt = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const data = req.body;

    const session = await mongoose.startSession();

    try {
        // Filled inside the transaction, sent only after it commits
        let result;

        await session.withTransaction(async () => {
            result = undefined; // reset in case the callback is retried

            // 1️⃣ Fetch receipt from DB (source of truth), inside the transaction
            const existing = await PaymentRecivedModal.findById(id).session(session);

            if (!existing) {
                throw httpError(404, "No record found");
            }

            // Already realized: status true AND voucher number → skip
            if (isStatusTrue(existing.status) && hasVoucherNumber(existing.Voucher)) {
                result = {
                    status: 200,
                    body: {
                        message: "Payment already realized, skipped",
                        skipped: true,
                        voucherNumber: existing.Voucher,
                    },
                };
                return; // nothing written, transaction commits empty
            }

            // 2️⃣ Generate voucher number (helper must use the session, see notes)
            const { VoucherType, voucherNumber } = await nextBrVoucherNumber(
                data.ReciptDate || existing.ReciptDate,
                session
            );

            // 3️⃣ Build voucher (pass session too if it queries the DB)
            const Voucher = await buildPaymentReceiptVoucher(
                data,
                voucherNumber,
                VoucherType,
                session
            );

            // create() needs an ARRAY when passing options
            await VoucherModal.create([Voucher], { session });

            // 4️⃣ Mark receipt as posted
            await PaymentRecivedModal.findByIdAndUpdate(
                id,
                { status: "true", Voucher: voucherNumber },
                { session }
            );

            // 5️⃣ Audit log
            await logModal.create(
                [
                    {
                        userId,
                        action: "Post",
                        Page: "PaymentReciept",
                        payload: Voucher.VoucharData,
                        responseStatus: 200,
                        RefNumber: voucherNumber,
                    },
                ],
                { session }
            );

            result = {
                status: 200,
                body: { message: "Payment posted successfully", voucherNumber },
            };
        });

        // Respond only AFTER commit
        return res.status(result.status).json(result.body);
    } catch (err) {
        console.error(err);
        return res.status(err.statusCode || 500).json({
            message: err.message || "Server error",
            error: err.message,
            details: err.details,
        });
    } finally {
        await session.endSession();
    }
};

const toNum = (v) => parseFloat(v) || 0;

// Reverses the amounts applied by a voucher on every invoice it touched.
// Every read/write here is bound to the same session.
const reverseReceipts = async (data, session) => {
    const items = (data.ReciptData || [])
        .map((item) => ({
            amount: toNum(item.Credit),
            ref: item.ClientRef2 || "Advance",
        }))
        .filter((i) => i.ref !== "Advance");

    if (!items.length) return;

    // Fetch InvoiceOpening once, inside the transaction
    const opening = await InvoiceOpeningModal.findOne().session(session);

    for (const { amount, ref } of items) {
        // 1) Invoice lives in the opening data
        const openingInv = opening?.InvoiceData.find((inv) => inv.Invoice == ref);
        if (openingInv) {
            openingInv.RecivedAmount = (toNum(openingInv.RecivedAmount) - amount).toFixed(2);
            openingInv.RemaingAmount = (toNum(openingInv.RemaingAmount) + amount).toFixed(2);
            opening.markModified("InvoiceData");
            continue;
        }

        // 2) Distributor invoice
        if (data.forDis === "Yes") {
            const invoice = await DistrbutorInvoiceModal
                .findOne({ DitributorInvoiceCode: ref })
                .session(session);
            if (!invoice) throw new HttpError(404, `Invoice not found for ref: ${ref}`);

            invoice.Remaining = String(toNum(invoice.Remaining) + amount);
            invoice.RecivedAmount = String(toNum(invoice.RecivedAmount) - amount);
            await invoice.save({ session });
            continue;
        }

        // 3) Customer (sales) invoice
        if (data.forDis === "No") {
            const invoice = await SalesInvoiceModal
                .findOne({ SalesInvoice: ref })
                .session(session);
            if (!invoice) throw new HttpError(404, `Invoice not found for ref: ${ref}`);

            invoice.RecivedAmount = toNum(invoice.RecivedAmount) - amount;
            invoice.RemainingAmount = toNum(invoice.RemainingAmount) + amount;
            await invoice.save({ session });
        }
    }

    // Single save for all opening-invoice changes
    if (opening?.isModified()) {
        await opening.save({ session });
    }
};

export const RejectVoucher = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;

        await session.withTransaction(async () => {
            // Atomic guard: only reject if not already rejected
            const data = await PaymentRecivedModal.findOneAndUpdate(
                { _id: id, status: { $ne: "Reject" } },
                { RejectReson: req.body.RejectResone, status: "Reject" },
                { session, new: true }
            );

            if (!data) {
                throw new HttpError(404, "Voucher not found or already rejected");
            }

            await reverseReceipts(data, session);

            console.log("endddddd")

            // create() needs an ARRAY when passing options
            await logModal.create(
                [
                    {
                        userId,
                        action: "reject",
                        Page: "PaymentReciept",
                        payload: data,
                        responseStatus: 200,
                        RefNumber: data.ReciptNumber,
                    },
                ],
                { session }
            );
        });

        // Respond only AFTER the transaction has committed
        return res.status(200).send("Entry Reject");
    } catch (err) {
        console.log(err);
        res.status(err.status || 400).send(err.message || "Something went wrong");
    } finally {
        await session.endSession();
    }
};

// export const RejectVoucher = async (req, res) => {
//     const session = await mongoose.startSession();

//     try {
//         const { id } = req.params
//         const userId = req.user?._id || req.user?.id; // Adjust based on your auth setup

//         await session.withTransaction(async () => {
//             const data = await PaymentRecivedModal.findByIdAndUpdate(id, {
//                 RejectReson: req.body.RejectResone,
//                 status: "Reject"
//             }, { session })

//             if (data.forDis == "Yes") {
//                 const receiptArray = data.ReciptData.map(item => ({
//                     amountToApplyNum: parseFloat(item.Credit) || 0,
//                     invoiceRef: item.ClientRef2 || "Advance",
//                 }));

//                 // 7️⃣ Fetch InvoiceOpening once
//                 const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
//                 for (const item of receiptArray) {
//                     if (item.invoiceRef === "Advance") continue;
//                     if (AllOpeningInvoice) {
//                         // Check if invoice exists in opening data
//                         const Inv = AllOpeningInvoice.InvoiceData.find(inv => inv.Invoice == item.invoiceRef);
//                         console.log(Inv)
//                         if (Inv) {
//                             // Update numeric values safely
//                             Inv.RecivedAmount = (parseFloat(Inv.RecivedAmount || 0) - item.amountToApplyNum).toFixed(2);
//                             Inv.RemaingAmount = (parseFloat(Inv.RemaingAmount || 0) + item.amountToApplyNum).toFixed(2);

//                             // Save back to InvoiceOpeningModal
//                             await InvoiceOpeningModal.findByIdAndUpdate(
//                                 AllOpeningInvoice._id,
//                                 { InvoiceData: AllOpeningInvoice.InvoiceData }
//                             );
//                         } else {
//                             // Update Distributor Invoice directly with $inc
//                             const invoice = await DistrbutorInvoiceModal.findOne({ DitributorInvoiceCode: item.invoiceRef })
//                             const Remaining = (Number(invoice.Remaining || 0) + Number(item.amountToApplyNum))
//                             const RecivedAmount = (Number(invoice.RecivedAmount || 0) - Number(item.amountToApplyNum))
//                             console.log(item.amountToApplyNum, Remaining, RecivedAmount)
//                             await DistrbutorInvoiceModal.findOneAndUpdate(
//                                 { DitributorInvoiceCode: item.invoiceRef },
//                                 {

//                                     Remaining: Remaining.toString(),
//                                     RecivedAmount: RecivedAmount.toString(),

//                                 }, { session }
//                             );
//                         }
//                     }
//                 }

//             }
//             if (data.forDis == "No") {
//                 const receiptArray = data.ReciptData.map(item => ({
//                     amountToApplyNum: parseFloat(item.Credit) || 0,
//                     invoiceRef: item.ClientRef2 || "Advance",
//                 }));

//                 // 7️⃣ Fetch InvoiceOpening once
//                 const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
//                 for (const item of receiptArray) {
//                     if (item.invoiceRef === "Advance") continue;
//                     if (AllOpeningInvoice) {
//                         // Check if invoice exists in opening data
//                         const Inv = AllOpeningInvoice.InvoiceData.find(inv => inv.Invoice == item.invoiceRef);
//                         console.log(Inv)
//                         if (Inv) {
//                             // Update numeric values safely
//                             Inv.RecivedAmount = (parseFloat(Inv.RecivedAmount || 0) - item.amountToApplyNum).toFixed(2);
//                             Inv.RemaingAmount = (parseFloat(Inv.RemaingAmount || 0) + item.amountToApplyNum).toFixed(2);

//                             // Save back to InvoiceOpeningModal
//                             await InvoiceOpeningModal.findByIdAndUpdate(
//                                 AllOpeningInvoice._id,
//                                 { InvoiceData: AllOpeningInvoice.InvoiceData },
//                                 { session }
//                             );
//                         } else {
//                             // Update Distributor Invoice directly with $inc
//                             const customerInvoice = await SalesInvoiceModal.findOne({ SalesInvoice: item.invoiceRef });
//                             if (!customerInvoice) {
//                                 return res.status(404).json({ message: `Invoice not found for ref: ${item.invoiceRef}` });
//                             }


//                             customerInvoice.RecivedAmount =
//                                 (Number(customerInvoice.RecivedAmount || 0) - Number(item.amountToApplyNum));
//                             customerInvoice.RemainingAmount =
//                                 (Number(customerInvoice.RemainingAmount || 0) + Number(item.amountToApplyNum))
//                             await customerInvoice.save();

//                             // update status field at root if you want
//                             await SalesInvoiceModal.findByIdAndUpdate(customerInvoice._id, customerInvoice, { session });

//                         }
//                     }
//                 }

//             }
//             await logModal.create({
//                 userId: userId,
//                 action:dahjkdhakjsdkjdhskahd,
//                 Page: "PaymentReciept",
//                 payload: data,
//                 responseStatus: 200,
//                 RefNumber: data.ReciptNumber,
//             }, { session });
//         })
//         res.status(200).send("Entry Reject")
//     }
//     catch (err) {
//         console.log(err)
//         res.status(400).send(err)
//     }
//     finally {
//         await session.endSession()
//     }

// }


export const getAllPaymentRecipt = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const data = await PaymentRecivedModal.aggregate([
            {
                $match: {
                    ReciptDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

export const PaymentReciptReport = async (req, res) => {
    try {
        const { startDate, endDate, Account } = req.query;

        const matchStage = {
            ReciptDate: {
                $gte: startDate,
                $lte: endDate,
            },
        };

        // optional account filter
        if (Account && Account !== "All") {
            matchStage.ReciptMainAccount = Account;
        }

        const data = await PaymentRecivedModal.aggregate([
            {
                $match: matchStage,
            },
            {
                $unwind: "$ReciptData",
            },
            {
                $group: {
                    _id: {
                        Account: "$ReciptMainAccount",
                        VoucherNumber: "$ReciptNumber",
                        Client: "$ReciptData.Client",
                        status: "$status",
                        ReciptMainAccount: "$ReciptMainAccount",
                        Ref: "$ReciptData.ClientRef2",
                        VoucherDate: "$ReciptDate",
                        Store: "$ReciptData.store",
                        Credit: "$ReciptData.Credit",
                        Debit: "$ReciptData.Debit",
                        Narration: "$ReciptData.Narration",
                    },
                    ReciptData: { $push: "$ReciptData" },
                },
            },
            {
                $project: {
                    _id: 0,
                    Account: "$_id.Account",
                    VoucherNumber: "$_id.VoucherNumber",
                    status: "$_id.status",
                    VoucherDate: "$_id.VoucherDate",
                    Client: "$_id.Client",
                    Credit: "$_id.Credit",
                    Store: "$_id.Store",
                    Debit: "$_id.Debit",
                    Ref: "$_id.Ref",
                    ReciptMainAccount: "$_id.ReciptMainAccount",
                    Narration: "$_id.Narration",
                    Type: "Voucher",
                    Chq: "$_id.Chq",
                },
            },
        ]);

        res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
};

