import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    fetchHrDashboard,
    setDepartmentFilter,
} from "../../Redux/Reducers/hrDashboardSlice.js"
import {
    Card,
    CardContent,
    Typography,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Skeleton,
    Chip,
    Button,
} from "@mui/material"
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"

// ─── Helper: safe array guard ─────────────────────────────────────────────────
const asArray = (val) => (Array.isArray(val) ? val : [])

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const WidgetSkeleton = () => (
    <Skeleton variant="rectangular" height={160} className="rounded" />
)

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle }) => (
    <Card variant="outlined" className="h-full">
        <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
                {value ?? "—"}
            </Typography>
            {subtitle && (
                <Typography variant="caption" color="text.secondary">
                    {subtitle}
                </Typography>
            )}
        </CardContent>
    </Card>
)

// ─── Main Page ────────────────────────────────────────────────────────────────
const HRAnalyticsDashboardPage = () => {
    const dispatch = useDispatch()
    const { dashboardData, departmentFilter, loading, error } = useSelector(
        (s) => s.hrDashboard
    )

    const [localDept, setLocalDept] = useState(departmentFilter || "")

    // Fetch on mount with no filter
    useEffect(() => {
        dispatch(fetchHrDashboard(null))
    }, [dispatch])

    const handleDeptChange = (e) => {
        const val = e.target.value
        setLocalDept(val)
        dispatch(setDepartmentFilter(val || null))
        dispatch(fetchHrDashboard(val || null))
    }

    const handleRetry = () => {
        dispatch(fetchHrDashboard(localDept || null))
    }

    const departments = asArray(dashboardData?.departments)

    // ── Render skeleton during loading ──
    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="pd-section-title">HR Analytics Dashboard</h2>
                    <Skeleton variant="rectangular" width={200} height={40} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <WidgetSkeleton key={i} />
                    ))}
                </div>
            </div>
        )
    }

    // ── Error state ──
    if (error) {
        return (
            <div className="p-6">
                <h2 className="pd-section-title mb-4">HR Analytics Dashboard</h2>
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" size="small" onClick={handleRetry}>
                            Retry
                        </Button>
                    }
                >
                    {typeof error === "string"
                        ? error
                        : error?.message || "Failed to load dashboard data."}
                </Alert>
            </div>
        )
    }

    // ── Data aliases ──
    const headcount = dashboardData?.headcount
    const attrition = asArray(dashboardData?.attrition)
    const payrollTrend = asArray(dashboardData?.payrollTrend)
    const departmentBreakdown = asArray(dashboardData?.departmentBreakdown)
    const leaveUtilisation = asArray(dashboardData?.leaveUtilisation)
    const openPostings = dashboardData?.openPostings
    const hiredCount = dashboardData?.hiredCount
    const probationList = asArray(dashboardData?.probationList).slice().sort(
        (a, b) => new Date(a.probationEndDate) - new Date(b.probationEndDate)
    )
    const certExpiringSoon = dashboardData?.certExpiringSoon
    const documentExpiry = asArray(dashboardData?.documentExpiry).slice().sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
    )

    // Attrition: label for x-axis
    const attritionData = attrition.map((row) => ({
        label: `${row.month}/${row.year}`,
        rate: row.rate,
    }))

    // Payroll trend: label for x-axis
    const payrollData = payrollTrend.map((row) => ({
        label: `${row.month}/${row.year}`,
        Gross: row.gross,
        Net: row.net,
        Deductions: row.deductions,
    }))

    return (
        <div className="p-6">
            {/* ── Header + Department Filter ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="pd-section-title">HR Analytics Dashboard</h2>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Department</InputLabel>
                    <Select
                        value={localDept}
                        label="Department"
                        onChange={handleDeptChange}
                    >
                        <MenuItem value="">All Departments</MenuItem>
                        {departments.map((dept) => (
                            <MenuItem key={dept} value={dept}>
                                {dept}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

                {/* ── 1. Headcount Widget (8.1) ── */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography className="pd-section-title" variant="subtitle1" gutterBottom>
                            Headcount
                        </Typography>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            {headcount?.total ?? "—"}
                        </Typography>
                        {asArray(headcount?.breakdown).length > 0 && (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Department</TableCell>
                                        <TableCell>Employment Type</TableCell>
                                        <TableCell align="right">Count</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {asArray(headcount.breakdown).map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.department}</TableCell>
                                            <TableCell>{row.employmentType}</TableCell>
                                            <TableCell align="right">{row.count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* ── 2. Attrition Rate (8.2) ── */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography className="pd-section-title" variant="subtitle1" gutterBottom>
                            Attrition Rate
                        </Typography>
                        {attritionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={attritionData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                                    <Tooltip formatter={(v) => `${v}%`} />
                                    <Line
                                        type="monotone"
                                        dataKey="rate"
                                        stroke="#1976d2"
                                        dot={false}
                                        name="Attrition %"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No attrition data available.
                            </Typography>
                        )}
                    </CardContent>
                </Card>

                {/* ── 3. Payroll Cost Trend (8.3) ── */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography className="pd-section-title" variant="subtitle1" gutterBottom>
                            Payroll Cost Trend
                        </Typography>
                        {payrollData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={payrollData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="Gross" fill="#1976d2" />
                                    <Bar dataKey="Net" fill="#2e7d32" />
                                    <Bar dataKey="Deductions" fill="#d32f2f" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No payroll trend data available.
                            </Typography>
                        )}
                    </CardContent>
                </Card>

                {/* ── 4. Department Breakdown (8.4) ── */}
                <Card variant="outlined" className="sm:col-span-2 md:col-span-2">
                    <CardContent>
                        <Typography className="pd-section-title" variant="subtitle1" gutterBottom>
                            Department Breakdown
                        </Typography>
                        {departmentBreakdown.length > 0 ? (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Department</TableCell>
                                        <TableCell align="right">Headcount</TableCell>
                                        <TableCell align="right">Avg Basic Salary</TableCell>
                                        <TableCell align="right">Total Payroll</TableCell>
                                        <TableCell align="right">Leave Utilisation %</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {departmentBreakdown.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.department}</TableCell>
                                            <TableCell align="right">{row.headcount}</TableCell>
                                            <TableCell align="right">
                                                {row.avgBasicSalary?.toLocaleString() ?? "—"}
                                            </TableCell>
                                            <TableCell align="right">
                                                {row.totalPayrollCost?.toLocaleString() ?? "—"}
                                            </TableCell>
                                            <TableCell align="right">
                                                {row.leaveUtilisation != null
                                                    ? `${row.leaveUtilisation}%`
                                                    : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No department breakdown data available.
                            </Typography>
                        )}
                    </CardContent>
                </Card>

                {/* ── 5. Leave Utilisation Summary (8.5) ── */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography className="pd-section-title" variant="subtitle1" gutterBottom>
                            Leave Utilisation
                        </Typography>
                        {leaveUtilisation.length > 0 ? (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Leave Type</TableCell>
                                        <TableCell align="right">Allocated</TableCell>
                                        <TableCell align="right">Taken</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {leaveUtilisation.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.leaveType}</TableCell>
                                            <TableCell align="right">{row.allocated}</TableCell>
                                            <TableCell align="right">{row.taken}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No leave utilisation data available.
                            </Typography>
                        )}
                    </CardContent>
                </Card>

                {/* ── 6. Open Postings & Hired Count (8.6) ── */}
                <div className="grid grid-cols-2 gap-4">
                    <StatCard title="Open Postings" value={openPostings} />
                    <StatCard title="Hired Count" value={hiredCount} />
                </div>

                {/* ── 7. Probation Expiry List (8.7) ── */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography className="pd-section-title" variant="subtitle1" gutterBottom>
                            Probation Expiry
                        </Typography>
                        {probationList.length > 0 ? (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Designation</TableCell>
                                        <TableCell>Probation End</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {probationList.map((emp, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{emp.name}</TableCell>
                                            <TableCell>{emp.designation}</TableCell>
                                            <TableCell>
                                                {emp.probationEndDate
                                                    ? new Date(emp.probationEndDate).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No probation records found.
                            </Typography>
                        )}
                    </CardContent>
                </Card>

                {/* ── 8. Certifications Expiring Count (8.8) ── */}
                <StatCard
                    title="Certifications Expiring Soon"
                    value={certExpiringSoon}
                    subtitle="Employees with certs expiring within 30 days"
                />

                {/* ── 9. Document Expiry Widget (9.6) ── */}
                <Card variant="outlined" className="md:col-span-3">
                    <CardContent>
                        <Typography className="pd-section-title" variant="subtitle1" gutterBottom>
                            Document Expiry
                        </Typography>
                        {documentExpiry.length > 0 ? (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Employee</TableCell>
                                        <TableCell>Document Type</TableCell>
                                        <TableCell>Document Title</TableCell>
                                        <TableCell>Expiry Date</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {documentExpiry.map((doc, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{doc.employee}</TableCell>
                                            <TableCell>{doc.documentType}</TableCell>
                                            <TableCell>{doc.documentTitle}</TableCell>
                                            <TableCell>
                                                {doc.expiryDate
                                                    ? new Date(doc.expiryDate).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={
                                                        doc.expiryStatus === "expired"
                                                            ? "Expired"
                                                            : "Expiring Soon"
                                                    }
                                                    color={
                                                        doc.expiryStatus === "expired"
                                                            ? "error"
                                                            : "warning"
                                                    }
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No expiring or expired documents found.
                            </Typography>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}

export default HRAnalyticsDashboardPage
