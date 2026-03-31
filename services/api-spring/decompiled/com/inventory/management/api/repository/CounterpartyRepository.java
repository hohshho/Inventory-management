/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.model.CounterpartyEntity
 *  com.inventory.management.api.repository.CounterpartyRepository
 *  org.springframework.data.jpa.repository.JpaRepository
 */
package com.inventory.management.api.repository;

import com.inventory.management.api.model.CounterpartyEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CounterpartyRepository
extends JpaRepository<CounterpartyEntity, String> {
    public List<CounterpartyEntity> findByGroupIdAndIsActiveTrue(String var1);

    public List<CounterpartyEntity> findByGroupIdAndTypeAndIsActiveTrue(String var1, String var2);

    public Optional<CounterpartyEntity> findByGroupIdAndNameKeyAndIsActiveTrue(String var1, String var2);
}

