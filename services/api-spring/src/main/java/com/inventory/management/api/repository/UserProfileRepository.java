package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.inventory.management.api.model.UserProfileEntity;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class UserProfileRepository extends FirestoreRepositorySupport<UserProfileEntity> {
    public UserProfileRepository(Firestore firestore) {
        super(firestore, UserProfileEntity.class, "users");
    }

    public Optional<UserProfileEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public UserProfileEntity save(Object entity) {
        return saveInternal(entity);
    }
}
