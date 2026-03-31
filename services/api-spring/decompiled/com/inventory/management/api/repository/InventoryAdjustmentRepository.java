/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.InventoryAdjustmentEntity
 *  com.inventory.management.api.repository.InventoryAdjustmentRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.InventoryAdjustmentEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryAdjustmentRepository
extends JpaRepository<InventoryAdjustmentEntity, String> {
    public List<InventoryAdjustmentEntity> findTop20ByGroupIdOrderByCreatedAtDesc(String var1);

    public List<InventoryAdjustmentEntity> findTop10ByGroupIdAndItemIdOrderByCreatedAtDesc(String var1, String var2);

    public List<InventoryAdjustmentEntity> findByGroupIdAndItemIdOrderByCreatedAtAsc(String var1, String var2);
}

