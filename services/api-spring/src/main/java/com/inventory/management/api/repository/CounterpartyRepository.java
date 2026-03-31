package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.inventory.management.api.model.CounterpartyEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class CounterpartyRepository extends FirestoreRepositorySupport<CounterpartyEntity> {
    public CounterpartyRepository(Firestore firestore) {
        super(firestore, CounterpartyEntity.class, "counterparties");
    }

    public Optional<CounterpartyEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public CounterpartyEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<CounterpartyEntity> findByGroupIdAndIsActiveTrue(String groupId) {
        return list(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("isActive", true));
    }

    public List<CounterpartyEntity> findByGroupIdAndTypeAndIsActiveTrue(String groupId, String type) {
        return list(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("type", type).whereEqualTo("isActive", true));
    }

    public Optional<CounterpartyEntity> findByGroupIdAndNameKeyAndIsActiveTrue(String groupId, String nameKey) {
        return first(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("nameKey", nameKey).whereEqualTo("isActive", true));
    }
}
