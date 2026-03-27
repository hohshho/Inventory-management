import { auth } from "@/lib/firebase/client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:2001";

export type DashboardSummary = {
  itemCount: number;
  locationCount: number;
  totalQuantity: number;
  lowStockCount: number;
  locationSummary: Array<{
    locationId: string;
    locationName: string;
    itemCount: number;
    quantity: number;
  }>;
  recentAdjustments: HistoryEntry[];
};

export type InventoryItem = {
  id: string;
  itemId: string;
  itemName: string;
  barcode: string | null;
  locationId: string;
  locationName: string;
  quantity: number;
  unit: string;
  status: "정상" | "주의" | "부족";
  updatedAtLabel: string;
};

export type LocationItem = {
  id: string;
  name: string;
  type: string;
  description: string;
  itemCount: number;
  quantity: number;
};

export type HistoryEntry = {
  id: string;
  itemName: string;
  locationName: string;
  beforeQuantity: number;
  afterQuantity: number;
  changeType: string;
  reason: string;
  createdAtLabel: string;
};

export type CreateItemInput = {
  name: string;
  barcode?: string;
  defaultUnit: string;
  memo?: string;
  locationId: string;
  initialQuantity: number;
};

export type InventoryAdjustmentInput = {
  inventoryId: string;
  changeType: "increase" | "decrease" | "manual_edit";
  quantity: number;
  reason: string;
};

export type BarcodeResolutionResult = {
  found: boolean;
  inventory?: InventoryItem;
};

export type ItemRecord = {
  id: string;
  name: string;
  barcode: string | null;
  defaultUnit: string;
  memo: string;
  isActive: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
};

export type ItemDetail = {
  item: ItemRecord;
  inventories: InventoryItem[];
  adjustments: HistoryEntry[];
};

export type GroupMembership = {
  id: string;
  groupId: string;
  groupName: string;
  inviteCode: string;
  role: string;
  isActive: boolean;
};

export type UserSession = {
  uid: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  activeGroupId: string | null;
  activeGroupName: string | null;
  memberships: GroupMembership[];
};

async function createHeaders() {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (auth?.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  try {
    const body = (await response.json()) as { message?: string };
    throw new Error(body.message ?? `${response.status} request failed`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`${response.status} request failed`);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await createHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers,
  });

  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await createHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}
