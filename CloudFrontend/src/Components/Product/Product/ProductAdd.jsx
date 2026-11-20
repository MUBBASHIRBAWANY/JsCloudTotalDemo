import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForProduct } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion, SndcreateDataFunction } from '../../../Api/CRUDFunctions';


const ProductAdd = () => {
    const pageName = "ProductAdd"
    const MasterSku = useSelector((state) => state.MasterSku.MasterSku)
    const Vendor = useSelector((state) => state.Vendor.state)
    const Brand = useSelector((state) => state.Brand.brand)
    const Category = useSelector((state) => state.Category.category)
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const [pRSku, setPRSku] = useState(null)
    const [prVendor, setPrVendor] = useState(null)
    const [prBrand, setPrBrand] = useState(null)
    const [Cat, setCat] = useState("")

    const MasterSkudrp = MasterSku.map((item) => {
        return { value: item._id, label: `${item.MasterSkuName}  (${item.mastercode})` }
    })

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },

    } = useForm({
        defaultValues: { ProductMainActive: true },
    });

    const isForSND = watch("isForSND");

    const changing = (id, name) => {
        setPRSku(id)
        const lastword = name.slice(-9, -5)
        const findcat = Category.find((item) => item.mastercode == lastword)?.CategoryName
        setCat(findcat)
    }
    const navigate = useNavigate()

    const onSubmit = async (data) => {
        if (data.SaleTaxBy == 2) {
            if (data.SalesTax > 99) {
                return toast.error("Tax Rate Must be less The hundred")
            }
        }
        try {
            data.MasterSKu = pRSku
            const productByMsku = await getDataFundtion(`product/getProductByMsku/${pRSku}`)
            productByMsku.data.length === 0 ? data.code = generateNextCodeForProduct(productByMsku.data.length) : data.code = generateNextCodeForProduct(productByMsku.data.slice(-1)[0].code)
            data.mastercode = MasterSku.find((item) => item._id == pRSku).mastercode + data.code
            data.CodeRef = (MasterSku.find((item) => item._id == pRSku).CodeRef).slice(0 , 3) + data.salesFlowRef
            await createDataFunction("/product", data)
            toast.success("Data Add")
            setTimeout(() => {
                navigate('/ProductList')
            }, 2000);

        } catch (err) {
            toast.error("Something went wrong")
        }

    }

    const onSubmitSnd = async (data) => {
        if (data.SaleTaxBy == 2) {
            if (data.SalesTax > 99) {
                return toast.error("Tax Rate Must be less The hundred")
            }
        }
        try {
            data.MasterSKu = pRSku
            const productByMsku = await getDataFundtion(`product/getProductByMsku/${pRSku}`)
            productByMsku.data.length === 0 ? data.code = generateNextCodeForProduct(productByMsku.data.length) : data.code = generateNextCodeForProduct(productByMsku.data.slice(-1)[0].code)
            data.mastercode = MasterSku.find((item) => item._id == pRSku).mastercode + data.code
            data.CodeRef = (MasterSku.find((item) => item._id == pRSku).CodeRef).slice(0 , 3) + data.salesFlowRef
            await SndcreateDataFunction("/product", data)
            toast.success("Data Send to SND")
            setTimeout(() => {
                navigate('/ProductList')
            }, 2000);

        } catch (err) {
            toast.error("Something went wrong")
        }

    }

    const checkAcess = async () => {
        const allowAcess = await UserRihts.find((item) => item == pageName)
        if (!allowAcess) {
            navigate("/")
        }
    }
    useEffect(() => {
        //checkAcess()
    }, [])

    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Add Product</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6">
                        <div>
                            <label className="pd-label"> Product Name </label>
                            <input
                                type="text"
                                {...register("ProductName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label">Master Sku </label>
                            <AppSelect onChange={(val) => changing(val.value, val.label)} options={MasterSkudrp} />
                        </div>
                        <div>
                            <label className="pd-label"> Sales Flow Ref </label>
                            <input
                                type="text"
                                {...register("salesFlowRef")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> Opening Rate </label>
                            <input
                                type="text"
                                {...register("OpeningRate")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> (TP) Purcahsae</label>
                            <input
                                type="text"
                                {...register("TPPurchase")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> Purchase Discount Per</label>
                            <input
                                type="text"
                                {...register("PurchaseDiscountPer")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> (TP) Sale </label>
                            <input
                                type="text"
                                {...register("TPSale")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> Retail Price </label>
                            <input
                                type="text"
                                {...register("RetailPrice")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> Sales Tax By </label>
                            <select
                                className="pd-input"
                                {...register("SaleTaxBy")}>
                                <option value="1">By Trade Price</option>
                                <option value="2">By Retail Price </option>
                            </select>
                        </div>
                        <div>
                            <label className="pd-label"> Sales Tax </label>
                            <input
                                type="text"
                                {...register("SaleTaxPercent")}
                                maxLength={2}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> Boxes in Carton </label>
                            <input
                                type="text"
                                {...register("BoxinCarton")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> Pisces in Box </label>
                            <input
                                type="text"
                                {...register("PcsinBox")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> GRAM </label>
                            <input
                                type="text"
                                {...register("GRAM")}
                                className="pd-input"
                                placeholder="66"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> HS Code </label>
                            <input
                                type="text"
                                {...register("HSCODE")}
                                className="pd-input"
                                placeholder="1905.3100"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> Sale Type </label>
                            <input
                                type="text"
                                {...register("SaleType")}
                                className="pd-input"
                                placeholder="3rd Schedule Goods"
                                required
                            />
                        </div>
                        <label className="pd-label"> Category = {Cat} </label>

                        <div>
                            <label className="pd-label"> isForSND </label>
                            <input
                                type="checkbox"
                                {...register("isForSND")}
                                className="pd-input"
                            />
                        </div>
                        <div>
                            <label className="pd-label">Product Main Active</label>
                            <input
                                type="checkbox"
                                {...register("ProductMainActive")}
                                className="pd-input"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end gap-2">
                            {isForSND && (
                                <button
                                    type="button"
                                    className="pd-btn-save"
                                    onClick={handleSubmit(onSubmitSnd)}
                                >
                                    Send to SND
                                </button>
                            )}
                            <button
                                type="button"
                                className="pd-btn-save"
                                onClick={handleSubmit(onSubmit)}
                            >
                                Add Master Sku
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ProductAdd
