import CityModal from "../Modal/CityModal.js";

export const CreateCity = async (req, res) => {
    try {
        const data = await CityModal.create(req.body)
        res.status(200).send("data Add")
    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}

export const updateCity = async (req, res) => {
    const { id } = req.params
    try {
        const data = await CityModal.findByIdAndUpdate(id, req.body)
        res.status(200).send("Data Edit")
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllCity = async (req, res) => {
    try {
        const data = await CityModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}
export const getLastCityCode = async (req, res) => {
    try {
        const LastCityCode = await CityModal.findOne().sort({ _id: -1 }).limit(1)
        console.log(LastCityCode)
        res.send({ status: true, data: LastCityCode });
    } catch (err) {
        console.log(err)
    }
}


export const deleteCity = async (req, res) => {
    const { id } = req.params
    try {
        const data = await CityModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const PushBulkDataInCity = async (req, res) => {

    try {
        const insertedIds = [];

        for (const item of req.body) {
           const code = await CityModal.find().sort({ _id: -1 }).limit(1)
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

            const newCategory = new CityModal({
                CityName: item.CityName,
                code: nextCode,
                
            });

            const savedItem = await newCategory.save();
            insertedIds.push(savedItem._id);
            console.log(`Inserted: ${item.CityName}`);
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



