import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import articleReducer from './articleSlice';
import mediaReducer from './mediaSlice';
import platformReducer from './platformSlice';
import publishReducer from './publishSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    article: articleReducer,
    media: mediaReducer,
    platform: platformReducer,
    publish: publishReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
