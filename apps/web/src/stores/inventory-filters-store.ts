import { create } from "zustand";

type InventoryFiltersState = {
  search: string;
  locationId: string;
  setSearch: (value: string) => void;
  setLocationId: (value: string) => void;
};

export const useInventoryFiltersStore = create<InventoryFiltersState>((set) => ({
  search: "",
  locationId: "all",
  setSearch: (value) => set({ search: value }),
  setLocationId: (value) => set({ locationId: value }),
}));
