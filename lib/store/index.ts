import { configureStore } from '@reduxjs/toolkit';
import likesReducer from './slices/likesSlice';

export const store = configureStore({
  reducer: {
    likes: likesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Redux Toolkit allows arrays and objects by default, so no special config needed
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

