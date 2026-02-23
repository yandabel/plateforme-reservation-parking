import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Services pour les parkings
export const parkingService = {
  getAll: (params) => api.get('/parkings', { params }),
  getNearby: (lat, lng, radius = 5) => 
    api.get('/parkings/nearby', { params: { lat, lng, radius } }),
  getById: (id) => api.get(`/parkings/${id}`),
  create: (parkingData) => api.post('/parkings', parkingData),
  update: (id, parkingData) => api.put(`/parkings/${id}`, parkingData),
  delete: (id) => api.delete(`/parkings/${id}`),
  uploadImage: (id, imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post(`/parkings/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getStats: (id) => api.get(`/parkings/${id}/stats`)
};

// Services pour les réservations
export const reservationService = {
  create: (reservationData) => api.post('/reservations', reservationData),
  getMyReservations: (params) => api.get('/reservations/my-reservations', { params }),
  getById: (id) => api.get(`/reservations/${id}`),
  cancel: (id, reason) => api.put(`/reservations/${id}/cancel`, { reason }),
  checkIn: (id) => api.put(`/reservations/${id}/checkin`),
  checkOut: (id) => api.put(`/reservations/${id}/checkout`)
};

// Services pour les utilisateurs
export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  changePassword: (passwordData) => api.put('/users/change-password', passwordData),
  getVehicles: () => api.get('/users/vehicles'),
  addVehicle: (vehicleData) => api.post('/users/vehicles', vehicleData),
  updateVehicle: (id, vehicleData) => api.put(`/users/vehicles/${id}`, vehicleData),
  deleteVehicle: (id) => api.delete(`/users/vehicles/${id}`),
  setDefaultVehicle: (id) => api.put(`/users/vehicles/${id}/set-default`),
  getFavorites: () => api.get('/users/favorites'),
  toggleFavorite: (parkingId) => api.post(`/users/favorites/${parkingId}`)
};

// Services pour les avis
export const reviewService = {
  getByParking: (parkingId) => api.get(`/reviews/parking/${parkingId}`),
  create: (reviewData) => api.post('/reviews', reviewData),
  update: (id, reviewData) => api.put(`/reviews/${id}`, reviewData),
  delete: (id) => api.delete(`/reviews/${id}`),
  report: (id, reason) => api.post(`/reviews/${id}/report`, { reason })
};

// Services pour les paiements
export const paymentService = {
  createPayment: (reservationId, paymentMethod) => 
    api.post(`/payments/${reservationId}`, { paymentMethod }),
  confirmPayment: (paymentId) => api.put(`/payments/${paymentId}/confirm`),
  refund: (paymentId, reason) => api.put(`/payments/${paymentId}/refund`, { reason })
};

export default api;