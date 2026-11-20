import AppSelect from '../../Global/AppSelect.jsx'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import { data, useNavigate } from 'react-router-dom';
import { updateDataFunction } from '../../../Api/CRUDFunctions';
import { updateDateOrderDc } from '../../../Redux/Reducers/OrderDCReducer';


const OrderDCUnPostModal = () => {

    const [isOpen, setIsOpen] = useState(false);
    const [selectedOrderDcFrom, setSelectedOrderDcFrom] = useState(null);
    const [selectedOrderDcTo, setSelectedOrderDcTo] = useState(null)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const OrderDc = useSelector((state) => state.OrderDc.OrderDc)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const TotalProduct = useSelector((state) => state.TotalProducts.TotalProducts)



    //console.log(OrderDc)
    const DcOrderSorted = [...OrderDc].sort((a, b) => a.DcNumber - b.DcNumber)

    const OrderDcOptions = DcOrderSorted.filter((item) => item.Status == "true").map((item) => {
        return ({
            value: item.DcNumber,
            label: item.DcNumber
        })
    })
    //console.log(OrderDcOptions)
    const handleSubmit = async (e) => {
        e.preventDefault();
        //console.log("false")

        // Handle form submission
        //console.log(selectedOrderDcFrom.value, selectedOrderDcTo.value);

        const filtervalues = OrderDc.filter(obj => obj.DcNumber >= selectedOrderDcFrom.value && obj.DcNumber <= selectedOrderDcTo.value)
        const allTrue = filtervalues.filter((item) => item.Status == "true").map((item) => {
            return ({
                id: item._id,
                inv: item.DcNumber,
                date: item.DcDate,
                status: false,
                Location: item.Location,
                Store: item.Store,
                ProductData: item.DcData,
                CostAccount: Admin.COSTOFSALES,
                FinshedAccount: Admin.finishedGoods,
            })
        })

        const total = allTrue.map((tot) => ({
            id: tot.id,
            DcNum: tot.inv,
            Date: tot.date,
            Location: tot.Location,
            Store: tot.Store,
            status: false,
            CostAccount: Admin.COSTOFSALES,
            FinshedAccount: Admin.finishedGoods,
            ProductData: tot.ProductData,
            data: tot.ProductData.map((item) => ({
                products: item.product,
                inv: tot.inv,
                date: tot.date,
                amount: (TotalProduct.find((val) => val.ProductName == item.product && val.Location == tot.Location && val.Store == tot.Store).AvgRate * item.Delivered).toFixed(4)
            }))
        }));


        //console.log(total)

        for (const item of total) {
            try {
                const res = await updateDataFunction(`DcOrder/ChangeStatus/${item.id}`, item)
                //console.log(res)
                await dispatch(updateDateOrderDc(item))
            } catch (err) {
                //console.log(err)
                if(err.status == 400){
                    toast.error(`DC${item.DcNum} ${err.response.data}`  )

                }
            }

        }

        setSelectedOrderDcFrom(null)
        setSelectedOrderDcTo(null)
        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="pd-btn-save"
            >
                UnPost OrderDc
            </button>
            <ToastContainer />
            {isOpen && (
                <div className="fixed inset-0 pd-modal-overlay flex items-center justify-center p-4 z-50">
                    <div className="pd-bg-surface rounded-xl shadow-2xl w-full max-w-md">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="pd-page-title">Select OrderDc</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="pd-text-muted hover:pd-text-body"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form className="p-6 space-y-6">
                            <div>
                                <label className="pd-label">
                                    Select OrderDc from
                                </label>
                                <AppSelect
                                    options={OrderDcOptions}
                                    value={selectedOrderDcFrom}
                                    onChange={setSelectedOrderDcFrom}
                                    placeholder="Search OrderDc..."
                                    
                                    classNamePrefix="pd-select"
                                />
                            </div>
                            <div>
                                <label className="pd-label">
                                    Select OrderDc to
                                </label>
                                <AppSelect
                                    options={OrderDcOptions}
                                    value={selectedOrderDcTo}
                                    onChange={setSelectedOrderDcTo}
                                    placeholder="Search OrderDc..."
                                    
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
                                    onClick={handleSubmit}
                                    className="pd-btn-save"
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

export default OrderDCUnPostModal;