/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.PlannerTaskEntity
 *  com.inventory.management.api.repository.PlannerTaskRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.PlannerTaskEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlannerTaskRepository
extends JpaRepository<PlannerTaskEntity, String> {
    public List<PlannerTaskEntity> findByGroupId(String var1);
}

