/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.security.AuthenticatedUser
 *  com.inventory.management.api.security.FirebaseAuthenticationFilter
 *  com.inventory.management.api.util.ApiUtils
 *  com.inventory.management.api.web.ApiException
 *  jakarta.servlet.http.HttpServletRequest
 */
package com.inventory.management.api.util;

import com.inventory.management.api.security.AuthenticatedUser;
import com.inventory.management.api.security.FirebaseAuthenticationFilter;
import com.inventory.management.api.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

public final class ApiUtils {
    public static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    public static final DateTimeFormatter KO_DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy. M. d. a h:mm:ss", Locale.KOREA).withZone(SEOUL);

    private ApiUtils() {
    }

    public static AuthenticatedUser getAuthenticatedUser(HttpServletRequest request) {
        Object value = request.getAttribute(FirebaseAuthenticationFilter.REQUEST_ATTRIBUTE);
        if (value instanceof AuthenticatedUser) {
            AuthenticatedUser authenticatedUser = (AuthenticatedUser)value;
            return authenticatedUser;
        }
        throw new ApiException(401, "Unauthorized");
    }

    public static String timestampLabel(Instant instant) {
        if (instant == null) {
            return "\ubc29\uae08 \uc804";
        }
        return KO_DATE_TIME_FORMATTER.format(instant);
    }

    public static String generateId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    public static String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    public static String randomInviteCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }
}

