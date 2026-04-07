package com.inventory.management.api.repository;

import com.inventory.management.api.model.InventoryEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryRepository extends JpaRepository<InventoryEntity, String> {
    List<InventoryEntity> findByGroupId(String groupId);

    List<InventoryEntity> findByGroupIdAndLocationId(String groupId, String locationId);

    List<InventoryEntity> findByGroupIdAndItemId(String groupId, String itemId);

    Optional<InventoryEntity> findFirstByGroupIdAndItemId(String groupId, String itemId);
}
