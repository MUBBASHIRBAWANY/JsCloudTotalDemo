import React, { useEffect, useState, useMemo } from 'react';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { exportProfessionalExcel } from "../../../../utils/exportProfessionalExcel";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmt2, round2n } from '../../../../utils/round2';
import { buildInvoiceGeoLookups, resolveInvoiceGeo } from './resolveInvoiceGeo';
import { mergeSalesReturnInvoices } from './salesReturnSummaryRows';
const RegionWise = ({ data = {} }) => {
console.log(data)
    const [res, setRes] = useState({ data: [] });
    const [dumpData, setDumpData] = useState([]);
    const [viewType, setViewType] = useState('city'); // 'city', 'region', or 'zone'
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch current API for amounts (Gross, GST, TTS, AddAmount, LessAmount, TotalAmount)
                const summaryRes = await getDataFundtion(
                    `/SaleInvoice/SalesinvoiceSummry?startDate=${data.startDate}&endDate=${data.endDate}&Store=${data.store}`
                );
                setRes(summaryRes);

                // Fetch SalesDumpData API for Total Discount (gross total discount) and Booker
                const dumpRes = await getDataFundtion(
                    `/SaleInvoice/SalesDumpData?startDate=${data.startDate}&endDate=${data.endDate}&Store=${data.store}`
                );
                setDumpData(dumpRes.data || []);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Build Total Discount, Gross Amount and Booker aggregations from SalesDumpData
    const dumpLookups = useMemo(() => {
        const discountByCity = {};
        const discountByRegion = {};
        const discountByZone = {};
        const grossByCity = {};
        const grossByRegion = {};
        const grossByZone = {};
        const bookerByCity = {};
        const bookerByRegion = {};
        const bookerByZone = {};
        const geoLookups = buildInvoiceGeoLookups(data);

        dumpData.forEach((item) => {
            const customer = data.Customer?.find(c => c._id === item.Client);
            const geo = resolveInvoiceGeo({
                ...(customer || {}),
                OrderBooker: item.OrderBooker || customer?.OrderBooker,
            }, geoLookups);
            const orderBooker = data.OrderBooker?.find(ob => ob._id === customer?.OrderBooker);

            // Sum ALL discount types for gross total discount
            const totalDiscount =
                (item.diBspass || 0) + (item.RToffer || 0) + (item.WToffer || 0) +
                (item.RpDrive || 0) + (item.WHOLESALEDEAL || 0) + (item.RTWholeSale || 0) +
                (item.SubDisTPromotion || 0) + (item.TradeOffer || Number(item.discount || 0)) +
                (item.HOTZONEDRIVE || 0) + (Number(item.SpecialTO) || 0) + (Number(item.SPECIALDISCOUNT) || 0);

            const grossAmount = Number(item.GrossAmount) || 0;
            const cityName = geo.City;
            const regionName = geo.Region;
            const zoneName = geo.Zone;
            const bookerName = orderBooker?.OrderBookerName || '-';

            if (cityName !== '-') {
                discountByCity[cityName] = (discountByCity[cityName] || 0) + totalDiscount;
                grossByCity[cityName] = (grossByCity[cityName] || 0) + grossAmount;
                if (!bookerByCity[cityName]) bookerByCity[cityName] = new Set();
                if (bookerName !== '-') bookerByCity[cityName].add(bookerName);
            }

            if (regionName !== '-') {
                discountByRegion[regionName] = (discountByRegion[regionName] || 0) + totalDiscount;
                grossByRegion[regionName] = (grossByRegion[regionName] || 0) + grossAmount;
                if (!bookerByRegion[regionName]) bookerByRegion[regionName] = new Set();
                if (bookerName !== '-') bookerByRegion[regionName].add(bookerName);
            }

            if (zoneName !== '-') {
                discountByZone[zoneName] = (discountByZone[zoneName] || 0) + totalDiscount;
                grossByZone[zoneName] = (grossByZone[zoneName] || 0) + grossAmount;
                if (!bookerByZone[zoneName]) bookerByZone[zoneName] = new Set();
                if (bookerName !== '-') bookerByZone[zoneName].add(bookerName);
            }
        });

        return { discountByCity, discountByRegion, discountByZone, grossByCity, grossByRegion, grossByZone, bookerByCity, bookerByRegion, bookerByZone };
    }, [dumpData, data.Customer, data.City, data.Region, data.Zone, data.Zsm, data.OrderBooker]);

    const downloadExcel = async () => {
        const excelData = currentSummary.map((item) => ({
            [viewType === "city" ? "City" : viewType === "zone" ? "Zone" : "Region"]: item.name,
            "Zone": item.zone || '',
            "No of Invoices": item.count,
            "Total Cartons": round2n(item.totalCartons),
            "Gross Amount": round2n(item.totalGross),
            "GST": round2n(item.totalGst),
            "Total Discount": round2n(item.totalDiscount),
            "1% Discount": round2n(item.totalTTS),
            "Add Freight Amount": round2n(item.AddAmount),
            "Less Freight Amount": round2n(item.LessAmount),
            "Total Amount": round2n(item.totalAmount),
            "Booker": item.bookers
        }));

        excelData.push({
            [viewType === "city" ? "City" : viewType === "zone" ? "Zone" : "Region"]: "Grand Total",
            "No of Invoices": grandTotals.totalInvoices,
            "Total Cartons": round2n(grandTotals.totalCartons),
            "Gross Amount": round2n(grandTotals.totalGross),
            "GST": round2n(grandTotals.totalGst),
            "Total Discount": round2n(grandTotals.totalDiscount),
            "1% Discount": round2n(grandTotals.totalTTS),
            "Add Freight Amount": round2n(grandTotals.totalAddAmount),
            "Less Freight Amount": round2n(grandTotals.totalLessAmount),
            "Total Amount": round2n(grandTotals.totalAmount),
            "Booker": ""
        });

        const department = data.store?.length > 0
            ? data.storeforDrp
                ?.filter(item => data.store.includes(item._id))
                .map(item => item.StoreName)
                .join(", ") || "All"
            : "All";

        await exportProfessionalExcel({
            title: "Sales Summary",
            fileName: `SalesSummary_${viewType}`,
            sheetName: "Sales Summary",
            rows: excelData,
            meta: [
                `Period: ${data.startDate || ""} to ${data.endDate || ""}`,
                `Department: ${department}`,
                `View: ${viewType}`,
            ],
        });
    };
    const downloadPDF = () => {
        const doc = new jsPDF();

        doc.text("Sales Summary Report", 14, 15);

        const tableColumn = [
            viewType === "city" ? "City" : viewType === "zone" ? "Zone" : "Region",
            "Zone",
            "Invoices",
            "Cartons",
            "Gross",
            "GST",
            "Total Discount",
            "1% Discount",
            "Add Freight",
            "Less Freight",
            "Total Amount"
        ];

        const tableRows = currentSummary.map((item) => ([
            item.name,
            item.zone || '',
            item.count,
            fmt2(item.totalCartons),
            fmt2(item.totalGross),
            fmt2(item.totalGst),
            fmt2(item.totalDiscount),
            fmt2(item.totalTTS),
            fmt2(item.AddAmount),
            fmt2(item.LessAmount),
            fmt2(item.totalAmount)
        ]));

        tableRows.push([
            "Grand Total",
            grandTotals.totalInvoices,
            fmt2(grandTotals.totalCartons),
            fmt2(grandTotals.totalGross),
            fmt2(grandTotals.totalGst),
            fmt2(grandTotals.totalDiscount),
            fmt2(grandTotals.totalTTS),
            fmt2(grandTotals.totalAddAmount),
            fmt2(grandTotals.totalLessAmount),
            fmt2(grandTotals.totalAmount)
        ]);

        autoTable(doc, {
            startY: 25,
            head: [tableColumn],
            body: tableRows
        });

        doc.save(`SalesSummary_${viewType}.pdf`);
    };
    // Process summary data from current API
    const geoLookups = buildInvoiceGeoLookups(data);
    const summaryRows = mergeSalesReturnInvoices(res.data || [], dumpData);
    const alldata = summaryRows.map((item, idx) => {
        const client = data.Customer?.find(c => c._id === item.Client);
        const location = data.setlocation?.find(l => l.value === item.Location);
        const store = data.storeforDrp?.find(s => s._id === item.Store);
        const geo = resolveInvoiceGeo({
            ...(client || {}),
            OrderBooker: item.OrderBooker || client?.OrderBooker,
        }, geoLookups);

        return {
            id: idx + 1,
            invoice: item.SalesInvoice || item.Invoice || "-",
            date: item.SalesInvoiceDate || item.date || "-",
            City: geo.City,
            Region: geo.Region,
            Zone: geo.Zone,
            client: client?.CutomerName || client?.DistrbutorName || "-",
            ClientSalesFlow: client?.SalesFlowRef || client?.OldCode || "-",
            code: client?.code || "-",
            NTN: client?.NTN || "-",
            STN: client?.STN || "-",
            SalesFlowRef: item.SalesFlowRef || "-",
            Location: location?.label || "-",
            Store: store?.StoreName || "-",
            carton: Number(item.carton ?? 0),
            GrossAmount: Number(item.GrossAmount ?? 0),
            TTS: Number(item.TTS ?? 0),
            Gst: Number(item.Gst ?? 0),
            Advancetax: Number(item.Advancetax ?? 0),
            discount: Number(item.discount ?? 0),
            AddAmount: Number(item.AddAmount || 0),
            LessAmount: Number(item.LessAmount || 0),
            TotalAmount: Number(
                (Number(item.GrossAmount ?? item.Amount) -
                    Number(item.TTS ?? 0) -
                    Number(item.LessAmount ?? 0) -
                    Number(item.discount ?? 0) +
                    Number(item.AddAmount || 0)) -
                Number(item.Gst ?? 0)
            ),
        };
    });

    // Group data by city (with Zone and Region)
    const getCitySummary = () => {
        const grouped = alldata.reduce((acc, item) => {
            const city = item.City;
            if (!acc[city]) {
                acc[city] = [];
            }
            acc[city].push(item);
            return acc;
        }, {});

        return Object.keys(grouped).map(city => {
            const totalGross = dumpLookups.grossByCity[city] || 0;
            const totalDiscount = dumpLookups.discountByCity[city] || 0;
            const totalTTS = grouped[city].reduce((sum, item) => sum + item.TTS, 0);
            const totalGst = grouped[city].reduce((sum, item) => sum + item.Gst, 0);
            const AddAmount = grouped[city].reduce((sum, item) => sum + item.AddAmount, 0);
            const LessAmount = grouped[city].reduce((sum, item) => sum + item.LessAmount, 0);
            // Get unique zones and regions for this city
            const zones = [...new Set(grouped[city].map(i => i.Zone).filter(z => z && z !== '-'))];
            const regions = [...new Set(grouped[city].map(i => i.Region).filter(r => r && r !== '-'))];
            return {
                name: city,
                zone: zones.join(', ') || '-',
                region: regions.join(', ') || '-',
                count: grouped[city].length,
                totalGross,
                totalGst,
                totalDiscount,
                totalTTS,
                AddAmount,
                LessAmount,
                totalAmount: totalGross + totalGst - totalDiscount - totalTTS + AddAmount - LessAmount,
                totalCartons: grouped[city].reduce((sum, item) => sum + item.carton, 0),
                bookers: Array.from(dumpLookups.bookerByCity[city] || []).join(', ') || '-'
            };
        });
    };

    // Group data by region (with Zone)
    const getRegionSummary = () => {
        const grouped = alldata.reduce((acc, item) => {
            const region = item.Region;
            if (!acc[region]) {
                acc[region] = [];
            }
            acc[region].push(item);
            return acc;
        }, {});

        return Object.keys(grouped).map(region => {
            const totalGross = dumpLookups.grossByRegion[region] || 0;
            const totalDiscount = dumpLookups.discountByRegion[region] || 0;
            const totalTTS = grouped[region].reduce((sum, item) => sum + item.TTS, 0);
            const totalGst = grouped[region].reduce((sum, item) => sum + item.Gst, 0);
            const AddAmount = grouped[region].reduce((sum, item) => sum + item.AddAmount, 0);
            const LessAmount = grouped[region].reduce((sum, item) => sum + item.LessAmount, 0);
            // Get unique zones for this region
            const zones = [...new Set(grouped[region].map(i => i.Zone).filter(z => z && z !== '-'))];
            return {
                name: region,
                zone: zones.join(', ') || '-',
                count: grouped[region].length,
                totalGross,
                totalGst,
                totalDiscount,
                totalTTS,
                AddAmount,
                LessAmount,
                totalAmount: totalGross + totalGst - totalDiscount - totalTTS + AddAmount - LessAmount,
                totalCartons: grouped[region].reduce((sum, item) => sum + item.carton, 0),
                bookers: Array.from(dumpLookups.bookerByRegion[region] || []).join(', ') || '-'
            };
        });
    };

    // Group data by zone
    const getZoneSummary = () => {
        const grouped = alldata.reduce((acc, item) => {
            const zone = item.Zone;
            if (!acc[zone]) {
                acc[zone] = [];
            }
            acc[zone].push(item);
            return acc;
        }, {});

        return Object.keys(grouped).map(zone => {
            const totalGross = dumpLookups.grossByZone[zone] || 0;
            const totalDiscount = dumpLookups.discountByZone[zone] || 0;
            const totalTTS = grouped[zone].reduce((sum, item) => sum + item.TTS, 0);
            const totalGst = grouped[zone].reduce((sum, item) => sum + item.Gst, 0);
            const AddAmount = grouped[zone].reduce((sum, item) => sum + item.AddAmount, 0);
            const LessAmount = grouped[zone].reduce((sum, item) => sum + item.LessAmount, 0);
            return {
                name: zone,
                count: grouped[zone].length,
                totalGross,
                totalGst,
                totalDiscount,
                totalTTS,
                AddAmount,
                LessAmount,
                totalAmount: totalGross + totalGst - totalDiscount - totalTTS + AddAmount - LessAmount,
                totalCartons: grouped[zone].reduce((sum, item) => sum + item.carton, 0),
                bookers: Array.from(dumpLookups.bookerByZone[zone] || []).join(', ') || '-'
            };
        });
    };

    // Get current summary based on view type
    const currentSummary = viewType === 'city' ? getCitySummary() : viewType === 'zone' ? getZoneSummary() : getRegionSummary();

    // Calculate grand totals
    const grandTotals = {
        totalAmount: currentSummary.reduce((sum, item) => sum + item.totalAmount, 0),
        totalGross: currentSummary.reduce((sum, item) => sum + item.totalGross, 0),
        totalGst: currentSummary.reduce((sum, item) => sum + item.totalGst, 0),
        totalTTS: currentSummary.reduce((sum, item) => sum + item.totalTTS, 0),
        totalAddAmount: currentSummary.reduce((sum, item) => sum + item.AddAmount, 0),
        totalLessAmount: currentSummary.reduce((sum, item) => sum + item.LessAmount, 0),
        totalDiscount: currentSummary.reduce((sum, item) => sum + item.totalDiscount, 0),
        totalCartons: currentSummary.reduce((sum, item) => sum + item.totalCartons, 0),
        totalInvoices: currentSummary.reduce((sum, item) => sum + item.count, 0)
    };

    // Styles
    const styles = {
        container: {
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px'
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333'
        },
        toggleContainer: {
            display: 'flex',
            gap: '10px'
        },
        toggleButton: {
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
        },
        activeButton: {
            backgroundColor: '#4CAF50',
            color: 'white'
        },
        inactiveButton: {
            backgroundColor: '#f0f0f0',
            color: '#333'
        },
        summaryTable: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        },
        th: {
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '12px',
            textAlign: 'left',
            fontSize: '14px'
        },
        td: {
            padding: '10px',
            borderBottom: '1px solid #ddd',
            textAlign: 'left',
            fontSize: '13px'
        },
        grandTotalRow: {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold'
        },
        grandTotalTd: {
            padding: '12px',
            borderTop: '2px solid #333',
            fontWeight: 'bold'
        }
    };

    return (
        <div style={styles.container}>
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '6px solid #e0e0e0',
                        borderTop: '6px solid #2196F3',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                </div>
            ) : (
            <>
            {/* Header with toggle */}
            <div style={styles.header}>
                <h1 style={styles.title}>Sales Summary</h1>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={downloadExcel} style={styles.toggleButton}>
                        Download Excel
                    </button>

                    <button onClick={downloadPDF} style={styles.toggleButton}>
                        Download PDF
                    </button>
                </div>
                <div style={styles.toggleContainer}>
                    <button
                        style={{
                            ...styles.toggleButton,
                            ...(viewType === 'city' ? styles.activeButton : styles.inactiveButton)
                        }}
                        onClick={() => setViewType('city')}
                    >
                        City Wise
                    </button>
                    <button
                        style={{
                            ...styles.toggleButton,
                            ...(viewType === 'zone' ? styles.activeButton : styles.inactiveButton)
                        }}
                        onClick={() => setViewType('zone')}
                    >
                        Zone Wise
                    </button>
                    <button
                        style={{
                            ...styles.toggleButton,
                            ...(viewType === 'region' ? styles.activeButton : styles.inactiveButton)
                        }}
                        onClick={() => setViewType('region')}
                    >
                        Region Wise
                    </button>
                </div>
            </div>

            {/* Summary Table */}
            <table style={styles.summaryTable}>
                <thead>
                    <tr>
                        <th style={styles.th}>{viewType === 'city' ? 'City' : viewType === 'zone' ? 'Zone' : 'Region'}</th>
                        {viewType !== 'zone' ? <th style={styles.th}>Zone</th> : null}
                        {viewType === 'city' ? <th style={styles.th}>Region</th> : null}
                        <th style={styles.th}>No. of Invoices</th>
                        <th style={styles.th}>Total Cartons</th>
                        <th style={styles.th}>Gross Amount</th>
                        <th style={styles.th}>GST</th>
                        <th style={styles.th}>Total Discount</th>
                        <th style={styles.th}>1% discount</th>
                        <th style={styles.th}>Add Freight Amount</th>
                        <th style={styles.th}>Less Freight Amount</th>
                        <th style={styles.th}>Total Amount</th>
                        <th style={styles.th}>Booker</th>
                    </tr>
                </thead>
                <tbody>
                    {currentSummary.map(item => (
                        <tr key={item.name}>
                            <td style={styles.td}>{item.name}</td>
                            {viewType !== 'zone' ? <td style={styles.td}>{item.zone}</td> : null}
                            {viewType === 'city' ? <td style={styles.td}>{item.region}</td> : null }
                            <td style={styles.td}>{item.count}</td>
                            <td style={styles.td}>{fmt2(item.totalCartons)}</td>
                            <td style={styles.td}>Rs. {item.totalGross.toFixed(2)}</td>
                            <td style={styles.td}>Rs. {item.totalGst.toFixed(2)}</td>
                            <td style={styles.td}>Rs. {item.totalDiscount.toFixed(2)}</td>
                            <td style={styles.td}>Rs. {item.totalTTS?.toFixed(2)}</td>
                            <td style={styles.td}>Rs. {item.AddAmount?.toFixed(2)}</td>
                            <td style={styles.td}>Rs. {item.LessAmount?.toFixed(2)}</td>
                            <td style={styles.td}>Rs. {item.totalAmount.toFixed(2)}</td>
                            <td style={styles.td}>{item.bookers}</td>
                        </tr>
                    ))}

                    {/* Grand Total Row */}
                    <tr style={styles.grandTotalRow}>
                        <td style={styles.grandTotalTd}><strong>Grand Total</strong></td>
                        {viewType !== 'zone' ? <td style={styles.grandTotalTd}><strong></strong></td> : null}
                        {viewType === 'city' ? <td style={styles.grandTotalTd}><strong></strong></td> : null }
                        <td style={styles.grandTotalTd}><strong>{grandTotals.totalInvoices}</strong></td>
                        <td style={styles.grandTotalTd}><strong>{fmt2(grandTotals.totalCartons)}</strong></td>
                        <td style={styles.grandTotalTd}><strong>Rs. {grandTotals.totalGross.toFixed(2)}</strong></td>
                        <td style={styles.grandTotalTd}><strong>Rs. {grandTotals.totalGst.toFixed(2)}</strong></td>
                        <td style={styles.grandTotalTd}><strong>Rs. {grandTotals.totalDiscount.toFixed(2)}</strong></td>
                        <td style={styles.grandTotalTd}><strong>Rs. {grandTotals.totalTTS?.toFixed(2)}</strong></td>
                        <td style={styles.grandTotalTd}><strong>Rs. {grandTotals.totalAddAmount?.toFixed(2)}</strong></td>
                        <td style={styles.grandTotalTd}><strong>Rs. {grandTotals.totalLessAmount?.toFixed(2)}</strong></td>
                        <td style={styles.grandTotalTd}><strong>Rs. {grandTotals.totalAmount.toFixed(2)}</strong></td>
                        <td style={styles.grandTotalTd}><strong></strong></td>
                    </tr>
                </tbody>
            </table>

            {/* Optional: Show empty state if no data */}
            {currentSummary.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    No data available
                </div>
            )}
            </>
            )}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default RegionWise;
