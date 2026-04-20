const IS_SERVER = typeof window === 'undefined';

export const storage = {
  // 设置缓存
  set(key: string, value: unknown) {
    if (IS_SERVER) return;
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  },

  // 获取缓存
  get(key: string) {
    if (IS_SERVER) return null;
    return localStorage.getItem(key);
  },

  // 获取并解析 JSON 缓存
  getJson<T>(key: string): T | null {
    const value = this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(e);

      return null;
    }
  },

  // 移除单个
  remove(key: string) {
    if (IS_SERVER) return;
    localStorage.removeItem(key);
  },

  // 清空所有登录相关信息
  clearAuth() {
    if (IS_SERVER) return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpires');
  }
};