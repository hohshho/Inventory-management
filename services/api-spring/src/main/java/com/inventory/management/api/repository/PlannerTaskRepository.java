package com.inventory.management.api.repository;

import com.inventory.management.api.model.PlannerTaskEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlannerTaskRepository extends JpaRepository<PlannerTaskEntity, String> {
    List<PlannerTaskEntity> findByGroupId(String groupId);
}
