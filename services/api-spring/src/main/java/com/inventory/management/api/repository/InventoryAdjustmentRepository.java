package com.inventory.management.api.repository;

import com.inventory.management.api.model.InventoryAdjustmentEntity;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryAdjustmentRepository extends JpaRepository<InventoryAdjustmentEntity, String> {
    List<InventoryAdjustmentEntity> findByGroupIdOrderByCreatedAtDesc(String groupId, org.springframework.data.domain.Pageable pageable);

    List<InventoryAdjustmentEntity> findTop10ByGroupIdAndItemIdOrderByCreatedAtDesc(String groupId, String itemId);

    List<InventoryAdjustmentEntity> findByGroupIdAndItemIdOrderByCreatedAtAsc(String groupId, String itemId);

    default List<InventoryAdjustmentEntity> findRecentByGroupIdOrderByCreatedAtDesc(String groupId, int limit) {
        return findByGroupIdOrderByCreatedAtDesc(groupId, PageRequest.of(0, limit));
    }
}
