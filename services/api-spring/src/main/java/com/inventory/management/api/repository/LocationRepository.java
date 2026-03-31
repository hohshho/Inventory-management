package com.inventory.management.api.repository;

import com.google.cloud.firestore.Firestore;
import com.inventory.management.api.model.LocationEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class LocationRepository extends FirestoreRepositorySupport<LocationEntity> {
    public LocationRepository(Firestore firestore) {
        super(firestore, LocationEntity.class, "locations");
    }

    public Optional<LocationEntity> findById(Object id) {
        return findByIdInternal(id);
    }

    public LocationEntity save(Object entity) {
        return saveInternal(entity);
    }

    public List<LocationEntity> findByGroupId(String groupId) {
        return list(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("isActive", true));
    }

    public Optional<LocationEntity> findByGroupIdAndNameKey(String groupId, String nameKey) {
        return first(baseQuery().whereEqualTo("groupId", groupId).whereEqualTo("nameKey", nameKey).whereEqualTo("isActive", true));
    }
}
