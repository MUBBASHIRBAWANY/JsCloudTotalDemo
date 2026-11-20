import DistrbutorModal from "../modal/DistributerModal.js"
import { comparePassword, getAuthontication, hashPassword } from "../modal/UserModal.js";
import jwt from "jsonwebtoken";


export const CreateDistrbutor = async (req, res) => {

    try {
        const { DistrbutorSystemCode, Password } = req.body
        const findCode = await DistrbutorModal.findOne({ DistrbutorSystemCode: DistrbutorSystemCode })
        
        const allData = {
            ...req.body,
        }
        if (findCode) {
            const updateDitributor = await DistrbutorModal.findByIdAndUpdate(findCode._id, allData)
            res.status(200).send(updateDitributor)
        } else {
            const data = await DistrbutorModal.create(allData)
            res.status(200).send(data)
        }





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

export const DistrbutorLogin = async (req, res) => {
    try {
        const { firstname, password } = req.body;
        console.log(firstname, password)
        if (!firstname || !password) {
            return res.status(400).send("All fields are required");
        }

        const user = await DistrbutorModal.findOne({ LoginID  : firstname}).select("+Password");
        
        if (!user) {
            return res.status(400).send("Invalid UserName or password");
        }
        console.log(user.LoginID ,  user.Password)
        const isValidPassword = await comparePassword(password, user.Password);
        console.log(isValidPassword)
        if (!isValidPassword) {
            return res.status(400).send("Invalid email or password");
        }

        const token = await getAuthontication(user);
        
        res.cookie("token", token);
        res.send({
            data: {
                status: "success",
                token: token
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
};

export const DistrbutorProfile = async (req, res) => {

    try {
        
        const token = req.body.authorization

        if (!token) {
            return res.status(403).send("Invalid Token");

        }

        jwt.verify(token, "peral-Dynamic", (err, decoded) => {
            if (err) {

                return res.status(403).send("Invalid Token");

            }
            res.status(200).send({ status: true, data: decoded });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
};