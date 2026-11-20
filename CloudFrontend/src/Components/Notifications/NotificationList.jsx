import React, { useEffect, useState } from 'react';
import { getDataFundtion, createDataFunction } from '../../Api/CRUDFunctions';

const NotificationList = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchNotifications = () => {
        setLoading(true);
        let url = `Notification/?page=${page}&limit=20`;
        if (filter === 'unread') url += '&isRead=false';
        if (filter === 'read') url += '&isRead=true';

        getDataFundtion(url)
            .then(res => {
                setNotifications(res.data || []);
                setTotalPages(res.pages || 1);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchNotifications(); }, [page, filter]);

    const handleRead = async (id) => {
        await createDataFunction(`Notification/${id}/read`, {});
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    };

    const handleReadAll = async () => {
        await createDataFunction(`Notification/read-all/current`, {});
        fetchNotifications();
    };

    const moduleColors = {
        attendance: 'bg-blue-100 text-blue-700',
        leave: 'bg-green-100 text-green-700',
        payroll: 'bg-purple-100 text-purple-700',
        accounting: 'bg-yellow-100 text-yellow-700'
    };

    return (
        <div className="pd-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="pd-section-title">Notifications</h2>
                <div className="flex gap-3 items-center">
                    <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} className="pd-input w-32">
                        <option value="all">All</option>
                        <option value="unread">Unread</option>
                        <option value="read">Read</option>
                    </select>
                    <button onClick={handleReadAll} className="pd-btn-outline text-sm">Mark All Read</button>
                </div>
            </div>

            {loading ? <p className="text-gray-500">Loading...</p> : notifications.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No notifications</p>
            ) : (
                <div className="space-y-2">
                    {notifications.map(n => (
                        <div key={n._id} onClick={() => handleRead(n._id)}
                            className={`p-4 rounded-lg border cursor-pointer transition hover:shadow-sm ${!n.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${moduleColors[n.module] || 'bg-gray-100 text-gray-600'}`}>
                                            {n.module}
                                        </span>
                                        {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                    </div>
                                    <p className="text-sm font-medium">{n.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="pd-btn-outline text-sm">Prev</button>
                    <span className="text-sm text-gray-500 py-1">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="pd-btn-outline text-sm">Next</button>
                </div>
            )}
        </div>
    );
};

export default NotificationList;
