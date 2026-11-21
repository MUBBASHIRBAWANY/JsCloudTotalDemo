import mongoose from "mongoose";
import AdministrativeModal from "../Modal/AdministrativeModal.js";
import CustomerChqRecivedModal from "../Modal/CustomerChqRecivedModal.js";
import CutomerModal from "../Modal/CutomerModal.js";
import logModal from "../Modal/LogModal.js";
import InvoiceOpeningModal from "../Modal/OpeningInvoicesModal.js";
import SalesInvoiceModal from "../Modal/SalesInvoiceModal.js";
import VoucherModal from "../Modal/VoucherModal.js";
import { checkMonthClose } from "../utils/checkMonthClose.js";


// export const CustomerChq = async (req, res) => {

//     console.log("passsss", req.body)
//     return
//     const { ChqDate, Customer, table, grouped, invoiceArray, PaymentDetail } = req.body;
//     const userId = req.user?._id || req.user?.id; // Adjust based on your auth setup
//     try {
//         const invalidInvoices = [];
//         let Store;
//         // Check each invoice against its RemainingAmount
//         for (const item of invoiceArray) {
//             const invoiceNumber = item.invoice;
//             const amountToApply = parseFloat(item.Amount);
//             const type = item.Type

//             console.log(invoiceNumber, amountToApply, type)
//             if (type == "Opening") {
//                 const AllOpeningInvoice = await InvoiceOpeningModal.findOne(); // fetch single doc
//                 if (!AllOpeningInvoice) {
//                     invalidInvoices.push({
//                         invoice: invoiceNumber,
//                         reason: "Opening invoices not found"
//                     });
//                     continue;
//                 }

//                 const Inv = AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == invoiceNumber);

//                 if (!Inv) {
//                     invalidInvoices.push({
//                         invoice: invoiceNumber,
//                         reason: "Opening invoice not found"
//                     });
//                     continue;
//                 }

//                 // Convert to numbers
//                 const remainingAmountNum = parseFloat(Inv.RemaingAmount);
//                 const amountToApplyNum = parseFloat(amountToApply);
//                 Store = Inv.Store
//                 if (amountToApplyNum > remainingAmountNum) {
//                     invalidInvoices.push({
//                         invoice: Inv.Invoice,
//                         reason: `Amount ${amountToApplyNum} exceeds remaining ${remainingAmountNum}`
//                     });
//                 } else {
//                     // Subtract and convert back to string
//                     Inv.RemaingAmount = (remainingAmountNum - amountToApplyNum).toString();

//                     // update status if fully paid
//                     if (parseFloat(Inv.RemaingAmount) <= 0) {
//                         Inv.status = "Closed";
//                     }

//                     await InvoiceOpeningModal.findByIdAndUpdate(AllOpeningInvoice._id, { InvoiceData: AllOpeningInvoice.InvoiceData })
//                 }
//             }
//             else {
//                 const invoice = await SalesInvoiceModal.findOne({ SalesInvoice: invoiceNumber });

//                 if (!invoice) {
//                     invalidInvoices.push({
//                         invoice: invoiceNumber,
//                         reason: "Invoice not found"
//                     });
//                     continue;
//                 }
//                 Store = invoice.Store
//                 if (amountToApply > invoice.RemainingAmount) {
//                     invalidInvoices.push({
//                         invoice: invoiceNumber,
//                         reason: `Amount ${amountToApply} exceeds remaining ${invoice.RemainingAmount}`
//                     });

//                 }
//                 else if (invoice.RemainingAmount - amountToApply >= 0) {
//                     invoice.RemainingAmount = invoice.RemainingAmount - amountToApply;


//                     if (!Array.isArray(invoice.PaymentDetail)) {
//                         invoice.PaymentDetail = [];
//                     }
//                     invoice.PaymentDetail.push(PaymentDetail);
//                     console.log(invoice.PaymentDetail, "invoice.PaymentDetail")

//                     await SalesInvoiceModal.findByIdAndUpdate(
//                         invoice._id,
//                         {
//                             RemainingAmount: invoice.RemainingAmount,
//                             RecivedAmount: invoice.RecivedAmount,
//                             PaymentDetail: invoice.PaymentDetail
//                         },
//                         { new: true }
//                     );

//                 }
//                 if (invalidInvoices.length > 0) {
//                     return res.status(400).json({
//                         message: "One or more invoices have invalid amounts",
//                         invalidInvoices
//                     });
//                 }
//             }
//         }


//         // If any invoice has an issue, return error response


//         // Generate next code
//         const lastChq = await CustomerChqRecivedModal.find().sort({ _id: -1 }).limit(1);
//         let nextCode;
//         if (lastChq.length === 0) {
//             nextCode = "00001";
//         } else {
//             const nextNumber = parseInt(lastChq[0].code, 10) + 1;
//             nextCode = nextNumber.toString().padStart(5, "0");
//         }

//         // Create and save cheque
//         const CustomerChq = new CustomerChqRecivedModal({
//             ChqDate,
//             Customer,
//             table,
//             grouped,
//             status: "false",
//             code: nextCode,
//             Store: Store
//         });

//         await CustomerChq.save();
//         await logModal.create({
//             userId: userId,
//             action: "create",
//             Page: "Customer Cheque Received",
//             payload: CustomerChq,
//             responseStatus: 200,
//             RefNumber: nextCode,
//         });
//         res.status(201).json({
//             message: "Cheque Received successfully",
//             data: CustomerChq
//         });

//     } catch (error) {
//         console.log(error)
//         res.status(500).json({
//             message: "Error creating cheque record",
//             error: error.message
//         });
//     }
// };

export const CustomerChq = async (req, res) => {
    console.log("Customer Cheque", req.body)

    const { ChqDate, Customer, table, grouped, invoiceArray, PaymentDetail } = req.body;
    const userId = req.user?._id || req.user?.id;

    const session = await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            result = undefined; // reset in case the callback is retried

            const invalidInvoices = [];
            let Store;

            // ---- PASS 1: validate everything before writing anything ----
            for (const item of invoiceArray) {
                const invoiceNumber = item.invoice;
                const amountToApply = parseFloat(item.Amount);
                const type = item.Type;

                if (type == "Opening") {
                    const opening = await InvoiceOpeningModal.findOne().session(session);
                    if (!opening) {
                        invalidInvoices.push({ invoice: invoiceNumber, reason: "Opening invoices not found" });
                        continue;
                    }
                    const inv = opening.InvoiceData.find((i) => i.Invoice == invoiceNumber);
                    if (!inv) {
                        invalidInvoices.push({ invoice: invoiceNumber, reason: "Opening invoice not found" });
                        continue;
                    }
                    const remaining = parseFloat(inv.RemaingAmount);
                    if (amountToApply > remaining) {
                        invalidInvoices.push({
                            invoice: inv.Invoice,
                            reason: `Amount ${amountToApply} exceeds remaining ${remaining}`,
                        });
                    } else {
                        Store = inv.Store;
                    }
                } else {
                    const invoice = await SalesInvoiceModal.findOne({ SalesInvoice: invoiceNumber }).session(session);
                    if (!invoice) {
                        invalidInvoices.push({ invoice: invoiceNumber, reason: "Invoice not found" });
                        continue;
                    }
                    if (amountToApply > invoice.RemainingAmount) {
                        invalidInvoices.push({
                            invoice: invoiceNumber,
                            reason: `Amount ${amountToApply} exceeds remaining ${invoice.RemainingAmount}`,
                        });
                    } else {
                        Store = invoice.Store;
                    }
                }
            }

            if (invalidInvoices.length > 0) {
                // Abort the transaction — nothing gets written
                result = {
                    status: 400,
                    body: { message: "One or more invoices have invalid amounts", invalidInvoices },
                };
                return;
            }

            // ---- PASS 2: everything validated, now apply the writes ----
            for (const item of invoiceArray) {
                const invoiceNumber = item.invoice;
                const amountToApply = parseFloat(item.Amount);
                const type = item.Type;

                if (type == "Opening") {
                    const opening = await InvoiceOpeningModal.findOne().session(session);
                    const inv = opening.InvoiceData.find((i) => i.Invoice == invoiceNumber);

                    inv.RemaingAmount = (parseFloat(inv.RemaingAmount) - amountToApply).toString();
                    if (parseFloat(inv.RemaingAmount) <= 0) {
                        inv.status = "Closed";
                    }
                    opening.markModified("InvoiceData");
                    await opening.save({ session });
                } else {
                    const invoice = await SalesInvoiceModal.findOne({ SalesInvoice: invoiceNumber }).session(session);

                    invoice.RemainingAmount = invoice.RemainingAmount - amountToApply;
                    if (!Array.isArray(invoice.PaymentDetail)) {
                        invoice.PaymentDetail = [];
                    }
                    invoice.PaymentDetail.push(PaymentDetail);

                    await SalesInvoiceModal.findByIdAndUpdate(
                        invoice._id,
                        {
                            RemainingAmount: invoice.RemainingAmount,
                            RecivedAmount: invoice.RecivedAmount,
                            PaymentDetail: invoice.PaymentDetail,
                        },
                        { new: true, session }
                    );
                }
            }

            // ---- Generate next code (inside the transaction, see note below) ----
            const lastChq = await CustomerChqRecivedModal.find().sort({ _id: -1 }).limit(1).session(session);
            const nextCode =
                lastChq.length === 0
                    ? "00001"
                    : (parseInt(lastChq[0].code, 10) + 1).toString().padStart(5, "0");

            const [customerChq] = await CustomerChqRecivedModal.create(
                [
                    {
                        ChqDate,
                        Customer,
                        table,
                        grouped,
                        status: "false",
                        code: nextCode,
                        Store,
                    },
                ],
                { session }
            );

            await logModal.create(
                [
                    {
                        userId,
                        action: "create",
                        Page: "Customer Cheque Received",
                        payload: customerChq,
                        responseStatus: 200,
                        RefNumber: nextCode,
                    },
                ],
                { session }
            );

            result = {
                status: 201,
                body: { message: "Cheque Received successfully", data: customerChq },
            };
        });

        return res.status(result.status).json(result.body);
    } catch (error) {
        console.log(error);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Error creating cheque record",
            error: error.message,
            ...(error.details ? { invalidInvoices: error.details } : {}),
        });
    } finally {
        await session.endSession();
    }
};



