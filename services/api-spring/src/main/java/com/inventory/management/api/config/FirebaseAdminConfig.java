package com.inventory.management.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AppProperties.class)
public class FirebaseAdminConfig {
    private final AppProperties appProperties;

    public FirebaseAdminConfig(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        AppProperties.FirebaseProperties firebase = appProperties.getFirebase();
        String appEnv = normalizeEnv(firebase.getAppEnv());
        String projectId = isProduction(appEnv) ? firebase.getProjectIdProd() : firebase.getProjectIdDev();
        String clientEmail = isProduction(appEnv) ? firebase.getClientEmailProd() : firebase.getClientEmailDev();
        String privateKey = isProduction(appEnv) ? firebase.getPrivateKeyProd() : firebase.getPrivateKeyDev();
        String serviceAccountPath = isProduction(appEnv)
            ? firebase.getServiceAccountPathProd()
            : firebase.getServiceAccountPathDev();

        FirebaseOptions.Builder builder = FirebaseOptions.builder().setCredentials(
            resolveCredentials(projectId, clientEmail, privateKey, serviceAccountPath)
        );
        if (hasText(projectId)) {
            builder.setProjectId(projectId);
        }

        List<FirebaseApp> apps = FirebaseApp.getApps();
        if (!apps.isEmpty()) {
            return apps.get(0);
        }
        return FirebaseApp.initializeApp(builder.build());
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }

    private GoogleCredentials resolveCredentials(
        String projectId,
        String clientEmail,
        String privateKey,
        String serviceAccountPath
    ) throws IOException {
        if (hasText(projectId) && hasText(clientEmail) && hasText(privateKey)) {
            String json = """
                {
                  "type": "service_account",
                  "project_id": "%s",
                  "private_key_id": "local-inline-key",
                  "private_key": "%s",
                  "client_email": "%s",
                  "client_id": "local-inline-client",
                  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                  "token_uri": "https://oauth2.googleapis.com/token",
                  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/%s"
                }
                """.formatted(
                escapeJson(projectId),
                escapeJson(privateKey.replace("\\n", "\n")),
                escapeJson(clientEmail),
                escapeJson(clientEmail)
            );
            try (InputStream inputStream = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8))) {
                return GoogleCredentials.fromStream(inputStream);
            }
        }

        Path credentialsPath = resolvePath(serviceAccountPath);
        if (credentialsPath != null && Files.exists(credentialsPath)) {
            try (InputStream inputStream = Files.newInputStream(credentialsPath)) {
                return GoogleCredentials.fromStream(inputStream);
            }
        }

        return GoogleCredentials.getApplicationDefault();
    }

    private Path resolvePath(String rawPath) {
        if (!hasText(rawPath)) {
            return null;
        }

        Path directPath = Paths.get(rawPath);
        if (directPath.isAbsolute() && Files.exists(directPath)) {
            return directPath;
        }

        Path current = Paths.get("").toAbsolutePath();
        while (current != null) {
            Path candidate = current.resolve(rawPath).normalize();
            if (Files.exists(candidate)) {
                return candidate;
            }
            current = current.getParent();
        }
        return directPath;
    }

    private String normalizeEnv(String appEnv) {
        return hasText(appEnv) ? appEnv.trim().toLowerCase() : "development";
    }

    private boolean isProduction(String appEnv) {
        return "production".equals(appEnv);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String escapeJson(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n");
    }
}
