package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.inventory.management.api.model.PlannerTaskEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class PlannerTaskRepository extends FirestoreRepositorySupport<PlannerTaskEntity> {
    public PlannerTaskRepository(Firestore firestore) {
        super(firestore, PlannerTaskEntity.class, "planner_tasks");
    }

    public Optional<PlannerTaskEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public PlannerTaskEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<PlannerTaskEntity> findByGroupId(String groupId) {
        return list(baseQuery().whereEqualTo("groupId", groupId));
    }
}
