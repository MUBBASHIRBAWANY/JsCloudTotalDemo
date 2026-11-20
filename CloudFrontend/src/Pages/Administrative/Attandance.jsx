import React, { useEffect, useState } from 'react';
import { getDataFundtion, updateDataFunction } from '../../Api/CRUDFunctions';
import { MapPin, Loader2, CheckCircle, XCircle, RefreshCw, Navigation } from 'lucide-react';

const Attendance = () => {
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [data, setData] = useState([]);
    console.log(data)
    const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
    const [results, setResults] = useState([]);

    const AttendanceLocation = async () => {
        if (processing) return;
        
        setProcessing(true);
        setProgress({ current: 0, total: data.length, status: 'Starting location processing...' });
        setResults([]);
        
        const API_KEY = 'feda607873fc40dda7f95570efd7a492';
        const updatedResults = [];
        
        try {
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                setProgress({ 
                    current: i + 1, 
                    total: data.length, 
                    status: `Processing ${i + 1} of ${data.length}: Getting location for ${item.UserId || 'Employee'}...` 
                });
                
                try {
                    const placesResponse = await fetch(
                        `https://api.geoapify.com/v1/geocode/reverse?lat=${item.latitude}&lon=${item.longitude}&format=json&apiKey=${API_KEY}`
                    );
                    const addressResult = await placesResponse.json();
                    console.log(addressResult)
                    if (addressResult.results && addressResult.results[0]) {
                        const formattedAddress = addressResult.results[0].formatted;
                        
                        const alldata = {
                            location: formattedAddress,
                            extracted: "Ok",
                            processedAt: new Date().toISOString()
                        };
                        
                        await updateDataFunction(`/Attandance/udpdata/${item._id}`, alldata);
                        
                        updatedResults.push({
                            id: item._id,
                            name: item.employeeName || 'Unknown',
                            status: 'success',
                            location: formattedAddress
                        });
                        
                        setProgress(prev => ({ 
                            ...prev, 
                            status: `✅ Completed: ${formattedAddress.substring(0, 50)}...` 
                        }));
                    } else {
                        throw new Error('No address found');
                    }
                } catch (err) {
                    console.error(`Error processing ${item._id}:`, err);
                    updatedResults.push({
                        id: item._id,
                        name: item.employeeName || 'Unknown',
                        status: 'error',
                        error: err.message
                    });
                    setProgress(prev => ({ 
                        ...prev, 
                        status: `❌ Failed: ${item.employeeName || 'Employee'} - ${err.message}` 
                    }));
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            setResults(updatedResults);
            setProgress({ current: data.length, total: data.length, status: '✅ All locations processed successfully!' });
            
            // Refresh data after processing
            setTimeout(() => {
                getAttendance();
            }, 2000);
            
        } catch (err) {
            console.error('Bulk processing error:', err);
            setProgress(prev => ({ ...prev, status: '❌ Error processing locations' }));
        } finally {
            setProcessing(false);
        }
    };

    const getAttendance = async () => {
        setLoading(true);
        try {
            const res = await getDataFundtion("Attandance/getWithoExrtactAttandance");
            setData(res.data);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    const clearData = () => {
        setData([]);
        setResults([]);
        setProgress({ current: 0, total: 0, status: '' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin pd-text-primary mx-auto mb-4" />
                    <p className="pd-text-muted font-medium">Loading attendance data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="pd-bg-surface rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="pd-bg-muted p-3 rounded-xl">
                                <MapPin className="w-8 h-8 pd-text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold pd-text-body">Attendance Location Extractor</h1>
                                <p className="pd-text-muted text-sm mt-1">Extract and update location addresses from attendance records</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            {data.length === 0 ? (
                                <button
                                    onClick={getAttendance}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:pd-btn-save font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Load Attendance Data
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={clearData}
                                        className="flex items-center gap-2 px-6 py-3 pd-bg-muted0 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        Clear Data
                                    </button>
                                    <button
                                        onClick={AttendanceLocation}
                                        disabled={processing}
                                        className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Navigation className="w-5 h-5" />
                                        )}
                                        {processing ? 'Processing...' : 'Extract Locations'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Section */}
                {(processing || progress.total > 0) && (
                    <div className="pd-bg-surface rounded-2xl shadow-xl p-6 mb-6">
                        <h2 className="pd-section-title mb-4">Processing Progress</h2>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-sm pd-text-muted mb-2">
                                <span>Progress</span>
                                <span>{progress.current} / {progress.total}</span>
                            </div>
                            <div className="w-full pd-bg-readonly rounded-full h-3 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                        
                        {/* Status Message */}
                        {progress.status && (
                            <div className="pd-bg-muted border border-blue-200 rounded-xl p-4">
                                <p className="text-blue-800 text-sm flex items-center gap-2">
                                    {processing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4 pd-stat-positive" />
                                    )}
                                    {progress.status}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Results Summary */}
                {results.length > 0 && (
                    <div className="pd-bg-surface rounded-2xl shadow-xl p-6 mb-6">
                        <h2 className="pd-section-title mb-4">Processing Summary</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                <CheckCircle className="w-8 h-8 pd-stat-positive mx-auto mb-2" />
                                <p className="text-2xl font-bold pd-stat-positive">
                                    {results.filter(r => r.status === 'success').length}
                                </p>
                                <p className="text-green-700 text-sm">Successful</p>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                                <XCircle className="w-8 h-8 pd-stat-negative mx-auto mb-2" />
                                <p className="text-2xl font-bold pd-stat-negative">
                                    {results.filter(r => r.status === 'error').length}
                                </p>
                                <p className="text-red-700 text-sm">Failed</p>
                            </div>
                            <div className="pd-bg-muted border border-blue-200 rounded-xl p-4 text-center">
                                <MapPin className="w-8 h-8 pd-text-primary mx-auto mb-2" />
                                <p className="text-2xl font-bold pd-text-primary">{results.length}</p>
                                <p className="pd-text-primary text-sm">Total Processed</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Data Table */}
                {data.length > 0 && (
                    <div className="pd-bg-surface rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="pd-bg-muted border-b pd-border-default border">
                                    <tr>
                                        <th className="px-6 py-4 text-left pd-label">#</th>
                                        <th className="px-6 py-4 text-left pd-label">Employee Name</th>
                                        <th className="px-6 py-4 text-left pd-label">Latitude</th>
                                        <th className="px-6 py-4 text-left pd-label">Longitude</th>
                                        <th className="px-6 py-4 text-left pd-label">Status</th>
                                        <th className="px-6 py-4 text-left pd-label">Location</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.map((item, index) => {
                                        const result = results.find(r => r.id === item._id);
                                        return (
                                            <tr key={item._id} className="hover:pd-bg-muted transition-colors duration-150">
                                                <td className="px-6 py-4 text-sm pd-text-muted">{index + 1}</td>
                                                <td className="px-6 py-4 text-sm font-medium pd-text-body">
                                                    {item.UserId || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-sm pd-text-muted">{item?.latitude || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm pd-text-muted">{item?.longitude || 'N/A'}</td>
                                                <td className="px-6 py-4">
                                                    {result ? (
                                                        result.status === 'success' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Extracted
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                                                <XCircle className="w-3 h-3" />
                                                                Failed
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 pd-bg-muted pd-text-muted text-xs font-semibold rounded-full">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm pd-text-muted max-w-md truncate">
                                                    {result?.location || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {data.length === 0 && !loading && (
                    <div className="pd-bg-surface rounded-2xl shadow-xl p-12 text-center">
                        <div className="w-24 h-24 pd-bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <MapPin className="w-12 h-12 pd-text-muted" />
                        </div>
                        <h3 className="text-lg font-semibold pd-text-body mb-2">No Attendance Data</h3>
                        <p className="pd-text-muted">Click "Load Attendance Data" to fetch attendance records</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Attendance;