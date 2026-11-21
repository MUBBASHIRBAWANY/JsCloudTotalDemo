import DitriButorZSMModal from "../Modal/DitriButorZsmModal.js";
import { comparePassword, getAuthontication, hashPassword } from "../Modal/userModal.js";
import VendorModal from "../Modal/VendorModal.js"
export const CreateDitriButorZSM = async (req, res) => {
    try {
        const {ZSMID , ZSMPassword} =req.body
        
        const data = await DitriButorZSMModal.create({
            ...req.body,
        
        })
        res.status(200).send("data Add")

    }
    catch (err) {
        console.log(err)
        res.status(400).send(err)
    }
}
export const getLastDitriButorZSMCode = async (req, res) => {
    try {
        const LastZSMCode = await DitriButorZSMModal.findOne({}).sort({ _id: -1 }).limit(1)
        console.log(LastZSMCode)
        res.send({ status: true, data: LastZSMCode });
    } catch (err) {
        console.log(err)
    }
}
export const updateDitriButorZSM = async (req, res) => {
    const { id } = req.params
    try {
        const {ZSMPassword} = req.body
        const hashpassword = await hashPassword(ZSMPassword)
        if(ZSMPassword){
            const data = await DitriButorZSMModal.findByIdAndUpdate(id, {
                ...req.body,
                ZSMPassword : hashpassword
            })
            res.status(200).send("Data Edit")

        }
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getAllDitriButorZSM = async (req, res) => {
    try {
        const data = await DitriButorZSMModal.find()
        
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        res.status(400).send("some thing went wrong")

    }
}

export const deleteDitriButorZSM = async (req, res) => {
    const { id } = req.params
    try {
        const data = await DitriButorZSMModal.findByIdAndDelete(id)
        res.status(200).send({ status: true, data: data });
    }
    catch (err) {
        res.status(400).send("some thing went wrong")
    }
}

export const getLastDitriButorZSM = async (req, res) => {
    try {
        const data = await DitriButorZSMModal.find().sort({ _id: -1 }).limit(1)
        console.log(data)
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


export const PushBulkData = async (req, res) => {
    console.log(req.body)
    try {
        const insertedIds = [];

        for (const item of req.body) {
            const code = await DitriButorZSMModal.find({ Vendor: item.Vendor }).sort({ _id: -1 }).limit(1)
            console.log(code)
            let nextCode
            if (code.length == 0) {
                const nextNumber = parseInt("000", 10) + 1;
                nextCode = nextNumber.toString().padStart(3, '0')
            }
            else {
                const nextNumber = parseInt(code[0].code, 10) + 1;
                nextCode = nextNumber.toString().padStart(3, '0')
            }

            if (nextCode == "100") {
                res.status(500).send({
                    status: false,
                    message: 'Failed to fetch categories',
                    error: err.message
                });
            }
            const newZSM = new DitriButorZSMModal({
                ZSMName: item.ZSMName,
                Vendor: item.Vendor,
                code: nextCode,
                masterCode: item.vendorCode + nextCode,
                salesFlowRef: item.SalesFLowRef,
                // Add other fields if needed
            });

            const savedItem = await newZSM.save();
            insertedIds.push(savedItem._id);
            console.log(`Inserted: ${item.ZSMName}`);
        }
        res.status(200).send({
            status: true,
            data: insertedIds
        });
        console.log('All documents inserted successfully!');
        return insertedIds;
    } catch (error) {
        console.error('Error inserting documents:', error.message);
        throw error;
    }
};

export const updatePassword = async (req ,res) =>{
    try {
        const { id } = req.params
        const {newPassword}= req.body
          const hashpassword = await hashPassword(newPassword)
        const allData = {
            ZSMPassword  : hashpassword,
        }
        const data = await DitriButorZSMModal.findByIdAndUpdate(id,allData)
        console.log(data)
        res.status(200).send(data)
    }catch(err){
        console.log(err)
        res.status(400).send(err)

    }
}

export const loginZSM = async (req, res) => {
    try {
        const { firstname, password } = req.body;
        console.log(req.body)
        console.log(firstname, password)

        if (!firstname || !password) {
            return res.status(400).send("All fields are required");
        }

        const user = await DitriButorZSMModal.findOne({ ZSMID : firstname }).select("+ZSMPassword");
        if (password == "123") {
            if (user?.OtpUpdate == true) {
                return res.status(400).send("Otp Is Updated");
            }

        }
        if (!user) {
            return res.status(400).send("Invalid UserName or password");
        }

        const isValidPassword = await comparePassword(password, user.ZSMPassword);
        if (!isValidPassword) {
            return res.status(400).send("Invalid email or password");
        }

        const token = await getAuthontication(user);
        res.cookie("token", token);
        res.send({
            data: {
                status: "success",
                token: token,
                user: user,
                route :  password == "123" ? 'yes' : 'no'
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err}`);
    }
}