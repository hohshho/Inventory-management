/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.PlannerMemoEntity
 *  com.inventory.management.api.repository.PlannerMemoRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.PlannerMemoEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlannerMemoRepository
extends JpaRepository<PlannerMemoEntity, String> {
    public List<PlannerMemoEntity> findByGroupId(String var1);
}

