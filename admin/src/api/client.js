import axios from "axios";

const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? "" : "https://hobit-backend.onrender.com"),
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add a response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors (e.g., 401 Unauthorized)
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if needed
      localStorage.removeItem("token");
      // window.location.href = '/login'; // Optional: Redirect to login
    }
    return Promise.reject(error);
  },
);

export default apiClient;
