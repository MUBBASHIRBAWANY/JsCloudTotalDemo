import TotalProductModal from "../Modal/TotalProductModal.js";

/**
 * ============================================================
 *  GLOBAL STOCK MIDDLEWARE (stockMiddleware)
 * ============================================================
 *  Har stock add / reduce operation isi module se guzarti hai.
 *
 *  - addStock()    : stock badhata hai (upsert ke saath)
 *  - reduceStock() : stock kam karta hai, lekin STRICT check ke
 *                    saath — stock kabhi minus (negative) nahi
 *                    ho sakta.
 *  - recalculateAvgRate() : AvgRate dobara calculate karta hai
 *                           (Amount / TotalQuantity)
 *
 *  reduceStock() atomic (race-condition safe) hai:
 *  updateOne filter mein `TotalQuantity: { $gte: qty }` guard hota
 *  hai, aur agar koi bhi product update nahi ho paya (kyunke stock
 *  kam tha) to StockError throw hota hai jismein bataya jata hai
 *  kis product ka kitna stock chahiye tha aur kitna available hai.
 * ============================================================
 */

export class StockError extends Error {
    constructor(details, message = "Stock cannot go negative") {
        super(message);
        this.name = "StockError";
        this.statusCode = 400;
        this.details = details || [];
    }
}

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

// Callers pass either { session, model } or a ClientSession on its own.
const normalizeStockOptions = (options) => {
    if (!options) return {};
    if (typeof options.inTransaction === "function") {
        return { session: options };
    }
    return options;
};

const withSession = (query, session) => (session ? query.session(session) : query);

/**
 * Stock ADD (increase) — upsert ke saath.
 *
 * entries: [{ ProductName, Location, Store, quantity, amount }]
 */
export const addStock = async (entries, rawOptions = {}) => {
    const options = normalizeStockOptions(rawOptions);
    const Model = options.model || TotalProductModal;

    if (!Array.isArray(entries) || entries.length === 0) {
        return { success: true, added: 0, modified: 0 };
    }

    const bulkOps = entries.map((entry) => {
        const qty = toNumber(entry.quantity);
        const amount = toNumber(entry.amount);

        return {
            updateOne: {
                filter: {
                    ProductName: entry.ProductName,
                    Location: entry.Location,
                    Store: entry.Store
                },
                update: {
                    $inc: {
                        TotalQuantity: qty,
                        Amount: amount
                    },
                    $setOnInsert: {
                        ProductName: entry.ProductName,
                        Location: entry.Location,
                        Store: entry.Store,
                        AvgRate: toNumber(entry.avgRate)
                    }
                },
                upsert: true
            }
        };
    });

    const writeOptions = { ordered: false };
    if (options.session) writeOptions.session = options.session;
    const result = await Model.bulkWrite(bulkOps, writeOptions);

    return {
        success: true,
        added: result.upsertedCount,
        modified: result.modifiedCount
    };
};

/**
 * Stock REDUCE (decrease) — STRICT.
 *
 * Stock kabhi minus nahi ho sakta:
 *  1. har update atomic hai — filter mein
 *     `TotalQuantity: { $gte: qty }` guard lagta hai
 *  2. agar koi product match nahi karta (stock kam ya product
 *     exist nahi) to us entry ko update nahi kiya jata
 *  3. agar koi bhi entry fail ho to StockError throw hota hai
 *     jismein details hoti hain: kaunsa product, kitna chahiye,
 *     kitna available hai.
 *
 * entries: [{ ProductName, Location, Store, quantity, amount }]
 * options: { model } — TotalProductModal ya DamageProductModal
 *
 * throws: StockError (statusCode = 400, details = [{product,
 *         available, required, reason}])
 */
export const reduceStock = async (entries, rawOptions = {}) => {
    const options = normalizeStockOptions(rawOptions);
    const Model = options.model || TotalProductModal;

    if (!Array.isArray(entries) || entries.length === 0) {
        return { success: true, reduced: 0 };
    }

    // Zero/negative quantity entries are no-ops — skip them
    const validEntries = entries.filter((entry) => toNumber(entry.quantity) > 0);

    const errors = [];

    await Promise.all(
        validEntries.map(async (entry) => {
            const qty = toNumber(entry.quantity);
            const amount = toNumber(entry.amount);

            const result = await Model.updateOne(
                {
                    ProductName: entry.ProductName,
                    Location: entry.Location,
                    Store: entry.Store,
                    TotalQuantity: { $gte: qty }
                },
                {
                    $inc: {
                        TotalQuantity: -qty,
                        Amount: -amount
                    }
                },
                options.session ? { session: options.session } : undefined
            );

            // matchedCount === 0 => product nahi mila ya stock kam tha
            if (result.matchedCount === 0) {
                const product = await withSession(Model.findOne({
                    ProductName: entry.ProductName,
                    Location: entry.Location,
                    Store: entry.Store
                }), options.session);

                errors.push({
                    product: entry.ProductName,
                    available: product ? toNumber(product.TotalQuantity) : 0,
                    required: qty,
                    reason: product ? "Insufficient stock" : "Product not found"
                });
            }
        })
    );

    if (errors.length > 0) {
        throw new StockError(errors);
    }

    return { success: true, reduced: validEntries.length };
};

/**
 * AvgRate recalculate karta hai: AvgRate = Amount / TotalQuantity
 *
 * keys: [{ ProductName, Location, Store }]
 * options: { model }
 */
export const recalculateAvgRate = async (keys, rawOptions = {}) => {
    const options = normalizeStockOptions(rawOptions);
    const Model = options.model || TotalProductModal;

    for (const key of keys) {
        const product = await withSession(Model.findOne({
            ProductName: key.ProductName,
            Location: key.Location,
            Store: key.Store
        }), options.session);

        if (!product) continue;

        const qty = toNumber(product.TotalQuantity);
        const avgRate = qty > 0 ? toNumber(product.Amount) / qty : 0;

        await Model.updateOne(
            { _id: product._id },
            { $set: { AvgRate: avgRate } },
            options.session ? { session: options.session } : undefined
        );
    }
};
