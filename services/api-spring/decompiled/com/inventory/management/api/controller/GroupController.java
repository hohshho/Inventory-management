/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.controller.GroupController
 *  com.inventory.management.api.dto.ApiTypes$DeleteGroupRequest
 *  com.inventory.management.api.dto.ApiTypes$GroupJoinRequestResponse
 *  com.inventory.management.api.dto.ApiTypes$GroupMemberResponse
 *  com.inventory.management.api.dto.ApiTypes$GroupMembershipResponse
 *  com.inventory.management.api.dto.ApiTypes$GroupRequest
 *  com.inventory.management.api.dto.ApiTypes$JoinGroupRequest
 *  com.inventory.management.api.dto.ApiTypes$JoinGroupResultResponse
 *  com.inventory.management.api.dto.ApiTypes$ReviewJoinRequest
 *  com.inventory.management.api.dto.ApiTypes$SelectGroupRequest
 *  com.inventory.management.api.dto.ApiTypes$UpdateMemberRoleRequest
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
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GroupController {
    private final AccessService accessService;

    public GroupController(AccessService accessService) {
        this.accessService = accessService;
    }

    @GetMapping(value={"/groups/mine"})
    public List<ApiTypes.GroupMembershipResponse> mine(HttpServletRequest request) {
        return this.accessService.getMyMemberships(ApiUtils.getAuthenticatedUser((HttpServletRequest)request).uid());
    }

    @GetMapping(value={"/groups/members"})
    public List<ApiTypes.GroupMemberResponse> members(HttpServletRequest request) {
        return this.accessService.listGroupMembers(ApiUtils.getAuthenticatedUser((HttpServletRequest)request));
    }

    @GetMapping(value={"/groups/join-requests"})
    public List<ApiTypes.GroupJoinRequestResponse> joinRequests(HttpServletRequest request) {
        return this.accessService.listGroupJoinRequests(ApiUtils.getAuthenticatedUser((HttpServletRequest)request));
    }

    @PostMapping(value={"/groups"})
    public ApiTypes.UserSessionResponse createGroup(HttpServletRequest request, @RequestBody ApiTypes.GroupRequest body) {
        return this.accessService.createGroup(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/groups/delete"})
    public ApiTypes.UserSessionResponse deleteGroup(HttpServletRequest request, @RequestBody ApiTypes.DeleteGroupRequest body) {
        return this.accessService.deleteGroup(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/groups/join"})
    public ApiTypes.JoinGroupResultResponse join(HttpServletRequest request, @RequestBody ApiTypes.JoinGroupRequest body) {
        return this.accessService.joinGroup(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/groups/select"})
    public ApiTypes.UserSessionResponse select(HttpServletRequest request, @RequestBody ApiTypes.SelectGroupRequest body) {
        return this.accessService.selectGroup(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/groups/invite-code/regenerate"})
    public ApiTypes.UserSessionResponse regenerate(HttpServletRequest request) {
        return this.accessService.regenerateInviteCode(ApiUtils.getAuthenticatedUser((HttpServletRequest)request));
    }

    @PostMapping(value={"/groups/members/role"})
    public List<ApiTypes.GroupMemberResponse> updateRole(HttpServletRequest request, @RequestBody ApiTypes.UpdateMemberRoleRequest body) {
        return this.accessService.updateMemberRole(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/groups/join-requests/approve"})
    public List<ApiTypes.GroupJoinRequestResponse> approve(HttpServletRequest request, @RequestBody ApiTypes.ReviewJoinRequest body) {
        return this.accessService.approveJoinRequest(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/groups/join-requests/reject"})
    public List<ApiTypes.GroupJoinRequestResponse> reject(HttpServletRequest request, @RequestBody ApiTypes.ReviewJoinRequest body) {
        return this.accessService.rejectJoinRequest(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }
}

