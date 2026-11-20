import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { createDataFunction } from '../../../Api/CRUDFunctions';
import { ConvetDate } from '../../Global/getDate';

const BulkDistributorAdd = () => {

  const [data, setData] = useState([]);
  const [hide, setHide] = useState(false);
  const navigate = useNavigate();

  const Channel = useSelector(state => state.Channel.channel);
  const City = useSelector(state => state.City.City);
  const Transport = useSelector(state => state.Transport.Transport);

  // ========================= SUBMIT =========================
  const onSubmit = async () => {

    const values = data.map((item, index) => ({
      DistrbutorName: item.DistrbutorName,
      OwnerName: item.OwnerName,
      OwnerCnic: item.OwnerCnic,
      Type: item.Type,
      OldCode: item.OldCode,
      ContactPerson1: item.ContactPerson1,
      ContactPerson2: item.ContactPerson2,
      ContactPerson3: item.ContactPerson3,
      Designation: item.Designation,
      Address1: item.Address1,
      Address2: item.Address2,
      Address3: item.Address3,

      CNICNo: item.CNICNo,
      Country: item.Country,
      Province: item.Province,

      City: City.find(c => c.CityName === item.City)?._id,
      Channel: Channel.find(c => c.ChanneName === item.DiscountType)?._id,

      MobilePhoneNo: item.MobilePhoneNo,
      MobileNo: item.MobileNo,
      MobileNo2: item.MobileNo2,

      CountryCode: item.CountryCode,
      PostalCode: item.PostalCode,
      Fax: item.Fax,

      PrimaryEmail: item.PrimaryEmail,
      SecondaryEmail: item.SecondaryEmail,
      WebSite: item.WebSite,

      ShopRegisterDate: ConvetDate(item.ShopRegisterDate),

      NTN: item.NTN,
      NTNStatus: item.NTNStatus,
      STN: item.STN,
      STNStatus: item.STNStatus,

      CompanyType: item.CompanyType,
      CreditDays: item.CreditDays,
      CreditLimit: item.CreditLimit,

      TransportType: item.TransportType,
      Transporter: Transport.find(t => t.TransporterName === item.Transporter)?._id,

      BankName: item.BankName,
      BranchName: item.BranchName,
      BranchCode: item.BranchCode,
      BusinessAccountNumber: item.BusinessAccountNumber,
      BranchAddress: item.BranchAddress,
      BranchCity: item.BranchCity,
      IBAN: item.IBAN,

      Status: item.Status === "Active" ? "Active" : "Inactive",

      DistrbutorSystemCode: `${index + 518} `
    }));

    // ================= CHUNK POST =================
    const postInChunks = async (data, chunkSize = 15) => {
      const chunks = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }

      try {
        for (const chunk of chunks) {
          //console.log(chunk)
          await createDataFunction("/Distrbutor/AddInBulk", chunk);
        }
        toast.success("All Distributors Added Successfully");
        setTimeout(() => navigate('/DistributorList'), 2000);
      } catch (err) {
        toast.error("Some chunks failed");
      }
    };

    postInChunks(values);
  };

  // ================= FILE UPLOAD =================
  const handleFileUpload = (e) => {
    setHide(true);
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      setData(jsonData);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <ToastContainer />
      <h2>Bulk Distributor Upload</h2>

      <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />

      {hide && (
        <button
          onClick={onSubmit}
          className="pd-btn-save px-5 py-2 rounded m-5"
        >
          Upload
        </button>
      )}
    </div>
  );
};

export default BulkDistributorAdd;
