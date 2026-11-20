import jwt from "jsonwebtoken";
import userModel from "../modal/userModal.js";

const JWT_SECRET = "peral-Dynamic";

/**
 * Authentication Middleware
 * Verifies JWT Bearer token from Authorization header.
 * Fetches the user from DB (with selectRole) and attaches to req.user.
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
console.log(authHeader)
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                status: false,
                error: "Access denied: No token provided",
            });
        }

        const token = authHeader.split(" ")[1];

        // Verify the token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                status: false,
                error: "Invalid or expired token",
            });
        }

        // The token payload contains { val: userObject }
        const payload = decoded?.val || {};
        const userId = payload._id || payload.id || payload._doc?._id;

        if (!userId) {
            return res.status(401).json({
                status: false,
                error: "Invalid token payload",
            });
        }

        // Fetch fresh user data from DB
        const user = await userModel.findById(userId);

        if (!user) {
            // Phone order-booker tokens are valid JWTs but are not rows in the User collection.
            const pathOnly = (req.originalUrl || "").split("?")[0].replace(/\/+$/, "") || "/";
            const isOrderBooker = Boolean(payload.OrderBookerID || payload.OrderBookerName || payload.code);
            const orderBookerPost = req.method === "POST" && (
                pathOnly === "/DistributorSaleOrder"
                || pathOnly === "/Attandance"
            );
            const orderBookerGet = req.method === "GET" && (
                pathOnly === "/DistributorSaleOrder"
                || pathOnly === "/DistributorSaleOrder/daySummary"
                || pathOnly === "/DistributorSaleOrder/dayTrend"
                || pathOnly === "/Attandance/today"
                || pathOnly.startsWith("/saleOrder/")
            );
            if (isOrderBooker && (orderBookerPost || orderBookerGet)) {
                req.user = payload;
                return next();
            }
            return res.status(401).json({
                status: false,
                error: "User not found",
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (err) {
        console.error("Auth middleware error:", err);
        return res.status(500).json({
            status: false,
            error: "Internal server error",
        });
    }
};

export default authMiddleware;
