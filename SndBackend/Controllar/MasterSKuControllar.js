import mongoose from "mongoose";
import BrandModal from "../modal/BrandModal.js";
import MasterSKuModal from "../modal/MasterSku.js";

export const CreateMasterSKu = async (req, res) => {
    try {

         const { CodeRef, mastercode } = req.body
        const findRef = await MasterSKuModal.findOne({ CodeRef: CodeRef })
            if (findRef) {
                console.log(findRef)
                const data = await MasterSKuModal.findByIdAndUpdate(findRef._id, req.body)
                res.status(200).send("data Add")
            }
        else {

            const BrandFind = await BrandModal.findOne({ mastercode: mastercode.slice(0, 6) })

            const Brand = new mongoose.Types.ObjectId(BrandFind._id);
            const allData = {
                ...req.body,
                Brand : Brand.toHexString()
            }

            const data = await MasterSKuModal.create(allData)
            res.status(200).send("data Add")
        }

    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}

export const getAllMasterSKu = async (req, res) => {
    try {
        const data = await MasterSKuModal.find()
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}