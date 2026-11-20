import React, { useEffect, useState } from 'react';
import { getDataFundtion, createDataFunction } from '../../Api/CRUDFunctions';

const NotificationBell = ({ userId }) => {
    const [count, setCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);

    const fetchCount = () => {
        if (!userId) return;
        getDataFundtion(`Notification/unread/${userId}`)
            .then(res => setCount(res.data?.count || 0))
            .catch(() => {});
    };

    const fetchRecent = () => {
        if (!userId) return;
        getDataFundtion(`Notification/?userId=${userId}&limit=10`)
            .then(res => setNotifications(res.data || []))
            .catch(() => {});
    };

    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [userId]);

    useEffect(() => {
        if (open) fetchRecent();
    }, [open]);

    const handleRead = async (id) => {
        await createDataFunction(`Notification/${id}/read`, {});
        setCount(c => Math.max(0, c - 1));
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    };

    const handleReadAll = async () => {
        await createDataFunction(`Notification/read-all/${userId}`, {});
        setCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-600 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center p-3 border-b">
                        <span className="font-semibold text-sm">Notifications</span>
                        {count > 0 && (
                            <button onClick={handleReadAll} className="text-xs text-blue-600 hover:underline">Mark all read</button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <p className="p-4 text-center text-gray-500 text-sm">No notifications</p>
                    ) : (
                        notifications.map(n => (
                            <div key={n._id} onClick={() => handleRead(n._id)}
                                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50' : ''}`}>
                                <p className="text-sm font-medium">{n.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
