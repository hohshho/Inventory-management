package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.inventory.management.api.model.InventoryEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class InventoryRepository extends FirestoreRepositorySupport<InventoryEntity> {
    public InventoryRepository(Firestore firestore) {
        super(firestore, InventoryEntity.class, "inventories");
    }

    public Optional<InventoryEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public InventoryEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<InventoryEntity> findByGroupId(String groupId) {
        return list(baseQuery().whereEqualTo("groupId", groupId));
    }

    public List<InventoryEntity> findByGroupIdAndLocationId(String groupId, String locationId) {
        return list(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("locationId", locationId));
    }

    public List<InventoryEntity> findByGroupIdAndItemId(String groupId, String itemId) {
        return list(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("itemId", itemId));
    }

    public Optional<InventoryEntity> findFirstByGroupIdAndItemId(String groupId, String itemId) {
        return first(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("itemId", itemId));
    }
}
