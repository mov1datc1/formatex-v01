import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';

// Persist auth state to localStorage manually (more reliable than redux-persist)
const loadState = (): { auth?: ReturnType<typeof authReducer> } => {
  try {
    const serialized = localStorage.getItem('wms360_auth');
    if (serialized === null) return {};
    return { auth: JSON.parse(serialized) };
  } catch {
    return {};
  }
};

const saveState = (state: { auth: ReturnType<typeof authReducer> }) => {
  try {
    localStorage.setItem('wms360_auth', JSON.stringify(state.auth));
  } catch {
    // ignore
  }
};

const preloadedState = loadState();

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: preloadedState as any,
});

// Subscribe to save auth state changes
store.subscribe(() => {
  saveState({ auth: store.getState().auth });
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
