import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchEssAttendance } from "../../Redux/Reducers/essSlice.js"
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    CircularProgress,
    Alert,
} from "@mui/material"

const now = new Date()

const STATUS_COLOR = {
    present: "success",
    absent:  "error",
    late:    "warning",
    leave:   "info",
    holiday: "default",
    "off-day": "default",
}

const ESSAttendancePage = () => {
    const dispatch = useDispatch()
    const { attendanceSummary, loading, error } = useSelector((s) => s.ess)

    const [month, setMonth] = useState(now.getMonth() + 1)   // 1–12
    const [year, setYear]   = useState(String(now.getFullYear()))
    const [loaded, setLoaded] = useState(false)

    const handleLoad = () => {
        setLoaded(true)
        dispatch(fetchEssAttendance({ month, year: Number(year) }))
    }

    // Normalise summary — API may return { data: [...] } or plain array
    const records = Array.isArray(attendanceSummary)
        ? attendanceSummary
        : attendanceSummary?.data ?? []

    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">My Attendance</h2>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 mb-6">
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Month</InputLabel>
                    <Select
                        value={month}
                        label="Month"
                        onChange={(e) => setMonth(e.target.value)}
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <MenuItem key={m} value={m}>
                                {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    label="Year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    size="small"
                    sx={{ width: 100 }}
                    slotProps={{ inputLabel: { shrink: true } }}
                />

                <Button variant="contained" onClick={handleLoad} disabled={loading}>
                    {loading ? "Loading…" : "Load"}
                </Button>
            </div>

            {loading && (
                <div className="flex justify-center py-10">
                    <CircularProgress />
                </div>
            )}

            {error && (
                <Alert severity="error" className="mb-4">
                    {typeof error === "string"
                        ? error
                        : error?.message || "Failed to load attendance."}
                </Alert>
            )}

            {!loading && loaded && records.length === 0 && (
                <Alert severity="info">
                    No attendance records for the selected month.
                </Alert>
            )}

            {!loading && records.length > 0 && (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Check-In</TableCell>
                            <TableCell>Check-Out</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.map((rec, idx) => (
                            <TableRow key={rec._id ?? idx}>
                                <TableCell>
                                    {rec.date
                                        ? new Date(rec.date).toLocaleDateString()
                                        : rec.day ?? "—"}
                                </TableCell>
                                <TableCell>{rec.checkIn ?? rec.checkInTime ?? "—"}</TableCell>
                                <TableCell>{rec.checkOut ?? rec.checkOutTime ?? "—"}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={rec.status ?? "—"}
                                        color={STATUS_COLOR[rec.status?.toLowerCase()] ?? "default"}
                                        size="small"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    )
}

export default ESSAttendancePage
