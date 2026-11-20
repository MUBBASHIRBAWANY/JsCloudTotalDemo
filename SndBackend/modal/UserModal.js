import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
        unique: true,
        required: true,

    },

    password: {
        type: String,
        required: true,
        select: false
    },

    Cpassword: {
        type: String,
        required: true,
        select: false
    },
    lastname: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    selectRole: {
        type: String
    },
    createdBy: {
        type: String
    },
    updatedBy: {
        type: String
    },
    createDate: {
        type: String
    },
    updateDate: {
        type: String
    },
    Location: {
        type: Array,
        default: [],
    },
    Store: {
        type: Array,
        default: [],
    },
    Vendor: {
        type: Array,
        required: true,
    },
    distributor: {
        type: String,
    },
    userType : {
        type: String,
        default: "2",
    },
    

})

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10)
}

export const comparePassword = (password, password2) => {
    return bcrypt.compare(password, password2)
}

export const getAuthontication = async function (val) {

    const token = jwt.sign({ val }, "peral-Dynamic", { expiresIn: "10 h" })

    return token
}



const userModel = mongoose.model('user', userSchema)

export default userModel