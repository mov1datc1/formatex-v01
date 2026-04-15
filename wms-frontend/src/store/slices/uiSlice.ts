import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

type FilterDrawerType = 'inventory' | 'orders' | 'products' | 'warehouses' | 'movements' | null;

interface UiState {
  sidebarOpen: boolean;
  filtersDrawerOpen: boolean;
  filtersDrawerType: FilterDrawerType;
}

export const initialState: UiState = {
  sidebarOpen: true,
  filtersDrawerOpen: false,
  filtersDrawerType: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    openFiltersDrawer: (state, action: PayloadAction<FilterDrawerType>) => {
      state.filtersDrawerOpen = true;
      state.filtersDrawerType = action.payload;
    },
    closeFiltersDrawer: (state) => {
      state.filtersDrawerOpen = false;
      state.filtersDrawerType = null;
    },
  },
});

export const { toggleSidebar, setSidebarOpen, openFiltersDrawer, closeFiltersDrawer } = uiSlice.actions;
export default uiSlice.reducer;
