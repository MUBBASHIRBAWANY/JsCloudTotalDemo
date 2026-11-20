import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { dropLegacyFirstnameUniqueIndex } from '../modal/userModal.js'
dotenv.config()
const URL = process.env.URL

const db = () => {
 mongoose.connect(URL).then(async () => {
    console.log("DataBase Conected")
    try {
        await dropLegacyFirstnameUniqueIndex()
    } catch (err) {
        console.error("Could not drop the first-name unique index", err)
    }
})
}

export default db