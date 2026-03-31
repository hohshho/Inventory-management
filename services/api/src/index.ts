import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Query,
} from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebase-admin.js";

type MembershipRole = "owner" | "full" | "write" | "read";

type ItemPayload = {
  name?: string;
  barcode?: string;
  defaultUnit?: string;
  memo?: string;
  locationId?: string;
  initialQuantity?: number;
  lowStockThreshold?: number;
};

type InventoryAdjustmentPayload = {
  inventoryId?: string;
  changeType?: "increase" | "decrease" | "manual_edit" | "transfer";
  quantity?: number;
  reason?: string;
  targetLocationId?: string;
  counterpartyId?: string;
};

type GroupPayload = {
  name?: string;
};

type DeleteGroupPayload = {
  groupId?: string;
};

type LocationPayload = {
  name?: string;
  type?: string;
  description?: string;
};

type UpdateLocationPayload = {
  locationId?: string;
  name?: string;
  type?: string;
  description?: string;
};

type DeleteLocationPayload = {
  locationId?: string;
};

type CounterpartyPayload = {
  name?: string;
  type?: "supplier" | "customer";
  contact?: string;
  notes?: string;
};

type UpdateCounterpartyPayload = {
  counterpartyId?: string;
  name?: string;
  type?: "supplier" | "customer";
  contact?: string;
  notes?: string;
};

type DeleteCounterpartyPayload = {
  counterpartyId?: string;
};

type JoinGroupPayload = {
  inviteCode?: string;
};

type SelectGroupPayload = {
  groupId?: string;
};

type UpdateMemberRolePayload = {
  targetUserId?: string;
  role?: MembershipRole;
};

type ReviewJoinRequestPayload = {
  requestId?: string;
  role?: MembershipRole;
};

type SyncUserPayload = {
  name?: string;
};

type PlannerTaskPayload = {
  title?: string;
  cadence?: "daily" | "weekly" | "monthly";
  dueDate?: string;
  reminderAt?: string | null;
};

type PlannerTaskTogglePayload = {
  taskId?: string;
  isDone?: boolean;
};

type PlannerMemoPayload = {
  memoDate?: string;
  note?: string;
};

type UserProfile = {
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  activeGroupId?: string | null;
};

type GroupMembership = {
  id: string;
  groupId: string;
  groupName: string;
  inviteCode: string | null;
  role: MembershipRole;
  isActive: boolean;
};

type GroupMemberRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MembershipRole;
  isCurrentUser: boolean;
  isActive: boolean;
};

type JoinRequestStatus = "pending" | "approved" | "rejected";

type GroupJoinRequestRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: JoinRequestStatus;
  requestedAtLabel: string;
};

type JoinGroupResult = {
  status: "pending" | "already_member";
  message: string;
  session?: UserSession;
};