export const RealizeCustomerChq = async (req, res) => {
    const { ChqDate, Customer, table, grouped, invoiceArray, PaymentDetail, ChqNumber, RealizeDate, Amount } = req.body;
    try {
        const invalidInvoices = [];
        let Store;
        // Check each invoice against its RemainingAmount
        for (const item of invoiceArray) {
            const invoiceNumber = item.invoice;
            const amountToApply = parseFloat(item.Amount);
            const type = item.Type

            console.log(invoiceNumber, amountToApply, type)
            if (type == "Opening") {
                const AllOpeningInvoice = await InvoiceOpeningModal.findOne(); // fetch single doc
                if (!AllOpeningInvoice) {
                    invalidInvoices.push({
                        invoice: invoiceNumber,
                        reason: "Opening invoices not found"
                    });
                    continue;
                }

                const Inv = AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == invoiceNumber);

                if (!Inv) {
                    invalidInvoices.push({
                        invoice: invoiceNumber,
                        reason: "Opening invoice not found"
                    });
                    continue;
                }

                // Convert to numbers
                const remainingAmountNum = parseFloat(Inv.RemaingAmount);
                const amountToApplyNum = parseFloat(amountToApply);
                Store = Inv.Store
                if (amountToApplyNum > remainingAmountNum) {
                    invalidInvoices.push({
                        invoice: Inv.Invoice,
                        reason: `Amount ${amountToApplyNum} exceeds remaining ${remainingAmountNum}`
                    });
                } else {
                    // Subtract and convert back to string
                    Inv.RemaingAmount = (remainingAmountNum - amountToApplyNum).toString();

                    // update status if fully paid
                    if (parseFloat(Inv.RemaingAmount) <= 0) {
                        Inv.status = "Closed";
                    }

                    await InvoiceOpeningModal.findByIdAndUpdate(AllOpeningInvoice._id, { InvoiceData: AllOpeningInvoice.InvoiceData })
                }
            }
            else {
                const invoice = await SalesInvoiceModal.findOne({ SalesFlowRef: invoiceNumber });
                console.log(invoice)
                if (!invoice) {
                    invalidInvoices.push({
                        invoice: invoiceNumber,
                        reason: "Invoice not found"
                    });
                    continue;
                }
                Store = invoice.Store
                if (amountToApply > invoice.RemainingAmount) {
                    invalidInvoices.push({
                        invoice: invoiceNumber,
                        reason: `Amount ${amountToApply} exceeds remaining ${invoice.RemainingAmount}`
                    });

                }
                else if (invoice.RemainingAmount - amountToApply >= 0) {
                    invoice.RemainingAmount = invoice.RemainingAmount - amountToApply;


                    if (!Array.isArray(invoice.PaymentDetail)) {
                        invoice.PaymentDetail = [];
                    }
                    invoice.PaymentDetail.push(PaymentDetail);
                    console.log(invoice.PaymentDetail, "invoice.PaymentDetail")

                    await SalesInvoiceModal.findByIdAndUpdate(
                        invoice._id,
                        {
                            RemainingAmount: invoice.RemainingAmount,
                            RecivedAmount: invoice.RecivedAmount,
                            PaymentDetail: invoice.PaymentDetail
                        },
                        { new: true }
                    );

                }
                if (invalidInvoices.length > 0) {
                    return res.status(400).json({
                        message: "One or more invoices have invalid amounts",
                        invalidInvoices
                    });
                }
            }
        }


        // If any invoice has an issue, return error response


        // Generate next code
        const Chqcustomer = await CutomerModal.findOne({ SalesFlowRef: Customer });
        console.log(Chqcustomer)
        const lastChq = await CustomerChqRecivedModal.find().sort({ _id: -1 }).limit(1);
        let nextCode;
        if (lastChq.length === 0) {
            nextCode = "00001";
        } else {
            const nextNumber = parseInt(lastChq[0].code, 10) + 1;
            nextCode = nextNumber.toString().padStart(5, "0");
        }
        const invoice = await SalesInvoiceModal.findOne({ SalesFlowRef: invoiceArray[0].invoice });
        console.log(invoiceArray[0].invoice)
        // Create and save cheque
        const CustomerChq = new CustomerChqRecivedModal({
            ChqDate,
            Customer: invoice.Client,
            table: {
                chq: ChqNumber,
                ChqDate: new Date(Date.now()).toISOString().split("T")[0],
                Amount: Amount,
                id: Date.now() + Math.random().toString(36).substring(2, 15),
                RealizeDate: RealizeDate,
                status: "Pending",
                Invoice: invoice.SalesInvoice,
            },
            grouped: {
                chq: PaymentDetail[0].ChqNumber,
                items: [
                    {
                        Amount: Amount,
                        Invoice: invoice.SalesInvoice,
                        RealizeDate: RealizeDate,
                        chq: ChqNumber,
                        id: Math.random(),
                        status: "Pending"
                    }
                ],
                status: "Pending",
            },
            status: "false",
            code: nextCode,
            Store: invoice.Store
        });
        console.log(CustomerChq)
        await CustomerChq.save();
        res.status(201).json({
            message: "Cheque Received successfully",
            data: CustomerChq
        });

    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Error creating cheque record",
            error: error.message
        });
    }
};


