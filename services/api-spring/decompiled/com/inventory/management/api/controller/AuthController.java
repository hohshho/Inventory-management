/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.controller.AuthController
 *  com.inventory.management.api.dto.ApiTypes$SyncUserRequest
 *  com.inventory.management.api.dto.ApiTypes$UserSessionResponse
 *  com.inventory.management.api.service.AccessService
 *  com.inventory.management.api.util.ApiUtils
 *  jakarta.servlet.http.HttpServletRequest
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RestController
 */
package com.inventory.management.api.controller;

import com.inventory.management.api.dto.ApiTypes;
import com.inventory.management.api.service.AccessService;
import com.inventory.management.api.util.ApiUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
    private final AccessService accessService;

    public AuthController(AccessService accessService) {
        this.accessService = accessService;
    }

    @PostMapping(value={"/users/sync"})
    public ApiTypes.UserSessionResponse syncUser(HttpServletRequest request, @RequestBody(required=false) ApiTypes.SyncUserRequest body) {
        return this.accessService.syncUser(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @GetMapping(value={"/me"})
    public ApiTypes.UserSessionResponse me(HttpServletRequest request) {
        return this.accessService.getMe(ApiUtils.getAuthenticatedUser((HttpServletRequest)request).uid());
    }
}

