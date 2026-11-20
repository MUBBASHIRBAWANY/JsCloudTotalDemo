import AppAsyncSelect from '../../Global/AppAsyncSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { updateDataFunction } from '../../Api/CurdFunctions';
import { useNavigate } from 'react-router-dom';
import { updateDateSaleOrder } from '../../Redux/Reducers/SaleOrderReducer';


const SaleOrderPost = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOrderFrom, setSelectedOrderFrom] = useState(null);
    const [selectedOrderTo, setSelectedOrderTo] = useState(null)
    const Products = useSelector((state) => state.Product.product);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [submit, setSubmit] = useState(false)
    const Order = useSelector((state) => state.SaleOrder.SaleOrder)


const SaleOrderSorted = [...Order].sort((a, b) => a.SaleOrder - b.SaleOrder)

    const loadOrderOptions = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = SaleOrderSorted
            .filter((item) =>
                item.Status == "false" &&
                item.SalesOrder.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered.map((item) => ({
            value: item.SaleOrderNumber,
            label: item.SaleOrderNumber
        }));
    };

    let defaultOptions = SaleOrderSorted
        .filter((item) =>
            item.Status == "false"
        ).slice(0, 50).map((item) => ({
            value: item.SaleOrderNumber,
            label: item.SaleOrderNumber
        }));;



    const handleSubmit = async (e) => {
        setSubmit(false)
        e.preventDefault();
        const data = []
        //console.log(selectedOrderFrom.value, selectedOrderTo.value);

        const filtervalues = Order.filter(obj => obj.SaleOrderNumber >= selectedOrderFrom.value && obj.SaleOrderNumber <= selectedOrderTo.value)
        //console.log(filtervalues)
        const allTrue = filtervalues.filter((item) => item.Status == "false").map((item) => {
            return ({
                SalesOrder: item.SaleOrderNumber,
                Status: true,
                id: item._id

            })
        })
        //console.log(allTrue)
        for (const item of allTrue) {
            try {
                const res = await updateDataFunction(`SaleOrder/ChangeStatus/${item.id}`, item)
                dispatch(updateDateSaleOrder(item))
            } catch (err) {

                const error = err?.response?.data?.errors
                if (error) {
                    //console.log(error)
                    try {
                        const notAvalible = `this product not avalibale ${Products.find((item) => item._id == error[0]).ProductName}`
                        toast.error(notAvalible)
                    }
                    catch {
                        //console.log(error)
                        const notAvalible = `In Inv#${item.SalesOrder} Qty of ${Products.find((item) => item._id == error[0].product).ProductName} Available Qty ${error[0].qty}  you need ${error[0].Req} Boxes`
                        toast.error(notAvalible)
                    }
                }
            }



        }

        setSelectedOrderFrom(null)
        setSelectedOrderTo(null)
        setIsOpen(false);
        setSubmit(true)
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="pd-btn-save"
            >
                Post Order
            </button>

            {isOpen && (
                <div className="fixed inset-0 pd-modal-overlay flex items-center justify-center p-4 z-50">
                    <div className="pd-bg-surface rounded-xl shadow-2xl w-full max-w-md">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="pd-page-title">Select Sale Order</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="pd-text-muted hover:pd-text-body"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="pd-label">
                                    Select Order from
                                </label>
                                <AppAsyncSelect
                                    cacheOptions
                                    loadOptions={loadOrderOptions}
                                    defaultOptions={defaultOptions}
                                    value={selectedOrderFrom}
                                    onChange={setSelectedOrderFrom}
                                    placeholder="Search Order..."
                                    
                                    classNamePrefix="pd-select"
                                />
                            </div>
                            <div>
                                <label className="pd-label">
                                    Select Order to
                                </label>
                                <AppAsyncSelect
                                    cacheOptions
                                    loadOptions={loadOrderOptions}
                                    onChange={setSelectedOrderTo}
                                    placeholder="Search Order..."
                                    defaultOptions={defaultOptions}
                                    
                                    classNamePrefix="pd-select"
                                />
                            </div>


                            {/* Modal Footer */}
                            <div className="flex justify-end space-x-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 pd-text-body hover:pd-bg-muted rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="pd-btn-save"
                                    disabled={submit}
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default SaleOrderPost;