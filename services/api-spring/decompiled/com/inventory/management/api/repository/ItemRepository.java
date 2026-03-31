/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.ItemEntity
 *  com.inventory.management.api.repository.ItemRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.ItemEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository
extends JpaRepository<ItemEntity, String> {
    public List<ItemEntity> findByGroupIdAndIsActiveTrue(String var1);

    public long countByGroupIdAndIsActiveTrue(String var1);

    public Optional<ItemEntity> findByGroupIdAndBarcode(String var1, String var2);
}

