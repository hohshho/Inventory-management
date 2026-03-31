/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.UserProfileEntity
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
@Table(name="user_profiles")
public class UserProfileEntity {
    @Id
    @Column(nullable=false, length=120)
    public String id;
    @Column(nullable=false)
    public String email = "";
    @Column(nullable=false)
    public String name = "";
    @Column(nullable=false)
    public String role = "staff";
    @Column(nullable=false)
    public boolean isActive = true;
    public String activeGroupId;
    @Column(nullable=false)
    public Instant createdAt = Instant.now();
    @Column(nullable=false)
    public Instant updatedAt = Instant.now();
}

