import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { toast, ToastContainer } from 'react-toastify'
import AppSelect from '../../Global/AppSelect.jsx'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { updateDataFunction, SndupdateDataFunction, SndcreateDataFunction } from '../../../Api/CRUDFunctions'

const ProductEdit = () => {
    const { id } = useParams();
    const pageName = "ProductEdit"
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(true);
    const [pRSku, setPRSku] = useState(null)
    const [defultSku, setDefultSku] = useState(undefined)
    const [prBrand, setPrBrand] = useState(null)
    const [cat, setCat] = useState(null)
    const [productData, setProductData] = useState([])
    const Product = useSelector((state) => state.Product.product)
    const Vendor = useSelector((state) => state.Vendor.state)
    const MasterSku = useSelector((state) => state.MasterSku.MasterSku)
    const Brand = useSelector((state) => state.Brand.brand)
    const Category = useSelector((state) => state.Category.category)
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)


    const MasterSkudrp = MasterSku.map((item) => {
        return { value: item._id, label: `${item.MasterSkuName} (${item.mastercode})` }
    })

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        reset,
    } = useForm();

    const isForSND = watch("isForSND");

    const getData = () => {
        if (!Product || !MasterSku.length) {
            navigate("/ProductList")
            return
        }
        const findProduct = Product.find((item) => item._id == id)
        if (!findProduct) {
            navigate("/ProductList")
            return
        }

        setProductData(findProduct)
        const selectedMasterSku = MasterSku.find((val) => val._id == findProduct.MasterSKu);

        if (selectedMasterSku) {
            setDefultSku({
                value: selectedMasterSku._id,
                label: `${selectedMasterSku.MasterSkuName} (${selectedMasterSku.mastercode})`
            });

            const category1 = Category.find((item) => item.mastercode == selectedMasterSku.mastercode.slice(0, 4))?.CategoryName;
            setCat(category1 || "");
        }
        //console.log(findProduct)
        reset({
            ProductName: findProduct.ProductName,
            OpeningRate: findProduct.OpeningRate,
            TPPurchase: findProduct.TPPurchase,
            PurchaseDiscountPer: findProduct.PurchaseDiscountPer ?? "",
            TPSale: findProduct.TPSale,
            SaleTaxBy: findProduct.SaleTaxBy,
            SalesTax: findProduct.SaleTaxAmount || findProduct.SaleTaxPercent,
            BoxinCarton: findProduct.BoxinCarton,
            PcsinBox: findProduct.PcsinBox,
            RetailPrice: findProduct.RetailPrice,
            salesFlowRef: findProduct.salesFlowRef,
            isForSND : findProduct.isForSND,
            ProductMainActive: findProduct.ProductMainActive !== false,
            GRAM: findProduct.GRAM ?? "",
            HSCODE: findProduct.HSCODE ?? "",
            SaleType: findProduct.SaleType ?? "",
        });
    }

    const onSubmit = async (data) => {

        if (data.SaleTaxBy == 2) {
            if (data.SalesTax > 99) {
                return toast.error("Tax Rate Must be less The hundred")
            }
        }
        try {
            data.SaleTaxBy == 1 ? data.SaleTaxAmount = data.SalesTax : data.SaleTaxPercent = data.SalesTax

            await updateDataFunction(`/product/updateProduct/${id}`, data)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/ProductList')
            }, 2000);
        } catch (err) {
            //console.log(err)
        }
    }

    const onSubmitSnd = async (data) => {
        if (data.SaleTaxBy == 2) {
            if (data.SalesTax > 99) {
                return toast.error("Tax Rate Must be less The hundred")
            }
        }
        try {
            data.SaleTaxBy == 1 ? data.SaleTaxAmount = data.SalesTax : data.SaleTaxPercent = data.SalesTax
console.log(productData)
            await SndcreateDataFunction(`/product`, productData)
            toast.success("Data Send to SND")
            setTimeout(() => {
                navigate('/ProductList')
            }, 2000);
        } catch (err) {
            console.log(err)
            toast.error("SND Error")
        }
    }
    const checkAcess = async () => {
        //console.log(UserRihts)
        const allowAcess = await UserRihts.find((item) => item == pageName)
        //console.log(allowAcess)
        if (!allowAcess) {
            navigate("/")
        }
    }

    useEffect(() => {
        getData()
    //    //checkAcess()
    }, [id, Product, MasterSku, Vendor, Brand, Category])

    //console.log(defultSku)
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Edit Product</h1>
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
                            <AppSelect
                                value={defultSku}
                                onChange={(val) => setPRSku(val.value)}
                                options={MasterSkudrp}
                                isDisabled={true}
                            />
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
                                {...register("SalesTax")}
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
                        <label className="pd-label"> Category = {cat} </label>
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
                                Edit Product
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ProductEdit
