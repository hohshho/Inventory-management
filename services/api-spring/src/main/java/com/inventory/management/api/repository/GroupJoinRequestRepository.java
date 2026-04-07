package com.inventory.management.api.repository;

import com.inventory.management.api.model.GroupJoinRequestEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupJoinRequestRepository extends JpaRepository<GroupJoinRequestEntity, String> {
    List<GroupJoinRequestEntity> findByGroupId(String groupId);

    Optional<GroupJoinRequestEntity> findByGroupIdAndUserId(String groupId, String userId);

    Optional<GroupJoinRequestEntity> findByUserIdAndInviteCode(String userId, String inviteCode);
}
