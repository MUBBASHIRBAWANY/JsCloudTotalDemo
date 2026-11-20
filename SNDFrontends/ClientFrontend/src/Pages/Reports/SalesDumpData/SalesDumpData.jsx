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
import SalesDumpDataPopup from './SalesDumpDataPopup';
import ReactDOM from 'react-dom/client';


const SalesDumpData = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const dispatch = useDispatch()
    const [RegionDrp, setRegionDrp] = useState([])
    const [OrderBookerDrp, setOrderBookerDrp] = useState([])
    const [CityDrp, setCityDrp] = useState([])
    const [ZoneDrp, setZoneDrp] = useState([])
    const [CustomerDrp, setCustomerDrp] = useState([])
    const [ProductDrp, setProductDrp] = useState([])
    const [selectedRegion, setSelectedRegion] = useState([])
    const [selectedOrderBooker, setSelectedOrderBooker] = useState([])
    const [selectedCity, setSelectedCity] = useState([])
    const [selectedZone, setSelectedZone] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState([])
    const [selectedProduct, setSelectedProduct] = useState([])
    const [Invoicestatus, setInvoicestatus] = useState("true")
    const [defaultCustomer, setDefaultCustomer] = useState([])
    const [totalProducts, setTotalProducts] = useState([])
    const [totalCustomer, setTotalCustomer] = useState([])
    const [totalRegion, setTotalRegion] = useState([])
    const [totalCity, setTotalCity] = useState([])
    const [totalZone, setTotalZone] = useState([])
    const [totalOrderBooker, setTotalOrderBooker] = useState([])
const loginVendor = useSelector(
          (state) => state.LoginerReducer.userDetail
      );
    const [value, setValue] = useState(1)


    const getData = async () => {
        try {
            const OrderBooker = await getDataFundtion("/orderbooker")
            setOrderBookerDrp(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))
           
            const Customer = await getDataFundtion("/Customor")
            setCustomerDrp(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.CustomorName}`,
                name: item.CustomorName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address
            })).slice(0, 50))

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
            setTotalCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.CustomorName}`,
                name: item.CustomorName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address

            })))

            setSelectedCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.CustomorName}`,
                name: item.CustomorName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address
            })))

            setDefaultCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.CustomorName}`,
                name: item.CustomorName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address

            })))
            setSelectedProduct(Product.data.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.ProductName}`,
                code: item.code,
                ProductName: item.ProductName

            })))
            setSelectedOrderBooker(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))
            setTotalOrderBooker(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))
           

        } catch (err) {
            console.log(err)
        }

    }

    const status = [
        { label: "Open", value: "Open" },
        { label: "Serviced", value: "Serviced" },
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
    const loadCustomerOptions = async (inputValue) => {
        console.log(totalCustomer)
        if (!inputValue) return [];

        const filtered = totalCustomer
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
            Customer: selectedCustomer.length > 0 ? selectedCustomer : defaultCustomer,
            Product: selectedProduct.length > 0 ? selectedProduct : totalProducts,
            OrderBooker: selectedOrderBooker.length > 0 ? selectedOrderBooker : totalOrderBooker,
            Status: Invoicestatus,
            Distributor : loginVendor._id
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<SalesDumpDataPopup filterData={submitData} value={value} />);
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
                    <label className="block text-sm font-medium">Order Booker</label>
                    <Select
                        isMulti
                        options={OrderBookerDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedOrderBooker(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Order Booker"
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
                    <label className="block text-sm font-medium">Customer</label>
                    <AsyncSelect
                        isMulti
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        cacheOptions
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedCustomer(selectedValues);
                        }}

                        loadOptions={loadCustomerOptions}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Customer"
                        defaultOptions={CustomerDrp}
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Status</label>
                    <Select
                        options={status}
                        onChange={(options) => {
                            setInvoicestatus(options.value);
                        }}
                        defaultInputValue='Post'
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select City"
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

export default SalesDumpData