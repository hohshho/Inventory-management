package com.inventory.management.api.repository;

import com.inventory.management.api.model.CounterpartyEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CounterpartyRepository extends JpaRepository<CounterpartyEntity, String> {
    List<CounterpartyEntity> findByGroupIdAndIsActiveTrue(String groupId);

    List<CounterpartyEntity> findByGroupIdAndTypeAndIsActiveTrue(String groupId, String type);

    Optional<CounterpartyEntity> findByGroupIdAndNameKeyAndIsActiveTrue(String groupId, String nameKey);
}
