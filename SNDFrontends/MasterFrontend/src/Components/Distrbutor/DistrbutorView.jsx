import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

const DistrbutorView = () => {

    const { id } = useParams();
    const navigate = useNavigate();

    const { register, reset } = useForm();

    const EditDistributor = useSelector(
        (state) => state.DistributroReducers.DistributroReducers
    );


    useEffect(() => {
        const viewData = EditDistributor.find((item) => item._id === id);
        if (viewData) {
            reset(viewData);
        }
    }, [id, EditDistributor, reset]);

    const Field = ({ label, name, type = 'text' }) => (
        <div>
            <label className="block text-gray-600 text-sm font-semibold mb-1">{label}</label>
            <input
                type={type}
                {...register(name)}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700"
            />
        </div>
    );

    return (
        <div className="m-5">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
                View Distrbutor
            </h1>
            <ToastContainer />

            <div className="bg-white p-6 rounded-lg shadow-md space-y-8">

                {/* BASIC INFORMATION */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <Field label="Distrbutor System Code" name="DistrbutorSystemCode" />
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

                
                    <button
                        onClick={() => navigate('/DistrbutorList')}
                        className="ml-5 px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                                                 Back to List
                    </button>
                    
                </div>
            </div>
    );
};

export default DistrbutorView;
