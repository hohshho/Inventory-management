package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.inventory.management.api.model.ItemEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class ItemRepository extends FirestoreRepositorySupport<ItemEntity> {
    public ItemRepository(Firestore firestore) {
        super(firestore, ItemEntity.class, "items");
    }

    public Optional<ItemEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public ItemEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<ItemEntity> findByGroupIdAndIsActiveTrue(String groupId) {
        return list(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("isActive", true));
    }

    public long countByGroupIdAndIsActiveTrue(String groupId) {
        return count(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("isActive", true));
    }

    public Optional<ItemEntity> findByGroupIdAndBarcode(String groupId, String barcode) {
        return first(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("barcode", barcode));
    }
}
