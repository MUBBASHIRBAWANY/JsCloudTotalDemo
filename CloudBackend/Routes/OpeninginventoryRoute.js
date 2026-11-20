import express from "express";
import { changeStatusOnly, createOpennigBalance, deleteOpeningInvetory, genrateNewYear, saveYearVendorOpening, getClientVouchers, updateClientVoucherAccounts, getAllOpeningInventory, getAllYear, UpdateOpeningInvetory, DeleteYear } from "../Controllar/OpeningControllar.js";

const OpeninginventoryRoute = express.Router()

OpeninginventoryRoute.post('/', createOpennigBalance)
OpeninginventoryRoute.get('/' , getAllOpeningInventory)
OpeninginventoryRoute.post('/DeleteYear' , DeleteYear)
OpeninginventoryRoute.put('/updateOpningInventory/:id', UpdateOpeningInvetory)
OpeninginventoryRoute.delete("/DeleteOpeningInventory/:id" , deleteOpeningInvetory)
OpeninginventoryRoute.put('/ChnageStatusOnly/:id', changeStatusOnly)
OpeninginventoryRoute.post("/genrateNewYear" , genrateNewYear)
OpeninginventoryRoute.post("/saveYearVendorOpening" , saveYearVendorOpening)
OpeninginventoryRoute.get("/getClientVouchers" , getClientVouchers)
OpeninginventoryRoute.get("/updateClientVoucherAccounts" , updateClientVoucherAccounts)
OpeninginventoryRoute.get("/getAllYear" , getAllYear)


export default OpeninginventoryRoute