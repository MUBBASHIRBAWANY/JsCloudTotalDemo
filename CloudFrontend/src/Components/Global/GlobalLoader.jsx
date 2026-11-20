import React from 'react';
import { CircularProgress, Backdrop, Box, Typography, LinearProgress } from '@mui/material';

const GlobalLoader = ({ loading, progress = 0, message = "Loading..." }) => {
    return (
        <Backdrop
            sx={{
                color: '#fff',
                zIndex: (theme) => theme.zIndex.drawer + 1,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
            }}
            open={loading}
            transitionDuration={0}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    borderRadius: 4,
                    backgroundColor: 'white',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    minWidth: '300px'
                }}
            >
                {/* Circular Progress with percentage */}
                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                    <CircularProgress
                        variant={progress ? "determinate" : "indeterminate"}
                        value={progress}
                        size={80}
                        thickness={4}
                        sx={{
                            color: (theme) => 
                                progress === 100 
                                    ? theme.palette.success.main 
                                    : theme.palette.primary.main,
                        }}
                    />
                    {progress > 0 && (
                        <Box
                            sx={{
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Typography
                                variant="caption"
                                component="div"
                                color="text.secondary"
                                fontSize="1rem"
                                fontWeight="bold"
                            >
                                {`${Math.round(progress)}%`}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Loading message */}
                <Typography 
                    variant="h6" 
                    sx={{ 
                        mb: 2,
                        color: 'primary.main',
                        fontWeight: 600
                    }}
                >
                    {message}
                </Typography>

                {/* Progress bar */}
                {progress > 0 && (
                    <Box sx={{ width: '100%', mb: 1 }}>
                        <LinearProgress 
                            variant="determinate" 
                            value={progress}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                            }}
                        />
                    </Box>
                )}

                {/* Loading dots */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    {[0, 1, 2].map((dot) => (
                        <Box
                            key={dot}
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: 'primary.main',
                                animation: 'bounce 1.4s infinite ease-in-out',
                                animationDelay: `${dot * 0.16}s`,
                                '@keyframes bounce': {
                                    '0%, 80%, 100%': {
                                        transform: 'scale(0)',
                                        opacity: 0.5,
                                    },
                                    '40%': {
                                        transform: 'scale(1)',
                                        opacity: 1,
                                    },
                                },
                            }}
                        />
                    ))}
                </Box>
            </Box>
        </Backdrop>
    );
};

export default GlobalLoader;