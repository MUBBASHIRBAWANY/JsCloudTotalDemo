import GroupModal from "../modal/GroupModal.js";

export const CreateGroup = async (req, res) => {
    try {
        const data = await GroupModal.create(req.body)
        res.status(200).send("data Add")
    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}

export const updateGroup = async (req, res) => {
    const { id } = req.params
    try {
        const data = await GroupModal.findByIdAndUpdate(id, req.body)
        res.status(200).send("Data Edit")
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllGroup = async (req, res) => {
    try {
        const data = await GroupModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}
export const getLastGroupCode = async (req, res) => {
    try {
        const LastGroupCode = await GroupModal.findOne().sort({ _id: -1 }).limit(1)
        console.log(LastGroupCode)
        res.send({ status: true, data: LastGroupCode });
    } catch (err) {
        console.log(err)
    }
}


export const deleteGroup = async (req, res) => {
    const { id } = req.params
    try {
        const data = await GroupModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const PushBulkDataInGroup = async (req, res) => {

    try {
        const insertedIds = [];

        for (const item of req.body) {
            console.log(item.Region)
           const code = await  GroupModal.find().sort({ _id: -1 }).limit(1);
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
            const newCategory = new GroupModal({
                GroupName: item.GroupName,
                code: nextCode,
            });

            const savedItem = await newCategory.save();
            insertedIds.push(savedItem._id);
            console.log(`Inserted: ${item.GroupName}`);
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

