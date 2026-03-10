import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Try to refresh, or redirect to login
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// ─── Auth ─────────────────────────────────────────────
export const authApi = {
  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password }),
  register: (data: { phone: string; password: string; firstName: string; lastName: string; email?: string }) =>
    api.post('/auth/register', data),
  registerWithOtp: (data: {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    email?: string;
    otpCode: string;
  }) => api.post('/auth/register-with-otp', data),
  getOtpLink: (phone: string) =>
    api.post('/auth/otp-link', { phone }),
  verifyOtp: (phone: string, code: string) =>
    api.post('/auth/verify-otp', { phone, code }),
  profile: () => api.get('/auth/profile'),
  refresh: () => api.post('/auth/refresh'),
};

// ─── Subjects ─────────────────────────────────────────
export const subjectsApi = {
  list: (page = 1, limit = 50) =>
    api.get('/subjects', { params: { page, limit } }),
  get: (id: string) => api.get(`/subjects/${id}`),
  create: (data: { name: string; description?: string; code?: string }) =>
    api.post('/subjects', data),
  update: (id: string, data: { name?: string; description?: string; code?: string }) =>
    api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

// ─── Materials ────────────────────────────────────────
export const materialsApi = {
  list: (params: { page?: number; limit?: number; status?: string; subjectId?: string }) =>
    api.get('/materials', { params }),
  get: (id: string) => api.get(`/materials/${id}`),
  upload: (file: File, subjectId: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('subjectId', subjectId);
    return api.post('/materials/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id: string) => api.delete(`/materials/${id}`),
  getMetadata: (id: string) => api.get(`/materials/${id}/metadata`),
  updateMetadata: (id: string, data: Record<string, unknown>) =>
    api.put(`/materials/${id}/metadata`, data),
  getQuizzes: (id: string) => api.get(`/materials/${id}/quizzes`),
  updateQuiz: (quizId: string, data: Record<string, unknown>) =>
    api.put(`/materials/quizzes/${quizId}`, data),
  deleteQuiz: (quizId: string) =>
    api.delete(`/materials/quizzes/${quizId}`),
  review: (id: string, action: 'approve' | 'reject', reason?: string) =>
    api.patch(`/materials/${id}/review`, { action, reason }),
  publish: (id: string, publish: boolean) =>
    api.patch(`/materials/${id}/publish`, { publish }),
  reprocess: (id: string) => api.post(`/materials/${id}/reprocess`),
  changeStatus: (id: string, status: string) =>
    api.patch(`/materials/${id}/status`, { status }),
  createQuestion: (data: Record<string, unknown>) =>
    api.post('/materials/quiz-questions', data),
  updateQuestion: (questionId: string, data: Record<string, unknown>) =>
    api.put(`/materials/quiz-questions/${questionId}`, data),
  deleteQuestion: (questionId: string) =>
    api.delete(`/materials/quiz-questions/${questionId}`),
};

// ─── Search ───────────────────────────────────────────
export const searchApi = {
  search: (params: Record<string, string | number | string[] | undefined>) =>
    api.get('/search', { params }),
  deepSearch: (q: string, page = 1, limit = 20) =>
    api.get('/search/deep', { params: { q, page, limit } }),
};

// ─── Quizzes ──────────────────────────────────────────
export const quizzesApi = {
  listBySubject: (subjectId: string, page = 1, limit = 20) =>
    api.get(`/subjects/${subjectId}/quizzes`, { params: { page, limit } }),
  get: (id: string) => api.get(`/quizzes/${id}`),
  delete: (id: string) => api.delete(`/quizzes/${id}`),
  startAttempt: (quizId: string) => api.post(`/quizzes/${quizId}/attempts`),
  submitAttempt: (attemptId: string, answers: { questionId: string; selectedOptionId?: string; textAnswer?: string }[]) =>
    api.post(`/quiz-attempts/${attemptId}/submit`, { answers }),
  getResults: (attemptId: string) => api.get(`/quiz-attempts/${attemptId}/results`),
  myAttempts: (page = 1, limit = 20) =>
    api.get('/my/quiz-attempts', { params: { page, limit } }),
  myAttemptDetail: (attemptId: string) => api.get(`/my/quiz-attempts/${attemptId}`),
  myStats: () => api.get('/my/quiz-stats'),
};

// ─── Users ────────────────────────────────────────────
export const usersApi = {
  list: (params: { page?: number; limit?: number; role?: string; search?: string }) =>
    api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  assignRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
};

// ─── Subscriptions ────────────────────────────────────
export const subscriptionsApi = {
  my: () => api.get('/subscriptions/my'),
  check: (subjectId: string) => api.get(`/subscriptions/check/${subjectId}`),
  list: (params?: { page?: number; limit?: number; status?: string; userId?: string; subjectId?: string }) =>
    api.get('/subscriptions', { params }),
  byUser: (userId: string) => api.get(`/subscriptions/user/${userId}`),
  assign: (data: { userId: string; subjectId: string; expiresAt?: string }) =>
    api.post('/subscriptions/assign', data),
  bulkAssign: (data: { userId: string; subjectIds: string[]; expiresAt?: string }) =>
    api.post('/subscriptions/bulk-assign', data),
  update: (id: string, data: { status?: string; expiresAt?: string }) =>
    api.put(`/subscriptions/${id}`, data),
  revoke: (id: string) => api.delete(`/subscriptions/${id}`),
};

// ─── Manual Questions (Q&A) ──────────────────────────
export const questionsApi = {
  list: (params: { page?: number; limit?: number; subjectId?: string; status?: string; search?: string; mine?: string }) =>
    api.get('/questions', { params }),
  get: (id: string) => api.get(`/questions/${id}`),
  create: (data: { questionText: string; answerText: string; subjectId: string }, image?: File) => {
    const form = new FormData();
    form.append('questionText', data.questionText);
    form.append('answerText', data.answerText);
    form.append('subjectId', data.subjectId);
    if (image) form.append('image', image);
    return api.post('/questions', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id: string, data: { questionText?: string; answerText?: string; subjectId?: string }, image?: File) => {
    const form = new FormData();
    if (data.questionText) form.append('questionText', data.questionText);
    if (data.answerText) form.append('answerText', data.answerText);
    if (data.subjectId) form.append('subjectId', data.subjectId);
    if (image) form.append('image', image);
    return api.put(`/questions/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id: string) => api.delete(`/questions/${id}`),
  review: (id: string, status: 'APPROVED' | 'REJECTED') =>
    api.patch(`/questions/${id}/review`, { status }),
  counts: (subjectId?: string) =>
    api.get('/questions/counts', { params: subjectId ? { subjectId } : {} }),
  subjectCounts: () => api.get('/questions/subject-counts'),
  generateQuiz: (subjectId: string, title?: string) =>
    api.post('/questions/generate-quiz', { subjectId, title }),
};
