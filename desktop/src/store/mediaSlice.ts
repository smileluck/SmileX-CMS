import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Media } from '../types';
import { apiService } from '../services/api';

interface MediaState {
  items: Media[];
  isLoading: boolean;
  error: string | null;
}

const initialState: MediaState = { items: [], isLoading: false, error: null };

export const fetchMedia = createAsyncThunk('media/fetch', async (params?: { media_type?: string }, { rejectWithValue }) => {
  try {
    return await apiService.getMediaFiles(params);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed');
  }
});

export const uploadMedia = createAsyncThunk('media/upload', async (file: File, { rejectWithValue }) => {
  try {
    return await apiService.uploadFile(file);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Upload failed');
  }
});

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: { clearError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMedia.pending, (state) => { state.isLoading = true; })
      .addCase(fetchMedia.fulfilled, (state, action) => { state.isLoading = false; state.items = action.payload; })
      .addCase(fetchMedia.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })
      .addCase(uploadMedia.fulfilled, (state, action) => { state.items.unshift(action.payload); });
  },
});

export const { clearError } = mediaSlice.actions;
export default mediaSlice.reducer;
