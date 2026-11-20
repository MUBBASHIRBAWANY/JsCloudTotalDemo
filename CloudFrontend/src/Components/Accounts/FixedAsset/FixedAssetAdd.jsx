import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const calculateDepreciation = (cost, salvage, usefulLife, method, rate) => {
  const bookValue = (Number(cost) || 0) - (Number(salvage) || 0);
  const totalMonths = (Number(usefulLife) || 0) * 12;
  const annualRate = (Number(rate) || 0) / 100;

  let monthlyDepreciation = 0;
  let annualDepreciation = 0;

  if (totalMonths > 0 && bookValue > 0) {
    switch (method) {
      case 'Straight Line':
        monthlyDepreciation = bookValue / totalMonths;
        break;
      case 'Declining Balance':
        monthlyDepreciation = (bookValue * annualRate) / 12;
        break;
      case 'Double Declining':
        monthlyDepreciation = (bookValue * 2 * annualRate) / 12;
        break;
      case 'Units of Production':
        monthlyDepreciation = bookValue / totalMonths;
        break;
      default:
        monthlyDepreciation = bookValue / totalMonths;
    }
    annualDepreciation = monthlyDepreciation * 12;
  }

  return {
    bookValue: Math.max(bookValue, 0),
    monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
    annualDepreciation: Math.round(annualDepreciation * 100) / 100,
    totalMonths,
  };
};

