"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type InventoryItem } from "@/lib/api";

type Params = {
  search: string;
  locationId: string;
};

export function useInventoryQuery({ search, locationId }: Params) {
  const query = new URLSearchParams();

  if (search) {
    query.set("search", search);
  }

  if (locationId && locationId !== "all") {
    query.set("locationId", locationId);
  }

  return useQuery({
    queryKey: ["inventories", search, locationId],
    queryFn: () => apiGet<InventoryItem[]>(`/inventories?${query.toString()}`),
  });
}
