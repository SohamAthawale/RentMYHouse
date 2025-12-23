import api from './api';

/* ---------------- AUTH ---------------- */
export const authAPI = {
  signup: (data) => api.post('/signup', data),
  login: (data) => api.post('/login', data),
  verifyOTP: (data) => api.post('/verify-otp', data),
  resendOTP: (data) => api.post('/request-otp', data),
};

/* ---------------- FLATS ---------------- */
export const flatsAPI = {
  createFlat: (data) => api.post('/create-flat', data),

  listFlats: () => api.get('/list-flats'),

  getOwnerFlats: (ownerUniqueId) =>
    api.get(`/owner-flats/${ownerUniqueId}`),

  requestRentOtp: (data) =>
    api.post('/request-rent-otp', data),

  requestVacateOtp: (payload) =>
  api.post('/request-vacate-otp', payload),
  
  rentFlat: (data) =>
    api.post('/rent-flat', data),

  vacateFlat: (data) =>
  api.post('/vacate-flat', data),

  deleteFlat: (flatUniqueId) =>
    api.delete(`/delete-flat/${flatUniqueId}`),
};

/* ---------------- TENANTS ---------------- */
export const tenantsAPI = {
  getAllTenants: () => api.get('/all-tenants'),
  getAvailableTenants: () => api.get('/available-tenants'),
  
};

/* ---------------- SERVICE REQUESTS ---------------- */
export const serviceRequestsAPI = {
  create: (data) => api.post('/create-service-request', data),

  getTenantRequests: (tenantId) =>
    api.get(`/tenant-service-requests/${tenantId}`),

  getOwnerRequests: (ownerId) =>
    api.get(`/owner-service-requests/${ownerId}`),

  update: (data) =>
    api.put('/update-service-request', data),

  rate: (data) =>
    api.post('/rate-service-request', data),

  getDetails: (id) =>
    api.get(`/service-request-details/${id}`),
};

/* ---------------- FINANCIALS ---------------- */
export const financialsAPI = {
  /* 🟢 TENANT */
  getMyRentPayments: () =>
    api.get('/tenant/rent-payments'),

  recordRentPayment: (data) =>
    api.post('/tenant/record-rent-payment', data),

  /* 🔵 OWNER */
  ownerRecordRent: (data) =>
    api.post('/owner/record-rent', data),

  verifyRentPayment: (paymentUniqueId) =>
    api.post(`/owner/verify-rent-payment/${paymentUniqueId}`),

  getFinancialSummary: (ownerId, year, month) =>
    api.get(`/financial-summary/${ownerId}`, {
      params: { year, month },
    }),

  getRentPaymentHistory: (params) =>
    api.get('/rent-payment-history', { params }),

  getExpenseHistory: (params) =>
    api.get('/expense-history', { params }),

  createManualExpense: (data) =>
    api.post('/create-manual-expense', data),

  /* 🔥 THIS WAS THE BUG – NOW FIXED */
  updateServiceExpense: (data) =>
    api.put('/update-service-expense', data),
};

/* ---------------- ADMIN ---------------- */
export const adminAPI = {
  getStatistics: () =>
    api.get('/admin/statistics'),

  getUsers: (params) =>
    api.get('/admin/users', { params }),

  getUserDetails: (id) =>
    api.get(`/admin/user-details/${id}`),

  cleanup: () =>
    api.post('/admin/cleanup'),

  exportData: () =>
    api.get('/admin/export'),

  deleteUser: (id) =>
    api.delete(`/delete-user/${id}`),
};
/* ---------------- RENT PREDICTOR (ML) ---------------- */
export const rentPredictorAPI = {
  predict: (data) => api.post('/predict-rent', data),
};

