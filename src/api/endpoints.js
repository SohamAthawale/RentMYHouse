import api from './api';

export const authAPI = {
  signup: (data) => api.post('/signup', data),
  login: (data) => api.post('/login', data),
  getProfile: (uniqueId) => api.get(`/profile/${uniqueId}`),
  changePassword: (data) => api.post('/change-password', data),
  updateProfile: (data) => api.put('/update-profile', data),
};

export const flatsAPI = {
  createFlat: (data) => api.post('/create-flat', data),
  getOwnerFlats: (ownerUniqueId) => api.get(`/owner-flats/${ownerUniqueId}`),
  listFlats: () => api.get('/list-flats'),
  rentFlat: (data) => api.post('/rent-flat', data),
  vacateFlat: (flatUniqueId) => api.post(`/vacate-flat/${flatUniqueId}`),
  deleteFlat: (flatUniqueId) => api.delete(`/delete-flat/${flatUniqueId}`),
};

export const tenantsAPI = {
  getAllTenants: () => api.get('/all-tenants'),
  getAvailableTenants: () => api.get('/available-tenants'),
};

export const serviceRequestsAPI = {
  create: (data) => api.post('/create-service-request', data),
  getTenantRequests: (tenantUniqueId) => api.get(`/tenant-service-requests/${tenantUniqueId}`),
  getOwnerRequests: (ownerUniqueId) => api.get(`/owner-service-requests/${ownerUniqueId}`),
  update: (data) => api.put('/update-service-request', data),
  rate: (data) => api.post('/rate-service-request', data),
  getDetails: (requestUniqueId) => api.get(`/service-request-details/${requestUniqueId}`),
};

export const financialsAPI = {
  recordRentPayment: (data) => api.post('/record-rent-payment', data),
  getFinancialSummary: (ownerUniqueId, year, month) =>
    api.get(`/financial-summary/${ownerUniqueId}`, { params: { year, month } }),
  getRentPaymentHistory: (params) => api.get('/rent-payment-history', { params }),
  getExpenseHistory: (params) => api.get('/expense-history', { params }),
  createManualExpense: (data) => api.post('/create-manual-expense', data),
};

export const adminAPI = {
  getStatistics: () => api.get('/admin/statistics'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (uniqueId) => api.get(`/admin/user-details/${uniqueId}`),
  cleanup: () => api.post('/admin/cleanup'),
  exportData: () => api.get('/admin/export'),
  deleteUser: (uniqueId) => api.delete(`/delete-user/${uniqueId}`),
};
