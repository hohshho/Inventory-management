package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.inventory.management.api.model.GroupEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class GroupRepository extends FirestoreRepositorySupport<GroupEntity> {
    public GroupRepository(Firestore firestore) {
        super(firestore, GroupEntity.class, "groups");
    }

    public Optional<GroupEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public GroupEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<GroupEntity> findAll() {
        return findAllInternal();
    }

    public boolean existsByNameKeyAndIsActiveTrue(String nameKey) {
        return first(baseQuery().whereEqualTo("nameKey", nameKey).whereEqualTo("isActive", true)).isPresent();
    }

    public boolean existsByNameKeyAndCreatedByAndIsActiveTrue(String nameKey, String createdBy) {
        return first(
            baseQuery()
                .whereEqualTo("nameKey", nameKey)
                .whereEqualTo("createdBy", createdBy)
                .whereEqualTo("isActive", true)
        ).isPresent();
    }

    public Optional<GroupEntity> findByInviteCodeAndIsActiveTrue(String inviteCode) {
        return first(baseQuery().whereEqualTo("inviteCode", inviteCode).whereEqualTo("isActive", true));
    }
}
