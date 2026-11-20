import SalesInvoiceModal from "../modal/SalesInvoiceModal.js";

export const CreditRealize = async (req, res) => {
    try {
        const { Credit , Invoice } = req.body;
        
        const newRealize = await SalesInvoiceModal.findOneAndUpdate({SalesInvoice : Invoice}, {
            RemainingAmount : Credit,
        } )
        res.status(200).send({ message: "Realize Credit Successfully", data: newRealize });
        
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }
}


