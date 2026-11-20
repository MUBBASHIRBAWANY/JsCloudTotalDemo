import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux"
import Select from 'react-select'
import { getDataFundtion, createDataFunction, updateDataFunction } from "../../Api/CRUDFunctions";
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser';
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer';
import AppSelect from '../../Components/Global/AppSelect';

const Administrative = () => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },

    } = useForm();
    const id = "687e14a624a274d5e844be49"
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [hidden, setHidden] = useState(false)
    const [data, setData] = useState([])
    const [Fininshed, setFininshed] = useState('')
    const [customer, setCustomer] = useState('')
    const [vendors, setVendors] = useState('')
    const [gst, setGst] = useState('')
    const [purchaseDiscount, setPurchaseDiscount] = useState('')
    const [retailTradeOffer, setRetailTradeOffer] = useState('')
    const [RetailPowerDrive, SetRetailPowerDrive] = useState('')
    const [AdvanceTax, setAdvanceTax] = useState('')
    const [salesRevenue, SetsalesRevenue] = useState('')
    const [Transporter, SetTransporter] = useState('')
    const [WithholdingTax, setWithholdingTax] = useState('')
    const [pettyCashAccount, setPettyCashAccount] = useState('')
    const [diffrenceAccount, setDiffrenceAccount] = useState('')
    const [shortageAccount, setShortageAccount] = useState('')
    const [TTS, setTTS] = useState('')
    const [COSTOFSALES, setCOSTOFSALES] = useState('')
    const [DAMAGEEXPIRECLAIM, setDAMAGEEXPIRECLAIM] = useState('')
    const [DitributerDiscount, setDitributerDiscount] = useState('')
    const [SpecialDiscount, setSpecialDiscount] = useState('')
    const [HotZoneDrive, setHotZoneDrive] = useState('')
    const [WholeSaleDeal, setWholeSaleDeal] = useState('')
    const [wholeSaleTradeOffer, setWholeSaleTradeOffer] = useState('')
    const [TradeOffer, setTradeOffer] = useState('')
    const [SubDistributionPromotion, setSubDistributionPromotion] = useState('')
    const [RetailWholeSale , setRetailWholeSale] = useState('')
    const [UnclaimedAc , setUnclaimedAc] = useState('')
    const [UnRealizeAc , setUnRealizeAc] = useState('')
    const [SpecialTO , setSpecialTO] = useState('')
    const [AdvanceAc, setAdvanceAc] = useState('')
    const [LoanAc, setLoanAc] = useState('')
    const [ShortageandAccessStock, setShortageandAccessStock] = useState('')
    //console.log(SpecialTO)
    //console.log(purchaseDiscount, retailTradeOffer)
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const Channel = useSelector((state) => state.Channel.channel)
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const stage1Accounts = Accounts.filter((item) => item.AccountCode.length > 5)
        .map((Ac) => {
            return ({
                label: `${Ac.AccountName}  ${Ac.AccountCode}`,
                value: Ac._id
            })

        })

    const getData = async () => {
        const Accounts = await getDataFundtion("/ChartofAccounts")
        const list = Accounts.data
        const res = await getDataFundtion(`/Administrative/get/${id}`)
        //console.log(res.data)
        const adminData = res.data
        setData(adminData)
        setFininshed(adminData.finishedGoods)
        setCustomer(adminData.Client)
        setVendors(adminData.Vendor)
        SetRetailPowerDrive(adminData.RetailPowerDrive)
        setAdvanceTax(adminData.AdvanceTax)
        SetsalesRevenue(adminData.salesRevenue)
        setPurchaseDiscount(adminData.PurchaseDiscount)
        setRetailTradeOffer(adminData.RetailTradeOffer)
        setCOSTOFSALES(adminData.COSTOFSALES)
        setDAMAGEEXPIRECLAIM(adminData.DAMAGEEXPIRECLAIM)
        setDitributerDiscount(adminData.DitributerDiscount)
        setWithholdingTax(adminData.WithholdingTax)
        setPettyCashAccount(adminData.pettyCashAccount)
        setHotZoneDrive(adminData.HotZoneDrive)
        setShortageAccount(adminData.shortageAccount)
        setDiffrenceAccount(adminData.DifferenceExpense)
        setWholeSaleDeal(adminData.WholeSaleDeal)
        setSubDistributionPromotion(adminData.SubDistributionPromotion)
        setTradeOffer(adminData.TradeOffer)
        setRetailWholeSale(adminData.RetailWholeSale)
        setWholeSaleTradeOffer(adminData.WholeSaleTradeOffer)
        setSpecialDiscount(adminData.SpecialDiscount)
        setUnRealizeAc(adminData.UnRealizeAc)
        setUnclaimedAc(adminData.UnclaimedAc)
        setTTS(adminData.TTS)
        setGst(adminData.Gst)
        setSpecialTO(adminData.SpecialTO)
        setAdvanceAc(adminData.advance)
        setLoanAc(adminData.loan)
        setShortageandAccessStock(adminData.ShortageandAccessStock)
        SetTransporter(adminData.TransporterPayable)
        dispatch(fetchChartofAccounts(list))
        dispatch(fetchAdminReducer(adminData))
        reset({
            CashAccountFrom: adminData.CashAccountFrom,
            CashAccountTo: adminData.CashAccountTo,
            BankAccountFrom: adminData.BankAccountFrom,
            BankAccountTo: adminData.BankAccountTo,
            finishedGoods: adminData.finishedGoods,
            Client: adminData.Client,
            Vendor: adminData.Vendor,
            Gst: adminData.Gst,
            AdvanceTax: adminData.AdvanceTax,
            retailTradeOffer: adminData.retailTradeOffer,
        })
    }
    useEffect(() => {
        getData()
    }, [])
    //console.log(Channel)
    const [prChannel, setPrChannel] = useState("")
    const checkAcess = async () => {
        //console.log(UserRihts)
        const allowAcess = await UserRihts.find((item) => item == pageName)
        //console.log(allowAcess)
        if (!allowAcess) {
            navigate("/")
        }
    }

    const onSubmit = async (data) => {
        data.finishedGoods = Fininshed;
        data.Client = customer;
        data.Vendor = vendors
        data.Gst = gst
        data.RetailPowerDrive = RetailPowerDrive;
        data.PurchaseDiscount = purchaseDiscount
        data.RetailTradeOffer = retailTradeOffer
        data.salesRevenue = salesRevenue,
            data.AdvanceTax = AdvanceTax
        data.WithholdingTax = WithholdingTax
        data.COSTOFSALES = COSTOFSALES
        data.DAMAGEEXPIRECLAIM = DAMAGEEXPIRECLAIM
        data.DitributerDiscount = DitributerDiscount
        data.SpecialDiscount = SpecialDiscount
        data.WithholdingTax = WithholdingTax
        data.pettyCashAccount = pettyCashAccount
        data.WholeSaleTradeOffer = wholeSaleTradeOffer
        data.shortageAccount = shortageAccount
        data.TTS = TTS
        data.HotZoneDrive = HotZoneDrive
        data.setWholeSaleDeal = WholeSaleDeal
        data.SubDistributionPromotion = SubDistributionPromotion
        data.DifferenceExpense = diffrenceAccount
        data.RetailWholeSale = RetailWholeSale
        data.WholeSaleDeal = WholeSaleDeal
        data.TradeOffer = TradeOffer
        data.UnRealizeAc = UnRealizeAc;
        data.UnclaimedAc = UnclaimedAc;
        data.SpecialTO = SpecialTO;
        data.advance = AdvanceAc;
        data.loan = LoanAc;
        data.loan = LoanAc;
        data.ShortageandAccessStock = ShortageandAccessStock,
        data.TransporterPayable = Transporter;
        console.log(data)
        try {
            const res = updateDataFunction(`/Administrative/update/${id}`, data)
            toast.success("Data Update Successfully")
        } catch (err) {
            //console.log(err)
        }

    }

    const Channeldrp = Channel.map((item) => {
        return { value: item._id, label: `${item.ChanneName} (${item.code})` }
    })
    return (
        <div>
            <div>
                <h1 className="text-3xl font-bold text-center mb-6">Administrative </h1>
                <ToastContainer />
                <div>
                    <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-6 rounded-lg shadow-md mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="block font-semibold mb-2">Cash Account Series </label>
                            <input
                                type="text"
                                {...register("CashAccountFrom")}
                                className="w-full px-4 py-2 border rounded-lg"
                                required
                            />
                        </div>
                        {hidden ?
                            <div>
                                <label className="block font-semibold mb-2">Cash Account To</label>
                                <input
                                    type="text"
                                    {...register("CashAccountTo")}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            : null
                        }
                        <div>
                            <label className="block font-semibold mb-2">Bank Account Series </label>
                            <input
                                type="text"
                                {...register("BankAccountFrom")}
                                className="w-full px-4 py-2 border rounded-lg"
                                required
                            />
                        </div>
                        {hidden ?
                            <div>
                                <label className="block font-semibold mb-2">Bank Account To</label>
                                <input
                                    type="text"
                                    {...register("BankAccountTo")}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            : null
                        }
                        <div>
                            <label className="block font-semibold mb-2">Finished Goods</label>
                            <AppSelect
                                options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === Fininshed)}
                                onChange={(e) => setFininshed(e.value)}
                                
                            />

                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Customers </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === customer)}
                                onChange={(e) => setCustomer(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Vendors </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === vendors)}
                                onChange={(e) => setVendors(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Gst </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === gst)}
                                onChange={(e) => setGst(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Advance Tax </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === AdvanceTax)}
                                onChange={(e) => setAdvanceTax(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Sales Revenue </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === salesRevenue)}
                                onChange={(e) => SetsalesRevenue(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Purchase Discount </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === purchaseDiscount)}
                                onChange={(e) => setPurchaseDiscount(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Retail Trade Offers </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === retailTradeOffer)}
                                onChange={(e) => setRetailTradeOffer(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">WholeSale Trade Offers </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === wholeSaleTradeOffer)}
                                onChange={(e) => setWholeSaleTradeOffer(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">TTS </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === TTS)}
                                onChange={(e) => setTTS(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Retail Power Drive </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === RetailPowerDrive)}
                                onChange={(e) => SetRetailPowerDrive(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Sub Distribution Promotion </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === SubDistributionPromotion)}
                                onChange={(e) => setSubDistributionPromotion(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Trade Offer </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === TradeOffer)}
                                onChange={(e) => setTradeOffer(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Special Trade Offer </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === SpecialTO)}
                                onChange={(e) => setSpecialTO(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Distributor Discount </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === DitributerDiscount)}
                                onChange={(e) => setDitributerDiscount(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Retail Whole Sale </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === RetailWholeSale)}
                                onChange={(e) => setRetailWholeSale(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Special Discount </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === SpecialDiscount)}
                                onChange={(e) => setSpecialDiscount(e.value)} />
                        </div>
                          <div>
                            <label className="block font-semibold mb-2">Whole Sale Deal </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === WholeSaleDeal)}
                                onChange={(e) => setWholeSaleDeal(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Hot Zone Drive </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === HotZoneDrive)}
                                onChange={(e) => setHotZoneDrive(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Withholding Tax </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === WithholdingTax)}
                                onChange={(e) => setWithholdingTax(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Transporter </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === Transporter)}
                                onChange={(e) => SetTransporter(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Cost of Goods Sold </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === COSTOFSALES)}
                                onChange={(e) => setCOSTOFSALES(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">DAMAGE EXPIRE CLAIM </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === DAMAGEEXPIRECLAIM)}
                                onChange={(e) => setDAMAGEEXPIRECLAIM(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Petty Cash Account </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === pettyCashAccount)}
                                onChange={(e) => setPettyCashAccount(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Difference Account </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === diffrenceAccount)}
                                onChange={(e) => setDiffrenceAccount(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Shortage Account </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === shortageAccount)}
                                onChange={(e) => setShortageAccount(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Unclaimed Account </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === UnclaimedAc)}
                                onChange={(e) => setUnclaimedAc(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Unrealized Account </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === UnRealizeAc)}
                                onChange={(e) => setUnRealizeAc(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Advance Account </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === AdvanceAc)}
                                onChange={(e) => setAdvanceAc(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Shortage and Access Stock </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === ShortageandAccessStock)}
                                onChange={(e) => setShortageandAccessStock(e.value)} />
                        </div>
                        <div>
                            <label className="block font-semibold mb-2">Loan Account </label>
                            <AppSelect options={stage1Accounts}
                                value={stage1Accounts.find(item => item.value === LoanAc)}
                                onChange={(e) => setLoanAc(e.value)} />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-5 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Update
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Administrative