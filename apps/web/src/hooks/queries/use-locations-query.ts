"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type LocationItem } from "@/lib/api";

export function useLocationsQuery() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: () => apiGet<LocationItem[]>("/locations"),
  });
}
