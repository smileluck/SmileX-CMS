import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PublishTask, PublishLog } from '../types';
import { apiService } from '../services/api';

interface PublishState {
  tasks: PublishTask[];
  currentLogs: PublishLog[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PublishState = { tasks: [], currentLogs: [], isLoading: false, error: null };

export const fetchPublishTasks = createAsyncThunk('publish/fetch', async (params?: { status?: string }, { rejectWithValue }) => {
  try {
    return await apiService.getPublishTasks(params);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed');
  }
});

export const createPublishTasks = createAsyncThunk('publish/create', async (data: { article_id: number; platform_account_ids: number[] }, { rejectWithValue }) => {
  try {
    return await apiService.createPublishTask(data);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed');
  }
});

export const fetchPublishLogs = createAsyncThunk('publish/logs', async (taskId: number, { rejectWithValue }) => {
  try {
    return await apiService.getPublishTaskLogs(taskId);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed');
  }
});

const publishSlice = createSlice({
  name: 'publish',
  initialState,
  reducers: { clearError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublishTasks.fulfilled, (state, action) => { state.tasks = action.payload; })
      .addCase(fetchPublishLogs.fulfilled, (state, action) => { state.currentLogs = action.payload; })
      .addCase(createPublishTasks.pending, (state) => { state.isLoading = true; })
      .addCase(createPublishTasks.fulfilled, (state) => { state.isLoading = false; })
      .addCase(createPublishTasks.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
  },
});

export default publishSlice.reducer;