export const deletetCustomerChq = async (req, res) => {
    const { id } = req.params;

    try {
        const chequeDoc = await CustomerChqRecivedModal.findById(id);
        if (!chequeDoc) {
            return res.status(404).json({ message: "Cheque not found" });
        }

        // Loop over all items in cheque's table
        for (const item of chequeDoc.table) {
            if (item.Type === "Opening") {
                const AllOpeningInvoice = await InvoiceOpeningModal.findOne();
                if (!AllOpeningInvoice) continue;

                const Inv = AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == item.Invoice);
                if (!Inv) continue;

                // Convert to numbers
                const remainingAmountNum = parseFloat(Inv.RemaingAmount || 0);
                const amountToRestore = parseFloat(item.Amount || 0);

                // Add back the amount
                Inv.RemaingAmount = (remainingAmountNum + amountToRestore).toString();

                // Reset status if any balance is left
                if (parseFloat(Inv.RemaingAmount) > 0) {
                    Inv.status = "Open";
                }

                await InvoiceOpeningModal.findByIdAndUpdate(AllOpeningInvoice._id, { InvoiceData: AllOpeningInvoice.InvoiceData })
            } else {
                const { Invoice, Amount } = item;
                const invoiceDoc = await SalesInvoiceModal.findOne({ SalesInvoice: Invoice });

                if (invoiceDoc) {
                    const currentRemaining = parseFloat(invoiceDoc.RemainingAmount || 0);
                    const amountToRestore = parseFloat(Amount || 0);

                    invoiceDoc.RemainingAmount = currentRemaining + amountToRestore;
                    if (invoiceDoc.RemainingAmount > 0) {
                        invoiceDoc.status = "Open";
                    }
                    console.log(invoiceDoc)
                    await invoiceDoc.save();
                }
            }
        }

        // ✅ Delete cheque AFTER restoring all invoices
        await CustomerChqRecivedModal.findByIdAndDelete(id);

        res.status(200).json({ message: "Cheque deleted and amounts restored successfully" });

    } catch (error) {
        console.error("Error restoring invoice amounts:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};



export const getCustomerChq = async (req, res) => {
    try {
        const CustomerChq = await CustomerChqRecivedModal.find();
        console.log(CustomerChq)
        res.status(200).json({ data: CustomerChq });
    } catch (error) {
        res.status(500).json({ message: "Error fetching cheque books", error: error.message });
    }
}

export const getLastChqRef = async (req, res) => {
    try {
        const data = await CustomerChqRecivedModal.find().sort({ _id: -1 }).limit(1)
        res.status(200).json({ data: data });

    } catch (err) {
        res.status(500).json({ message: "Error fetching cheque books", error: err });

    }
}


export const updateCustomerChq = async (req, res) => {
    const { id } = req.params
    console.log(id)
    const { ChqDate, Customer, table, grouped, invoiceArray } = req.body;

    try {
        const invalidInvoices = [];

        // Check each invoice against its RemainingAmount
        for (const item of invoiceArray) {
            const invoiceNumber = item.invoice;
            const amountToApply = parseFloat(item.Amount);

            const invoice = await SalesInvoiceModal.findOne({ SalesInvoice: invoiceNumber });

            if (!invoice) {
                invalidInvoices.push({
                    invoice: invoiceNumber,
                    reason: "Invoice not found"
                });
                continue;
            }

            if (amountToApply > invoice.RemainingAmount) {
                invalidInvoices.push({
                    invoice: invoiceNumber,
                    reason: `Amount ${amountToApply} exceeds remaining ${invoice.RemainingAmount}`
                });
            }
        }

        // If any invoice has an issue, return error response
        if (invalidInvoices.length > 0) {
            return res.status(400).json({
                message: "One or more invoices have invalid amounts",
                invalidInvoices
            });
        }
        else {
            const data = await CustomerChqRecivedModal.findByIdAndUpdate(id, req.body)
            res.status(200).send({ data: data, Status: true })
        }


    } catch (err) {
        res.status(500).json({ message: "Some Thing Went Wrong", error: err });

    }
}



export const upDateCustomerChqStatus = async (req, res) => {
    const { chqNumber, Status, invoiceArray, date } = req.body;
    const { id } = req.params;
    const findGroupInvArr = []
    try {
        const chqBook = await CustomerChqRecivedModal.findById(id);

        if (!chqBook) {
            return res.status(404).json({ message: "Cheque book not found" });
        }
        for (const item of req.body) {
            const findTable = chqBook.table.find((ta) => ta.chq == item.chq);
            if (findTable) {
                findTable.staus = item.Status;
                findTable.remarks2 = item.remarks2      // use staus (same as DB field)
                findTable.RealizationDate = item.date
            }

            // --- Update grouped -> items ---
            const findGroup = chqBook.grouped.find((g) =>
                g.chq == item.chq
            );
            if (findGroup) {
                for (const Gr of findGroup.items) {
                    console.log(Gr, "Gr")
                    findGroup.status = item.Status
                    Gr.staus = item.Status
                    Gr.remarks2 = item.remarks2
                    Gr.RealizationDate = item.date
                    findGroup.remarks2 = item.remarks2
                    findGroup.RealizationDate = item.date

                    await CustomerChqRecivedModal.findByIdAndUpdate(chqBook._id, chqBook)
                }
            }
            const invalidInvoices = []
            findGroupInvArr.push(findGroup.items.map((item) => ({
                Type: item.Type,
                Inv: item.Invoice,
                Amount: item.Amount
            }))
            )
        }
        for (const item of findGroupInvArr[0]) {
            if (item.Type === "Opening") {

                const AllOpeningInvoice = await InvoiceOpeningModal.findOne();

                if (!AllOpeningInvoice) continue;

                const Inv = AllOpeningInvoice.InvoiceData.find((In) => In.Invoice == item.Inv);
                if (!Inv) continue;

                // Convert to numbers
                const remainingAmountNum = parseFloat(Inv.RemaingAmount || 0);
                const amountToRestore = parseFloat(item.Amount || 0);

                // Add back the amount
                Inv.RemaingAmount = (remainingAmountNum + amountToRestore).toString();
                console.log(Inv.RemaingAmount, "RemaingAmount")
                // Reset status if any balance is left
                if (parseFloat(Inv.RemaingAmount) == 0) {
                    Inv.status = "Open";
                }

                await InvoiceOpeningModal.findByIdAndUpdate(AllOpeningInvoice._id, { InvoiceData: AllOpeningInvoice.InvoiceData })
            } else {

                const { Inv, Amount } = item;
                const invoiceDoc = await SalesInvoiceModal.findOne({ SalesInvoice: Inv });

                if (invoiceDoc) {
                    const currentRemaining = parseFloat(invoiceDoc.RemainingAmount || 0);
                    const amountToRestore = parseFloat(Amount || 0);

                    invoiceDoc.RemainingAmount = currentRemaining + amountToRestore;

                    if (invoiceDoc.RemainingAmount > 0) {
                        invoiceDoc.status = "Open";
                    }
                    console.log(invoiceDoc, "invoiceDoc")
                    await invoiceDoc.save();
                }
            }
        }
        res.status(200).send("voucher post successfully")



    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Error updating cheque status", error: error.message });
    }
};

export const getChqNumberData = async (req, res) => {
    const { chq } = req.params;

    const chqString = String(chq);
    const chqNumber = Number(chq);

    try {
        const data = await CustomerChqRecivedModal.find({
            grouped: {
                $elemMatch: {
                    chq: { $in: [chqString, chqNumber] }
                }
            }
        });

        if (data.length === 0) {
            const alldata = await CustomerChqRecivedModal.find({
                "grouped.items.chq": { $in: [chqString, chqNumber] }
            });

            return res.status(200).json({ message: "Your cheque", data: alldata });
        }

        res.status(200).json({ message: "Your cheque", data });
    } catch (err) {
        console.error("Error while searching:", err);
        res.status(500).json({ message: "Server error", err });
    }
};


export const updateChqItems = async (req, res) => {
    const updates = req.body; // array of objects

    try {
        for (const item of updates) {
            const { id, chq, inv, RecivedDate, remarks2, status } = item;

            await CustomerChqRecivedModal.updateOne(
                {
                    _id: id,
                    "grouped.items": {
                        $elemMatch: {
                            chq: chq,
                            Invoice: inv
                        }
                    }
                },
                {
                    $set: {
                        "grouped.$[].items.$[item].RealizeDate": RecivedDate,
                        "grouped.$[].items.$[item].remarks2": remarks2,
                        "grouped.$[].items.$[item].Status": status
                    }
                },
                {
                    arrayFilters: [
                        { "item.chq": chq, "item.Invoice": inv }
                    ]
                }
            );
        }

        res.status(200).json({ message: "Cheque items updated successfully" });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "Error updating cheque items", err });
    }
};


export const getOnlyUnused = async (req, res) => {
    try {

        const data = await CustomerChqRecivedModal.find()

        // Flatten grouped cheques with customer reference
        const allGrouped = data.flatMap((doc) =>
            (doc.grouped || []).map((group) => ({
                Customer: doc.Customer,
                id: doc._id,
                chq: group.chq,
                status: group.status,
                items: group.items || [],
            }))
        );

        // Flatten again to individual items
        const allItems = allGrouped.flatMap((g) =>
            g.items.map((item) => ({
                ...item,
                Customer: g.Customer,
                id: g.id,
                chq: g.chq,
                status: item.status,
                staus: item.staus
            }))
        );

        // Filter only Pending
        const onlyPending = allItems.filter(item => {
            const status = item.status || item.staus; // handle typo once

            return (

                status !== "Bounce" &&
                status !== "Realize" &&
                status !== "Reject" &&
                status !== "Clear" &&
                status !== "ReturntoCustomer" &&
                status !== "Return to customer"
            );
        }).filter((val) => val.staus !== "Return to customer").filter((chq) => chq.staus !== "Bounce").filter((re) => re.staus !== "Realize").filter((ret) => ret.staus !== "ReturntoCustomer")
            .filter((val) => val.staus !== "Clear").filter((val) => val.staus !== "Reject")
            ;

        const filterChq = onlyPending.filter((item) => item.Chq === "")

        res.send(onlyPending);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err.message });
    }
};

