import SavedInvestmentReportModal from "../modal/SavedInvestmentReportModal.js"

const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// GET /SavedInvestmentReport/latest
// Aaj ki saved report wapis laata hai (agar us din kisi ne pehle bana kar save ki ho).
// Optional ?date=YYYY-MM-DD se kisi purani date ki report bhi mil sakti hai.
export const getLatestReport = async (req, res) => {
    try {
        const reportDate = req.query.date || getTodayDate();
        const data = await SavedInvestmentReportModal.findOne({ reportDate });
        res.status(200).send({ status: true, data })
    } catch (err) {
        console.log(err)
        res.status(400).send({ status: false, message: "some thing went wrong" })
    }
}

// POST /SavedInvestmentReport/save
// Aaj ki date par report save/upsert karta hai (ek din = ek hi report).
// Agar us din pehle se saved hai to replace ho jati hai (Regenerate case).
export const saveReport = async (req, res) => {
    try {
        const { rows, startDate, endDate } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).send({ status: false, message: "rows are required" });
        }
        const reportDate = getTodayDate();
        const generatedBy = req.user?.name || req.user?.UserName || req.user?.email || "";
        const data = await SavedInvestmentReportModal.findOneAndUpdate(
            { reportDate },
            { reportDate, rows, startDate, endDate, generatedBy },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.status(200).send({ status: true, data })
    } catch (err) {
        console.log(err)
        res.status(400).send({ status: false, message: "some thing went wrong" })
    }
}

