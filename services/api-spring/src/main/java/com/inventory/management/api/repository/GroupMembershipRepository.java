package com.inventory.management.api.repository;

import com.inventory.management.api.model.GroupMembershipEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMembershipRepository extends JpaRepository<GroupMembershipEntity, String> {
    List<GroupMembershipEntity> findByUserIdAndIsActiveTrue(String userId);

    List<GroupMembershipEntity> findByGroupIdAndIsActiveTrue(String groupId);

    Optional<GroupMembershipEntity> findByGroupIdAndUserId(String groupId, String userId);

    long countByGroupIdAndRoleAndIsActiveTrue(String groupId, String role);
}
