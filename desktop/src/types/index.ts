export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  avatar: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  user_id: number;
  article_count: number;
  video_count: number;
  created_at: string;
}

export interface TagCreate {
  name: string;
  color?: string;
}

export interface TagUpdate {
  name?: string;
  color?: string;
}

export interface TagBrief {
  id: number;
  name: string;
  color: string | null;
}

export interface Article {
  id: number;
  snow_id: string;
  title: string;
  content: string;
  summary: string | null;
  article_type: 'article' | 'video';
  status: 'draft' | 'published' | 'archived';
  file_path: string | null;
  cover_image: string | null;
  group_id: number | null;
  author_id: number;
  tags: string[] | null;
  tag_objects: TagBrief[] | null;
  metadata: Record<string, any> | null;
  current_version: number | null;
  version_count: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleCreate {
  title: string;
  content?: string;
  summary?: string;
  article_type?: string;
  cover_image?: string;
  group_id?: number;
  tags?: string[];
  tag_ids?: number[];
}

export interface ArticleUpdate {
  title?: string;
  content?: string;
  summary?: string;
  status?: string;
  article_type?: string;
  cover_image?: string;
  group_id?: number;
  tags?: string[];
  tag_ids?: number[];
  metadata?: Record<string, any>;
}

export interface Group {
  id: number;
  name: string;
  parent_id: number | null;
  user_id: number;
  sort_order: number;
  created_at: string;
  children?: Group[];
}

export interface GroupCreate {
  name: string;
  parent_id?: number | null;
  sort_order?: number;
}

export interface Media {
  id: number;
  snow_id: string;
  filename: string;
  file_path: string;
  markdown_path?: string;
  file_type: string | null;
  file_size: number | null;
  media_type: 'image' | 'video' | 'audio' | 'other';
  article_id: number | null;
  article_title: string | null;
  user_id: number;
  created_at: string;
}

export interface PlatformAccount {
  id: number;
  platform_name: string;
  account_name: string;
  access_token: string | null;
  status: string;
  token_expires_at: string | null;
  config: Record<string, any> | null;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformAccountCreate {
  platform_name: string;
  account_name: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  cookies?: string;
  config?: Record<string, any>;
}

export interface PublishTask {
  id: number;
  article_id: number;
  platform_account_id: number;
  user_id: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  publish_method: string | null;
  platform_post_id: string | null;
  platform_post_url: string | null;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishLog {
  id: number;
  task_id: number;
  level: 'info' | 'warn' | 'error';
  message: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export interface PublishTaskCreate {
  article_id: number;
  platform_account_ids: number[];
  publish_options?: Record<string, Record<string, any>>;
}

export interface PublishBatchResponse {
  tasks: PublishTask[];
  total: number;
  created: number;
}

export interface PlatformInfo {
  platform_name: string;
  display_name: string;
  supported_types: string[];
  auth_method: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface AppSettings {
  settings: Record<string, string>;
}

export interface ArticlePublishStatus {
  platform_name: string;
  account_name: string;
  status: string;
  platform_post_url: string | null;
  error_message: string | null;
}

export interface ArticleVersion {
  id: number;
  article_id: number;
  version_number: number;
  title: string;
  content: string;
  summary: string | null;
  tags: string[] | null;
  change_summary: string | null;
  created_at: string;
}

export interface ArticleVersionBrief {
  id: number;
  article_id: number;
  version_number: number;
  title: string;
  summary: string | null;
  tags: string[] | null;
  change_summary: string | null;
  created_at: string;
}

export interface VersionDiff {
  version_id: number;
  version_number: number;
  change_summary: string | null;
  diff: string;
  title_diff: { old: string | null; new: string } | null;
}