type UserSession = {
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

type ItemRecord = {
  id: string;
  name: string;
  barcode: string | null;
  defaultUnit: string;
  memo: string;
  lowStockThreshold: number;
  isActive: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
};

type LocationRecord = {
  id: string;
  name: string;
  type: string;
  description: string;
  itemCount: number;
  quantity: number;
};

type CounterpartyRecord = {
  id: string;
  name: string;
  type: "supplier" | "customer";
  contact: string;
  notes: string;
};

type InventoryStatus = "정상" | "주의" | "부족";

type InventoryRecord = {
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

type AdjustmentRecord = {
  id: string;
  itemId: string;
  itemName: string;
  locationId: string;
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

type HistoricalSnapshotRecord = {
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

type LowStockAlertRecord = {
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

type PlannerTaskRecord = {
  id: string;
  title: string;
  cadence: "daily" | "weekly" | "monthly";
  dueDate: string;
  reminderAt: string | null;
  reminderAtLabel: string | null;
  isDone: boolean;
  createdByName: string;
};

type PlannerMemoRecord = {
  id: string;
  memoDate: string;
  note: string;
  createdByName: string;
  updatedAtLabel: string;
};

type PlannerSummaryRecord = {
  month: string;
  tasks: PlannerTaskRecord[];
  memos: PlannerMemoRecord[];
};

const port = Number(process.env.PORT ?? 2001);
const MAX_GROUPS_PER_USER = 5;
const MAX_ITEMS_PER_GROUP = 300;
const MASTER_EMAIL = "devhshoon@gmail.com";

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN ?? "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function getTimestampLabel(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString("ko-KR");
  }

  return "방금 전";
}

function getInventoryStatus(quantity: number, lowStockThreshold = 3): InventoryStatus {
  const safeThreshold = Math.max(1, lowStockThreshold);

  if (quantity <= safeThreshold) {
    return "부족";
  }

  if (quantity <= safeThreshold + 2) {
    return "주의";
  }

  return "정상";
}

function mapItem(doc: { id: string; data(): DocumentData }): ItemRecord {
  const data = doc.data();

  return {
    id: doc.id,
    name: data.name,
    barcode: data.barcode ?? null,
    defaultUnit: data.defaultUnit ?? "ea",
    memo: data.memo ?? "",
    lowStockThreshold: Number(data.lowStockThreshold ?? 3),
    isActive: data.isActive !== false,
    createdAtLabel: getTimestampLabel(data.createdAt),
    updatedAtLabel: getTimestampLabel(data.updatedAt),
  };
}

function mapInventory(doc: { id: string; data(): DocumentData }): InventoryRecord {
  const data = doc.data();
  const quantity = Number(data.quantity ?? 0);
  const lowStockThreshold = Number(data.lowStockThreshold ?? 3);
  const status = getInventoryStatus(quantity, lowStockThreshold);

  return {
    id: doc.id,
    itemId: data.itemId,
    itemName: data.itemName,
    barcode: data.barcode ?? null,
    locationId: data.locationId,
    locationName: data.locationName,
    quantity,
    unit: data.unit ?? "ea",
    lowStockThreshold,
    isLowStock: quantity <= lowStockThreshold + 2,
    status,
    updatedAtLabel: getTimestampLabel(data.updatedAt),
  };
}

function mapAdjustment(doc: { id: string; data(): DocumentData }): AdjustmentRecord {
  const data = doc.data();

  return {
    id: doc.id,
    itemId: data.itemId,
    itemName: data.itemName,
    locationId: data.locationId,
    locationName: data.locationName,
    beforeQuantity: Number(data.beforeQuantity ?? 0),
    afterQuantity: Number(data.afterQuantity ?? 0),
    changeType: data.changeType ?? "manual_edit",
    reason: data.reason ?? "-",
    createdByName: data.createdByName ?? data.createdBy ?? "-",
    counterpartyName: data.counterpartyName ?? null,
    relatedLocationName: data.relatedLocationName ?? null,
    createdAtLabel: getTimestampLabel(data.createdAt),
  };
}

function mapCounterparty(doc: { id: string; data(): DocumentData }): CounterpartyRecord {
  const data = doc.data();

  return {
    id: doc.id,
    name: data.name ?? "",
    type: data.type === "customer" ? "customer" : "supplier",
    contact: data.contact ?? "",
    notes: data.notes ?? "",
  };
}

function mapJoinRequest(doc: { id: string; data(): DocumentData }): GroupJoinRequestRecord {
  const data = doc.data();

  return {
    id: doc.id,
    userId: data.userId,
    name: data.name ?? data.email ?? data.userId,
    email: data.email ?? "",
    status: normalizeJoinRequestStatus(data.status),
    requestedAtLabel: getTimestampLabel(data.requestedAt),
  };
}

function formatReminderLabel(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR");
}

function mapPlannerTask(doc: { id: string; data(): DocumentData }): PlannerTaskRecord {
  const data = doc.data();

  return {
    id: doc.id,
    title: data.title ?? "",
    cadence: data.cadence ?? "daily",
    dueDate: data.dueDate ?? "",
    reminderAt: data.reminderAt ?? null,
    reminderAtLabel: formatReminderLabel(data.reminderAt ?? null),
    isDone: data.isDone === true,
    createdByName: data.createdByName ?? data.createdBy ?? "-",
  };
}

function mapPlannerMemo(doc: { id: string; data(): DocumentData }): PlannerMemoRecord {
  const data = doc.data();

  return {
    id: doc.id,
    memoDate: data.memoDate ?? "",
    note: data.note ?? "",
    createdByName: data.createdByName ?? data.createdBy ?? "-",
    updatedAtLabel: getTimestampLabel(data.updatedAt ?? data.createdAt),
  };
}

async function verifyRequest(request: IncomingMessage) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.replace("Bearer ", "");
  return adminAuth.verifyIdToken(token);
}

async function getProfile(userId: string): Promise<UserProfile> {
  const profileDoc = await adminDb.collection("users").doc(userId).get();

  if (!profileDoc.exists) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  return profileDoc.data() as UserProfile;
}

async function requireActiveUser(user: DecodedIdToken) {
  const profile = await getProfile(user.uid);

  if (!profile.isActive) {
    throw new Error("USER_DISABLED");
  }

  return profile;
}

function requireActiveGroup(profile: UserProfile) {
  if (!profile.activeGroupId) {
    throw new Error("GROUP_REQUIRED");
  }

  return profile.activeGroupId;
}

function isMembershipRole(value: unknown): value is MembershipRole {
  return value === "owner" || value === "full" || value === "write" || value === "read";
}

function normalizeMembershipRole(value: unknown): MembershipRole {
  if (value === "staff") {
    return "full";
  }

  if (isMembershipRole(value)) {
    return value;
  }

  return "read";
}

function canWriteInventory(role: MembershipRole) {
  return role === "owner" || role === "full" || role === "write";
}

function normalizeGroupName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeParticipantName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isJoinRequestStatus(value: unknown): value is JoinRequestStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

function normalizeJoinRequestStatus(value: unknown): JoinRequestStatus {
  if (isJoinRequestStatus(value)) {
    return value;
  }

  return "pending";
}

function isMasterProfile(profile: UserProfile | null | undefined) {
  return profile?.role === "master";
}

async function getEffectiveMembershipDoc(groupId: string, userId: string) {
  const membershipDoc = await adminDb
    .collection("group_memberships")
    .doc(`${groupId}_${userId}`)
    .get();

  if (membershipDoc.exists && membershipDoc.data()?.isActive !== false) {
    return membershipDoc;
  }

  const profile = await getProfile(userId);

  if (isMasterProfile(profile)) {
    const groupDoc = await getGroupDoc(groupId);

    return {
      exists: true,
      id: `master_${groupId}`,
      ref: groupDoc.ref,
      data: () => ({
        groupId,
        userId,
        role: "owner",
        isActive: true,
      }),
    };
  }

  throw new Error("MEMBERSHIP_NOT_FOUND");
}

async function getGroupDoc(groupId: string) {
  const groupDoc = await adminDb.collection("groups").doc(groupId).get();

  if (!groupDoc.exists || groupDoc.data()?.isActive === false) {
    throw new Error("GROUP_NOT_FOUND");
  }

  return groupDoc;
}

async function getMembershipDoc(groupId: string, userId: string) {
  return getEffectiveMembershipDoc(groupId, userId);
}

async function getJoinRequestDoc(requestId: string) {
  const joinRequestDoc = await adminDb.collection("group_join_requests").doc(requestId).get();

  if (!joinRequestDoc.exists) {
    throw new Error("JOIN_REQUEST_NOT_FOUND");
  }

  return joinRequestDoc;
}

function requireJoinRequestData(doc: { data(): DocumentData | undefined }) {
  const data = doc.data();

  if (!data) {
    throw new Error("JOIN_REQUEST_NOT_FOUND");
  }

  return data;
}

async function requireOwner(groupId: string, userId: string) {
  const membershipDoc = await getMembershipDoc(groupId, userId);

  if (normalizeMembershipRole(membershipDoc.data()?.role) !== "owner") {
    throw new Error("OWNER_REQUIRED");
  }

  return membershipDoc;
}

async function requireInventoryWriteAccess(groupId: string, userId: string) {
  const membershipDoc = await getMembershipDoc(groupId, userId);
  const membershipRole = normalizeMembershipRole(membershipDoc.data()?.role);

  if (!canWriteInventory(membershipRole)) {
    throw new Error("WRITE_PERMISSION_REQUIRED");
  }

  return membershipRole;
}

async function getMemberships(userId: string) {
  const profile = await getProfile(userId);

  if (isMasterProfile(profile)) {
    const groupSnapshot = await adminDb
      .collection("groups")
      .where("isActive", "==", true)
      .get();

    return groupSnapshot.docs.map((groupDoc) => {
      const groupData = groupDoc.data();

      return {
        id: `master_${groupDoc.id}`,
        groupId: groupDoc.id,
        groupName: groupData.name,
        inviteCode: groupData.inviteCode ?? null,
        role: "owner",
        isActive: true,
      } satisfies GroupMembership;
    });
  }

  const membershipSnapshot = await adminDb
    .collection("group_memberships")
    .where("userId", "==", userId)
    .where("isActive", "==", true)
    .get();

  const memberships = await Promise.all(
    membershipSnapshot.docs.map(async (membershipDoc) => {
      const membershipData = membershipDoc.data();
      const groupDoc = await adminDb.collection("groups").doc(membershipData.groupId).get();

      if (!groupDoc.exists || groupDoc.data()?.isActive === false) {
        return null;
      }

      const groupData = groupDoc.data()!;
      const role = normalizeMembershipRole(membershipData.role);

      return {
        id: membershipDoc.id,
        groupId: membershipData.groupId,
        groupName: groupData.name,
        inviteCode: role === "owner" ? groupData.inviteCode ?? null : null,
        role,
        isActive: membershipData.isActive !== false,
      } satisfies GroupMembership;
    }),
  );

  return memberships.filter((membership): membership is GroupMembership => Boolean(membership));
}

async function buildSession(userId: string): Promise<UserSession> {
  const profile = await getProfile(userId);
  const memberships = await getMemberships(userId);
  const activeMembership =
    memberships.find((membership) => membership.groupId === profile.activeGroupId) ?? null;

  return {
    uid: userId,
    email: profile.email ?? "",
    name: profile.name ?? profile.email ?? userId,
    role: profile.role ?? "staff",
    isActive: profile.isActive !== false,
    activeGroupId: profile.activeGroupId ?? null,
    activeGroupName: activeMembership?.groupName ?? null,
    activeGroupRole: activeMembership?.role ?? null,
    memberships,
  };
}

async function assertGroupNameAvailable(name: string, userId: string) {
  const normalizedName = normalizeGroupName(name);
  const existingGroupSnapshot = await adminDb
    .collection("groups")
    .where("nameKey", "==", normalizedName)
    .where("createdBy", "==", userId)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!existingGroupSnapshot.empty) {
    throw new Error("GROUP_NAME_EXISTS");
  }
}

async function getLocationDoc(locationId: string) {
  const locationDoc = await adminDb.collection("locations").doc(locationId).get();

  if (!locationDoc.exists || locationDoc.data()?.isActive === false) {
    throw new Error("LOCATION_NOT_FOUND");
  }

  return locationDoc;
}

async function getCounterpartyDoc(counterpartyId: string) {
  const counterpartyDoc = await adminDb.collection("counterparties").doc(counterpartyId).get();

  if (!counterpartyDoc.exists || counterpartyDoc.data()?.isActive === false) {
    throw new Error("COUNTERPARTY_NOT_FOUND");
  }

  return counterpartyDoc;
}

async function assertGroupCreationLimit(userId: string) {
  const ownedGroupsSnapshot = await adminDb
    .collection("groups")
    .where("createdBy", "==", userId)
    .where("isActive", "==", true)
    .get();

  if (ownedGroupsSnapshot.size >= MAX_GROUPS_PER_USER) {
    throw new Error("GROUP_LIMIT_REACHED");
  }
}

async function assertItemLimit(groupId: string) {
  const itemsSnapshot = await adminDb
    .collection("items")
    .where("groupId", "==", groupId)
    .where("isActive", "==", true)
    .get();

  if (itemsSnapshot.size >= MAX_ITEMS_PER_GROUP) {
    throw new Error("ITEM_LIMIT_REACHED");
  }
}

async function assertParticipantNameAvailable(
  groupId: string,
  displayName: string,
  excludeUserId?: string,
) {
  const targetName = normalizeParticipantName(displayName);
  const membershipSnapshot = await adminDb
    .collection("group_memberships")
    .where("groupId", "==", groupId)
    .where("isActive", "==", true)
    .get();

  for (const membershipDoc of membershipSnapshot.docs) {
    const membershipData = membershipDoc.data();
    const memberUserId = membershipData.userId as string;

    if (excludeUserId && memberUserId === excludeUserId) {
      continue;
    }

    const userDoc = await adminDb.collection("users").doc(memberUserId).get();

    if (!userDoc.exists) {
      continue;
    }

    const participantName = normalizeParticipantName(userDoc.data()?.name ?? "");

    if (participantName && participantName === targetName) {
      throw new Error("PARTICIPANT_NAME_EXISTS");
    }
  }
}

async function syncUser(user: DecodedIdToken, body?: SyncUserPayload) {
  const userRef = adminDb.collection("users").doc(user.uid);
  const existing = await userRef.get();
  const existingData = existing.exists ? (existing.data() as UserProfile) : null;
  const preferredName = body?.name?.trim();
  const nextName =
    preferredName ||
    user.name ||
    user.email?.split("@")[0] ||
    existingData?.name ||
    user.uid;

  const existingMembershipSnapshot = await adminDb
    .collection("group_memberships")
    .where("userId", "==", user.uid)
    .where("isActive", "==", true)
    .get();

  for (const membershipDoc of existingMembershipSnapshot.docs) {
    const membershipData = membershipDoc.data();
    await assertParticipantNameAvailable(membershipData.groupId, nextName, user.uid);
  }

  await userRef.set(
    {
      email: user.email ?? existingData?.email ?? "",
      name: nextName,
      role:
        (user.email ?? "").toLowerCase() === MASTER_EMAIL
          ? "master"
          : existingData?.role ?? "staff",
      isActive: existingData?.isActive ?? true,
      activeGroupId: existingData?.activeGroupId ?? null,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  return buildSession(user.uid);
}

async function getItems(profile: UserProfile, params: URLSearchParams) {
  const groupId = requireActiveGroup(profile);
  const search = params.get("search")?.trim().toLowerCase() ?? "";
  const snapshot = await adminDb
    .collection("items")
    .where("groupId", "==", groupId)
    .where("isActive", "==", true)
    .get();
  const items = snapshot.docs.map(mapItem);

  return items.filter((item) => {
    if (!search) {
      return true;
    }

    return (
      item.name.toLowerCase().includes(search) ||
      item.barcode?.toLowerCase().includes(search)
    );
  });
}

async function getInventories(profile: UserProfile, params: URLSearchParams) {
  const groupId = requireActiveGroup(profile);
  const search = params.get("search")?.trim().toLowerCase() ?? "";
  const locationId = params.get("locationId");
  let query: Query<DocumentData> = adminDb
    .collection("inventories")
    .where("groupId", "==", groupId);

  if (locationId) {
    query = query.where("locationId", "==", locationId);
  }

  const snapshot = await query.get();
  const inventories = snapshot.docs.map(mapInventory);

  return inventories.filter((item) => {
    if (!search) {
      return true;
    }

    return (
      item.itemName.toLowerCase().includes(search) ||
      item.barcode?.toLowerCase().includes(search)
    );
  });
}

async function getLocations(profile: UserProfile) {
  const groupId = requireActiveGroup(profile);
  const [locationSnapshot, inventorySnapshot] = await Promise.all([
    adminDb
      .collection("locations")
      .where("groupId", "==", groupId)
      .where("isActive", "==", true)
      .get(),
    adminDb.collection("inventories").where("groupId", "==", groupId).get(),
  ]);

  const inventoryMap = inventorySnapshot.docs.map(mapInventory).reduce(
    (accumulator, inventory) => {
      const current = accumulator.get(inventory.locationId) ?? {
        itemCount: 0,
        quantity: 0,
      };

      current.itemCount += 1;
      current.quantity += inventory.quantity;
      accumulator.set(inventory.locationId, current);
      return accumulator;
    },
    new Map<string, { itemCount: number; quantity: number }>(),
  );

  return locationSnapshot.docs.map((doc) => {
    const data = doc.data();
    const aggregate = inventoryMap.get(doc.id) ?? { itemCount: 0, quantity: 0 };

    return {
      id: doc.id,
      name: data.name,
      type: data.type ?? "general",
      description: data.description ?? "",
      itemCount: aggregate.itemCount,
      quantity: aggregate.quantity,
    } satisfies LocationRecord;
  });
}

async function createLocation(
  body: LocationPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  const name = body.name?.trim();

  if (!name) {
    throw new Error("LOCATION_VALIDATION");
  }

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);

  const normalizedName = name.toLowerCase();
  const existingSnapshot = await adminDb
    .collection("locations")
    .where("groupId", "==", groupId)
    .where("nameKey", "==", normalizedName)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    throw new Error("LOCATION_NAME_EXISTS");
  }

  const locationRef = adminDb.collection("locations").doc();

  await locationRef.set({
    groupId,
    name,
    nameKey: normalizedName,
    type: body.type?.trim() || "general",
    description: body.description?.trim() ?? "",
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: user.uid,
    updatedBy: user.uid,
  });

  return {
    id: locationRef.id,
  };
}

async function updateLocation(
  body: UpdateLocationPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  const locationId = body.locationId?.trim();
  const name = body.name?.trim();

  if (!locationId || !name) {
    throw new Error("LOCATION_VALIDATION");
  }

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);

  const locationDoc = await getLocationDoc(locationId);

  if (locationDoc.data()?.groupId !== groupId) {
    throw new Error("LOCATION_NOT_FOUND");
  }

  const normalizedName = name.toLowerCase();
  const existingSnapshot = await adminDb
    .collection("locations")
    .where("groupId", "==", groupId)
    .where("nameKey", "==", normalizedName)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!existingSnapshot.empty && existingSnapshot.docs[0]?.id !== locationId) {
    throw new Error("LOCATION_NAME_EXISTS");
  }

  await locationDoc.ref.set(
    {
      name,
      nameKey: normalizedName,
      type: body.type?.trim() || "general",
      description: body.description?.trim() ?? "",
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true },
  );

  return {
    id: locationDoc.id,
  };
}

