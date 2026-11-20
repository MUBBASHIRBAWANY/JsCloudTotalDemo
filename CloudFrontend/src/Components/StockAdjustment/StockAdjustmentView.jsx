import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDataFundtion } from '../../Api/CRUDFunctions';
import { useSelector } from 'react-redux';
import { useLoader } from '../../hooks/useLoader.jsx';

const StockAdjustmentView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [record, setRecord] = useState(null);
    const [products, setProducts] = useState([]);
    const AllProducts = useSelector((state) => state.Product.product);
    const { loading, showLoader, hideLoader, LoaderComponent } = useLoader();

    const getData = async () => {
        showLoader('Loading...');
        try {
            if (AllProducts.length === 0) {
                const res = await getDataFundtion('/product');
                setProducts(res.data);
            } else {
                setProducts(AllProducts);
            }
            const response = await getDataFundtion('/StockAdjustment');
            const found = response.data.find(item => item._id === id);
            setRecord(found);
        } catch (err) {
            console.error(err);
        } finally {
            hideLoader();
        }
    };

    useEffect(() => {
        getData();
    }, [id]);

    const getProductName = (productId) => {
        const p = products.find(prod => prod._id === productId);
        return p ? `${p.ProductName} (${p.mastercode || ''})` : productId;
    };

    if (!record) return <LoaderComponent />;

    return (
        <div className="mx-5">
            <LoaderComponent />
            <h1 className="text-xl md:pd-page-title text-center mb-6">View Stock Adjustment</h1>

            <div className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="pd-label">Adjustment Number</label>
                        <p className="pd-text-body">{record.AdjustmentNumber}</p>
                    </div>
                    <div>
                        <label className="pd-label">Date</label>
                        <p className="pd-text-body">{record.AdjustmentDate}</p>
                    </div>
                    <div>
                        <label className="pd-label">Sales Flow Ref</label>
                        <p className="pd-text-body">{record.SalesFlowRef || '-'}</p>
                    </div>
                    <div>
                        <label className="pd-label">Status</label>
                        <p className={`pd-text-body font-semibold ${record.PostStatus ? 'text-green-600' : 'text-yellow-600'}`}>
                            {record.PostStatus ? 'Posted' : 'Unposted'}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr>
                                <th className="border p-2">#</th>
                                <th className="border p-2">Product</th>
                                <th className="border p-2">Less Box</th>
                                <th className="border p-2">Less Amount</th>
                                <th className="border p-2">Add Box</th>
                                <th className="border p-2">Add Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(record.AdjustmentData || []).map((item, index) => (
                                <tr key={index}>
                                    <td className="border p-2 text-center">{index + 1}</td>
                                    <td className="border p-2">{getProductName(item.productName)}</td>
                                    <td className="border p-2 text-right">{Number(item.lessBox || 0).toLocaleString()}</td>
                                    <td className="border p-2 text-right">{Number(item.lessAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="border p-2 text-right">{Number(item.addBox || 0).toLocaleString()}</td>
                                    <td className="border p-2 text-right">{Number(item.addAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button
                    onClick={() => navigate('/StockAdjustment')}
                    className="pd-btn-save"
                >
                    Back to List
                </button>
            </div>
        </div>
    );
};

export default StockAdjustmentView;
