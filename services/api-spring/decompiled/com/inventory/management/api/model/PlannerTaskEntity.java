/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.PlannerTaskEntity
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
@Table(name="planner_tasks")
public class PlannerTaskEntity {
    @Id
    @Column(nullable=false, length=64)
    public String id;
    @Column(nullable=false)
    public String groupId;
    @Column(nullable=false)
    public String title;
    @Column(nullable=false)
    public String cadence;
    @Column(nullable=false)
    public String dueDate;
    public String reminderAt;
    @Column(nullable=false)
    public boolean isDone;
    @Column(nullable=false)
    public String createdBy;
    @Column(nullable=false)
    public String createdByName;
    @Column(nullable=false)
    public Instant createdAt = Instant.now();
    @Column(nullable=false)
    public Instant updatedAt = Instant.now();
    public String updatedBy;
}