async function deleteLocation(
  body: DeleteLocationPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  const locationId = body.locationId?.trim();

  if (!locationId) {
    throw new Error("LOCATION_NOT_FOUND");
  }

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);

  const locationDoc = await getLocationDoc(locationId);

  if (locationDoc.data()?.groupId !== groupId) {
    throw new Error("LOCATION_NOT_FOUND");
  }

  await locationDoc.ref.set(
    {
      isActive: false,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true },
  );

  return {
    id: locationDoc.id,
  };
}

async function getCounterparties(profile: UserProfile, params?: URLSearchParams) {
  const groupId = requireActiveGroup(profile);
  const type = params?.get("type");
  let query: Query<DocumentData> = adminDb
    .collection("counterparties")
    .where("groupId", "==", groupId)
    .where("isActive", "==", true);

  if (type === "supplier" || type === "customer") {
    query = query.where("type", "==", type);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(mapCounterparty).sort((left, right) => left.name.localeCompare(right.name, "ko-KR"));
}

async function createCounterparty(
  body: CounterpartyPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  const name = body.name?.trim();

  if (!name) {
    throw new Error("COUNTERPARTY_VALIDATION");
  }

  if (body.type !== "supplier" && body.type !== "customer") {
    throw new Error("COUNTERPARTY_TYPE_REQUIRED");
  }

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);
  const nameKey = `${body.type}:${name.toLowerCase()}`;

  const existingSnapshot = await adminDb
    .collection("counterparties")
    .where("groupId", "==", groupId)
    .where("nameKey", "==", nameKey)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    throw new Error("COUNTERPARTY_NAME_EXISTS");
  }

  const counterpartyRef = adminDb.collection("counterparties").doc();
  await counterpartyRef.set({
    groupId,
    name,
    nameKey,
    type: body.type,
    contact: body.contact?.trim() ?? "",
    notes: body.notes?.trim() ?? "",
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: user.uid,
    updatedBy: user.uid,
  });

  return {
    id: counterpartyRef.id,
  };
}

async function updateCounterparty(
  body: UpdateCounterpartyPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  const counterpartyId = body.counterpartyId?.trim();
  const name = body.name?.trim();

  if (!counterpartyId || !name) {
    throw new Error("COUNTERPARTY_VALIDATION");
  }

  if (body.type !== "supplier" && body.type !== "customer") {
    throw new Error("COUNTERPARTY_TYPE_REQUIRED");
  }

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);

  const counterpartyDoc = await getCounterpartyDoc(counterpartyId);

  if (counterpartyDoc.data()?.groupId !== groupId) {
    throw new Error("COUNTERPARTY_NOT_FOUND");
  }

  const nameKey = `${body.type}:${name.toLowerCase()}`;
  const existingSnapshot = await adminDb
    .collection("counterparties")
    .where("groupId", "==", groupId)
    .where("nameKey", "==", nameKey)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!existingSnapshot.empty && existingSnapshot.docs[0]?.id !== counterpartyId) {
    throw new Error("COUNTERPARTY_NAME_EXISTS");
  }

  await counterpartyDoc.ref.set(
    {
      name,
      nameKey,
      type: body.type,
      contact: body.contact?.trim() ?? "",
      notes: body.notes?.trim() ?? "",
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true },
  );

  return {
    id: counterpartyDoc.id,
  };
}

async function deleteCounterparty(
  body: DeleteCounterpartyPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  const counterpartyId = body.counterpartyId?.trim();

  if (!counterpartyId) {
    throw new Error("COUNTERPARTY_NOT_FOUND");
  }

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);

  const counterpartyDoc = await getCounterpartyDoc(counterpartyId);

  if (counterpartyDoc.data()?.groupId !== groupId) {
    throw new Error("COUNTERPARTY_NOT_FOUND");
  }

  await counterpartyDoc.ref.set(
    {
      isActive: false,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true },
  );

  return {
    id: counterpartyDoc.id,
  };
}

