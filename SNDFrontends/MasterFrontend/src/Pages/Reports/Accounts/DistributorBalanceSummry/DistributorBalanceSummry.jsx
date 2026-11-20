import AsyncSelect from 'react-select/async';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { filterDistributorOptions } from '../../../../Components/Global/distributorAccess';

import DistributorBalanceSummryPopup from './DistributorBalanceSummryPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CurdFunctions';


const DistributorBalanceSummry = () => {

    const dispatch = useDispatch()
    const loginuser = useSelector((state) => state.LoginerReducer.userDetail)
    const [RegionDrp, setRegionDrp] = useState([])
    const [OrderBookerDrp, setOrderBookerDrp] = useState([])
    const [CityDrp, setCityDrp] = useState([])
    const [ZoneDrp, setZoneDrp] = useState([])
    const [DistrbutorDrp, setDistrbutorDrp] = useState([])
    
    const [selectedRegion, setSelectedRegion] = useState([])
    const [selectedOrderBooker, setSelectedOrderBooker] = useState([])
    const [selectedCity, setSelectedCity] = useState([])
    const [selectedZone, setSelectedZone] = useState([])
    const [selectedDistrbutor, setSelectedDistrbutor] = useState([])
    const [Invoicestatus, setInvoicestatus] = useState("true")
    const [defaultDistrbutor, setDefaultDistrbutor] = useState([])
    
    const [totalDistrbutor, setTotalDistrbutor] = useState([])
    const [totalRegion, setTotalRegion] = useState([])
    const [totalCity, setTotalCity] = useState([])
    const [totalZone, setTotalZone] = useState([])
    const [totalOrderBooker, setTotalOrderBooker] = useState([])
    const [ChartofAccounts, setChartofAccounts] = useState([])
    const [value, setValue] = useState(1)
    const [loading, setLoading] = useState(true)
    const [currentDate,setCurrentDate] = useState('')
    const Loader = () => (
        <div className="flex items-center justify-center h-screen">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const getData = async () => {
        setLoading(true)
        try {
            
            const DistrbutorRaw = await getDataFundtion("/Distrbutor")
            const Distrbutor = filterDistributorOptions(DistrbutorRaw, loginuser)
            setDistrbutorDrp(Distrbutor.map((item) => ({
                value: item._id,
                label: `${item.DistrbutorSystemCode} ${item.DistrbutorName}`,
               
            })).slice(0, 50))


            setTotalDistrbutor(Distrbutor.map((item) => ({
                value: item._id,                
                name: item.DistrbutorName,
                code: item.DistrbutorSystemCode,

            })))

            setSelectedDistrbutor(Distrbutor.map((item) => ({
                value: item._id,
                label: `${item.AccountCode} ${item.CutomerName}`,
                name: item.CutomerName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address
            })))

            setDefaultDistrbutor(Distrbutor.map((item) => item._id,))

            
        } catch (err) {
            console.log(err)
        }
        setLoading(false)

    }


    useEffect(() => {
        getData()
    }, [])



    const loadDistrbutorOptions = async (inputValue) => {
        console.log(totalDistrbutor)
        if (!inputValue) return [];

        const filtered = totalDistrbutor
            .filter((item) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered
    };

    if (loading) {
        return <Loader />
    }
    const openPopupTab = async () => {


        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) return alert('Popup blocked');

        popup.document.title = 'Inventory Report';
        popup.document.body.innerHTML = `<div id="popup-root">
    
    </div>`;
        const submitData = {

            Distrbutor: selectedDistrbutor.length > 0 ? selectedDistrbutor : defaultDistrbutor,
            DistrbutorDrp : DistrbutorDrp
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<DistributorBalanceSummryPopup filterData={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md mx-[30%] my-[5%]">
            <ToastContainer />
            <div className="grid grid-cols-5 md:grid-cols-2 gap-4">

                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Distrbutor</label>
                    <AsyncSelect
                        isMulti
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        cacheOptions
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt.value);
                            setSelectedDistrbutor(selectedValues);
                        }}

                        loadOptions={loadDistrbutorOptions}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Distrbutor"
                        defaultOptions={DistrbutorDrp}
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

export default DistributorBalanceSummry