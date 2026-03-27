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

type ItemPayload = {
  name?: string;
  barcode?: string;
  defaultUnit?: string;
  memo?: string;
  locationId?: string;
  initialQuantity?: number;
};

type InventoryAdjustmentPayload = {
  inventoryId?: string;
  changeType?: "increase" | "decrease" | "manual_edit";
  quantity?: number;
  reason?: string;
};

type GroupPayload = {
  name?: string;
};

type JoinGroupPayload = {
  inviteCode?: string;
};

type SelectGroupPayload = {
  groupId?: string;
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
  inviteCode: string;
  role: string;
  isActive: boolean;
};

type UserSession = {
  uid: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  activeGroupId: string | null;
  activeGroupName: string | null;
  memberships: GroupMembership[];
};

type ItemRecord = {
  id: string;
  name: string;
  barcode: string | null;
  defaultUnit: string;
  memo: string;
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
  createdAtLabel: string;
};

const port = Number(process.env.PORT ?? 2001);

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

function getInventoryStatus(quantity: number): InventoryStatus {
  if (quantity <= 1) {
    return "부족";
  }

  if (quantity <= 5) {
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
    isActive: data.isActive !== false,
    createdAtLabel: getTimestampLabel(data.createdAt),
    updatedAtLabel: getTimestampLabel(data.updatedAt),
  };
}