async function getLowStockAlerts(profile: UserProfile) {
  const inventories = await getInventories(profile, new URLSearchParams());
  return inventories
    .filter((inventory) => inventory.isLowStock)
    .map((inventory) => ({
      inventoryId: inventory.id,
      itemId: inventory.itemId,
      itemName: inventory.itemName,
      locationId: inventory.locationId,
      locationName: inventory.locationName,
      quantity: inventory.quantity,
      unit: inventory.unit,
      lowStockThreshold: inventory.lowStockThreshold,
      status: inventory.status,
    } satisfies LowStockAlertRecord))
    .sort((left, right) => left.quantity - right.quantity);
}

async function getItemSnapshot(profile: UserProfile, itemId: string, at: string) {
  const groupId = requireActiveGroup(profile);
  const targetDate = new Date(at);

  if (Number.isNaN(targetDate.getTime())) {
    throw new Error("SNAPSHOT_AT_REQUIRED");
  }

  const snapshot = await adminDb
    .collection("inventory_adjustments")
    .where("groupId", "==", groupId)
    .where("itemId", "==", itemId)
    .orderBy("createdAt", "asc")
    .get();

  const latestByLocation = new Map<
    string,
    {
      locationId: string;
      locationName: string;
      quantity: number;
      unit: string;
      lowStockThreshold: number;
    }
  >();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;

    if (!createdAt || createdAt.getTime() > targetDate.getTime()) {
      break;
    }

    const locationId = String(data.locationId ?? "");

    if (!locationId) {
      continue;
    }

    latestByLocation.set(locationId, {
      locationId,
      locationName: String(data.locationName ?? "-"),
      quantity: Number(data.afterQuantity ?? 0),
      unit: String(data.unit ?? "ea"),
      lowStockThreshold: Number(data.lowStockThreshold ?? 3),
    });
  }

  return {
    at,
    atLabel: targetDate.toLocaleString("ko-KR"),
    rows: Array.from(latestByLocation.values())
      .filter((row) => row.quantity > 0)
      .map((row) => ({
        locationId: row.locationId,
        locationName: row.locationName,
        quantity: row.quantity,
        unit: row.unit,
        status: getInventoryStatus(row.quantity, row.lowStockThreshold),
      })),
  } satisfies HistoricalSnapshotRecord;
}

async function getHistory(profile: UserProfile, limit = 20, itemId?: string) {
  const groupId = requireActiveGroup(profile);
  let query: Query<DocumentData> = adminDb
    .collection("inventory_adjustments")
    .where("groupId", "==", groupId)
    .orderBy("createdAt", "desc")
    .limit(limit);

  if (itemId) {
    query = adminDb
      .collection("inventory_adjustments")
      .where("groupId", "==", groupId)
      .where("itemId", "==", itemId)
      .orderBy("createdAt", "desc")
      .limit(limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(mapAdjustment);
}

async function getDashboardSummary(profile: UserProfile) {
  const groupId = requireActiveGroup(profile);
  const [inventories, locations, recentAdjustments, itemsSnapshot] = await Promise.all([
    getInventories(profile, new URLSearchParams()),
    getLocations(profile),
    getHistory(profile, 5),
    adminDb
      .collection("items")
      .where("groupId", "==", groupId)
      .where("isActive", "==", true)
      .get(),
  ]);

  return {
    itemCount: itemsSnapshot.size,
    locationCount: locations.length,
    totalQuantity: inventories.reduce((sum, item) => sum + item.quantity, 0),
    lowStockCount: inventories.filter((item) => item.isLowStock).length,
    locationSummary: locations.map((location) => ({
      locationId: location.id,
      locationName: location.name,
      itemCount: location.itemCount,
      quantity: location.quantity,
    })),
    recentAdjustments,
  };
}

async function getPlannerSummary(profile: UserProfile, params: URLSearchParams) {
  const groupId = requireActiveGroup(profile);
  const month =
    params.get("month")?.trim() || new Date().toISOString().slice(0, 7);

  const [taskSnapshot, memoSnapshot] = await Promise.all([
    adminDb.collection("planner_tasks").where("groupId", "==", groupId).get(),
    adminDb.collection("planner_memos").where("groupId", "==", groupId).get(),
  ]);

  const tasks = taskSnapshot.docs
    .map(mapPlannerTask)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate, "en"));

  const memos = memoSnapshot.docs
    .map(mapPlannerMemo)
    .filter((memo) => memo.memoDate.startsWith(month))
    .sort((left, right) => left.memoDate.localeCompare(right.memoDate, "en"));

  return {
    month,
    tasks,
    memos,
  } satisfies PlannerSummaryRecord;
}

async function getItemDetail(profile: UserProfile, itemId: string) {
  const groupId = requireActiveGroup(profile);
  const [itemDoc, inventorySnapshot, history] = await Promise.all([
    adminDb.collection("items").doc(itemId).get(),
    adminDb
      .collection("inventories")
      .where("groupId", "==", groupId)
      .where("itemId", "==", itemId)
      .get(),
    getHistory(profile, 10, itemId),
  ]);

  if (!itemDoc.exists) {
    throw new Error("ITEM_NOT_FOUND");
  }

  const itemData = itemDoc.data()!;

  if (itemData.groupId !== groupId) {
    throw new Error("ITEM_NOT_FOUND");
  }

  return {
    item: {
      id: itemDoc.id,
      name: itemData.name,
      barcode: itemData.barcode ?? null,
      defaultUnit: itemData.defaultUnit ?? "ea",
      memo: itemData.memo ?? "",
      lowStockThreshold: Number(itemData.lowStockThreshold ?? 3),
      isActive: itemData.isActive !== false,
      createdAtLabel: getTimestampLabel(itemData.createdAt),
      updatedAtLabel: getTimestampLabel(itemData.updatedAt),
    },
    inventories: inventorySnapshot.docs.map(mapInventory),
    adjustments: history,
  };
}

async function resolveBarcode(profile: UserProfile, barcode: string) {
  const groupId = requireActiveGroup(profile);
  const itemSnapshot = await adminDb
    .collection("items")
    .where("groupId", "==", groupId)
    .where("barcode", "==", barcode)
    .limit(1)
    .get();

  if (itemSnapshot.empty) {
    return { found: false };
  }

  const itemDoc = itemSnapshot.docs[0];
  const inventorySnapshot = await adminDb
    .collection("inventories")
    .where("groupId", "==", groupId)
    .where("itemId", "==", itemDoc.id)
    .limit(1)
    .get();

  if (inventorySnapshot.empty) {
    const itemData = itemDoc.data();

    return {
      found: true,
      inventory: {
        id: itemDoc.id,
        itemId: itemDoc.id,
        itemName: itemData.name,
        barcode: itemData.barcode ?? null,
        locationId: "",
        locationName: "위치 미등록",
        quantity: 0,
        unit: itemData.defaultUnit ?? "ea",
        lowStockThreshold: Number(itemData.lowStockThreshold ?? 3),
        isLowStock: true,
        status: "부족" as const,
        updatedAtLabel: "미등록",
      },
    };
  }

  return {
    found: true,
    inventory: mapInventory(inventorySnapshot.docs[0]),
  };
}

function validateItemPayload(body: ItemPayload) {
  if (!body.name?.trim() || !body.defaultUnit?.trim() || !body.locationId?.trim()) {
    throw new Error("VALIDATION");
  }

  if (
    Number.isNaN(Number(body.initialQuantity ?? 0)) ||
    Number(body.initialQuantity ?? 0) < 0
  ) {
    throw new Error("INVALID_QUANTITY");
  }

  if (
    Number.isNaN(Number(body.lowStockThreshold ?? 3)) ||
    Number(body.lowStockThreshold ?? 3) < 1
  ) {
    throw new Error("LOW_STOCK_THRESHOLD_INVALID");
  }
}

