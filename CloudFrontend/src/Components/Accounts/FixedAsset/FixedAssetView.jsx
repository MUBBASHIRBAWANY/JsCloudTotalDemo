import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDataFundtion } from '../../../Api/CRUDFunctions';

const FixedAssetView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getDataFundtion(`/FixedAsset/${id}`);
        setData(res.data);
      } catch (err) {
        console.error('Error fetching fixed asset:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10">
        <p className="pd-text-muted text-lg">Fixed Asset not found</p>
        <button
          className="pd-btn-save mt-4"
          onClick={() => navigate('/FixedAssetList')}
        >
          Back to List
        </button>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold pd-text-primary mb-3 border-b pd-border-default pb-2">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );

  const Field = ({ label, value }) => (
    <div>
      <label className="block pd-text-muted text-sm font-medium mb-1">{label}</label>
      <p className="px-3 py-2 border rounded-lg pd-bg-muted pd-text-body text-sm">
        {value || '-'}
      </p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="pd-page-title">View Fixed Asset</h1>
        <div className="flex gap-3">
          <button
            className="pd-btn-outline"
            onClick={() => navigate('/FixedAssetList')}
          >
            Back to List
          </button>
          <button
            className="pd-btn-save"
            onClick={() => navigate(`/FixedAssetEdit/${id}`)}
          >
            Edit
          </button>
        </div>
      </div>

      <div className="pd-card p-6">
        <Section title="Basic Information">
          <Field label="Asset Code" value={data.AssetCode} />
          <Field label="Asset Name" value={data.AssetName} />
          <Field label="Asset Category" value={data.AssetCategory} />
          <Field label="Description" value={data.Description} />
          <Field label="Department" value={data.Department} />
          <Field label="Serial Number" value={data.SerialNumber} />
          <Field label="Model" value={data.Model} />
          <Field label="Manufacturer" value={data.Manufacturer} />
          <Field label="Condition" value={data.Condition} />
          <Field label="Status" value={data.Status} />
        </Section>

        <Section title="Financial Details">
          <Field label="Purchase Cost" value={`Rs. ${formatCurrency(data.PurchaseCost)}`} />
          <Field label="Purchase Date" value={formatDate(data.PurchaseDate)} />
          <Field label="Salvage Value" value={`Rs. ${formatCurrency(data.SalvageValue)}`} />
          <Field label="Useful Life" value={data.UsefulLife ? `${data.UsefulLife} Years` : '-'} />
          <Field label="Depreciation Method" value={data.DepreciationMethod} />
          <Field label="Depreciation Rate" value={data.DepreciationRate ? `${data.DepreciationRate}%` : '-'} />
          <Field label="Book Value" value={`Rs. ${formatCurrency(data.BookValue)}`} />
          <Field label="Accumulated Depreciation" value={`Rs. ${formatCurrency(data.AccumulatedDepreciation)}`} />
        </Section>

        <Section title="Purchase & Warranty">
          <Field label="Purchase Order No" value={data.PurchaseOrderNo} />
          <Field label="Invoice Number" value={data.InvoiceNumber} />
          <Field label="Warranty Start" value={formatDate(data.WarrantyStartDate)} />
          <Field label="Warranty End" value={formatDate(data.WarrantyEndDate)} />
        </Section>

        <Section title="Insurance & Maintenance">
          <Field label="Insurance Policy No" value={data.InsurancePolicyNo} />
          <Field label="Insurance Expiry" value={formatDate(data.InsuranceExpiry)} />
          <Field label="Last Maintenance" value={formatDate(data.LastMaintenanceDate)} />
          <Field label="Next Maintenance" value={formatDate(data.NextMaintenanceDate)} />
        </Section>

        {data.Remarks && (
          <Section title="Remarks">
            <div className="md:col-span-2 lg:col-span-3">
              <p className="px-3 py-2 border rounded-lg pd-bg-muted pd-text-body text-sm whitespace-pre-wrap">
                {data.Remarks}
              </p>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

export default FixedAssetView;
