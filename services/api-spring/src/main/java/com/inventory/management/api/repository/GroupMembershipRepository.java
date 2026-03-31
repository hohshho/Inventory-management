package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.inventory.management.api.model.GroupMembershipEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class GroupMembershipRepository extends FirestoreRepositorySupport<GroupMembershipEntity> {
    public GroupMembershipRepository(Firestore firestore) {
        super(firestore, GroupMembershipEntity.class, "group_memberships");
    }

    public Optional<GroupMembershipEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public GroupMembershipEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<GroupMembershipEntity> findByUserIdAndIsActiveTrue(String userId) {
        return list(baseQuery().whereEqualTo("userId", userId).whereEqualTo("isActive", true));
    }

    public List<GroupMembershipEntity> findByGroupIdAndIsActiveTrue(String groupId) {
        return list(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("isActive", true));
    }

    public Optional<GroupMembershipEntity> findByGroupIdAndUserId(String groupId, String userId) {
        return first(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("userId", userId));
    }

    public long countByGroupIdAndRoleAndIsActiveTrue(String groupId, String role) {
        return count(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("role", role).whereEqualTo("isActive", true));
    }
}
