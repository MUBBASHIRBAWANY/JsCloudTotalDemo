import ZoneModal from "../Modal/ZoneModal.js";

export const CreateZone = async (req, res) => {
    try {
        const data = await ZoneModal.create(req.body)
        res.status(200).send("data Add")
    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}

export const updateZone = async (req, res) => {
    const { id } = req.params
    try {
        const data = await ZoneModal.findByIdAndUpdate(id, req.body)
        res.status(200).send("Data Edit")
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllZone = async (req, res) => {
    try {
        const data = await ZoneModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}
export const getLastZoneCode = async (req, res) => {
    try {
        const LastZoneCode = await ZoneModal.findOne().sort({ _id: -1 }).limit(1)
        console.log(LastZoneCode)
        res.send({ status: true, data: LastZoneCode });
    } catch (err) {
        console.log(err)
    }
}


export const deleteZone = async (req, res) => {
    const { id } = req.params
    try {
        const data = await ZoneModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const PushBulkDataInZone = async (req, res) => {

    try {
        const insertedIds = [];

        for (const item of req.body) {
            console.log(item.Region)
           const code = await  ZoneModal.find().sort({ _id: -1 }).limit(1);
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
            const newCategory = new ZoneModal({
                ZoneName: item.ZoneName,
                code: nextCode,
            });

            const savedItem = await newCategory.save();
            insertedIds.push(savedItem._id);
            console.log(`Inserted: ${item.ZoneName}`);
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

