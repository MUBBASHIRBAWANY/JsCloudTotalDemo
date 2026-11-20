import PriceListModal from "../modal/PriceListModal.js"

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


export const CreatePriceListFromCloud = async (req, res) => {

    try {
        const {id} = req.body
        const findData = await PriceListModal.findById(id)
        if(findData){
            await PriceListModal.findByIdAndUpdate(id , req.body)
        }
        else{

            const data = await PriceListModal.create(req.body)
        }
        res.status(200).send(findData)
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
