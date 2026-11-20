import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../Api/CRUDFunctions';
import AppAsyncSelect from '../../Components/Global/AppAsyncSelect.jsx'
import AppSelect from '../../Components/Global/AppSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import { useSelector } from 'react-redux';
import ReportPageLayout from '../../Components/Global/ReportPageLayout.jsx';
import InventoryValutionByProductPopup from './InventoryValutionByProductPopup.jsx';
import { buildInventoryValuationRows } from './inventoryValuationRows';

const InventoryValutionByProduct = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [productLabel, setProductLabel] = useState('');
    const [allProduct, setAllProduct] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [locationLabel, setLocationLabel] = useState('');
    const [selectedStores, setSelectedStores] = useState([]);
    const [storeLabel, setStoreLabel] = useState('');
    const [storeOptions, setStoreOptions] = useState([]);
    const [stores, setStores] = useState([]);
    const [locations, setLocations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);

    const loadProductOptions = async (inputValue) => {
        if (!inputValue) return [];
        const query = inputValue.toLowerCase();
        return allProduct
            .filter((item) =>
                (item.ProductName || "").toLowerCase().includes(query)
                || (item.mastercode || "").toLowerCase().includes(query)
            )
            .slice(0, 50)
            .map((item) => ({
                label: `${item.ProductName} ${item.mastercode || ""}`.trim(),
                value: item._id,
            }));
    };

    const setLocation = (option) => {
        if (!option) {
            setSelectedLocation('');
            setLocationLabel('');
            setStoreOptions([]);
            setSelectedStores([]);
            setStoreLabel('');
            return;
        }
        setSelectedLocation(option.value);
        setLocationLabel(option.label || '');
        setStoreLabel('');
        const userStore = loginVendor?.Store || [];
        setSelectedStores(userStore);
        const updatedStoreDrp = stores
            .filter((item) => String(option.value).includes(item.Location))
            .filter((store) => userStore.includes(store._id))
            .map((store) => ({
                label: store.StoreName,
                value: store._id,
            }));
        setStoreOptions(updatedStoreDrp);
    };

    const openPopup = (payload) => {
        const popup = window.open('', '', 'width=1440,height=900,left=40,top=30');
        if (!popup) {
            toast.error('Popup blocked. Allow popups for this site.');
            return;
        }
        popup.document.title = 'Inventory Valuation';
        popup.document.body.innerHTML = '<div id="popup-root"></div>';
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (!mountNode) return;
            clearInterval(interval);
            const root = ReactDOM.createRoot(mountNode);
            root.render(
                <InventoryValutionByProductPopup
                    filterData={payload.filterData}
                    rows={payload.rows}
                />
            );
        }, 100);
    };

    const handleSubmit = async () => {
        if (!startDate || !endDate || !selectedProduct) {
            toast.error('Please select date from, date to, and product.');
            return;
        }
        setSubmitting(true);
        try {
            const report = await getDataFundtion(
                `/InventoryReport/GetDataByDateProduct?startDate=${startDate}&endDate=${endDate}&status=Post&product=${selectedProduct}&Location=${selectedLocation || ''}&Store=${selectedStores}&damage=Fresh`
            );
            const previous = new Date(startDate);
            previous.setDate(previous.getDate() - 1);
            const beforeDate = previous.toISOString().split('T')[0];
            const rows = buildInventoryValuationRows({
                data: Array.isArray(report) ? report : [],
                beforeDate,
                userStores: loginVendor?.Store || [],
                selectedStores,
                productId: selectedProduct,
                products: allProduct,
                customers,
                stores,
                locations,
            });
            openPopup({
                rows,
                filterData: {
                    startDate,
                    endDate,
                    productLabel: productLabel || 'Selected product',
                    locationLabel: locationLabel || 'All',
                    storeLabel: storeLabel || 'All',
                },
            });
        } catch (error) {
            console.error(error);
            toast.error('Could not load inventory valuation.');
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const loadFilters = async () => {
            try {
                const productRes = await getDataFundtion('/product/getProductNameId');
                setAllProduct(Array.isArray(productRes) ? productRes : (productRes?.data || []));
                const locationRes = await getDataFundtion('/Location');
                const locationRows = Array.isArray(locationRes) ? locationRes : (locationRes?.data || []);
                setLocations(locationRows.map((item) => ({
                    label: item.LocationName,
                    value: item._id,
                })));
                const storeRes = await getDataFundtion('/Store');
                setStores(Array.isArray(storeRes) ? storeRes : (storeRes?.data || []));
                const distributorRes = await getDataFundtion('/Distrbutor/DistrbutorNameId');
                const customerRes = await getDataFundtion('/Customer/customerNameid');
                const distributorRows = Array.isArray(distributorRes) ? distributorRes : (distributorRes?.data || []);
                const customerRows = Array.isArray(customerRes?.data)
                    ? customerRes.data
                    : (Array.isArray(customerRes) ? customerRes : []);
                setCustomers(distributorRows.concat(customerRows));
            } catch (error) {
                console.error(error);
            }
        };
        loadFilters();
    }, []);

    return (
        <ReportPageLayout
            title="Inventory Valuation"
            subtitle="Choose a product and period. The cost ledger opens in a report window."
        >
            <div className="pd-card p-6 w-[92%] max-w-lg mx-auto my-8">
                <ToastContainer />
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Date From</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) => setStartDate(event.target.value)}
                            className="w-full mt-1 p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Date To</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(event) => setEndDate(event.target.value)}
                            className="w-full mt-1 p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Product</label>
                        <AppAsyncSelect
                            cacheOptions
                            loadOptions={loadProductOptions}
                            onChange={(option) => {
                                setSelectedProduct(option?.value || '');
                                setProductLabel(option?.label || '');
                            }}
                            className="basic-single mt-1"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Product"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Location</label>
                        <AppSelect
                            options={locations}
                            value={locations.find((item) => item.value === selectedLocation) || null}
                            onChange={setLocation}
                            className="basic-single mt-1"
                            classNamePrefix="pd-select"
                            isSearchable
                            isClearable
                            placeholder="Select Location"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Department</label>
                        <AppSelect
                            options={storeOptions}
                            value={storeLabel ? (storeOptions.find((item) => item.value === selectedStores[0]) || null) : null}
                            onChange={(option) => {
                                if (!option) {
                                    setSelectedStores(loginVendor?.Store || []);
                                    setStoreLabel('');
                                    return;
                                }
                                setSelectedStores([option.value]);
                                setStoreLabel(option.label || '');
                            }}
                            className="basic-single mt-1"
                            classNamePrefix="pd-select"
                            isSearchable
                            isClearable
                            placeholder="Select Store"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="pd-btn-save w-full"
                    >
                        {submitting ? 'Opening report...' : 'Submit'}
                    </button>
                </div>
            </div>
        </ReportPageLayout>
    );
};

export default InventoryValutionByProduct;
