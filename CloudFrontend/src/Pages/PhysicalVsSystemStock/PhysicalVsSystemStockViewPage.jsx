import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { getDataFundtion } from "../../Api/CRUDFunctions";
import PhysicalVsSystemStockForm from "../../Components/PhysicalVsSystemStock/PhysicalVsSystemStockForm";

const PhysicalVsSystemStockViewPage = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getDataFundtion(`/PhysicalVsSystemStock/${id}`);
        setDoc(res?.data || null);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load document");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="pd-page p-6">Loading...</div>;
  if (!doc) {
    return (
      <div className="pd-page p-6">
        <ToastContainer />
        Document not found
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <PhysicalVsSystemStockForm mode="view" initial={doc} />
    </>
  );
};

export default PhysicalVsSystemStockViewPage;
