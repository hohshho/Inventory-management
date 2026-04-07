package com.inventory.management.api.repository;

import com.inventory.management.api.model.ItemEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<ItemEntity, String> {
    List<ItemEntity> findByGroupIdAndIsActiveTrue(String groupId);

    long countByGroupIdAndIsActiveTrue(String groupId);

    Optional<ItemEntity> findByGroupIdAndBarcode(String groupId, String barcode);
}
