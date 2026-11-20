import express from "express";
import {
    CreateHoliday, getAllHolidays, getHolidaysByProvinceAndReligion,
    updateHoliday, deleteHoliday, bulkImportHolidays, loadHolidayTemplate
} from "../Controllar/HolidayCalendarControllar.js";

const HolidayCalendarRouter = express.Router()

HolidayCalendarRouter.post("/", CreateHoliday)
HolidayCalendarRouter.get("/", getAllHolidays)
HolidayCalendarRouter.get("/filter", getHolidaysByProvinceAndReligion)
HolidayCalendarRouter.put("/update/:id", updateHoliday)
HolidayCalendarRouter.delete("/delete/:id", deleteHoliday)
HolidayCalendarRouter.post("/bulk-import", bulkImportHolidays)
HolidayCalendarRouter.post("/load-template", loadHolidayTemplate)

export default HolidayCalendarRouter
