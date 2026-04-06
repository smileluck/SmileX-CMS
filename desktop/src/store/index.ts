import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import articleReducer from './articleSlice';
import mediaReducer from './mediaSlice';
import platformReducer from './platformSlice';
import publishReducer from './publishSlice';
import tagReducer from './tagSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    article: articleReducer,
    media: mediaReducer,
    platform: platformReducer,
    publish: publishReducer,
    tag: tagReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
