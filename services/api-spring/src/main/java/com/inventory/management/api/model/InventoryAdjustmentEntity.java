/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.InventoryAdjustmentEntity
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
@Table(name="inventory_adjustments")
public class InventoryAdjustmentEntity {
    @Id
    @Column(nullable=false, length=64)
    public String id;
    @Column(nullable=false)
    public String groupId;
    @Column(nullable=false)
    public String itemId;
    @Column(nullable=false)
    public String itemName;
    @Column(nullable=false)
    public String locationId;
    @Column(nullable=false)
    public String locationName;
    @Column(nullable=false)
    public int beforeQuantity;
    @Column(nullable=false)
    public int afterQuantity;
    @Column(nullable=false)
    public String changeType;
    @Column(nullable=false, length=1000)
    public String reason;
    @Column(nullable=false)
    public String createdBy;
    @Column(nullable=false)
    public String createdByName;
    @Column(nullable=false)
    public String unit;
    @Column(nullable=false)
    public int lowStockThreshold = 3;
    public String counterpartyName;
    public String relatedLocationName;
    @Column(nullable=false)
    public Instant createdAt = Instant.now();
}

