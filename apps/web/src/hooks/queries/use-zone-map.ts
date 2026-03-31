"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type LocationItem } from "@/lib/api";

export function useZoneMap() {
  return useQuery({
    queryKey: ["zone-map"],
    queryFn: () => apiGet<LocationItem[]>("/locations"),
  });
}
