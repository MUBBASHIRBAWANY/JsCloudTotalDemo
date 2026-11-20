import mongoose from "mongoose"
import BrandModal from "../modal/BrandModal.js"
import CategoryModal from "../modal/CategoryModal.js"


export const CreateBrand = async (req, res) => {
    try {
        const { CodeRef, mastercode } = req.body
        const findRef = await BrandModal.findOne({ CodeRef: CodeRef })
        if (findRef) {
            const data = await BrandModal.findByIdAndUpdate(findRef._id, req.body)
            res.status(200).send("data Add")
        }
        else {

            const Category = await CategoryModal.findOne({ mastercode: mastercode.slice(0, 4) })

            const category = new mongoose.Types.ObjectId(Category._id);
            const allData = {
                ...req.body,
                category : category.toHexString()
            }
            const data = await BrandModal.create(allData)
            res.status(200).send("data Add")
        }

    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}



export const getAllBrand = async (req, res) => {
    try {
        const data = await BrandModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}
