import AppAsyncSelect from '../../../Components/Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import AppSelect from '../../../Components/Global/AppSelect.jsx'
import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { fetchRegion } from '../../../Redux/Reducers/RegionReducer';
import { fetchOrderBooker } from '../../../Redux/Reducers/OrderBookerReducer';
import { fetchCity } from '../../../Redux/Reducers/CityReducer';
import { fetchZone } from '../../../Redux/Reducers/ZoneReducer';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';
import OrderBookerAchivmentPopup from './OrderBookerAchivmentPopup.jsx';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../Api/CRUDFunctions.jsx';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';



const OrderBookerAchivment = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const dispatch = useDispatch()
    const [RegionDrp, setRegionDrp] = useState([])
    const [OrderBookerDrp, setOrderBookerDrp] = useState([])
    const [OrderBookerRaw, setOrderBookerRaw] = useState([])
    const [CityDrp, setCityDrp] = useState([])
    const [ZoneDrp, setZoneDrp] = useState([])
    const [CustomerDrp, setCustomerDrp] = useState([])
    const [ProductDrp, setProductDrp] = useState([])
    const [selectedRegion, setSelectedRegion] = useState([])
    const [selectedOrderBooker, setSelectedOrderBooker] = useState([])
    console.log(selectedOrderBooker)
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
    console.log(totalOrderBooker)
    const Brand1 = useSelector((state) => state.Brand.brand)
    const Category1 = useSelector((state) => state.Category.category)
    const MasterSku1 = useSelector((state) => state.MasterSku.MasterSku)

    const Vendor1 = useSelector((state) => state.Vendor.state)
    const Region1 = useSelector((state) => state.Region.Region)
    const OrderBooker1 = useSelector((state) => state.OrderBooker.OrderBooker)
    const City1 = useSelector((state) => state.City.City)
    const Zone1 = useSelector((state) => state.Zone.Zone)
    const Customer1 = useSelector((state) => state.Client.Client)
    const [value, setValue] = useState(1)


    const getData = async () => {
        try {
            const OrderBooker = await getDataFundtion("/DitriButorOrderBooker")
            setOrderBookerRaw(OrderBooker.data || [])
            setOrderBookerDrp(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))
            setSelectedOrderBooker(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))
            setTotalOrderBooker(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))

            const Product2 = await getDataFundtion("/product/getProductNameId")
            const Product = Product2.data?.filter((st) => st.mastercode?.startsWith("05"))
            setProductDrp(Product.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.ProductName}`,
                code: item.code,
                ProductName: item.ProductName
            })).slice(0, 50))
            setTotalProducts(Product.map((item) => ({
                ...item,
                value: item._id,
                label: `${item.code} ${item.ProductName}`,
                code: item.code,

                ProductName: item.ProductName
            })))
            const TotalClient = await getDataFundtion("/Distrbutor/DistrbutorNameId")
            setTotalCustomer(TotalClient)
            setSelectedProduct(Product.data.map((item) => ({
                value: item._id,
                label: `${item.code} ${item.ProductName}`,
                code: item.code,
                ProductName: item.ProductName

            })))



        } catch (err) {
            //console.log(err)
        }

    }

    const status = [
        { label: "Post", value: "true" },
        { label: "UnPost", value: "false" },
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
        //console.log(totalCustomer)
        if (!inputValue) return [];

        const filtered = totalCustomer
            .filter((item) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered
    };
    const openPopupTab = async () => {

        if (startDate === "") {
            return toast.error("Please enter start & end date")
        }
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) return alert('Popup blocked');

        popup.document.title = 'Inventory Report';
        popup.document.body.innerHTML = `<div id="popup-root">
    
    </div>`;
        const firstDate = new Date(`${startDate}-01`);
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");

            return `${year}-${month}-${day}`;
        };
        const submitData = {

            startDate: formatDate(firstDate),
            endDate: formatDate(new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0)),
            Month: startDate,
            Product: selectedProduct.length > 0 ? selectedProduct : totalProducts,
            OrderBooker: selectedOrderBooker.length > 0 ? selectedOrderBooker : totalOrderBooker,
            totalCustomer: totalCustomer,
            OrderBookerRaw: OrderBookerRaw
        }
        console.log(submitData)
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<OrderBookerAchivmentPopup filterData={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }
    return (
        <ReportPageLayout title="Order Booker Achievement">
        <div className="pd-card p-6 w-[90%] max-w-md mx-[30%] my-[5%]">
            <ToastContainer />
            <div className="grid grid-cols-5 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Date From</label>
                    <input
                        type="month"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md"
                    />
                </div>

                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Order Booker</label>
                    <AppSelect
                        isMulti
                        options={OrderBookerDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedOrderBooker(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Order Booker"
                    />
                </div>


                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Products</label>
                    <AppAsyncSelect
                        isMulti
                        cacheOptions
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedProduct(selectedValues);
                        }}

                        loadOptions={loadProductOptions}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Product"
                        defaultOptions={ProductDrp}
                    />
                </div>


                <div className="col-span-1 md:col-span-2">
                    <button
                        onClick={() => openPopupTab()}
                        className={`pd-btn-save w-full `}
                    >
                        Submit
                    </button>
                </div>
            </div>

        </div>
    </ReportPageLayout>
    )
}

export default OrderBookerAchivment