/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.GroupMembershipEntity
 *  com.inventory.management.api.repository.GroupMembershipRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.GroupMembershipEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMembershipRepository
extends JpaRepository<GroupMembershipEntity, String> {
    public List<GroupMembershipEntity> findByUserIdAndIsActiveTrue(String var1);

    public List<GroupMembershipEntity> findByGroupIdAndIsActiveTrue(String var1);

    public Optional<GroupMembershipEntity> findByGroupIdAndUserId(String var1, String var2);

    public long countByGroupIdAndRoleAndIsActiveTrue(String var1, String var2);
}

