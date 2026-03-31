package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.inventory.management.api.model.InventoryAdjustmentEntity;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class InventoryAdjustmentRepository extends FirestoreRepositorySupport<InventoryAdjustmentEntity> {
    public InventoryAdjustmentRepository(Firestore firestore) {
        super(firestore, InventoryAdjustmentEntity.class, "inventory_adjustments");
    }

    public InventoryAdjustmentEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<InventoryAdjustmentEntity> findTop20ByGroupIdOrderByCreatedAtDesc(String groupId) {
        Query query = baseQuery()
            .whereEqualTo("groupId", groupId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(20);
        return list(query);
    }

    public List<InventoryAdjustmentEntity> findTop10ByGroupIdAndItemIdOrderByCreatedAtDesc(String groupId, String itemId) {
        Query query = baseQuery()
            .whereEqualTo("groupId", groupId)
            .whereEqualTo("itemId", itemId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(10);
        return list(query);
    }

    public List<InventoryAdjustmentEntity> findByGroupIdAndItemIdOrderByCreatedAtAsc(String groupId, String itemId) {
        Query query = baseQuery()
            .whereEqualTo("groupId", groupId)
            .whereEqualTo("itemId", itemId)
            .orderBy("createdAt", Query.Direction.ASCENDING);
        return list(query);
    }
}
