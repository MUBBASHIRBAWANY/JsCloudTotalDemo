import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunction } from '../../Api/CRUDFunctions';
import { useLoader } from '../../hooks/useLoader.jsx';

const StockAdjustmentBulkAdd = () => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [hide, setHide] = useState(false);
    const navigate = useNavigate();
    const { loading, showLoader, hideLoader, LoaderComponent } = useLoader();

    const location = useSelector((state) => state.Location.Location);
    const Store = useSelector((state) => state.Store.Store);
    const Products = useSelector((state) => state.Product.product);
    console.log(Products)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);

    // Download Excel Template
    const downloadTemplate = () => {
        const templateData = [
            {
                Date: '2026-08-19',
                Location: 'Main Warehouse',
                Store: 'Store A',
                Vendor: 'CBL',
                ProductCode: 'SKU001',
                ProductName: 'Product Alpha',
                LessBox: '',
                AddBox: '',
            },
            {
                Date: '2026-08-19',
                Location: 'Main Warehouse',
                Store: 'Store A',
                Vendor: 'CBL',
                ProductCode: 'SKU002',
                ProductName: 'Product Beta',
                LessBox: '5',
                AddBox: '',
            },
            {
                Date: '2026-08-19',
                Location: 'Main Warehouse',
                Store: 'Store A',
                Vendor: 'CBL',
                ProductCode: 'SKU003',
                ProductName: 'Product Gamma',
                LessBox: '',
                AddBox: '10',
            },
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);

        // Set column widths
        ws['!cols'] = [
            { wch: 14 },  // Date
            { wch: 20 },  // Location
            { wch: 15 },  // Store
            { wch: 10 },  // Vendor
            { wch: 15 },  // ProductCode
            { wch: 25 },  // ProductName
            { wch: 12 },  // LessBox
            { wch: 12 },  // AddBox
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'StockAdjustment');

        // Add instructions sheet
        const instructions = [
            ['STOCK ADJUSTMENT BULK UPLOAD - INSTRUCTIONS'],
            [''],
            ['Column', 'Description', 'Required', 'Notes'],
            ['Date', 'Adjustment Date (YYYY-MM-DD)', 'Yes', 'Format: YYYY-MM-DD'],
            ['Location', 'Location Name (exact match)', 'Yes', 'Must match existing location name'],
            ['Store', 'Store Name (exact match)', 'Yes', 'Must match existing store name'],
            ['Vendor', 'Vendor Code', 'Yes', 'Combined with ProductCode to find product (CodeRef = Vendor + ProductCode)'],
            ['ProductCode', 'Product Code / SKU', 'Yes', 'Combined with Vendor to find product (CodeRef = Vendor + ProductCode)'],
            ['ProductName', 'Product Name', 'Yes', 'Alternative: must match existing product name'],
            ['LessBox', 'Quantity to reduce (in boxes)', 'No', 'Cannot both be filled with AddBox'],
            ['AddBox', 'Quantity to add (in boxes)', 'No', 'Cannot both be filled with LessBox'],
            [''],
            ['RULES:'],
            ['1. LessBox and AddBox cannot both be entered for the same row'],
            ['2. At least one of LessBox or AddBox must be filled'],
            ['3. Location and Store must match exactly with system data'],
            ['4. Product is found by CodeRef = Vendor + ProductCode (e.g. CBL + SKU001 = CBLSKU001)'],
            ['5. Vendor is required when using ProductCode'],
            ['6. Multiple products can be adjusted in the same date/location/store'],
            ['7. Each row creates a line item; rows with same Date+Location+Store are grouped'],
        ];

        const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
        wsInstructions['!cols'] = [{ wch: 20 }, { wch: 45 }, { wch: 12 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

        XLSX.writeFile(wb, 'Stock_Adjustment_Template.xlsx');
        toast.success('Template downloaded!');
    };

    // Handle file upload
    const handleFileUpload = (e) => {
        setHide(true);
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Read the first sheet (not Instructions)
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];

            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

            setData(jsonData);
            setHeaders(firstRow);
        };
        reader.readAsArrayBuffer(file);
    };

    // Submit bulk data
    const onSubmit = async () => {
        if (data.length === 0) {
            return toast.error('No data to upload');
        }

        // Group rows by Date + Location + Store
        const grouped = {};
        const errors = [];

        data.forEach((row, idx) => {
            const rowNum = idx + 2; // Excel row (1-indexed + header)

            // Validate required fields
            if (!row.Date) {
                errors.push(`Row ${rowNum}: Date is required`);
                return;
            }
            if (!row.Location) {
                errors.push(`Row ${rowNum}: Location is required`);
                return;
            }
            if (!row.Store) {
                errors.push(`Row ${rowNum}: Store is required`);
                return;
            }
            if (!row.Vendor && !row.ProductName) {
                errors.push(`Row ${rowNum}: Vendor (with ProductCode) or ProductName is required`);
                return;
            }
            if (row.ProductCode && !row.Vendor) {
                errors.push(`Row ${rowNum}: Vendor is required when ProductCode is provided`);
                return;
            }
            if (!row.ProductCode && !row.ProductName) {
                errors.push(`Row ${rowNum}: ProductCode (with Vendor) or ProductName is required`);
                return;
            }

            const lessBox = Number(row.LessBox) || 0;
            const addBox = Number(row.AddBox) || 0;

            if (lessBox > 0 && addBox > 0) {
                errors.push(`Row ${rowNum}: LessBox and AddBox cannot both be filled`);
                return;
            }
            if (lessBox === 0 && addBox === 0) {
                errors.push(`Row ${rowNum}: Either LessBox or AddBox must be filled`);
                return;
            }

            // Find product by CodeRef (Vendor + ProductCode) or ProductName
            const codeRef = row.Vendor && row.ProductCode ? row.Vendor + row.ProductCode : null;
            console.log(codeRef)
            const product = Products.find(p =>
                (codeRef && p.CodeRef === codeRef) ||
                (row.ProductName && p.ProductName === row.ProductName)
            );
            if (!product) {
                if (codeRef) {
                    errors.push(`Row ${rowNum}: Product not found - CodeRef "${codeRef}" (Vendor: ${row.Vendor}, ProductCode: ${row.ProductCode}) does not match any product`);
                } else {
                    errors.push(`Row ${rowNum}: Product not found (Name: ${row.ProductName})`);
                }
                return;
            }

            // Find location
            const loc = location.find(l => l.LocationName === row.Location);
            if (!loc) {
                errors.push(`Row ${rowNum}: Location "${row.Location}" not found`);
                return;
            }

            // Find store
            const store = Store.find(s => s.StoreName === row.Store);
            if (!store) {
                errors.push(`Row ${rowNum}: Store "${row.Store}" not found`);
                return;
            }

            // Check user has access to this store
            if (!loginVendor.Store.includes(store._id)) {
                errors.push(`Row ${rowNum}: You don't have access to store "${row.Store}"`);
                return;
            }

            const TPPurchase = parseFloat(product.TPPurchase || 0);
            const TPSale = parseFloat(product.TPSale || 0);

            // Group key: Date + Location + Store
            const key = `${row.Date}|${loc._id}|${store._id}`;
            if (!grouped[key]) {
                grouped[key] = {
                    AdjustmentDate: row.Date,
                    Location: loc._id,
                    Store: store._id,
                    AdjustmentData: []
                };
            }

            grouped[key].AdjustmentData.push({
                productName: product._id,
                lessBox: lessBox,
                addBox: addBox,
                lessAmount: lessBox * TPSale,
                addAmount: addBox * TPPurchase,
            });
        });

        if (errors.length > 0) {
            toast.error(`${errors.length} error(s) found. Check console.`);
            console.error('Validation errors:', errors);
            // Download error report
            const errorData = errors.map((err, i) => ({ '#': i + 1, Error: err }));
            const ws = XLSX.utils.json_to_sheet(errorData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Errors');
            XLSX.writeFile(wb, 'Stock_Adjustment_Errors.xlsx');
            return;
        }

        const adjustments = Object.values(grouped);

        try {
            showLoader('Uploading...');
            await createDataFunction('/StockAdjustment/PushinBulk', { adjustments });
            hideLoader();
            toast.success(`${adjustments.length} adjustment(s) created successfully`);
            setTimeout(() => navigate('/StockAdjustment'), 1500);
        } catch (err) {
            hideLoader();
            toast.error(err?.response?.data?.message || 'Upload failed');
        }
    };

    return (
        <div className="mx-5">
            <ToastContainer />
            <LoaderComponent />
            <h1 className="text-xl md:pd-page-title text-center mb-6">
                Bulk Upload Stock Adjustment
            </h1>

            <div className="pd-card p-4 md:p-6">
                {/* Template Download */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">📥 Download Template</h3>
                    <p className="text-xs text-blue-600 mb-3">
                        Template download karo, usme data fill karo, phir upload karo.
                        LessBox aur AddBox ek saath nahi bhar sakte.
                    </p>
                    <button
                        onClick={downloadTemplate}
                        className="pd-btn-success px-4 py-2 text-sm"
                    >
                        Download Excel Template
                    </button>
                </div>

                {/* File Upload */}
                <div className="mb-6">
                    <label className="pd-label">Upload Filled Excel File</label>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        className="pd-input"
                    />
                </div>

                {/* Data Preview */}
                {data.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-2">
                            Preview ({data.length} rows)
                        </h3>
                        <div className="overflow-x-auto rounded-lg border shadow-md max-h-[400px] overflow-y-auto">
                            <table className="pd-data-table min-w-full">
                                <thead className="sticky top-0 bg-gray-50">
                                    <tr>
                                        {headers.map((header, index) => (
                                            <th
                                                key={index}
                                                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 border-b"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {data.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-gray-50">
                                            {headers.map((header, colIndex) => (
                                                <td
                                                    key={colIndex}
                                                    className="whitespace-nowrap px-4 py-2 text-sm border-b"
                                                >
                                                    {row[header] || ''}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Submit */}
                {hide && (
                    <div className="flex gap-4">
                        <button
                            onClick={onSubmit}
                            disabled={loading}
                            className="pd-btn-save px-6 py-2"
                        >
                            {loading ? 'Uploading...' : `Upload ${data.length} Rows`}
                        </button>
                        <button
                            onClick={() => { setData([]); setHide(false); }}
                            className="pd-btn-cancel px-6 py-2"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockAdjustmentBulkAdd;
