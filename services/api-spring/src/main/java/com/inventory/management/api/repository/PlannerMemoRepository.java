package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.inventory.management.api.model.PlannerMemoEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class PlannerMemoRepository extends FirestoreRepositorySupport<PlannerMemoEntity> {
    public PlannerMemoRepository(Firestore firestore) {
        super(firestore, PlannerMemoEntity.class, "planner_memos");
    }

    public Optional<PlannerMemoEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public PlannerMemoEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<PlannerMemoEntity> findByGroupId(String groupId) {
        return list(baseQuery().whereEqualTo("groupId", groupId));
    }
}
