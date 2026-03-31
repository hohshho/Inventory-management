package com.inventory.management.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AppProperties.class)
public class FirebaseAdminConfig {
    @Bean
    public FirebaseApp firebaseApp(AppProperties appProperties) throws IOException {
        FirebaseOptions options = FirebaseOptions.builder()
            .setCredentials(resolveCredentials(appProperties.getFirebase()))
            .setProjectId(resolveProjectId(appProperties.getFirebase()))
            .build();

        if (FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.initializeApp(options);
        }

        return FirebaseApp.getInstance();
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }

    @Bean
    public Firestore firestore(FirebaseApp firebaseApp) {
        return FirestoreClient.getFirestore(firebaseApp);
    }

    private GoogleCredentials resolveCredentials(AppProperties.FirebaseProperties properties) throws IOException {
        boolean production = "production".equalsIgnoreCase(properties.getAppEnv());
        String projectId = production ? properties.getProjectIdProd() : properties.getProjectIdDev();
        String clientEmail = production ? properties.getClientEmailProd() : properties.getClientEmailDev();
        String privateKey = production ? properties.getPrivateKeyProd() : properties.getPrivateKeyDev();

        if (hasText(projectId) && hasText(clientEmail) && hasText(privateKey)) {
            String json = """
                {
                  "type": "service_account",
                  "project_id": "%s",
                  "private_key": "%s",
                  "client_email": "%s"
                }
                """.formatted(
                escapeJson(projectId),
                escapeJson(privateKey.replace("\\n", "\n")),
                escapeJson(clientEmail)
            );

            try (ByteArrayInputStream inputStream = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8))) {
                return ServiceAccountCredentials.fromStream(inputStream);
            }
        }

        String pathValue = production ? properties.getServiceAccountPathProd() : properties.getServiceAccountPathDev();
        if (hasText(pathValue)) {
            Path path = resolveCredentialPath(pathValue);
            if (path != null) {
                try (FileInputStream inputStream = new FileInputStream(path.toFile())) {
                    return GoogleCredentials.fromStream(inputStream);
                }
            }
        }

        return GoogleCredentials.getApplicationDefault();
    }

    private String resolveProjectId(AppProperties.FirebaseProperties properties) {
        boolean production = "production".equalsIgnoreCase(properties.getAppEnv());
        String configured = production ? properties.getProjectIdProd() : properties.getProjectIdDev();
        if (hasText(configured)) {
            return configured;
        }

        String googleCloudProject = System.getenv("GOOGLE_CLOUD_PROJECT");
        if (hasText(googleCloudProject)) {
            return googleCloudProject;
        }

        String gcloudProject = System.getenv("GCLOUD_PROJECT");
        if (hasText(gcloudProject)) {
            return gcloudProject;
        }

        return null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private Path resolveCredentialPath(String pathValue) {
        Path directPath = Path.of(pathValue);
        if (directPath.isAbsolute() && Files.exists(directPath)) {
            return directPath;
        }

        Path cursor = Path.of("").toAbsolutePath().normalize();
        for (int depth = 0; depth < 5 && cursor != null; depth++) {
            Path candidate = cursor.resolve(pathValue).normalize();
            if (Files.exists(candidate)) {
                return candidate;
            }
            cursor = cursor.getParent();
        }

        return null;
    }

    private String escapeJson(String value) {
        return Objects.toString(value, "")
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n");
    }
}
