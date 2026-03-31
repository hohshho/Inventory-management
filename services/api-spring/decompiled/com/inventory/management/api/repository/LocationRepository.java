/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.LocationEntity
 *  com.inventory.management.api.repository.LocationRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.LocationEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository
extends JpaRepository<LocationEntity, String> {
    public List<LocationEntity> findByGroupId(String var1);

    public Optional<LocationEntity> findByGroupIdAndNameKey(String var1, String var2);
}

