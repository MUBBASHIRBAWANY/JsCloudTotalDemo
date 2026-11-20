/**
 * HRMS errors use three fields:
 *   error   — short title (left of the colon)
 *   details — reason lines (right of the colon)
 *   message — "title: reason" for screens that print one string
 */

const GENERIC = /some\s*thing went wrong|something went wrong|server error|internal server error|^error$/i;
const PROGRAMMER = /Cannot read propert|Cannot set propert|is not a function|is not defined|is not iterable|Unexpected token|Invalid string length/i;

function prettyField(field) {
    const label = String(field || "")
        .replace(/Id$/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .trim()
        .toLowerCase();
    return label || "value";
}

function finish(text) {
    if (!text) return text;
    let value = String(text).replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
    value = value.charAt(0).toUpperCase() + value.slice(1);
    return /[.!?]$/.test(value) ? value : `${value}.`;
}

export function hrmsBody(title, reasons) {
    const details = (Array.isArray(reasons) ? reasons : reasons ? [reasons] : [])
        .flat()
        .filter(Boolean)
        .map(finish);
    const message = details.length ? `${title}: ${details.join(" ")}` : title;
    return { status: false, error: title, message, details };
}

export function hrmsFail(res, statusCode, title, reasons) {
    return res.status(statusCode).send(hrmsBody(title, reasons));
}

/**
 * Known failures keep a precise status, title, and reason.
 * Unexpected failures return null so the caller supplies the title and reason.
 */
export function classifyHrmsError(err) {
    if (!err) return null;

    if (err.name === "ValidationError") {
        const details = Object.values(err.errors || {}).map((item) => item.message).filter(Boolean);
        return {
            statusCode: 400,
            error: "Validation failed",
            details: details.length ? details : ["Some fields are invalid."],
        };
    }

    if (err.name === "CastError") {
        const field = err.path === "_id" || !err.path ? "id" : prettyField(err.path);
        return { statusCode: 400, error: "Invalid value", details: [`The ${field} is not valid.`] };
    }

    if (err.code === 11000 || err.code === 11001) {
        const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
        return {
            statusCode: 409,
            error: "Duplicate record",
            details: [`A record with this ${prettyField(field)} already exists.`],
        };
    }

    if (err.name === "DocumentNotFoundError") {
        return { statusCode: 404, error: "Record not found", details: ["The requested record was not found."] };
    }

    const name = err.name || "";
    const raw = err.message || "";

    if (
        name === "MongoServerError" ||
        name === "MongoNetworkError" ||
        name === "MongoAPIError" ||
        name === "MongooseServerSelectionError" ||
        /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|topology was destroyed/i.test(raw)
    ) {
        return {
            statusCode: 500,
            error: "Database error",
            details: ["The database could not complete this request. Please try again."],
        };
    }

    if (raw && !GENERIC.test(raw) && raw.length <= 300 && (name === "Error" || name === "MongooseError")) {
        return {
            statusCode: Number.isInteger(err.statusCode) ? err.statusCode : 400,
            error: "Request rejected",
            details: [raw],
        };
    }

    if (
        name === "TypeError" ||
        name === "ReferenceError" ||
        name === "SyntaxError" ||
        name === "RangeError" ||
        PROGRAMMER.test(raw)
    ) {
        return null;
    }

    return null;
}

export function hrmsCatch(res, err, title, reason) {
    console.error(err);
    const classified = classifyHrmsError(err);
    if (classified) return hrmsFail(res, classified.statusCode, classified.error, classified.details);
    return hrmsFail(res, 500, title, reason || "The request could not be completed. Please try again.");
}

/** Fill `message` as "title: reason" when a handler set only `error` and `details`. */
export function hrmsErrorShape(req, res, next) {
    const send = res.send.bind(res);
    res.send = (body) => {
        if (body && typeof body === "object" && !Buffer.isBuffer(body) && body.status === false && body.error && !body.message) {
            const details = (Array.isArray(body.details) ? body.details : [])
                .filter((item) => typeof item === "string" && item.trim())
                .map(finish);
            body.details = details;
            body.message = details.length ? `${body.error}: ${details.join(" ")}` : body.error;
        }
        return send(body);
    };
    next();
}
