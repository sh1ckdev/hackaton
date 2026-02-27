import { makeAutoObservable } from 'mobx';
import api from '../utils/api';

class AdminStore {
  stats = null;
  supportUnread = 0;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchStats() {
    try {
      const res = await api.get('/admin/stats');
      this.stats = res.data;
    } catch {}
  }

  async fetchSupportUnread() {
    try {
      const res = await api.get('/admin/support/chats', { params: { status: 'open' } });
      this.supportUnread = res.data.chats.filter(c => Number(c.unread_count) > 0).length;
    } catch {}
  }

  get pendingCount() {
    return this.stats?.solutionsByStatus?.pending || 0;
  }
}

export default new AdminStore();
