import EBFBalanceModal from "../modal/EBFBalanceModal.js";
import EBFTransactionModal from "../modal/EBFTransactionModal.js";
import { hrmsCatch } from "../utils/hrmsError.js";


export const getEBFBalance = async (req, res) => {
    try {
        const { employeeId } = req.params;
        let ebf = await EBFBalanceModal.findOne({ employeeId });
        if (!ebf) {
            ebf = await EBFBalanceModal.create({ employeeId, balance: 0 });
        }
        res.status(200).send({ status: true, data: ebf });
    } catch (err) {
        return hrmsCatch(res, err, "EBF balance load failed", "The EBF balance could not be loaded. Please try again.");
    }
};

export const getEBFTransactions = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const transactions = await EBFTransactionModal.find({ employeeId })
            .populate("payrollId", "month year")
            .sort({ postingDate: -1 });
        res.status(200).send({ status: true, data: transactions });
    } catch (err) {
        return hrmsCatch(res, err, "EBF transactions load failed", "The EBF transactions could not be loaded. Please try again.");
    }
};

export const postEBFContribution = async (req, res) => {
    try {
        const { employeeId, payrollId, businessId, storeId, departmentId, basicSalary, salaryPeriod, remarks } = req.body;
        
        const contributionRate = 5;
        const amount = basicSalary * (contributionRate / 100);
        
        let ebfBalance = await EBFBalanceModal.findOne({ employeeId });
        if (!ebfBalance) {
            ebfBalance = await EBFBalanceModal.create({ employeeId, balance: 0 });
        }
        
        const openingBalance = ebfBalance.balance;
        const closingBalance = openingBalance + amount;
        
        const transaction = await EBFTransactionModal.create({
            employeeId,
            payrollId,
            businessId,
            storeId,
            departmentId,
            transactionType: "contribution",
            amount,
            openingBalance,
            closingBalance,
            salaryPeriod,
            basicSalary,
            contributionRate,
            postingDate: new Date(),
            remarks: remarks || `EBF contribution for ${salaryPeriod?.month}/${salaryPeriod?.year}`
        });
        
        ebfBalance.balance = closingBalance;
        ebfBalance.totalContributions += amount;
        ebfBalance.lastPayrollId = payrollId;
        ebfBalance.lastUpdated = new Date();
        await ebfBalance.save();
        
        res.status(200).send({ status: true, data: { transaction, balance: ebfBalance } });
    } catch (err) {
        return hrmsCatch(res, err, "Post EBF contribution failed", "The post EBF contribution could not be completed. Please try again.");
    }
};

export const postBulkEBFContributions = async (req, res) => {
    try {
        const { contributions, payrollId } = req.body;
        const results = [];
        
        for (const contrib of contributions) {
            let ebfBalance = await EBFBalanceModal.findOne({ employeeId: contrib.employeeId });
            if (!ebfBalance) {
                ebfBalance = await EBFBalanceModal.create({ employeeId: contrib.employeeId, balance: 0 });
            }
            
            const contributionRate = 5;
            const amount = contrib.basicSalary * (contributionRate / 100);
            const openingBalance = ebfBalance.balance;
            const closingBalance = openingBalance + amount;
            
            const transaction = await EBFTransactionModal.create({
                employeeId: contrib.employeeId,
                payrollId,
                businessId: contrib.businessId,
                storeId: contrib.storeId,
                departmentId: contrib.departmentId,
                transactionType: "contribution",
                amount,
                openingBalance,
                closingBalance,
                salaryPeriod: contrib.salaryPeriod,
                basicSalary: contrib.basicSalary,
                contributionRate,
                postingDate: new Date(),
                remarks: `EBF contribution for ${contrib.salaryPeriod?.month}/${contrib.salaryPeriod?.year}`
            });
            
            ebfBalance.balance = closingBalance;
            ebfBalance.totalContributions += amount;
            ebfBalance.lastPayrollId = payrollId;
            ebfBalance.lastUpdated = new Date();
            await ebfBalance.save();
            
            results.push({ employeeId: contrib.employeeId, amount, closingBalance });
        }
        
        res.status(200).send({ status: true, data: results });
    } catch (err) {
        return hrmsCatch(res, err, "Post bulk EBF contributions failed", "The post bulk EBF contributions could not be completed. Please try again.");
    }
};

export const getEBFReport = async (req, res) => {
    try {
        const { type, id, startDate, endDate } = req.query;
        let matchStage = {};
        
        if (type === "employee") matchStage.employeeId = id;
        else if (type === "business") matchStage.businessId = id;
        else if (type === "store") matchStage.storeId = id;
        
        if (startDate && endDate) {
            matchStage.postingDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        
        const report = await EBFTransactionModal.aggregate([
            { $match: matchStage },
            { $group: {
                _id: `$${type}Id`,
                totalContributions: { $sum: "$amount" },
                transactionCount: { $sum: 1 }
            }}
        ]);
        
        res.status(200).send({ status: true, data: report });
    } catch (err) {
        return hrmsCatch(res, err, "EBF report load failed", "The EBF report could not be loaded. Please try again.");
    }
};
