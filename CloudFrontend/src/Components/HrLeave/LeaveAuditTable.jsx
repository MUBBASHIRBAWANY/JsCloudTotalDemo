import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@mui/material"

// Props: { auditLog: Array }
const LeaveAuditTable = ({ auditLog }) => {
    if (!auditLog || auditLog.length === 0) {
        return <p className="text-sm text-gray-500 py-4">No audit entries.</p>
    }

    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Employee ID</TableCell>
                    <TableCell>Leave Type</TableCell>
                    <TableCell>Previous Balance</TableCell>
                    <TableCell>New Balance</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Acting HR ID</TableCell>
                    <TableCell>Timestamp</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {auditLog.map((entry, idx) => (
                    <TableRow key={entry._id || idx}>
                        <TableCell>{entry.employeeId || entry.empId || "—"}</TableCell>
                        <TableCell>{entry.leaveType || "—"}</TableCell>
                        <TableCell>{entry.previousBalance ?? "—"}</TableCell>
                        <TableCell>{entry.newBalance ?? "—"}</TableCell>
                        <TableCell>{entry.reason || "—"}</TableCell>
                        <TableCell>{entry.actingHrId || entry.performedBy || "—"}</TableCell>
                        <TableCell>
                            {entry.timestamp || entry.createdAt
                                ? new Date(entry.timestamp || entry.createdAt).toLocaleString()
                                : "—"}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default LeaveAuditTable
