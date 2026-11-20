import React, { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions.jsx';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer.js';
import { fetchPricelistReducer } from '../../../Redux/Reducers/PricelistReducer.js';

const PriceListSchemeAdd = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const Products1 = useSelector((state) => state.Product.product);
  console.log(Products1)
  const Products = Products1.filter((status)=> status.isForSND === "true");
  const PriceList1 = useSelector((state) => state.PricelistReducer.PricelistReducer);
  let PriceList = []
  if(PriceList1 !== undefined){
     PriceList = PriceList1?.filter((status)=> status.PriceListStatus === "Active") || [];
  }

  const [selectedPriceLists, setSelectedPriceLists] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [schemeData, setSchemeData] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');

  useEffect(() => {
    const getData = async () => {
      if (Products.length === 0) {
        const res = await getDataFundtion('/product');
        dispatch(fetchproduct(res));
      }
      if (PriceList.length === 0) {
        const res = await getDataFundtion('/PriceList/');
        dispatch(fetchPricelistReducer(res));
      }
    };
    getData();
  }, []);

  const PriceListOptions = PriceList.map((item) => ({
    value: item._id,
    label: `${item.PriceListName} (${item.PriceListNumber})`,
  }));

  const filteredProducts = Products.filter((item) =>
    item.ProductName?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    item.salesFlowRef?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const toggleProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    setSelectedProducts(filteredProducts.map((p) => p._id));
  };

  const deselectAllProducts = () => {
    setSelectedProducts([]);
  };

  const updateSchemeField = (priceListId, productId, field, value) => {
    setSchemeData((prev) => {
      const key = `${priceListId}_${productId}`;
      const existing = prev[key] || {};
      const isSchemeRS = existing.IsSchemeRS !== false;
      const isSchemeBox = existing.isSchemeBox === true;

      if (field === 'IsSchemeRS' && value === false && !isSchemeBox) {
        toast.error('Is Scheme RS or Is Scheme Box mein se kam az kam ek true hona zaroori hai');
        return prev;
      }
      if (field === 'isSchemeBox' && value === false && !isSchemeRS) {
        toast.error('Is Scheme RS or Is Scheme Box mein se kam az kam ek true hona zaroori hai');
        return prev;
      }

      const updated = { ...existing, priceListId, productId, [field]: value };

      if (field === 'IsSchemeRS') {
        const enabled = value === true;
        updated.IsSchemeRS = enabled;
        if (!enabled) {
          updated.ClaimableSpecialTO = 0;
          updated.UnClaimableSpecialTO = 0;
        }
      }

      if (field === 'isSchemeBox') {
        const enabled = value === true;
        updated.isSchemeBox = enabled;
        updated.schemeBox = enabled ? (Number(existing.schemeBox) || 0) : 0;
        updated.onBox = enabled ? (Number(existing.onBox) || 24) : 0;
      }

      if (
        (field === 'ClaimableSpecialTO' || field === 'UnClaimableSpecialTO') &&
        updated.IsSchemeRS === false
      ) {
        return prev;
      }

      // Get TPSale, TO, DisPer from PriceList data
      const pl = PriceList.find((p) => p._id === priceListId);
      const plRow = pl?.PriceListData?.find((d) => d.product === productId);
      const TPSale = Number(plRow?.TPSale || 0);
      const TO = Number(plRow?.TO || 0);
      const DisPer = Number(plRow?.DisPer || 0);

      // Effective Claimable/UnClaimable with fallback: cell → product → global
      // `||` (not `??`) so an empty/cleared value reverts to the product/global default.
      const productVals = prev[`global_${productId}`] || {};
      const globalVals = prev['global_global'] || {};
      const rsEnabled = updated.IsSchemeRS !== false;
      const claimable = rsEnabled
        ? Number(
            updated.ClaimableSpecialTO || productVals.ClaimableSpecialTO || globalVals.ClaimableSpecialTO || 0
          )
        : 0;
      const unclaimable = rsEnabled
        ? Number(
            updated.UnClaimableSpecialTO || productVals.UnClaimableSpecialTO || globalVals.UnClaimableSpecialTO || 0
          )
        : 0;

      // Auto-calculate SpecialTO = ClaimableSpecialTO + UnClaimableSpecialTO
      // When IsSchemeRS is false, scheme stays 0 (no minus on NetSale)
      updated.SpecialTO = claimable + unclaimable;

      // Auto-calculate NetSale
      const base = TPSale - TO - updated.SpecialTO;
      updated.NetSale = base - (base * DisPer) / 100;

      return { ...prev, [key]: updated };
    });
  };

  // Effective Claimable/UnClaimable with fallback chain: cell → product → global
  const getEffectiveSpecialValues = (productId, cellData) => {
    const cell = cellData || {};
    const product = schemeData[`global_${productId}`] || {};
    const global = schemeData['global_global'] || {};
    // Note: `||` (not `??`) so an empty/cleared cell reverts to the product/global default.
    // Input values are strings, so an explicit "0" (truthy string) is still respected.
    const claimable = Number(
      cell.ClaimableSpecialTO || product.ClaimableSpecialTO || global.ClaimableSpecialTO || 0
    );
    const unclaimable = Number(
      cell.UnClaimableSpecialTO || product.UnClaimableSpecialTO || global.UnClaimableSpecialTO || 0
    );
    return { claimable, unclaimable };
  };

  const getSchemeField = (priceListId, productId, field) => {
    if (priceListId === 'global' && productId === 'global') {
      return schemeData['global_global']?.[field] || '';
    }
    if (priceListId === 'global') {
      return (
        schemeData[`global_${productId}`]?.[field] ||
        schemeData['global_global']?.[field] ||
        ''
      );
    }
    const key = `${priceListId}_${productId}`;
    const d = schemeData[key];
    // Per-cell date inputs fall back to the global scheme dates when not set individually
    if (field === 'SchemeStartDate') {
      return d?.[field] || schemeData['global_global']?.startDate || '';
    }
    if (field === 'SchemeEndDate') {
      return d?.[field] || schemeData['global_global']?.endDate || '';
    }
    // Per-cell Claimable/UnClaimable fall back: cell → product → global
    if (field === 'ClaimableSpecialTO' || field === 'UnClaimableSpecialTO') {
      if (d?.IsSchemeRS === false) return 0;
      return (
        d?.[field] ||
        schemeData[`global_${productId}`]?.[field] ||
        schemeData['global_global']?.[field] ||
        ''
      );
    }
    if (field === 'SpecialTO') {
      if (d?.IsSchemeRS === false) return 0;
      const { claimable, unclaimable } = getEffectiveSpecialValues(productId, d);
      return claimable + unclaimable;
    }
    if (field === 'NetSale') {
      const pl = PriceList.find((p) => p._id === priceListId);
      const plRow = pl?.PriceListData?.find((r) => r.product === productId);
      const { claimable, unclaimable } = getEffectiveSpecialValues(productId, d);
      const specialTO = d?.IsSchemeRS === false ? 0 : claimable + unclaimable;
      const base = Number(plRow?.TPSale || 0) - Number(plRow?.TO || 0) - specialTO;
      return base - (base * Number(plRow?.DisPer || 0)) / 100;
    }
    if (field === 'IsSchemeRS') {
      return d?.IsSchemeRS !== false;
    }
    if (field === 'isSchemeBox') {
      return d?.isSchemeBox === true;
    }
    if (field === 'schemeBox') {
      return d?.isSchemeBox === true ? (d?.schemeBox ?? 0) : 0;
    }
    if (field === 'onBox') {
      return d?.isSchemeBox === true ? (d?.onBox ?? 24) : 0;
    }
    return d?.[field] || '';
  };

  const onSubmit = async () => {
    if (selectedPriceLists.length === 0) {
      return toast.error('Please select at least one Price List');
    }
    if (selectedProducts.length === 0) {
      return toast.error('Please select at least one Product');
    }

    const globalData = schemeData['global_global'] || {};
    if (!globalData.startDate || !globalData.endDate) {
      return toast.error('Please select Scheme Start Date and End Date');
    }
    if (new Date(globalData.endDate) < new Date(globalData.startDate)) {
      return toast.error('Scheme End Date cannot be before Start Date');
    }

    for (const plId of selectedPriceLists) {
      for (const prodId of selectedProducts) {
        const cell = schemeData[`${plId}_${prodId}`] || {};
        if (cell.IsSchemeRS === false && cell.isSchemeBox !== true) {
          return toast.error('Is Scheme RS ya Is Scheme Box mein se ek true hona zaroori hai');
        }
      }
    }

    setLoading(true);
    try {
      // Build one scheme row for every selected (PriceList × Product) combination
      const schemeRows = [];
      selectedPriceLists.forEach((plId) => {
        const pl = PriceList.find((p) => p._id === plId);
        selectedProducts.forEach((prodId) => {
          const cell = schemeData[`${plId}_${prodId}`] || {};
          const productData = schemeData[`global_${prodId}`] || {};
          const plRow = pl?.PriceListData?.find((d) => d.product === prodId);
          const isSchemeRS = cell.IsSchemeRS !== false;
          const isSchemeBox = cell.isSchemeBox === true;
          const ClaimableSpecialTO = isSchemeRS
            ? Number(
                cell.ClaimableSpecialTO || productData.ClaimableSpecialTO || globalData.ClaimableSpecialTO || 0
              )
            : 0;
          const UnClaimableSpecialTO = isSchemeRS
            ? Number(
                cell.UnClaimableSpecialTO || productData.UnClaimableSpecialTO || globalData.UnClaimableSpecialTO || 0
              )
            : 0;
          schemeRows.push({
            priceListId: plId,
            productId: prodId,
            ClaimableSpecialTO,
            UnClaimableSpecialTO,
            SpecialTO: ClaimableSpecialTO + UnClaimableSpecialTO,
            SchemeStartDate: cell.SchemeStartDate || globalData.startDate,
            SchemeEndDate: cell.SchemeEndDate || globalData.endDate,
            TPSale: plRow?.TPSale || 0,
            TO: plRow?.TO || 0,
            DisPer: plRow?.DisPer || 0,
            IsSchemeRS: isSchemeRS,
            isSchemeBox,
            schemeBox: isSchemeBox ? (Number(cell.schemeBox) || 0) : 0,
            onBox: isSchemeBox ? (Number(cell.onBox) || 24) : 0,
          });
        });
      });

      const payload = {
        priceLists: selectedPriceLists,
        products: selectedProducts,
        startDate: globalData.startDate,
        endDate: globalData.endDate,
        schemeData: schemeRows,
      };

      await createDataFunction('/PriceList/AddScheme', payload);
      toast.success('Scheme added successfully');
      setTimeout(() => navigate('/PriceList'), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:pd-page-title text-center mb-6">Add Scheme to Price List</h1>

      <div className="pd-card p-4 md:p-6">
        {/* Price List Selection */}
        <div className="mb-6">
          <label className="pd-label">Select Price Lists (Multi)</label>
          <AppSelect
            isMulti
            options={PriceListOptions}
            value={PriceListOptions.filter((o) => selectedPriceLists.includes(o.value))}
            onChange={(selected) => setSelectedPriceLists(selected?.map((s) => s.value) || [])}
            placeholder="Select Price Lists..."
          />
        </div>

        {/* Global Scheme Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="pd-label">Scheme Start Date</label>
            <input
              type="date"
              className="pd-input"
              value={getSchemeField('global', 'global', 'startDate')}
              onChange={(e) => {
                selectedPriceLists.forEach((plId) => {
                  selectedProducts.forEach((prodId) => {
                    updateSchemeField(plId, prodId, 'startDate', e.target.value);
                  });
                });
                updateSchemeField('global', 'global', 'startDate', e.target.value);
              }}
            />
          </div>
          <div>
            <label className="pd-label">Scheme End Date</label>
            <input
              type="date"
              className="pd-input"
              value={getSchemeField('global', 'global', 'endDate')}
              onChange={(e) => {
                selectedPriceLists.forEach((plId) => {
                  selectedProducts.forEach((prodId) => {
                    updateSchemeField(plId, prodId, 'endDate', e.target.value);
                  });
                });
                updateSchemeField('global', 'global', 'endDate', e.target.value);
              }}
            />
          </div>
          <div>
            <label className="pd-label">Claimable Special (Global)</label>
            <input
              type="number"
              min="0"
              className="pd-input"
              value={getSchemeField('global', 'global', 'ClaimableSpecialTO')}
              onChange={(e) => {
                selectedPriceLists.forEach((plId) => {
                  selectedProducts.forEach((prodId) => {
                    updateSchemeField(plId, prodId, 'ClaimableSpecialTO', e.target.value);
                  });
                });
                updateSchemeField('global', 'global', 'ClaimableSpecialTO', e.target.value);
              }}
            />
          </div>
          <div>
            <label className="pd-label">UnClaimable Special (Global)</label>
            <input
              type="number"
              min="0"
              className="pd-input"
              value={getSchemeField('global', 'global', 'UnClaimableSpecialTO')}
              onChange={(e) => {
                selectedPriceLists.forEach((plId) => {
                  selectedProducts.forEach((prodId) => {
                    updateSchemeField(plId, prodId, 'UnClaimableSpecialTO', e.target.value);
                  });
                });
                updateSchemeField('global', 'global', 'UnClaimableSpecialTO', e.target.value);
              }}
            />
          </div>
        </div>

        {/* Main Content - Products & Price List Grid */}
        <div className="flex gap-4">
          {/* Left Side - Products */}
          <div className="w-1/3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Products ({selectedProducts.length})</h3>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllProducts} className="text-xs text-blue-600 hover:underline">
                  Select All
                </button>
                <button type="button" onClick={deselectAllProducts} className="text-xs text-red-600 hover:underline">
                  Deselect All
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="Search products..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="pd-input mb-2 text-sm"
            />
            <div className="border rounded max-h-[400px] overflow-y-auto">
              <div className="flex items-center gap-2 px-2 py-1 border-b bg-gray-100 text-[10px] font-semibold text-gray-600 sticky top-0 z-10">
                <div className="w-4" />
                <div className="flex-1">Product</div>
                <div className="w-14 text-center">Claim</div>
                <div className="w-14 text-center">UnClaim</div>
              </div>
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className={`flex items-center gap-2 p-2 border-b hover:bg-gray-50 ${
                    selectedProducts.includes(product._id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product._id)}
                    onChange={() => toggleProduct(product._id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div
                    className="flex-1 text-sm cursor-pointer"
                    onClick={() => toggleProduct(product._id)}
                  >
                    <div className="font-medium">{product.ProductName}</div>
                    <div className="text-xs text-gray-500">{product.salesFlowRef}</div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    title="Claimable Special"
                    className="w-14 p-1 border rounded text-xs"
                    value={getSchemeField('global', product._id, 'ClaimableSpecialTO')}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      selectedPriceLists.forEach((plId) =>
                        updateSchemeField(plId, product._id, 'ClaimableSpecialTO', e.target.value)
                      );
                      updateSchemeField('global', product._id, 'ClaimableSpecialTO', e.target.value);
                    }}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    title="UnClaimable Special"
                    className="w-14 p-1 border rounded text-xs"
                    value={getSchemeField('global', product._id, 'UnClaimableSpecialTO')}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      selectedPriceLists.forEach((plId) =>
                        updateSchemeField(plId, product._id, 'UnClaimableSpecialTO', e.target.value)
                      );
                      updateSchemeField('global', product._id, 'UnClaimableSpecialTO', e.target.value);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Price List Grid */}
          <div className="w-2/3">
            <h3 className="font-semibold mb-2">Price List Scheme Grid</h3>
            {selectedPriceLists.length === 0 || selectedProducts.length === 0 ? (
              <div className="border rounded p-8 text-center text-gray-500">
                Select Price Lists and Products to view grid
              </div>
            ) : (
              <div className="border rounded overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="border p-2 text-left min-w-[200px]">Product</th>
                      {selectedPriceLists.map((plId) => {
                        const pl = PriceList.find((p) => p._id === plId);
                        return (
                          <th key={plId} className="border p-2 text-center min-w-[180px]">
                            {pl?.PriceListName}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((prodId) => {
                      const product = Products.find((p) => p._id === prodId);
                      return (
                        <tr key={prodId}>
                          <td className="border p-2">
                            <div className="font-medium text-xs">{product?.ProductName}</div>
                            <div className="text-xs text-gray-500">{product?.salesFlowRef}</div>
                          </td>
                          {selectedPriceLists.map((plId) => {
                            const plData = PriceList.find((p) => p._id === plId);
                            return (
                            <td key={plId} className="border p-1">
                              <div className="text-[10px] text-gray-500 mb-0.5">TPSale</div>
                              <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">
                                {plData?.PriceListData?.find((d) => d.product === prodId)?.TPSale || 0}
                              </div>
                              <div className="text-[10px] text-gray-500 mb-0.5">TO</div>
                              <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">
                                {plData?.PriceListData?.find((d) => d.product === prodId)?.TO || 0}
                              </div>
                              <div className="text-[10px] text-gray-500 mb-0.5">Claimable Special</div>
                              <input
                                type="number"
                                min="0"
                                disabled={getSchemeField(plId, prodId, 'IsSchemeRS') === false}
                                className={`w-full p-1 border rounded text-xs mb-1 ${getSchemeField(plId, prodId, 'IsSchemeRS') === false ? 'bg-gray-100 text-gray-400' : ''}`}
                                value={getSchemeField(plId, prodId, 'ClaimableSpecialTO')}
                                onChange={(e) => updateSchemeField(plId, prodId, 'ClaimableSpecialTO', e.target.value)}
                              />
                              <div className="text-[10px] text-gray-500 mb-0.5">UnClaimable Special</div>
                              <input
                                type="number"
                                min="0"
                                disabled={getSchemeField(plId, prodId, 'IsSchemeRS') === false}
                                className={`w-full p-1 border rounded text-xs mb-1 ${getSchemeField(plId, prodId, 'IsSchemeRS') === false ? 'bg-gray-100 text-gray-400' : ''}`}
                                value={getSchemeField(plId, prodId, 'UnClaimableSpecialTO')}
                                onChange={(e) => updateSchemeField(plId, prodId, 'UnClaimableSpecialTO', e.target.value)}
                              />
                              <div className="text-[10px] text-gray-500 mb-0.5">Scheme Start Date</div>
                              <input
                                type="date"
                                className="w-full p-1 border rounded text-xs mb-1"
                                value={getSchemeField(plId, prodId, 'SchemeStartDate') || ''}
                                onChange={(e) => updateSchemeField(plId, prodId, 'SchemeStartDate', e.target.value)}
                              
                              />
                              <div className="text-[10px] text-gray-500 mb-0.5">Scheme End Date</div>
                              <input
                                type="date"
                                className="w-full p-1 border rounded text-xs mb-1"
                                value={getSchemeField(plId, prodId, 'SchemeEndDate') || ''}
                                onChange={(e) => updateSchemeField(plId, prodId, 'SchemeEndDate', e.target.value)}
                              />
                              <div className="text-[10px] text-gray-500 mb-0.5">Scheme</div>
                              <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">
                                {getSchemeField(plId, prodId, 'IsSchemeRS') === false
                                  ? 0
                                  : (getSchemeField(plId, prodId, 'SpecialTO') ||
                                      plData?.PriceListData?.find((d) => d.product === prodId)?.SpecialTO ||
                                      0)}
                              </div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <label className="text-[10px] text-gray-500">Is Scheme RS</label>
                                <input
                                  type="checkbox"
                                  checked={getSchemeField(plId, prodId, 'IsSchemeRS') !== false}
                                  onChange={(e) => updateSchemeField(plId, prodId, 'IsSchemeRS', e.target.checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <label className="text-[10px] text-gray-500">Is Scheme Box</label>
                                <input
                                  type="checkbox"
                                  checked={getSchemeField(plId, prodId, 'isSchemeBox') === true}
                                  onChange={(e) => updateSchemeField(plId, prodId, 'isSchemeBox', e.target.checked)}
                                />
                              </div>
                              <div className="text-[10px] text-gray-500 mb-0.5">Scheme Box</div>
                              <input
                                type="number"
                                min="0"
                                disabled={!getSchemeField(plId, prodId, 'isSchemeBox')}
                                className={`w-full p-1 border rounded text-xs mb-1 ${!getSchemeField(plId, prodId, 'isSchemeBox') ? 'bg-gray-100 text-gray-400' : ''}`}
                                value={getSchemeField(plId, prodId, 'schemeBox')}
                                onChange={(e) => updateSchemeField(plId, prodId, 'schemeBox', e.target.value)}
                              />
                              <div className="text-[10px] text-gray-500 mb-0.5">On Box</div>
                              <input
                                type="number"
                                min="0"
                                disabled={!getSchemeField(plId, prodId, 'isSchemeBox')}
                                className={`w-full p-1 border rounded text-xs mb-1 ${!getSchemeField(plId, prodId, 'isSchemeBox') ? 'bg-gray-100 text-gray-400' : ''}`}
                                value={getSchemeField(plId, prodId, 'onBox')}
                                onChange={(e) => updateSchemeField(plId, prodId, 'onBox', e.target.value)}
                              />
                              <div className="text-[10px] text-gray-500 mb-0.5">Discount %</div>
                              <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">
                                {plData?.PriceListData?.find((d) => d.product === prodId)?.DisPer || 0}
                              </div>
                              <div className="text-[10px] text-gray-500 mb-0.5">Net Sale</div>
                              <div className="w-full p-1 border rounded text-xs font-semibold bg-gray-50">
                                {getSchemeField(plId, prodId, 'NetSale') || plData?.PriceListData?.find((d) => d.product === prodId)?.NetSale}
                              </div>
                              
                            </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="border p-2 text-xs">TOTAL</td>
                      {selectedPriceLists.map((plId) => {
                        const pl = PriceList.find((p) => p._id === plId);
                        const totals = selectedProducts.reduce(
                          (acc, prodId) => {
                            const plRow = pl?.PriceListData?.find((r) => r.product === prodId);
                            const claimable = Number(getSchemeField(plId, prodId, 'ClaimableSpecialTO') || 0);
                            const unclaimable = Number(getSchemeField(plId, prodId, 'UnClaimableSpecialTO') || 0);
                            const specialTO = claimable + unclaimable;
                            const base = Number(plRow?.TPSale || 0) - Number(plRow?.TO || 0) - specialTO;
                            const netSale = base - (base * Number(plRow?.DisPer || 0)) / 100;
                            return {
                              TPSale: acc.TPSale + Number(plRow?.TPSale || 0),
                              TO: acc.TO + Number(plRow?.TO || 0),
                              ClaimableSpecialTO: acc.ClaimableSpecialTO + claimable,
                              UnClaimableSpecialTO: acc.UnClaimableSpecialTO + unclaimable,
                              SpecialTO: acc.SpecialTO + specialTO,
                              DisPer: 0,
                              NetSale: acc.NetSale + netSale,
                            };
                          },
                          { TPSale: 0, TO: 0, ClaimableSpecialTO: 0, UnClaimableSpecialTO: 0, SpecialTO: 0, DisPer: 0, NetSale: 0 }
                        );
                        return (
                          <td key={plId} className="border p-1">
                            <div className="text-[10px] text-gray-500 mb-0.5">TPSale</div>
                            <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">{totals.TPSale}</div>
                            <div className="text-[10px] text-gray-500 mb-0.5">TO</div>
                            <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">{totals.TO}</div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Claimable Special</div>
                            <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">{totals.ClaimableSpecialTO}</div>
                            <div className="text-[10px] text-gray-500 mb-0.5">UnClaimable Special</div>
                            <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">{totals.UnClaimableSpecialTO}</div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Scheme</div>
                            <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">{totals.SpecialTO}</div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Discount %</div>
                            <div className="w-full p-1 border rounded text-xs mb-1 bg-gray-100">-</div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Net Sale</div>
                            <div className="w-full p-1 border rounded text-xs font-semibold bg-gray-100">{totals.NetSale}</div>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onSubmit}
            disabled={loading}
            className="pd-btn-save"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Saving...' : 'Save Scheme'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceListSchemeAdd;