const FixedAssetAdd = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('basic');
  const [accounts, setAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [depAccount, setDepAccount] = useState('');
  const [accDepAccount, setAccDepAccount] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetStore, setAssetStore] = useState('');
  const [assetVendor, setAssetVendor] = useState('');

  const watchedCost = watch('PurchaseCost');
  const watchedSalvage = watch('SalvageValue');
  const watchedLife = watch('UsefulLife');
  const watchedMethod = watch('DepreciationMethod');
  const watchedRate = watch('DepreciationRate');

  const depreciationInfo = calculateDepreciation(
    watchedCost,
    watchedSalvage,
    watchedLife,
    watchedMethod,
    watchedRate
  );

  const fetchData = async () => {
    try {
      const [accRes, locRes, storeRes, vendRes] = await Promise.all([
        getDataFundtion('/ChartofAccounts'),
        getDataFundtion('/Location'),
        getDataFundtion('/Store'),
        getDataFundtion('/vendor'),
      ]);
      setAccounts(accRes.data || []);
      setLocations(locRes.data || []);
      setStores(storeRes.data || []);
      setVendors(vendRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const accountOptions = accounts
    .filter((a) => a.AccountCode && a.AccountCode.length > 5)
    .map((a) => ({ value: a._id, label: `${a.AccountCode} - ${a.AccountName}` }));

  const locationOptions = locations.map((l) => ({
    value: l._id,
    label: l.LocationName || l.name,
  }));

  const storeOptions = stores.map((s) => ({
    value: s._id,
    label: s.StoreName || s.name,
  }));

  const vendorOptions = vendors.map((v) => ({
    value: v._id,
    label: `${v.VendorName} (${v.code})`,
  }));

  const onSubmit = async (data) => {
    data.DepreciationAccount = depAccount;
    data.AccumulatedDepreciationAccount = accDepAccount;
    data.Location = assetLocation;
    data.Store = assetStore;
    data.Vendor = assetVendor;
    data.BookValue = depreciationInfo.bookValue;
    data.MonthlyDepreciation = depreciationInfo.monthlyDepreciation;
    data.AnnualDepreciation = depreciationInfo.annualDepreciation;
    data.AccumulatedDepreciation = 0;
    data.Status = 'Active';
 console.log(data)
    try {
      await createDataFunction('/FixedAsset', data);
      toast.success('Fixed Asset added successfully');
      setTimeout(() => {
        navigate('/FixedAssetList');
      }, 2000);
    } catch (err) {
      toast.error('Error adding fixed asset');
    }
  };

  return (
    <div>
      <h1 className="pd-page-title text-center mb-6">Add Fixed Asset</h1>
      <ToastContainer />

      <div className="mb-4">
        <div className="flex border-b pd-border-default border">
          <button
            type="button"
            className={`py-2 px-4 font-medium text-sm border-b-2 ${
              activeTab === 'basic'
                ? 'border-[color:var(--pd-primary)] pd-text-primary'
                : 'pd-tab-inactive'
            }`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button
            type="button"
            className={`py-2 px-4 font-medium text-sm border-b-2 ${
              activeTab === 'financial'
                ? 'border-[color:var(--pd-primary)] pd-text-primary'
                : 'pd-tab-inactive'
            }`}
            onClick={() => setActiveTab('financial')}
          >
            Financial Details
          </button>
          <button
            type="button"
            className={`py-2 px-4 font-medium text-sm border-b-2 ${
              activeTab === 'additional'
                ? 'border-[color:var(--pd-primary)] pd-text-primary'
                : 'pd-tab-inactive'
            }`}
            onClick={() => setActiveTab('additional')}
          >
            Additional Details
          </button>
        </div>
      </div>

      <form className="pd-card p-6 mb-6" onSubmit={handleSubmit(onSubmit)}>
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="pd-label">Asset Name *</label>
              <input
                type="text"
                {...register('AssetName', { required: true })}
                className="pd-input"
                placeholder="Enter asset name"
              />
            </div>
            <div>
              <label className="pd-label">Asset Code</label>
              <input
                type="text"
                {...register('AssetCode')}
                className="pd-input"
                placeholder="Auto generated or manual"
              />
            </div>
            <div>
              <label className="pd-label">Asset Category</label>
              <input
                type="text"
                {...register('AssetCategory')}
                className="pd-input"
                placeholder="e.g. Furniture, Vehicle, Machinery"
              />
            </div>
            <div>
              <label className="pd-label">Description</label>
              <input
                type="text"
                {...register('Description')}
                className="pd-input"
                placeholder="Asset description"
              />
            </div>
            <div>
              <label className="pd-label">Location</label>
              <AppSelect
                options={locationOptions}
                value={locationOptions.find((o) => o.value === assetLocation)}
                onChange={(val) => setAssetLocation(val?.value || '')}
                placeholder="Select Location"
              />
            </div>
            <div>
              <label className="pd-label">Store</label>
              <AppSelect
                options={storeOptions}
                value={storeOptions.find((o) => o.value === assetStore)}
                onChange={(val) => setAssetStore(val?.value || '')}
                placeholder="Select Store"
              />
            </div>
            <div>
              <label className="pd-label">Serial Number</label>
              <input
                type="text"
                {...register('SerialNumber')}
                className="pd-input"
                placeholder="Serial number"
              />
            </div>
            <div>
              <label className="pd-label">Model</label>
              <input
                type="text"
                {...register('Model')}
                className="pd-input"
                placeholder="Model"
              />
            </div>
            <div>
              <label className="pd-label">Manufacturer</label>
              <input
                type="text"
                {...register('Manufacturer')}
                className="pd-input"
                placeholder="Manufacturer"
              />
            </div>
            <div>
              <label className="pd-label">Condition</label>
              <select {...register('Condition')} className="pd-input">
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div>
              <label className="pd-label">Status</label>
              <select {...register('Status')} className="pd-input">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="pd-label">Purchase Cost *</label>
              <input
                type="number"
                step="0.01"
                {...register('PurchaseCost', { required: true })}
                className="pd-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="pd-label">Purchase Date *</label>
              <input
                type="date"
                {...register('PurchaseDate', { required: true })}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Salvage Value</label>
              <input
                type="number"
                step="0.01"
                {...register('SalvageValue')}
                className="pd-input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="pd-label">Useful Life (Years)</label>
              <input
                type="number"
                step="1"
                {...register('UsefulLife')}
                className="pd-input"
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="pd-label">Depreciation Method</label>
              <select {...register('DepreciationMethod')} className="pd-input">
                <option value="Straight Line">Straight Line</option>
                <option value="Declining Balance">Declining Balance</option>
                <option value="Double Declining">Double Declining</option>
                <option value="Units of Production">Units of Production</option>
              </select>
            </div>
            <div>
              <label className="pd-label">Depreciation Rate (%)</label>
              <input
                type="number"
                step="0.01"
                {...register('DepreciationRate')}
                className="pd-input"
                placeholder="e.g. 20"
              />
            </div>
            <div>
              <label className="pd-label">Depreciation Account</label>
              <AppSelect
                options={accountOptions}
                value={accountOptions.find((o) => o.value === depAccount)}
                onChange={(val) => setDepAccount(val?.value || '')}
                placeholder="Select Depreciation A/c"
              />
            </div>
            <div>
              <label className="pd-label">Accumulated Depreciation Account</label>
              <AppSelect
                options={accountOptions}
                value={accountOptions.find((o) => o.value === accDepAccount)}
                onChange={(val) => setAccDepAccount(val?.value || '')}
                placeholder="Select Acc. Depreciation A/c"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 mt-4 p-4 rounded-lg border border-[color:var(--pd-primary)] bg-opacity-10" style={{ backgroundColor: 'color-mix(in srgb, var(--pd-primary) 5%, transparent)' }}>
              <h3 className="text-sm font-semibold mb-3 pd-text-primary">Depreciation Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Book Value:</span>
                  <p className="font-semibold">{depreciationInfo.bookValue.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Monthly Depreciation:</span>
                  <p className="font-semibold">{depreciationInfo.monthlyDepreciation.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Annual Depreciation:</span>
                  <p className="font-semibold">{depreciationInfo.annualDepreciation.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Months:</span>
                  <p className="font-semibold">{depreciationInfo.totalMonths}</p>
                </div>
              </div>
            </div>
           
          </div>
        )}

        {activeTab === 'additional' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="pd-label">Purchase Order No</label>
              <input
                type="text"
                {...register('PurchaseOrderNo')}
                className="pd-input"
                placeholder="PO number"
              />
            </div>
            <div>
              <label className="pd-label">Invoice Number</label>
              <input
                type="text"
                {...register('InvoiceNumber')}
                className="pd-input"
                placeholder="Invoice number"
              />
            </div>
            <div>
              <label className="pd-label">Warranty Start Date</label>
              <input
                type="date"
                {...register('WarrantyStartDate')}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Warranty End Date</label>
              <input
                type="date"
                {...register('WarrantyEndDate')}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Insurance Policy No</label>
              <input
                type="text"
                {...register('InsurancePolicyNo')}
                className="pd-input"
                placeholder="Insurance policy"
              />
            </div>
            <div>
              <label className="pd-label">Insurance Expiry</label>
              <input
                type="date"
                {...register('InsuranceExpiry')}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Last Maintenance Date</label>
              <input
                type="date"
                {...register('LastMaintenanceDate')}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Next Maintenance Date</label>
              <input
                type="date"
                {...register('NextMaintenanceDate')}
                className="pd-input"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="pd-label">Remarks</label>
              <textarea
                {...register('Remarks')}
                className="pd-input"
                rows={3}
                placeholder="Additional remarks"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {activeTab !== 'basic' && (
            <button
              type="button"
              className="pd-btn-outline mr-4"
              onClick={() =>
                setActiveTab(activeTab === 'financial' ? 'basic' : 'financial')
              }
            >
              Previous
            </button>
          )}
          {activeTab !== 'additional' && (
            <button
              type="button"
              className="pd-btn-save"
              onClick={() =>
                setActiveTab(activeTab === 'basic' ? 'financial' : 'additional')
              }
            >
              Next
            </button>
          )}
          {activeTab === 'additional' && (
            <button type="submit" className="pd-btn-save">
              Add Fixed Asset
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FixedAssetAdd;
