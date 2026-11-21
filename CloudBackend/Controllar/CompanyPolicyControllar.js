import CompanyPolicyModal from "../Modal/CompanyPolicyModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const getCompanyPolicy = async (req, res) => {
    try {
        let data = await CompanyPolicyModal.findOne()
        if (!data) {
            data = await CompanyPolicyModal.create({})
        }
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Company policy load failed", "The company policy could not be loaded. Please try again.");
    }
}

export const updateCompanyPolicy = async (req, res) => {
    try {
        let data = await CompanyPolicyModal.findOne()
        if (data) {
            data = await CompanyPolicyModal.findByIdAndUpdate(data._id, req.body, { new: true })
        } else {
            data = await CompanyPolicyModal.create(req.body)
        }
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Company policy update failed", "The company policy could not be updated. Please try again.");
    }
}
