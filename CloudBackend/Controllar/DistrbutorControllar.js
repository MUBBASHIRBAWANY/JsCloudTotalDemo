import DistrbutorModal from "../Modal/DistributerModal.js"
import { hashPassword } from "../Modal/userModal.js";

export const CreateDistrbutor = async (req, res) => {

    try {
        const { Password } = req.body
        console.log(Password)
        let hashPassword1
        if (Password) {
             hashPassword1 = await hashPassword(Password);
        }

        const code = await DistrbutorModal.find().sort({ _id: -1 }).limit(1)
        let nextCode

        if (code.length == 0) {
            const nextNumber = parseInt("00", 10) + 1;
            nextCode = nextNumber.toString().padStart(3, '0')
        }
        else {
            console.log(code)
            const nextNumber = parseInt(code[0].DistrbutorSystemCode, 10) + 1;
            nextCode = nextNumber.toString().padStart(3, '0')
        }
        const allData = {
            ...req.body,
            DistrbutorSystemCode: nextCode,
            Password: hashPassword1,

        }
        const data = await DistrbutorModal.create(allData)
        res.status(200).send(data)



    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

export const UpdateDistrbutor = async (req, res) => {

    try {
        const { id } = req.params
        const { Password } = req.body
        console.log(id)
        let allData = []
        if (Password) {
            const hashPassword1 = await hashPassword(Password);
            allData = {
                ...req.body,
                Password: hashPassword1
            }
        } else {
            allData = req.body
        }

        const data = await DistrbutorModal.findByIdAndUpdate(id, allData)
        res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

export const GetAllDistrbutor = async (req, res) => {

    try {
        const data = await DistrbutorModal.find()
        res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

export const DeleteDistrbutor = async (req, res) => {

    try {
        const { id } = req.params
        const data = await DistrbutorModal.findByIdAndDelete(id)
        res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

export const BulkDistrbutorAdd = async (req, res) => {
  try {
    const  data  = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: "Invalid data format" });
    }

    // Auto system code (optional)
    const finalData = data.map((item, index) => ({
      ...item,
      DistrbutorSystemCode: `DST-${Date.now()}-${index}`,
      Status: "Active",
    }));

    await DistrbutorModal.insertMany(finalData);

    res.status(201).json({
      message: "Bulk Distributor Added Successfully",
      count: finalData.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Bulk Insert Failed" });
  }
};

export const DistrbutorNameId = async (req, res) => {

    try {
        const data = await DistrbutorModal.find().select({DistrbutorName : 1, OldCode : 1, OrderBooker : 1 , City : 1})
        res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}

export const DistrbutorByOrderBooker = async (req,res)=>{
    try{
        const {OrderBooker} = req.params

      const data = await DistrbutorModal.find({OrderBooker : OrderBooker})
        res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}
