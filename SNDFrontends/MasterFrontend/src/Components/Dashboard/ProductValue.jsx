import React, { useEffect, useState } from 'react'
import { getDataFundtion } from '../../Api/CurdFunctions'
import { toast } from 'react-toastify'
import { fetchBankAndCashPosition, fetchCustomerRecVable, fetchproductValue } from '../../Redux/Reducers/FinacailPosition'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer'
import './ProductValue.css'

const ProductValue = () => {
    const [financialData, setFinancialData] = useState({
        Recivable: 0,
        GoodsValue: 0,
        MonthlySale: 0,
        ReciveableBalance: 0,
        CashAndBankPosition: 0
    })
    console.log(financialData)

    const TotalSale = useSelector((state) => state.FinacailPosition.TotalSales)
    const ProductValue2 = useSelector((state) => state.FinacailPosition.ProductValue)
    const CusttomerRecivable = useSelector((state) => state.FinacailPosition.CustomerRecVable)
    const BankAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer)
    const BankBalance = useSelector((state) => state.FinacailPosition.BankAndCashPosition)
    const RecivableBalance = useSelector((state) => state.FinacailPosition.ReciveablePosition)

    const dispatch = useDispatch()

    const formatDate = (date) => {
        let dd = String(date.getDate()).padStart(2, '0');
        let mm = String(date.getMonth() + 1).padStart(2, '0');
        let yyyy = date.getFullYear();
        return `${yyyy}-${mm}-${dd}`;
    };

    const getData = async () => {
        try {
            const CustomerData = await getDataFundtion("/saleinvoice/getOnlyRemain")
            const productValue3 = await getDataFundtion("/TotalProduct")
            console.log(productValue3.data, "productValue3")
            dispatch(fetchproductValue(productValue3.data))
            dispatch(fetchCustomerRecVable(CustomerData.data))
            const CustomerDataValue = CustomerData.data.reduce((sum, row) => sum + (parseFloat(row?.RemainingAmount) || 0), 0);
            const ProductDataValue = ProductValue2.reduce((sum, row) => sum + (parseFloat(row?.Amount) || 0), 0);
            const TotalDataSale = TotalSale.reduce((sum, row) => sum + (parseFloat(row?.TotalAmount) || 0), 0);

            setFinancialData({
                Recivable: CustomerDataValue,
                GoodsValue: ProductDataValue,
                MonthlySale: TotalDataSale,
            })
        } catch (err) {
            console.log(err)
            toast.error("Something went wrong")
        }
    }

    const Balance = async () => {
        const adminId = "68903ec2664155e11db10367"
        const ChartofAccounts = await getDataFundtion("/chartofAccounts")
        const res = await getDataFundtion(`/Administrative/get/${adminId}`)
        dispatch(fetchAdminReducer(res.data))
        const result = [];
        for (let i = res.data.BankAccountFrom; i <= res.data.BankAccountTo; i++) {
            result.push(i.toString().padStart(5, '0'));
        }
        for (let i = res.data.CashAccountFrom; i <= res.data.CashAccountTo; i++) {
            result.push(i.toString().padStart(5, '0'));
        }
        const filteredAccount = ChartofAccounts.data.filter((item) => item.AccountCode.length > 5)
        const Bank = filteredAccount.filter(item =>
            result.some(prefix => item.AccountCode.includes(prefix))
        );
        const bankId = Bank.map((item) => item._id)
        const today = new Date();
        const startDate = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        const endDate = formatDate(today);
        const bankBalance = await getDataFundtion(`GernalLager?startDate=${startDate}&endDate=${endDate}&Account=${bankId}`)
        const TotalDebit = bankBalance.reduce((sum, row) => sum + (parseFloat(row?.Debit) || 0), 0)
        const TotalCredit = bankBalance.reduce((sum, row) => sum + (parseFloat(row?.Credit) || 0), 0)
        dispatch(fetchBankAndCashPosition(bankBalance))
    }

    useEffect(() => {
        getData()
        Balance()
    }, [])

    useEffect(() => {
        if (ProductValue2.length || TotalSale.length || CusttomerRecivable.length || BankBalance.length || RecivableBalance.length ) {
            const CustomerDataValue = CusttomerRecivable.reduce((sum, row) => sum + (parseFloat(row?.RemainingAmount) || 0), 0);
            const ProductDataValue = ProductValue2.reduce((sum, row) => sum + (parseFloat(row?.Amount) || 0), 0);
            const TotalDataSale = TotalSale.reduce((sum, row) => sum + (parseFloat(row?.TotalAmount) || 0), 0);
            const totalDebit = BankBalance.reduce((sum, row) => sum + (parseFloat(row?.Debit) || 0), 0);
            const totalCredit = BankBalance.reduce((sum, row) => sum + (parseFloat(row?.Credit) || 0), 0);
            const totalReciveAbleCredit = RecivableBalance.reduce((sum, row) => sum + (parseFloat(row?.Credit) || 0), 0);
            const totalReciveAbleDebit =   RecivableBalance.reduce((sum, row) => sum + (parseFloat(row?.Debit) || 0), 0);
            setFinancialData({
                Recivable: CustomerDataValue,
                GoodsValue: ProductDataValue,
                MonthlySale: TotalDataSale,
                CashAndBankPosition: totalDebit - totalCredit,
                ReciveableBalance : totalReciveAbleDebit - totalReciveAbleCredit
            });
        }
    }, [ProductValue2, TotalSale, CusttomerRecivable, BankBalance, RecivableBalance]);

    // Define color schemes for each card
    const cardColors = [
        { background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)', text: '#d44a66' },
        { background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', text: '#2a5da8' },
        { background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', text: '#1a7d4e' },
        { background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', text: '#c96c3a' }
    ]

    return (
        <div className="financial-position" style={{ padding: '20px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>


            <div className="financial-cards" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px'
            }}>
                {/* Receivable Card */}
                <div style={{
                    background: cardColors[0].background,
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                    transition: 'transform 0.3s ease',
                    color: cardColors[0].text,
                    position: 'relative',
                    overflow: 'hidden'
                }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        fontSize: '100px',
                        opacity: '0.1',
                        transform: 'rotate(15deg)'
                    }}>🏦</div>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600' }}>Receivable</h3>
                    <div style={{ fontSize: '28px', fontWeight: '700' }}>
                        {financialData.ReciveableBalance?.toLocaleString()}
                    </div>
                    <div style={{
                        marginTop: '10px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.8
                    }}>
                        <span style={{ marginRight: '5px' }}>↑</span>
                        <span>Outstanding payments</span>
                    </div>
                </div>
                <div style={{
                    background: cardColors[1].background,
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                    transition: 'transform 0.3s ease',
                    color: cardColors[1].text,
                    position: 'relative',
                    overflow: 'hidden'
                }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        fontSize: '100px',
                        opacity: '0.1',
                        transform: 'rotate(15deg)'
                    }}>📦</div>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600' }}>Finished Goods</h3>
                    <div style={{ fontSize: '28px', fontWeight: '700' }}>
                        {financialData.GoodsValue.toLocaleString()}
                    </div>
                    <div style={{
                        marginTop: '10px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.8
                    }}>
                        <span style={{ marginRight: '5px' }}>↗</span>
                        <span>Inventory value</span>
                    </div>

                </div>


                <div style={{
                    background: cardColors[3].background,
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                    transition: 'transform 0.3s ease',
                    color: cardColors[3].text,
                    position: 'relative',
                    overflow: 'hidden'
                }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        fontSize: '100px',
                        opacity: '0.1',
                        transform: 'rotate(15deg)'
                    }}>💰</div>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600' }}>Cash & Bank</h3>
                    <div style={{ fontSize: '28px', fontWeight: '700' }}>
                        {financialData?.CashAndBankPosition?.toLocaleString() || 0}
                    </div>
                    <div style={{
                        marginTop: '10px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.8
                    }}>
                        <span style={{ marginRight: '5px' }}>💰</span>
                        <span>Available funds</span>
                    </div>
                </div>


            </div>

            {/* Summary section */}

        </div>
    )
}

export default ProductValue