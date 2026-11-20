import React, { useEffect, useState } from "react";
import { getHistoryByLoan } from "../../../Api/ApprovalHistoryApi";

const statusColors = {
    created: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800"
};

const ApprovalHistoryTimeline = ({ loanId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [loanId]);

    const fetchHistory = async () => {
        try {
            const response = await getHistoryByLoan(loanId);
            if (response.status) {
                setHistory(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-4">Loading history...</div>;
    }

    if (history.length === 0) {
        return <div className="text-center py-4 text-gray-500">No history available</div>;
    }

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {history.map((event, eventIdx) => (
                    <li key={event._id}>
                        <div className="relative pb-8">
                            {eventIdx !== history.length - 1 ? (
                                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${statusColors[event.action] || "bg-gray-100"}`}>
                                        {event.action === "created" && (
                                            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        {event.action === "approved" && (
                                            <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        {event.action === "rejected" && (
                                            <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        {event.action === "cancelled" && (
                                            <svg className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {event.stepName} - {event.userId?.firstName} {event.userId?.lastName}
                                        </p>
                                        <p className="mt-0.5 text-sm text-gray-500">
                                            {event.action.charAt(0).toUpperCase() + event.action.slice(1)}
                                            {event.previousAmount !== null && event.updatedAmount !== null && (
                                                <span className="ml-2">
                                                    Amount: {event.previousAmount?.toLocaleString()} → {event.updatedAmount?.toLocaleString()}
                                                </span>
                                            )}
                                        </p>
                                        {event.remarks && (
                                            <p className="mt-1 text-sm text-gray-500 italic">{event.remarks}</p>
                                        )}
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                        {new Date(event.actionDate).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ApprovalHistoryTimeline;
