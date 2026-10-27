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
  put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); }
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
  getAdminProducts(params = {}) { const qs = new URLSearchParams(params).toString(); return this.get(`/admin/products${qs ? '?' + qs : ''}`); }
  verifyArtistAdmin(id) { return this.post(`/admin/verify-artist/${id}`, {}); }
  verifyCharityAdmin(id) { return this.post(`/admin/verify-charity/${id}`, {}); }
  getAdminOrders(params = {}) { const qs = new URLSearchParams(params).toString(); return this.get(`/admin/orders${qs ? '?' + qs : ''}`); }
  getAdminOrder(id) { return this.get(`/admin/orders/${id}`); }
  updateOrderStatus(id, status) { return this.patch(`/orders/${id}/status`, { status }); }
  getModeration() { return this.get('/admin/moderation'); }
  moderateProduct(id, status) { return this.patch(`/admin/products/${id}/moderate`, { status }); }
  getAdminAnalytics() { return this.get('/admin/analytics'); }
  getAdminSettings() { return this.get('/admin/settings'); }
  updateAdminSetting(key, value) { return this.put(`/admin/settings/${key}`, { value }); }

  // Artist images — admin
  getAdminArtists(params = {}) { const qs = new URLSearchParams(params).toString(); return this.get(`/admin/artists${qs ? '?' + qs : ''}`); }
  updateArtistImages(id, data) { return this.patch(`/admin/artists/${id}/images`, data); }

  // Projects (campaigns) — admin
  getAdminProjects(params = {}) { const qs = new URLSearchParams(params).toString(); return this.get(`/admin/projects${qs ? '?' + qs : ''}`); }
  getAdminProject(id) { return this.get(`/admin/projects/${id}`); }
  createAdminProject(data) { return this.post('/admin/projects', data); }
  updateAdminProject(id, data) { return this.patch(`/admin/projects/${id}`, data); }
  deleteAdminProject(id) { return this.delete(`/admin/projects/${id}`); }
  linkProjectProduct(id, productId) { return this.post(`/admin/projects/${id}/products`, { productId }); }
  unlinkProjectProduct(id, productId) { return this.delete(`/admin/projects/${id}/products/${productId}`); }

  // Newsletter
  subscribeNewsletter(email, source) { return this.post('/newsletter', { email, source }); }
  getAdminNewsletter(params = {}) { const qs = new URLSearchParams(params).toString(); return this.get(`/admin/newsletter${qs ? '?' + qs : ''}`); }
  // The export needs the Bearer header, so a plain <a href> can't be used —
  // fetch the CSV as a blob and hand it to the browser as a download.
  async downloadNewsletterCsv() {
    const token = this.getToken();
    const res = await fetch(`${this.base}/admin/newsletter/export`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'newsletter-subscribers.csv';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
}

export const api = new ApiClient();
export default api;
