import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { ConvetDate } from '../../Global/getDate';

const asList = (res) => (Array.isArray(res) ? res : (res?.data || []));

const uniqueById = (list) => {
  const seen = new Set();
  return list.filter((item) => {
    const id = String(item?._id || '');
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const cell = (row, aliases) => {
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return undefined;
};

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '' || String(value).trim().toUpperCase() === 'N/A';

const findByName = (list, name, nameKey) => {
  const n = String(name).trim().toLowerCase();
  return list.find((item) => String(item?.[nameKey] || '').trim().toLowerCase() === n);
};

const mapType = (value) => {
  const s = String(value).trim().toLowerCase();
  if (s === 'customer' || s === 'cust') return 'Cust';
  if (s === 'distributor' || s === 'distr') return 'Distr';
  return value;
};

const mapStatus = (value) => {
  const s = String(value).trim().toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'inactive' || s === 'nonactive' || s === 'non active') return 'Inactive';
  return value;
};

const TEXT_FIELDS = [
  { field: 'DistrbutorName', aliases: ['DistrbutorName', 'Customer Name', 'Distributor Name'] },
  { field: 'OwnerName', aliases: ['OwnerName', 'Owner Name'] },
  { field: 'OwnerCnic', aliases: ['OwnerCnic', 'Owner Cnic'] },
  { field: 'OldCode', aliases: ['OldCode', 'Old Code'] },
  { field: 'ContactPerson1', aliases: ['ContactPerson1', 'Contact Person 1'] },
  { field: 'ContactPerson2', aliases: ['ContactPerson2', 'Contact Person 2'] },
  { field: 'ContactPerson3', aliases: ['ContactPerson3', 'Contact Person 3'] },
  { field: 'Designation', aliases: ['Designation'] },
  { field: 'Address1', aliases: ['Address1'] },
  { field: 'Address2', aliases: ['Address2'] },
  { field: 'Address3', aliases: ['Address3'] },
  { field: 'CNICNo', aliases: ['CNICNo', 'CNIC No'] },
  { field: 'Country', aliases: ['Country'] },
  { field: 'Province', aliases: ['Province'] },
  { field: 'MobilePhoneNo', aliases: ['MobilePhoneNo', 'Mobile Phone No'] },
  { field: 'TransportType', aliases: ['TransportType', 'TRP Type'] },
  { field: 'MobileNo', aliases: ['MobileNo', 'Mobile No.1'] },
  { field: 'MobileNo2', aliases: ['MobileNo2', 'Mobile No.2'] },
  { field: 'CountryCode', aliases: ['CountryCode'] },
  { field: 'PostalCode', aliases: ['PostalCode', 'Postal Code'] },
  { field: 'Fax', aliases: ['Fax'] },
  { field: 'PrimaryEmail', aliases: ['PrimaryEmail'] },
  { field: 'SecondaryEmail', aliases: ['SecondaryEmail'] },
  { field: 'WebSite', aliases: ['WebSite'] },
  { field: 'LoginID', aliases: ['LoginID', 'Login Id'] },
  { field: 'NTN', aliases: ['NTN'] },
  { field: 'STN', aliases: ['STN'] },
  { field: 'NTNStatus', aliases: ['NTNStatus', 'NTN Active'] },
  { field: 'STNStatus', aliases: ['STNStatus', 'STN Active'] },
  { field: 'CompanyType', aliases: ['CompanyType', 'Company Type'] },
  { field: 'CreditDays', aliases: ['CreditDays', 'Credit Days'] },
  { field: 'checkCredit', aliases: ['checkCredit', 'check Credit'] },
  { field: 'CreditLimit', aliases: ['CreditLimit', 'Credit Limit'] },
  { field: 'BankName', aliases: ['BankName'] },
  { field: 'BranchName', aliases: ['BranchName'] },
  { field: 'BranchCode', aliases: ['BranchCode'] },
  { field: 'BusinessAccountNumber', aliases: ['BusinessAccountNumber'] },
  { field: 'BranchAddress', aliases: ['BranchAddress', 'Branch Address'] },
  { field: 'BranchTelNo', aliases: ['BranchTelNo', 'BranchTel.No', 'BranchTel', 'TelNo'] },
  { field: 'BranchCity', aliases: ['BranchCity', 'Branch City'] },
  { field: 'IBAN', aliases: ['IBAN'] },
];

const excelColumns = [
  ['_id', 'ID'],
  ['DistrbutorSystemCode', 'Distributor Code'],
  ['DistrbutorName', 'Customer Name'],
  ['OwnerName', 'Owner Name'],
  ['OwnerCnic', 'Owner Cnic'],
  ['Type', 'Type'],
  ['PriceListName', 'Price List'],
  ['OrderBookerName', 'Order Booker'],
  ['ContactPerson1', 'Contact Person 1'],
  ['ContactPerson2', 'Contact Person 2'],
  ['ContactPerson3', 'Contact Person 3'],
  ['Designation', 'Designation'],
  ['Address1', 'Address1'],
  ['Address2', 'Address2'],
  ['Address3', 'Address3'],
  ['CNICNo', 'CNIC No'],
  ['Country', 'Country'],
  ['Province', 'Province'],
  ['CityName', 'City'],
  ['MobilePhoneNo', 'Mobile Phone No'],
  ['TransportType', 'TRP Type'],
  ['TransporterName', 'Select Transporter'],
  ['MobileNo', 'Mobile No.1'],
  ['MobileNo2', 'Mobile No.2'],
  ['CountryCode', 'CountryCode'],
  ['PostalCode', 'Postal Code'],
  ['Fax', 'Fax'],
  ['PrimaryEmail', 'PrimaryEmail'],
  ['SecondaryEmail', 'SecondaryEmail'],
  ['WebSite', 'WebSite'],
  ['LoginID', 'Login Id'],
  ['Password', 'Password'],
  ['ShopRegisterDate', 'Shop Register Date'],
  ['NTN', 'NTN'],
  ['STN', 'STN'],
  ['NTNStatus', 'NTN Active'],
  ['STNStatus', 'STN Active'],
  ['CompanyType', 'Company Type'],
  ['CreditDays', 'Credit Days'],
  ['checkCredit', 'check Credit'],
  ['CreditLimit', 'Credit Limit'],
  ['BankName', 'BankName'],
  ['BranchName', 'BranchName'],
  ['BranchCode', 'BranchCode'],
  ['BusinessAccountNumber', 'BusinessAccountNumber'],
  ['BranchAddress', 'Branch Address'],
  ['BranchTelNo', 'BranchTel.No'],
  ['BranchCity', 'Branch City'],
  ['IBAN', 'IBAN'],
];

const BulkDistributorUpdate = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [hide, setHide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupsReady, setLookupsReady] = useState(false);
  const [distributors, setDistributors] = useState([]);
  const [cities, setCities] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [orderBookers, setOrderBookers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const navigate = useNavigate();

  const loadLookups = async () => {
    try {
      const [distRes, cityRes, priceRes, bookerRes, transportRes] = await Promise.all([
        getDataFundtion('/Distrbutor?main=true'),
        getDataFundtion('/City'),
        getDataFundtion('/PriceList'),
        getDataFundtion('/DitriButorOrderBooker'),
        getDataFundtion('/Transport'),
      ]);
      setDistributors(uniqueById(asList(distRes)));
      setCities(asList(cityRes));
      setPriceLists(asList(priceRes));
      setOrderBookers(asList(bookerRes));
      setTransporters(asList(transportRes));
      setLookupsReady(true);
    } catch (err) {
      toast.error('Failed to load distributors');
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  const displayValue = (row, field) => {
    if (field === 'Type') {
      if (row.Type === 'Cust') return 'Customer';
      if (row.Type === 'Distr') return 'Distributor';
      return row.Type ?? '';
    }
    if (field === 'Password') return row.Password ?? row.Password1 ?? '';
    if (field === 'BranchTelNo') return row.BranchTelNo ?? row.BranchTel ?? row.TelNo ?? '';
    if (field === 'ShopRegisterDate') {
      const value = row.ShopRegisterDate;
      if (!value) return '';
      const text = String(value);
      return text.includes('T') ? text.split('T')[0] : text;
    }
    if (field === 'CityName') {
      return cities.find((c) => String(c._id) === String(row.City))?.CityName || '';
    }
    if (field === 'PriceListName') {
      return priceLists.find((p) => String(p._id) === String(row.PriceList))?.PriceListName || '';
    }
    if (field === 'OrderBookerName') {
      return orderBookers.find((o) => String(o._id) === String(row.OrderBooker))?.OrderBookerName || '';
    }
    if (field === 'TransporterName') {
      return transporters.find((t) => String(t._id) === String(row.Transporter))?.TransporterName || '';
    }
    const value = row[field];
    if (value == null || typeof value === 'object') return '';
    return value;
  };

  const handleDownloadCurrent = () => {
    try {
      const excelData = distributors.map((row) => {
        const obj = {};
        excelColumns.forEach(([field, label]) => {
          obj[label] = displayValue(row, field);
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = excelColumns.map(([field, label]) => {
        const maxLen = Math.max(
          label.length,
          ...distributors.map((r) => String(displayValue(r, field) ?? '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 2, 12), 45) };
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Distributors');
      XLSX.writeFile(wb, `DistributorBulkUpdate_${new Date().toLocaleDateString()}.xlsx`);
      toast.success('Excel downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download Excel');
    }
  };

  const downloadExcel = (rows, filename = 'DistributorBulkUpdateErrors.xlsx') => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Errors');
    XLSX.writeFile(workbook, filename);
  };

  const findDistributor = (row) => {
    const id = String(cell(row, ['_id', 'ID', 'Id', 'id']) ?? '').trim();
    const code = String(cell(row, ['DistrbutorSystemCode', 'Distributor Code', 'DistributorCode']) ?? '').trim();
    if (id) {
      const byId = distributors.find((d) => String(d._id) === id);
      if (byId) return byId;
    }
    if (code) {
      return distributors.find((d) => String(d.DistrbutorSystemCode || '').trim() === code);
    }
    return undefined;
  };

  const findOrderBooker = (name) => {
    const n = String(name).trim().toLowerCase();
    return (
      orderBookers.find((ob) => String(ob.OrderBookerName || '').trim().toLowerCase() === n) ||
      orderBookers.find((ob) => `${ob.OrderBookerName || ''} ${ob.code || ''}`.trim().toLowerCase() === n)
    );
  };

  const buildPayload = (row) => {
    const existing = findDistributor(row);
    if (!existing) {
      return { error: 'Distributor not found (need ID or Distributor Code)' };
    }

    const payload = { ...existing };
    delete payload.__v;

    const errors = [];

    TEXT_FIELDS.forEach(({ field, aliases }) => {
      const value = cell(row, aliases);
      if (value !== undefined) payload[field] = value;
    });

    payload.checkCredit = true; // <-- nai key (hamesha true)

    const typeValue = cell(row, ['Type']);
    if (typeValue !== undefined && !isBlank(typeValue)) payload.Type = mapType(typeValue);

    const statusValue = cell(row, ['Status']);
    if (statusValue !== undefined && !isBlank(statusValue)) payload.Status = mapStatus(statusValue);

    const password = cell(row, ['Password', 'Password1']);
    if (password !== undefined) {
      payload.Password = password;
      payload.Password1 = password;
    }

    const shopDate = cell(row, ['ShopRegisterDate', 'Shop Register Date']);
    if (shopDate !== undefined && !isBlank(shopDate)) {
      payload.ShopRegisterDate = ConvetDate(shopDate);
    }

    const matchedById = String(cell(row, ['_id', 'ID', 'Id', 'id']) ?? '').trim() === String(existing._id);
    const newCode = cell(row, ['DistrbutorSystemCode', 'Distributor Code', 'DistributorCode']);
    if (matchedById && newCode !== undefined && !isBlank(newCode)) {
      payload.DistrbutorSystemCode = newCode;
    }

    const cityName = cell(row, ['City', 'CityName']);
    if (cityName !== undefined && !isBlank(cityName)) {
      const city = findByName(cities, cityName, 'CityName');
      if (!city) errors.push(`City not found: ${cityName}`);
      else payload.City = city._id;
    }

    const priceName = cell(row, ['Price List', 'PriceList', 'PriceListName']);
    if (priceName !== undefined && !isBlank(priceName)) {
      const price = findByName(priceLists, priceName, 'PriceListName');
      if (!price) errors.push(`Price List not found: ${priceName}`);
      else payload.PriceList = price._id;
    }

    const bookerName = cell(row, ['Order Booker', 'OrderBooker', 'OrderBookerName']);
    if (bookerName !== undefined && !isBlank(bookerName)) {
      const booker = findOrderBooker(bookerName);
      if (!booker) errors.push(`Order Booker not found: ${bookerName}`);
      else payload.OrderBooker = booker._id;
    }

    const transporterName = cell(row, ['Select Transporter', 'Transporter', 'TransporterName']);
    if (transporterName !== undefined && !isBlank(transporterName)) {
      const transporter = findByName(transporters, transporterName, 'TransporterName');
      if (!transporter) errors.push(`Transporter not found: ${transporterName}`);
      else payload.Transporter = transporter._id;
    }

    if (errors.length) return { error: errors.join('; ') };
    return { payload };
  };

  const onSubmit = async () => {
    if (!lookupsReady) {
      toast.error('Distributor data is still loading');
      return;
    }
    if (!data.length) {
      toast.error('Please upload an Excel file');
      return;
    }
    if (saving) return;

    const prepared = data.map((row) => ({ row, ...buildPayload(row) }));
    const failed = prepared.filter((item) => item.error);
    if (failed.length) {
      toast.error('Some rows have errors — Excel downloaded');
      downloadExcel(failed.map(({ row, error }) => ({ ...row, Error: error })));
      return;
    }

    setSaving(true);
    try {
      for (const item of prepared) {

        await updateDataFunction(`/Distrbutor/UpdateDistrbutor/${item.payload._id}`,   { ...item.payload, checkCredit: true });
      }
      toast.success('All distributors updated successfully');
      setTimeout(() => navigate('/DistrbutorList'), 2000);
    } catch (err) {
      toast.error('Partial data updated — some rows failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
      setData(jsonData);
      setHeaders(firstRow);
      setHide(true);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="p-6">
      <ToastContainer />
      <h2 className="pd-section-title mb-3">Bulk Distributor Update</h2>
      <p className="pd-text-muted mb-4">
        Download current data, edit the Excel, then upload. Rows are matched by ID or Distributor Code.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          type="button"
          onClick={handleDownloadCurrent}
          disabled={!lookupsReady}
          className="pd-btn-outline px-5 py-2 rounded"
        >
          Download Current Data
        </button>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
        {hide && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !lookupsReady}
            className="pd-btn-save px-5 py-2 rounded"
          >
            {saving ? 'Updating...' : 'Update'}
          </button>
        )}
      </div>

      {data.length > 0 && (
        <div>
          <h3 className="mb-2">
            Preview ({data.length} rows{data.length > 50 ? ', showing first 50' : ''})
          </h3>
          <div className="overflow-x-auto rounded-lg border pd-border-default border shadow-md">
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
                {data.slice(0, 50).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((header, colIndex) => (
                      <td key={colIndex} className="whitespace-nowrap px-6 py-4 text-sm">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkDistributorUpdate;