import { api, Cloudapi } from './ApiInstance.jsx';

export const getDataFundtion = async (endpoint, headers) => {
  try {
    const response = await api.get(endpoint, headers ? { headers } : undefined);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 2. POST Request
export const createDataFunction = async (endpoint, data, quiet = false, headers) => {
  try {
    const response = await api.post(endpoint, data, headers ? { headers } : undefined);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 3. UPDATE (PUT) Request
const formUrl = (baseURL, endpoint) => {
  const base = String(baseURL || '');
  const path = String(endpoint || '').replace(/^\//, '');
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
};

const readResponse = (text) => {
  if (!text) return '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// XMLHttpRequest uses React Native's file parts ({ uri, name, type }).
// Expo fetch rejects that shape with "Unsupported FormDataPart implementation".
const postForm = (url, formData, headers = {}) =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', url);
    request.timeout = 120000;
    request.setRequestHeader('Accept', 'application/json');
    Object.entries(headers).forEach(([key, value]) => {
      if (value == null || key.toLowerCase() === 'content-type') return;
      request.setRequestHeader(key, String(value));
    });
    request.onload = () => {
      const responseData = readResponse(request.responseText);
      if (request.status >= 200 && request.status < 300) {
        resolve(responseData);
        return;
      }
      const error = new Error(
        typeof responseData === 'string' && responseData
          ? responseData
          : responseData?.error
            || responseData?.message
            || `Request failed with status code ${request.status}`,
      );
      error.response = { status: request.status, data: responseData };
      reject(error);
    };
    request.ontimeout = () => reject(new Error(`Upload timed out (${url})`));
    request.onerror = () => reject(new Error(`Network Error posting ${url}. Is the backend running on this host?`));
    request.send(formData);
  });

export const createFormDataFunction = async (endpoint, formData, headers = {}, quiet = false) => {
  return postForm(formUrl(api.defaults.baseURL, endpoint), formData, headers);
};

export const updateDataFunction = async (endpoint, data) => {
  try {
    const response = await api.put(endpoint, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 4. DELETE Request
export const deleteDataFunction = async (endpoint) => {
  try {
    const response = await api.delete(endpoint);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateDataFunctionInCloud = async (endpoint, data) => {
  try {
    const response = await Cloudapi.put(endpoint, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
