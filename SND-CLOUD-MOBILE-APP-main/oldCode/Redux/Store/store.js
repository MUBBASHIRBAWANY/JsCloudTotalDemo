import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ CHANGE: Import AsyncStorage
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import LoginerReducer from '../Reducer/LoginerReducer.js';
import ProductReducers from '../Reducer/ProductReducers.js';
import SaleOrderReducer from '../Reducer/SaleOrderReducer.js';
import distributorsReducer from '../Reducer/shopsReducer.js';
import users from '../Reducer/userReduser.js';
const rootReducer = combineReducers({
    users1: users,
    LoginerReducer: LoginerReducer,
    distributors: distributorsReducer,
    Product : ProductReducers, // ✅ CHANGE: Add Product reducer
    SalesOrder : SaleOrderReducer, // ✅ CHANGE: Add SalesOrder reducer
});
const persistConfig = {
    key: 'root',
    storage: AsyncStorage,  // ✅ CHANGE: Use AsyncStorage instead of storage
    whitelist: ['users1', "LoginerReducer", "distributors" , "SalesOrder" , "Product"],
    // blacklist: [] // Optional
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export const persistor = persistStore(store);