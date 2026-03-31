/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.CounterpartyEntity
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
@Table(name="counterparties")
public class CounterpartyEntity {
    @Id
    @Column(nullable=false, length=64)
    public String id;
    @Column(nullable=false)
    public String groupId;
    @Column(nullable=false)
    public String name;
    @Column(nullable=false)
    public String nameKey;
    @Column(nullable=false)
    public String type;
    @Column(nullable=false)
    public String contact = "";
    @Column(nullable=false, length=1000)
    public String notes = "";
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

