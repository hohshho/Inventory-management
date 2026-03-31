import { create } from "zustand";

type StockBrowseState = {
  keyword: string;
  zoneId: string;
  setKeyword: (value: string) => void;
  setZoneId: (value: string) => void;
};

export const useStockBrowseState = create<StockBrowseState>((setState) => ({
  keyword: "",
  zoneId: "all",
  setKeyword: (value) => setState({ keyword: value }),
  setZoneId: (value) => setState({ zoneId: value }),
}));
