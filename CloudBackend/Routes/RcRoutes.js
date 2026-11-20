import express from "express";
import { createRc, getAllPostRC, getAllRc, getAllRcByVendor, postRc, updateRc } from "../Controllar/RcControllar.js";


const RCRouter = express.Router()


RCRouter.post('/', createRc),
RCRouter.get('/', getAllRc),
RCRouter.get('/PostRc', getAllPostRC),
RCRouter.get('/RcByVend/:Vendor', getAllRcByVendor), 
RCRouter.put('/RCUpdate/:id' , updateRc)
RCRouter.put('/Changestatus/:id', postRc)



export default RCRouter