export const ChqReports = async (req, res) => {
    try {
        const { startdate, endDate, DateType } = req.query;
        console.log(startdate, endDate, DateType);

        let data = [];

        if (DateType == "ChqDate") {
            // ✅ Simple find with date range
            data = await CustomerChqRecivedModal.find({
                ChqDate: {
                    $gte: startdate,
                    $lte: endDate
                }
            });
        }
        else if (DateType == "RealizeDate") {
            // ✅ Find documents where any grouped item has RealizeDate in range
            data = await CustomerChqRecivedModal.find({
                "grouped.RealizeDate": {
                    $gte: startdate,
                    $lte: endDate
                }
            });
        }
        else if (DateType == "DepositOrReturn") {
            data = await CustomerChqRecivedModal.find({
                "grouped.DepositOrReturn": {
                    $gte: startdate,
                    $lte: endDate,
                    $ne: "",
                    $exists: true
                }
            });
        }
        else if (DateType == "RecOrRejectDate") {
            data = await CustomerChqRecivedModal.find({
                "grouped.RecOrRejectDate": {
                    $gte: startdate,
                    $lte: endDate
                }
            });
        }
        else {
            // Default: filter by items field
            data = await CustomerChqRecivedModal.find({
                [`grouped.items.${DateType}`]: {
                    $gte: startdate,
                    $lte: endDate
                }
            });
        }

        console.log(data.length, "Filtered Data Length");

        // ==========================
        // ✅ SAFE TRANSFORM DATA
        // ==========================
        let allItems = [];

        data.forEach((doc) => {
            // ✅ Safely handle grouped
            const groups = Array.isArray(doc.grouped) ? doc.grouped : [doc.grouped];

            groups.forEach((group) => {
                // ✅ Safely handle items
                const items = Array.isArray(group?.items) ? group.items : [group?.items];

                items.forEach((item) => {
                    if (item) {  // Skip if item is undefined
                        allItems.push({
                            ...item,
                            Customer: doc.Customer || '',
                            RcvdCode: doc.code || '',
                            RealizationDate: group?.RealizeDate || '',
                            DepositOrReturn: group?.DepositOrReturn || '',
                            RecOrRejectDate: group?.RecOrRejectDate || '',
                            Date: doc.ChqDate || '',
                            Bank: group?.Bank || '',
                            id: doc._id || '',
                            chq: group?.chq || '',
                            status: group?.status || '',
                            groupedStatus: group?.status || '',
                            itemStatus: item?.status || ''
                        });
                    }
                });
            });
        });

        console.log("Total items:", allItems.length);
        res.send(allItems);

    } catch (err) {
        console.error("❌ Error in ChqReports:", err);
        res.status(500).send({
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
};
export const updateChqDate = async (req, res) => {
    try {
        const cheques = await CustomerChqRecivedModal.find();

        for (const item of cheques) {

            const voucher = await VoucherModal.findOne({
                "VoucharData.Chq": item.grouped[0].chq
            })


            if (!voucher) {
                console.log("No voucher found for chq:", item.grouped[0].chq);
                continue;
            }
            if (!item.grouped[0].items[0].RealizationDate) {


                // Add new key: RealizationDate
                const updated = await CustomerChqRecivedModal.findByIdAndUpdate(
                    item._id,
                    { "grouped.0.items.0.RealizationDate": voucher.VoucherDate },
                    { new: true }
                );

                console.log("Updated:", updated?._id);
            }

        }
        return res.status(200).send("RealizationDate Added");

    } catch (err) {
        console.log(err);
        return res.status(500).send("Error updating cheque dates");
    }
};


export const rejectCustomerChq = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const currentDate = new Date().toISOString().split("T")[0];
        const Admin = await AdministrativeModal.findOne().session(session);
        console.log(Admin);
        let data;
        if (id !== "cleare" && id !== "Bounce") {
            data = await CustomerChqRecivedModal.findById(id).session(session);
        }

        if (req.body.status === "Received") {

            const group = data.grouped.find(
                (item) => String(item.chq) === String(req.body.chq)
            );

            if (!group) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).send({
                    message: "Cheque group not found",
                });
            }
            group.RecOrRejectDate = currentDate;
            group.status = "Received";
            group.staus = "Received";

            const itemInv = group.items.filter(
                (item) => String(item.chq) === String(req.body.chq)
            );

            for (const item of itemInv) {
                item.status = "Received";
                item.staus = "Received";
            }

            await CustomerChqRecivedModal.findByIdAndUpdate(data._id, data, { session });

            await session.commitTransaction();
            session.endSession();

            return res.status(200).send({
                message: "Data updated successfully",
            });
        }

        if (req.body.status === "Reject") {

            const group = data.grouped.filter(
                (item) => String(item.chq) === String(req.body.chq)
            );

            if (!group.length) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).send({
                    message: "Cheque group not found",
                });
            }
            group[0].RecOrRejectDate = currentDate;
            group[0].status = "Reject";
            group[0].staus = "Reject";
            const itemInv = group[0].items.filter(
                (item) => String(item.chq) === String(req.body.chq)
            );

            for (const item of itemInv) {
                item.status = "Reject";
                item.staus = "Reject";

                if (item.Invoice !== "UnRealized") {
                    console.log(item.Invoice);

                    const invoice = await SalesInvoiceModal.findOne({ SalesInvoice: item.Invoice }).session(session);

                    invoice.RemainingAmount = Number(Number(invoice.RemainingAmount || 0) + Number(item.Amount || 0)).toFixed(2);
                    console.log(invoice);
                    await SalesInvoiceModal.findByIdAndUpdate(invoice._id, invoice, { session });
                }
            }
            await CustomerChqRecivedModal.findByIdAndUpdate(data._id, data, { session });

            await session.commitTransaction();
            session.endSession();

            return res.status(200).send({
                message: "Data updated successfully",
            });
        }

        if (req.body.status === "Deposit") {

            const group = data.grouped.find(
                (item) => String(item.chq) === String(req.body.chq)
            );

            if (!group) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).send({
                    message: "Cheque group not found",
                });
            }
            group.DepositOrReturn = currentDate;
            group.status = "Deposit";
            group.staus = "Deposit";
            group.Bank = req.body.Bank;

            const itemInv = group.items.filter(
                (item) => String(item.chq) === String(req.body.chq)
            );

            for (const item of itemInv) {
                item.status = "Deposit";
                item.staus = "Deposit";
            }
            const datares = await CustomerChqRecivedModal.findByIdAndUpdate(data._id, data, { session });
            console.log(datares);

            await session.commitTransaction();
            session.endSession();

            return res.status(200).send({
                message: "Data updated successfully",
            });
        }

        if (req.body.status === "ReturntoCustomer") {

            const group = data.grouped.find(
                (item) => String(item.chq) === String(req.body.chq)
            );

            if (!group) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).send({
                    message: "Cheque group not found",
                });
            }
            group.DepositOrReturn = currentDate;
            group.status = "ReturntoCustomer";
            group.staus = "ReturntoCustomer";

            const itemInv = group.items.filter(
                (item) => String(item.chq) === String(req.body.chq)
            );

            for (const item of itemInv) {
                item.status = "ReturntoCustomer";
                item.staus = "ReturntoCustomer";
                if (item.Invoice !== "UnRealized") {

                    const invoice = await SalesInvoiceModal.findOne({ SalesInvoice: item.Invoice }).session(session);
                    console.log(invoice);
                    invoice.RemainingAmount = Number(Number(invoice.RemainingAmount || 0) + Number(item.Amount || 0)).toFixed(2);
                    console.log(invoice);
                    await SalesInvoiceModal.findByIdAndUpdate(invoice._id, invoice, { session });
                }
            }
            console.log(data, "data");
            await CustomerChqRecivedModal.findByIdAndUpdate(data._id, data, { session });

            await session.commitTransaction();
            session.endSession();

            return res.status(200).send({
                message: "Data updated successfully",
            });
        }

        if (req.body.status === "Bounce") {
            // ==========================
            // 1. VALIDATION
            // ==========================
            const chqs = req.body.chqItems || [];
            if (!chqs.length) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).send({
                    message: "No cheque items found."
                });
            }

            const monthCheck = await checkMonthClose(req, res, "Date");
            if (monthCheck) {
                await session.abortTransaction();
                session.endSession();
                return;
            }

            const currentDate = req.body.Date || new Date().toISOString().split('T')[0];

            // ==========================
            // 2. PROCESS ALL CHEQUE ITEMS (LIKE CLEAR)
            // ==========================
            const invoiceMap = new Map();
            const chequeGroups = new Map();

            for (const cheque of chqs) {
                const chequeRecord = await CustomerChqRecivedModal.findById(cheque._id).session(session);
                if (!chequeRecord) {
                    console.log(`⚠️ Cheque record not found for ID: ${cheque._id}`);
                    continue;
                }

                const chequeData = chequeRecord.grouped.filter(
                    item => String(item.chq) === String(cheque.chq)
                );

                if (!chequeData.length) {
                    console.log(`⚠️ Cheque number ${cheque.chq} not found in record ${cheque._id}`);
                    continue;
                }

                if (!chequeGroups.has(cheque._id)) {
                    chequeGroups.set(cheque._id, {
                        data: chequeRecord,
                        chequeData: chequeData
                    });
                }

                for (const item of chequeData) {
                    for (const group of item.items || []) {
                        group.status = "Bounce";
                        group.staus = "Bounce";

                        if (group.Invoice && group.Invoice !== "UnRealized") {
                            const invoiceNo = group.Invoice;

                            if (!invoiceMap.has(invoiceNo)) {
                                invoiceMap.set(invoiceNo, Number(group.Amount || 0));
                            }
                        }
                    }

                    item.RealizeDate = currentDate;
                    item.status = "Bounce";
                    item.staus = "Bounce";
                }
            }

            // ==========================
            // 3. UPDATE INVOICES (RESTORE REMAINING AMOUNT)
            // ==========================
            for (const [invoiceNo, amountToAdd] of invoiceMap) {
                const invoice = await SalesInvoiceModal.findOne({
                    SalesInvoice: invoiceNo
                }).session(session);

                if (!invoice) {
                    console.log(`⚠️ Invoice ${invoiceNo} not found`);
                } else {
                    const currentRemaining = Number(invoice.RemainingAmount || 0);
                    const newRemaining = currentRemaining + amountToAdd;

                    invoice.RemainingAmount = Number(newRemaining.toFixed(2));

                    await SalesInvoiceModal.findByIdAndUpdate(
                        invoice._id,
                        { RemainingAmount: invoice.RemainingAmount },
                        { session }
                    );

                    console.log(`✅ Invoice ${invoiceNo}: Remaining ${currentRemaining} → ${newRemaining.toFixed(2)} (Added: ${amountToAdd})`);
                }

                const opening = await InvoiceOpeningModal.findOne().session(session);
                if (opening) {
                    const openingInv = opening.InvoiceData.find(
                        inv => String(inv.Invoice) === String(invoiceNo)
                    );

                    if (openingInv) {
                        const currentRemaining = Number(openingInv.RemainingAmount || 0);
                        const newRemaining = currentRemaining + amountToAdd;

                        openingInv.RemainingAmount = Number(newRemaining.toFixed(2));

                        await InvoiceOpeningModal.findByIdAndUpdate(
                            opening._id,
                            { InvoiceData: opening.InvoiceData },
                            { session }
                        );

                        console.log(`✅ Opening Invoice ${invoiceNo}: Remaining ${currentRemaining} → ${newRemaining.toFixed(2)} (Added: ${amountToAdd})`);
                    } else {
                        console.log(`⚠️ Invoice ${invoiceNo} not found in Opening`);
                    }
                }
            }

            // ==========================
            // 4. SAVE ALL CHEQUE RECORDS
            // ==========================
            for (const [, chequeDataObj] of chequeGroups) {
                const { data: chequeRecord } = chequeDataObj;

                await CustomerChqRecivedModal.findByIdAndUpdate(
                    chequeRecord._id,
                    {
                        grouped: chequeRecord.grouped,
                        status: "Bounce"
                    },
                    { session }
                );
            }

            await session.commitTransaction();
            session.endSession();

            // ==========================
            // 5. SUCCESS RESPONSE
            // ==========================
            return res.status(200).send({
                message: "Cheque(s) bounced successfully",
                invoicesUpdated: Array.from(invoiceMap.entries()).map(([inv, amount]) => ({
                    invoice: inv,
                    amountAdded: amount
                }))
            });
        }

        if (req.body.status === "Clear") {
            // ==========================
            // 1. VALIDATION
            // ==========================
            const chqs = req.body.chqItems || [];
            if (!chqs.length) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).send({
                    message: "No cheque items found."
                });
            }

            const monthCheck = await checkMonthClose(req, res, "Date");
            if (monthCheck) {
                await session.abortTransaction();
                session.endSession();
                return;
            }

            const currentDate = req.body.Date || new Date().toISOString().split('T')[0];

            // ==========================
            // 2. CALCULATE TOTAL AMOUNT & UNIQUE INVOICES
            // ==========================
            let totalAmount = 0;
            const invoiceMap = new Map();
            const unrealizedMap = new Map();
            const chequeGroups = new Map();

            for (const cheque of chqs) {
                const chequeRecord = await CustomerChqRecivedModal.findById(cheque._id).session(session);
                if (!chequeRecord) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(404).send({
                        message: `Cheque record not found for ID: ${cheque._id}`
                    });
                }

                const chequeData = chequeRecord.grouped.filter(
                    item => String(item.chq) === String(cheque.chq)
                );

                if (!chequeData.length) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(404).send({
                        message: `Cheque number ${cheque.chq} not found in record`
                    });
                }

                if (!chequeGroups.has(cheque._id)) {
                    chequeGroups.set(cheque._id, {
                        data: chequeRecord,
                        chequeData: chequeData
                    });
                }

                for (const item of chequeData) {
                    for (const group of item.items || []) {
                        totalAmount += Number(group.Amount || 0);

                        if (group.Invoice && group.Invoice !== "UnRealized") {
                            const invoiceKey = group.Invoice;

                            if (!invoiceMap.has(invoiceKey)) {
                                invoiceMap.set(invoiceKey, {
                                    amount: Number(group.Amount || 0),
                                    invoiceRef: group.invoiceRef || group.Invoice,
                                    chequeNo: cheque.chq,
                                    customer: chequeRecord.Customer,
                                    store: chequeRecord.Store || 0,
                                    account: group.Account || Admin.Client
                                });
                            }
                        } else if (group.Invoice === "UnRealized") {
                            const unrealizedKey = `${cheque.chq}_${chequeRecord.Customer}_${group.Amount}`;

                            if (!unrealizedMap.has(unrealizedKey)) {
                                unrealizedMap.set(unrealizedKey, {
                                    amount: Number(group.Amount || 0),
                                    chequeNo: cheque.chq,
                                    customer: chequeRecord.Customer,
                                    store: chequeRecord.Store || 0,
                                    account: group.Account || Admin.Client,
                                    invoice: "UnRealized"
                                });
                            }
                        }
                    }
                }
            }

            // ==========================
            // 3. GET BANK & CHEQUE DETAILS
            // ==========================
            const firstItem = chqs[0];
            const chqNo = firstItem.chq;
            const bank = firstItem.originalDoc?.Bank;

            if (!bank) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).send({
                    message: "Bank not found in cheque data"
                });
            }

            // ==========================
            // 4. GENERATE VOUCHER NUMBER
            // ==========================
            const date = new Date(req.body.Date || new Date());
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");

            const VoucherType = "BR";
            const prefix = `${VoucherType}${year}${month}`;

            const lastVoucher = await VoucherModal.findOne({
                VoucherType,
                VoucherNumber: { $regex: `^${prefix}` }
            }).sort({ VoucherNumber: -1 }).session(session);

            let serial = 1;
            if (lastVoucher?.VoucherNumber) {
                const lastSerial = parseInt(
                    lastVoucher.VoucherNumber.replace(prefix, ""),
                    10
                );
                serial = isNaN(lastSerial) ? 1 : lastSerial + 1;
            }

            const nextCode = `${prefix}${String(serial).padStart(4, "0")}`;

            // ==========================
            // 5. CREATE VOUCHER ENTRIES
            // ==========================
            const voucherEntries = [];

            for (const [invoiceNo, invoiceData] of invoiceMap) {
                voucherEntries.push({
                    Narration: `Cheque ${invoiceData.chequeNo} cleared against Invoice ${invoiceNo}`,
                    Credit: invoiceData.amount.toString(),
                    Store: invoiceData.store,
                    Chq: invoiceData.chequeNo,
                    Account: invoiceData.account || Admin.Client,
                    Client: invoiceData.customer,
                    ClientRef2: invoiceNo,
                    Type: "Current"
                });
            }

            for (const [, unrealizedData] of unrealizedMap) {
                voucherEntries.push({
                    Narration: `Cheque ${unrealizedData.chequeNo} cleared against UnRealized invoice`,
                    Credit: unrealizedData.amount.toString(),
                    Store: unrealizedData.store,
                    Chq: unrealizedData.chequeNo,
                    Account: unrealizedData.account || Admin.Client,
                    Client: unrealizedData.customer,
                    ClientRef2: "UnRealized",
                    Type: "Current"
                });
            }

            const totalDebit = voucherEntries.reduce((sum, row) => sum + (Number(row.Credit) || 0), 0);

            voucherEntries.push({
                Narration: `Cheque ${chqNo} cleared from customer`,
                Debit: totalDebit.toString(),
                Store: req.body.Store || 0,
                Chq: chqNo,
                Account: bank,
                Type: "Current"
            });

            // ==========================
            // 6. CREATE VOUCHER
            // ==========================
            const voucher = await VoucherModal.create([{
                VoucherType,
                VoucherNumber: nextCode,
                VoucherDate: req.body.Date || currentDate,
                VoucherMainAccount: bank,
                status: "Post",
                VoucharData: voucherEntries
            }], { session });

            // ==========================
            // 7. UPDATE INVOICES (ONLY FOR REALIZED INVOICES)
            // ==========================
            for (const [invoiceNo, invoiceData] of invoiceMap) {
                const amountToAdd = invoiceData.amount;

                const invoice = await SalesInvoiceModal.findOne({
                    SalesInvoice: invoiceNo
                }).session(session);

                if (invoice) {
                    const currentRecived = Number(invoice.RecivedAmount || 0);
                    const newRecived = currentRecived + amountToAdd;

                    invoice.RecivedAmount = newRecived.toFixed(2);
                    await SalesInvoiceModal.findByIdAndUpdate(
                        invoice._id,
                        { RecivedAmount: invoice.RecivedAmount },
                        { session }
                    );

                    console.log(`✅ Invoice ${invoiceNo}: ${currentRecived} + ${amountToAdd} = ${newRecived}`);
                } else {
                    console.log(`⚠️ Invoice ${invoiceNo} not found in SalesInvoiceModal`);
                }

                const opening = await InvoiceOpeningModal.findOne().session(session);
                if (opening) {
                    const openingInv = opening.InvoiceData.find(
                        inv => String(inv.Invoice) === String(invoiceNo)
                    );

                    if (openingInv) {
                        const currentRecived = Number(openingInv.RecivedAmount || 0);
                        const newRecived = currentRecived + amountToAdd;

                        openingInv.RecivedAmount = newRecived.toFixed(2);
                        await InvoiceOpeningModal.findByIdAndUpdate(
                            opening._id,
                            { InvoiceData: opening.InvoiceData },
                            { session }
                        );

                        console.log(`✅ Opening Invoice ${invoiceNo}: ${currentRecived} + ${amountToAdd} = ${newRecived}`);
                    } else {
                        console.log(`⚠️ Invoice ${invoiceNo} not found in InvoiceOpeningModal`);
                    }
                }
            }

            // ==========================
            // 8. UPDATE CHEQUE STATUS
            // ==========================
            for (const [, chequeDataObj] of chequeGroups) {
                const { data: chequeRecord, chequeData } = chequeDataObj;

                for (const item of chequeData) {
                    item.status = "Clear";
                    item.staus = "Clear";
                    item.RealizeDate = currentDate;
                    item.RecOrRejectDate = currentDate;
                    item.DepositOrReturn = currentDate;

                    for (const group of item.items || []) {
                        group.status = "Clear";
                        group.staus = "Clear";
                    }
                }

                await CustomerChqRecivedModal.findByIdAndUpdate(
                    chequeRecord._id,
                    {
                        grouped: chequeRecord.grouped,
                        status: "Clear"
                    },
                    { session }
                );
            }

            await session.commitTransaction();
            session.endSession();

            // ==========================
            // 9. SUCCESS RESPONSE
            // ==========================
            const allInvoices = [
                ...Array.from(invoiceMap.entries()).map(([inv, invData]) => ({
                    invoice: inv,
                    amount: invData.amount,
                    type: "Realized"
                })),
                ...Array.from(unrealizedMap.entries()).map(([, unrealData]) => ({
                    invoice: "UnRealized",
                    amount: unrealData.amount,
                    type: "UnRealized"
                }))
            ];

            return res.status(200).send({
                message: "Cheque cleared successfully.",
                voucherNumber: nextCode,
                totalAmount: totalAmount,
                invoicesUpdated: Array.from(invoiceMap.keys()),
                unrealizedEntries: unrealizedMap.size,
                invoiceDetails: allInvoices
            });
        }

        // No matching status branch was hit — nothing to commit, release the session.
        await session.abortTransaction();
        session.endSession();
        return res.status(400).send({
            message: "Invalid status",
        });

    } catch (err) {
        console.log(err);

        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        return res.status(500).send({
            message: "Server Error",
            error: err.message,
        });
    }
};




