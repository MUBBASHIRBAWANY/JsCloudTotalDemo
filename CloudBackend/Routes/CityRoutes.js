import express from "express";
import { CreateCity, updateCity, getAllCity, deleteCity, getLastCityCode,  PushBulkDataInCity,  } from "../Controllar/CityControlar.js";
const CityRouter = express.Router()


CityRouter.post('/', CreateCity )
CityRouter.put('/UpdateCity/:id', updateCity)
CityRouter.get("/", getAllCity)
CityRouter.get('/lastCode', getLastCityCode)
CityRouter.delete("/deleteCity/:id", deleteCity)
CityRouter.post("/PushBulkData", PushBulkDataInCity)

export default CityRouter