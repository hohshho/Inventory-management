/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.GroupEntity
 *  com.inventory.management.api.repository.GroupRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.GroupEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository
extends JpaRepository<GroupEntity, String> {
    public boolean existsByNameKeyAndIsActiveTrue(String var1);

    public Optional<GroupEntity> findByInviteCodeAndIsActiveTrue(String var1);
}

