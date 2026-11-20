import express from "express";
import { CreateGroup, updateGroup, getAllGroup, deleteGroup, getLastGroupCode,  PushBulkDataInGroup,  } from "../Controllar/GroupControllar.js";
const GroupRouter = express.Router()


GroupRouter.post('/', CreateGroup )
GroupRouter.put('/UpdateGroup/:id', updateGroup)
GroupRouter.get("/", getAllGroup)
GroupRouter.get('/lastCode', getLastGroupCode)
GroupRouter.delete("/deleteGroup/:id", deleteGroup)
GroupRouter.post("/PushBulkData", PushBulkDataInGroup)

export default GroupRouter