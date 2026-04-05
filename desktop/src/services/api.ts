import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Token, User, UserCreate,
  Article, ArticleCreate, ArticleUpdate,
  Media,
  PlatformAccount, PlatformAccountCreate, PlatformInfo,
  PublishTask, PublishTaskCreate, PublishLog, PublishBatchResponse,
} from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'http://localhost:8000/api',
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
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(username: string, password: string): Promise<Token> {
    const { data } = await this.client.post<Token>('/auth/login', null, { params: { username, password } });
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

  async getArticles(params?: { group_id?: number; status?: string; search?: string }): Promise<Article[]> {
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
}

export const apiService = new ApiService();
