import { useState } from "react"
import { useDispatch } from "react-redux"
import { exportCycleResults } from "../../Redux/Reducers/performanceSlice.js"
import { Button, CircularProgress } from "@mui/material"
import DownloadIcon from "@mui/icons-material/Download"

// Props: { cycleId: string }
const CycleExportButton = ({ cycleId }) => {
    const dispatch = useDispatch()
    const [exporting, setExporting] = useState(false)

    const handleExport = async () => {
        if (!cycleId) return
        setExporting(true)
        try {
            const result = await dispatch(exportCycleResults(cycleId))
            const data = result?.payload
            if (data) {
                const content =
                    typeof data === "string"
                        ? data
                        : JSON.stringify(data, null, 2)
                const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.setAttribute("download", `cycle-${cycleId}-results.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            }
        } finally {
            setExporting(false)
        }
    }

    return (
        <Button
            variant="outlined"
            size="small"
            startIcon={exporting ? <CircularProgress size={14} /> : <DownloadIcon />}
            onClick={handleExport}
            disabled={exporting || !cycleId}
        >
            {exporting ? "Exporting…" : "Export Results"}
        </Button>
    )
}

export default CycleExportButton
