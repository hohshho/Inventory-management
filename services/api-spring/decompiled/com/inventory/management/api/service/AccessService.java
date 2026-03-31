/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.config.AppProperties
 *  com.inventory.management.api.dto.ApiTypes$DeleteGroupRequest
 *  com.inventory.management.api.dto.ApiTypes$GroupJoinRequestResponse
 *  com.inventory.management.api.dto.ApiTypes$GroupMemberResponse
 *  com.inventory.management.api.dto.ApiTypes$GroupMembershipResponse
 *  com.inventory.management.api.dto.ApiTypes$GroupRequest
 *  com.inventory.management.api.dto.ApiTypes$JoinGroupRequest
 *  com.inventory.management.api.dto.ApiTypes$JoinGroupResultResponse
 *  com.inventory.management.api.dto.ApiTypes$ReviewJoinRequest
 *  com.inventory.management.api.dto.ApiTypes$SelectGroupRequest
 *  com.inventory.management.api.dto.ApiTypes$SyncUserRequest
 *  com.inventory.management.api.dto.ApiTypes$UpdateMemberRoleRequest
 *  com.inventory.management.api.dto.ApiTypes$UserSessionResponse
 *  com.inventory.management.api.model.GroupEntity
 *  com.inventory.management.api.model.GroupJoinRequestEntity
 *  com.inventory.management.api.model.GroupMembershipEntity
 *  com.inventory.management.api.model.UserProfileEntity
 *  com.inventory.management.api.repository.GroupJoinRequestRepository
 *  com.inventory.management.api.repository.GroupMembershipRepository
 *  com.inventory.management.api.repository.GroupRepository
 *  com.inventory.management.api.repository.UserProfileRepository
 *  com.inventory.management.api.security.AuthenticatedUser
 *  com.inventory.management.api.service.AccessService
 *  com.inventory.management.api.util.ApiUtils
 *  com.inventory.management.api.web.ApiException
 *  jakarta.transaction.Transactional
 *  org.springframework.stereotype.Service
 */
package com.inventory.management.api.service;

