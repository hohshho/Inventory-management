package com.inventory.management.api.repository;

import com.inventory.management.api.model.LocationEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<LocationEntity, String> {
    List<LocationEntity> findByGroupId(String groupId);

    Optional<LocationEntity> findByGroupIdAndNameKey(String groupId, String nameKey);
}
