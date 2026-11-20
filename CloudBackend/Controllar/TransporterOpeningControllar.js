import TransporterOpeningBalanceModal from "../modal/TransportesOpeningModal.js";

export const createTransporterOpening = async (req, res) => {
    try {
        const { DateStart, DateEnd, TransporterData, Status } = req.body;

        if (!DateStart || !DateEnd || !Array.isArray(TransporterData)) {
            return res.status(400).send("Missing DateStart, DateEnd or TransporterData");
        }

        const existingRecord = await TransporterOpeningBalanceModal.findOne({ DateStart, DateEnd });

        if (existingRecord) {
            existingRecord.TransporterData = existingRecord.TransporterData.concat(TransporterData);
            await existingRecord.save();
            return res.status(200).send("Transporter Opening updated on existing date record.");
        } else {
            await TransporterOpeningBalanceModal.create(req.body);
            return res.status(200).send("Transporter Opening data added successfully");
        }
    } catch (e) {
        console.log(e);
        res.status(400).send('Server Error');
    }
}

export const getAllTransporterOpening = async (req, res) => {
    try {
        const data = await TransporterOpeningBalanceModal.find();
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}

export const updateTransporterOpening = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await TransporterOpeningBalanceModal.findByIdAndUpdate(id, req.body);
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}

export const deleteTransporterOpening = async (req, res) => {
    const { id } = req.params;
    try {
        await TransporterOpeningBalanceModal.findByIdAndDelete(id);
        res.status(200).send("Transporter Opening data deleted successfully");
    } catch (err) {
        res.status(400).send("Something went wrong");
    }
}