function mapInventory(doc: { id: string; data(): DocumentData }): InventoryRecord {
  const data = doc.data();

  return {
    id: doc.id,
    itemId: data.itemId,
    itemName: data.itemName,
    barcode: data.barcode ?? null,
    locationId: data.locationId,
    locationName: data.locationName,
    quantity: Number(data.quantity ?? 0),
    unit: data.unit ?? "ea",
    status: getInventoryStatus(Number(data.quantity ?? 0)),
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
    createdAtLabel: getTimestampLabel(data.createdAt),
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

async function getMemberships(userId: string) {
  const membershipSnapshot = await adminDb
    .collection("group_memberships")
    .where("userId", "==", userId)
    .where("isActive", "==", true)
    .get();

  const memberships = await Promise.all(
    membershipSnapshot.docs.map(async (membershipDoc) => {
      const membershipData = membershipDoc.data();
      const groupDoc = await adminDb.collection("groups").doc(membershipData.groupId).get();

      if (!groupDoc.exists) {
        return null;
      }

      const groupData = groupDoc.data()!;

      return {
        id: membershipDoc.id,
        groupId: membershipData.groupId,
        groupName: groupData.name,
        inviteCode: groupData.inviteCode,
        role: membershipData.role ?? "staff",
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
    memberships,
  };
}

async function syncUser(user: DecodedIdToken) {
  const userRef = adminDb.collection("users").doc(user.uid);
  const existing = await userRef.get();
  const existingData = existing.exists ? (existing.data() as UserProfile) : null;

  await userRef.set(
    {
      email: user.email ?? existingData?.email ?? "",
      name: user.name ?? user.email ?? existingData?.name ?? user.uid,
      role: existingData?.role ?? "staff",
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
    adminDb.collection("locations").where("groupId", "==", groupId).get(),
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
    lowStockCount: inventories.filter((item) => item.status !== "정상").length,
    locationSummary: locations.map((location) => ({
      locationId: location.id,
      locationName: location.name,
      itemCount: location.itemCount,
      quantity: location.quantity,
    })),
    recentAdjustments,
  };
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
}

async function createItem(body: ItemPayload, user: DecodedIdToken, profile: UserProfile) {
  validateItemPayload(body);

  const groupId = requireActiveGroup(profile);
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

  const locationDoc = await adminDb.collection("locations").doc(body.locationId!).get();

  if (!locationDoc.exists || locationDoc.data()?.groupId !== groupId) {
    throw new Error("LOCATION_NOT_FOUND");
  }

  const locationData = locationDoc.data()!;
  const itemRef = adminDb.collection("items").doc();
  const inventoryRef = adminDb.collection("inventories").doc(`${itemRef.id}_${locationDoc.id}`);
  const initialQuantity = Number(body.initialQuantity ?? 0);

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(itemRef, {
      groupId,
      name: body.name!.trim(),
      barcode: barcode ?? null,
      defaultUnit: body.defaultUnit!.trim(),
      memo: body.memo?.trim() ?? "",
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
      status: getInventoryStatus(Number(inventoryData.quantity ?? 0)),
      updatedAtLabel: getTimestampLabel(inventoryData.updatedAt),
    };
    const nextQuantity = applyAdjustment(inventory.quantity, body);

    if (nextQuantity < 0) {
      throw new Error("NEGATIVE_QUANTITY");
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

async function createGroup(body: GroupPayload, user: DecodedIdToken, profile: UserProfile) {
  const name = body.name?.trim();

  if (!name) {
    throw new Error("GROUP_NAME_REQUIRED");
  }

  const groupRef = adminDb.collection("groups").doc();
  const membershipRef = adminDb
    .collection("group_memberships")
    .doc(`${groupRef.id}_${user.uid}`);
  const inviteCode = await generateInviteCode();

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(groupRef, {
      name,
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
  const membershipRef = adminDb
    .collection("group_memberships")
    .doc(`${groupDoc.id}_${user.uid}`);

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(
      membershipRef,
      {
        groupId: groupDoc.id,
        userId: user.uid,
        role: "staff",
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(
      adminDb.collection("users").doc(user.uid),
      {
        activeGroupId: groupDoc.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return buildSession(user.uid);
}

async function selectGroup(body: SelectGroupPayload, user: DecodedIdToken) {
  if (!body.groupId?.trim()) {
    throw new Error("GROUP_NOT_FOUND");
  }

  const membershipDoc = await adminDb
    .collection("group_memberships")
    .doc(`${body.groupId}_${user.uid}`)
    .get();

  if (!membershipDoc.exists || membershipDoc.data()?.isActive === false) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }

  await adminDb.collection("users").doc(user.uid).set(
    {
      activeGroupId: body.groupId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return buildSession(user.uid);
}

function getPathSegments(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

function handleKnownError(response: ServerResponse, error: unknown) {
  if (!(error instanceof Error)) {
    console.error(error);
    sendJson(response, 500, { message: "Internal server error" });
    return;
  }

  switch (error.message) {
    case "UNAUTHORIZED":
      sendJson(response, 401, { message: "Unauthorized" });
      return;
    case "PROFILE_NOT_FOUND":
      sendJson(response, 403, { message: "User profile not found. Sync user first." });
      return;
    case "USER_DISABLED":
      sendJson(response, 403, { message: "User is disabled." });
      return;
    case "GROUP_REQUIRED":
      sendJson(response, 403, { message: "Group selection is required." });
      return;
    case "GROUP_NAME_REQUIRED":
      sendJson(response, 400, { message: "group name is required" });
      return;
    case "INVITE_CODE_REQUIRED":
      sendJson(response, 400, { message: "invite code is required" });
      return;
    case "GROUP_NOT_FOUND":
      sendJson(response, 404, { message: "group not found" });
      return;
    case "MEMBERSHIP_NOT_FOUND":
      sendJson(response, 403, { message: "membership not found for selected group" });
      return;
    case "VALIDATION":
      sendJson(response, 400, { message: "name, defaultUnit, locationId are required" });
      return;
    case "ADJUSTMENT_VALIDATION":
      sendJson(response, 400, {
        message: "inventoryId, changeType, quantity are required",
      });
      return;
    case "INVALID_QUANTITY":
      sendJson(response, 400, { message: "quantity must be zero or greater" });
      return;
    case "NEGATIVE_QUANTITY":
      sendJson(response, 400, { message: "result quantity cannot be negative" });
      return;
    case "REASON_REQUIRED":
      sendJson(response, 400, { message: "reason is required" });
      return;
    case "BARCODE_EXISTS":
      sendJson(response, 409, { message: "barcode already exists" });
      return;
    case "LOCATION_NOT_FOUND":
      sendJson(response, 404, { message: "location not found" });
      return;
    case "ITEM_NOT_FOUND":
      sendJson(response, 404, { message: "item not found" });
      return;
    case "INVENTORY_NOT_FOUND":
      sendJson(response, 404, { message: "inventory not found" });
      return;
    default:
      console.error(error);
      sendJson(response, 500, { message: "Internal server error" });
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
      sendJson(response, 200, await syncUser(user));
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

    if (request.method === "POST" && url.pathname === "/groups") {
      const body = (await readBody(request)) as GroupPayload;
      sendJson(response, 201, await createGroup(body, user, profile));
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

    if (request.method === "GET" && url.pathname === "/history") {
      sendJson(response, 200, await getHistory(profile));
      return;
    }

    if (request.method === "GET" && url.pathname === "/items") {
      sendJson(response, 200, await getItems(profile, url.searchParams));
      return;
    }

    if (request.method === "GET" && segments[0] === "items" && segments[1]) {
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
        sendJson(response, 400, { message: "barcode is required" });
        return;
      }

      sendJson(response, 200, await resolveBarcode(profile, body.barcode));
      return;
    }

    sendJson(response, 404, { message: "Not found" });
  } catch (error) {
    handleKnownError(response, error);
  }
}).listen(port, () => {
  console.log(`Inventory API listening on http://localhost:${port}`);
});
