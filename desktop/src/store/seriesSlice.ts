import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Series, SeriesCreate, SeriesUpdate } from '../types';
import { apiService } from '../services/api';

interface SeriesState {
  series: Series[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SeriesState = {
  series: [],
  isLoading: false,
  error: null,
};

export const fetchSeries = createAsyncThunk(
  'series/fetchSeries',
  async (_, { rejectWithValue }) => {
    try {
      return await apiService.getSeries();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch series');
    }
  }
);

export const createSeries = createAsyncThunk(
  'series/create',
  async (data: SeriesCreate, { rejectWithValue }) => {
    try {
      return await apiService.createSeries(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create series');
    }
  }
);

export const updateSeries = createAsyncThunk(
  'series/update',
  async ({ id, data }: { id: number; data: SeriesUpdate }, { rejectWithValue }) => {
    try {
      return await apiService.updateSeries(id, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update series');
    }
  }
);

export const deleteSeries = createAsyncThunk(
  'series/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiService.deleteSeries(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete series');
    }
  }
);

const seriesSlice = createSlice({
  name: 'series',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeries.pending, (state) => { state.isLoading = true; })
      .addCase(fetchSeries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.series = action.payload;
      })
      .addCase(fetchSeries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createSeries.fulfilled, (state, action) => {
        state.series.push(action.payload);
      })
      .addCase(updateSeries.fulfilled, (state, action) => {
        const idx = state.series.findIndex(s => s.id === action.payload.id);
        if (idx >= 0) state.series[idx] = action.payload;
      })
      .addCase(deleteSeries.fulfilled, (state, action) => {
        state.series = state.series.filter(s => s.id !== action.payload);
      });
  },
});

export const { clearError } = seriesSlice.actions;
export default seriesSlice.reducer;
