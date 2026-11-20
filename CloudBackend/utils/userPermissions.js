import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import userRoleModel from "../modal/userRoleModal.js";
import { PERMISSIONS } from "./permission.js"

const APP_SECTIONS = ["Administrative", "Setup", "Distributor", "Transactions", "Reports"];
const APP_SUBSECTIONS = [
    "UserSetup",
    "AccountsSetup",
    "ProductSetup",
    "Customer",
    "OpeningBalance",
    "DistributorCustumers",
];

const PERMISSION_ALIASES = {
    "Add ChqBook": "Add Cheque Book",
    "Edit ChqBook": "Edit Cheque Book",
    "Delete ChqBook": "Delete Cheque Book",
    "List ChqBook": "List Cheque Book",
    "View ChqBook": "View Cheque Book",
    "BounceChq": "Bounce Cheque",
    "Add CustomerChq": "Add Customer Cheque",
    "Delete CustomerChq": "Delete Customer Cheque",
    "List CustomerChq": "List Customer Cheque",
    "View CustomerChq": "View Customer Cheque",
    "AddPriceListBulk": "Add Price List Bulk",
    "Add Stock Repalcement": "Add Stock Replacement",
    "Add Stock Repalcement Bulk": "Add Stock Replacement Bulk",
    "Edit Stock Repalcement": "Edit Stock Replacement",
    "Delete Stock Repalcement": "Delete Stock Replacement",
    "List Stock Repalcement": "List Stock Replacement",
    "View Stock Repalcement": "View Stock Replacement",
    "Post Stock Repalcement": "Post Stock Replacement",
    "UnPost Stock Repalcement": "UnPost Stock Replacement",
    "OrderBooker List": "Order Booker List",
    "Add OrderBooker": "Add Distributor Order Booker",
    "Edit OrderBooker": "Edit Distributor Order Booker",
    "Bulk Add OrderBooker": "Bulk Add Order Booker",
    "Recived TransferIn": "Received Transfer In",
    "Trail Balances": "Trial Balances",
    "Chq Transiction Report": "Cheque Transaction Report",
    "Payment Recipt Edit": "Edit Payment Receipt",
    "FIXEDASSETEDIT": "FIXED ASSET EDIT",
};

export const canonicalPermission = (name) => {
    const text = typeof name === "string" ? name.trim() : "";
    if (!text) return "";
    return PERMISSION_ALIASES[text] || text;
};

const exactPermissionList = (value) => {
    const source = Array.isArray(value)
        ? value
        : (value && typeof value === "object" ? Object.values(value) : []);
    const names = [];
    for (const item of source) {
        if (typeof item !== "string") continue;
        const name = canonicalPermission(item);
        if (name && !names.includes(name)) names.push(name);
    }
    return names;
};

const walkPermissionNames = (value, names) => {
    if (typeof value === "string") {
        const text = value.trim();
        if (!text) return;
        names.add(text);
        const name = canonicalPermission(text);
        if (name) names.add(name);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => walkPermissionNames(item, names));
        return;
    }
    if (value && typeof value === "object") {
        Object.values(value).forEach((item) => walkPermissionNames(item, names));
    }
};

let cachedPermissionNames = null;

