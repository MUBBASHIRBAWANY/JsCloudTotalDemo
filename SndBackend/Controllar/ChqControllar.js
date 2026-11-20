import mongoose from "mongoose"
import CashModal from "../modal/CashModal.js"
import ChqModal from "../modal/ChqModal.js"
import SalesInvoiceModal from "../modal/SalesInvoiceModal.js"

export const getPendingcustomerChq = async (req, res) => {
    try {
        const { Distrbutor } = req.params
        const data = await ChqModal.find({ Distrbutor: Distrbutor, Status: "Pending" })
        res.status(200).send({
            "success": true,
            data: data
        })
    }
    catch (err) {
        res.status(400).send({
            "success": false,
            data: err
        })
    }
}

export const getcustomerChq = async (req, res) => {
    try {
        const { Distrbutor, Status } = req.query
        const data = []
        if (Status !== "All") {
            data = await ChqModal.find({ Distrbutor: Distrbutor, Status: Status })
        }
        data = await ChqModal.find({ Distrbutor: Distrbutor })
        res.Status(200).send({
            "success": true,
            data: data
        })
    }
    catch (err) {
        res.Status(400).send({
            "success": false,
            data: err
        })
    }
}


export const CreateChq = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { Amount, DisSalesInvoice } = req.body;
        console.log(req.body);

        let data;

        await session.withTransaction(async () => {
            const Inv = await SalesInvoiceModal.findOne({ DisSalesInvoice: DisSalesInvoice }).session(session);
            if (Inv) {
                Inv.Remaining = Inv.Remaining - Amount,
                    Inv.Recived = Inv.Recived - Amount
                await SalesInvoiceModal.findByIdAndUpdate(Inv._id, Inv, { session });
            }
            const created = await ChqModal.create([req.body], { session });
            data = created[0];
        });

        res.status(200).send({
            "success": true,
            data: data
        });
    }
    catch (err) {
        console.log(err);
        res.status(400).send({
            "success": false,
            data: err
        });
    }
    finally {
        await session.endSession();
    }
}

// export const CreateChq = async (req,res) =>{
//     try{
//         const {Amount , DisSalesInvoice} = req.body
//         console.log(req.body)
//         const Inv = await SalesInvoiceModal.findOne({DisSalesInvoice : DisSalesInvoice})
//         if(Inv){
//             Inv.Remaining =  Inv.Remaining- Amount,
//             Inv.Recived  = Inv.Recived - Amount
//             await SalesInvoiceModal.findByIdAndUpdate(Inv._id ,Inv)
//         }
//         const data = await ChqModal.create(req.body)
//         res.status(200).send({
//             "success": true,
//             data : data
//         })
//     }
//     catch(err){
//         console.log(err)
//         res.status(400).send({
//             "success": false,
//             data : err
//         })
//     }
// }


export const CreatCash = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { Amount, DisSalesInvoice } = req.body
        console.log(req.body)

        let data;

        await session.withTransaction(async () => {
            const Inv = await SalesInvoiceModal.findOne({ DisSalesInvoice: DisSalesInvoice }).session(session)
            if (Inv) {
                Inv.Remaining = Inv.Remaining - Amount,
                    Inv.Recived = Inv.Recived - Amount
                await SalesInvoiceModal.findByIdAndUpdate(Inv._id, Inv, { session })
            }
            const created = await CashModal.create([req.body], { session })
            data = created[0];
        });

        res.status(200).send({
            "success": true,
            data: data
        })
    }
    catch (err) {
        console.log(err)
        res.status(400).send({
            "success": false,
            data: err
        })
    }
    finally {
        await session.endSession();
    }
}

// export const CreatCash = async (req, res) => {
//     try {
//         const { Amount, DisSalesInvoice } = req.body
//         console.log(req.body)
//         const Inv = await SalesInvoiceModal.findOne({ DisSalesInvoice: DisSalesInvoice })
//         if (Inv) {
//             Inv.Remaining = Inv.Remaining - Amount,
//                 Inv.Recived = Inv.Recived - Amount
//             await SalesInvoiceModal.findByIdAndUpdate(Inv._id, Inv)
//         }
//         const data = await CashModal.create(req.body)
//         res.status(200).send({
//             "success": true,
//             data: data
//         })
//     }
//     catch (err) {
//         console.log(err)
//         res.status(400).send({
//             "success": false,
//             data: err
//         })
//     }
// }



export const changeChqStatus = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id } = req.params;

        const { Amount, DisSalesInvoice, ReailizeDate, Status } = req.body;
        console.log(Amount, DisSalesInvoice, ReailizeDate, Status)

        let chq;

        await session.withTransaction(async () => {
            // Check if cheque bounced
            if (Status === "Bounce") {

                const Inv = await SalesInvoiceModal.findOne({
                    DisSalesInvoice: DisSalesInvoice
                }).session(session);

                if (Inv) {

                    Inv.Remaining = Number(Inv.Remaining) + Number(Amount);

                    Inv.Recived = Number(Inv.Recived) - Number(Amount);
                    console.log(Inv)
                    await SalesInvoiceModal.findByIdAndUpdate(Inv._id, Inv, { session });
                }
            }

            chq = await ChqModal.findByIdAndUpdate(
                id,
                { Status: Status, ReailizeDate: ReailizeDate },
                { new: true, session }
            );
            console.log(chq)
        });

        res.status(200).send({
            success: true,
            data: chq
        });

    } catch (err) {

        console.log(err);

        res.status(400).send({
            success: false,
            data: err
        });

    } finally {
        await session.endSession();
    }
};

// export const changeChqStatus = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const { Amount, DisSalesInvoice, ReailizeDate, Status } = req.body;
//         console.log(Amount, DisSalesInvoice, ReailizeDate, Status)

//         // Check if cheque bounced
//         if (Status === "Bounce") {

//             const Inv = await SalesInvoiceModal.findOne({
//                 DisSalesInvoice: DisSalesInvoice
//             });

//             if (Inv) {

//                 Inv.Remaining = Number(Inv.Remaining) + Number(Amount);

//                 Inv.Recived = Number(Inv.Recived) - Number(Amount);
//                 console.log(Inv)
//                 await SalesInvoiceModal.findByIdAndUpdate(Inv._id, Inv);
//             }
//         }

//         const chq = await ChqModal.findByIdAndUpdate(
//             id,
//             { Status: Status, ReailizeDate: ReailizeDate },
//             { new: true }
//         );
//         console.log(chq)
//         res.status(200).send({
//             success: true,
//             data: chq
//         });

//     } catch (err) {

//         console.log(err);

//         res.status(400).send({
//             success: false,
//             data: err
//         });

//     }
// }; 