/**
 * Cliente HTTP unificado con soporte para cookies y manejo de respuestas
 */
const BASE_URL = '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...options.headers
    }
  };

  // Solo agregar Content-Type si no es FormData
  if (!(options.body instanceof FormData) && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, config);

  if (res.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/me')) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  if (!res.ok) {
    let errorMsg = `Error ${res.status}`;
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      const text = await res.text();
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const api = {
  // Auth
  login: password => request('/api/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/api/logout', { method: 'POST' }),
  getMe: () => request('/api/me'),

  // Tasks
  getTasks: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.category) query.set('category', params.category);
    if (params.q) query.set('q', params.q);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/tasks${qs}`);
  },
  getTask: id => request(`/api/tasks/${id}`),
  createTask: data => request('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  moveTask: (id, data) => request(`/api/tasks/${id}/move`, { method: 'POST', body: JSON.stringify(data) }),
  deleteTask: id => request(`/api/tasks/${id}`, { method: 'DELETE' }),

  // Sessions
  getSessions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/sessions${qs}`);
  },
  getCurrentSession: () => request('/api/sessions/current'),
  getSession: id => request(`/api/sessions/${id}`),
  updateSession: (id, data) => request(`/api/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateSessionTasks: (id, tasks) => request(`/api/sessions/${id}/tasks`, { method: 'PUT', body: JSON.stringify(tasks) }),

  // Evidence
  uploadEvidence: formData => request('/api/evidence', { method: 'POST', body: formData }),
  deleteEvidence: id => request(`/api/evidence/${id}`, { method: 'DELETE' }),

  // Reports
  getReport: (period = 'week', date = '') => {
    const qs = date ? `?period=${period}&date=${date}` : `?period=${period}`;
    return request(`/api/reports${qs}`);
  },
  getReportText: (period = 'week', date = '') => {
    const qs = date ? `?period=${period}&date=${date}` : `?period=${period}`;
    return request(`/api/reports/text${qs}`);
  },
  getSavedReports: () => request('/api/reports/saved'),
  getSavedReport: id => request(`/api/reports/saved/${id}`),
  generateWeeklyReport: date => request('/api/reports/generate-week', { method: 'POST', body: JSON.stringify({ date }) }),

  // Settings & Export
  getSettings: () => request('/api/settings'),
  updateSettings: data => request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  exportBackupUrl: '/api/export',

  // Solicitudes Públicas (Profesores)
  submitPublicRequest: formData => request('/api/public/requests', { method: 'POST', body: formData }),
  getPublicRequests: () => request('/api/public/requests'),

  // Solicitudes Privadas (Santiago)
  getRequests: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.type) query.set('type', params.type);
    if (params.q) query.set('q', params.q);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/requests${qs}`);
  },
  updateRequest: (id, data) => request(`/api/requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  convertRequestToTask: id => request(`/api/requests/${id}/convert-to-task`, { method: 'POST' }),
  deleteRequest: id => request(`/api/requests/${id}`, { method: 'DELETE' }),

  // Inventario
  getInventoryStats: () => request('/api/inventory/stats'),
  getInventory: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.location) query.set('location', params.location);
    if (params.status) query.set('status', params.status);
    if (params.q) query.set('q', params.q);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/inventory${qs}`);
  },
  getEquipment: id => request(`/api/inventory/${id}`),
  createEquipment: data => request('/api/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipment: (id, data) => request(`/api/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEquipment: id => request(`/api/inventory/${id}`, { method: 'DELETE' }),
  addEquipmentService: (id, data) => request(`/api/inventory/${id}/services`, { method: 'POST', body: JSON.stringify(data) })
};
