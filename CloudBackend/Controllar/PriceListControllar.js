import PriceListModal from "../modal/PriceListModal.js"
import ShceemModal from "../modal/ScheemModal.js";

export const CreatePriceList = async (req, res) => {

    try {
        const PriceListNumber = await PriceListModal.find().sort({ _id: -1 }).limit(1)
        let nextNumber;

        if (PriceListNumber.length === 0) {
            nextNumber = `001`
        } else {
            let nextPriceListNumber = (parseInt(PriceListNumber[0].PriceListNumber) + 1)
            console.log(nextPriceListNumber)
            nextNumber = `${nextPriceListNumber.toString().padStart(3, '0')}`;
        }

        const AllData = {
            ...req.body,
            PriceListNumber: nextNumber
        }
        const data = await PriceListModal.create(AllData)
        res.status(200).send(data)
    }
    catch (err) {
        res.status(400).send(err)
    }
}


export const GetPriceList = async (req, res) => {

    try {
        const data = await PriceListModal.find({PriceListStatus : "Active"})
        res.status(200).send(data)
    }
    catch (err) {
        res.status(400).send(err)
    }
}


export const GetALLPriceList = async (req, res) => {

    try {
        const data = await PriceListModal.find()
        res.status(200).send(data)
    }
    catch (err) {
        res.status(400).send(err)
    }
}
export const AddSchemeToPriceList = async (req, res) => {
    try {
        const { priceLists, products, startDate, endDate, schemeData } = req.body

        if (!priceLists || priceLists.length === 0) {
            return res.status(400).json({ message: "Please select at least one Price List" })
        }
        if (!products || products.length === 0) {
            return res.status(400).json({ message: "Please select at least one Product" })
        }

        // Build lookup: `${priceListId}_${productId}` -> scheme row
        const schemeMap = {}
        ;(schemeData || []).forEach((item) => {
            schemeMap[`${item.priceListId}_${item.productId}`] = item
        })

        const updated = []
        for (const plId of priceLists) {
            const pl = await PriceListModal.findById(plId)
            if (!pl) continue

            const PriceListData = (pl.PriceListData || []).map((row) => {
                const scheme = schemeMap[`${plId}_${row.product}`]
                if (!scheme) return row

                const TPSale = Number(scheme.TPSale ?? row.TPSale ?? 0)
                const TO = Number(scheme.TO ?? row.TO ?? 0)
                const DisPer = Number(scheme.DisPer ?? row.DisPer ?? 0)
                const ClaimableSpecialTO = Number(scheme.ClaimableSpecialTO ?? 0)
                const UnClaimableSpecialTO = Number(scheme.UnClaimableSpecialTO ?? 0)
                const SpecialTO = ClaimableSpecialTO + UnClaimableSpecialTO
                const base = TPSale - TO - SpecialTO
                const NetSale = base - (base * DisPer) / 100

                return {
                    ...row,
                    ClaimableSpecialTO,
                    UnClaimableSpecialTO,
                    SpecialTO,
                    NetSale: Number(NetSale.toFixed(2)),
                    SchemeStartDate: scheme.SchemeStartDate || startDate || pl.SchemeDateFrom || "",
                    SchemeEndDate: scheme.SchemeEndDate || endDate || pl.SchemeDateTo || "",
                }
            })

            const data = await PriceListModal.findByIdAndUpdate(
                plId,
                {
                    SchemeDateFrom: startDate || pl.SchemeDateFrom,
                    SchemeDateTo: endDate || pl.SchemeDateTo,
                    PriceListData,
                },
                { new: true }
            )
            updated.push(data)
        }
        const createScheem =  await ShceemModal.create(req.body)
        res.status(200).json({ message: "Scheme added successfully", data: updated })
    } catch (err) {
        console.error(err)
        res.status(400).json({ message: err.message })
    }
}


export const updatePRiceList = async (req, res) => {
    try {
        const { id } = req.params;

        const updatedData = await PriceListModal.findByIdAndUpdate(
            id,
            req.body,
            { new: true } // return updated document
        );

        if (!updatedData) {
            return res.status(404).json({ message: "Price list not found" });
        }

        res.status(200).json(updatedData);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};
