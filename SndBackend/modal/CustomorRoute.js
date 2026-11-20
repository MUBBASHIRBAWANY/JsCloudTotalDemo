import express from "express";
import { creatCutomer, deletCutomer, getAllCutomer, getAllCutomerByBooker, getAllCutomerByDis, getLastCutomer, updatCutomer } from "../Controllar/CustomorControllar.js";


export  const CustomorROuter = express.Router()

CustomorROuter.post('/', creatCutomer)
CustomorROuter.get('/', getAllCutomer)
CustomorROuter.get('/getAllCutomerByBooker/:OrderBooker', getAllCutomerByBooker)
CustomorROuter.get('/AllCutomerByDis/:Distributor', getAllCutomerByDis)
CustomorROuter.get('/lastCutomer', getLastCutomer)
CustomorROuter.put('/updatCutomer/:id', updatCutomer)
CustomorROuter.delete('/deletCutomer/:id', deletCutomer)



