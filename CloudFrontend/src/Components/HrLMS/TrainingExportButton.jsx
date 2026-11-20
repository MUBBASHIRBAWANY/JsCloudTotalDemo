import { useDispatch, useSelector } from "react-redux"
import { exportLmsReport } from "../../Redux/Reducers/lmsSlice.js"
import { Button, CircularProgress } from "@mui/material"
import DownloadIcon from "@mui/icons-material/Download"

/**
 * TrainingExportButton
 *
 * Props:
 *   department  {string}  - filter by department (optional)
 *   startDate   {string}  - ISO date string (optional)
 *   endDate     {string}  - ISO date string (optional)
 *
 * Calls exportLmsReport({ department, startDate, endDate }) and
 * downloads the response as a CSV file.
 */
const TrainingExportButton = ({ department = "", startDate = "", endDate = "" }) => {
    const dispatch = useDispatch()
    const { loading } = useSelector((s) => s.lms)

    const handleExport = async () => {
        const params = {}
        if (department) params.department = department
        if (startDate) params.startDate = startDate
        if (endDate) params.endDate = endDate

        const result = await dispatch(exportLmsReport(params))
        if (result?.payload) {
            // Build a blob from the CSV text payload and trigger a download
            const blob = new Blob([result.payload], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", "lms_report.csv")
            document.body.appendChild(link)
            link.click()
            link.parentNode.removeChild(link)
            URL.revokeObjectURL(url)
        }
    }

    return (
        <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={14} /> : <DownloadIcon />}
            onClick={handleExport}
            disabled={loading}
        >
            Export CSV
        </Button>
    )
}

export default TrainingExportButton
