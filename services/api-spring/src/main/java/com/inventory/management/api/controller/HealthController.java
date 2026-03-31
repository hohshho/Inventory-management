/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.controller.HealthController
 *  com.inventory.management.api.dto.ApiTypes$HealthResponse
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.RestController
 */
package com.inventory.management.api.controller;

import com.inventory.management.api.dto.ApiTypes;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    @GetMapping(value={"/health"})
    public ApiTypes.HealthResponse health() {
        return new ApiTypes.HealthResponse("ok");
    }
}

