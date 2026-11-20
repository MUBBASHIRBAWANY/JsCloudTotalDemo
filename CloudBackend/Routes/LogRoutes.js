import express from 'express'
import { CreateLog, GetAllLog, getLogReport } from '../Controllar/LogControllar.js'
const LogRouter = express.Router()


LogRouter.post('/', CreateLog)
LogRouter.get('/', getLogReport)




export default LogRouter