// export const rejectCustomerChq = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const currentDate = new Date().toISOString().split("T")[0];
//         const Admin = await AdministrativeModal.findOne();
//         console.log(Admin);
//         let data
//         if (id !== "cleare" && id !== "Bounce") {
//             data = await CustomerChqRecivedModal.findById(id);
//         }


//         if (req.body.status === "Received") {

//             const group = data.grouped.find(
//                 (item) => String(item.chq) === String(req.body.chq)
//             );

//             if (!group) {
//                 return res.status(404).send({
//                     message: "Cheque group not found",
//                 });
//             }
//             group.RecOrRejectDate = currentDate
//             group.status = "Received";
//             group.staus = "Received";

//             const itemInv = group.items.filter(
//                 (item) => String(item.chq) === String(req.body.chq)
//             );

//             for (const item of itemInv) {
//                 item.status = "Received";
//                 item.staus = "Received";
//             }




//             const datares = await CustomerChqRecivedModal.findByIdAndUpdate(data._id, data)

//             return res.status(200).send({
//                 message: "Data updated successfully",
//             });
//         }

//         if (req.body.status === "Reject") {

//             const group = data.grouped.filter(
//                 (item) => String(item.chq) === String(req.body.chq)
//             );

//             if (!group) {
//                 return res.status(404).send({
//                     message: "Cheque group not found",
//                 });
//             }
//             group.RecOrRejectDate = currentDate
//             group.status = "Reject";
//             group.staus = "Reject";
//             const itemInv = group[0].items.filter(
//                 (item) => String(item.chq) === String(req.body.chq)
//             );

