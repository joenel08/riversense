import axios from 'axios';

const API = axios.create({ baseURL: 'https://riversense-04n9.onrender.com/api' });

API.interceptors.request.use(req => {
  const token = localStorage.getItem('token');
  if (token) req.headers['x-auth-token'] = token;
  return req;
});

export default API;