async function createItem(body: ItemPayload, user: DecodedIdToken, profile: UserProfile) {
  validateItemPayload(body);

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);
  await assertItemLimit(groupId);
  const barcode = body.barcode?.trim();

  if (barcode) {
    const existing = await adminDb
      .collection("items")
      .where("groupId", "==", groupId)
      .where("barcode", "==", barcode)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new Error("BARCODE_EXISTS");
    }
  }

  const locationDoc = await getLocationDoc(body.locationId!);

  if (!locationDoc.exists || locationDoc.data()?.groupId !== groupId) {
    throw new Error("LOCATION_NOT_FOUND");
  }

  const locationData = locationDoc.data()!;
  const itemRef = adminDb.collection("items").doc();
  const inventoryRef = adminDb.collection("inventories").doc(`${itemRef.id}_${locationDoc.id}`);
  const initialQuantity = Number(body.initialQuantity ?? 0);
  const lowStockThreshold = Number(body.lowStockThreshold ?? 3);

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(itemRef, {
      groupId,
      name: body.name!.trim(),
      barcode: barcode ?? null,
      defaultUnit: body.defaultUnit!.trim(),
      memo: body.memo?.trim() ?? "",
      lowStockThreshold,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    transaction.set(inventoryRef, {
      groupId,
      itemId: itemRef.id,
      itemName: body.name!.trim(),
      barcode: barcode ?? null,
      locationId: locationDoc.id,
      locationName: locationData.name,
      quantity: initialQuantity,
      unit: body.defaultUnit!.trim(),
      lowStockThreshold,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    });

    transaction.set(adminDb.collection("inventory_adjustments").doc(), {
      groupId,
      itemId: itemRef.id,
      itemName: body.name!.trim(),
      locationId: locationDoc.id,
      locationName: locationData.name,
      beforeQuantity: 0,
      afterQuantity: initialQuantity,
      changeType: "create",
      reason: "신규 품목 생성",
      createdBy: user.uid,
      createdByName: profile.name,
      unit: body.defaultUnit!.trim(),
      lowStockThreshold,
      counterpartyName: null,
      relatedLocationName: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    id: itemRef.id,
    inventoryId: inventoryRef.id,
  };
}

function applyAdjustment(quantity: number, body: InventoryAdjustmentPayload) {
  if (!body.changeType || Number.isNaN(Number(body.quantity))) {
    throw new Error("ADJUSTMENT_VALIDATION");
  }

  const delta = Number(body.quantity);

  if (delta < 0) {
    throw new Error("INVALID_QUANTITY");
  }

  if (!body.reason?.trim()) {
    throw new Error("REASON_REQUIRED");
  }

  switch (body.changeType) {
    case "increase":
      return quantity + delta;
    case "decrease":
      return quantity - delta;
    case "manual_edit":
      return delta;
    case "transfer":
      return quantity - delta;
    default:
      throw new Error("ADJUSTMENT_VALIDATION");
  }
}

async function createInventoryAdjustment(
  body: InventoryAdjustmentPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  if (!body.inventoryId) {
    throw new Error("ADJUSTMENT_VALIDATION");
  }

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);
  const inventoryRef = adminDb.collection("inventories").doc(body.inventoryId);

  return adminDb.runTransaction(async (transaction) => {
    const inventoryDoc = await transaction.get(inventoryRef);

    if (!inventoryDoc.exists) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    const inventoryData = inventoryDoc.data()!;

    if (inventoryData.groupId !== groupId) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    const inventory: InventoryRecord = {
      id: inventoryDoc.id,
      itemId: inventoryData.itemId,
      itemName: inventoryData.itemName,
      barcode: inventoryData.barcode ?? null,
      locationId: inventoryData.locationId,
      locationName: inventoryData.locationName,
      quantity: Number(inventoryData.quantity ?? 0),
      unit: inventoryData.unit ?? "ea",
      lowStockThreshold: Number(inventoryData.lowStockThreshold ?? 3),
      isLowStock: false,
      status: getInventoryStatus(
        Number(inventoryData.quantity ?? 0),
        Number(inventoryData.lowStockThreshold ?? 3),
      ),
      updatedAtLabel: getTimestampLabel(inventoryData.updatedAt),
    };
    const nextQuantity = applyAdjustment(inventory.quantity, body);
    let counterpartyName: string | null = null;

    if (nextQuantity < 0) {
      throw new Error("NEGATIVE_QUANTITY");
    }

    if (body.counterpartyId?.trim()) {
      const counterpartyDoc = await transaction.get(
        adminDb.collection("counterparties").doc(body.counterpartyId.trim()),
      );

      if (!counterpartyDoc.exists || counterpartyDoc.data()?.groupId !== groupId) {
        throw new Error("COUNTERPARTY_NOT_FOUND");
      }

      counterpartyName = String(counterpartyDoc.data()?.name ?? "");
    }

    if (body.changeType === "transfer") {
      if (!body.targetLocationId?.trim() || body.targetLocationId === inventory.locationId) {
        throw new Error("TARGET_LOCATION_REQUIRED");
      }

      const targetLocationDoc = await transaction.get(
        adminDb.collection("locations").doc(body.targetLocationId.trim()),
      );

      if (!targetLocationDoc.exists || targetLocationDoc.data()?.groupId !== groupId) {
        throw new Error("LOCATION_NOT_FOUND");
      }

      const targetLocationData = targetLocationDoc.data()!;
      const targetInventoryRef = adminDb
        .collection("inventories")
        .doc(`${inventory.itemId}_${targetLocationDoc.id}`);
      const targetInventoryDoc = await transaction.get(targetInventoryRef);
      const targetBeforeQuantity = Number(targetInventoryDoc.data()?.quantity ?? 0);
      const targetAfterQuantity = targetBeforeQuantity + Number(body.quantity ?? 0);

      transaction.update(inventoryRef, {
        quantity: nextQuantity,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      });

      transaction.set(
        targetInventoryRef,
        {
          groupId,
          itemId: inventory.itemId,
          itemName: inventory.itemName,
          barcode: inventory.barcode,
          locationId: targetLocationDoc.id,
          locationName: targetLocationData.name,
          quantity: targetAfterQuantity,
          unit: inventory.unit,
          lowStockThreshold: inventory.lowStockThreshold,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: user.uid,
          ...(targetInventoryDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        },
        { merge: true },
      );

      const transferOutRef = adminDb.collection("inventory_adjustments").doc();
      const transferInRef = adminDb.collection("inventory_adjustments").doc();

      transaction.set(transferOutRef, {
        groupId,
        itemId: inventory.itemId,
        itemName: inventory.itemName,
        locationId: inventory.locationId,
        locationName: inventory.locationName,
        beforeQuantity: inventory.quantity,
        afterQuantity: nextQuantity,
        changeType: "transfer_out",
        reason: body.reason!.trim(),
        createdBy: user.uid,
        createdByName: profile.name,
        unit: inventory.unit,
        lowStockThreshold: inventory.lowStockThreshold,
        counterpartyName: null,
        relatedLocationName: targetLocationData.name,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.set(transferInRef, {
        groupId,
        itemId: inventory.itemId,
        itemName: inventory.itemName,
        locationId: targetLocationDoc.id,
        locationName: targetLocationData.name,
        beforeQuantity: targetBeforeQuantity,
        afterQuantity: targetAfterQuantity,
        changeType: "transfer_in",
        reason: body.reason!.trim(),
        createdBy: user.uid,
        createdByName: profile.name,
        unit: inventory.unit,
        lowStockThreshold: inventory.lowStockThreshold,
        counterpartyName: null,
        relatedLocationName: inventory.locationName,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        inventoryId: inventory.id,
        adjustmentId: transferOutRef.id,
        beforeQuantity: inventory.quantity,
        afterQuantity: nextQuantity,
      };
    }

    transaction.update(inventoryRef, {
      quantity: nextQuantity,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    });

    const adjustmentRef = adminDb.collection("inventory_adjustments").doc();

    transaction.set(adjustmentRef, {
      groupId,
      itemId: inventory.itemId,
      itemName: inventory.itemName,
      locationId: inventory.locationId,
      locationName: inventory.locationName,
      beforeQuantity: inventory.quantity,
      afterQuantity: nextQuantity,
      changeType: body.changeType,
      reason: body.reason!.trim(),
      createdBy: user.uid,
      createdByName: profile.name,
      unit: inventory.unit,
      lowStockThreshold: inventory.lowStockThreshold,
      counterpartyName,
      relatedLocationName: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      inventoryId: inventory.id,
      adjustmentId: adjustmentRef.id,
      beforeQuantity: inventory.quantity,
      afterQuantity: nextQuantity,
    };
  });
}

function validatePlannerTaskPayload(body: PlannerTaskPayload) {
  if (!body.title?.trim() || !body.dueDate?.trim()) {
    throw new Error("PLANNER_TASK_VALIDATION");
  }

  if (body.cadence !== "daily" && body.cadence !== "weekly" && body.cadence !== "monthly") {
    throw new Error("PLANNER_TASK_VALIDATION");
  }
}

function validatePlannerMemoPayload(body: PlannerMemoPayload) {
  if (!body.memoDate?.trim() || !body.note?.trim()) {
    throw new Error("PLANNER_MEMO_VALIDATION");
  }
}

async function createPlannerTask(
  body: PlannerTaskPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  validatePlannerTaskPayload(body);

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);

  const taskRef = adminDb.collection("planner_tasks").doc();

  await taskRef.set({
    groupId,
    title: body.title!.trim(),
    cadence: body.cadence,
    dueDate: body.dueDate!.trim(),
    reminderAt: body.reminderAt?.trim() || null,
    isDone: false,
    createdBy: user.uid,
    createdByName: profile.name,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    id: taskRef.id,
  };
}

async function togglePlannerTask(
  body: PlannerTaskTogglePayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  if (!body.taskId?.trim() || typeof body.isDone !== "boolean") {
    throw new Error("PLANNER_TASK_TOGGLE_VALIDATION");
  }

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);

  const taskRef = adminDb.collection("planner_tasks").doc(body.taskId);
  const taskDoc = await taskRef.get();

  if (!taskDoc.exists || taskDoc.data()?.groupId !== groupId) {
    throw new Error("PLANNER_TASK_NOT_FOUND");
  }

  await taskRef.set(
    {
      isDone: body.isDone,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true },
  );

  return {
    id: taskRef.id,
    isDone: body.isDone,
  };
}

async function upsertPlannerMemo(
  body: PlannerMemoPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  validatePlannerMemoPayload(body);

  const groupId = requireActiveGroup(profile);
  await requireInventoryWriteAccess(groupId, user.uid);

  const memoRef = adminDb.collection("planner_memos").doc(`${groupId}_${body.memoDate!.trim()}`);

  await memoRef.set(
    {
      groupId,
      memoDate: body.memoDate!.trim(),
      note: body.note!.trim(),
      createdBy: user.uid,
      createdByName: profile.name,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    id: memoRef.id,
  };
}

function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function generateInviteCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = randomBytes(4).toString("hex").slice(0, 8).toUpperCase();
    const existing = await adminDb
      .collection("groups")
      .where("inviteCode", "==", inviteCode)
      .limit(1)
      .get();

    if (existing.empty) {
      return inviteCode;
    }
  }

  throw new Error("INVITE_CODE_GENERATION_FAILED");
}

async function createGroup(body: GroupPayload, user: DecodedIdToken) {
  const name = body.name?.trim();

  if (!name) {
    throw new Error("GROUP_NAME_REQUIRED");
  }

  await assertGroupCreationLimit(user.uid);
  await assertGroupNameAvailable(name, user.uid);

  const groupRef = adminDb.collection("groups").doc();
  const membershipRef = adminDb
    .collection("group_memberships")
    .doc(`${groupRef.id}_${user.uid}`);
  const inviteCode = await generateInviteCode();

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(groupRef, {
      name,
      nameKey: normalizeGroupName(name),
      inviteCode,
      isActive: true,
      createdBy: user.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(membershipRef, {
      groupId: groupRef.id,
      userId: user.uid,
      role: "owner",
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(
      adminDb.collection("users").doc(user.uid),
      {
        activeGroupId: groupRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return buildSession(user.uid);
}

async function joinGroup(body: JoinGroupPayload, user: DecodedIdToken) {
  const inviteCode = normalizeInviteCode(body.inviteCode ?? "");

  if (!inviteCode) {
    throw new Error("INVITE_CODE_REQUIRED");
  }

  const groupSnapshot = await adminDb
    .collection("groups")
    .where("inviteCode", "==", inviteCode)
    .limit(1)
    .get();

  if (groupSnapshot.empty) {
    throw new Error("GROUP_NOT_FOUND");
  }

  const groupDoc = groupSnapshot.docs[0];
  const profile = await getProfile(user.uid);
  const membershipRef = adminDb
    .collection("group_memberships")
    .doc(`${groupDoc.id}_${user.uid}`);
  const existingMembership = await membershipRef.get();

  if (existingMembership.exists && existingMembership.data()?.isActive !== false) {
    await adminDb.collection("users").doc(user.uid).set(
      {
        activeGroupId: groupDoc.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      status: "already_member",
      message: "이미 가입된 그룹입니다.",
      session: await buildSession(user.uid),
    } satisfies JoinGroupResult;
  }

  const requestRef = adminDb
    .collection("group_join_requests")
    .doc(`${groupDoc.id}_${user.uid}`);
  const existingRequest = await requestRef.get();
  const duplicatedInviteRequestSnapshot = await adminDb
    .collection("group_join_requests")
    .where("userId", "==", user.uid)
    .where("inviteCode", "==", inviteCode)
    .limit(1)
    .get();

  if (!duplicatedInviteRequestSnapshot.empty) {
    throw new Error("INVITE_CODE_ALREADY_USED");
  }

  if (
    existingRequest.exists &&
    normalizeJoinRequestStatus(existingRequest.data()?.status) === "pending"
  ) {
    throw new Error("JOIN_REQUEST_ALREADY_PENDING");
  }

  await requestRef.set({
    groupId: groupDoc.id,
    groupName: groupDoc.data()?.name ?? "",
    inviteCode,
    userId: user.uid,
    name: profile.name,
    email: profile.email,
    status: "pending",
    requestedAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    status: "pending",
    message: "가입 요청을 보냈습니다.",
  } satisfies JoinGroupResult;
}

async function selectGroup(body: SelectGroupPayload, user: DecodedIdToken) {
  if (!body.groupId?.trim()) {
    throw new Error("GROUP_NOT_FOUND");
  }

  await getMembershipDoc(body.groupId, user.uid);

  await adminDb.collection("users").doc(user.uid).set(
    {
      activeGroupId: body.groupId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return buildSession(user.uid);
}

async function regenerateInviteCode(user: DecodedIdToken, profile: UserProfile) {
  const groupId = requireActiveGroup(profile);
  await getGroupDoc(groupId);
  await requireOwner(groupId, user.uid);
  const inviteCode = await generateInviteCode();

  await adminDb.collection("groups").doc(groupId).set(
    {
      inviteCode,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return buildSession(user.uid);
}

async function resolveFallbackGroupId(userId: string, excludingGroupId: string) {
  const membershipSnapshot = await adminDb
    .collection("group_memberships")
    .where("userId", "==", userId)
    .where("isActive", "==", true)
    .get();

  for (const membershipDoc of membershipSnapshot.docs) {
    const membershipData = membershipDoc.data();

    if (membershipData.groupId === excludingGroupId) {
      continue;
    }

    const groupDoc = await adminDb.collection("groups").doc(membershipData.groupId).get();

    if (groupDoc.exists && groupDoc.data()?.isActive !== false) {
      return membershipData.groupId as string;
    }
  }

  return null;
}

async function deleteGroup(
  body: DeleteGroupPayload,
  user: DecodedIdToken,
) {
  const groupId = body.groupId?.trim();

  if (!groupId) {
    throw new Error("GROUP_NOT_FOUND");
  }

  await getGroupDoc(groupId);
  await requireOwner(groupId, user.uid);

  const membershipSnapshot = await adminDb
    .collection("group_memberships")
    .where("groupId", "==", groupId)
    .where("isActive", "==", true)
    .get();

  const affectedUserIds = Array.from(
    new Set([user.uid, ...membershipSnapshot.docs.map((membershipDoc) => String(membershipDoc.data().userId))]),
  );

  const joinRequestSnapshot = await adminDb
    .collection("group_join_requests")
    .where("groupId", "==", groupId)
    .get();

  const nextActiveGroupMap = new Map<string, string | null>();

  await Promise.all(
    affectedUserIds.map(async (affectedUserId) => {
      nextActiveGroupMap.set(
        affectedUserId,
        await resolveFallbackGroupId(affectedUserId, groupId),
      );
    }),
  );

  const batch = adminDb.batch();
  batch.set(
    adminDb.collection("groups").doc(groupId),
    {
      isActive: false,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  membershipSnapshot.docs.forEach((membershipDoc) => {
    batch.set(
      membershipDoc.ref,
      {
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  joinRequestSnapshot.docs.forEach((joinRequestDoc) => {
    batch.set(
      joinRequestDoc.ref,
      {
        status: "rejected",
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  affectedUserIds.forEach((affectedUserId) => {
    batch.set(
      adminDb.collection("users").doc(affectedUserId),
      {
        activeGroupId: nextActiveGroupMap.get(affectedUserId) ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await batch.commit();

  return buildSession(user.uid);
}

async function listGroupJoinRequests(user: DecodedIdToken, profile: UserProfile) {
  const groupId = requireActiveGroup(profile);
  await requireOwner(groupId, user.uid);

  const snapshot = await adminDb
    .collection("group_join_requests")
    .where("groupId", "==", groupId)
    .get();

  return snapshot.docs
    .map(mapJoinRequest)
    .filter((joinRequest) => joinRequest.status === "pending")
    .sort((left, right) => right.id.localeCompare(left.id, "en"));
}

async function approveJoinRequest(
  body: ReviewJoinRequestPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  const groupId = requireActiveGroup(profile);

  if (!body.requestId?.trim()) {
    throw new Error("JOIN_REQUEST_REQUIRED");
  }

  await requireOwner(groupId, user.uid);

  const joinRequestDoc = await getJoinRequestDoc(body.requestId);
  const joinRequestData = requireJoinRequestData(joinRequestDoc);

  if (joinRequestData.groupId !== groupId) {
    throw new Error("JOIN_REQUEST_NOT_FOUND");
  }

  if (normalizeJoinRequestStatus(joinRequestData.status) !== "pending") {
    throw new Error("JOIN_REQUEST_ALREADY_REVIEWED");
  }

  const nextRole = isMembershipRole(body.role) ? body.role : "read";
  await assertParticipantNameAvailable(groupId, joinRequestData.name, joinRequestData.userId);

  const membershipRef = adminDb
    .collection("group_memberships")
    .doc(`${groupId}_${joinRequestData.userId}`);

  await adminDb.runTransaction(async (transaction) => {
    const membershipDoc = await transaction.get(membershipRef);
    const targetUserRef = adminDb.collection("users").doc(joinRequestData.userId);
    const targetUserDoc = await transaction.get(targetUserRef);

    transaction.set(
      membershipRef,
      {
        groupId,
        userId: joinRequestData.userId,
        role: nextRole,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
        ...(membershipDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );

    transaction.set(
      joinRequestDoc.ref,
      {
        status: "approved",
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (targetUserDoc.exists && !targetUserDoc.data()?.activeGroupId) {
      transaction.set(
        targetUserRef,
        {
          activeGroupId: groupId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  return listGroupJoinRequests(user, profile);
}

async function rejectJoinRequest(
  body: ReviewJoinRequestPayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  const groupId = requireActiveGroup(profile);

  if (!body.requestId?.trim()) {
    throw new Error("JOIN_REQUEST_REQUIRED");
  }

  await requireOwner(groupId, user.uid);

  const joinRequestDoc = await getJoinRequestDoc(body.requestId);
  const joinRequestData = requireJoinRequestData(joinRequestDoc);

  if (joinRequestData.groupId !== groupId) {
    throw new Error("JOIN_REQUEST_NOT_FOUND");
  }

  if (normalizeJoinRequestStatus(joinRequestData.status) !== "pending") {
    throw new Error("JOIN_REQUEST_ALREADY_REVIEWED");
  }

  await joinRequestDoc.ref.set(
    {
      status: "rejected",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return listGroupJoinRequests(user, profile);
}

async function listGroupMembers(user: DecodedIdToken, profile: UserProfile) {
  const groupId = requireActiveGroup(profile);
  await getMembershipDoc(groupId, user.uid);

  const membershipSnapshot = await adminDb
    .collection("group_memberships")
    .where("groupId", "==", groupId)
    .where("isActive", "==", true)
    .get();

  const members = await Promise.all(
    membershipSnapshot.docs.map(async (membershipDoc) => {
      const membershipData = membershipDoc.data();
      const userDoc = await adminDb.collection("users").doc(membershipData.userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      const role = normalizeMembershipRole(membershipData.role);

      return {
        id: membershipDoc.id,
        userId: membershipData.userId,
        name: userData?.name ?? userData?.email ?? membershipData.userId,
        email: userData?.email ?? "",
        role,
        isCurrentUser: membershipData.userId === user.uid,
        isActive: membershipData.isActive !== false,
      } satisfies GroupMemberRecord;
    }),
  );

  return members.sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "owner" ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "ko-KR");
  });
}

async function updateMemberRole(
  body: UpdateMemberRolePayload,
  user: DecodedIdToken,
  profile: UserProfile,
) {
  const groupId = requireActiveGroup(profile);

  if (!body.targetUserId?.trim()) {
    throw new Error("TARGET_USER_REQUIRED");
  }

  if (!isMembershipRole(body.role)) {
    throw new Error("ROLE_REQUIRED");
  }

  await requireOwner(groupId, user.uid);

  if (body.targetUserId === user.uid && body.role !== "owner") {
    throw new Error("SELF_ROLE_CHANGE_FORBIDDEN");
  }

  const targetMembershipRef = adminDb
    .collection("group_memberships")
    .doc(`${groupId}_${body.targetUserId}`);
  const targetMembershipDoc = await targetMembershipRef.get();

  if (!targetMembershipDoc.exists || targetMembershipDoc.data()?.isActive === false) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }

  const currentRole = normalizeMembershipRole(targetMembershipDoc.data()?.role);

  if (currentRole === "owner" && body.role !== "owner") {
    const ownersSnapshot = await adminDb
      .collection("group_memberships")
      .where("groupId", "==", groupId)
      .where("role", "==", "owner")
      .where("isActive", "==", true)
      .get();

    if (ownersSnapshot.size <= 1) {
      throw new Error("LAST_OWNER_REQUIRED");
    }
  }

  await targetMembershipRef.set(
    {
      role: body.role,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return listGroupMembers(user, profile);
}

function getPathSegments(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

function handleKnownError(response: ServerResponse, error: unknown) {
  if (!(error instanceof Error)) {
    console.error(error);
    sendJson(response, 500, { message: "서버 내부 오류가 발생했습니다." });
    return;
  }

  switch (error.message) {
    case "UNAUTHORIZED":
      sendJson(response, 401, { message: "로그인이 필요합니다." });
      return;
    case "PROFILE_NOT_FOUND":
      sendJson(response, 403, { message: "사용자 정보가 없습니다. 다시 로그인해 주세요." });
      return;
    case "USER_DISABLED":
      sendJson(response, 403, { message: "비활성화된 사용자입니다." });
      return;
    case "GROUP_REQUIRED":
      sendJson(response, 403, { message: "그룹을 먼저 선택해 주세요." });
      return;
    case "GROUP_NAME_REQUIRED":
      sendJson(response, 400, { message: "그룹 이름을 입력해 주세요." });
      return;
    case "GROUP_NAME_EXISTS":
      sendJson(response, 409, { message: "내가 만든 그룹 중 같은 이름이 이미 있습니다." });
      return;
    case "GROUP_LIMIT_REACHED":
      sendJson(response, 400, { message: "그룹은 한 사용자당 최대 5개까지 만들 수 있습니다." });
      return;
    case "INVITE_CODE_REQUIRED":
      sendJson(response, 400, { message: "초대 코드를 입력해 주세요." });
      return;
    case "INVITE_CODE_ALREADY_USED":
      sendJson(response, 409, { message: "이 초대 코드로는 이미 가입 요청을 보냈습니다." });
      return;
    case "INVITE_CODE_GENERATION_FAILED":
      sendJson(response, 500, { message: "초대 코드 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." });
      return;
    case "JOIN_REQUEST_REQUIRED":
      sendJson(response, 400, { message: "가입 요청 정보가 없습니다." });
      return;
    case "JOIN_REQUEST_ALREADY_PENDING":
      sendJson(response, 409, { message: "이미 대기 중인 가입 요청이 있습니다." });
      return;
    case "JOIN_REQUEST_NOT_FOUND":
      sendJson(response, 404, { message: "가입 요청을 찾을 수 없습니다." });
      return;
    case "JOIN_REQUEST_ALREADY_REVIEWED":
      sendJson(response, 409, { message: "이미 처리된 가입 요청입니다." });
      return;
    case "PARTICIPANT_NAME_EXISTS":
      sendJson(response, 409, { message: "같은 그룹 안에 이미 같은 이름의 참여자가 있습니다." });
      return;
    case "GROUP_NOT_FOUND":
      sendJson(response, 404, { message: "그룹을 찾을 수 없습니다." });
      return;
    case "MEMBERSHIP_NOT_FOUND":
      sendJson(response, 403, { message: "선택한 그룹의 멤버가 아닙니다." });
      return;
    case "OWNER_REQUIRED":
      sendJson(response, 403, { message: "그룹 소유자만 처리할 수 있습니다." });
      return;
    case "WRITE_PERMISSION_REQUIRED":
      sendJson(response, 403, { message: "쓰기 권한이 필요합니다." });
      return;
    case "TARGET_USER_REQUIRED":
      sendJson(response, 400, { message: "대상 사용자를 선택해 주세요." });
      return;
    case "ROLE_REQUIRED":
      sendJson(response, 400, { message: "권한은 owner, full, write, read 중 하나여야 합니다." });
      return;
    case "SELF_ROLE_CHANGE_FORBIDDEN":
      sendJson(response, 400, { message: "본인 권한은 낮출 수 없습니다." });
      return;
    case "LAST_OWNER_REQUIRED":
      sendJson(response, 400, { message: "그룹에는 최소 한 명의 owner가 있어야 합니다." });
      return;
    case "VALIDATION":
      sendJson(response, 400, { message: "이름, 기본 단위, 보관 위치는 필수입니다." });
      return;
    case "ADJUSTMENT_VALIDATION":
      sendJson(response, 400, {
        message: "재고 ID, 변경 유형, 수량은 필수입니다.",
      });
      return;
    case "INVALID_QUANTITY":
      sendJson(response, 400, { message: "수량은 0 이상이어야 합니다." });
      return;
    case "NEGATIVE_QUANTITY":
      sendJson(response, 400, { message: "변경 후 수량은 음수가 될 수 없습니다." });
      return;
    case "REASON_REQUIRED":
      sendJson(response, 400, { message: "사유를 입력해 주세요." });
      return;
    case "PLANNER_TASK_VALIDATION":
      sendJson(response, 400, { message: "작업 제목, 반복 주기, 마감일은 필수입니다." });
      return;
    case "PLANNER_TASK_TOGGLE_VALIDATION":
      sendJson(response, 400, { message: "작업 ID와 완료 여부가 필요합니다." });
      return;
    case "PLANNER_MEMO_VALIDATION":
      sendJson(response, 400, { message: "메모 날짜와 내용은 필수입니다." });
      return;
    case "BARCODE_EXISTS":
      sendJson(response, 409, { message: "이미 등록된 바코드입니다." });
      return;
    case "PLANNER_TASK_NOT_FOUND":
      sendJson(response, 404, { message: "작업을 찾을 수 없습니다." });
      return;
    case "ITEM_LIMIT_REACHED":
      sendJson(response, 400, { message: "그룹당 품목은 최대 300개까지 등록할 수 있습니다." });
      return;
    case "LOW_STOCK_THRESHOLD_INVALID":
      sendJson(response, 400, { message: "안전 재고 기준은 1 이상이어야 합니다." });
      return;
    case "LOCATION_VALIDATION":
      sendJson(response, 400, { message: "보관 위치 이름을 입력해 주세요." });
      return;
    case "LOCATION_NAME_EXISTS":
      sendJson(response, 409, { message: "같은 이름의 보관 위치가 이미 있습니다." });
      return;
    case "COUNTERPARTY_VALIDATION":
      sendJson(response, 400, { message: "거래처 이름을 입력해 주세요." });
      return;
    case "COUNTERPARTY_TYPE_REQUIRED":
      sendJson(response, 400, { message: "거래처 유형은 supplier 또는 customer여야 합니다." });
      return;
    case "COUNTERPARTY_NAME_EXISTS":
      sendJson(response, 409, { message: "같은 거래처가 이미 있습니다." });
      return;
    case "COUNTERPARTY_NOT_FOUND":
      sendJson(response, 404, { message: "거래처를 찾을 수 없습니다." });
      return;
    case "TARGET_LOCATION_REQUIRED":
      sendJson(response, 400, { message: "이동할 대상 보관 위치를 선택해 주세요." });
      return;
    case "SNAPSHOT_AT_REQUIRED":
      sendJson(response, 400, { message: "유효한 조회 시점을 입력해 주세요." });
      return;
    case "LOCATION_NOT_FOUND":
      sendJson(response, 404, { message: "보관 위치를 찾을 수 없습니다." });
      return;
    case "ITEM_NOT_FOUND":
      sendJson(response, 404, { message: "품목을 찾을 수 없습니다." });
      return;
    case "INVENTORY_NOT_FOUND":
      sendJson(response, 404, { message: "재고를 찾을 수 없습니다." });
      return;
    default:
      console.error(error);
      sendJson(response, 500, { message: "서버 내부 오류가 발생했습니다." });
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  try {
    const user = await verifyRequest(request);
    const segments = getPathSegments(url.pathname);

    if (request.method === "POST" && url.pathname === "/users/sync") {
      const body = (await readBody(request)) as SyncUserPayload;
      sendJson(response, 200, await syncUser(user, body));
      return;
    }

    const profile = await requireActiveUser(user);

    if (request.method === "GET" && url.pathname === "/me") {
      sendJson(response, 200, await buildSession(user.uid));
      return;
    }

    if (request.method === "GET" && url.pathname === "/groups/mine") {
      sendJson(response, 200, (await buildSession(user.uid)).memberships);
      return;
    }

    if (request.method === "GET" && url.pathname === "/groups/members") {
      sendJson(response, 200, await listGroupMembers(user, profile));
      return;
    }

    if (request.method === "GET" && url.pathname === "/groups/join-requests") {
      sendJson(response, 200, await listGroupJoinRequests(user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/groups") {
      const body = (await readBody(request)) as GroupPayload;
      sendJson(response, 201, await createGroup(body, user));
      return;
    }

    if (request.method === "POST" && url.pathname === "/groups/delete") {
      const body = (await readBody(request)) as DeleteGroupPayload;
      sendJson(response, 200, await deleteGroup(body, user));
      return;
    }

    if (request.method === "POST" && url.pathname === "/groups/join") {
      const body = (await readBody(request)) as JoinGroupPayload;
      sendJson(response, 200, await joinGroup(body, user));
      return;
    }

    if (request.method === "POST" && url.pathname === "/groups/select") {
      const body = (await readBody(request)) as SelectGroupPayload;
      sendJson(response, 200, await selectGroup(body, user));
      return;
    }

    if (request.method === "POST" && url.pathname === "/groups/invite-code/regenerate") {
      sendJson(response, 200, await regenerateInviteCode(user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/groups/members/role") {
      const body = (await readBody(request)) as UpdateMemberRolePayload;
      sendJson(response, 200, await updateMemberRole(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/groups/join-requests/approve") {
      const body = (await readBody(request)) as ReviewJoinRequestPayload;
      sendJson(response, 200, await approveJoinRequest(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/groups/join-requests/reject") {
      const body = (await readBody(request)) as ReviewJoinRequestPayload;
      sendJson(response, 200, await rejectJoinRequest(body, user, profile));
      return;
    }

    if (request.method === "GET" && url.pathname === "/planner/summary") {
      sendJson(response, 200, await getPlannerSummary(profile, url.searchParams));
      return;
    }

    if (request.method === "POST" && url.pathname === "/planner/tasks") {
      const body = (await readBody(request)) as PlannerTaskPayload;
      sendJson(response, 201, await createPlannerTask(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/planner/tasks/toggle") {
      const body = (await readBody(request)) as PlannerTaskTogglePayload;
      sendJson(response, 200, await togglePlannerTask(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/planner/memos") {
      const body = (await readBody(request)) as PlannerMemoPayload;
      sendJson(response, 201, await upsertPlannerMemo(body, user, profile));
      return;
    }

    if (request.method === "GET" && url.pathname === "/dashboard/summary") {
      sendJson(response, 200, await getDashboardSummary(profile));
      return;
    }

    if (request.method === "GET" && url.pathname === "/inventories") {
      sendJson(response, 200, await getInventories(profile, url.searchParams));
      return;
    }

    if (request.method === "GET" && url.pathname === "/locations") {
      sendJson(response, 200, await getLocations(profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/locations") {
      const body = (await readBody(request)) as LocationPayload;
      sendJson(response, 201, await createLocation(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/locations/update") {
      const body = (await readBody(request)) as UpdateLocationPayload;
      sendJson(response, 200, await updateLocation(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/locations/delete") {
      const body = (await readBody(request)) as DeleteLocationPayload;
      sendJson(response, 200, await deleteLocation(body, user, profile));
      return;
    }

    if (request.method === "GET" && url.pathname === "/counterparties") {
      sendJson(response, 200, await getCounterparties(profile, url.searchParams));
      return;
    }

    if (request.method === "POST" && url.pathname === "/counterparties") {
      const body = (await readBody(request)) as CounterpartyPayload;
      sendJson(response, 201, await createCounterparty(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/counterparties/update") {
      const body = (await readBody(request)) as UpdateCounterpartyPayload;
      sendJson(response, 200, await updateCounterparty(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/counterparties/delete") {
      const body = (await readBody(request)) as DeleteCounterpartyPayload;
      sendJson(response, 200, await deleteCounterparty(body, user, profile));
      return;
    }

    if (request.method === "GET" && url.pathname === "/alerts/low-stock") {
      sendJson(response, 200, await getLowStockAlerts(profile));
      return;
    }

    if (request.method === "GET" && url.pathname === "/history") {
      sendJson(response, 200, await getHistory(profile));
      return;
    }

    if (request.method === "GET" && url.pathname === "/items") {
      sendJson(response, 200, await getItems(profile, url.searchParams));
      return;
    }

    if (request.method === "GET" && segments[0] === "items" && segments[1]) {
      if (segments[2] === "snapshot") {
        const at = url.searchParams.get("at") ?? "";
        sendJson(response, 200, await getItemSnapshot(profile, segments[1], at));
        return;
      }

      sendJson(response, 200, await getItemDetail(profile, segments[1]));
      return;
    }

    if (request.method === "POST" && url.pathname === "/items") {
      const body = (await readBody(request)) as ItemPayload;
      sendJson(response, 201, await createItem(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/inventory-adjustments") {
      const body = (await readBody(request)) as InventoryAdjustmentPayload;
      sendJson(response, 201, await createInventoryAdjustment(body, user, profile));
      return;
    }

    if (request.method === "POST" && url.pathname === "/barcodes/resolve") {
      const body = (await readBody(request)) as { barcode?: string };

      if (!body.barcode) {
        sendJson(response, 400, { message: "바코드를 입력해 주세요." });
        return;
      }

      sendJson(response, 200, await resolveBarcode(profile, body.barcode));
      return;
    }

    sendJson(response, 404, { message: "요청한 경로를 찾을 수 없습니다." });
  } catch (error) {
    handleKnownError(response, error);
  }
}).listen(port, () => {
  console.log(`Inventory API listening on http://localhost:${port}`);
});

