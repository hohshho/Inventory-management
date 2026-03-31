/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.GroupJoinRequestEntity
 *  jakarta.persistence.Column
 *  jakarta.persistence.Entity
 *  jakarta.persistence.Id
 *  jakarta.persistence.Table
 */
package com.inventory.management.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name="group_join_requests")
public class GroupJoinRequestEntity {
    @Id
    @Column(nullable=false, length=128)
    public String id;
    @Column(nullable=false)
    public String groupId;
    @Column(nullable=false)
    public String groupName;
    @Column(nullable=false)
    public String inviteCode;
    @Column(nullable=false)
    public String userId;
    @Column(nullable=false)
    public String name;
    @Column(nullable=false)
    public String email;
    @Column(nullable=false)
    public String status = "pending";
    @Column(nullable=false)
    public Instant requestedAt = Instant.now();
    public Instant reviewedAt;
    public String reviewedBy;
    @Column(nullable=false)
    public Instant updatedAt = Instant.now();
}

