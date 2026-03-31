/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.auth.oauth2.GoogleCredentials
 *  com.google.auth.oauth2.ServiceAccountCredentials
 *  com.google.firebase.FirebaseApp
 *  com.google.firebase.FirebaseOptions
 *  com.google.firebase.auth.FirebaseAuth
 *  com.inventory.management.api.config.AppProperties
 *  com.inventory.management.api.config.AppProperties$FirebaseProperties
 *  com.inventory.management.api.config.FirebaseAdminConfig
 *  org.springframework.boot.context.properties.EnableConfigurationProperties
 *  org.springframework.context.annotation.Bean
 *  org.springframework.context.annotation.Configuration
 */
package com.inventory.management.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.inventory.management.api.config.AppProperties;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.Objects;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(value={AppProperties.class})
public class FirebaseAdminConfig {
    @Bean
    public FirebaseApp firebaseApp(AppProperties appProperties) throws IOException {
        FirebaseOptions options = FirebaseOptions.builder().setCredentials(this.resolveCredentials(appProperties.getFirebase())).build();
        if (FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.initializeApp((FirebaseOptions)options);
        }
        return FirebaseApp.getInstance();
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance((FirebaseApp)firebaseApp);
    }

    private GoogleCredentials resolveCredentials(AppProperties.FirebaseProperties properties) throws IOException {
        String privateKey;
        boolean production = "production".equalsIgnoreCase(properties.getAppEnv());
        String projectId = production ? properties.getProjectIdProd() : properties.getProjectIdDev();
        String clientEmail = production ? properties.getClientEmailProd() : properties.getClientEmailDev();
        String string = privateKey = production ? properties.getPrivateKeyProd() : properties.getPrivateKeyDev();
        if (this.hasText(projectId) && this.hasText(clientEmail) && this.hasText(privateKey)) {
            String json = "{\n  \"type\":\"service_account\",\n  \"project_id\":\"%s\",\n  \"private_key\":\"%s\",\n  \"client_email\":\"%s\"\n}\n".formatted(this.escapeJson(projectId), this.escapeJson(privateKey.replace("\\n", "\n")), this.escapeJson(clientEmail));
            try (ByteArrayInputStream inputStream = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));){
                ServiceAccountCredentials serviceAccountCredentials = ServiceAccountCredentials.fromStream((InputStream)inputStream);
                return serviceAccountCredentials;
            }
        }
        String pathValue = production ? properties.getServiceAccountPathProd() : properties.getServiceAccountPathDev();
        Path path = Path.of(pathValue, new String[0]);
        if (!path.isAbsolute()) {
            path = Path.of("", new String[0]).toAbsolutePath().resolve(pathValue).normalize();
        }
        if (Files.exists(path, new LinkOption[0])) {
            try (FileInputStream inputStream = new FileInputStream(path.toFile());){
                GoogleCredentials googleCredentials = GoogleCredentials.fromStream((InputStream)inputStream);
                return googleCredentials;
            }
        }
        return GoogleCredentials.getApplicationDefault();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String escapeJson(String value) {
        return Objects.toString(value, "").replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}

