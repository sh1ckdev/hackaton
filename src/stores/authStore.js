import { makeAutoObservable } from 'mobx';
import api from '../utils/api';

class AuthStore {
  user = null;
  token = null;
  refreshToken = null;
  loading = false;
  error = null;
  initializing = true;
  loginInProgress = false;

  constructor() {
    makeAutoObservable(this);
    this.fetchUser();
  }

  async login(telegramData, captchaToken, participantCategory) {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.post('/auth/telegram', {
        telegramData,
        captcha_token: captchaToken || '',
        participant_category: participantCategory || undefined,
      });
      this.token = response.data.token;
      this.refreshToken = response.data.refresh_token;
      this.user = response.data.user;
      return true;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка входа';
      return false;
    } finally {
      this.loading = false;
      this.initializing = false;
    }
  }

  async loginWithVk(code, state, deviceId, participantCategory) {
    if (this.loginInProgress) return false;
    this.loginInProgress = true;
    this.loading = true;
    this.error = null;
    try {
      const response = await api.post('/auth/vk', { code, state, device_id: deviceId, participant_category: participantCategory || undefined });
      this.token = response.data.token;
      this.refreshToken = response.data.refresh_token;
      this.user = response.data.user;
      return true;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка входа через VK';
      return false;
    } finally {
      this.loading = false;
      this.initializing = false;
      this.loginInProgress = false;
    }
  }

  async loginWithToken(token, captchaToken, participantCategory) {
    // Предотвращаем одновременные вызовы
    if (this.loginInProgress) {
      return false;
    }
    
    this.loginInProgress = true;
    this.loading = true;
    this.error = null;
    try {
      const response = await api.post('/auth/bot', { token, captcha_token: captchaToken, participant_category: participantCategory || undefined });
      this.token = response.data.token;
      this.refreshToken = response.data.refresh_token;
      this.user = response.data.user;
      return true;
    } catch (error) {
      this.error = error.response?.data?.error || 'Ошибка входа';
      return false;
    } finally {
      this.loading = false;
      this.initializing = false;
      this.loginInProgress = false;
    }
  }

  async fetchUser() {
    this.loading = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 8000);
    try {
      const response = await api.get('/auth/me', {
        timeout: 8000,
        signal: controller.signal,
        _skipAuthRefresh: true,
        _skipAuthRedirect: true
      });
      this.user = response.data.user;
    } catch (error) {
      this.user = null;
      this.token = null;
      this.refreshToken = null;
    } finally {
      clearTimeout(timeoutId);
      this.loading = false;
      this.initializing = false;
    }
  }

  logout() {
    api.post('/auth/logout', {}).catch(() => {});
    this.user = null;
    this.token = null;
    this.refreshToken = null;
    this.error = null;
    this.initializing = false;
  }

  get isAuthenticated() {
    return !!this.user;
  }

  get isAdmin() {
    return this.user?.role === 'admin';
  }

  get isModerator() {
    return this.user?.role === 'admin' || this.user?.role === 'moderator';
  }

  get hasRequiredProfileData() {
    const user = this.user;
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'moderator') return true;

    const hasFirst = typeof user.first_name === 'string' && user.first_name.trim().length > 0;
    const hasLast = typeof user.last_name === 'string' && user.last_name.trim().length > 0;
    const hasMiddle = typeof user.middle_name === 'string' && user.middle_name.trim().length > 0;
    const hasPhone = typeof user.phone === 'string' && user.phone.trim().length > 0;
    const hasEmail = typeof user.email === 'string' && user.email.trim().length > 0;
    const category = user.participant_category;

    if (!hasFirst || !hasLast || !hasMiddle || !hasPhone || !hasEmail) return false;
    if (category !== 'student' && category !== 'school') return false;

    if (category === 'student') {
      return (
        typeof user.institution === 'string' &&
        user.institution.trim().length > 0 &&
        typeof user.student_course === 'string' &&
        user.student_course.trim().length > 0
      );
    }

    return (
      typeof user.school_name === 'string' &&
      user.school_name.trim().length > 0 &&
      typeof user.school_class === 'string' &&
      user.school_class.trim().length > 0
    );
  }
}

export default new AuthStore();