//             for (const item of itemInv) {
//                 item.status = "Reject";
//                 item.staus = "Reject";

//                 if (item.Invoice !== "UnRealized") {
//                     console.log(item.Invoice)

//                     const invoice = await SalesInvoiceModal.findOne({ SalesInvoice: item.Invoice })

//                     invoice.RemainingAmount = Number(Number(invoice.RemainingAmount || 0) + Number(item.Amount || 0)).toFixed(2)
//                     console.log(invoice)
//                     await SalesInvoiceModal.findByIdAndUpdate(invoice._id, invoice)
//                 }
//             }
//             const datares = await CustomerChqRecivedModal.findByIdAndUpdate(data._id, data)

//             return res.status(200).send({
//                 message: "Data updated successfully",
//             });
//         }


//         if (req.body.status === "Deposit") {
//             try {


//                 const group = data.grouped.find(
//                     (item) => String(item.chq) === String(req.body.chq)
//                 );

//                 if (!group) {
//                     return res.status(404).send({
//                         message: "Cheque group not found",
//                     });
//                 }
//                 group.DepositOrReturn = currentDate
//                 group.status = "Deposit";
//                 group.staus = "Deposit";
//                 group.Bank = req.body.Bank;

//                 const itemInv = group.items.filter(
//                     (item) => String(item.chq) === String(req.body.chq)
//                 );

//                 for (const item of itemInv) {
//                     item.status = "Deposit";
//                     item.staus = "Deposit";
//                 }
//                 const datares = await CustomerChqRecivedModal.findByIdAndUpdate(data._id, data)
//                 console.log(datares)
//                 res.status(200).send({
//                     message: "Data updated successfully",
//                 });
//             }
//             catch (err) {
//                 console.log(err)
//             }
//         }

//         if (req.body.status === "ReturntoCustomer") {

//             const group = data.grouped.find(
//                 (item) => String(item.chq) === String(req.body.chq)
//             );

//             if (!group) {
//                 return res.status(404).send({
//                     message: "Cheque group not found",
//                 });
//             }
//             group.DepositOrReturn = currentDate
//             group.status = "ReturntoCustomer";
//             group.staus = "ReturntoCustomer";

//             const itemInv = group.items.filter(
//                 (item) => String(item.chq) === String(req.body.chq)
//             );

//             for (const item of itemInv) {
//                 item.status = "ReturntoCustomer";
//                 item.staus = "ReturntoCustomer";
//                 if (item.Invoice !== "UnRealized") {

//                     const invoice = await SalesInvoiceModal.findOne({ SalesInvoice: item.Invoice })
//                     console.log(invoice)
//                     invoice.RemainingAmount = Number(Number(invoice.RemainingAmount || 0) + Number(item.Amount || 0)).toFixed(2)
//                     console.log(invoice)
//                     await SalesInvoiceModal.findByIdAndUpdate(invoice._id, invoice)
//                 }
//             }
//             console.log(data, "data")
//             const datares = await CustomerChqRecivedModal.findByIdAndUpdate(data._id, data)

