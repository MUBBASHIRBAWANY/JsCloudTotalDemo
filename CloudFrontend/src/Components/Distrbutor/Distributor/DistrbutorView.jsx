import React, { useEffect, useState } from 'react'
import { set, useForm } from 'react-hook-form';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { SndcreateDataFunction } from '../../../Api/CRUDFunctions';
//import { SndcreateDataFunction } from '../../../Api/CRUDFunctions';

const DistrbutorView = () => {

    const { id } = useParams();
    const navigate = useNavigate();

    const { register, reset } = useForm();
    const [data ,setData] = useState({})
    const PriceList = useSelector((state) => state.PricelistReducer.PricelistReducer)
    const City = useSelector((state) => state.City.City)
    const editOrderBooker = useSelector((state) => state.DistributorOrderBooker.DistributorOrderBooker)

    const EditDistributor = useSelector(
        (state) => state.DistributroReducers.DistributroReducers
    );

    const AddInSNDdata = async () => {
        try {
            const data = EditDistributor.find((item) => item._id === id);
            const res = await SndcreateDataFunction("/Distrbutor", data)
            toast.success("Data added to SND successfully!");
            setTimeout(() => {
                navigate('/DistrbutorList');
            }, 2000);

        } catch (error) {
            toast.error("Failed to add data to SND.");
            console.error("Error adding data to SND:", error);
        }


    }

    useEffect(() => {

        const viewData = EditDistributor.find((item) => item._id === id);
        if (viewData) {
            reset(viewData);
            setData(viewData)
        }
        const orderBooker = editOrderBooker.find((item) => item._id == viewData.OrderBooker)
        const ci = City.find((item) => item._id == viewData.City)
        const Price = PriceList.find((item) => item._id == viewData.PriceList)
    }, [id, EditDistributor, reset]);

    const Field = ({ label, name, type = 'text', id }) => (
        <div>
            <label className="block pd-text-muted text-sm font-semibold mb-1">{label}</label>

            <input
                type={type}
                {...register(name)}
                disabled
                className="w-full px-3 py-2 border rounded pd-bg-muted pd-text-body"
            />
        </div>
    );

    return (
        <div className="m-5">
            <h1 className="pd-page-title text-center mb-6">
                View Distrbutor
            </h1>
            <ToastContainer />

            <div className="pd-card p-6 space-y-8">

                {/* BASIC INFORMATION */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <Field label="Distrbutor System Code" name="DistrbutorSystemCode" />
                        <Field label="Distrbutor Name" name="DistrbutorName" />
                        <div>
                            <label className="block pd-text-muted text-sm font-semibold mb-1">Price List</label>
                            <input
                                value={PriceList.find((item) => item._id == data.PriceList)?.PriceListName}
                                disabled
                                className="w-full px-3 py-2 border rounded pd-bg-muted pd-text-body"
                            />
                        </div>
                        <div>
                            <label className="block pd-text-muted text-sm font-semibold mb-1">Order Booker</label>
                            <input
                                value={editOrderBooker.find((item) => item._id == data.OrderBooker)?.OrderBookerName}
                                disabled
                                className="w-full px-3 py-2 border rounded pd-bg-muted pd-text-body"
                            />
                        </div>
                        <div>
                            <label className="block pd-text-muted text-sm font-semibold mb-1">City</label>
                            <input
                                value={City.find((item) => item._id == data.City)?.CityName}
                                disabled
                                className="w-full px-3 py-2 border rounded pd-bg-muted pd-text-body"
                            />
                        </div>
                        <Field label="Distrbutor Name" name="DistrbutorName" />
                        <Field label="Owner Name" name="OwnerName" />
                        <Field label="Owner CNIC" name="OwnerCnic" />
                        <Field label="Contact Person 1" name="ContactPerson1" />
                        <Field label="Contact Person 2" name="ContactPerson2" />
                        <Field label="Contact Person 3" name="ContactPerson3" />
                        <Field label="Designation" name="Designation" />
                        <Field label="Address 1" name="Address1" />
                        <Field label="Address 2" name="Address2" />
                        <Field label="Address 3" name="Address3" />
                        <Field label="CNIC No" name="CNICNo" />
                        <Field label="Country" name="Country" />
                        <Field label="Province" name="Province" />
                        <Field label="Mobile Phone" name="MobilePhoneNo" />
                        <Field label="Mobile No 1" name="MobileNo" />
                        <Field label="Mobile No 2" name="MobileNo2" />
                        <Field label="Country Code" name="CountryCode" />
                        <Field label="Postal Code" name="PostalCode" />
                        <Field label="Fax" name="Fax" />
                        <Field label="Primary Email" name="PrimaryEmail" />
                        <Field label="Secondary Email" name="SecondaryEmail" />
                        <Field label="Website" name="WebSite" />
                        <Field label="Login ID" name="LoginID" />
                        <Field label="Shop Register Date" name="ShopRegisterDate" type="date" />
                    </div>
                </section>

                {/* FINANCIAL INFORMATION */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Financial / Tax Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <Field label="NTN" name="NTN" />
                        <Field label="STN" name="STN" />
                        <Field label="NTN Status" name="NTNStatus" />
                        <Field label="STN Status" name="STNStatus" />
                        <Field label="Company Type" name="CompanyType" />
                        <Field label="Credit Days" name="CreditDays" />
                    </div>
                </section>

                {/* BANKING INFORMATION */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Banking Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Field label="Bank Name" name="BankName" />
                        <Field label="Branch Name" name="BranchName" />
                        <Field label="Branch Code" name="BranchCode" />
                        <Field label="Account Number" name="BusinessAccountNumber" />
                        <Field label="Branch Address" name="BranchAddress" />
                        <Field label="Branch City" name="BranchCity" />
                        <Field label="IBAN" name="IBAN" />
                    </div>
                </section>

                <div className="flex justify-end">
                    <button
                        onClick={() => AddInSNDdata()}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Update IN SND
                    </button>
                    <button
                        onClick={() => navigate('/DistrbutorList')}
                        className="ml-5 px-6 py-2 bg-gray-600 text-white rounded hover:pd-bg-readonly"
                    >
                        Back to List
                    </button>

                </div>
            </div>
        </div>
    );
};

export default DistrbutorView;
