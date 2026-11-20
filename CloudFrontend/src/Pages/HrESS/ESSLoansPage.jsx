import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchEssLoans } from "../../Redux/Reducers/essSlice.js"
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    CircularProgress,
    Alert,
} from "@mui/material"

const ESSLoansPage = () => {
    const dispatch = useDispatch()
    const { loans, loading, error } = useSelector((s) => s.ess)

    useEffect(() => {
        dispatch(fetchEssLoans())
    }, [dispatch])

    // Normalise — API may return { data: [...] } or plain array
    const loanList = Array.isArray(loans) ? loans : loans?.data ?? []

    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">My Loans</h2>

            {loading && (
                <div className="flex justify-center py-10">
                    <CircularProgress />
                </div>
            )}

            {error && (
                <Alert severity="error" className="mb-4">
                    {typeof error === "string"
                        ? error
                        : error?.message || "Failed to load loans."}
                </Alert>
            )}

            {!loading && loanList.length === 0 && !error && (
                <Alert severity="info">No active loans.</Alert>
            )}

            {!loading && loanList.length > 0 && (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Loan Type</TableCell>
                            <TableCell>Outstanding Balance</TableCell>
                            <TableCell>Monthly Installment</TableCell>
                            <TableCell>Remaining Installments</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loanList.map((loan, idx) => (
                            <TableRow key={loan._id ?? idx}>
                                <TableCell>{loan.loanType ?? loan.type ?? "—"}</TableCell>
                                <TableCell>{loan.outstandingBalance ?? loan.remainingBalance ?? "—"}</TableCell>
                                <TableCell>Rs. {Number(loan.monthlyDeduction || 0).toLocaleString()}</TableCell>
                                <TableCell>{loan.amortizationSchedule?.filter(s => s.status === "pending").length ?? "—"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    )
}

export default ESSLoansPage
