import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchEssDashboard } from "../../Redux/Reducers/essSlice.js"
import {
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
} from "@mui/material"

const LEAVE_TYPES = [
    { key: "casual", label: "Casual" },
    { key: "medical", label: "Medical" },
    { key: "annual", label: "Annual" },
    { key: "unpaid", label: "Unpaid" },
    { key: "maternity", label: "Maternity" },
    { key: "paternity", label: "Paternity" },
]

const StatItem = ({ label, value }) => (
    <div className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
            {value}
        </Typography>
    </div>
)

const ESSDashboardPage = () => {
    const dispatch = useDispatch()
    const { dashboardSummary, loading, error } = useSelector((s) => s.ess)

    useEffect(() => {
        dispatch(fetchEssDashboard())
    }, [dispatch])

    // Handle 403 access denied
    const is403 =
        error &&
        (error?.status === 403 ||
            error?.statusCode === 403 ||
            (typeof error === "string" && error.includes("403")) ||
            (typeof error === "object" && error?.message?.includes("403")))

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <CircularProgress />
            </div>
        )
    }

    if (is403) {
        return (
            <div className="p-6">
                <Alert severity="error">
                    Access denied. You are not authorized to view this data.
                </Alert>
            </div>
        )
    }

    const attendance = dashboardSummary?.attendance || {}
    const leaveBalances = dashboardSummary?.leaveBalances || {}
    const activeLoanBalance = dashboardSummary?.activeLoanBalance ?? 0
    const lastPayrollNet = dashboardSummary?.lastPayrollNet ?? null

    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-6">My Dashboard</h2>

            {error && (
                <Alert severity="error" className="mb-5">
                    {typeof error === "string"
                        ? error
                        : error?.message || "Failed to load dashboard data."}
                </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Attendance Summary */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            Attendance
                        </Typography>
                        <StatItem label="Present Days" value={attendance.present ?? 0} />
                        <StatItem label="Absent Days" value={attendance.absent ?? 0} />
                        <StatItem label="Late Days" value={attendance.late ?? 0} />
                    </CardContent>
                </Card>

                {/* Leave Balances */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            Leave Balances
                        </Typography>
                        {LEAVE_TYPES.map(({ key, label }) => (
                            <StatItem
                                key={key}
                                label={label}
                                value={leaveBalances[key] ?? 0}
                            />
                        ))}
                    </CardContent>
                </Card>

                {/* Active Loan Balance */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            Active Loan Balance
                        </Typography>
                        <Typography variant="h5" fontWeight={700} color="primary" sx={{ mt: 1 }}>
                            Rs. {Number(activeLoanBalance).toLocaleString()}
                        </Typography>
                    </CardContent>
                </Card>

                {/* Last Payroll Net */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            Last Payroll Net
                        </Typography>
                        {lastPayrollNet != null ? (
                            <Typography variant="h5" fontWeight={700} color="success.main" sx={{ mt: 1 }}>
                                Rs. {Number(lastPayrollNet).toLocaleString()}
                            </Typography>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Not yet processed
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default ESSDashboardPage
