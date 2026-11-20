import api from "./ApiInstance";
import SnDapi from "./SNDApiInstance";


export const getDataFundtion = async (endpoint) => {
  try {
    console.log(`${endpoint}`);
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

// 2. POST Request
export const createDataFunction = async (endpoint, data) => {
  try {
    console.log(`${endpoint}`);
    const response = await api.post(endpoint, data);
    return response.data;
  } catch (error) {
    console.error('Error creating data:', error);
    throw error;
  }
};

// 3. UPDATE (PUT) Request
export const updateDataFunction = async (endpoint, data) => {
  try {
    console.log(`${endpoint}`);
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
    console.log(`${endpoint}`);
    const response = await api.delete(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
};






export const SndgetDataFundtion = async (endpoint) => {
  try {
    const response = await SnDapi.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

// 2. POST Request
export const SndcreateDataFunction = async (endpoint, data) => {
  try {
    const response = await SnDapi.post(endpoint, data);
    return response.data;
  } catch (error) {
    console.error('Error creating data:', error);
    throw error;
  }
};

// 3. UPDATE (PUT) Request
export const SndupdateDataFunction = async (endpoint, data) => {
  try {
    const response = await SnDapi.put(endpoint, data);
    return response.data;
  } catch (error) {
    console.error('Error updating data:', error);
    throw error;
  }
};

// 4. DELETE Request
export const SnddeleteDataFunction = async (endpoint) => {
  try {
    const response = await SnDapi.delete(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
};