import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
    uploadDocument,
    fetchEmployeeDocuments,
    replaceDocumentVersion,
    fetchExpiryAlerts,
    exportDocumentReport,
    clearDocumentVaultError,
} from "../../Redux/Reducers/documentVaultSlice.js"
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Chip,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
} from "@mui/material"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import DownloadIcon from "@mui/icons-material/Download"
import HistoryIcon from "@mui/icons-material/History"

const DOC_TYPES = [
    { value: "all", label: "All" },
    { value: "CNIC", label: "CNIC" },
    { value: "employment-contract", label: "Employment Contract" },
    { value: "NDA", label: "NDA" },
    { value: "certificate", label: "Certificate" },
    { value: "payslip", label: "Payslip" },
    { value: "other", label: "Other" },
]

const emptyUploadForm = {
    empId: "",
    documentType: "other",
    documentTitle: "",
    fileRef: "",
    issueDate: "",
    expiryDate: "",
    notes: "",
}

const expiryStatusChip = (status) => {
    if (status === "expired") return <Chip label="Expired" color="error" size="small" />
    if (status === "expiring-soon") return <Chip label="Expiring Soon" color="warning" size="small" />
    return <Chip label="Valid" color="success" size="small" />
}

const DocumentVaultPage = () => {
    const dispatch = useDispatch()
    const { documents, expiryAlerts, loading, error } = useSelector((s) => s.documentVault)

    // Section A — lookup
    const [lookupEmpId, setLookupEmpId] = useState("")
    const [lookupType, setLookupType] = useState("all")
    const [expandedDocId, setExpandedDocId] = useState(null)

    // Section B — upload form
    const [uploadForm, setUploadForm] = useState(emptyUploadForm)
    const [uploadSuccess, setUploadSuccess] = useState("")

    // Section C — replace dialog
    const [replaceOpen, setReplaceOpen] = useState(false)
    const [replaceDocId, setReplaceDocId] = useState(null)
    const [replaceFileRef, setReplaceFileRef] = useState("")
    const [replaceNote, setReplaceNote] = useState("")
    const [replaceSuccess, setReplaceSuccess] = useState("")

    // Section D — expiry alerts
    const [expiryLoaded, setExpiryLoaded] = useState(false)

    // ── Section A: load documents ────────────────────────────────────────────
    const handleLoadDocuments = () => {
        if (!lookupEmpId.trim()) return
        dispatch(
            fetchEmployeeDocuments({
                empId: lookupEmpId.trim(),
                type: lookupType !== "all" ? lookupType : undefined,
            })
        )
    }

    const handleToggleVersions = (docId) => {
        setExpandedDocId((prev) => (prev === docId ? null : docId))
    }

    // ── Section B: upload ────────────────────────────────────────────────────
    const handleUploadChange = (e) => {
        const { name, value } = e.target
        setUploadForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleUploadSubmit = async () => {
        if (!uploadForm.empId.trim()) return
        const fd = new FormData()
        fd.append("documentType", uploadForm.documentType)
        fd.append("documentTitle", uploadForm.documentTitle)
        fd.append("fileRef", uploadForm.fileRef)
        fd.append("issueDate", uploadForm.issueDate)
        if (uploadForm.expiryDate) fd.append("expiryDate", uploadForm.expiryDate)
        if (uploadForm.notes) fd.append("notes", uploadForm.notes)

        const result = await dispatch(uploadDocument({ empId: uploadForm.empId.trim(), formData: fd }))
        if (uploadDocument.fulfilled.match(result)) {
            setUploadSuccess("Document uploaded successfully.")
            setUploadForm(emptyUploadForm)
            setTimeout(() => setUploadSuccess(""), 4000)
        }
    }

    // ── Section C: replace ───────────────────────────────────────────────────
    const openReplaceDialog = (docId) => {
        setReplaceDocId(docId)
        setReplaceFileRef("")
        setReplaceNote("")
        setReplaceSuccess("")
        setReplaceOpen(true)
    }

    const handleReplaceSubmit = async () => {
        const fd = new FormData()
        fd.append("fileRef", replaceFileRef)
        if (replaceNote) fd.append("note", replaceNote)

        const result = await dispatch(replaceDocumentVersion({ docId: replaceDocId, formData: fd }))
        if (replaceDocumentVersion.fulfilled.match(result)) {
            setReplaceSuccess("Document version replaced successfully.")
            setTimeout(() => {
                setReplaceOpen(false)
                setReplaceSuccess("")
            }, 2000)
        }
    }

    // ── Section D: expiry alerts + export ───────────────────────────────────
    const handleLoadExpiryAlerts = () => {
        dispatch(fetchExpiryAlerts())
        setExpiryLoaded(true)
    }

    const handleExportCSV = async () => {
        const result = await dispatch(exportDocumentReport({}))
        if (exportDocumentReport.fulfilled.match(result)) {
            const payload = result.payload?.data ?? result.payload
            // Build CSV from returned data array (or raw string)
            let csvContent = ""
            if (typeof payload === "string") {
                csvContent = payload
            } else if (Array.isArray(payload)) {
                if (payload.length > 0) {
                    const headers = Object.keys(payload[0]).join(",")
                    const rows = payload.map((row) =>
                        Object.values(row)
                            .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
                            .join(",")
                    )
                    csvContent = [headers, ...rows].join("\n")
                }
            }
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "document_report.csv"
            a.click()
            URL.revokeObjectURL(url)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">Document Vault</h2>

            {error && (
                <Alert severity="error" className="mb-4" onClose={() => dispatch(clearDocumentVaultError())}>
                    {typeof error === "string" ? error : error?.message || "An error occurred"}
                </Alert>
            )}

            {/* ── Section A: Employee Document Lookup ── */}
            <div className="mb-8 bg-white rounded shadow p-5">
                <h3 className="pd-section-title mb-4">Employee Documents</h3>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <TextField
                        label="Employee ID"
                        value={lookupEmpId}
                        onChange={(e) => setLookupEmpId(e.target.value)}
                        size="small"
                        sx={{ minWidth: 180 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Document Type</InputLabel>
                        <Select
                            value={lookupType}
                            label="Document Type"
                            onChange={(e) => setLookupType(e.target.value)}
                        >
                            {DOC_TYPES.map((t) => (
                                <MenuItem key={t.value} value={t.value}>
                                    {t.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button variant="contained" onClick={handleLoadDocuments} disabled={loading}>
                        Load Documents
                    </Button>
                </div>

                {loading && (
                    <div className="flex justify-center py-6">
                        <CircularProgress />
                    </div>
                )}

                {!loading && (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Document Title</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Issue Date</TableCell>
                                <TableCell>Expiry Date</TableCell>
                                <TableCell>Expiry Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {documents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        No documents found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {documents.map((doc) => (
                                <>
                                    <TableRow
                                        key={doc._id}
                                        hover
                                        sx={{ cursor: "pointer" }}
                                        onClick={() => handleToggleVersions(doc._id)}
                                    >
                                        <TableCell>{doc.documentTitle}</TableCell>
                                        <TableCell>{doc.documentType}</TableCell>
                                        <TableCell>
                                            {doc.issueDate
                                                ? new Date(doc.issueDate).toLocaleDateString()
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {doc.expiryDate
                                                ? new Date(doc.expiryDate).toLocaleDateString()
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {expiryStatusChip(doc.expiryStatus)}
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="Version History">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleToggleVersions(doc._id)
                                                    }}
                                                >
                                                    <HistoryIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Replace Version">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        openReplaceDialog(doc._id)
                                                    }}
                                                >
                                                    <SwapHorizIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                    {/* Version history sub-panel */}
                                    {expandedDocId === doc._id && (
                                        <TableRow key={`${doc._id}-versions`}>
                                            <TableCell colSpan={6} sx={{ backgroundColor: "#f8fafc", py: 1 }}>
                                                <div className="px-2 py-1">
                                                    <p className="text-xs font-semibold mb-1">Version History</p>
                                                    {(!doc.versions || doc.versions.length === 0) && (
                                                        <p className="text-xs text-gray-400">No previous versions.</p>
                                                    )}
                                                    {(doc.versions || []).map((v, i) => (
                                                        <div key={i} className="flex gap-4 text-xs text-gray-700 py-0.5">
                                                            <span className="text-blue-600 underline">
                                                                {v.fileRef}
                                                            </span>
                                                            <span className="text-gray-400">
                                                                Replaced at:{" "}
                                                                {v.replacedAt
                                                                    ? new Date(v.replacedAt).toLocaleString()
                                                                    : "—"}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* ── Section B: Upload Document ── */}
            <div className="mb-8 bg-white rounded shadow p-5">
                <h3 className="pd-section-title mb-4">Upload Document</h3>

                {uploadSuccess && (
                    <Alert severity="success" className="mb-3">
                        {uploadSuccess}
                    </Alert>
                )}

                <div className="flex flex-wrap gap-4 mb-4">
                    <TextField
                        label="Employee ID"
                        name="empId"
                        value={uploadForm.empId}
                        onChange={handleUploadChange}
                        size="small"
                        sx={{ minWidth: 180 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Document Type</InputLabel>
                        <Select
                            name="documentType"
                            value={uploadForm.documentType}
                            label="Document Type"
                            onChange={handleUploadChange}
                        >
                            {DOC_TYPES.filter((t) => t.value !== "all").map((t) => (
                                <MenuItem key={t.value} value={t.value}>
                                    {t.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Document Title"
                        name="documentTitle"
                        value={uploadForm.documentTitle}
                        onChange={handleUploadChange}
                        size="small"
                        inputProps={{ maxLength: 150 }}
                        sx={{ minWidth: 220 }}
                    />
                    <TextField
                        label="File Reference / URL"
                        name="fileRef"
                        value={uploadForm.fileRef}
                        onChange={handleUploadChange}
                        size="small"
                        sx={{ minWidth: 220 }}
                    />
                    <TextField
                        label="Issue Date"
                        name="issueDate"
                        type="date"
                        value={uploadForm.issueDate}
                        onChange={handleUploadChange}
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ minWidth: 180 }}
                    />
                    <TextField
                        label="Expiry Date (optional)"
                        name="expiryDate"
                        type="date"
                        value={uploadForm.expiryDate}
                        onChange={handleUploadChange}
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ minWidth: 210 }}
                    />
                </div>
                <div className="mb-4">
                    <TextField
                        label="Notes"
                        name="notes"
                        value={uploadForm.notes}
                        onChange={handleUploadChange}
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        inputProps={{ maxLength: 500 }}
                    />
                </div>
                <Button
                    variant="contained"
                    startIcon={<UploadFileIcon />}
                    onClick={handleUploadSubmit}
                    disabled={loading}
                >
                    Upload Document
                </Button>
            </div>

            {/* ── Section D: Expiry Alerts ── */}
            <div className="mb-8 bg-white rounded shadow p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="pd-section-title">Expiry Alerts</h3>
                    <div className="flex gap-3">
                        <Button variant="outlined" onClick={handleLoadExpiryAlerts} disabled={loading}>
                            Load Expiry Alerts
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportCSV}
                            disabled={loading}
                        >
                            Export CSV
                        </Button>
                    </div>
                </div>

                {loading && expiryLoaded && (
                    <div className="flex justify-center py-6">
                        <CircularProgress />
                    </div>
                )}

                {expiryLoaded && !loading && (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Employee ID</TableCell>
                                <TableCell>Title</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Expiry Date</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {expiryAlerts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        No expiry alerts found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {expiryAlerts.map((doc, i) => (
                                <TableRow key={doc._id || i}>
                                    <TableCell>{doc.employeeId}</TableCell>
                                    <TableCell>{doc.documentTitle}</TableCell>
                                    <TableCell>{doc.documentType}</TableCell>
                                    <TableCell>
                                        {doc.expiryDate
                                            ? new Date(doc.expiryDate).toLocaleDateString()
                                            : "—"}
                                    </TableCell>
                                    <TableCell>{expiryStatusChip(doc.expiryStatus)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* ── Section C: Replace Version Dialog ── */}
            <Dialog open={replaceOpen} onClose={() => setReplaceOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Replace Document Version</DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 pt-2">
                        {replaceSuccess && (
                            <Alert severity="success">{replaceSuccess}</Alert>
                        )}
                        <TextField
                            label="New File Reference / URL"
                            value={replaceFileRef}
                            onChange={(e) => setReplaceFileRef(e.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Replacement Reason / Note"
                            value={replaceNote}
                            onChange={(e) => setReplaceNote(e.target.value)}
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReplaceOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleReplaceSubmit}
                        disabled={loading || !replaceFileRef.trim()}
                    >
                        Replace
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}

export default DocumentVaultPage
