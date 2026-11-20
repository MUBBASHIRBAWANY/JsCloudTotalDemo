import AsyncSelect from 'react-select/async';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRegion } from '../../../Redux/Reducers/RegionReducer';
import { fetchOrderBooker } from '../../../Redux/Reducers/OrderBookerReducer';
import { fetchCity } from '../../../Redux/Reducers/CityReducer';
import { fetchZone } from '../../../Redux/Reducers/ZoneReducer';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';

import ReactDOM from 'react-dom/client';
import PurchaseDumpDataPopup from './PurchaseDumpDataPopup';


const PurchaseDumpData = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const dispatch = useDispatch()
    const [RegionDrp, setRegionDrp] = useState([])
    const [OrderBookerDrp, setOrderBookerDrp] = useState([])
    const [CityDrp, setCityDrp] = useState([])
    const [ZoneDrp, setZoneDrp] = useState([])
    const [VendorDrp, setVendorDrp] = useState([])
    const [ProductDrp, setProductDrp] = useState([])
    const [selectedVendor, setSelectedVendor] = useState([])
    const [selectedProduct, setSelectedProduct] = useState([])
    const [Invoicestatus, setInvoicestatus] = useState("Both")
    const [defaultVendor, setDefaultVendor] = useState([])
    const [totalProducts, setTotalProducts] = useState([])
    const [totalVendor, setTotalVendor] = useState([])

    const [value, setValue] = useState(1)
  const loginVendor = useSelector(
        (state) => state.LoginerReducer.userDetail
    );

console.log(loginVendor._id , "loginVendorloginVendor")
    const getData = async () => {
        try {
            
            const Product = await getDataFundtion("/product")
            setProductDrp(Product.data.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.ProductName}`,
                code: item.code,
                ProductName: item.ProductName
            })).slice(0, 50))
            setTotalProducts(Product.data.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.ProductName}`,
                code: item.code,
                ProductName: item.ProductName
            })))
            
            setSelectedProduct(Product.data.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.ProductName}`,
                code: item.code,
                ProductName: item.ProductName

            })))


        } catch (err) {
            console.log(err)
        }

    }

    const status = [
        { label: "Send", value: "Send" },
        { label: "Received", value: "Received" },
        { label: "Both", value: "Both" }
    ];

    useEffect(() => {
        getData()
    }, [])


    const loadProductOptions = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = totalProducts
            .filter((item) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered
    };
    const loadVendorOptions = async (inputValue) => {
        console.log(totalVendor)
        if (!inputValue) return [];

        const filtered = totalVendor
            .filter((item) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered
    };
    const openPopupTab = async () => {

        if (startDate === "" || endDate === "") {
            return toast.error("Please enter start & end date")
        }
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) return alert('Popup blocked');

        popup.document.title = 'Inventory Report';
        popup.document.body.innerHTML = `<div id="popup-root">
    
    </div>`;
        const submitData = {
            startDate: startDate,
            endDate: endDate,
            Vendor: selectedVendor.length > 0 ? selectedVendor : defaultVendor,
            Product: selectedProduct.length > 0 ? selectedProduct : totalProducts,
            Status: Invoicestatus,
            Distributor : loginVendor._id
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<PurchaseDumpDataPopup filterData={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md mx-[30%] my-[5%]">
            <ToastContainer />
            <div className="grid grid-cols-5 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Date From</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">Date To</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Products</label>
                    <AsyncSelect
                        isMulti
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        cacheOptions
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedProduct(selectedValues);
                        }}

                        loadOptions={loadProductOptions}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Product"
                        defaultOptions={ProductDrp}
                    />
                </div>
                
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Status</label>
                    <Select
                        options={status}
                        onChange={(options) => {
                            setInvoicestatus(options.value);
                        }}
                        
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Status"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <button
                        onClick={() => openPopupTab()}
                        className={`w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition `}
                    >
                        Submit
                    </button>
                </div>
            </div>

        </div>
    )
}

export default PurchaseDumpData