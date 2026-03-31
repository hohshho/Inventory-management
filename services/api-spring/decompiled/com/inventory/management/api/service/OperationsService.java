/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
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
 *  com.inventory.management.api.dto.ApiTypes$LocationSummaryResponse
 *  com.inventory.management.api.dto.ApiTypes$LowStockAlertResponse
 *  com.inventory.management.api.dto.ApiTypes$PlannerMemoResponse
 *  com.inventory.management.api.dto.ApiTypes$PlannerSummaryResponse
 *  com.inventory.management.api.dto.ApiTypes$PlannerTaskResponse
 *  com.inventory.management.api.dto.ApiTypes$PlannerTaskToggleResponse
 *  com.inventory.management.api.dto.ApiTypes$SnapshotRowResponse
 *  com.inventory.management.api.dto.ApiTypes$TogglePlannerTaskRequest
 *  com.inventory.management.api.dto.ApiTypes$UpsertPlannerMemoRequest
 *  com.inventory.management.api.model.CounterpartyEntity
 *  com.inventory.management.api.model.InventoryAdjustmentEntity
 *  com.inventory.management.api.model.InventoryEntity
 *  com.inventory.management.api.model.ItemEntity
 *  com.inventory.management.api.model.LocationEntity
 *  com.inventory.management.api.model.PlannerMemoEntity
 *  com.inventory.management.api.model.PlannerTaskEntity
 *  com.inventory.management.api.model.UserProfileEntity
 *  com.inventory.management.api.repository.CounterpartyRepository
 *  com.inventory.management.api.repository.InventoryAdjustmentRepository
 *  com.inventory.management.api.repository.InventoryRepository
 *  com.inventory.management.api.repository.ItemRepository
 *  com.inventory.management.api.repository.LocationRepository
 *  com.inventory.management.api.repository.PlannerMemoRepository
 *  com.inventory.management.api.repository.PlannerTaskRepository
 *  com.inventory.management.api.security.AuthenticatedUser
 *  com.inventory.management.api.service.AccessService
 *  com.inventory.management.api.service.OperationsService
 *  com.inventory.management.api.util.ApiUtils
 *  com.inventory.management.api.web.ApiException
 *  jakarta.transaction.Transactional
 *  org.springframework.stereotype.Service
 */
package com.inventory.management.api.service;