import com.inventory.management.api.config.AppProperties;
import com.inventory.management.api.dto.ApiTypes;
import com.inventory.management.api.model.GroupEntity;
import com.inventory.management.api.model.GroupJoinRequestEntity;
import com.inventory.management.api.model.GroupMembershipEntity;
import com.inventory.management.api.model.UserProfileEntity;
import com.inventory.management.api.repository.GroupJoinRequestRepository;
import com.inventory.management.api.repository.GroupMembershipRepository;
import com.inventory.management.api.repository.GroupRepository;
import com.inventory.management.api.repository.UserProfileRepository;
import com.inventory.management.api.security.AuthenticatedUser;
import com.inventory.management.api.util.ApiUtils;
import com.inventory.management.api.web.ApiException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class AccessService {
    private static final int MAX_GROUPS_PER_USER = 5;
    private final AppProperties appProperties;
    private final UserProfileRepository userProfileRepository;
    private final GroupRepository groupRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final GroupJoinRequestRepository groupJoinRequestRepository;

    public AccessService(AppProperties appProperties, UserProfileRepository userProfileRepository, GroupRepository groupRepository, GroupMembershipRepository groupMembershipRepository, GroupJoinRequestRepository groupJoinRequestRepository) {
        this.appProperties = appProperties;
        this.userProfileRepository = userProfileRepository;
        this.groupRepository = groupRepository;
        this.groupMembershipRepository = groupMembershipRepository;
        this.groupJoinRequestRepository = groupJoinRequestRepository;
    }

    @Transactional
    public ApiTypes.UserSessionResponse syncUser(AuthenticatedUser user, ApiTypes.SyncUserRequest request) {
        UserProfileEntity existing = this.userProfileRepository.findById((Object)user.uid()).orElse(null);
        String preferredName = request == null ? null : this.trim(request.name());
        String nextName = this.firstNonBlank(new String[]{preferredName, user.name(), user.email() == null ? null : user.email().split("@")[0], existing == null ? null : existing.name, user.uid()});
        if (existing == null) {
            existing = new UserProfileEntity();
            existing.id = user.uid();
            existing.createdAt = Instant.now();
        }
        for (GroupMembershipEntity membership : this.groupMembershipRepository.findByUserIdAndIsActiveTrue(user.uid())) {
            this.assertParticipantNameAvailable(membership.groupId, nextName, user.uid());
        }
        existing.email = Objects.toString(user.email(), existing.email);
        existing.name = nextName;
        existing.role = this.isMasterEmail(existing.email) ? "master" : this.firstNonBlank(new String[]{existing.role, "staff"});
        existing.isActive = existing.isActive;
        existing.updatedAt = Instant.now();
        this.userProfileRepository.save((Object)existing);
        return this.buildSession(user.uid());
    }

    public ApiTypes.UserSessionResponse getMe(String userId) {
        this.requireActiveProfile(userId);
        return this.buildSession(userId);
    }

    public UserProfileEntity requireActiveProfile(String userId) {
        UserProfileEntity profile = (UserProfileEntity)this.userProfileRepository.findById((Object)userId).orElseThrow(() -> new ApiException(403, "User profile not found. Sync user first."));
        if (!profile.isActive) {
            throw new ApiException(403, "User is disabled.");
        }
        return profile;
    }

    public String requireActiveGroup(UserProfileEntity profile) {
        if (profile.activeGroupId == null || profile.activeGroupId.isBlank()) {
            throw new ApiException(403, "Group selection is required.");
        }
        return profile.activeGroupId;
    }

    public void requireInventoryWriteAccess(String groupId, String userId) {
        String role = this.getEffectiveMembershipRole(groupId, userId);
        if (!this.canWriteInventory(role)) {
            throw new ApiException(403, "write permission is required");
        }
    }

    public void requireOwner(String groupId, String userId) {
        String role = this.getEffectiveMembershipRole(groupId, userId);
        if (!"owner".equals(role)) {
            throw new ApiException(403, "owner permission is required");
        }
    }

    public GroupEntity requireActiveGroupEntity(String groupId) {
        GroupEntity group = (GroupEntity)this.groupRepository.findById((Object)groupId).orElseThrow(() -> new ApiException(404, "group not found"));
        if (!group.isActive) {
            throw new ApiException(404, "group not found");
        }
        return group;
    }

    public List<ApiTypes.GroupMembershipResponse> getMyMemberships(String userId) {
        this.requireActiveProfile(userId);
        return this.buildMemberships(userId);
    }

    public List<ApiTypes.GroupMemberResponse> listGroupMembers(AuthenticatedUser user) {
        UserProfileEntity profile = this.requireActiveProfile(user.uid());
        String groupId = this.requireActiveGroup(profile);
        this.getEffectiveMembershipRole(groupId, user.uid());
        ArrayList<ApiTypes.GroupMemberResponse> members = new ArrayList<ApiTypes.GroupMemberResponse>();
        for (GroupMembershipEntity membership : this.groupMembershipRepository.findByGroupIdAndIsActiveTrue(groupId)) {
            UserProfileEntity memberProfile = this.userProfileRepository.findById((Object)membership.userId).orElse(null);
            members.add(new ApiTypes.GroupMemberResponse(membership.id, membership.userId, memberProfile == null ? membership.userId : this.firstNonBlank(new String[]{memberProfile.name, memberProfile.email, membership.userId}), memberProfile == null ? "" : memberProfile.email, this.normalizeMembershipRole(membership.role), membership.userId.equals(user.uid()), membership.isActive));
        }
        members.sort(Comparator.comparing(row -> !"owner".equals(row.role())).thenComparing(ApiTypes.GroupMemberResponse::name, String.CASE_INSENSITIVE_ORDER));
        return members;
    }

    public List<ApiTypes.GroupJoinRequestResponse> listGroupJoinRequests(AuthenticatedUser user) {
        UserProfileEntity profile = this.requireActiveProfile(user.uid());
        String groupId = this.requireActiveGroup(profile);
        this.requireOwner(groupId, user.uid());
        return this.groupJoinRequestRepository.findByGroupId(groupId).stream().filter(request -> "pending".equals(this.normalizeJoinRequestStatus(request.status))).sorted(Comparator.comparing(request -> request.id).reversed()).map(arg_0 -> this.mapJoinRequest(arg_0)).toList();
    }

    @Transactional
    public ApiTypes.UserSessionResponse createGroup(AuthenticatedUser user, ApiTypes.GroupRequest request) {
        String name = this.trim(request == null ? null : request.name());
        if (name == null) {
            throw new ApiException(400, "group name is required");
        }
        long ownedGroupCount = this.groupRepository.findAll().stream().filter(group -> group.isActive && user.uid().equals(group.createdBy)).count();
        if (ownedGroupCount >= 5L) {
            throw new ApiException(400, "you can create up to 5 groups");
        }
        String nameKey = ApiUtils.normalizeKey((String)name);
        if (this.groupRepository.existsByNameKeyAndIsActiveTrue(nameKey)) {
            throw new ApiException(409, "group name already exists");
        }
        GroupEntity group2 = new GroupEntity();
        group2.id = ApiUtils.generateId();
        group2.name = name;
        group2.nameKey = nameKey;
        group2.inviteCode = this.generateInviteCode();
        group2.createdBy = user.uid();
        group2.updatedAt = group2.createdAt = Instant.now();
        this.groupRepository.save((Object)group2);
        GroupMembershipEntity membership = new GroupMembershipEntity();
        membership.id = this.membershipId(group2.id, user.uid());
        membership.groupId = group2.id;
        membership.userId = user.uid();
        membership.role = "owner";
        membership.updatedAt = membership.createdAt = Instant.now();
        this.groupMembershipRepository.save((Object)membership);
        UserProfileEntity profile = (UserProfileEntity)this.userProfileRepository.findById((Object)user.uid()).orElseThrow(() -> new ApiException(403, "User profile not found. Sync user first."));
        profile.activeGroupId = group2.id;
        profile.updatedAt = Instant.now();
        this.userProfileRepository.save((Object)profile);
        return this.buildSession(user.uid());
    }

    @Transactional
    public ApiTypes.JoinGroupResultResponse joinGroup(AuthenticatedUser user, ApiTypes.JoinGroupRequest request) {
        String inviteCode = this.normalizeInviteCode(request == null ? null : request.inviteCode());
        if (inviteCode == null) {
            throw new ApiException(400, "invite code is required");
        }
        GroupEntity group = (GroupEntity)this.groupRepository.findByInviteCodeAndIsActiveTrue(inviteCode).orElseThrow(() -> new ApiException(404, "group not found"));
        UserProfileEntity profile = this.requireActiveProfile(user.uid());
        Optional existingMembership = this.groupMembershipRepository.findByGroupIdAndUserId(group.id, user.uid());
        if (existingMembership.isPresent() && ((GroupMembershipEntity)existingMembership.get()).isActive) {
            profile.activeGroupId = group.id;
            profile.updatedAt = Instant.now();
            this.userProfileRepository.save((Object)profile);
            return new ApiTypes.JoinGroupResultResponse("already_member", "already joined this group", this.buildSession(user.uid()));
        }
        Optional existingRequest = this.groupJoinRequestRepository.findByGroupIdAndUserId(group.id, user.uid());
        if (existingRequest.isPresent() && "pending".equals(this.normalizeJoinRequestStatus(((GroupJoinRequestEntity)existingRequest.get()).status))) {
            throw new ApiException(409, "join request is already pending");
        }
        GroupJoinRequestEntity joinRequest = existingRequest.orElseGet(GroupJoinRequestEntity::new);
        joinRequest.id = this.membershipId(group.id, user.uid());
        joinRequest.groupId = group.id;
        joinRequest.groupName = group.name;
        joinRequest.inviteCode = inviteCode;
        joinRequest.userId = user.uid();
        joinRequest.name = profile.name;
        joinRequest.email = profile.email;
        joinRequest.status = "pending";
        joinRequest.requestedAt = Instant.now();
        joinRequest.reviewedAt = null;
        joinRequest.reviewedBy = null;
        joinRequest.updatedAt = Instant.now();
        this.groupJoinRequestRepository.save((Object)joinRequest);
        return new ApiTypes.JoinGroupResultResponse("pending", "join request submitted", null);
    }

    @Transactional
    public ApiTypes.UserSessionResponse selectGroup(AuthenticatedUser user, ApiTypes.SelectGroupRequest request) {
        String groupId = this.trim(request == null ? null : request.groupId());
        if (groupId == null) {
            throw new ApiException(404, "group not found");
        }
        this.getEffectiveMembershipRole(groupId, user.uid());
        UserProfileEntity profile = this.requireActiveProfile(user.uid());
        profile.activeGroupId = groupId;
        profile.updatedAt = Instant.now();
        this.userProfileRepository.save((Object)profile);
        return this.buildSession(user.uid());
    }

    @Transactional
    public ApiTypes.UserSessionResponse regenerateInviteCode(AuthenticatedUser user) {
        UserProfileEntity profile = this.requireActiveProfile(user.uid());
        String groupId = this.requireActiveGroup(profile);
        this.requireOwner(groupId, user.uid());
        GroupEntity group = this.requireActiveGroupEntity(groupId);
        group.inviteCode = this.generateInviteCode();
        group.updatedAt = Instant.now();
        this.groupRepository.save((Object)group);
        return this.buildSession(user.uid());
    }

    @Transactional
    public ApiTypes.UserSessionResponse deleteGroup(AuthenticatedUser user, ApiTypes.DeleteGroupRequest request) {
        String groupId = this.trim(request == null ? null : request.groupId());
        if (groupId == null) {
            throw new ApiException(404, "group not found");
        }
        GroupEntity group = this.requireActiveGroupEntity(groupId);
        this.requireOwner(groupId, user.uid());
        group.isActive = false;
        group.deletedAt = Instant.now();
        group.deletedBy = user.uid();
        group.updatedAt = group.deletedAt;
        this.groupRepository.save((Object)group);
        List memberships = this.groupMembershipRepository.findByGroupIdAndIsActiveTrue(groupId);
        for (GroupMembershipEntity membership : memberships) {
            membership.isActive = false;
            membership.updatedAt = Instant.now();
            this.groupMembershipRepository.save((Object)membership);
        }
        for (GroupJoinRequestEntity joinRequest : this.groupJoinRequestRepository.findByGroupId(groupId)) {
            joinRequest.status = "rejected";
            joinRequest.reviewedAt = Instant.now();
            joinRequest.reviewedBy = user.uid();
            joinRequest.updatedAt = Instant.now();
            this.groupJoinRequestRepository.save((Object)joinRequest);
        }
        List<String> affectedUsers = memberships.stream().map(m -> m.userId).distinct().toList();
        for (String affectedUserId : affectedUsers) {
            this.userProfileRepository.findById((Object)affectedUserId).ifPresent(profile -> {
                profile.activeGroupId = this.resolveFallbackGroupId(affectedUserId, groupId);
                profile.updatedAt = Instant.now();
                this.userProfileRepository.save(profile);
            });
        }
        return this.buildSession(user.uid());
    }

    @Transactional
    public List<ApiTypes.GroupJoinRequestResponse> approveJoinRequest(AuthenticatedUser user, ApiTypes.ReviewJoinRequest request) {
        UserProfileEntity profile = this.requireActiveProfile(user.uid());
        String groupId = this.requireActiveGroup(profile);
        this.requireOwner(groupId, user.uid());
        String requestId = this.trim(request == null ? null : request.requestId());
        if (requestId == null) {
            throw new ApiException(400, "join request is required");
        }
        GroupJoinRequestEntity joinRequest = (GroupJoinRequestEntity)this.groupJoinRequestRepository.findById((Object)requestId).orElseThrow(() -> new ApiException(404, "join request not found"));
        if (!groupId.equals(joinRequest.groupId)) {
            throw new ApiException(404, "join request not found");
        }
        if (!"pending".equals(this.normalizeJoinRequestStatus(joinRequest.status))) {
            throw new ApiException(409, "join request has already been reviewed");
        }
        String role = this.isMembershipRole(request.role()) ? request.role() : "read";
        this.assertParticipantNameAvailable(groupId, joinRequest.name, joinRequest.userId);
        GroupMembershipEntity membership = this.groupMembershipRepository.findByGroupIdAndUserId(groupId, joinRequest.userId).orElseGet(GroupMembershipEntity::new);
        membership.id = this.membershipId(groupId, joinRequest.userId);
        membership.groupId = groupId;
        membership.userId = joinRequest.userId;
        membership.role = role;
        membership.isActive = true;
        if (membership.createdAt == null) {
            membership.createdAt = Instant.now();
        }
        membership.updatedAt = Instant.now();
        this.groupMembershipRepository.save((Object)membership);
        joinRequest.status = "approved";
        joinRequest.reviewedAt = Instant.now();
        joinRequest.reviewedBy = user.uid();
        joinRequest.updatedAt = Instant.now();
        this.groupJoinRequestRepository.save((Object)joinRequest);
        this.userProfileRepository.findById((Object)joinRequest.userId).ifPresent(target -> {
            if (target.activeGroupId == null || target.activeGroupId.isBlank()) {
                target.activeGroupId = groupId;
                target.updatedAt = Instant.now();
                this.userProfileRepository.save(target);
            }
        });
        return this.listGroupJoinRequests(user);
    }

    @Transactional
    public List<ApiTypes.GroupJoinRequestResponse> rejectJoinRequest(AuthenticatedUser user, ApiTypes.ReviewJoinRequest request) {
        UserProfileEntity profile = this.requireActiveProfile(user.uid());
        String groupId = this.requireActiveGroup(profile);
        this.requireOwner(groupId, user.uid());
        String requestId = this.trim(request == null ? null : request.requestId());
        if (requestId == null) {
            throw new ApiException(400, "join request is required");
        }
        GroupJoinRequestEntity joinRequest = (GroupJoinRequestEntity)this.groupJoinRequestRepository.findById((Object)requestId).orElseThrow(() -> new ApiException(404, "join request not found"));
        if (!groupId.equals(joinRequest.groupId)) {
            throw new ApiException(404, "join request not found");
        }
        if (!"pending".equals(this.normalizeJoinRequestStatus(joinRequest.status))) {
            throw new ApiException(409, "join request has already been reviewed");
        }
        joinRequest.status = "rejected";
        joinRequest.reviewedAt = Instant.now();
        joinRequest.reviewedBy = user.uid();
        joinRequest.updatedAt = Instant.now();
        this.groupJoinRequestRepository.save((Object)joinRequest);
        return this.listGroupJoinRequests(user);
    }

    @Transactional
    public List<ApiTypes.GroupMemberResponse> updateMemberRole(AuthenticatedUser user, ApiTypes.UpdateMemberRoleRequest request) {
        UserProfileEntity profile = this.requireActiveProfile(user.uid());
        String groupId = this.requireActiveGroup(profile);
        this.requireOwner(groupId, user.uid());
        String targetUserId = this.trim(request == null ? null : request.targetUserId());
        if (targetUserId == null) {
            throw new ApiException(400, "target user is required");
        }
        if (!this.isMembershipRole(request.role())) {
            throw new ApiException(400, "role must be owner, full, write, or read");
        }
        if (targetUserId.equals(user.uid()) && !"owner".equals(request.role())) {
            throw new ApiException(400, "you cannot demote yourself");
        }
        GroupMembershipEntity membership = (GroupMembershipEntity)this.groupMembershipRepository.findByGroupIdAndUserId(groupId, targetUserId).orElseThrow(() -> new ApiException(403, "membership not found for selected group"));
        if (!membership.isActive) {
            throw new ApiException(403, "membership not found for selected group");
        }
        if ("owner".equals(this.normalizeMembershipRole(membership.role)) && !"owner".equals(request.role()) && this.groupMembershipRepository.countByGroupIdAndRoleAndIsActiveTrue(groupId, "owner") <= 1L) {
            throw new ApiException(400, "group must keep at least one owner");
        }
        membership.role = request.role();
        membership.updatedAt = Instant.now();
        this.groupMembershipRepository.save((Object)membership);
        return this.listGroupMembers(user);
    }

    public ApiTypes.UserSessionResponse buildSession(String userId) {
        UserProfileEntity profile = (UserProfileEntity)this.userProfileRepository.findById((Object)userId).orElseThrow(() -> new ApiException(403, "User profile not found. Sync user first."));
        List memberships = this.buildMemberships(userId);
        ApiTypes.GroupMembershipResponse activeMembership = memberships.stream().filter(membership -> Objects.equals(membership.groupId(), profile.activeGroupId)).findFirst().orElse(null);
        return new ApiTypes.UserSessionResponse(userId, profile.email, this.firstNonBlank(new String[]{profile.name, profile.email, userId}), this.firstNonBlank(new String[]{profile.role, "staff"}), profile.isActive, profile.activeGroupId, activeMembership == null ? null : activeMembership.groupName(), activeMembership == null ? null : activeMembership.role(), memberships);
    }

    private List<ApiTypes.GroupMembershipResponse> buildMemberships(String userId) {
        UserProfileEntity profile = (UserProfileEntity)this.userProfileRepository.findById((Object)userId).orElseThrow(() -> new ApiException(403, "User profile not found. Sync user first."));
        if (this.isMasterProfile(profile)) {
            return this.groupRepository.findAll().stream().filter(group -> group.isActive).sorted(Comparator.comparing(group -> group.name.toLowerCase(Locale.ROOT))).map(group -> new ApiTypes.GroupMembershipResponse("master_" + group.id, group.id, group.name, group.inviteCode, "owner", true)).toList();
        }
        ArrayList<ApiTypes.GroupMembershipResponse> memberships = new ArrayList<ApiTypes.GroupMembershipResponse>();
        for (GroupMembershipEntity membership : this.groupMembershipRepository.findByUserIdAndIsActiveTrue(userId)) {
            GroupEntity group2 = this.groupRepository.findById((Object)membership.groupId).orElse(null);
            if (group2 == null || !group2.isActive) continue;
            String role = this.normalizeMembershipRole(membership.role);
            memberships.add(new ApiTypes.GroupMembershipResponse(membership.id, group2.id, group2.name, "owner".equals(role) ? group2.inviteCode : null, role, membership.isActive));
        }
        return memberships;
    }

    private String resolveFallbackGroupId(String userId, String excludingGroupId) {
        for (GroupMembershipEntity membership : this.groupMembershipRepository.findByUserIdAndIsActiveTrue(userId)) {
            GroupEntity group;
            if (excludingGroupId.equals(membership.groupId) || (group = (GroupEntity)this.groupRepository.findById((Object)membership.groupId).orElse(null)) == null || !group.isActive) continue;
            return group.id;
        }
        return null;
    }

    private void assertParticipantNameAvailable(String groupId, String displayName, String excludeUserId) {
        String targetName = ApiUtils.normalizeKey((String)displayName);
        for (GroupMembershipEntity membership : this.groupMembershipRepository.findByGroupIdAndIsActiveTrue(groupId)) {
            if (excludeUserId != null && excludeUserId.equals(membership.userId)) continue;
            this.userProfileRepository.findById((Object)membership.userId).ifPresent(profile -> {
                if (targetName.equals(ApiUtils.normalizeKey((String)profile.name))) {
                    throw new ApiException(409, "participant name already exists in this group");
                }
            });
        }
    }

    private String getEffectiveMembershipRole(String groupId, String userId) {
        GroupEntity group = this.requireActiveGroupEntity(groupId);
        UserProfileEntity profile = (UserProfileEntity)this.userProfileRepository.findById((Object)userId).orElseThrow(() -> new ApiException(403, "User profile not found. Sync user first."));
        if (this.isMasterProfile(profile)) {
            return "owner";
        }
        GroupMembershipEntity membership = (GroupMembershipEntity)this.groupMembershipRepository.findByGroupIdAndUserId(group.id, userId).orElseThrow(() -> new ApiException(403, "membership not found for selected group"));
        if (!membership.isActive) {
            throw new ApiException(403, "membership not found for selected group");
        }
        return this.normalizeMembershipRole(membership.role);
    }

    private ApiTypes.GroupJoinRequestResponse mapJoinRequest(GroupJoinRequestEntity request) {
        return new ApiTypes.GroupJoinRequestResponse(request.id, request.userId, request.name, request.email, this.normalizeJoinRequestStatus(request.status), ApiUtils.timestampLabel((Instant)request.requestedAt));
    }

    private String generateInviteCode() {
        String code = ApiUtils.randomInviteCode();
        while (this.groupRepository.findByInviteCodeAndIsActiveTrue(code).isPresent()) {
            code = ApiUtils.randomInviteCode();
        }
        return code;
    }

    private boolean isMasterProfile(UserProfileEntity profile) {
        return "master".equals(profile.role);
    }

    private boolean isMasterEmail(String email) {
        return email != null && email.equalsIgnoreCase(this.appProperties.getMasterEmail());
    }

    private boolean canWriteInventory(String role) {
        return "owner".equals(role) || "full".equals(role) || "write".equals(role);
    }

    private String normalizeMembershipRole(String value) {
        if ("staff".equals(value)) {
            return "full";
        }
        if ("owner".equals(value) || "full".equals(value) || "write".equals(value) || "read".equals(value)) {
            return value;
        }
        return "read";
    }

    private boolean isMembershipRole(String value) {
        return "owner".equals(value) || "full".equals(value) || "write".equals(value) || "read".equals(value);
    }

    private String normalizeJoinRequestStatus(String value) {
        return "approved".equals(value) || "rejected".equals(value) ? value : "pending";
    }

    private String normalizeInviteCode(String value) {
        String trimmed = this.trim(value);
        if (trimmed == null) {
            return null;
        }
        String normalized = trimmed.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return normalized.isBlank() ? null : normalized;
    }

    private String membershipId(String groupId, String userId) {
        return groupId + "_" + userId;
    }

    private String trim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String firstNonBlank(String ... candidates) {
        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank()) continue;
            return candidate;
        }
        return "";
    }
}

