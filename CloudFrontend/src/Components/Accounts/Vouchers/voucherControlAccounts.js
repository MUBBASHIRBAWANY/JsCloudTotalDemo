/** Normalize select value / id to string */
export const asAccountId = (value) => {
    if (value == null || value === "") return "";
    if (typeof value === "object") return String(value.value || value._id || "");
    return String(value);
};

/** True when user tried to pick Admin control account directly (must pick Client/Transporter instead) */
export const isDirectControlAccount = (selected, admin = {}) => {
    const id = asAccountId(selected);
    if (!id) return false;
    return (
        id === String(admin.TransporterPayable || "") ||
        id === String(admin.Client || "")
    );
};

export const isDirectTransporterPayable = (selected, admin = {}) => {
    const id = asAccountId(selected);
    if (!id || !admin?.TransporterPayable) return false;
    return id === String(admin.TransporterPayable);
};

export const isDirectClientControl = (selected, admin = {}) => {
    const id = asAccountId(selected);
    if (!id || !admin?.Client) return false;
    return id === String(admin.Client);
};

/** Hide Client + TransporterPayable control accounts from account pickers */
export const excludeControlAccounts = (accounts, admin = {}) => {
    const blocked = new Set(
        [admin.TransporterPayable, admin.Client]
            .filter(Boolean)
            .map((id) => String(id))
    );
    if (!blocked.size) return accounts || [];
    return (accounts || []).filter((item) => !blocked.has(String(item?._id)));
};
