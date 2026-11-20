import React, { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import AppSelect from '../../Global/AppSelect.jsx';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions.jsx';

const PriceListSchemeEdit = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [selectedPriceLists, setSelectedPriceLists] = useState([]);
  const [globalStartDate, setGlobalStartDate] = useState('');
  const [globalEndDate, setGlobalEndDate] = useState('');
  const [globalClaimable, setGlobalClaimable] = useState('');
  const [globalUnclaimable, setGlobalUnclaimable] = useState('');
  const [saving, setSaving] = useState(false);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const getSchemeStatus = (startDate, endDate) => {
    if (!startDate || !endDate) return 'No Dates';
    if (todayStr < startDate) return 'Upcoming';
    if (todayStr > endDate) return 'Expired';
    return 'Active';
  };

  /* -------------------- LOAD DATA -------------------- */
  const getData = async () => {
    setIsLoading(true);
    try {
      const priceLists = await getDataFundtion('/PriceList/GetALLPriceList');
      const productRes = await getDataFundtion('/Product/getProductNameId');
      const products = productRes?.data || [];

      const productMap = new Map(products.map((p) => [p._id, p]));

      const processed = [];
      (priceLists || []).forEach((pl) => {
        const plData = pl.PriceListData || [];
        plData.forEach((row) => {
          const specialTO = Number(row.SpecialTO) || 0;
          const isSchemeBox = row.isSchemeBox === true;
          // Free-box schemes store SpecialTO as 0. They still belong on this screen.
          if (specialTO <= 0 && !isSchemeBox) return;
          const product = productMap.get(row.product) || {};
          processed.push({
            id: `${pl._id}_${row.product}`,
            priceListId: pl._id,
            priceListNumber: pl.PriceListNumber || '',
            priceListName: pl.PriceListName || '',
            productId: row.product,
            productName: product.ProductName || row.ProductName || row.product,
            salesFlowRef: product.salesFlowRef || row.salesFlowRef || '',
            code: product.code || '',
            TPSale: Number(row.TPSale) || 0,
            TO: Number(row.TO) || 0,
            DisPer: Number(row.DisPer) || 0,
            ClaimableSpecialTO: Number(row.ClaimableSpecialTO) || 0,
            UnClaimableSpecialTO: Number(row.UnClaimableSpecialTO) || 0,
            SpecialTO: specialTO,
            SchemeStartDate: row.SchemeStartDate || '',
            SchemeEndDate: row.SchemeEndDate || '',
            IsSchemeRS: row.IsSchemeRS !== false,
            isSchemeBox: row.isSchemeBox === true,
            schemeBox: Number(row.schemeBox) || 0,
            onBox: row.isSchemeBox === true
              ? (Number(row.onBox) || 24)
              : (Number(row.onBox) || 0),
            Status: getSchemeStatus(row.SchemeStartDate, row.SchemeEndDate),
          });
        });
      });

      setRows(processed);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load schemes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  /* -------------------- FILTERS -------------------- */
  const priceListOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r.priceListId)) {
        map.set(r.priceListId, { value: r.priceListId, label: r.priceListName });
      }
    });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    let filtered = rows;

    if (statusFilter === 'Active') {
      filtered = filtered.filter((r) => r.Status === 'Active');
    } else if (statusFilter !== 'All') {
      filtered = filtered.filter((r) => r.Status === statusFilter);
    }

    if (selectedPriceLists.length > 0) {
      filtered = filtered.filter((r) => selectedPriceLists.includes(r.priceListId));
    }

    if (filter) {
      const term = filter.toLowerCase();
      filtered = filtered.filter((row) =>
        [row.priceListName, row.priceListNumber, row.productName, row.salesFlowRef, row.code]
          .some((value) => value && value.toString().toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [rows, filter, statusFilter, selectedPriceLists]);

  const filteredIds = useMemo(() => new Set(filteredRows.map((r) => r.id)), [filteredRows]);

  /* -------------------- EDIT LOGIC -------------------- */
  const updateField = (id, field, value) => {
    setRows((prev) => {
      const current = prev.find((row) => row.id === id);
      if (!current) return prev;

      if (field === 'IsSchemeRS' && value === false && current.isSchemeBox !== true) {
        toast.error('Is Scheme RS or Is Scheme Box mein se kam az kam ek true hona zaroori hai');
        return prev;
      }
      if (field === 'isSchemeBox' && value === false && current.IsSchemeRS === false) {
        toast.error('Is Scheme RS or Is Scheme Box mein se kam az kam ek true hona zaroori hai');
        return prev;
      }

      return prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'IsSchemeRS') {
          const enabled = value === true;
          return {
            ...row,
            IsSchemeRS: enabled,
            ClaimableSpecialTO: enabled ? row.ClaimableSpecialTO : 0,
            UnClaimableSpecialTO: enabled ? row.UnClaimableSpecialTO : 0,
          };
        }
        if (field === 'isSchemeBox') {
          const enabled = value === true;
          return {
            ...row,
            isSchemeBox: enabled,
            schemeBox: enabled ? (Number(row.schemeBox) || 0) : 0,
            onBox: enabled ? (Number(row.onBox) || 24) : 0,
          };
        }
        if ((field === 'ClaimableSpecialTO' || field === 'UnClaimableSpecialTO') && row.IsSchemeRS === false) {
          return row;
        }
        return { ...row, [field]: value };
      });
    });
  };

  // Apply a global value to all currently filtered rows
  const applyGlobal = (field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (!filteredIds.has(row.id)) return row;
        if ((field === 'ClaimableSpecialTO' || field === 'UnClaimableSpecialTO') && row.IsSchemeRS === false) {
          return row;
        }
        return { ...row, [field]: value };
      })
    );
  };

  const specialTO = (row) =>
    row.IsSchemeRS === false
      ? 0
      : (Number(row.ClaimableSpecialTO) || 0) + (Number(row.UnClaimableSpecialTO) || 0);

  /* -------------------- UPDATE (AddScheme API) -------------------- */
  const handleUpdate = async () => {
    if (filteredRows.length === 0) {
      return toast.error('No schemes to update');
    }

    for (const row of filteredRows) {
      if (!row.SchemeStartDate || !row.SchemeEndDate) {
        return toast.error(`Scheme dates missing for ${row.productName} (${row.priceListName})`);
      }
      if (new Date(row.SchemeEndDate) < new Date(row.SchemeStartDate)) {
        return toast.error(`Scheme End Date cannot be before Start Date for ${row.productName}`);
      }
      if (row.IsSchemeRS === false && row.isSchemeBox !== true) {
        return toast.error(`Is Scheme RS ya Is Scheme Box mein se ek true hona zaroori hai (${row.productName})`);
      }
    }

    setSaving(true);
    try {
      const priceLists = [...new Set(filteredRows.map((r) => r.priceListId))];
      const products = [...new Set(filteredRows.map((r) => r.productId))];
      const startDates = filteredRows.map((r) => r.SchemeStartDate).sort();
      const endDates = filteredRows.map((r) => r.SchemeEndDate).sort();

      const payload = {
        priceLists,
        products,
        startDate: startDates[0],
        endDate: endDates[endDates.length - 1],
        schemeData: filteredRows.map((row) => {
          const isSchemeRS = row.IsSchemeRS !== false;
          const isSchemeBox = row.isSchemeBox === true;
          const claimable = isSchemeRS ? (Number(row.ClaimableSpecialTO) || 0) : 0;
          const unclaimable = isSchemeRS ? (Number(row.UnClaimableSpecialTO) || 0) : 0;
          return {
            priceListId: row.priceListId,
            productId: row.productId,
            ClaimableSpecialTO: claimable,
            UnClaimableSpecialTO: unclaimable,
            SpecialTO: claimable + unclaimable,
            SchemeStartDate: row.SchemeStartDate,
            SchemeEndDate: row.SchemeEndDate,
            TPSale: row.TPSale,
            TO: row.TO,
            DisPer: row.DisPer,
            IsSchemeRS: isSchemeRS,
            isSchemeBox,
            schemeBox: isSchemeBox ? (Number(row.schemeBox) || 0) : 0,
            onBox: isSchemeBox ? (Number(row.onBox) || 24) : 0,
          };
        }),
      };

      await createDataFunction('/PriceList/AddScheme', payload);
      toast.success('Schemes updated successfully');
      getData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:pd-page-title text-center mb-6">Edit Active Schemes</h1>

      <div className="pd-card p-4 md:p-6">
        {/* Global Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="pd-label">Select Price Lists (Multi)</label>
            <AppSelect
              isMulti
              options={priceListOptions}
              value={priceListOptions.filter((o) => selectedPriceLists.includes(o.value))}
              onChange={(selected) => setSelectedPriceLists(selected?.map((s) => s.value) || [])}
              placeholder="Select Price Lists..."
            />
          </div>
          <div>
            <label className="pd-label">Scheme Start Date (Global)</label>
            <input
              type="date"
              className="pd-input"
              value={globalStartDate}
              onChange={(e) => {
                setGlobalStartDate(e.target.value);
                applyGlobal('SchemeStartDate', e.target.value);
              }}
            />
          </div>
          <div>
            <label className="pd-label">Scheme End Date (Global)</label>
            <input
              type="date"
              className="pd-input"
              value={globalEndDate}
              onChange={(e) => {
                setGlobalEndDate(e.target.value);
                applyGlobal('SchemeEndDate', e.target.value);
              }}
            />
          </div>
          <div>
            <label className="pd-label">Claimable Special (Global)</label>
            <input
              type="number"
              min="0"
              className="pd-input"
              value={globalClaimable}
              onChange={(e) => {
                setGlobalClaimable(e.target.value);
                applyGlobal('ClaimableSpecialTO', e.target.value);
              }}
            />
          </div>
          <div>
            <label className="pd-label">UnClaimable Special (Global)</label>
            <input
              type="number"
              min="0"
              className="pd-input"
              value={globalUnclaimable}
              onChange={(e) => {
                setGlobalUnclaimable(e.target.value);
                applyGlobal('UnClaimableSpecialTO', e.target.value);
              }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Search price list / product..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pd-input flex-1 min-w-[220px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pd-input w-40"
          >
            <option value="Active">Active</option>
            <option value="All">All</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        {/* Table */}
        <div className="border rounded overflow-auto max-h-[60vh]">
          {isLoading ? (
            <div className="p-10 text-center text-gray-500">Loading schemes...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="border p-2 text-left min-w-[180px]">Price List</th>
                  <th className="border p-2 text-left min-w-[200px]">Product</th>
                  <th className="border p-2 text-center min-w-[120px]">Claimable Special</th>
                  <th className="border p-2 text-center min-w-[120px]">UnClaimable Special</th>
                  <th className="border p-2 text-center min-w-[100px]">Scheme</th>
                  <th className="border p-2 text-center min-w-[100px]">Is Scheme RS</th>
                  <th className="border p-2 text-center min-w-[100px]">Is Scheme Box</th>
                  <th className="border p-2 text-center min-w-[100px]">Scheme Box</th>
                  <th className="border p-2 text-center min-w-[90px]">On Box</th>
                  <th className="border p-2 text-center min-w-[140px]">Scheme Start Date</th>
                  <th className="border p-2 text-center min-w-[140px]">Scheme End Date</th>
                  <th className="border p-2 text-center min-w-[90px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border p-2">
                        <div className="font-medium text-xs">{row.priceListName}</div>
                        <div className="text-xs text-gray-500">{row.priceListNumber}</div>
                      </td>
                      <td className="border p-2">
                        <div className="font-medium text-xs">{row.productName}</div>
                        <div className="text-xs text-gray-500">{row.code || row.salesFlowRef}</div>
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          min="0"
                          disabled={row.IsSchemeRS === false}
                          className={`w-full p-1 border rounded text-xs ${row.IsSchemeRS === false ? 'bg-gray-100 text-gray-400' : ''}`}
                          value={row.IsSchemeRS === false ? 0 : row.ClaimableSpecialTO}
                          onChange={(e) => updateField(row.id, 'ClaimableSpecialTO', e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          min="0"
                          disabled={row.IsSchemeRS === false}
                          className={`w-full p-1 border rounded text-xs ${row.IsSchemeRS === false ? 'bg-gray-100 text-gray-400' : ''}`}
                          value={row.IsSchemeRS === false ? 0 : row.UnClaimableSpecialTO}
                          onChange={(e) => updateField(row.id, 'UnClaimableSpecialTO', e.target.value)}
                        />
                      </td>
                      <td className="border p-2 text-center font-semibold">
                        {specialTO(row)}
                      </td>
                      <td className="border p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.IsSchemeRS !== false}
                          onChange={(e) => updateField(row.id, 'IsSchemeRS', e.target.checked)}
                        />
                      </td>
                      <td className="border p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.isSchemeBox === true}
                          onChange={(e) => updateField(row.id, 'isSchemeBox', e.target.checked)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          min="0"
                          disabled={!row.isSchemeBox}
                          className={`w-full p-1 border rounded text-xs ${!row.isSchemeBox ? 'bg-gray-100 text-gray-400' : ''}`}
                          value={row.schemeBox}
                          onChange={(e) => updateField(row.id, 'schemeBox', e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          min="0"
                          disabled={!row.isSchemeBox}
                          className={`w-full p-1 border rounded text-xs ${!row.isSchemeBox ? 'bg-gray-100 text-gray-400' : ''}`}
                          value={row.onBox}
                          onChange={(e) => updateField(row.id, 'onBox', e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="date"
                          className="w-full p-1 border rounded text-xs"
                          value={row.SchemeStartDate || ''}
                          onChange={(e) => updateField(row.id, 'SchemeStartDate', e.target.value)}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="date"
                          className="w-full p-1 border rounded text-xs"
                          value={row.SchemeEndDate || ''}
                          onChange={(e) => updateField(row.id, 'SchemeEndDate', e.target.value)}
                        />
                      </td>
                      <td className="border p-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            row.Status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : row.Status === 'Expired'
                                ? 'bg-red-100 text-red-700'
                                : row.Status === 'Upcoming'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {row.Status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="border p-8 text-center text-gray-500">
                      No schemes found for the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing <strong>{filteredRows.length}</strong> of <strong>{rows.length}</strong> schemes
          </div>
          <button
            onClick={handleUpdate}
            disabled={saving || isLoading || filteredRows.length === 0}
            className="pd-btn-save px-6"
            style={{ opacity: saving || isLoading || filteredRows.length === 0 ? 0.6 : 1 }}
          >
            {saving ? 'Updating...' : `Update Schemes (${filteredRows.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceListSchemeEdit;
