/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.controller.OperationsController
 *  com.inventory.management.api.dto.ApiTypes$AdjustmentCreateResponse
 *  com.inventory.management.api.dto.ApiTypes$AdjustmentResponse
 *  com.inventory.management.api.dto.ApiTypes$BarcodeResolutionResponse
 *  com.inventory.management.api.dto.ApiTypes$BarcodeResolveRequest
 *  com.inventory.management.api.dto.ApiTypes$CounterpartyResponse
 *  com.inventory.management.api.dto.ApiTypes$CreateCounterpartyRequest
 *  com.inventory.management.api.dto.ApiTypes$CreateItemRequest
 *  com.inventory.management.api.dto.ApiTypes$CreateLocationRequest
 *  com.inventory.management.api.dto.ApiTypes$CreatePlannerTaskRequest
 *  com.inventory.management.api.dto.ApiTypes$DashboardSummaryResponse
 *  com.inventory.management.api.dto.ApiTypes$HistoricalSnapshotResponse
 *  com.inventory.management.api.dto.ApiTypes$IdResponse
 *  com.inventory.management.api.dto.ApiTypes$InventoryAdjustmentRequest
 *  com.inventory.management.api.dto.ApiTypes$InventoryResponse
 *  com.inventory.management.api.dto.ApiTypes$ItemCreateResponse
 *  com.inventory.management.api.dto.ApiTypes$ItemDetailResponse
 *  com.inventory.management.api.dto.ApiTypes$ItemResponse
 *  com.inventory.management.api.dto.ApiTypes$LocationResponse
 *  com.inventory.management.api.dto.ApiTypes$LowStockAlertResponse
 *  com.inventory.management.api.dto.ApiTypes$PlannerSummaryResponse
 *  com.inventory.management.api.dto.ApiTypes$PlannerTaskToggleResponse
 *  com.inventory.management.api.dto.ApiTypes$TogglePlannerTaskRequest
 *  com.inventory.management.api.dto.ApiTypes$UpsertPlannerMemoRequest
 *  com.inventory.management.api.service.OperationsService
 *  com.inventory.management.api.util.ApiUtils
 *  jakarta.servlet.http.HttpServletRequest
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestParam
 *  org.springframework.web.bind.annotation.RestController
 */
package com.inventory.management.api.controller;

