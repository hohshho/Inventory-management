package com.inventory.management.api.repository;

import com.inventory.management.api.model.GroupEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository extends JpaRepository<GroupEntity, String> {
    boolean existsByNameKeyAndIsActiveTrue(String nameKey);

    boolean existsByNameKeyAndCreatedByAndIsActiveTrue(String nameKey, String createdBy);

    Optional<GroupEntity> findByInviteCodeAndIsActiveTrue(String inviteCode);
}
