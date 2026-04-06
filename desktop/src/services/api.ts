import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Token, User, UserCreate,
  Article, ArticleCreate, ArticleUpdate,
  Tag, TagCreate, TagUpdate,
  Media,
  PlatformAccount, PlatformAccountCreate, PlatformInfo,
  PublishTask, PublishTaskCreate, PublishLog, PublishBatchResponse,
} from '../types';

const getBaseURL = (): string => {
  const stored = localStorage.getItem('apiUrl');
  return stored || 'http://localhost:8000/api';
};

class ApiService {
  private client: AxiosInstance;
  public baseURL: string;

  constructor() {
    this.baseURL = getBaseURL();
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setBaseURL(url: string) {
    this.baseURL = url;
    localStorage.setItem('apiUrl', url);
    this.client.defaults.baseURL = url;
  }

  async login(username: string, password: string): Promise<Token> {
    const { data } = await this.client.post<Token>('/auth/login', { username, password });
    return data;
  }

  async register(user: UserCreate): Promise<User> {
    const { data } = await this.client.post<User>('/auth/register', user);
    return data;
  }

  async getCurrentUser(): Promise<User> {
    const { data } = await this.client.get<User>('/auth/me');
    return data;
  }

  async getArticles(params?: { group_id?: number; status?: string; search?: string; tag_id?: number; article_type?: string }): Promise<Article[]> {
    const { data } = await this.client.get<Article[]>('/articles', { params });
    return data;
  }

  async getArticleById(id: number): Promise<Article> {
    const { data } = await this.client.get<Article>(`/articles/${id}`);
    return data;
  }

  async createArticle(article: ArticleCreate): Promise<Article> {
    const { data } = await this.client.post<Article>('/articles', article);
    return data;
  }

  async updateArticle(id: number, articleUpdate: ArticleUpdate): Promise<Article> {
    const { data } = await this.client.put<Article>(`/articles/${id}`, articleUpdate);
    return data;
  }

  async deleteArticle(id: number): Promise<void> {
    await this.client.delete(`/articles/${id}`);
  }

  async duplicateArticle(id: number): Promise<Article> {
    const { data } = await this.client.post<Article>(`/articles/${id}/duplicate`);
    return data;
  }

  async uploadFile(file: File): Promise<Media> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post<Media>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async uploadToArticle(articleId: number, file: File): Promise<Media> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post<Media>(`/media/upload-to-article/${articleId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async getMediaFiles(params?: { media_type?: string }): Promise<Media[]> {
    const { data } = await this.client.get<Media[]>('/media', { params });
    return data;
  }

  async deleteMedia(id: number): Promise<void> {
    await this.client.delete(`/media/${id}`);
  }

  async getPlatformAccounts(): Promise<PlatformAccount[]> {
    const { data } = await this.client.get<PlatformAccount[]>('/platforms');
    return data;
  }

  async getAvailablePlatforms(): Promise<PlatformInfo[]> {
    const { data } = await this.client.get<PlatformInfo[]>('/platforms/available');
    return data;
  }

  async bindPlatformAccount(account: PlatformAccountCreate): Promise<PlatformAccount> {
    const { data } = await this.client.post<PlatformAccount>('/platforms/bind', account);
    return data;
  }

  async unbindPlatformAccount(id: number): Promise<void> {
    await this.client.delete(`/platforms/${id}`);
  }

  async updatePlatformAccount(id: number, data: Partial<{ account_name: string; access_token: string; refresh_token: string; cookies: string; config: Record<string, any>; status: string }>): Promise<PlatformAccount> {
    const { data: result } = await this.client.put<PlatformAccount>(`/platforms/${id}`, data);
    return result;
  }

  async testPlatformConnection(id: number): Promise<{ connected: boolean }> {
    const { data } = await this.client.post<{ connected: boolean }>(`/platforms/${id}/test`);
    return data;
  }

  async createPublishTask(task: PublishTaskCreate): Promise<PublishBatchResponse> {
    const { data } = await this.client.post<PublishBatchResponse>('/publish', task);
    return data;
  }

  async getPublishTasks(params?: { status?: string }): Promise<PublishTask[]> {
    const { data } = await this.client.get<PublishTask[]>('/publish/tasks', { params });
    return data;
  }

  async getPublishTaskById(id: number): Promise<PublishTask> {
    const { data } = await this.client.get<PublishTask>(`/publish/tasks/${id}`);
    return data;
  }

  async getPublishTaskLogs(taskId: number): Promise<PublishLog[]> {
    const { data } = await this.client.get<PublishLog[]>(`/publish/tasks/${taskId}/logs`);
    return data;
  }

  async retryPublishTask(id: number): Promise<PublishTask> {
    const { data } = await this.client.post<PublishTask>(`/publish/tasks/${id}/retry`);
    return data;
  }

  async cancelPublishTask(id: number): Promise<void> {
    await this.client.post(`/publish/tasks/${id}/cancel`);
  }

  async getTags(): Promise<Tag[]> {
    const { data } = await this.client.get<Tag[]>('/tags');
    return data;
  }

  async createTag(tag: TagCreate): Promise<Tag> {
    const { data } = await this.client.post<Tag>('/tags', tag);
    return data;
  }

  async updateTag(id: number, tag: TagUpdate): Promise<Tag> {
    const { data } = await this.client.put<Tag>(`/tags/${id}`, tag);
    return data;
  }

  async deleteTag(id: number): Promise<void> {
    await this.client.delete(`/tags/${id}`);
  }

  async getTagArticles(tagId: number): Promise<Article[]> {
    const { data } = await this.client.get<Article[]>(`/tags/${tagId}/articles`);
    return data;
  }

  async migrateLegacyTags(): Promise<{ migrated: number }> {
    const { data } = await this.client.post<{ migrated: number }>('/tags/migrate-legacy');
    return data;
  }

  getMediaUrl(filePath: string): string {
    const base = this.baseURL.replace('/api', '');
    if (filePath.startsWith('http')) return filePath;
    if (filePath.startsWith('./') || filePath.startsWith('uploads/')) {
      return `${base}/${filePath.replace(/^\.\//, '')}`;
    }
    return `${base}/${filePath}`;
  }

  async getArticlePublishStatus(articleId: number): Promise<Array<{
    platform_name: string;
    account_name: string;
    status: string;
    platform_post_url: string | null;
    error_message: string | null;
    task_id: number;
  }>> {
    const { data } = await this.client.get(`/articles/${articleId}/publish-status`);
    return data;
  }

  async getArticlesPublishSummary(): Promise<Record<number, Array<{
    platform_name: string;
    account_name: string;
    status: string;
    platform_post_url: string | null;
    error_message: string | null;
  }>>> {
    const { data } = await this.client.get('/articles/publish-summary/batch');
    return data;
  }
}

export const apiService = new ApiService();
