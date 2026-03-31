/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.config.AppProperties
 *  com.inventory.management.api.config.AppProperties$FirebaseProperties
 *  org.springframework.boot.context.properties.ConfigurationProperties
 */
package com.inventory.management.api.config;

import com.inventory.management.api.config.AppProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix="app")
public class AppProperties {
    private String corsOrigin = "*";
    private String masterEmail = "devhshoon@gmail.com";
    private FirebaseProperties firebase = new FirebaseProperties();

    public String getCorsOrigin() {
        return this.corsOrigin;
    }

    public void setCorsOrigin(String corsOrigin) {
        this.corsOrigin = corsOrigin;
    }

    public String getMasterEmail() {
        return this.masterEmail;
    }

    public void setMasterEmail(String masterEmail) {
        this.masterEmail = masterEmail;
    }

    public FirebaseProperties getFirebase() {
        return this.firebase;
    }

    public void setFirebase(FirebaseProperties firebase) {
        this.firebase = firebase;
    }
}

