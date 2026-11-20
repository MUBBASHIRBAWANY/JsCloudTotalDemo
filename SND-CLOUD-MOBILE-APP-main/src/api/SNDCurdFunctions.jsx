import { tunnelHeaders } from './devHost';
import { SNDAPI } from './SNDApiInstance.jsx';

export const getDataFundtion = async (endpoint, headers, quiet = false) => {
  try {
    const response = await SNDAPI.get(endpoint, headers ? { headers } : undefined);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 2. POST Request
export const createDataFunction = async (endpoint, data, quiet = false) => {
  try {
    const response = await SNDAPI.post(endpoint, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

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
          : responseData?.message || `Request failed with status code ${request.status}`,
      );
      error.response = { status: request.status, data: responseData };
      reject(error);
    };
    request.onerror = () => reject(new Error('Network Error'));
    request.send(formData);
  });

export const createFormDataFunction = async (endpoint, formData, headers = {}, quiet = false) => {
  return postForm(formUrl(SNDAPI.defaults.baseURL, endpoint), formData, {
    ...tunnelHeaders(),
    ...headers,
  });
};

// 3. UPDATE (PUT) Request
export const updateDataFunction = async (endpoint, data) => {
  try {
    const response = await SNDAPI.put(endpoint, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 4. DELETE Request
export const deleteDataFunction = async (endpoint) => {
  try {
    const response = await SNDAPI.delete(endpoint);
    return response.data;
  } catch (error) {
    throw error;
  }
};
