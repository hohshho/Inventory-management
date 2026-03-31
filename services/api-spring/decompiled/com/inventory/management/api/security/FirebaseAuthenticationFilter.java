/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.firebase.auth.FirebaseAuth
 *  com.google.firebase.auth.FirebaseAuthException
 *  com.google.firebase.auth.FirebaseToken
 *  com.inventory.management.api.security.AuthenticatedUser
 *  com.inventory.management.api.security.FirebaseAuthenticationFilter
 *  jakarta.servlet.FilterChain
 *  jakarta.servlet.ServletException
 *  jakarta.servlet.ServletRequest
 *  jakarta.servlet.ServletResponse
 *  jakarta.servlet.http.HttpServletRequest
 *  jakarta.servlet.http.HttpServletResponse
 *  org.springframework.stereotype.Component
 *  org.springframework.web.filter.OncePerRequestFilter
 */
package com.inventory.management.api.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.inventory.management.api.security.AuthenticatedUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class FirebaseAuthenticationFilter
extends OncePerRequestFilter {
    public static final String REQUEST_ATTRIBUTE = AuthenticatedUser.class.getName();
    private final FirebaseAuth firebaseAuth;

    public FirebaseAuthenticationFilter(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod()) || "/health".equals(request.getRequestURI());
    }

    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            this.writeUnauthorized(response);
            return;
        }
        String token = authorization.substring("Bearer ".length());
        try {
            FirebaseToken decodedToken = this.firebaseAuth.verifyIdToken(token);
            request.setAttribute(REQUEST_ATTRIBUTE, (Object)new AuthenticatedUser(decodedToken.getUid(), decodedToken.getEmail(), decodedToken.getName()));
            filterChain.doFilter((ServletRequest)request, (ServletResponse)response);
        }
        catch (FirebaseAuthException exception) {
            this.writeUnauthorized(response);
        }
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(401);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"Unauthorized\"}");
    }
}