//             return res.status(200).send({
//                 message: "Data updated successfully",
//             });
//         }
//         if (req.body.status === "Bounce") {
//             try {
//                 // ==========================
//                 // 1. VALIDATION
//                 // ==========================
//                 const chqs = req.body.chqItems || [];
//                 if (!chqs.length) {
//                     return res.status(400).send({
//                         message: "No cheque items found."
//                     });
//                 }

//                 const monthCheck = await checkMonthClose(req, res, "Date");
//                 if (monthCheck) return;

//                 const currentDate = req.body.Date || new Date().toISOString().split('T')[0];

//                 // ==========================
//                 // 2. PROCESS ALL CHEQUE ITEMS (LIKE CLEAR)
//                 // ==========================
//                 const invoiceMap = new Map();
//                 const chequeGroups = new Map();

//                 for (const cheque of chqs) {
//                     const data = await CustomerChqRecivedModal.findById(cheque._id);
//                     if (!data) {
//                         console.log(`⚠️ Cheque record not found for ID: ${cheque._id}`);
//                         continue;
//                     }

//                     // Find matching cheque in grouped array
//                     const chequeData = data.grouped.filter(
//                         item => String(item.chq) === String(cheque.chq)
//                     );

//                     if (!chequeData.length) {
//                         console.log(`⚠️ Cheque number ${cheque.chq} not found in record ${cheque._id}`);
//                         continue;
//                     }

//                     // Store for later update
//                     if (!chequeGroups.has(cheque._id)) {
//                         chequeGroups.set(cheque._id, {
//                             data: data,
//                             chequeData: chequeData
//                         });
//                     }

//                     // Process each item in cheque
//                     for (const item of chequeData) {
//                         for (const group of item.items || []) {
//                             // Update status
//                             group.status = "Bounce";
//                             group.staus = "Bounce";

//                             // Track invoices for amount restoration
//                             if (group.Invoice && group.Invoice !== "UnRealized") {
//                                 const invoiceNo = group.Invoice;

//                                 if (!invoiceMap.has(invoiceNo)) {
//                                     invoiceMap.set(invoiceNo, Number(group.Amount || 0));
//                                 }
//                                 // Don't accumulate - each unique invoice gets its amount restored once
//                             }
//                         }

//                         // Update group status
//                         item.RealizeDate = currentDate;
//                         item.status = "Bounce";
//                         item.staus = "Bounce";
//                     }
//                 }

//                 // ==========================
//                 // 3. UPDATE INVOICES (RESTORE REMINING AMOUNT)
//                 // ==========================
//                 const updatePromises = [];

//                 for (const [invoiceNo, amountToAdd] of invoiceMap) {
//                     // ✅ Update Sales Invoice RemainingAmount (Increase)
//                     const updateSalesInvoice = async () => {
//                         const invoice = await SalesInvoiceModal.findOne({
//                             SalesInvoice: invoiceNo
//                         });

//                         if (!invoice) {
//                             console.log(`⚠️ Invoice ${invoiceNo} not found`);
//                             return;
//                         }

//                         const currentRemaining = Number(invoice.RemainingAmount || 0);
//                         const newRemaining = currentRemaining + amountToAdd;

//                         invoice.RemainingAmount = Number(newRemaining.toFixed(2));

//                         await SalesInvoiceModal.findByIdAndUpdate(
//                             invoice._id,
//                             { RemainingAmount: invoice.RemainingAmount }
//                         );

//                         console.log(`✅ Invoice ${invoiceNo}: Remaining ${currentRemaining} → ${newRemaining.toFixed(2)} (Added: ${amountToAdd})`);
//                     };

//                     // ✅ Update Opening Invoice RemainingAmount (Increase)
//                     const updateOpeningInvoice = async () => {
//                         const opening = await InvoiceOpeningModal.findOne();
//                         if (!opening) return;

//                         const openingInv = opening.InvoiceData.find(
//                             inv => String(inv.Invoice) === String(invoiceNo)
//                         );

//                         if (!openingInv) {
//                             console.log(`⚠️ Invoice ${invoiceNo} not found in Opening`);
//                             return;
//                         }

//                         const currentRemaining = Number(openingInv.RemainingAmount || 0);
//                         const newRemaining = currentRemaining + amountToAdd;

//                         openingInv.RemainingAmount = Number(newRemaining.toFixed(2));

//                         await InvoiceOpeningModal.findByIdAndUpdate(
//                             opening._id,
//                             { InvoiceData: opening.InvoiceData }
//                         );

//                         console.log(`✅ Opening Invoice ${invoiceNo}: Remaining ${currentRemaining} → ${newRemaining.toFixed(2)} (Added: ${amountToAdd})`);
//                     };

//                     updatePromises.push(updateSalesInvoice());
//                     updatePromises.push(updateOpeningInvoice());
//                 }

//                 await Promise.all(updatePromises);

//                 // ==========================
//                 // 4. SAVE ALL CHEQUE RECORDS
//                 // ==========================
//                 for (const [chequeId, chequeDataObj] of chequeGroups) {
//                     const { data, chequeData } = chequeDataObj;

//                     await CustomerChqRecivedModal.findByIdAndUpdate(
//                         data._id,
//                         {
//                             grouped: data.grouped,
//                             status: "Bounce"
//                         }
//                     );
//                 }

//                 // ==========================
//                 // 5. SUCCESS RESPONSE
//                 // ==========================
//                 return res.status(200).send({
//                     message: "Cheque(s) bounced successfully",
//                     invoicesUpdated: Array.from(invoiceMap.entries()).map(([inv, amount]) => ({
//                         invoice: inv,
//                         amountAdded: amount
//                     }))
//                 });

//             } catch (err) {
//                 console.error("ERROR in cheque bounce:", err);

//                 return res.status(500).send({
//                     message: "Failed to bounce cheque: " + err.message,
//                     stack: process.env.NODE_ENV === "development" ? err.stack : undefined
//                 });
//             }
//         }
//         if (req.body.status === "Clear") {
//             try {
//                 // ==========================
//                 // 1. VALIDATION
//                 // ==========================
//                 const chqs = req.body.chqItems || [];
//                 if (!chqs.length) {
//                     return res.status(400).send({
//                         message: "No cheque items found."
//                     });
//                 }

//                 const monthCheck = await checkMonthClose(req, res, "Date");
//                 if (monthCheck) return;

//                 const currentDate = req.body.Date || new Date().toISOString().split('T')[0];

//                 // ==========================
//                 // 2. CALCULATE TOTAL AMOUNT & UNIQUE INVOICES
//                 // ==========================
//                 let totalAmount = 0;
//                 const invoiceMap = new Map(); // Store individual invoice amounts
//                 const unrealizedMap = new Map(); // ✅ NEW: Store UnRealized entries separately
//                 const chequeGroups = new Map(); // Store cheque groups

//                 for (const cheque of chqs) {
//                     const data = await CustomerChqRecivedModal.findById(cheque._id);
//                     if (!data) {
//                         return res.status(404).send({
//                             message: `Cheque record not found for ID: ${cheque._id}`
//                         });
//                     }

//                     // Find matching cheque in grouped array
//                     const chequeData = data.grouped.filter(
//                         item => String(item.chq) === String(cheque.chq)
//                     );

//                     if (!chequeData.length) {
//                         return res.status(404).send({
//                             message: `Cheque number ${cheque.chq} not found in record`
//                         });
//                     }

//                     // Store for later update
//                     if (!chequeGroups.has(cheque._id)) {
//                         chequeGroups.set(cheque._id, {
//                             data: data,
//                             chequeData: chequeData
//                         });
//                     }

//                     // Process each item in cheque
//                     for (const item of chequeData) {
//                         for (const group of item.items || []) {
//                             // Add to total amount
//                             totalAmount += Number(group.Amount || 0);

//                             // ✅ FIX: Handle both Realized and UnRealized invoices
//                             if (group.Invoice && group.Invoice !== "UnRealized") {
//                                 const invoiceKey = group.Invoice;

//                                 if (!invoiceMap.has(invoiceKey)) {
//                                     invoiceMap.set(invoiceKey, {
//                                         amount: Number(group.Amount || 0),
//                                         invoiceRef: group.invoiceRef || group.Invoice,
//                                         chequeNo: cheque.chq,
//                                         customer: data.Customer,
//                                         store: data.Store || 0,
//                                         account: group.Account || Admin.Client // Include account
//                                     });
//                                 }
//                             } else if (group.Invoice === "UnRealized") {
//                                 // ✅ NEW: Store UnRealized entries with unique key
//                                 const unrealizedKey = `${cheque.chq}_${data.Customer}_${group.Amount}`;

