import { useState } from 'react';
import GlobalLoader from '../Components/Global/GlobalLoader';

export const useLoader = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Loading...');

    const showLoader = (msg = 'Loading...') => {
        setMessage(msg);
        setProgress(0);
        setLoading(true);
    };

    const hideLoader = () => {
        setLoading(false);
        setProgress(0);
    };

    const updateProgress = (value) => {
        setProgress(value);
    };

    const updateMessage = (msg) => {
        setMessage(msg);
    };

    return {
        loading,
        progress,
        message,
        showLoader,
        hideLoader,
        updateProgress,
        updateMessage,
        LoaderComponent: () => (
            <GlobalLoader
                loading={loading} 
                progress={progress} 
                message={message} 
            />
        )
    };
};