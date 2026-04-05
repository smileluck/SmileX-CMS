import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PlatformAccount, PlatformInfo } from '../types';
import { apiService } from '../services/api';

interface PlatformState {
  accounts: PlatformAccount[];
  availablePlatforms: PlatformInfo[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PlatformState = { accounts: [], availablePlatforms: [], isLoading: false, error: null };

export const fetchPlatforms = createAsyncThunk('platform/fetch', async (_, { rejectWithValue }) => {
  try {
    return await apiService.getPlatformAccounts();
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed');
  }
});

export const fetchAvailablePlatforms = createAsyncThunk('platform/available', async (_, { rejectWithValue }) => {
  try {
    return await apiService.getAvailablePlatforms();
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed');
  }
});

const platformSlice = createSlice({
  name: 'platform',
  initialState,
  reducers: { clearError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlatforms.fulfilled, (state, action) => { state.accounts = action.payload; })
      .addCase(fetchAvailablePlatforms.fulfilled, (state, action) => { state.availablePlatforms = action.payload; });
  },
});

export default platformSlice.reducer;
