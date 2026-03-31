/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.InventoryEntity
 *  com.inventory.management.api.repository.InventoryRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.InventoryEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryRepository
extends JpaRepository<InventoryEntity, String> {
    public List<InventoryEntity> findByGroupId(String var1);

    public List<InventoryEntity> findByGroupIdAndLocationId(String var1, String var2);

    public List<InventoryEntity> findByGroupIdAndItemId(String var1, String var2);

    public Optional<InventoryEntity> findFirstByGroupIdAndItemId(String var1, String var2);
}

