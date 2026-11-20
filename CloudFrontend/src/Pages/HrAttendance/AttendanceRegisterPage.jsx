import { useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchAttendanceRegister,
    bulkUploadAttendance,
    clearBulkUploadResults,
    clearAttendanceHrError,
} from "../../Redux/Reducers/attendanceHrSlice.js"
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
    TextField,
    CircularProgress,
    Alert,
    Chip,
} from "@mui/material"
import FilterListIcon from "@mui/icons-material/FilterList"
import FileDownloadIcon from "@mui/icons-material/FileDownload"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import ClearIcon from "@mui/icons-material/Clear"

// ── CSV export helper ──────────────────────────────────────────────────────────
const downloadCSV = (data) => {
    const headers = ["Employee Code", "Date", "Check-In", "Check-Out", "Status", "Overtime Hours"]
    const rows = data.map((r) =>
        [r.employeeCode, r.date, r.checkIn, r.checkOut, r.status, r.overtimeHours ?? ""].join(",")
    )
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "attendance-register.csv"
    a.click()
    URL.revokeObjectURL(url)
}

const AttendanceRegisterPage = () => {
    const dispatch = useDispatch()
    const { register, bulkUploadResults, loading, error } = useSelector(
        (s) => s.attendanceHr
    )

    // Filter state
    const [filters, setFilters] = useState({
        month: "",
        year: "",
        department: "",
        employee: "",
    })

    // Bulk upload
    const fileInputRef = useRef(null)
    const [selectedFile, setSelectedFile] = useState(null)

    // ── Filter handlers ────────────────────────────────────────────────────
    const handleFilterChange = (e) => {
        const { name, value } = e.target
        setFilters((prev) => ({ ...prev, [name]: value }))
    }

    const handleLoadRegister = () => {
        const params = {}
        if (filters.month) params.month = Number(filters.month)
        if (filters.year) params.year = Number(filters.year)
        if (filters.department) params.department = filters.department
        if (filters.employee) params.employee = filters.employee
        dispatch(fetchAttendanceRegister(params))
    }

    const handleExportCSV = () => {
        if (register && register.length > 0) {
            downloadCSV(register)
        }
    }

    // ── Bulk upload handlers ───────────────────────────────────────────────
    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0] || null)
    }

    const handleUpload = () => {
        if (!selectedFile) return
        const formData = new FormData()
        formData.append("file", selectedFile)
        dispatch(bulkUploadAttendance(formData))
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const handleClearResults = () => {
        dispatch(clearBulkUploadResults())
    }

    const handleClearError = () => {
        dispatch(clearAttendanceHrError())
    }

    // ── Derived upload stats ───────────────────────────────────────────────
    const uploadErrors = bulkUploadResults?.errors ?? []
    const persistedCount = bulkUploadResults?.persisted ?? bulkUploadResults?.persistedCount ?? null
    const errorCount = uploadErrors.length

    return (
        <div className="p-6">
            {/* ── Section 1: Filter Bar ──────────────────────────────────── */}
            <div className="mb-5">
                <h2 className="pd-section-title mb-4">Attendance Register</h2>

                <div className="flex flex-wrap gap-4 items-end mb-4">
                    <TextField
                        label="Month (1–12)"
                        name="month"
                        type="number"
                        value={filters.month}
                        onChange={handleFilterChange}
                        size="small"
                        style={{ width: 130 }}
                        slotProps={{ input: { min: 1, max: 12 } }}
                    />
                    <TextField
                        label="Year"
                        name="year"
                        type="number"
                        value={filters.year}
                        onChange={handleFilterChange}
                        size="small"
                        style={{ width: 110 }}
                    />
                    <TextField
                        label="Department"
                        name="department"
                        value={filters.department}
                        onChange={handleFilterChange}
                        size="small"
                        style={{ width: 180 }}
                    />
                    <TextField
                        label="Employee Code"
                        name="employee"
                        value={filters.employee}
                        onChange={handleFilterChange}
                        size="small"
                        style={{ width: 160 }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<FilterListIcon />}
                        onClick={handleLoadRegister}
                    >
                        Load Register
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportCSV}
                        disabled={!register || register.length === 0}
                    >
                        Export CSV
                    </Button>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center py-10">
                    <CircularProgress />
                </div>
            )}

            {error && (
                <Alert severity="error" className="mb-5" onClose={handleClearError}>
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

            {/* ── Section 2: Register Table ──────────────────────────────── */}
            {!loading && (
                <Table size="small" className="mb-10">
                    <TableHead>
                        <TableRow>
                            <TableCell>Employee Code</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Check-In</TableCell>
                            <TableCell>Check-Out</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Overtime Hours</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(!register || register.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No attendance records. Use the filters above and click Load Register.
                                </TableCell>
                            </TableRow>
                        )}
                        {register &&
                            register.map((row, idx) => (
                                <TableRow key={row._id ?? idx}>
                                    <TableCell>{row.employeeCode}</TableCell>
                                    <TableCell>{row.date}</TableCell>
                                    <TableCell>{row.checkIn ?? "—"}</TableCell>
                                    <TableCell>{row.checkOut ?? "—"}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.status ?? "—"}
                                            size="small"
                                            color={
                                                row.status === "present"
                                                    ? "success"
                                                    : row.status === "absent"
                                                    ? "error"
                                                    : row.status === "late"
                                                    ? "warning"
                                                    : "default"
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>{row.overtimeHours ?? "—"}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            )}

            {/* ── Section 3: Bulk CSV Upload ─────────────────────────────── */}
            <div className="mt-8">
                <h2 className="pd-section-title mb-4">Bulk CSV Upload</h2>

                <div className="flex flex-wrap gap-4 items-center mb-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                        id="csv-file-input"
                    />
                    <label htmlFor="csv-file-input">
                        <Button variant="outlined" component="span" startIcon={<UploadFileIcon />}>
                            Choose CSV File
                        </Button>
                    </label>
                    {selectedFile && (
                        <span className="text-sm text-gray-600">{selectedFile.name}</span>
                    )}
                    <Button
                        variant="contained"
                        onClick={handleUpload}
                        disabled={!selectedFile || loading}
                        startIcon={<UploadFileIcon />}
                    >
                        Upload
                    </Button>
                </div>

                {/* Upload results summary */}
                {bulkUploadResults && (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-3 items-center">
                            {persistedCount !== null && (
                                <Alert severity="success" sx={{ py: 0.5 }}>
                                    {persistedCount} row{persistedCount !== 1 ? "s" : ""} persisted successfully.
                                </Alert>
                            )}
                            {errorCount > 0 && (
                                <Alert severity="warning" sx={{ py: 0.5 }}>
                                    {errorCount} row{errorCount !== 1 ? "s" : ""} had errors.
                                </Alert>
                            )}
                            <Button
                                variant="text"
                                size="small"
                                color="inherit"
                                startIcon={<ClearIcon />}
                                onClick={handleClearResults}
                            >
                                Clear Results
                            </Button>
                        </div>

                        {/* Per-row error table */}
                        {errorCount > 0 && (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Row</TableCell>
                                        <TableCell>Employee Code</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Error Reason</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {uploadErrors.map((err, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{err.row ?? idx + 1}</TableCell>
                                            <TableCell>{err.employeeCode ?? "—"}</TableCell>
                                            <TableCell>{err.date ?? "—"}</TableCell>
                                            <TableCell>{err.reason ?? err.message ?? "Unknown error"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AttendanceRegisterPage
