import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { ConvetDate } from '../../Components/Global/getDate';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../Api/CRUDFunctions';
import { validateSales, validateSalesData } from '../Global/CheckUndefind';
import { fetchSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';
import { round2n } from '../../utils/round2';

const SalesInvoiceBulkAdd = () => {
    const [data, setData] = useState([]);

    const [headers, setHeaders] = useState([]);
    const Client = useSelector((state) => state.Client.client)
    const [disabled, setDisabled] = useState(false)
    //console.log(Client)
    const Product1 = useSelector((state) => state.Product.product);
    //console.log(Product1.find((item)=> item.CodeRef === "CBLSKU02620"))
    const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
    const Location = useSelector((state) => state.Location.Location);
    const Store = useSelector((state) => state.Store.Store)
    const Totalinvoices = useSelector((state) => state.SalesInvoice.SalesInvoice)
    const dispatch = useDispatch();
    const [Products, setProducts] = useState([])
    const navigate = useNavigate()
    const [hide, setHide] = useState(false)
    const getData = async () => {
        if (Product1.length == 0) {
            const data = await getDataFundtion('/product')
            setProducts(data.data)
        } else {
            await setProducts(Product1)
        }
    }

    useEffect(() => {
        getData()
    }, [])

    const downloadExcel = (data, filename = 'data.xlsx') => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, filename);
    };


    const findVendor = (id) => {
        //console.log(id)
        const ven = Vendor.find((item) => item.salesFlowRef == id)?._id
        return (ven)
    }



    const onSubmit = async () => {
        setDisabled(true)
        // helper: round half down
        const Allinvoice = Totalinvoices;

        const customRound = (value) => {
            const num = parseFloat(value) || 0;
            const floor = Math.floor(num);
            const decimal = num - floor;

            if (decimal > 0.5) {
                return floor + 1; // round up
            }
            return floor; // round down (≤ 0.5)
        };
        const valueErrors = [];
        const mergedData = data.reduce((acc, entry) => {
            const key = entry.InvoiceNumber;

            if (!acc[key]) {
                acc[key] = {
                    Client: Client.find((item) => item.SalesFlowRef == entry.OutletCode)?._id,
                    SalesFlowRef: key,
                    SalesInvoiceDate: entry.Date,
                    SalesData: [],
                    Location: Location.find((item) => item.LocationName == entry.Location)?._id,
                    Store: Store.find((item) => item.StoreName == entry.Store)?._id,
                    OrderBooker: OrderBooker.find((item) => item.salesFlowRef == entry.OrderBookerCode)?._id,
                    TotalAmount: 0,
                    RemainingAmount: 0,
                    RecivedAmount: 0,
                    TTS: entry.TTS
                };

                if (entry.TPIncGST < 0 || entry.SalesBoxes < 0 || entry.FOCBoxes < 0) {
                    toast.error(`${entry.InvoiceNumber} has Amount and boxes in negative`);
                    return acc;
                }
            }
            const product = Products.find((item) => item.CodeRef === entry.Vendor + entry.SKU)
            console.log(entry.Vendor + entry.SKU , product?._id)
            const netAmunt = (entry.NetSales ?? 0);
            const pcsInBox = product?.PcsinBox ?? 1
            const totalBox = entry.FOCBoxes || entry.SalesBoxes || entry.Unit / pcsInBox
            const totalValueExclGst = round2n((Number(totalBox) || 0) * (Number(product?.TPSale) || 0))
            const tpExcGst = round2n(entry.TPExcGST)
            const differenceInPaisa = Math.abs(Math.round(totalValueExclGst * 100) - Math.round(tpExcGst * 100))
            if (differenceInPaisa > 1) {
                valueErrors.push({
                    ...entry,
                    Error: `TotalValueExclGst (${totalValueExclGst.toFixed(2)}) does not match TPExcGST (${tpExcGst.toFixed(2)})`
                });
            }
            const gst = Number(entry.GST ?? entry.gst) || 0
            const grossAmntinclGst = totalValueExclGst * gst

            acc[key].SalesData.push({
                id: Date.now() + Math.random(),
                product: product?._id,
                totalBox,
                TotalValueExclGst: totalValueExclGst,
                unit: pcsInBox * (entry.SalesBoxes || entry.FOCBoxes),
                GrossAmntinclGst: grossAmntinclGst,
                AdvanceTax: entry.AdvanceTax,
                diBspass: entry.DISTRIBUTORPASSON || 0,
                RToffer: entry.RETAILTRADEOFFERS || 0,
                WToffer: entry.WHOLESALETRADEOFFERS || 0,
                RpDrive: entry.RETAILPOWERDRIVE || 0,
                WHOLESALEDEAL: entry.WHOLESALEDEAL || 0,
                RTWholeSale: entry.RETAILWHOLESALE || 0,
                SubDisTPromotion: entry.SUBDISTRIBUTIONPROMOTION || 0,
                TradeOffer: entry.TradeOffer || 0,
                HOTZONEDRIVE: entry.HOTZONEDRIVE || 0,
                SPECIALDISCOUNT: entry.SPECIALDISCOUNT || 0,
                netAmunt: entry.NetSales, // or use netAmunt variable
                Gst: entry.GST,

                ValueAfterDis: grossAmntinclGst
            });

            // update invoice totals with custom rounding
            acc[key].TotalAmount += entry.NetSales;
            acc[key].RemainingAmount += entry.NetSales;

            return acc;
        }, {});

        const Errors = [...valueErrors]


        const result = Object.values(mergedData);

        for (const item of result) {

            const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(item.SalesInvoiceDate);
            if (!isValidFormat) {
                Errors.push({ ...item, Error: 'Invalid date format. Expected YYYY-MM-DD' });
                continue; // Skip further processing for this item
            }
        }
        if (Errors.length > 0) {
            toast.error('Some Error found Excal file Has been download')
            return downloadExcel(Errors, 'SalesInvoiceErrors.xlsx')
        }
        const rus = validateSales(result)
        //console.log(result)
        if (rus.length !== 0) {
            toast.error('Some Error found Excal file Has been download')
            downloadExcel(rus)

        } else {
            const SalesDataValid = validateSalesData(result)
            //console.log(SalesDataValid)
            if (SalesDataValid.length != 0) {
                toast.error('Some Error found Excal file Has been download')
                return downloadExcel(SalesDataValid)

            }
            //console.log(result, "result")

            // for (const item of result) {
            //     try {

            //         const res = await updateDataFunction("/SaleInvoice/UpdateSaleData", item)
            //         //console.log(res)
            //     }
            //     catch (err) {
            //         //console.log(err)
            //     }
            // }
            const postInChunks = async (data, chunkSize = 4) => {
                //console.log(data)

                const chunks = [];
                for (let i = 0; i < data.length; i += chunkSize) {
                    chunks.push(data.slice(i, i + chunkSize));
                }

                try {
                    for (const chunk of chunks) {
                        const res = await createDataFunction("/SaleInvoice/PushinBulk", { invoices: chunk });
                        const updatedInvoices = [...Allinvoice, ...res.data];
                        dispatch(fetchSalesInvoice(updatedInvoices));
                        dispatch(fetchSalesInvoice(Allinvoice));
                        //console.log(res)
                    }
                    toast.success("All data added successfully");
                    setTimeout(() => navigate('/SalesInvoice'), 5000);
                } catch (err) {
                    console.error("Error in chunk:", err);
                    const errorMsg = err.response?.data?.message || "Partial data added - some chunks failed";
                    toast.error(errorMsg);
                }
            };
            postInChunks(result)
        }
    }





    const handleFileUpload = (e) => {
        //console.log(e)
        setHide(true)
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get the first worksheet
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Get headers if needed
            const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

            setData(jsonData);
            setHeaders(firstRow);
        };

        reader.readAsArrayBuffer(file);
    };

    return (
        <div>
            <ToastContainer />
            <h2>Upload Excel File</h2>
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
            />



            {/* {data.length > 0 && (
                <div>
                    <h3>Data:</h3>
                    <div className="overflow-x-auto rounded-lg border pd-border-default border shadow-md h-[60vh]">
                        <table className="pd-data-table min-w-full">
                            <thead>
                                <tr>
                                    {headers.map((header, index) => (
                                        <th
                                            key={index}
                                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider pd-text-muted"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[color:var(--pd-border-card)]">
                                {data.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        
                                    >
                                        {headers.map((header, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className="whitespace-nowrap px-6 py-4 text-sm"
                                            >
                                                {row[header]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            )} */}
            <br />

            {hide && <input type="submit" disabled={disabled} onClick={onSubmit} className='text-white bg-blue-700 cursor-pointer hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 focus:outline-none w-[5%] mx-5 my-5' />}
        </div>
    )
}

export default SalesInvoiceBulkAdd
