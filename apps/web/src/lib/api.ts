import { auth } from "@/lib/firebase/client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:2001";

export type MembershipRole = "owner" | "full" | "write" | "read";
export type InventoryStatus = "정상" | "주의" | "부족";
export type JoinRequestStatus = "pending" | "approved" | "rejected";

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
  lowStockThreshold: number;
  isLowStock: boolean;
  status: InventoryStatus;
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
  itemId: string;
  itemName: string;
  locationName: string;
  beforeQuantity: number;
  afterQuantity: number;
  changeType: string;
  reason: string;
  createdByName: string;
  counterpartyName: string | null;
  relatedLocationName: string | null;
  createdAtLabel: string;
};

export type CreateItemInput = {
  name: string;
  barcode?: string;
  categoryLevel1?: string;
  categoryLevel2?: string;
  categoryLevel3?: string;
  size?: string;
  customFields?: ItemCustomField[];
  defaultUnit: string;
  memo?: string;
  locationId: string;
  initialQuantity: number;
  lowStockThreshold?: number;
};

export type UpdateItemInput = {
  itemId: string;
  name: string;
  barcode?: string;
  categoryLevel1?: string;
  categoryLevel2?: string;
  categoryLevel3?: string;
  size?: string;
  customFields?: ItemCustomField[];
  defaultUnit: string;
  memo?: string;
  lowStockThreshold: number;
};

export type ItemCustomField = {
  label: string;
  value: string;
};

export type CreateLocationInput = {
  name: string;
  type?: string;
  description?: string;
};

export type UpdateLocationInput = CreateLocationInput & {
  locationId: string;
};

export type DeleteLocationInput = {
  locationId: string;
};

export type CounterpartyType = "supplier" | "customer";

export type Counterparty = {
  id: string;
  name: string;
  type: CounterpartyType;
  contact: string;
  notes: string;
};

export type CreateCounterpartyInput = {
  name: string;
  type: CounterpartyType;
  contact?: string;
  notes?: string;
};

export type UpdateCounterpartyInput = CreateCounterpartyInput & {
  counterpartyId: string;
};

export type DeleteCounterpartyInput = {
  counterpartyId: string;
};

export type InventoryAdjustmentInput = {
  inventoryId: string;
  changeType: "increase" | "decrease" | "manual_edit" | "transfer";
  quantity: number;
  reason: string;
  targetLocationId?: string;
  counterpartyId?: string;
};

export type BarcodeResolutionResult = {
  found: boolean;
  inventory?: InventoryItem;
};

export type PlannerCadence = "daily" | "weekly" | "monthly";

export type PlannerTask = {
  id: string;
  title: string;
  cadence: PlannerCadence;
  dueDate: string;
  reminderAt: string | null;
  reminderAtLabel: string | null;
  isDone: boolean;
  createdByName: string;
};

export type PlannerMemo = {
  id: string;
  memoDate: string;
  note: string;
  createdByName: string;
  updatedAtLabel: string;
};

export type PlannerSummary = {
  month: string;
  tasks: PlannerTask[];
  memos: PlannerMemo[];
};

export type CreatePlannerTaskInput = {
  title: string;
  cadence: PlannerCadence;
  dueDate: string;
  reminderAt?: string | null;
};

export type TogglePlannerTaskInput = {
  taskId: string;
  isDone: boolean;
};

export type DeletePlannerTaskInput = {
  taskId: string;
};

export type UpsertPlannerMemoInput = {
  memoDate: string;
  note: string;
};

export type ItemRecord = {
  id: string;
  name: string;
  barcode: string | null;
  categoryLevel1: string;
  categoryLevel2: string;
  categoryLevel3: string;
  size: string;
  customFields: ItemCustomField[];
  defaultUnit: string;
  memo: string;
  lowStockThreshold: number;
  isActive: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
};

export type ItemDetail = {
  item: ItemRecord;
  inventories: InventoryItem[];
  adjustments: HistoryEntry[];
};

export type HistoricalSnapshot = {
  at: string;
  atLabel: string;
  rows: Array<{
    locationId: string;
    locationName: string;
    quantity: number;
    unit: string;
    status: InventoryStatus;
  }>;
};

export type LowStockAlert = {
  inventoryId: string;
  itemId: string;
  itemName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  status: InventoryStatus;
};

export type GroupMembership = {
  id: string;
  groupId: string;
  groupName: string;
  inviteCode: string | null;
  role: MembershipRole;
  isActive: boolean;
};

export type GroupMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MembershipRole;
  isCurrentUser: boolean;
  isActive: boolean;
};

export type GroupJoinRequest = {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: JoinRequestStatus;
  requestedAtLabel: string;
};

export type JoinGroupResult = {
  status: "pending" | "already_member";
  message: string;
  session?: UserSession;
};

export type UserSession = {
  uid: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  activeGroupId: string | null;
  activeGroupName: string | null;
  activeGroupRole: MembershipRole | null;
  memberships: GroupMembership[];
};

export type SyncUserInput = {
  name?: string;
  email?: string;
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

