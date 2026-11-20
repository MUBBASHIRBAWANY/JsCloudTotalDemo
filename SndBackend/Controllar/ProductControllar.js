import mongoose from "mongoose"
import MasterskuModal from "../modal/MasterSku.js"
import ProductModal from "../modal/ProductModal.js"
import TotalProductModal from "../modal/TotalProductModal.js"

/** Product ids that have TotalQuantity > 0 (optionally for one distributor). */
const inStockProductIds = async (distributorId) => {
    const match = { TotalQuantity: { $gt: 0 } };
    const dist = String(distributorId || "").trim();
    if (dist) match.Distrbutor = dist;

    const rows = await TotalProductModal.find(match).select("ProductName").lean();
    const ids = [];
    for (const row of rows) {
        const id = String(row.ProductName || "").trim();
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            ids.push(new mongoose.Types.ObjectId(id));
        }
    }
    return [...new Map(ids.map((id) => [String(id), id])).values()];
};


export const createProduct = async (req, res) => {
    try {
        const { CodeRef, mastercode } = req.body
        const findRef = await ProductModal.findOne({ CodeRef: CodeRef })
        if (findRef) {
            const data = await ProductModal.findByIdAndUpdate(findRef._id, req.body)
            res.status(200).send("data Add")
        }
        {

            const Masterskufind = await MasterskuModal.findOne({ mastercode: mastercode.slice(0, 9) })

            const Mastersku = new mongoose.Types.ObjectId(Masterskufind._id);
            const allData = {
                ...req.body,
                MasterSKu: Mastersku.toHexString()
            }

            const data = await ProductModal.create(allData)
            res.status(200).send("data Add")
        }
    }
    catch (err) {
        console.log(err)
        res.status(400).send("some thing went wrong")
    }
}

export const getAllProduct = async (req, res) => {
    try {
        const stockIds = await inStockProductIds(req.query?.Distrbutor || req.query?.Distributor);
        const data = stockIds.length
            ? await ProductModal.find({ _id: { $in: stockIds } })
            : [];
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}
export const getProductNameId = async (req, res) =>{
    try {
        const stockIds = await inStockProductIds(req.query?.Distrbutor || req.query?.Distributor);
        const data = stockIds.length
            ? await ProductModal.find(
                { _id: { $in: stockIds } },
                { ProductName: 1, code : 1 , salesFlowRef : 1, mastercode : 1 , CodeRef : 1, GRAM : 1, SaleType : 1 , HSCODE : 1 , SaleType : 1 , PcsinBox : 1, isForSND : 1 , BoxinCarton : 1},
            )
            : [];
        
        res.status(200).send({
            status: true,
            data: data
        });
    } catch (err) {
        console.error('Error fetching product names:', err);
        res.status(500).send({
            status: false,
            message: 'Failed to fetch product names',
            error: err.message
        });
    }
}

