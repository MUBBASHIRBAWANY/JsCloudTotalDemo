import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AppSelect from '../../Global/AppSelect.jsx'
import * as XLSX from "xlsx";
import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun } from "docx";
import { createDataFunction, getDataFundtion, updateDataFunction } from "../../../Api/CRUDFunctions";

const OrderDCView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [distributorUrdu, setDistributorUrdu] = useState("");
    const [cityUrdu, setCityUrdu] = useState("")
    const Transort = useSelector((state) => state.Transport.Transport)
    const Products = useSelector((state) => state.Product.product);
    const Store = useSelector((state) => state.Store.Store);
    const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers);
    const Order = useSelector((state) => state.DistributorOrder.DistributorOrder)
    const OrderDc = useSelector((state) => state.OrderDc.OrderDc);
    const Transport = useSelector((state) => state.Transport.Transport)
    const login = useSelector((state) => state.LoginerReducer.userDetail)
    const [view, setView] = useState(false)
    const City = useSelector((state) => state.City.City)
    const [builtitype, setbuiltype] = useState("")
    const [TransporterDrp, setTransporterDrp] = useState([])
    const [builtiAmount, setbuiltiAmount] = useState("")
    const [builtiNumber, setbuiltiNumber] = useState("")
    const [remarks, setremarks] = useState("")
    const [record, setRecord] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dcIndex, setDcIndex] = useState(-1);
    const [SelectedTransporter, setSelectedTransporter] = useState([])

    const companyInfo = {
        name: "جعفر ایجنسی",
        city: "کراچی",
        phone: "----",
    };
    useEffect(() => {

        const translateDistributor = async () => {

            if (!record || !record.Distrbutor) return;

            const distributor = EditDistributor.find(
                (d) => d._id === record.Distrbutor
            );

            const cityName = City?.find(
                (item) => item._id === distributor?.City
            )?.CityName;

            if (cityName) {
                const ur = await translateText(cityName);
                setCityUrdu(ur);
            }

            if (distributor?.DistrbutorName) {
                const ur = await translateText(distributor.DistrbutorName);
                setDistributorUrdu(ur);
            }
            setView(true)
        };

        translateDistributor();

    }, [record, EditDistributor]);
    const handleNext = () => {
        if (dcIndex < OrderDc.length - 1) {
            const nextId = OrderDc[dcIndex + 1]._id;
            navigate(`/OrderDCView/${nextId}`);
        }
    };

    const handlePrev = () => {
        if (dcIndex > 0) {
            const prevId = OrderDc[dcIndex - 1]._id;
            navigate(`/OrderDCView/${prevId}`);
        }
    };
    const loadDCOptions = (inputValue, callback) => {
        const filtered = OrderDc.filter(dc =>
            dc.DCCode.toLowerCase().includes(inputValue.toLowerCase())
        );

        const options = filtered.map(dc => ({
            label: dc.DCCode,
            value: dc._id
        }));

        callback(options);
    };
    const handleDCChange = (selectedOption) => {
        if (selectedOption) {
            navigate(`/OrderDCView/${selectedOption.value}`);
        }
    };
    useEffect(() => {
        if (OrderDc.length && id) {
            setDcIndex(OrderDc.findIndex((item) => item._id === id));
        }
    }, [OrderDc, id]);

    const dcRef = useRef(OrderDc);
    dcRef.current = OrderDc;

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const dc = await getDataFundtion(`/DcOrder/${id}`);
                if (!cancelled && dc?.DCData) {
                    setRecord(dc);
                    setIsLoading(false);
                }
            } catch (err) {
                const cached = dcRef.current.find((item) => item._id === id && Array.isArray(item.DCData));
                if (!cancelled && cached) {
                    setRecord(cached);
                    setIsLoading(false);
                } else if (!cancelled) {
                    console.error(err);
                    toast.error("DC load nahi hui");
                    setIsLoading(false);
                }
            }
        };
        load();
        return () => { cancelled = true; };
    }, [id]);

    useEffect(() => {
        if (!record?.DCData) return;
        const orders = record.DCData.map((item) => item?.Order);
        setTransporterDrp((Transort || []).map((item) => ({
            value: item._id,
            label: item.TransporterName,
        })));
        const defultTransport = (Transort || []).find((item) => item._id == record.Transporter);
        setSelectedTransporter({
            value: defultTransport?._id,
            label: defultTransport?.TransporterName,
        });
        const remarks = Order.find((item) => item.OrderCode == orders[0])?.Remarks || "";
        setremarks(remarks.startsWith("Remarks:") ? remarks.slice(8).trim() : remarks);
    }, [record, Transort, Order]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[color:var(--pd-primary)] mx-auto"></div>
                    <p className="mt-4 pd-text-muted">Loading delivery challan details...</p>
                </div>
            </div>
        );
    }

    if (!record) {
        return (
            <div className="flex justify-center items-center h-screen">

                <div className="pd-bg-surface p-8 rounded-xl shadow-lg max-w-md text-center">
                    <div className="pd-bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 pd-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <h2 className="pd-page-title mb-2">Delivery Challan Not Found</h2>
                    <p className="pd-text-muted mb-6">
                        The delivery challan you requested could not be found.
                    </p>
                    <button
                        onClick={() => navigate("/OrderDCList")}
                        className="pd-btn-save"
                    >
                        Back to Delivery Challans
                    </button>
                </div>
            </div>
        );
    }


    const translateText = async (text) => {
        try {
            const res = await createDataFunction("/translate", {
                text: text,
                to: "ur",
            });

            return res.text;
        } catch (err) {
            console.error("Translation error:", err);
            return text;
        }
    };
    const distributor = EditDistributor.find((d) => d._id === record.Distrbutor);
    const store = Store.find((s) => s._id === record.Store);

    const totalCarton = record.DCData.reduce(
        (sum, row) => sum + (parseInt(row.carton) || 0),
        0
    );
    const totalBox = record.DCData.reduce(
        (sum, row) => sum + (parseInt(row.box) || 0),
        0
    );

    const getProductName = (productId) => {
        const product = Products.find((p) => p._id === productId);
        return product ? product.ProductName : 'N/A';
    };

    const updateStatus = async (Status) => {

        const orders = record.DCData.map((t) => t.Order);

        try {
            if (Status === "Deliverd") {
                const data = await updateDataFunction(`/DcOrder/posteDc/${id}`, record);

                const allRecord = {
                    ...record,
                    PostStatus: "Deliverd"
                };
                toast.success("Status updated successfully");
                setTimeout(() => {
                    navigate("/OrderDCList");
                }, 1500);
            }
            else if (Status === "False") {
                const data = await updateDataFunction(`/DcOrder/posteDc/${id}`, record);

                toast.success("Status updated successfully");
                setTimeout(() => {
                    navigate("/OrderDCList");
                }, 1500);
            }
        } catch (err) {
            //console.log(err);
            toast.error("Error updating status");
        }
    };

    // PDF Export Function
    const exportPDF = () => {
        const doc = new jsPDF("p", "pt", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();

        // Company header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(companyInfo.name, pageWidth / 2, 40, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(companyInfo.address, pageWidth / 2, 60, { align: "center" });
        doc.text(companyInfo.city, pageWidth / 2, 75, { align: "center" });
        doc.text(`${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}`, pageWidth / 2, 90, { align: "center" });

        // DC title
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("DELIVERY CHALLAN", pageWidth / 2, 120, { align: "center" });

        // DC details
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`DC Number: ${record.DCCode}`, 40, 140);
        doc.text(`Date: ${record.DCDate}`, 40, 155);
        doc.text(`Distributor: ${distributor?.DistrbutorName} ${distributor?.DistrbutorSystemCode}`, 40, 170);
        doc.text(`Store: ${store?.StoreName}`, 40, 185);
        doc.text(`Orders: ${[...new Set(record.DCData.map(t => t.Order))].join(", ")}`, 40, 200);
        doc.text(`Status: ${record.PostStatus === "Deliverd" ? "Delivered" : "Pending"}`, 40, 215);

        // Prepare table data
        const tableColumn = ["Product", "Carton", "Box"];
        const tableRows = record.DCData.map(row => [
            getProductName(row.product),
            row.carton || 0,
            row.box || 0
        ]);

        // Add totals row
        tableRows.push([
            "TOTAL",
            totalCarton,
            totalBox
        ]);

        // Generate the table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 240,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [41, 128, 185] },
            footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
            didDrawPage: function (data) {
                // Footer on each page
                doc.setFontSize(9);
                doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, doc.internal.pageSize.height - 30);
                doc.text("Developed by JS International", pageWidth / 2, doc.internal.pageSize.height - 30, { align: "center" });
            }
        });

        doc.save(`DeliveryChallan_${record.DCCode}.pdf`);
    };

    // Excel Export Function
    const handleExcel = () => {
        const wb = XLSX.utils.book_new();

        // Prepare data
        const excelData = [
            [companyInfo.name],
            [companyInfo.address],
            [companyInfo.city],
            [`${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}`],
            [],
            ["DELIVERY CHALLAN"],
            [],
            [`DC Number: ${record.DCCode}`],
            [`Date: ${record.DCDate}`],
            [`Distributor: ${distributor?.DistrbutorName} ${distributor?.DistrbutorSystemCode}`],
            [`Store: ${store?.StoreName}`],
            [`Orders: ${[...new Set(record.DCData.map(t => t.Order))].join(", ")}`],
            [`Status: ${record.PostStatus}`],
            [],
            ["Product", "Carton", "Box"]
        ];

        // Add rows
        record.DCData.forEach(row => {
            excelData.push([
                getProductName(row.product),
                row.carton || 0,
                row.box || 0
            ]);
        });

        // Add totals row
        excelData.push([
            "TOTAL",
            totalCarton,
            totalBox
        ]);

        // Add summary
        excelData.push([]);
        excelData.push(["SUMMARY"]);
        excelData.push(["Total Items:", record.DCData.length]);
        excelData.push(["Total Cartons:", totalCarton]);
        excelData.push(["Total Boxes:", totalBox]);

        // Add footer
        excelData.push([]);
        excelData.push([`Generated on: ${new Date().toLocaleDateString()}`]);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Delivery Challan");
        XLSX.writeFile(wb, `DeliveryChallan_${record.DCCode}.xlsx`);
    };

    // Word Export Function
    const handleWord = async () => {
        // Prepare table rows
        const tableRows = record.DCData.map(row => {
            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(getProductName(row.product))] }),
                    new TableCell({ children: [new Paragraph(String(row.carton || 0))] }),
                    new TableCell({ children: [new Paragraph(String(row.box || 0))] })
                ]
            });
        });

        // Add totals row
        tableRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph("TOTAL")], shading: { fill: "DDEBF7" } }),
                new TableCell({ children: [new Paragraph(String(totalCarton))], shading: { fill: "DDEBF7" } }),
                new TableCell({ children: [new Paragraph(String(totalBox))], shading: { fill: "DDEBF7" } })
            ]
        }));

        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        // Company header
                        new Paragraph({
                            children: [new TextRun({ text: companyInfo.name, bold: true, size: 28 })],
                            alignment: 'center'
                        }),
                        new Paragraph({
                            children: [new TextRun({ text: companyInfo.address, size: 22 })],
                            alignment: 'center'
                        }),
                        new Paragraph({
                            children: [new TextRun({ text: companyInfo.city, size: 22 })],
                            alignment: 'center'
                        }),
                        new Paragraph({
                            children: [new TextRun({ text: `${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}`, size: 22 })],
                            alignment: 'center',
                            spacing: { after: 400 }
                        }),

                        // DC title
                        new Paragraph({
                            text: "DELIVERY CHALLAN",
                            heading: HeadingLevel.HEADING_1,
                            alignment: 'center',
                            spacing: { after: 400 }
                        }),

                        // DC details
                        new Paragraph({
                            children: [new TextRun({ text: `DC Number: ${record.DCCode}`, bold: true })],
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            text: `Date: ${record.DCDate}`,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            text: `Distributor: ${distributor?.DistrbutorName} ${distributor?.DistrbutorSystemCode}`,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            text: `Store: ${store?.StoreName}`,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            text: `Orders: ${[...new Set(record.DCData.map(t => t.Order))].join(", ")}`,
                            spacing: { after: 400 }
                        }),

                        // Table
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph("Product")], shading: { fill: "DDEBF7" } }),
                                        new TableCell({ children: [new Paragraph("Carton")], shading: { fill: "DDEBF7" } }),
                                        new TableCell({ children: [new Paragraph("Box")], shading: { fill: "DDEBF7" } })
                                    ]
                                }),
                                ...tableRows
                            ]
                        }),

                        // Summary
                        new Paragraph({
                            text: "SUMMARY",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 600 }
                        }),
                        new Paragraph(`Total Items: ${record.DCData.length}`),
                        new Paragraph(`Total Cartons: ${totalCarton}`),
                        new Paragraph(`Total Boxes: ${totalBox}`),

                        // Footer
                        new Paragraph({
                            text: `Generated on: ${new Date().toLocaleDateString()}`,
                            spacing: { before: 600 }
                        })
                    ]
                }
            ]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `DeliveryChallan_${record.DCCode}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const SubmitData = async () => {
        //DcOrder
        if (!builtitype || !builtiAmount || !builtiNumber) {
            return toast.error("Please Select All Information")
        }
        const submitData = {
            Biltytype: builtitype,
            BiltyAmount: builtiAmount,
            BiltyNumber: builtiNumber,
            Transporter: SelectedTransporter.value
        }

        try {
            const data = await updateDataFunction(`/DcOrder/updateBuilty/${id}`, submitData)
            toast.success("Buitly Add")
            setTimeout(() => {

                navigate("/OrderDCList")
            }, 1500)
        } catch (err) {

        }
    }
    // Print Function
    const handlePrint = () => {
        const printContent = document.getElementById("dcView").innerHTML;
        const printWindow = window.open("", "_blank", "width=1200,height=800");

        printWindow.document.write(`
        <html>
            <head>
                <title>Delivery Challan - ${record.DCCode}</title>
                <style>
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 1mm;
                            margin-right: 1mm;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            margin-left: 30px;
                            margin-right: 30px;
                            font-family: Arial, sans-serif;
                            
                        }
                        .print-footer {
                            position: fixed;
                            bottom: 0;
                            left: 0;
                            right: 0;
                        }
                    }

                    body {
                        font-family: Arial, sans-serif;
                        color: #333;
                        line-height: 1.5;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                    }
                    .dc-title {
                        text-align: center;
                        font-size: 20px;
                        margin: 20px 0;
                        font-weight: bold;
                        letter-spacing: 1px;
                    }
                    .dc-details {
                        margin-bottom: 20px;
                        font-size: 18px;
                    }
                    .dc-details p {
                        margin: 3px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                        font-size: 18px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 6px 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f5f5f5;
                        font-weight: bold;
                    }
                    .total-row {
                        font-weight: bold;
                        background-color: #f0f0f0;
                    }
                    .summary {
                        margin-top: 20px;
                        font-size: 18px;
                        border-top: 2px solid #333;
                        padding-top: 10px;
                        width: 200px;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 4px 0;
                    }
                    .print-footer {
                        font-size: 8px;
                        text-align: center;
                        color: #555;
                        border-top: 1px solid #ccc;
                        padding: 8px 0;
                        background: white;
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>${companyInfo.name}</h1>
                    <p>${companyInfo.address}, ${companyInfo.city}</p>
                    <p>${companyInfo.phone} | ${companyInfo.email} | ${companyInfo.website}</p>
                </div>
                
                <div class="dc-title">DELIVERY CHALLAN</div>
                
                <div class="dc-details">
                    <p><strong>DC Number:</strong> ${record.DCCode}</p>
                    <p><strong>Date:</strong> ${record.DCDate}</p>
                    <p><strong>Distributor:</strong> ${distributor?.DistrbutorName} / ${distributorUrdu} ${distributor?.DistrbutorSystemCode}</p>
                    <p><strong>City:</strong> ${City?.find((item) => item._id === distributor.City)?.CityName} / ${cityUrdu}</p>
                    <p><strong>Transporter:</strong> ${Transport?.find((item) => item._id === record.Transporter)?.TransporterName}</p>
                    <p><strong>Remraks:</strong> ${remarks}</p>
                    <p><strong>Orders:</strong> ${[...new Set(record.DCData.map(t => t.Order))].join(", ")}</p>
                    <p><strong>Status:</strong> ${record.PostStatus === "Deliverd" ? "Delivered" : "Pending"}</p>
                </div>
                
                ${printContent}
                
                <div class="summary">
                    <h3>Delivery Summary</h3>
                    <div class="summary-row">
                        <span>Total Items:</span>
                        <span>${record.DCData.length}</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Cartons:</span>
                        <span>${totalCarton}</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Boxes:</span>
                        <span>${totalBox}</span>
                    </div>
                </div>

                <div class="print-footer">
                    Generated on: ${new Date().toLocaleDateString()}<br>
                    Developed by JS International
                </div>
            </body>
        </html>
    `);


        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return (
        <div className="min-h-screen pd-bg-muted py-8 px-4 sm:px-6 lg:px-8">
            <ToastContainer />
            <div className="pd-bg-surface p-4 rounded-xl shadow mb-6 flex flex-col md:flex-row gap-4 items-end">

                {/* Async Select */}
                <div className="w-full md:w-1/3">
                    <label className="text-sm font-semibold mb-1 block">Search DC</label>
                    <AppAsyncSelect
                        cacheOptions
                        loadOptions={loadDCOptions}
                        defaultOptions={OrderDc.map(dc => ({
                            label: dc.DCCode,
                            value: dc._id
                        })).slice(0, 50)}
                        onChange={handleDCChange}
                        placeholder="Search DC Number..."
                    />
                </div>

                {/* Prev / Next */}
                <div className="flex gap-3">
                    <button
                        onClick={handlePrev}
                        disabled={dcIndex <= 0}
                        className="px-4 py-2 pd-bg-muted0 text-white rounded disabled:bg-gray-300"
                    >
                        Previous
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={dcIndex >= OrderDc.length - 1}
                        className="px-4 py-2 pd-bg-muted0 text-white rounded disabled:bg-gray-300"
                    >
                        Next
                    </button>
                </div>

            </div>
            <div className="max-w-7xl mx-auto">
                {/* Document Header */}
                <div className="pd-bg-surface rounded-xl shadow-lg overflow-hidden mb-8 border pd-border-default border">
                    <div className="bg-gradient-to-r from-blue-800 to-indigo-900 px-8 py-6">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="mb-6 md:mb-0 text-center md:text-left">
                                <h1 className="text-3xl font-bold text-white">{companyInfo.name}</h1>
                                <p className="text-blue-200 mt-2">{companyInfo.address}</p>
                                <p className="text-blue-200">{companyInfo.city}</p>
                            </div>

                            <div className="pd-card p-4">
                                <div className="text-center">
                                    <h2 className="pd-page-title">DELIVERY CHALLAN</h2>
                                    <div className="mt-3 pd-text-muted">
                                        <div>DC Number: <span className="font-semibold">{record.DCCode}</span></div>
                                        <div className="mt-1">Date: {record.DCDate}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-6 space-y-6">

                        {/* ===== TOP INFO SECTION ===== */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Distributor Info */}
                            <div className="pd-bg-muted p-5 rounded-xl shadow">
                                <h3 className="text-lg font-semibold pd-text-body mb-3">
                                    Distributor Information
                                </h3>
                                <p className="font-medium pd-text-body">
                                    {distributor?.DistrbutorName} {distributor?.DistrbutorSystemCode}
                                </p>
                                <p className="pd-text-muted">Store: {store?.StoreName}</p>
                                <p className="pd-text-muted">
                                    Orders: {[...new Set(record.DCData.map(t => t.Order))].join(", ")}
                                </p>
                                <p className="pd-text-muted">
                                    Status:
                                    <span
                                        className={`ml-2 font-semibold ${record.PostStatus === "Deliverd"
                                            ? "pd-stat-positive"
                                            : "text-yellow-600"
                                            }`}
                                    >
                                        {record.PostStatus === "Deliverd" ? "Delivered" : "Pending"}
                                    </span>
                                </p>
                            </div>

                            {/* Bilty Info */}
                            <div className="pd-bg-muted p-5 rounded-xl shadow space-y-5">
                                <h3 className="text-lg font-semibold pd-text-body">
                                    Bilty Information
                                </h3>
                                <div>
                                    <label className="text-sm pd-text-muted block mb-1">
                                        Transporter
                                    </label>




                                    <AppSelect options={TransporterDrp}
                                        value={SelectedTransporter}
                                        isDisabled={!!record?.Biltytype}
                                        onChange={(e) => setSelectedTransporter(e)}
                                    />

                                </div>
                                {/* Bilty Type */}
                                <div>
                                    <label className="text-sm pd-text-muted block mb-1">
                                        Bilty Type
                                    </label>

                                    {record?.Biltytype ? (
                                        <p className="font-medium pd-text-body">
                                            {record.Biltytype}
                                        </p>
                                    ) : (
                                        <select
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                                            onChange={(e) => setbuiltype(e.target.value)}
                                        >
                                            <option value="">Select Type</option>
                                            <option value="LTP">LTP</option>
                                            <option value="BTP">BTP</option>
                                        </select>
                                    )}
                                </div>

                                {/* Bilty Amount */}
                                <div>
                                    <label className="text-sm pd-text-muted block mb-1">
                                        Bilty Amount
                                    </label>

                                    {record?.BiltyAmount ? (
                                        <p className="font-medium pd-text-body">
                                            {record.BiltyAmount}
                                        </p>
                                    ) : (
                                        <input
                                            onChange={(e) => setbuiltiAmount(e.target.value)}
                                            type="number"
                                            placeholder="Enter amount"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                                        />
                                    )}
                                </div>

                                {/* Bilty Number */}
                                <div>
                                    <label className="text-sm pd-text-muted block mb-1">
                                        Bilty Number
                                    </label>

                                    {record?.BiltyNumber ? (
                                        <p className="font-medium pd-text-body">
                                            {record.BiltyNumber}
                                        </p>
                                    ) : (
                                        <input
                                            type="text"
                                            onChange={(e) => setbuiltiNumber(e.target.value)}
                                            placeholder="Enter bilty number"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
                                        />
                                    )}
                                </div>

                                {/* Action Area */}
                                {!record?.BiltyNumber && (
                                    <div className="pd-bg-surface border rounded-xl p-4 flex justify-end shadow-sm">
                                        <button
                                            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                                            onClick={() => SubmitData()}
                                        >
                                            Submit
                                        </button>
                                    </div>
                                )}
                            </div>



                        </div>

                        {/* ===== DELIVERY SUMMARY (3 BOXES) ===== */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            <div className="pd-bg-muted border rounded-xl p-4 text-center shadow-sm">
                                <p className="pd-text-muted text-sm">Total Items</p>
                                <p className="text-2xl font-semibold">{record.DCData.length}</p>
                            </div>

                            <div className="pd-bg-muted border rounded-xl p-4 text-center shadow-sm">
                                <p className="pd-text-muted text-sm">Total Cartons</p>
                                <p className="text-2xl font-semibold">{totalCarton}</p>
                            </div>

                            <div className="pd-bg-muted border rounded-xl p-4 text-center shadow-sm">
                                <p className="pd-text-muted text-sm">Total Boxes</p>
                                <p className="text-2xl font-semibold">{totalBox}</p>
                            </div>


                        </div>

                        {/* ===== ACTION BUTTONS (BOTTOM) ===== */}
                        {view ?
                            <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">

                                {login.isDistributor === "true" ? null :
                                    <>

                                        {record.PostStatus === "False" && (
                                            <button
                                                onClick={() => updateStatus("Deliverd")}
                                                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow"
                                            >
                                                Mark as Delivered
                                            </button>
                                        )}

                                        {record.PostStatus === "Deliverd" && (
                                            <button
                                                onClick={() => updateStatus("False")}
                                                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow"
                                            >
                                                Mark as Pending
                                            </button>
                                        )}
                                    </>
                                }
                                <button
                                    onClick={() => navigate("/OrderDCList")}
                                    className="px-5 py-2 bg-gray-600 hover:pd-bg-readonly text-white rounded-lg shadow"
                                >
                                    Back
                                </button>

                                <button
                                    onClick={exportPDF}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow"
                                >
                                    PDF
                                </button>

                                <button
                                    onClick={handleExcel}
                                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow"
                                >
                                    Excel
                                </button>

                                <button
                                    onClick={handleWord}
                                    className="px-5 py-2 bg-blue-600 hover:pd-btn-save rounded-lg shadow"
                                >
                                    Word
                                </button>

                                <button
                                    onClick={handlePrint}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow"
                                >
                                    Print
                                </button>

                            </div>
                            : null}
                    </div>

                </div>

                {/* Delivery Items Table */}
                <div id="dcView" className="pd-bg-surface rounded-xl shadow-lg overflow-hidden mb-8">
                    <div className="px-6 py-5 border-b pd-border-default border pd-bg-muted">
                        <h3 className="pd-section-title">Delivery Items</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[color:var(--pd-border-card)]">
                            <thead className="pd-bg-muted">
                                <tr>
                                    {['Product', 'Carton', 'Box'].map((header) => (
                                        <th key={header} className="px-6 py-3 text-left text-xs font-medium pd-text-body uppercase tracking-wider">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="pd-bg-surface divide-y divide-[color:var(--pd-border-card)]">
                                {record.DCData.map((row, index) => (
                                    <tr key={index} >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body">
                                            {getProductName(row.product)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body text-center">{row.carton}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm pd-text-body text-center">{row.box}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="pd-bg-muted font-semibold">
                                <tr>
                                    <td className="px-6 py-4 text-sm pd-text-body">Total</td>
                                    <td className="px-6 py-4 text-sm pd-text-body text-center">{totalCarton}</td>
                                    <td className="px-6 py-4 text-sm pd-text-body text-center">{totalBox}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Authorization Section */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="pd-bg-surface p-6 rounded-xl shadow border pd-border-default border">
                        <h4 className="text-sm font-semibold pd-text-body mb-4">Prepared By</h4>
                        <div className="mt-8 pt-2 border-t pd-border-default border">
                            <p className="text-sm pd-text-muted">Signature:</p>
                            <div className="mt-6 h-0.5 pd-bg-readonly w-full"></div>
                            <p className="mt-2 text-sm pd-text-muted">Date: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="pd-bg-surface p-6 rounded-xl shadow border pd-border-default border">
                        <h4 className="text-sm font-semibold pd-text-body mb-4">Dispatched By</h4>
                        <div className="mt-8 pt-2 border-t pd-border-default border">
                            <p className="text-sm pd-text-muted">Signature:</p>
                            <div className="mt-6 h-0.5 pd-bg-readonly w-full"></div>
                            <p className="mt-2 text-sm pd-text-muted">Date: ___________</p>
                        </div>
                    </div>

                    <div className="pd-bg-surface p-6 rounded-xl shadow border pd-border-default border">
                        <h4 className="text-sm font-semibold pd-text-body mb-4">Received By</h4>
                        <div className="mt-8 pt-2 border-t pd-border-default border">
                            <p className="text-sm pd-text-muted">Signature:</p>
                            <div className="mt-6 h-0.5 pd-bg-readonly w-full"></div>
                            <p className="mt-2 text-sm pd-text-muted">Date: ___________</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm pd-text-muted">
                    <p>{companyInfo.name} | {companyInfo.address} | {companyInfo.city}</p>
                    <p className="mt-1">{companyInfo.phone} | {companyInfo.email} | {companyInfo.website}</p>
                    <p className="mt-2">Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                    <p className="mt-1">Developed by JS International</p>
                </div>
            </div>
        </div>
    );
};

export default OrderDCView;