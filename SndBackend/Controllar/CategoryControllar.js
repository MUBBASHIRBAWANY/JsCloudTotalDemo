import CategoryModal from "../modal/CategoryModal.js";

export const getAllCategory = async (req, res) => {
    try {
        const data = await CategoryModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}

export const CreateCategory = async (req, res) => {
    try {
        const { CodeRef } = req.body
        const findRef = await CategoryModal.findOne({ CodeRef: CodeRef })
        if (findRef) {
            
            const data = await CategoryModal.findByIdAndUpdate(findRef._id , req.body)
            res.status(200).send("data Add")
        } else {
            const data = await CategoryModal.create(req.body)
            res.status(200).send("data Add")

        }
    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}