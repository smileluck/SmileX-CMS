import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Article, ArticleCreate, ArticleUpdate } from '../types';
import { apiService } from '../services/api';

interface ArticleState {
  articles: Article[];
  currentArticle: Article | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ArticleState = {
  articles: [],
  currentArticle: null,
  isLoading: false,
  error: null,
};

export const fetchArticles = createAsyncThunk(
  'article/fetchArticles',
  async (params: { group_id?: number; status?: string; search?: string }, { rejectWithValue }) => {
    try {
      return await apiService.getArticles(params);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch articles');
    }
  }
);

export const createArticle = createAsyncThunk('article/create', async (data: ArticleCreate, { rejectWithValue }) => {
  try {
    return await apiService.createArticle(data);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to create article');
  }
});

export const updateArticle = createAsyncThunk('article/update', async ({ id, data }: { id: number; data: ArticleUpdate }, { rejectWithValue }) => {
  try {
    return await apiService.updateArticle(id, data);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to update article');
  }
});

export const deleteArticle = createAsyncThunk('article/delete', async (id: number, { rejectWithValue }) => {
  try {
    await apiService.deleteArticle(id);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to delete article');
  }
});

const articleSlice = createSlice({
  name: 'article',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    clearCurrentArticle: (state) => { state.currentArticle = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchArticles.pending, (state) => { state.isLoading = true; })
      .addCase(fetchArticles.fulfilled, (state, action) => { state.isLoading = false; state.articles = action.payload; })
      .addCase(fetchArticles.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })
      .addCase(createArticle.fulfilled, (state, action) => { state.articles.unshift(action.payload); })
      .addCase(updateArticle.fulfilled, (state, action) => {
        const idx = state.articles.findIndex(a => a.id === action.payload.id);
        if (idx >= 0) state.articles[idx] = action.payload;
      })
      .addCase(deleteArticle.fulfilled, (state, action) => {
        state.articles = state.articles.filter(a => a.id !== action.payload);
      });
  },
});

export const { clearError, clearCurrentArticle } = articleSlice.actions;
export default articleSlice.reducer;
