import React, { useState } from "react";
import { toast } from "react-toastify";
import { createDataFunction } from "../../Api/CRUDFunctions";

const SyncIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 8a7 7 0 0 1 13.2-3.2M15 8a7 7 0 0 1-13.2 3.2"/>
    <path d="M14.5 1.5V4.8H11.2M1.5 14.5V11.2H4.8"/>
  </svg>
);

/**
 * PushToSND Button Component
 * 
 * Props:
 * - type: "price-list" | "slab" — which data type to push
 * - id: (optional) push a single record by ID; omit to push all
 * - label: custom button text (optional)
 * - variant: "solid" | "outline" (default: "outline")
 * - onSuccess: callback after successful push
 */
const PushToSND = ({ type, id, label, variant = "outline", onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handlePush = async () => {
    setLoading(true);
    try {
      let endpoint;
      if (id) {
        endpoint = `/Sync/${type}/${id}`;
      } else {
        endpoint = `/Sync/${type}/all`;
      }

      const res = await createDataFunction(endpoint, {});
      const data = res?.data || res;

      if (data.success) {
        toast.success(data.message || `${type} pushed to SND successfully`);
        if (onSuccess) onSuccess(data);
      } else {
        toast.error(data.message || "Failed to push to SND");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to push ${type} to SND`);
    } finally {
      setLoading(false);
    }
  };

  const defaultLabel = label || (id ? "Push to SND" : "Push All to SND");

  const variantClasses = {
    solid: "bg-blue-600 hover:bg-blue-700 text-white",
    outline: "border border-blue-500 text-blue-600 hover:bg-blue-50",
  };    return (
      <>
        <button
        type="button"
        onClick={handlePush}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant] || variantClasses.outline}`}
      >
        <span className={loading ? "animate-spin" : ""}>
          <SyncIcon />
        </span>
        {loading ? "Syncing..." : defaultLabel}
      </button>
    </>
  );
};

export { SyncIcon };
export default PushToSND;
