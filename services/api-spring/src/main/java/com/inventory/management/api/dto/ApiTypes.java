package com.inventory.management.api.dto;

import java.util.List;

public final class ApiTypes {
    private ApiTypes() {
    }

    public record ItemCustomField(String label, String value) {}

    public record AdjustmentCreateResponse(
        String inventoryId,
        String adjustmentId,
        int beforeQuantity,
        int afterQuantity
    ) {}

    public record AdjustmentResponse(
        String id,
        String itemId,
        String itemName,
        String locationName,
        int beforeQuantity,
        int afterQuantity,
        String changeType,
        String reason,
        String createdByName,
        String counterpartyName,
        String relatedLocationName,
        String createdAtLabel
    ) {}

    public record BarcodeResolutionResponse(boolean found, InventoryResponse inventory) {}

    public record BarcodeResolveRequest(String barcode) {}

    public record CounterpartyResponse(
        String id,
        String name,
        String type,
        String contact,
        String notes
    ) {}

    public record CreateCounterpartyRequest(
        String name,
        String type,
        String contact,
        String notes
    ) {}

    public record UpdateCounterpartyRequest(
        String counterpartyId,
        String name,
        String type,
        String contact,
        String notes
    ) {}

    public record DeleteCounterpartyRequest(String counterpartyId) {}

    public record CreateItemRequest(
        String name,
        String barcode,
        String categoryLevel1,
        String categoryLevel2,
        String categoryLevel3,
        String size,
        List<ItemCustomField> customFields,
        String defaultUnit,
        String memo,
        String locationId,
        Integer initialQuantity,
        Integer lowStockThreshold
    ) {}

    public record UpdateItemRequest(
        String itemId,
        String name,
        String barcode,
        String categoryLevel1,
        String categoryLevel2,
        String categoryLevel3,
        String size,
        List<ItemCustomField> customFields,
        String defaultUnit,
        String memo,
        Integer lowStockThreshold
    ) {}

    public record CreateLocationRequest(String name, String type, String description) {}

    public record UpdateLocationRequest(
        String locationId,
        String name,
        String type,
        String description
    ) {}

    public record DeleteLocationRequest(String locationId) {}

    public record CreatePlannerTaskRequest(
        String title,
        String cadence,
        String dueDate,
        String reminderAt
    ) {}

    public record DeletePlannerTaskRequest(String taskId) {}

    public record DashboardSummaryResponse(
        int itemCount,
        int locationCount,
        int totalQuantity,
        int lowStockCount,
        List<LocationSummaryResponse> locationSummary,
        List<AdjustmentResponse> recentAdjustments
    ) {}

    public record DeleteGroupRequest(String groupId) {}

    public record GroupJoinRequestResponse(
        String id,
        String userId,
        String name,
        String email,
        String status,
        String requestedAtLabel
    ) {}

    public record GroupMemberResponse(
        String id,
        String userId,
        String name,
        String email,
        String role,
        boolean isCurrentUser,
        boolean isActive
    ) {}

    public record GroupMembershipResponse(
        String id,
        String groupId,
        String groupName,
        String inviteCode,
        String role,
        boolean isActive
    ) {}

    public record GroupRequest(String name) {}

    public record HealthResponse(String status) {}

    public record HistoricalSnapshotResponse(String at, String atLabel, List<SnapshotRowResponse> rows) {}

    public record IdResponse(String id) {}

    public record InventoryAdjustmentRequest(
        String inventoryId,
        String changeType,
        Integer quantity,
        String reason,
        String targetLocationId,
        String counterpartyId
    ) {}

    public record InventoryResponse(
        String id,
        String itemId,
        String itemName,
        String barcode,
        String locationId,
        String locationName,
        int quantity,
        String unit,
        int lowStockThreshold,
        boolean isLowStock,
        String status,
        String updatedAtLabel
    ) {}

    public record ItemCreateResponse(String id, String inventoryId) {}

    public record ItemDetailResponse(
        ItemResponse item,
        List<InventoryResponse> inventories,
        List<AdjustmentResponse> adjustments
    ) {}

    public record ItemResponse(
        String id,
        String name,
        String barcode,
        String categoryLevel1,
        String categoryLevel2,
        String categoryLevel3,
        String size,
        List<ItemCustomField> customFields,
        String defaultUnit,
        String memo,
        int lowStockThreshold,
        boolean isActive,
        String createdAtLabel,
        String updatedAtLabel
    ) {}

    public record JoinGroupRequest(String inviteCode) {}

    public record JoinGroupResultResponse(String status, String message, UserSessionResponse session) {}

    public record LocationResponse(
        String id,
        String name,
        String type,
        String description,
        int itemCount,
        int quantity
    ) {}

    public record LocationSummaryResponse(
        String locationId,
        String locationName,
        int itemCount,
        int quantity
    ) {}

    public record LowStockAlertResponse(
        String inventoryId,
        String itemId,
        String itemName,
        String locationId,
        String locationName,
        int quantity,
        String unit,
        int lowStockThreshold,
        String status
    ) {}

    public record PlannerMemoResponse(
        String id,
        String memoDate,
        String note,
        String createdByName,
        String updatedAtLabel
    ) {}

    public record PlannerSummaryResponse(
        String month,
        List<PlannerTaskResponse> tasks,
        List<PlannerMemoResponse> memos
    ) {}

    public record PlannerTaskResponse(
        String id,
        String title,
        String cadence,
        String dueDate,
        String reminderAt,
        String reminderAtLabel,
        boolean isDone,
        String createdByName
    ) {}

    public record PlannerTaskToggleResponse(String id, boolean isDone) {}

    public record ReviewJoinRequest(String requestId, String role) {}

    public record SelectGroupRequest(String groupId) {}

    public record SnapshotRowResponse(
        String locationId,
        String locationName,
        int quantity,
        String unit,
        String status
    ) {}

    public record SyncUserRequest(String name, String email) {}

    public record TogglePlannerTaskRequest(String taskId, Boolean isDone) {}

    public record UpdateMemberRoleRequest(String targetUserId, String role) {}

    public record UpsertPlannerMemoRequest(String memoDate, String note) {}

    public record UserSessionResponse(
        String uid,
        String email,
        String name,
        String role,
        boolean isActive,
        String activeGroupId,
        String activeGroupName,
        String activeGroupRole,
        List<GroupMembershipResponse> memberships
    ) {}
}
