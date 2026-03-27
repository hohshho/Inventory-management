import "dotenv/config";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin.js";

const demoGroupId = "group-demo-store";

async function seed() {
  const batch = adminDb.batch();

  batch.set(adminDb.collection("groups").doc(demoGroupId), {
    name: "Demo Store",
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
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log("Firestore seed completed. Invite code: DEMO2000");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
