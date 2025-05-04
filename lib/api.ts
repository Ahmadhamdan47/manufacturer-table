import axios from "axios"

const api = axios.create({
  baseURL: "/", // Set baseURL to the root
  timeout: 10000, // Optional timeout
  headers: {
    "Content-Type": "application/json",
  },
})

// Add a request interceptor to add the authorization header
api.interceptors.request.use(
  (config) => {
    // You can add authentication logic here, e.g., retrieve a token from localStorage
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Add a response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle error responses here, e.g., display a notification
    console.error("API Error:", error)
    return Promise.reject(error)
  },
)

export default api
