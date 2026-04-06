import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Tag, TagCreate, TagUpdate } from '../types';
import { apiService } from '../services/api';

interface TagState {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TagState = {
  tags: [],
  isLoading: false,
  error: null,
};

export const fetchTags = createAsyncThunk(
  'tag/fetchTags',
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.getTags();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch tags');
    }
  }
);

export const createTag = createAsyncThunk(
  'tag/create',
  async (data: TagCreate, { rejectWithValue }) => {
    try {
      return await apiService.createTag(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create tag');
    }
  }
);

export const updateTag = createAsyncThunk(
  'tag/update',
  async ({ id, data }: { id: number; data: TagUpdate }, { rejectWithValue }) => {
    try {
      return await apiService.updateTag(id, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update tag');
    }
  }
);

export const deleteTag = createAsyncThunk(
  'tag/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiService.deleteTag(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete tag');
    }
  }
);

const tagSlice = createSlice({
  name: 'tag',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTags.pending, (state) => { state.isLoading = true; })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tags = action.payload;
      })
      .addCase(fetchTags.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createTag.fulfilled, (state, action) => {
        state.tags.push(action.payload);
      })
      .addCase(updateTag.fulfilled, (state, action) => {
        const idx = state.tags.findIndex(t => t.id === action.payload.id);
        if (idx >= 0) state.tags[idx] = action.payload;
      })
      .addCase(deleteTag.fulfilled, (state, action) => {
        state.tags = state.tags.filter(t => t.id !== action.payload);
      });
  },
});

export const { clearError } = tagSlice.actions;
export default tagSlice.reducer;