const quotedPermissionPatterns = [
    /checkName\(\s*["']([^"']+)["']/g,
    /permission=\s*["']([^"']+)["']/g,
    /checkPermission\(\s*["']([^"']+)["']/g,
    /\bitem\s*==+\s*["']([^"']+)["']/g,
    /(?:list|add|edit|remove|view|read|permission)\s*:\s*["']([^"']+)["']/g,
];

const collectPermissionLiterals = () => {
    const names = new Set();
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const skip = new Set(["node_modules", "dist", "build", "agent-tools"]);
    const walk = (dir) => {
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (skip.has(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!/\.(js|jsx)$/.test(entry.name)) continue;
            let text = "";
            try {
                text = fs.readFileSync(full, "utf8");
            } catch {
                continue;
            }
            for (const pattern of quotedPermissionPatterns) {
                pattern.lastIndex = 0;
                let match;
                while ((match = pattern.exec(text))) {
                    const name = match[1].trim();
                    if (name) names.add(name);
                }
            }
        }
    };
    walk(path.join(root, "frontend", "src"));
    walk(path.join(root, "backend"));
    return names;
};

const knownPermissionNames = async () => {
    if (cachedPermissionNames) return cachedPermissionNames;
    const names = new Set();
    walkPermissionNames(PERMISSIONS, names);
    Object.entries(PERMISSION_ALIASES).forEach(([alias, canonical]) => {
        names.add(alias);
        names.add(canonical);
    });
    collectPermissionLiterals().forEach((name) => {
        names.add(name);
        const canonical = canonicalPermission(name);
        if (canonical) names.add(canonical);
    });
    const roles = await userRoleModel.find().select("Roles").lean();
    roles.forEach((role) => walkPermissionNames(role?.Roles, names));
    cachedPermissionNames = [...names];
    return cachedPermissionNames;
};

const sameMembers = (stored, next) => {
    if (!Array.isArray(stored) || stored.length !== next.length) return false;
    const have = new Set(stored.map((item) => String(item)));
    return next.every((item) => have.has(String(item)));
};

const idsOf = async (collectionName) => {
    const docs = await userRoleModel.db
        .collection(collectionName)
        .find({}, { projection: { _id: 1 } })
        .toArray();
    return docs.map((doc) => String(doc._id));
};

const applyAdminScope = async (user) => {
    let changed = false;
    const assign = (field, next) => {
        if (sameMembers(user[field], next)) return;
        user[field] = next;
        changed = true;
    };
    assign("Location", await idsOf("locations"));
    assign("Store", await idsOf("stores"));
    assign("Vendor", await idsOf("vendors"));
    assign("ChartOfAccounts", await idsOf("chart-of-accounts"));
    assign("Section", [...new Set([...(user.Section || []), ...APP_SECTIONS])]);
    assign("Subsection", [...new Set([...(user.Subsection || []), ...APP_SUBSECTIONS])]);
    if (String(user.userType) !== "2") {
        user.userType = "2";
        changed = true;
    }
    if (user.isBoss !== true) {
        user.isBoss = true;
        changed = true;
    }
    return changed;
};

export const isFullAccessAccount = (user) =>
    String(user?.firstname || "").trim().toLowerCase() === "admin";

const listsMatch = (stored, next) =>
    Array.isArray(stored)
    && stored.length === next.length
    && next.every((name, index) => name === stored[index]);

/**
 * A user keeps only the rights stored on that user.
 * A role is copied once, and only when the user has no rights of their own.
 * The admin account is the exception: its full right list is saved on the
 * user and restored whenever access is checked, including the next login.
 */
export const ensureUserPermissions = async (user) => {
    if (!user) return [];

    if (isFullAccessAccount(user)) {
        const names = new Set(await knownPermissionNames());
        walkPermissionNames(user.Roles, names);
        const full = [...names].sort((a, b) => a.localeCompare(b));
        let changed = user.permissionsAssigned !== true || !listsMatch(user.Roles, full);
        if (changed) {
            user.Roles = full;
            user.permissionsAssigned = true;
        }
        if (await applyAdminScope(user)) changed = true;
        if (changed) await user.save({ validateBeforeSave: false });
        return full;
    }

    const current = exactPermissionList(user.Roles);
    if (user.permissionsAssigned === true || current.length > 0) {
        const stored = Array.isArray(user.Roles) ? user.Roles : [];
        const changed = user.permissionsAssigned !== true
            || stored.length !== current.length
            || current.some((name, index) => name !== stored[index]);
        if (changed) {
            user.Roles = current;
            user.permissionsAssigned = true;
            await user.save({ validateBeforeSave: false });
        }
        return current;
    }

    let copied = [];
    if (user.selectRole) {
        try {
            const roleDoc = await userRoleModel.findById(user.selectRole);
            copied = exactPermissionList(roleDoc?.Roles);
        } catch (err) {
            if (err?.name !== "CastError") throw err;
        }
    }

    user.Roles = copied;
    user.permissionsAssigned = true;
    await user.save({ validateBeforeSave: false });
    return copied;
};

export const userHasPermission = (permissions, permissionName) => {
    const wanted = canonicalPermission(permissionName);
    if (!wanted) return false;
    return exactPermissionList(permissions).includes(wanted);
};
