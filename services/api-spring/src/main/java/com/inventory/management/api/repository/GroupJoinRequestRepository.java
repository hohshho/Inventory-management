package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.inventory.management.api.model.GroupJoinRequestEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class GroupJoinRequestRepository extends FirestoreRepositorySupport<GroupJoinRequestEntity> {
    public GroupJoinRequestRepository(Firestore firestore) {
        super(firestore, GroupJoinRequestEntity.class, "group_join_requests");
    }

    public Optional<GroupJoinRequestEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public GroupJoinRequestEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<GroupJoinRequestEntity> findByGroupId(String groupId) {
        Query query = baseQuery().whereEqualTo("groupId", groupId).orderBy("requestedAt", Query.Direction.DESCENDING);
        return list(query);
    }

    public Optional<GroupJoinRequestEntity> findByGroupIdAndUserId(String groupId, String userId) {
        return first(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("userId", userId));
    }

    public Optional<GroupJoinRequestEntity> findByUserIdAndInviteCode(String userId, String inviteCode) {
        return first(baseQuery().whereEqualTo("userId", userId).whereEqualTo("inviteCode", inviteCode));
    }
}
