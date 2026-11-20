import express from "express";
import { AllloadFormNumber, createLoadForm, forwardLoadForm, loadFormControllar, loadFormNumber } from "../Controllar/LoadFormControllar.js";


const LoadFormRouter = express.Router()
LoadFormRouter.get('/:Distributor', loadFormControllar )
LoadFormRouter.get('/loadFormNumber/:Distributor', loadFormNumber )
LoadFormRouter.get('/AllloadFormNumber/:Distributor', AllloadFormNumber )
LoadFormRouter.post("/" , createLoadForm)

export default LoadFormRouter