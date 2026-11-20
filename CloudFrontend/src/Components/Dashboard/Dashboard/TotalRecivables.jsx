import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";
import { getDataFundtion } from "../../Api/CRUDFunctions";
import { useSelector } from "react-redux";
import { writeXLSX } from "xlsx";

// More accessible color palette
const COLORS = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#F59E0B", // Amber
    "#06B6D4", // Cyan
    "#EC4899", // Pink
    "#84CC16", // Lime
    "#89CA26", // Lime
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, store }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        console.log(data)
        return (
            <div className="pd-chart-tooltip">
                <p className="font-semibold text-on-surface">
                     { data.name}
                </p>
                <p className="text-on-surface-variant">
                    Balance:{" "}
                    <span className={`font-bold ${data.value < 0 ? 'pd-stat-negative' : 'pd-stat-positive'}`}>
                        {new Intl.NumberFormat("en-PK", {
                            style: "currency",
                            currency: "PKR",
                            minimumFractionDigits: 0,
                        }).format(data.value)}
                    </span>
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                    Transactions: {data.transactionCount}
                </p>
            </div>
        );
    }
    return null;
};

// Custom legend formatter
const renderColorfulLegendText = (value, entry) => {
    const { color, payload } = entry;
    return (
        <span style={{ color }} className="text-sm">
            {payload.fullName || value}:{" "}
            <span className="font-medium">
                {new Intl.NumberFormat("en-PK", {
                    style: "currency",
                    currency: "PKR",
                    minimumFractionDigits: 0,
                }).format(payload.value)}
            </span>
        </span>
    );
};

const TotalRecivables = () => {
    const Store = useSelector((state) => state.Store.Store);
    console.log(Store)
    const [rawData, setRawData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Process data with useMemo for better performance
    const pieData = useMemo(() => {
        if (!rawData.length) return []; // Sirf rawData check karo, Store ki zaroorat nahi

        const storeData = rawData.reduce((acc, row) => {

            const storeKey = row?.store || row?.Store || row?.BigStore || row?.SmallStore || "0";

            // Agar Store available hai to use karo, nahi to storeKey hi name banao
            let storeName = "No Store";
            if (Store && Store.length > 0) {
                const storeInfo = Store.find(s => s._id === storeKey);
                storeName = storeInfo?.StoreName || `Store ${storeKey}`;

            } else {
                storeName = `Store ${storeKey}`;
            }

            if (!acc[storeKey]) {
                acc[storeKey] = {
                    id: storeKey,
                    name: storeName,
                    fullName: storeName,
                    value: 0,
                    transactionCount: 0,
                    positiveBalance: 0,
                    negativeBalance: 0,
                };
            }

            const debit = Number(row.Debit) || 0;
            const credit = Number(row.Credit) || 0;
            const netValue = debit - credit;

            acc[storeKey].value += netValue;
            acc[storeKey].transactionCount += Number(row.voucherCount) || 1;

            if (netValue >= 0) {
                acc[storeKey].positiveBalance += netValue;
            } else {
                acc[storeKey].negativeBalance += Math.abs(netValue);
            }

            return acc;
        }, {});

        return Object.values(storeData).filter(item => item.value !== 0); // Sirf non-zero balance wale dikhao

    }, [rawData, Store]);
    
    console.log("pieData length:", pieData.length);
    console.log("Sample pieData:", pieData.slice(0, 3));
    
    const exportToExcel = (data, fileName = "Report") => {
        if (!data || !data.length) {
            alert("No data available");
            return;
        }

        // Convert JSON → Worksheet
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Create Workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

        // Generate Excel file buffer
        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
        });

        // Save file
        const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
        });

        saveAs(blob, `${fileName}.xlsx`);
    };
    
    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        if (!pieData.length) return null;

        const totalPositive = pieData
            .filter(d => d.value > 0)
            .reduce((sum, d) => sum + d.value, 0);

        const totalNegative = Math.abs(pieData
            .filter(d => d.value < 0)
            .reduce((sum, d) => sum + d.value, 0));

        const netTotal = totalPositive - totalNegative;

        return {
            totalStores: pieData.length,
            totalPositive,
            totalNegative,
            netTotal,
        };
    }, [pieData]);

    const getData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];

            const noStoreData = []

            const data = await getDataFundtion(`/GernalLager/DebtorBalance/?startDate=${formattedDate}&endDate=${formattedDate}`)
            console.log("API response length:", data?.length);
            
            if (!data || data.length === 0) {
                setRawData([]);
                setIsLoading(false);
                return;
            }
            
            const allData = data
                .filter((item) => item?.Client !== "" && item?.Client !== null && item?.Client !== undefined)
                .map(item => ({
                    ...item,
                    store: item.SmallStore || item.BigStore || item.store || "0",
                }));

            console.log("Processed allData length:", allData.length);
            setRawData(allData);
            
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load data. Please try again.");
            setRawData([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        getData();
    }, []);

    if (isLoading) {
        return (
            <div className="pd-dashboard-card flex h-[400px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="mt-4 text-on-surface-variant">Loading store data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pd-dashboard-card">
                <h2 className="mb-4 text-lg font-semibold text-on-surface">
                    Store-wise Balance
                </h2>
                <div className="text-center py-10">
                    <p className="mb-3 text-error">{error}</p>
                    <button
                        onClick={getData}
                        className="pd-btn-save"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!pieData.length) {
        return (
            <div className="pd-dashboard-card">
                <h2 className="mb-4 text-lg font-semibold text-on-surface">
                    Store-wise Balance Distribution
                </h2>
                <div className="py-10 text-center text-on-surface-variant">
                    {rawData.length > 0 ? "No balance data available (all transactions have zero balance)" : "No transaction data available for today."}
                </div>
            </div>
        );
    }

    return (
        <div className="pd-dashboard-card">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-on-surface">
                    Department-wise ReciveAble
                </h2>
                <span className="text-sm text-on-surface-variant">
                    {new Date().toLocaleDateString('en-PK')}
                </span>
            </div>

            {/* Summary Stats */}
            {summaryStats && (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                    <div className="pd-stat-box">
                        <p className="text-sm text-on-surface-variant">Total Department</p>
                        <p className="text-xl font-bold text-primary">{summaryStats.totalStores}</p>
                    </div>
                    <div className="pd-stat-box">
                        <p className="text-sm text-on-surface-variant">Total ReciveAble</p>
                        <p className={`text-xl font-bold ${summaryStats.netTotal >= 0 ? 'pd-stat-positive' : 'pd-stat-negative'}`}>
                            {new Intl.NumberFormat("en-PK", {
                                style: "currency",
                                currency: "PKR",
                                minimumFractionDigits: 0,
                            }).format(summaryStats.netTotal)}
                        </p>
                    </div>
                </div>
            )}

            <ResponsiveContainer className="flex flex-col" width="100%" height={350}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="fullName"
                        innerRadius={70}
                        outerRadius={130}
                        paddingAngle={2}
                        labelLine={false}
                    >
                        {pieData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                stroke="#fff"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>

                    <Tooltip content={<CustomTooltip />} />

                </PieChart>
            </ResponsiveContainer>

            {/* Data Table (Optional) */}

        </div>
    );
};

export default TotalRecivables;