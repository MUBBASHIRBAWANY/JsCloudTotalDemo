import { ensureUserPermissions, isFullAccessAccount, userHasPermission } from "../utils/userPermissions.js";
import { hrmsBody } from "../utils/hrmsError.js";

const matches = (rule, method, path) => {
    if (rule.method && rule.method !== method) return false;
    if (rule.test && !rule.test(path)) return false;
    return true;
};

export const crudGuard = ({ list, add, edit, remove, view, read, match = [] }) => moduleGuard({
    get: read || [list, add, edit, remove, view].filter(Boolean),
    post: add,
    put: edit,
    delete: remove || edit,
    match,
});

export const moduleGuard = (rules) => async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json(hrmsBody("Sign in required", "Sign in to continue."));
        }

        const permissions = await ensureUserPermissions(req.user);
        if (isFullAccessAccount(req.user)) return next();
        const method = req.method.toUpperCase();
        const path = (req.path || "").toLowerCase();
        let needed = null;

        for (const rule of rules.match || []) {
            if (matches(rule, method, path)) {
                needed = rule.permission;
                break;
            }
        }

        if (!needed) {
            if (method === "POST") needed = rules.post;
            else if (method === "PUT" || method === "PATCH") needed = rules.put;
            else if (method === "DELETE") needed = rules.delete;
            else needed = rules.get;
        }

        const names = (Array.isArray(needed) ? needed : [needed]).filter(Boolean);
        if (names.some((name) => userHasPermission(permissions, name))) return next();

        return res.status(403).json(hrmsBody("Access denied", `You do not have the "${names[0] || "required"}" permission.`));
    } catch (err) {
        console.error("moduleGuard", err);
        return res.status(500).json(hrmsBody("Request failed", "The request could not be completed. Please try again."));
    }
};
