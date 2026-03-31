/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.inventory.management.api.web.ApiException
 *  com.inventory.management.api.web.ApiExceptionHandler
 *  org.springframework.http.ResponseEntity
 *  org.springframework.web.bind.annotation.ExceptionHandler
 *  org.springframework.web.bind.annotation.RestControllerAdvice
 */
package com.inventory.management.api.web;

import com.inventory.management.api.web.ApiException;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(value={ApiException.class})
    public ResponseEntity<Map<String, String>> handleApiException(ApiException exception) {
        return ResponseEntity.status((int)exception.getStatus()).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(value={Exception.class})
    public ResponseEntity<Map<String, String>> handleException(Exception exception) {
        exception.printStackTrace();
        return ResponseEntity.status((int)500).body(Map.of("message", "Internal server error"));
    }
}