import com.inventory.management.api.dto.ApiTypes;
import com.inventory.management.api.model.CounterpartyEntity;
import com.inventory.management.api.model.InventoryAdjustmentEntity;
import com.inventory.management.api.model.InventoryEntity;
import com.inventory.management.api.model.ItemEntity;
import com.inventory.management.api.model.LocationEntity;
import com.inventory.management.api.model.PlannerMemoEntity;
import com.inventory.management.api.model.PlannerTaskEntity;
import com.inventory.management.api.model.UserProfileEntity;
import com.inventory.management.api.repository.CounterpartyRepository;
import com.inventory.management.api.repository.InventoryAdjustmentRepository;
import com.inventory.management.api.repository.InventoryRepository;
import com.inventory.management.api.repository.ItemRepository;
import com.inventory.management.api.repository.LocationRepository;
import com.inventory.management.api.repository.PlannerMemoRepository;
import com.inventory.management.api.repository.PlannerTaskRepository;
import com.inventory.management.api.security.AuthenticatedUser;
import com.inventory.management.api.service.AccessService;
import com.inventory.management.api.util.ApiUtils;
import com.inventory.management.api.web.ApiException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class OperationsService {
    private static final int MAX_ITEMS_PER_GROUP = 300;
    private final AccessService accessService;
    private final ItemRepository itemRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryAdjustmentRepository inventoryAdjustmentRepository;
    private final LocationRepository locationRepository;
    private final CounterpartyRepository counterpartyRepository;
    private final PlannerTaskRepository plannerTaskRepository;
    private final PlannerMemoRepository plannerMemoRepository;

    public OperationsService(AccessService accessService, ItemRepository itemRepository, InventoryRepository inventoryRepository, InventoryAdjustmentRepository inventoryAdjustmentRepository, LocationRepository locationRepository, CounterpartyRepository counterpartyRepository, PlannerTaskRepository plannerTaskRepository, PlannerMemoRepository plannerMemoRepository) {
        this.accessService = accessService;
        this.itemRepository = itemRepository;
        this.inventoryRepository = inventoryRepository;
        this.inventoryAdjustmentRepository = inventoryAdjustmentRepository;
        this.locationRepository = locationRepository;
        this.counterpartyRepository = counterpartyRepository;
        this.plannerTaskRepository = plannerTaskRepository;
        this.plannerMemoRepository = plannerMemoRepository;
    }

    public ApiTypes.DashboardSummaryResponse getDashboardSummary(AuthenticatedUser user) {
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        List inventories = this.getInventories(user, null, null);
        List locations = this.getLocations(user);
        List recentAdjustments = this.getHistory(user).stream().limit(5L).toList();
        return new ApiTypes.DashboardSummaryResponse((int)this.itemRepository.countByGroupIdAndIsActiveTrue(groupId), locations.size(), inventories.stream().mapToInt(ApiTypes.InventoryResponse::quantity).sum(), (int)inventories.stream().filter(ApiTypes.InventoryResponse::isLowStock).count(), locations.stream().map(location -> new ApiTypes.LocationSummaryResponse(location.id(), location.name(), location.itemCount(), location.quantity())).toList(), recentAdjustments);
    }

    public List<ApiTypes.InventoryResponse> getInventories(AuthenticatedUser user, String search, String locationId) {
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        List source = locationId == null || locationId.isBlank() ? this.inventoryRepository.findByGroupId(groupId) : this.inventoryRepository.findByGroupIdAndLocationId(groupId, locationId);
        String searchValue = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return source.stream().filter(inventory -> searchValue.isBlank() || inventory.itemName.toLowerCase(Locale.ROOT).contains(searchValue) || inventory.barcode != null && inventory.barcode.toLowerCase(Locale.ROOT).contains(searchValue)).map(arg_0 -> this.mapInventory(arg_0)).toList();
    }

    /*
     * Exception decompiling
     */
    public List<ApiTypes.LocationResponse> getLocations(AuthenticatedUser user) {
        /*
         * This method has failed to decompile.  When submitting a bug report, please provide this stack trace, and (if you hold appropriate legal rights) the relevant class file.
         * 
         * java.lang.UnsupportedOperationException
         *     at org.benf.cfr.reader.bytecode.analysis.parse.expression.NewAnonymousArray.getDimSize(NewAnonymousArray.java:142)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.op4rewriters.LambdaRewriter.isNewArrayLambda(LambdaRewriter.java:455)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.op4rewriters.LambdaRewriter.rewriteDynamicExpression(LambdaRewriter.java:409)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.op4rewriters.LambdaRewriter.rewriteDynamicExpression(LambdaRewriter.java:167)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.op4rewriters.LambdaRewriter.rewriteExpression(LambdaRewriter.java:105)
         *     at org.benf.cfr.reader.bytecode.analysis.parse.rewriters.ExpressionRewriterHelper.applyForwards(ExpressionRewriterHelper.java:12)
         *     at org.benf.cfr.reader.bytecode.analysis.parse.expression.AbstractMemberFunctionInvokation.applyExpressionRewriterToArgs(AbstractMemberFunctionInvokation.java:101)
         *     at org.benf.cfr.reader.bytecode.analysis.parse.expression.AbstractMemberFunctionInvokation.applyExpressionRewriter(AbstractMemberFunctionInvokation.java:88)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.op4rewriters.LambdaRewriter.rewriteExpression(LambdaRewriter.java:103)
         *     at org.benf.cfr.reader.bytecode.analysis.structured.statement.StructuredAssignment.rewriteExpressions(StructuredAssignment.java:146)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.op4rewriters.LambdaRewriter.rewrite(LambdaRewriter.java:88)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op04StructuredStatement.rewriteLambdas(Op04StructuredStatement.java:1137)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysisInner(CodeAnalyser.java:912)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysisOrWrapFail(CodeAnalyser.java:278)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysis(CodeAnalyser.java:201)
         *     at org.benf.cfr.reader.entities.attributes.AttributeCode.analyse(AttributeCode.java:94)
         *     at org.benf.cfr.reader.entities.Method.analyse(Method.java:531)
         *     at org.benf.cfr.reader.entities.ClassFile.analyseMid(ClassFile.java:1055)
         *     at org.benf.cfr.reader.entities.ClassFile.analyseTop(ClassFile.java:942)
         *     at org.benf.cfr.reader.Driver.doJarVersionTypes(Driver.java:257)
         *     at org.benf.cfr.reader.Driver.doJar(Driver.java:139)
         *     at org.benf.cfr.reader.CfrDriverImpl.analyse(CfrDriverImpl.java:76)
         *     at org.benf.cfr.reader.Main.main(Main.java:54)
         */
        throw new IllegalStateException("Decompilation failed");
    }

    @Transactional
    public ApiTypes.IdResponse createLocation(AuthenticatedUser user, ApiTypes.CreateLocationRequest request) {
        String name = this.trim(request == null ? null : request.name());
        if (name == null) {
            throw new ApiException(400, "location name is required");
        }
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        this.accessService.requireInventoryWriteAccess(groupId, user.uid());
        String nameKey = name.toLowerCase(Locale.ROOT);
        if (this.locationRepository.findByGroupIdAndNameKey(groupId, nameKey).isPresent()) {
            throw new ApiException(409, "location name already exists");
        }
        LocationEntity location = new LocationEntity();
        location.id = ApiUtils.generateId();
        location.groupId = groupId;
        location.name = name;
        location.nameKey = nameKey;
        location.type = this.trim(request.type()) == null ? "general" : request.type().trim();
        location.description = Objects.toString(request.description(), "");
        location.createdBy = user.uid();
        location.updatedBy = user.uid();
        location.updatedAt = location.createdAt = Instant.now();
        this.locationRepository.save((Object)location);
        return new ApiTypes.IdResponse(location.id);
    }

    public List<ApiTypes.CounterpartyResponse> getCounterparties(AuthenticatedUser user, String type) {
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        List counterparties = "supplier".equals(type) || "customer".equals(type) ? this.counterpartyRepository.findByGroupIdAndTypeAndIsActiveTrue(groupId, type) : this.counterpartyRepository.findByGroupIdAndIsActiveTrue(groupId);
        return counterparties.stream().sorted(Comparator.comparing(counterparty -> counterparty.name.toLowerCase(Locale.ROOT))).map(counterparty -> new ApiTypes.CounterpartyResponse(counterparty.id, counterparty.name, counterparty.type, counterparty.contact, counterparty.notes)).toList();
    }

    @Transactional
    public ApiTypes.IdResponse createCounterparty(AuthenticatedUser user, ApiTypes.CreateCounterpartyRequest request) {
        String name = this.trim(request == null ? null : request.name());
        if (name == null) {
            throw new ApiException(400, "counterparty name is required");
        }
        if (!"supplier".equals(request.type()) && !"customer".equals(request.type())) {
            throw new ApiException(400, "counterparty type must be supplier or customer");
        }
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        this.accessService.requireInventoryWriteAccess(groupId, user.uid());
        String nameKey = request.type() + ":" + name.toLowerCase(Locale.ROOT);
        if (this.counterpartyRepository.findByGroupIdAndNameKeyAndIsActiveTrue(groupId, nameKey).isPresent()) {
            throw new ApiException(409, "counterparty name already exists");
        }
        CounterpartyEntity counterparty = new CounterpartyEntity();
        counterparty.id = ApiUtils.generateId();
        counterparty.groupId = groupId;
        counterparty.name = name;
        counterparty.nameKey = nameKey;
        counterparty.type = request.type();
        counterparty.contact = Objects.toString(request.contact(), "");
        counterparty.notes = Objects.toString(request.notes(), "");
        counterparty.createdBy = user.uid();
        counterparty.updatedBy = user.uid();
        counterparty.updatedAt = counterparty.createdAt = Instant.now();
        this.counterpartyRepository.save((Object)counterparty);
        return new ApiTypes.IdResponse(counterparty.id);
    }

    public List<ApiTypes.LowStockAlertResponse> getLowStockAlerts(AuthenticatedUser user) {
        return this.getInventories(user, null, null).stream().filter(ApiTypes.InventoryResponse::isLowStock).sorted(Comparator.comparingInt(ApiTypes.InventoryResponse::quantity)).map(inventory -> new ApiTypes.LowStockAlertResponse(inventory.id(), inventory.itemId(), inventory.itemName(), inventory.locationId(), inventory.locationName(), inventory.quantity(), inventory.unit(), inventory.lowStockThreshold(), inventory.status())).toList();
    }

    public List<ApiTypes.AdjustmentResponse> getHistory(AuthenticatedUser user) {
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        return this.inventoryAdjustmentRepository.findTop20ByGroupIdOrderByCreatedAtDesc(groupId).stream().map(arg_0 -> this.mapAdjustment(arg_0)).toList();
    }

    public List<ApiTypes.ItemResponse> getItems(AuthenticatedUser user, String search) {
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        String searchValue = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return this.itemRepository.findByGroupIdAndIsActiveTrue(groupId).stream().filter(item -> searchValue.isBlank() || item.name.toLowerCase(Locale.ROOT).contains(searchValue) || item.barcode != null && item.barcode.toLowerCase(Locale.ROOT).contains(searchValue)).map(arg_0 -> this.mapItem(arg_0)).toList();
    }

    public ApiTypes.ItemDetailResponse getItemDetail(AuthenticatedUser user, String itemId) {
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        ItemEntity item = (ItemEntity)this.itemRepository.findById((Object)itemId).orElseThrow(() -> new ApiException(404, "item not found"));
        if (!groupId.equals(item.groupId)) {
            throw new ApiException(404, "item not found");
        }
        return new ApiTypes.ItemDetailResponse(this.mapItem(item), this.inventoryRepository.findByGroupIdAndItemId(groupId, itemId).stream().map(arg_0 -> this.mapInventory(arg_0)).toList(), this.inventoryAdjustmentRepository.findTop10ByGroupIdAndItemIdOrderByCreatedAtDesc(groupId, itemId).stream().map(arg_0 -> this.mapAdjustment(arg_0)).toList());
    }

    public ApiTypes.HistoricalSnapshotResponse getItemSnapshot(AuthenticatedUser user, String itemId, String at) {
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        Instant targetInstant = this.parseSnapshotInstant(at);
        HashMap<String, ApiTypes.SnapshotRowResponse> rows = new HashMap<String, ApiTypes.SnapshotRowResponse>();
        for (InventoryAdjustmentEntity adjustment : this.inventoryAdjustmentRepository.findByGroupIdAndItemIdOrderByCreatedAtAsc(groupId, itemId)) {
            if (adjustment.createdAt.isAfter(targetInstant)) break;
            rows.put(adjustment.locationId, new ApiTypes.SnapshotRowResponse(adjustment.locationId, adjustment.locationName, adjustment.afterQuantity, adjustment.unit, this.getInventoryStatus(adjustment.afterQuantity, adjustment.lowStockThreshold)));
        }
        return new ApiTypes.HistoricalSnapshotResponse(at, ApiUtils.timestampLabel((Instant)targetInstant), rows.values().stream().filter(row -> row.quantity() > 0).toList());
    }

    @Transactional
    public ApiTypes.ItemCreateResponse createItem(AuthenticatedUser user, ApiTypes.CreateItemRequest request) {
        int lowStockThreshold;
        String name = this.trim(request == null ? null : request.name());
        String defaultUnit = this.trim(request == null ? null : request.defaultUnit());
        String locationId = this.trim(request == null ? null : request.locationId());
        int initialQuantity = request == null || request.initialQuantity() == null ? 0 : request.initialQuantity();
        int n = lowStockThreshold = request == null || request.lowStockThreshold() == null ? 3 : request.lowStockThreshold();
        if (name == null || defaultUnit == null || locationId == null) {
            throw new ApiException(400, "name, defaultUnit, locationId are required");
        }
        if (initialQuantity < 0) {
            throw new ApiException(400, "quantity must be zero or greater");
        }
        if (lowStockThreshold < 1) {
            throw new ApiException(400, "low stock threshold must be 1 or greater");
        }
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        this.accessService.requireInventoryWriteAccess(groupId, user.uid());
        if (this.itemRepository.countByGroupIdAndIsActiveTrue(groupId) >= 300L) {
            throw new ApiException(400, "you can register up to 300 items per group");
        }
        String barcode = this.trim(request.barcode());
        if (barcode != null && this.itemRepository.findByGroupIdAndBarcode(groupId, barcode).isPresent()) {
            throw new ApiException(409, "barcode already exists");
        }
        LocationEntity location = (LocationEntity)this.locationRepository.findById((Object)locationId).orElseThrow(() -> new ApiException(404, "location not found"));
        if (!groupId.equals(location.groupId)) {
            throw new ApiException(404, "location not found");
        }
        ItemEntity item = new ItemEntity();
        item.id = ApiUtils.generateId();
        item.groupId = groupId;
        item.name = name;
        item.barcode = barcode;
        item.defaultUnit = defaultUnit;
        item.memo = Objects.toString(request.memo(), "");
        item.lowStockThreshold = lowStockThreshold;
        item.createdBy = user.uid();
        item.updatedBy = user.uid();
        item.updatedAt = item.createdAt = Instant.now();
        this.itemRepository.save((Object)item);
        InventoryEntity inventory = new InventoryEntity();
        inventory.id = this.inventoryId(item.id, location.id);
        inventory.groupId = groupId;
        inventory.itemId = item.id;
        inventory.itemName = item.name;
        inventory.barcode = item.barcode;
        inventory.locationId = location.id;
        inventory.locationName = location.name;
        inventory.quantity = initialQuantity;
        inventory.unit = defaultUnit;
        inventory.lowStockThreshold = lowStockThreshold;
        inventory.updatedAt = inventory.createdAt = Instant.now();
        inventory.updatedBy = user.uid();
        this.inventoryRepository.save((Object)inventory);
        InventoryAdjustmentEntity adjustment = new InventoryAdjustmentEntity();
        adjustment.id = ApiUtils.generateId();
        adjustment.groupId = groupId;
        adjustment.itemId = item.id;
        adjustment.itemName = item.name;
        adjustment.locationId = location.id;
        adjustment.locationName = location.name;
        adjustment.beforeQuantity = 0;
        adjustment.afterQuantity = initialQuantity;
        adjustment.changeType = "create";
        adjustment.reason = "\uc2e0\uaddc \ud56d\ubaa9 \uc0dd\uc131";
        adjustment.createdBy = user.uid();
        adjustment.createdByName = profile.name;
        adjustment.unit = defaultUnit;
        adjustment.lowStockThreshold = lowStockThreshold;
        adjustment.createdAt = Instant.now();
        this.inventoryAdjustmentRepository.save((Object)adjustment);
        return new ApiTypes.ItemCreateResponse(item.id, inventory.id);
    }

    @Transactional
    public ApiTypes.AdjustmentCreateResponse createInventoryAdjustment(AuthenticatedUser user, ApiTypes.InventoryAdjustmentRequest request) {
        if (request == null || request.inventoryId() == null || request.changeType() == null || request.quantity() == null) {
            throw new ApiException(400, "inventoryId, changeType, quantity are required");
        }
        if (request.quantity() < 0) {
            throw new ApiException(400, "quantity must be zero or greater");
        }
        if (this.trim(request.reason()) == null) {
            throw new ApiException(400, "reason is required");
        }
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        this.accessService.requireInventoryWriteAccess(groupId, user.uid());
        InventoryEntity inventory = (InventoryEntity)this.inventoryRepository.findById((Object)request.inventoryId()).orElseThrow(() -> new ApiException(404, "inventory not found"));
        if (!groupId.equals(inventory.groupId)) {
            throw new ApiException(404, "inventory not found");
        }
        int nextQuantity = this.applyAdjustment(inventory.quantity, request.changeType(), request.quantity().intValue());
        if (nextQuantity < 0) {
            throw new ApiException(400, "result quantity cannot be negative");
        }
        String counterpartyName = null;
        if (this.trim(request.counterpartyId()) != null) {
            CounterpartyEntity counterparty = (CounterpartyEntity)this.counterpartyRepository.findById((Object)request.counterpartyId()).orElseThrow(() -> new ApiException(404, "counterparty not found"));
            if (!groupId.equals(counterparty.groupId)) {
                throw new ApiException(404, "counterparty not found");
            }
            counterpartyName = counterparty.name;
        }
        if ("transfer".equals(request.changeType())) {
            int targetBeforeQuantity;
            String targetLocationId = this.trim(request.targetLocationId());
            if (targetLocationId == null || targetLocationId.equals(inventory.locationId)) {
                throw new ApiException(400, "target location is required for transfer");
            }
            LocationEntity targetLocation = (LocationEntity)this.locationRepository.findById((Object)targetLocationId).orElseThrow(() -> new ApiException(404, "location not found"));
            if (!groupId.equals(targetLocation.groupId)) {
                throw new ApiException(404, "location not found");
            }
            int transferBeforeQuantity = inventory.quantity;
            inventory.quantity = nextQuantity;
            inventory.updatedAt = Instant.now();
            inventory.updatedBy = user.uid();
            this.inventoryRepository.save((Object)inventory);
            String targetInventoryId = this.inventoryId(inventory.itemId, targetLocation.id);
            InventoryEntity targetInventory = this.inventoryRepository.findById((Object)targetInventoryId).orElse(null);
            int n = targetBeforeQuantity = targetInventory == null ? 0 : targetInventory.quantity;
            if (targetInventory == null) {
                targetInventory = new InventoryEntity();
                targetInventory.id = targetInventoryId;
                targetInventory.groupId = groupId;
                targetInventory.itemId = inventory.itemId;
                targetInventory.itemName = inventory.itemName;
                targetInventory.barcode = inventory.barcode;
                targetInventory.locationId = targetLocation.id;
                targetInventory.locationName = targetLocation.name;
                targetInventory.unit = inventory.unit;
                targetInventory.lowStockThreshold = inventory.lowStockThreshold;
                targetInventory.createdAt = Instant.now();
            }
            targetInventory.quantity = targetBeforeQuantity + request.quantity();
            targetInventory.updatedAt = Instant.now();
            targetInventory.updatedBy = user.uid();
            this.inventoryRepository.save((Object)targetInventory);
            InventoryAdjustmentEntity transferOut = this.createAdjustment(groupId, inventory, inventory.locationId, inventory.locationName, transferBeforeQuantity, nextQuantity, "transfer_out", request.reason(), user.uid(), profile.name, null, targetLocation.name);
            this.inventoryAdjustmentRepository.save((Object)transferOut);
            InventoryAdjustmentEntity transferIn = this.createAdjustment(groupId, inventory, targetLocation.id, targetLocation.name, targetBeforeQuantity, targetInventory.quantity, "transfer_in", request.reason(), user.uid(), profile.name, null, inventory.locationName);
            this.inventoryAdjustmentRepository.save((Object)transferIn);
            return new ApiTypes.AdjustmentCreateResponse(inventory.id, transferOut.id, transferBeforeQuantity, nextQuantity);
        }
        int beforeQuantity = inventory.quantity;
        inventory.quantity = nextQuantity;
        inventory.updatedAt = Instant.now();
        inventory.updatedBy = user.uid();
        this.inventoryRepository.save((Object)inventory);
        InventoryAdjustmentEntity adjustment = this.createAdjustment(groupId, inventory, inventory.locationId, inventory.locationName, beforeQuantity, nextQuantity, request.changeType(), request.reason(), user.uid(), profile.name, counterpartyName, null);
        this.inventoryAdjustmentRepository.save((Object)adjustment);
        return new ApiTypes.AdjustmentCreateResponse(inventory.id, adjustment.id, beforeQuantity, nextQuantity);
    }

    public ApiTypes.BarcodeResolutionResponse resolveBarcode(AuthenticatedUser user, ApiTypes.BarcodeResolveRequest request) {
        String barcode = this.trim(request == null ? null : request.barcode());
        if (barcode == null) {
            throw new ApiException(400, "barcode is required");
        }
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        ItemEntity item = this.itemRepository.findByGroupIdAndBarcode(groupId, barcode).orElse(null);
        if (item == null) {
            return new ApiTypes.BarcodeResolutionResponse(false, null);
        }
        InventoryEntity inventory = this.inventoryRepository.findFirstByGroupIdAndItemId(groupId, item.id).orElse(null);
        if (inventory == null) {
            return new ApiTypes.BarcodeResolutionResponse(true, new ApiTypes.InventoryResponse(item.id, item.id, item.name, item.barcode, "", "\uc704\uce58 \ubbf8\ub4f1\ub85d", 0, item.defaultUnit, item.lowStockThreshold, true, "\ubd80\uc871", "\ubbf8\ub4f1\ub85d"));
        }
        return new ApiTypes.BarcodeResolutionResponse(true, this.mapInventory(inventory));
    }

    public ApiTypes.PlannerSummaryResponse getPlannerSummary(AuthenticatedUser user, String month) {
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        String targetMonth = this.trim(month) == null ? YearMonth.now(ApiUtils.SEOUL).toString() : month.trim();
        List<ApiTypes.PlannerTaskResponse> tasks = this.plannerTaskRepository.findByGroupId(groupId).stream().sorted(Comparator.comparing(task -> task.dueDate)).map(arg_0 -> this.mapPlannerTask(arg_0)).toList();
        List<ApiTypes.PlannerMemoResponse> memos = this.plannerMemoRepository.findByGroupId(groupId).stream().filter(memo -> memo.memoDate.startsWith(targetMonth)).sorted(Comparator.comparing(memo -> memo.memoDate)).map(arg_0 -> this.mapPlannerMemo(arg_0)).toList();
        return new ApiTypes.PlannerSummaryResponse(targetMonth, tasks, memos);
    }

    @Transactional
    public ApiTypes.IdResponse createPlannerTask(AuthenticatedUser user, ApiTypes.CreatePlannerTaskRequest request) {
        if (this.trim(request == null ? null : request.title()) == null || this.trim(request == null ? null : request.dueDate()) == null || !this.isCadence(request == null ? null : request.cadence())) {
            throw new ApiException(400, "title, cadence, dueDate are required");
        }
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        this.accessService.requireInventoryWriteAccess(groupId, user.uid());
        PlannerTaskEntity task = new PlannerTaskEntity();
        task.id = ApiUtils.generateId();
        task.groupId = groupId;
        task.title = request.title().trim();
        task.cadence = request.cadence();
        task.dueDate = request.dueDate().trim();
        task.reminderAt = this.trim(request.reminderAt());
        task.isDone = false;
        task.createdBy = user.uid();
        task.createdByName = profile.name;
        task.updatedAt = task.createdAt = Instant.now();
        this.plannerTaskRepository.save((Object)task);
        return new ApiTypes.IdResponse(task.id);
    }

    @Transactional
    public ApiTypes.PlannerTaskToggleResponse togglePlannerTask(AuthenticatedUser user, ApiTypes.TogglePlannerTaskRequest request) {
        if (this.trim(request == null ? null : request.taskId()) == null || request.isDone() == null) {
            throw new ApiException(400, "taskId and isDone are required");
        }
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        this.accessService.requireInventoryWriteAccess(groupId, user.uid());
        PlannerTaskEntity task = (PlannerTaskEntity)this.plannerTaskRepository.findById((Object)request.taskId()).orElseThrow(() -> new ApiException(404, "planner task not found"));
        if (!groupId.equals(task.groupId)) {
            throw new ApiException(404, "planner task not found");
        }
        task.isDone = request.isDone();
        task.updatedAt = Instant.now();
        task.updatedBy = user.uid();
        this.plannerTaskRepository.save((Object)task);
        return new ApiTypes.PlannerTaskToggleResponse(task.id, task.isDone);
    }

    @Transactional
    public ApiTypes.IdResponse upsertPlannerMemo(AuthenticatedUser user, ApiTypes.UpsertPlannerMemoRequest request) {
        if (this.trim(request == null ? null : request.memoDate()) == null || this.trim(request == null ? null : request.note()) == null) {
            throw new ApiException(400, "memoDate and note are required");
        }
        UserProfileEntity profile = this.accessService.requireActiveProfile(user.uid());
        String groupId = this.accessService.requireActiveGroup(profile);
        this.accessService.requireInventoryWriteAccess(groupId, user.uid());
        String id = this.inventoryId(groupId, request.memoDate().trim());
        PlannerMemoEntity memo = this.plannerMemoRepository.findById((Object)id).orElseGet(PlannerMemoEntity::new);
        memo.id = id;
        memo.groupId = groupId;
        memo.memoDate = request.memoDate().trim();
        memo.note = request.note().trim();
        memo.createdBy = user.uid();
        memo.createdByName = profile.name;
        if (memo.createdAt == null) {
            memo.createdAt = Instant.now();
        }
        memo.updatedAt = Instant.now();
        this.plannerMemoRepository.save((Object)memo);
        return new ApiTypes.IdResponse(memo.id);
    }

    private InventoryAdjustmentEntity createAdjustment(String groupId, InventoryEntity inventory, String locationId, String locationName, int beforeQuantity, int afterQuantity, String changeType, String reason, String createdBy, String createdByName, String counterpartyName, String relatedLocationName) {
        InventoryAdjustmentEntity adjustment = new InventoryAdjustmentEntity();
        adjustment.id = ApiUtils.generateId();
        adjustment.groupId = groupId;
        adjustment.itemId = inventory.itemId;
        adjustment.itemName = inventory.itemName;
        adjustment.locationId = locationId;
        adjustment.locationName = locationName;
        adjustment.beforeQuantity = beforeQuantity;
        adjustment.afterQuantity = afterQuantity;
        adjustment.changeType = changeType;
        adjustment.reason = reason.trim();
        adjustment.createdBy = createdBy;
        adjustment.createdByName = createdByName;
        adjustment.unit = inventory.unit;
        adjustment.lowStockThreshold = inventory.lowStockThreshold;
        adjustment.counterpartyName = counterpartyName;
        adjustment.relatedLocationName = relatedLocationName;
        adjustment.createdAt = Instant.now();
        return adjustment;
    }

    private int applyAdjustment(int quantity, String changeType, int delta) {
        return switch (changeType) {
            case "increase" -> quantity + delta;
            case "decrease", "transfer" -> quantity - delta;
            case "manual_edit" -> delta;
            default -> throw new ApiException(400, "inventoryId, changeType, quantity are required");
        };
    }

    private Instant parseSnapshotInstant(String at) {
        String value = this.trim(at);
        if (value == null) {
            throw new ApiException(400, "valid snapshot time is required");
        }
        try {
            return Instant.parse(value);
        }
        catch (DateTimeParseException ignore) {
            try {
                return LocalDateTime.parse(value).toInstant(ZoneOffset.ofHours(9));
            }
            catch (DateTimeParseException exception) {
                throw new ApiException(400, "valid snapshot time is required");
            }
        }
    }

    private ApiTypes.ItemResponse mapItem(ItemEntity item) {
        return new ApiTypes.ItemResponse(item.id, item.name, item.barcode, item.defaultUnit, item.memo, item.lowStockThreshold, item.isActive, ApiUtils.timestampLabel((Instant)item.createdAt), ApiUtils.timestampLabel((Instant)item.updatedAt));
    }

    private ApiTypes.InventoryResponse mapInventory(InventoryEntity inventory) {
        int safeThreshold = Math.max(1, inventory.lowStockThreshold);
        return new ApiTypes.InventoryResponse(inventory.id, inventory.itemId, inventory.itemName, inventory.barcode, inventory.locationId, inventory.locationName, inventory.quantity, inventory.unit, inventory.lowStockThreshold, inventory.quantity <= safeThreshold + 2, this.getInventoryStatus(inventory.quantity, inventory.lowStockThreshold), ApiUtils.timestampLabel((Instant)inventory.updatedAt));
    }

    private ApiTypes.AdjustmentResponse mapAdjustment(InventoryAdjustmentEntity adjustment) {
        return new ApiTypes.AdjustmentResponse(adjustment.id, adjustment.itemId, adjustment.itemName, adjustment.locationName, adjustment.beforeQuantity, adjustment.afterQuantity, adjustment.changeType, adjustment.reason, adjustment.createdByName, adjustment.counterpartyName, adjustment.relatedLocationName, ApiUtils.timestampLabel((Instant)adjustment.createdAt));
    }

    private ApiTypes.PlannerTaskResponse mapPlannerTask(PlannerTaskEntity task) {
        return new ApiTypes.PlannerTaskResponse(task.id, task.title, task.cadence, task.dueDate, task.reminderAt, this.formatReminderLabel(task.reminderAt), task.isDone, task.createdByName);
    }

    private ApiTypes.PlannerMemoResponse mapPlannerMemo(PlannerMemoEntity memo) {
        return new ApiTypes.PlannerMemoResponse(memo.id, memo.memoDate, memo.note, memo.createdByName, ApiUtils.timestampLabel((Instant)memo.updatedAt));
    }

    private String formatReminderLabel(String reminderAt) {
        if (this.trim(reminderAt) == null) {
            return null;
        }
        try {
            return ApiUtils.timestampLabel((Instant)Instant.parse(reminderAt));
        }
        catch (DateTimeParseException ignore) {
            return reminderAt;
        }
    }

    private String getInventoryStatus(int quantity, int lowStockThreshold) {
        int safeThreshold = Math.max(1, lowStockThreshold);
        if (quantity <= safeThreshold) {
            return "\ubd80\uc871";
        }
        if (quantity <= safeThreshold + 2) {
            return "\uc8fc\uc758";
        }
        return "\uc815\uc0c1";
    }

    private boolean isCadence(String cadence) {
        return "daily".equals(cadence) || "weekly".equals(cadence) || "monthly".equals(cadence);
    }

    private String inventoryId(String left, String right) {
        return left + "_" + right;
    }

    private String trim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static /* synthetic */ ApiTypes.LocationResponse lambda$getLocations$3(Map aggregate, LocationEntity location) {
        int[] current = aggregate.getOrDefault(location.id, new int[]{0, 0});
        return new ApiTypes.LocationResponse(location.id, location.name, location.type, location.description, current[0], current[1]);
    }
}

