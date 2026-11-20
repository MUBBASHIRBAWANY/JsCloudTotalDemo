import api, { Cloudapi } from './ApiInstance.jsx';

export const getDataFundtion = async (endpoint) => {
  try {
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
  console.error('BACKEND ERROR:', error.response?.data);
    throw error;
  }
};

// 2. POST Request
export const createDataFunction = async (endpoint, data) => {
  try {
    const response = await api.post(endpoint, data);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const responseData = error?.response?.data;
    console.error(`Error creating data (${endpoint})`, {
      status,
      responseData,
      requestData: data,
      message: error?.message,
    });
    throw error;
  }
};

// 3. UPDATE (PUT) Request
export const updateDataFunction = async (endpoint, data) => {
  try {
    const response = await api.put(endpoint, data);
    return response.data;
  } catch (error) {
    console.error('Error updating data:', error);
    throw error;
  }
};

// 4. DELETE Request
export const deleteDataFunction = async (endpoint) => {
  try {
    const response = await api.delete(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
};

export const updateDataFunctionInCloud = async (endpoint, data) => {
  try {
    const response = await Cloudapi.put(endpoint, data);
    return response.data;
  } catch (error) {
    console.error('Error creating data:', error);
    throw error;
  }
};

