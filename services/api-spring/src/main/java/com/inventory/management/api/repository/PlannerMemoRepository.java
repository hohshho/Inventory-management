package com.inventory.management.api.repository;

import com.inventory.management.api.model.PlannerMemoEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlannerMemoRepository extends JpaRepository<PlannerMemoEntity, String> {
    List<PlannerMemoEntity> findByGroupId(String groupId);
}
