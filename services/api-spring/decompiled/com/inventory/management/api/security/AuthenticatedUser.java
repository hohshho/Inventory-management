/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.security.AuthenticatedUser
 */
package com.inventory.management.api.security;

public record AuthenticatedUser(String uid, String email, String name) {
    private final String uid;
    private final String email;
    private final String name;

    public AuthenticatedUser(String uid, String email, String name) {
        this.uid = uid;
        this.email = email;
        this.name = name;
    }

    public String uid() {
        return this.uid;
    }

    public String email() {
        return this.email;
    }

    public String name() {
        return this.name;
    }
}

