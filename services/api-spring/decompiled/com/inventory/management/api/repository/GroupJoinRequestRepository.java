/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.GroupJoinRequestEntity
 *  com.inventory.management.api.repository.GroupJoinRequestRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.GroupJoinRequestEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupJoinRequestRepository
extends JpaRepository<GroupJoinRequestEntity, String> {
    public List<GroupJoinRequestEntity> findByGroupId(String var1);

    public Optional<GroupJoinRequestEntity> findByGroupIdAndUserId(String var1, String var2);
}