//                                 if (!unrealizedMap.has(unrealizedKey)) {
//                                     unrealizedMap.set(unrealizedKey, {
//                                         amount: Number(group.Amount || 0),
//                                         chequeNo: cheque.chq,
//                                         customer: data.Customer,
//                                         store: data.Store || 0,
//                                         account: group.Account || Admin.Client,
//                                         invoice: "UnRealized"
//                                     });
//                                 }
//                             }
//                         }
//                     }
//                 }

//                 // ==========================
//                 // 3. GET BANK & CHEQUE DETAILS
//                 // ==========================
//                 const firstItem = chqs[0];
//                 const chqNo = firstItem.chq;
//                 const bank = firstItem.originalDoc?.Bank;

//                 if (!bank) {
//                     return res.status(404).send({
//                         message: "Bank not found in cheque data"
//                     });
//                 }

//                 // ==========================
//                 // 4. GENERATE VOUCHER NUMBER
//                 // ==========================
//                 const date = new Date(req.body.Date || new Date());
//                 const year = date.getFullYear();
//                 const month = String(date.getMonth() + 1).padStart(2, "0");

//                 const VoucherType = "BR";
//                 const prefix = `${VoucherType}${year}${month}`;

//                 const lastVoucher = await VoucherModal.findOne({
//                     VoucherType,
//                     VoucherNumber: { $regex: `^${prefix}` }
//                 }).sort({ VoucherNumber: -1 });

//                 let serial = 1;
//                 if (lastVoucher?.VoucherNumber) {
//                     const lastSerial = parseInt(
//                         lastVoucher.VoucherNumber.replace(prefix, ""),
//                         10
//                     );
//                     serial = isNaN(lastSerial) ? 1 : lastSerial + 1;
//                 }

//                 const nextCode = `${prefix}${String(serial).padStart(4, "0")}`;

//                 // ==========================
//                 // 5. CREATE VOUCHER ENTRIES
//                 // ==========================
//                 const voucherEntries = [];

//                 // ✅ FIX: Add credit entries for ALL invoices (both Realized and UnRealized)

//                 // 5a. Credit Entries for Realized Invoices
//                 for (const [invoiceNo, invoiceData] of invoiceMap) {
//                     voucherEntries.push({
//                         Narration: `Cheque ${invoiceData.chequeNo} cleared against Invoice ${invoiceNo}`,
//                         Credit: invoiceData.amount.toString(),
//                         Store: invoiceData.store,
//                         Chq: invoiceData.chequeNo,
//                         Account: invoiceData.account || Admin.Client,
//                         Client: invoiceData.customer,
//                         ClientRef2: invoiceNo,
//                         Type: "Current"
//                     });
//                 }

//                 // 5b. ✅ NEW: Credit Entries for UnRealized Invoices
//                 for (const [key, unrealizedData] of unrealizedMap) {
//                     voucherEntries.push({
//                         Narration: `Cheque ${unrealizedData.chequeNo} cleared against UnRealized invoice`,
//                         Credit: unrealizedData.amount.toString(),
//                         Store: unrealizedData.store,
//                         Chq: unrealizedData.chequeNo,
//                         Account: unrealizedData.account || Admin.Client,
//                         Client: unrealizedData.customer,
//                         ClientRef2: "UnRealized",
//                         Type: "Current"
//                     });
//                 }

//                 // Calculate total debit
//                 const totalDebit = voucherEntries.reduce((sum, row) => sum + (Number(row.Credit) || 0), 0);

//                 // 5c. Debit Entry (Single Bank Entry)
//                 voucherEntries.push({
//                     Narration: `Cheque ${chqNo} cleared from customer`,
//                     Debit: totalDebit.toString(),
//                     Store: req.body.Store || 0,
//                     Chq: chqNo,
//                     Account: bank,
//                     Type: "Current"
//                 });

//                 // ==========================
//                 // 6. CREATE VOUCHER
//                 // ==========================
//                 const voucher = await VoucherModal.create({
//                     VoucherType,
//                     VoucherNumber: nextCode,
//                     VoucherDate: req.body.Date || currentDate,
//                     VoucherMainAccount: bank,
//                     status: "Post",
//                     VoucharData: voucherEntries
//                 });

//                 // ==========================
//                 // 7. UPDATE INVOICES (ONLY FOR REALIZED INVOICES)
//                 // ==========================
//                 const updatePromises = [];

//                 for (const [invoiceNo, invoiceData] of invoiceMap) {
//                     const amountToAdd = invoiceData.amount;

//                     // Update Sales Invoice
//                     const updateSalesInvoice = async () => {
//                         const invoice = await SalesInvoiceModal.findOne({
//                             SalesInvoice: invoiceNo
//                         });

//                         if (invoice) {
//                             const currentRecived = Number(invoice.RecivedAmount || 0);
//                             const newRecived = currentRecived + amountToAdd;

//                             invoice.RecivedAmount = newRecived.toFixed(2);
//                             await SalesInvoiceModal.findByIdAndUpdate(
//                                 invoice._id,
//                                 { RecivedAmount: invoice.RecivedAmount }
//                             );

//                             console.log(`✅ Invoice ${invoiceNo}: ${currentRecived} + ${amountToAdd} = ${newRecived}`);
//                         } else {
//                             console.log(`⚠️ Invoice ${invoiceNo} not found in SalesInvoiceModal`);
//                         }
//                     };

//                     // Update Opening Invoice
//                     const updateOpeningInvoice = async () => {
//                         const opening = await InvoiceOpeningModal.findOne();
//                         if (opening) {
//                             const openingInv = opening.InvoiceData.find(
//                                 inv => String(inv.Invoice) === String(invoiceNo)
//                             );

//                             if (openingInv) {
//                                 const currentRecived = Number(openingInv.RecivedAmount || 0);
//                                 const newRecived = currentRecived + amountToAdd;

//                                 openingInv.RecivedAmount = newRecived.toFixed(2);
//                                 await InvoiceOpeningModal.findByIdAndUpdate(
//                                     opening._id,
//                                     { InvoiceData: opening.InvoiceData }
//                                 );

//                                 console.log(`✅ Opening Invoice ${invoiceNo}: ${currentRecived} + ${amountToAdd} = ${newRecived}`);
//                             } else {
//                                 console.log(`⚠️ Invoice ${invoiceNo} not found in InvoiceOpeningModal`);
//                             }
//                         }
//                     };

//                     updatePromises.push(updateSalesInvoice());
//                     updatePromises.push(updateOpeningInvoice());
//                 }

//                 await Promise.all(updatePromises);

//                 // ==========================
//                 // 8. UPDATE CHEQUE STATUS
//                 // ==========================
//                 for (const [chequeId, chequeDataObj] of chequeGroups) {
//                     const { data, chequeData } = chequeDataObj;

//                     // Update all items in grouped array
//                     for (const item of chequeData) {
//                         item.status = "Clear";
//                         item.staus = "Clear";
//                         item.RealizeDate = currentDate;
//                         item.RecOrRejectDate = currentDate;
//                         item.DepositOrReturn = currentDate;

//                         // Update individual items
//                         for (const group of item.items || []) {
//                             group.status = "Clear";
//                             group.staus = "Clear";
//                         }
//                     }

//                     // Save updated cheque record
//                     await CustomerChqRecivedModal.findByIdAndUpdate(
//                         data._id,
//                         {
//                             grouped: data.grouped,
//                             status: "Clear"
//                         }
//                     );
//                 }

//                 // ==========================
//                 // 9. SUCCESS RESPONSE
//                 // ==========================
//                 // Prepare response details
//                 const allInvoices = [
//                     ...Array.from(invoiceMap.entries()).map(([inv, data]) => ({
//                         invoice: inv,
//                         amount: data.amount,
//                         type: "Realized"
//                     })),
//                     ...Array.from(unrealizedMap.entries()).map(([key, data]) => ({
//                         invoice: "UnRealized",
//                         amount: data.amount,
//                         type: "UnRealized"
//                     }))
//                 ];

//                 return res.status(200).send({
//                     message: "Cheque cleared successfully.",
//                     voucherNumber: nextCode,
//                     totalAmount: totalAmount,
//                     invoicesUpdated: Array.from(invoiceMap.keys()),
//                     unrealizedEntries: unrealizedMap.size,
//                     invoiceDetails: allInvoices
//                 });

//             } catch (err) {
//                 console.error("ERROR in cheque clearance:", err);

//                 return res.status(500).send({
//                     message: "Failed to clear cheque: " + err.message,
//                     stack: process.env.NODE_ENV === "development" ? err.stack : undefined
//                 });
//             }
//         }
//     } catch (err) {
//         console.log(err);

//         return res.status(500).send({
//             message: "Server Error",
//             error: err.message,
//         });
//     }
// };


