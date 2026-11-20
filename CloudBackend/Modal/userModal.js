import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
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
    email: {
        type: String
    },
    isBoss: {
        type: mongoose.Schema.Types.Mixed
    },
    selectRole: {
        type: String
    },
    Roles: {
        type: Array,
        default: [],
    },
    permissionsAssigned: {
        type: Boolean,
        default: false,
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
        required: true,
    },
    Store: {
        type: Array,
        required: true,
    },
    Vendor: {
        type: Array,
        required: true,
    },
    Subsection: {
        type: Array,
        
    },
    Section: {
        type: Array,
        required: true,
    },
    userType : {
        type: String,
        required: true,
    },
    userCloseMonth :{
        type : Array
    },
    ChartOfAccounts: {
        type: Array,
      required: true,
    },

})

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10)
}

export const comparePassword = (password, password2) => {
    return bcrypt.compare(password, password2)
}

// Arrays assigned on an admin (every account, store, location, vendor, and
// role) make the token bigger than Node's request-header limit. The browser
// then reports a CORS failure on the next call, including login.
const tokenValue = (val) => {
    if (val && typeof val.toObject === "function") return val.toObject();
    if (val && val._doc && typeof val._doc === "object") return { ...val._doc };
    return { ...(val || {}) };
};

export const getAuthontication = async function (val) {
    const source = tokenValue(val);
    const payload = {};
    for (const [key, value] of Object.entries(source)) {
        if (key.startsWith("$") || key === "__v" || key === "_doc") continue;
        if (/password/i.test(key)) continue;
        if (Array.isArray(value)) continue;
        if (value && typeof value === "object" && key !== "_id" && !(value instanceof Date)) continue;
        payload[key] = value;
    }
    const id = payload._id || source._id || source.id;
    if (!id) throw new Error("Cannot issue a token without a user id");
    payload._id = id;

    return jwt.sign({ val: payload }, "peral-Dynamic", { expiresIn: "10 h" });
}



const userModel = mongoose.models.users || mongoose.model('users', userSchema)

export const dropLegacyFirstnameUniqueIndex = async () => {
    const indexes = await userModel.collection.indexes();
    const legacy = indexes.find((index) =>
        index.unique &&
        index.key &&
        index.key.firstname === 1 &&
        Object.keys(index.key).length === 1
    );
    if (legacy) await userModel.collection.dropIndex(legacy.name);
};

export default userModel
