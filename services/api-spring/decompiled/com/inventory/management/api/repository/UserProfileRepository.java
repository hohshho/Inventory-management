/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.UserProfileEntity
 *  com.inventory.management.api.repository.UserProfileRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.UserProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository
extends JpaRepository<UserProfileEntity, String> {
}

