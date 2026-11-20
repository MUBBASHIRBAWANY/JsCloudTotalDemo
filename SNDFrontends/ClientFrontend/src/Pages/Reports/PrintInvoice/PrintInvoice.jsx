// PrintInvoice.jsx
import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { useSelector } from 'react-redux';
import PrintInvoicePopup from './PrintInvoicePopup';

import AsyncSelect from 'react-select/async';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CurdFunctions';


const PrintInvoice = ({
    handleLocationChange,
    locationOptions,
    storeOptions,
    isLoading
}) => {

    const status = [
        { label: "WithInvoice", value: "WithInvoice" },
        { label: "WithOutInvoice", value: "WithOutInvoice" },
        { label: "OnlyInvoice", value: "OnlyInvoice" }
    ];
    const [isOpen, SetisOpen,] = useState(true)
    const [qtyType, setQtyType,] = useState('Box')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [location, setLocation] = useState([])
    const [storeforDrp, setStoreForDrp] = useState([])
    const [selectedLocation, setSelectedLocation] = useState([])
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [slectedStore, setSlectedStore] = useState('')
    const [SelectedStatus, setSelectedStatus] = useState(status[0])

    const [loadForm, setloadForm] = useState("")
    const [dataStatus, setDataStatus] = useState('')
    const [stratloadForm, setStratloadForm] = useState([])
    const [SelectedLoadForm, setSelectedLoadForm] = useState('')
    console.log(stratloadForm)

    const loadInvoiceOptions = async (inputValue) => {
        if (!inputValue) return [];
        console.log(loadForm)
        const filtered = loadForm
            .filter((item) =>
                item.LoadFormNumber.toLowerCase().includes(inputValue.toLowerCase()) || item.Status.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered.map((item) => ({
            label: `${item.LoadFormNumber} ${item.Status}`,
            value: item.LoadFormNumber

        }));
    };

    console.log(loadForm)

    const getProduct = async () => {
        console.log(loginVendor, "loginVendor");

        const LoadForm = await getDataFundtion(
            `LoadForm/AllloadFormNumber/${loginVendor._id}`
        );

        console.log(LoadForm.data, "LoadForm");

        // set state
        setloadForm(LoadForm.data);

        // use response data directly
        const startingload = LoadForm.data.map((item) => ({
            value: item.LoadFormNumber,
            label: `${item.LoadFormNumber} ${item.Status}`
        }));

        setStratloadForm(startingload)
    };
    useEffect(() => {
        getProduct()
    }, [])
    const [showPopup, setShowPopup] = useState(false);
    const [submitData, setSubmitData] = useState(null);

    const openPopupTab = async () => {
        if (SelectedLoadForm === "") {
            return toast.error("Please Select LoadForm")
        }
        const data = {
            LoadForm: SelectedLoadForm,
            invoice: SelectedStatus.value,
            loginVendor: loginVendor
        }
        setSubmitData(data);
        setShowPopup(true);
    }

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md mx-[30%] my-[5%]">
                <ToastContainer />
                <div className="grid grid-cols-5 md:grid-cols-2 gap-4">

                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium">LoadForm</label>
                        <AsyncSelect
                            menuPortalTarget={document.body}
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                            cacheOptions
                            onChange={(selectedOption) =>
                                setSelectedLoadForm(selectedOption.value)
                            }
                            loadOptions={loadInvoiceOptions}
                            className="basic-single"
                            classNamePrefix="select"
                            isSearchable
                            placeholder="Select LoadForm"
                            defaultOptions={stratloadForm}
                        />

                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium">With Invoice</label>
                        <Select onChange={(e) => setSelectedStatus(e)}  options={status} value={SelectedStatus} />

                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <button
                            onClick={() => openPopupTab()}
                            disabled={isLoading}
                            className={`w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isLoading ? 'Processing...' : 'Submit'}
                        </button>
                    </div>
                </div>

            </div>

            {showPopup && submitData && (
                <div className="fixed inset-0 z-50 bg-white overflow-auto">
                    <div className="sticky top-0 z-10 bg-gray-100 border-b p-2 flex justify-end">
                        <button
                            onClick={() => setShowPopup(false)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Close
                        </button>
                    </div>
                    <PrintInvoicePopup data={submitData} />
                </div>
            )}
        </>
    )

};

export default PrintInvoice;