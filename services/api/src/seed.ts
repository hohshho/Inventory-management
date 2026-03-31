import "dotenv/config";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin.js";

const demoGroupId = "group-demo-store";

async function seed() {
  const batch = adminDb.batch();

  batch.set(adminDb.collection("groups").doc(demoGroupId), {
    name: "Demo Store",
    nameKey: "demo store",
    inviteCode: "DEMO2000",
    isActive: true,
    createdBy: "seed-script",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const locations = [
    {
      id: "loc-fridge-a1",
      name: "냉장고 A-1",
      type: "fridge",
      description: "주방 메인 냉장 보관 구역",
    },
    {
      id: "loc-fridge-b1",
      name: "냉장고 B-1",
      type: "fridge",
      description: "보조 냉장 보관 구역",
    },
    {
      id: "loc-shelf-a2",
      name: "선반 A-2",
      type: "shelf",
      description: "상온 자재 보관 선반",
    },
  ];

  const items = [
    {
      id: "item-milk",
      name: "우유",
      barcode: "8800000000001",
      defaultUnit: "개",
      memo: "냉장 보관",
      locationId: "loc-fridge-a1",
      locationName: "냉장고 A-1",
      quantity: 12,
    },
    {
      id: "item-egg",
      name: "계란",
      barcode: "8800000000002",
      defaultUnit: "판",
      memo: "파손 주의",
      locationId: "loc-fridge-a1",
      locationName: "냉장고 A-1",
      quantity: 4,
    },
    {
      id: "item-butter",
      name: "버터",
      barcode: "8800000000003",
      defaultUnit: "개",
      memo: "소량 재고",
      locationId: "loc-fridge-b1",
      locationName: "냉장고 B-1",
      quantity: 1,
    },
    {
      id: "item-oil",
      name: "식용유",
      barcode: "8800000000004",
      defaultUnit: "병",
      memo: "상온 보관",
      locationId: "loc-shelf-a2",
      locationName: "선반 A-2",
      quantity: 18,
    },
  ];

  const plannerTasks = [
    {
      id: "task-daily-fridge-check",
      title: "냉장 재고 확인",
      cadence: "daily",
      dueDate: "2026-03-30",
      reminderAt: "2026-03-30T09:00",
    },
    {
      id: "task-weekly-order-review",
      title: "주간 발주 수량 검토",
      cadence: "weekly",
      dueDate: "2026-04-01",
      reminderAt: "2026-04-01T10:30",
    },
    {
      id: "task-monthly-storage-audit",
      title: "월간 창고 점검",
      cadence: "monthly",
      dueDate: "2026-04-05",
      reminderAt: "2026-04-05T14:00",
    },
  ];

  const plannerMemos = [
    {
      id: `${demoGroupId}_2026-03-30`,
      memoDate: "2026-03-30",
      note: "유통기한 임박 품목 다시 확인",
    },
    {
      id: `${demoGroupId}_2026-04-01`,
      memoDate: "2026-04-01",
      note: "우유, 버터 발주 수량 조정",
    },
  ];

  locations.forEach((location) => {
    batch.set(adminDb.collection("locations").doc(location.id), {
      groupId: demoGroupId,
      name: location.name,
      type: location.type,
      description: location.description,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  items.forEach((item) => {
    batch.set(adminDb.collection("items").doc(item.id), {
      groupId: demoGroupId,
      name: item.name,
      barcode: item.barcode,
      defaultUnit: item.defaultUnit,
      memo: item.memo,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: "seed-script",
      updatedBy: "seed-script",
    });

    batch.set(adminDb.collection("inventories").doc(`${item.id}_${item.locationId}`), {
      groupId: demoGroupId,
      itemId: item.id,
      itemName: item.name,
      barcode: item.barcode,
      locationId: item.locationId,
      locationName: item.locationName,
      quantity: item.quantity,
      unit: item.defaultUnit,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: "seed-script",
    });

    batch.set(adminDb.collection("inventory_adjustments").doc(), {
      groupId: demoGroupId,
      itemId: item.id,
      itemName: item.name,
      locationId: item.locationId,
      locationName: item.locationName,
      beforeQuantity: 0,
      afterQuantity: item.quantity,
      changeType: "create",
      reason: "초기 시드 데이터 생성",
      createdBy: "seed-script",
      createdByName: "seed-script",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  plannerTasks.forEach((task) => {
    batch.set(adminDb.collection("planner_tasks").doc(task.id), {
      groupId: demoGroupId,
      title: task.title,
      cadence: task.cadence,
      dueDate: task.dueDate,
      reminderAt: task.reminderAt,
      isDone: false,
      createdBy: "seed-script",
      createdByName: "seed-script",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  plannerMemos.forEach((memo) => {
    batch.set(adminDb.collection("planner_memos").doc(memo.id), {
      groupId: demoGroupId,
      memoDate: memo.memoDate,
      note: memo.note,
      createdBy: "seed-script",
      createdByName: "seed-script",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log("Firestore seed completed. Invite code: DEMO2000");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
