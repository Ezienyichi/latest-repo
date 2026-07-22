const API = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.base = API;
  }

  getToken() {
    return localStorage.getItem('cag_token');
  }

  setToken(token) {
    localStorage.setItem('cag_token', token);
  }

  clearToken() {
    localStorage.removeItem('cag_token');
  }

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.base}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        window.dispatchEvent(new Event('auth:logout'));
      }
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  get(path) { return this.request(path); }
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); }
  patch(path, body) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete(path) { return this.request(path, { method: 'DELETE' }); }

  // Auth
  register(data) { return this.post('/auth/register', data); }
  login(data) { return this.post('/auth/login', data); }
  verifyEmail(code) { return this.post('/auth/verify-email', { code }); }
  setupArtist(data) { return this.post('/auth/setup/artist', data); }
  setupCharity(data) { return this.post('/auth/setup/charity', data); }
  getMe() { return this.get('/auth/me'); }
  updateMe(data) { return this.patch('/auth/me', data); }
  forgotPassword(email) { return this.post('/auth/forgot-password', { email }); }
  resetPassword(data) { return this.post('/auth/reset-password', data); }

  // Products
  getProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/products${qs ? '?' + qs : ''}`);
  }
  getProduct(slug) { return this.get(`/products/${slug}`); }
  createProduct(data) { return this.post('/products', data); }
  updateProduct(id, data) { return this.patch(`/products/${id}`, data); }
  deleteProduct(id) { return this.delete(`/products/${id}`); }
  addReview(slug, data) { return this.post(`/products/${slug}/reviews`, data); }

  // Artists
  getArtists() { return this.get('/artists'); }
  getArtist(id) { return this.get(`/artists/${id}`); }

  // Charities
  getCharities() { return this.get('/charities'); }
  getCharity(id) { return this.get(`/charities/${id}`); }
  becomeFunder(charityId) { return this.post(`/charities/${charityId}/funder`, {}); }

  // Settings
  getPublicSettings() { return this.get('/settings/public'); }

  // Content
  getPageContent(slug) { return this.get(`/content/page/${slug}`); }
  getTeam() { return this.get('/content/team'); }

  // Uploads
  signUpload(data) { return this.post('/uploads/sign', data); }

  // Orders
  validateCoupon(code, subtotal) { return this.post('/orders/validate-coupon', { code, subtotal }); }
  createOrder(data) { return this.post('/orders', data); }
  getOrders() { return this.get('/orders'); }
  getOrder(id) { return this.get(`/orders/${id}`); }

  // Dashboard
  getBuyerDashboard() { return this.get('/dashboard/buyer'); }
  getArtistDashboard() { return this.get('/dashboard/artist'); }
  getCharityDashboard() { return this.get('/dashboard/charity'); }
  getAdminDashboard() { return this.get('/dashboard/admin'); }
  updateArtistProfile(data) { return this.patch('/dashboard/artist/profile', data); }
  updateCharityProfile(data) { return this.patch('/dashboard/charity/profile', data); }
  sendCharityMessage(data) { return this.post('/dashboard/charity/messages', data); }
  createTemplate(data) { return this.post('/dashboard/charity/templates', data); }
  deleteTemplate(id) { return this.delete(`/dashboard/charity/templates/${id}`); }
  createResource(data) { return this.post('/dashboard/charity/resources', data); }
  deleteResource(id) { return this.delete(`/dashboard/charity/resources/${id}`); }

  // Certificates
  verifyCertificate(certId) { return this.get(`/certificates/verify/${certId}`); }
  getMyCertificates() { return this.get('/certificates/my-certificates'); }

  // Admin
  getAdminUsers(params = {}) { const qs = new URLSearchParams(params).toString(); return this.get(`/admin/users${qs ? '?' + qs : ''}`); }
  verifyArtistAdmin(id) { return this.post(`/admin/verify-artist/${id}`, {}); }
  verifyCharityAdmin(id) { return this.post(`/admin/verify-charity/${id}`, {}); }
  getModeration() { return this.get('/admin/moderation'); }
  moderateProduct(id, status) { return this.patch(`/admin/products/${id}/moderate`, { status }); }
  getAdminAnalytics() { return this.get('/admin/analytics'); }
}

export const api = new ApiClient();
export default api;
