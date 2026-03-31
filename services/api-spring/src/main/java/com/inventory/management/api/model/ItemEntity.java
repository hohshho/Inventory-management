/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.ItemEntity
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
@Table(name="items")
public class ItemEntity {
    @Id
    @Column(nullable=false, length=64)
    public String id;
    @Column(nullable=false)
    public String groupId;
    @Column(nullable=false)
    public String name;
    public String barcode;
    @Column(nullable=false)
    public String defaultUnit = "ea";
    @Column(nullable=false, length=2000)
    public String memo = "";
    @Column(nullable=false)
    public int lowStockThreshold = 3;
    @Column(nullable=false)
    public boolean isActive = true;
    @Column(nullable=false)
    public String createdBy;
    @Column(nullable=false)
    public String updatedBy;
    @Column(nullable=false)
    public Instant createdAt = Instant.now();
    @Column(nullable=false)
    public Instant updatedAt = Instant.now();
}

