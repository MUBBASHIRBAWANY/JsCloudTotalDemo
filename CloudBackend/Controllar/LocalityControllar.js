import CutomerModal from "../modal/CutomerModal.js";
import LocalityModal from "../modal/LocalityModal.js";

export const CreateLocality = async (req, res) => {
    try {
        const data = await LocalityModal.create(req.body)
        res.status(200).send("data Add")
    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}

export const updateLocality = async (req, res) => {
    const { id } = req.params
    try {
        const data = await LocalityModal.findByIdAndUpdate(id, req.body)
        res.status(200).send("Data Edit")
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllLocality = async (req, res) => {
    try {
        const data = await LocalityModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}
export const getLastLocalityCodeByVendor = async (req, res) => {
    const {vendor} = req.params
    try {
        const LastLocalityCode = await  LocalityModal.find({ vendor: vendor }).sort({ _id: -1 }).limit(1)
        console.log(LastLocalityCode)
        res.send({ status: true, data: LastLocalityCode });
    } catch (err) {
        console.log(err)
    }
}


export const deleteLocality = async (req, res) => {
    const { id } = req.params
    try {
        //const LocationInCustomer = await CutomerModal.find(())
        // const data = await LocalityModal.findByIdAndDelete(id)
        // res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const PushBulkDataInLocality = async (req, res) => {
    console.log(req.body)
    try {
        const insertedIds = [];

        for (const item of req.body) {
           const code = await LocalityModal.find().sort({ _id: -1 }).limit(1)
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


            const newCategory = new LocalityModal({
                LocalityName: item.LocalityName,
                code: nextCode,
                SaleFlowRef: item.salesFlowRef,
            });

            const savedItem = await newCategory.save();
            insertedIds.push(savedItem._id);
            console.log(`Inserted: ${item.LocalityName}`);
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


export const getLocalityByVendor = async (req, res) => {
    const { vendor } = req.params
    try {
        console.log(vendor)
        const data = await LocalityModal.find({ vendor: vendor });
        res.status(200).send({
            status: true,
            data: data
        });
    } catch (err) {
        console.error('Error fetching categories by vendor:', err);
        res.status(500).send({
            status: false,
            message: 'Failed to fetch categories',
            error: err.message
        });
    }
}
