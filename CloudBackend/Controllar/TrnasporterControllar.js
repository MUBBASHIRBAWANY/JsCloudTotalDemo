import TransporterModal from "../Modal/TransporterModal.js";

export const CreateTransporter = async (req, res) => {
    try {
        const data = await TransporterModal.create(req.body)
        res.status(200).send("data Add")
    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}

export const updateTransporter = async (req, res) => {
    const { id } = req.params
    try {
        const data = await TransporterModal.findByIdAndUpdate(id, req.body)
        res.status(200).send("Data Edit")
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllTransporter = async (req, res) => {
    try {
        const data = await TransporterModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}
export const getLastTransporterCode = async (req, res) => {
    try {
        const LastTransporterCode = await TransporterModal.findOne().sort({ _id: -1 }).limit(1)
        console.log(LastTransporterCode)
        res.send({ status: true, data: LastTransporterCode });
    } catch (err) {
        console.log(err)
    }
}


export const deleteTransporter = async (req, res) => {
    const { id } = req.params
    try {
        const data = await TransporterModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const PushBulkDataInTransporter = async (req, res) => {

    try {
        const insertedIds = [];

        for (const item of req.body) {
           const code = await TransporterModal.find().sort({ _id: -1 }).limit(1)
           console.log(code)
            let nextCode
            if (code.length == 0) {
                const nextNumber = parseInt("00", 10) + 1;
                nextCode = nextNumber.toString().padStart(2, '0')
            }
            else {
                const nextNumber = parseInt(code[0].code, 10) + 1;
                nextCode = nextNumber.toString().padStart(2, '0')
            }

            if (nextCode == "100") {
                res.status(500).send({
                    status: false,
                    message: 'Failed to fetch categories',
                    error: err.message
                });
            }

            const newCategory = new TransporterModal({
                TransporterName: item.TransporterName,
                code: nextCode,
                
            });

            const savedItem = await newCategory.save();
            insertedIds.push(savedItem._id);
            console.log(`Inserted: ${item.TransporterName}`);
        }
        res.status(200).send({
            status: true,
            data: "Data Add"
        });
        console.log('All documents inserted successfully!');
        return insertedIds;
    } catch (error) {
        console.error('Error inserting documents:', error.message);
        throw error;
    }
};