import com.inventory.management.api.dto.ApiTypes;
import com.inventory.management.api.service.OperationsService;
import com.inventory.management.api.util.ApiUtils;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OperationsController {
    private final OperationsService operationsService;

    public OperationsController(OperationsService operationsService) {
        this.operationsService = operationsService;
    }

    @GetMapping(value={"/dashboard/summary"})
    public ApiTypes.DashboardSummaryResponse dashboard(HttpServletRequest request) {
        return this.operationsService.getDashboardSummary(ApiUtils.getAuthenticatedUser((HttpServletRequest)request));
    }

    @GetMapping(value={"/inventories"})
    public List<ApiTypes.InventoryResponse> inventories(HttpServletRequest request, @RequestParam(required=false) String search, @RequestParam(required=false) String locationId) {
        return this.operationsService.getInventories(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), search, locationId);
    }

    @GetMapping(value={"/locations"})
    public List<ApiTypes.LocationResponse> locations(HttpServletRequest request) {
        return this.operationsService.getLocations(ApiUtils.getAuthenticatedUser((HttpServletRequest)request));
    }

    @PostMapping(value={"/locations"})
    public ApiTypes.IdResponse createLocation(HttpServletRequest request, @RequestBody ApiTypes.CreateLocationRequest body) {
        return this.operationsService.createLocation(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/locations/update"})
    public ApiTypes.IdResponse updateLocation(HttpServletRequest request, @RequestBody ApiTypes.UpdateLocationRequest body) {
        return this.operationsService.updateLocation(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/locations/delete"})
    public ApiTypes.IdResponse deleteLocation(HttpServletRequest request, @RequestBody ApiTypes.DeleteLocationRequest body) {
        return this.operationsService.deleteLocation(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @GetMapping(value={"/counterparties"})
    public List<ApiTypes.CounterpartyResponse> counterparties(HttpServletRequest request, @RequestParam(required=false) String type) {
        return this.operationsService.getCounterparties(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), type);
    }

    @PostMapping(value={"/counterparties"})
    public ApiTypes.IdResponse createCounterparty(HttpServletRequest request, @RequestBody ApiTypes.CreateCounterpartyRequest body) {
        return this.operationsService.createCounterparty(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/counterparties/update"})
    public ApiTypes.IdResponse updateCounterparty(HttpServletRequest request, @RequestBody ApiTypes.UpdateCounterpartyRequest body) {
        return this.operationsService.updateCounterparty(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/counterparties/delete"})
    public ApiTypes.IdResponse deleteCounterparty(HttpServletRequest request, @RequestBody ApiTypes.DeleteCounterpartyRequest body) {
        return this.operationsService.deleteCounterparty(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @GetMapping(value={"/alerts/low-stock"})
    public List<ApiTypes.LowStockAlertResponse> lowStock(HttpServletRequest request) {
        return this.operationsService.getLowStockAlerts(ApiUtils.getAuthenticatedUser((HttpServletRequest)request));
    }

    @GetMapping(value={"/history"})
    public List<ApiTypes.AdjustmentResponse> history(HttpServletRequest request) {
        return this.operationsService.getHistory(ApiUtils.getAuthenticatedUser((HttpServletRequest)request));
    }

    @GetMapping(value={"/items"})
    public List<ApiTypes.ItemResponse> items(HttpServletRequest request, @RequestParam(required=false) String search) {
        return this.operationsService.getItems(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), search);
    }

    @GetMapping(value={"/items/{itemId}"})
    public ApiTypes.ItemDetailResponse itemDetail(HttpServletRequest request, @PathVariable String itemId) {
        return this.operationsService.getItemDetail(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), itemId);
    }

    @GetMapping(value={"/items/{itemId}/snapshot"})
    public ApiTypes.HistoricalSnapshotResponse itemSnapshot(HttpServletRequest request, @PathVariable String itemId, @RequestParam String at) {
        return this.operationsService.getItemSnapshot(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), itemId, at);
    }

    @PostMapping(value={"/items"})
    public ApiTypes.ItemCreateResponse createItem(HttpServletRequest request, @RequestBody ApiTypes.CreateItemRequest body) {
        return this.operationsService.createItem(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/items/update"})
    public ApiTypes.IdResponse updateItem(HttpServletRequest request, @RequestBody ApiTypes.UpdateItemRequest body) {
        return this.operationsService.updateItem(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/inventory-adjustments"})
    public ApiTypes.AdjustmentCreateResponse adjustInventory(HttpServletRequest request, @RequestBody ApiTypes.InventoryAdjustmentRequest body) {
        return this.operationsService.createInventoryAdjustment(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/barcodes/resolve"})
    public ApiTypes.BarcodeResolutionResponse resolveBarcode(HttpServletRequest request, @RequestBody ApiTypes.BarcodeResolveRequest body) {
        return this.operationsService.resolveBarcode(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @GetMapping(value={"/planner/summary"})
    public ApiTypes.PlannerSummaryResponse plannerSummary(HttpServletRequest request, @RequestParam(required=false) String month) {
        return this.operationsService.getPlannerSummary(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), month);
    }

    @PostMapping(value={"/planner/tasks"})
    public ApiTypes.IdResponse createPlannerTask(HttpServletRequest request, @RequestBody ApiTypes.CreatePlannerTaskRequest body) {
        return this.operationsService.createPlannerTask(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/planner/tasks/toggle"})
    public ApiTypes.PlannerTaskToggleResponse togglePlannerTask(HttpServletRequest request, @RequestBody ApiTypes.TogglePlannerTaskRequest body) {
        return this.operationsService.togglePlannerTask(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/planner/tasks/delete"})
    public ApiTypes.IdResponse deletePlannerTask(HttpServletRequest request, @RequestBody ApiTypes.DeletePlannerTaskRequest body) {
        return this.operationsService.deletePlannerTask(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }

    @PostMapping(value={"/planner/memos"})
    public ApiTypes.IdResponse upsertPlannerMemo(HttpServletRequest request, @RequestBody ApiTypes.UpsertPlannerMemoRequest body) {
        return this.operationsService.upsertPlannerMemo(ApiUtils.getAuthenticatedUser((HttpServletRequest)request), body);
    }
}
