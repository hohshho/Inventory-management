/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.InventoryEntity
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
@Table(name="inventories")
public class InventoryEntity {
    @Id
    @Column(nullable=false, length=128)
    public String id;
    @Column(nullable=false)
    public String groupId;
    @Column(nullable=false)
    public String itemId;
    @Column(nullable=false)
    public String itemName;
    public String barcode;
    @Column(nullable=false)
    public String locationId;
    @Column(nullable=false)
    public String locationName;
    @Column(nullable=false)
    public int quantity;
    @Column(nullable=false)
    public String unit = "ea";
    @Column(nullable=false)
    public int lowStockThreshold = 3;
    @Column(nullable=false)
    public Instant createdAt = Instant.now();
    @Column(nullable=false)
    public Instant updatedAt = Instant.now();
    @Column(nullable=false)
    public String updatedBy;
}

