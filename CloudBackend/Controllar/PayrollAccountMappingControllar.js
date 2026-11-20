import PayrollAccountMapping from "../modal/PayrollAccountMapping.js";
import { hrmsCatch } from "../utils/hrmsError.js";


export const getMapping = async (req, res) => {
    try {
        const mapping = await PayrollAccountMapping.findOne();
        res.status(200).send({ status: true, data: mapping || {} });
    } catch (err) {
        return hrmsCatch(res, err, "Mapping load failed", "The mapping could not be loaded. Please try again.");
    }
};

export const upsertMapping = async (req, res) => {
    try {
        const mapping = await PayrollAccountMapping.findOneAndUpdate(
            {},
            req.body,
            { new: true, upsert: true }
        );
        res.status(200).send({ status: true, data: mapping });
    } catch (err) {
        return hrmsCatch(res, err, "Upsert mapping failed", "The upsert mapping could not be completed. Please try again.");
    }
};
