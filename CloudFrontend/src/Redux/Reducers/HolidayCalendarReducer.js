import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    holidayCalendar: []
}

const HolidayCalendar = createSlice({
    name: "holidayCalendar",
    initialState,
    reducers: {
        fetchHolidayCalendar: (state, action) => {
            state.holidayCalendar = action.payload
        },
    },
})

export const { fetchHolidayCalendar } = HolidayCalendar.actions
export default HolidayCalendar.reducer
