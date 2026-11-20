import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { updateContactInfo } from "../../Redux/Reducers/essSlice.js"
import {
    TextField,
    Button,
    CircularProgress,
    Alert,
} from "@mui/material"

const emptyForm = {
    phone: "",
    address: "",
    bankName: "",
    bankAccountNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
}

const ESSContactPage = () => {
    const dispatch = useDispatch()
    const { loading } = useSelector((s) => s.ess)

    const [form, setForm] = useState(emptyForm)
    const [successMsg, setSuccessMsg] = useState(null)
    const [errorMsg, setErrorMsg] = useState(null)

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSuccessMsg(null)
        setErrorMsg(null)

        const result = await dispatch(updateContactInfo(form))

        if (updateContactInfo.fulfilled.match(result)) {
            setSuccessMsg("Contact information updated successfully.")
            // Do NOT clear form on success — keep values
        } else {
            // Retain form values on failure so user can retry
            const payload = result.payload
            setErrorMsg(
                typeof payload === "string"
                    ? payload
                    : payload?.message || "Failed to update contact information."
            )
        }
    }

    return (
        <div className="p-6">
            <h2 className="pd-section-title mb-5">Update Contact Information</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
                <TextField
                    label="Phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                />
                <TextField
                    label="Address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                />
                <TextField
                    label="Bank Name"
                    name="bankName"
                    value={form.bankName}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                />
                <TextField
                    label="Bank Account Number"
                    name="bankAccountNumber"
                    value={form.bankAccountNumber}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                />
                <TextField
                    label="Emergency Contact Name"
                    name="emergencyContactName"
                    value={form.emergencyContactName}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                />
                <TextField
                    label="Emergency Contact Phone"
                    name="emergencyContactPhone"
                    value={form.emergencyContactPhone}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                />
                <TextField
                    label="Emergency Contact Relation"
                    name="emergencyContactRelation"
                    value={form.emergencyContactRelation}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                />

                {successMsg && (
                    <Alert severity="success">{successMsg}</Alert>
                )}

                {errorMsg && (
                    <Alert severity="error">{errorMsg}</Alert>
                )}

                <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                    sx={{ alignSelf: "flex-start" }}
                >
                    {loading ? "Saving…" : "Save"}
                </Button>
            </form>
        </div>
    )
}

export default ESSContactPage
