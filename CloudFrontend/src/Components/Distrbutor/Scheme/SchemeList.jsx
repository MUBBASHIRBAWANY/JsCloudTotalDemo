import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CRUDFunctions.jsx';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer.js';
import { useDispatch } from 'react-redux';

const SchemeList = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const dispatch = useDispatch()

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
            dispatch(fetchproduct(productRes.data));
      const products = productRes.data || [];

      const productMap = new Map(products.map((p) => [p._id, p]));

      const groupMap = new Map();
      (priceLists || []).forEach((pl) => {
        const plData = pl.PriceListData || [];
        plData.forEach((row) => {
          const specialTO = Number(row.SpecialTO) || 0;
          if (specialTO <= 0) return;
          const product = productMap.get(row.product) || {};
          if (!groupMap.has(pl._id)) {
            groupMap.set(pl._id, {
              id: pl._id,
              priceListNumber: pl.PriceListNumber || '',
              priceListName: pl.PriceListName || '',
              schemes: [],
              statuses: new Set(),
            });
          }
          const group = groupMap.get(pl._id);
          group.schemes.push({
            productId: row.product,
            productName: product.ProductName || row.ProductName || row.product,
            ClaimableSpecialTO: Number(row.ClaimableSpecialTO) || 0,
            UnClaimableSpecialTO: Number(row.UnClaimableSpecialTO) || 0,
            SpecialTO: specialTO,
            SchemeStartDate: row.SchemeStartDate || '',
            SchemeEndDate: row.SchemeEndDate || '',
            status: getSchemeStatus(row.SchemeStartDate, row.SchemeEndDate),
          });
          group.statuses.add(group.schemes[group.schemes.length - 1].status);
        });
      });

      const processed = [...groupMap.values()].map((g) => {
        const startDates = g.schemes.map((s) => s.SchemeStartDate).filter(Boolean).sort();
        const endDates = g.schemes.map((s) => s.SchemeEndDate).filter(Boolean).sort();
        return {
          ...g,
          schemeCount: g.schemes.length,
          totalClaimable: g.schemes.reduce((s, x) => s + x.ClaimableSpecialTO, 0),
          totalUnclaimable: g.schemes.reduce((s, x) => s + x.UnClaimableSpecialTO, 0),
          totalSpecialTO: g.schemes.reduce((s, x) => s + x.SpecialTO, 0),
          schemeStart: startDates[0] || '',
          schemeEnd: endDates[endDates.length - 1] || '',
          status: g.statuses.has('Active')
            ? 'Active'
            : g.statuses.has('Upcoming')
              ? 'Upcoming'
              : 'Expired',
        };
      });

      setGroups(processed);
    } catch (err) {
      console.error('Error fetching schemes:', err);
      toast.error('Failed to load schemes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  /* -------------------- FILTERS -------------------- */
  const filteredGroups = useMemo(() => {
    let filtered = groups;

    if (statusFilter === 'Active') {
      filtered = filtered.filter((g) => g.status === 'Active');
    } else if (statusFilter !== 'All') {
      filtered = filtered.filter((g) => g.status === statusFilter);
    }

    if (filter) {
      const term = filter.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.priceListName.toLowerCase().includes(term) ||
          (g.priceListNumber || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [groups, filter, statusFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(',', '');
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="pd-card p-4 md:p-6">
      <ToastContainer />
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search price list..."
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
                <th className="border p-2 text-left min-w-[220px]">Price List</th>
                <th className="border p-2 text-center min-w-[100px]">Schemes</th>
                <th className="border p-2 text-center min-w-[110px]">Claimable</th>
                <th className="border p-2 text-center min-w-[110px]">UnClaimable</th>
                <th className="border p-2 text-center min-w-[100px]">SpecialTO</th>
                <th className="border p-2 text-center min-w-[130px]">Scheme Start</th>
                <th className="border p-2 text-center min-w-[130px]">Scheme End</th>
                <th className="border p-2 text-center min-w-[90px]">Status</th>
                <th className="border p-2 text-center min-w-[90px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="border p-2">
                      <div className="font-medium text-xs">{group.priceListName}</div>
                      {group.priceListNumber && (
                        <div className="text-xs text-gray-500">{group.priceListNumber}</div>
                      )}
                    </td>
                    <td className="border p-2 text-center text-xs font-semibold">
                      {group.schemeCount}
                    </td>
                    <td className="border p-2 text-center text-xs">
                      {Number(group.totalClaimable).toLocaleString()}
                    </td>
                    <td className="border p-2 text-center text-xs">
                      {Number(group.totalUnclaimable).toLocaleString()}
                    </td>
                    <td className="border p-2 text-center text-xs font-semibold">
                      {Number(group.totalSpecialTO).toLocaleString()}
                    </td>
                    <td className="border p-2 text-center text-xs">{formatDate(group.schemeStart)}</td>
                    <td className="border p-2 text-center text-xs">{formatDate(group.schemeEnd)}</td>
                    <td className="border p-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          group.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : group.status === 'Expired'
                              ? 'bg-red-100 text-red-700'
                              : group.status === 'Upcoming'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {group.status}
                      </span>
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => navigate('/PriceListSchemeEdit')}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="border p-8 text-center text-gray-500">
                    No schemes found for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="text-sm text-gray-600 mt-4">
        Showing <strong>{filteredGroups.length}</strong> of <strong>{groups.length}</strong> price lists with schemes
      </div>
    </div>
  );
};

export default SchemeList;
