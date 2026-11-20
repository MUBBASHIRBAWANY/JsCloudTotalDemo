import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchPayslips,
    fetchPayslipDetail,
    clearPayslipDetail,
} from "../../Redux/Reducers/essSlice.js"
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Pagination,
    CircularProgress,
    Alert,
    Typography,
    Tooltip,
} from "@mui/material"
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf"
import VisibilityIcon from "@mui/icons-material/Visibility"

const MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

const PAGE_LIMIT = 10

const ESSPayslipsPage = () => {
    const dispatch = useDispatch()
    const { payslips, payslipDetail, loading, error } = useSelector((s) => s.ess)

    const [page, setPage] = useState(1)
    const [detailOpen, setDetailOpen] = useState(false)

    useEffect(() => {
        dispatch(fetchPayslips({ page: 1, limit: PAGE_LIMIT }))
    }, [dispatch])

    const handlePageChange = (_, value) => {
        setPage(value)
        dispatch(fetchPayslips({ page: value, limit: PAGE_LIMIT }))
    }

    const handleView = (id) => {
        dispatch(fetchPayslipDetail(id))
        setDetailOpen(true)
    }

    const handleCloseDetail = () => {
        setDetailOpen(false)
        dispatch(clearPayslipDetail())
    }

    // Normalise payslips — API may return array or { data, total } shape
    const payslipList = Array.isArray(payslips)
        ? payslips
        : payslips?.data ?? []

    const totalCount = Array.isArray(payslips)
        ? payslips.length
        : payslips?.total ?? 0

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT))

    // Sort by year desc, then month desc
    const sortedPayslips = [...payslipList].sort((a, b) => {
        if (b.year !== a.year) return (b.year ?? 0) - (a.year ?? 0)
        return (b.month ?? 0) - (a.month ?? 0)
    })

    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">My Payslips</h2>

            {loading && (
                <div className="flex justify-center py-10">
                    <CircularProgress />
                </div>
            )}

            {error && (
                <Alert severity="error" className="mb-5">
                    {typeof error === "string"
                        ? error
                        : error?.message || "Failed to load payslips."}
                </Alert>
            )}

            {!loading && (
                <>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Year</TableCell>
                                <TableCell>Month</TableCell>
                                <TableCell>Gross Salary</TableCell>
                                <TableCell>Net Salary</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedPayslips.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        No payslips found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedPayslips.map((payslip) => (
                                    <TableRow key={payslip._id}>
                                        <TableCell>{payslip.year ?? "—"}</TableCell>
                                        <TableCell>
                                            {typeof payslip.month === "number"
                                                ? MONTH_NAMES[payslip.month] || payslip.month
                                                : payslip.month ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {payslip.grossSalary != null
                                                ? `Rs. ${Number(payslip.grossSalary).toLocaleString()}`
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {payslip.netSalary != null
                                                ? `Rs. ${Number(payslip.netSalary).toLocaleString()}`
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {payslip.pdfUrl && (
                                                    <Tooltip title="Download PDF">
                                                        <IconButton
                                                            size="small"
                                                            component="a"
                                                            href={payslip.pdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <PictureAsPdfIcon fontSize="small" color="error" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<VisibilityIcon />}
                                                    onClick={() => handleView(payslip._id)}
                                                >
                                                    View
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {totalPages > 1 && (
                        <div className="flex justify-center mt-4">
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                                size="small"
                            />
                        </div>
                    )}
                </>
            )}

            {/* Payslip Detail Dialog */}
            <Dialog
                open={detailOpen}
                onClose={handleCloseDetail}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Payslip Detail</DialogTitle>
                <DialogContent dividers>
                    {loading && (
                        <div className="flex justify-center py-6">
                            <CircularProgress />
                        </div>
                    )}
                    {!loading && payslipDetail ? (
                        <div className="flex flex-col gap-2">
                            {Object.entries(payslipDetail).map(([key, value]) => {
                                // Skip internal/system keys and objects
                                if (key === "_id" || key === "__v") return null
                                if (value !== null && typeof value === "object" && !Array.isArray(value)) return null
                                return (
                                    <div
                                        key={key}
                                        className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0"
                                    >
                                        <Typography variant="body2" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                                            {key.replace(/([A-Z])/g, " $1").trim()}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {Array.isArray(value)
                                                ? value.join(", ")
                                                : String(value ?? "—")}
                                        </Typography>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        !loading && (
                            <Typography variant="body2" color="text.secondary">
                                No detail available.
                            </Typography>
                        )
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetail}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default ESSPayslipsPage
