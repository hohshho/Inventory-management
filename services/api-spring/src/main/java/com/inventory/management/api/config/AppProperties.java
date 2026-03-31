package com.inventory.management.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String corsOrigin = "*";
    private String masterEmail = "devhshoon@gmail.com";
    private FirebaseProperties firebase = new FirebaseProperties();

    public String getCorsOrigin() {
        return corsOrigin;
    }

    public void setCorsOrigin(String corsOrigin) {
        this.corsOrigin = corsOrigin;
    }

    public String getMasterEmail() {
        return masterEmail;
    }

    public void setMasterEmail(String masterEmail) {
        this.masterEmail = masterEmail;
    }

    public FirebaseProperties getFirebase() {
        return firebase;
    }

    public void setFirebase(FirebaseProperties firebase) {
        this.firebase = firebase;
    }

    public static class FirebaseProperties {
        private String appEnv = "development";
        private String serviceAccountPathDev = "secret/firebase.dev.json";
        private String serviceAccountPathProd = "secret/firebase.prod.json";
        private String projectIdDev;
        private String clientEmailDev;
        private String privateKeyDev;
        private String projectIdProd;
        private String clientEmailProd;
        private String privateKeyProd;

        public String getAppEnv() {
            return appEnv;
        }

        public void setAppEnv(String appEnv) {
            this.appEnv = appEnv;
        }

        public String getServiceAccountPathDev() {
            return serviceAccountPathDev;
        }

        public void setServiceAccountPathDev(String serviceAccountPathDev) {
            this.serviceAccountPathDev = serviceAccountPathDev;
        }

        public String getServiceAccountPathProd() {
            return serviceAccountPathProd;
        }

        public void setServiceAccountPathProd(String serviceAccountPathProd) {
            this.serviceAccountPathProd = serviceAccountPathProd;
        }

        public String getProjectIdDev() {
            return projectIdDev;
        }

        public void setProjectIdDev(String projectIdDev) {
            this.projectIdDev = projectIdDev;
        }

        public String getClientEmailDev() {
            return clientEmailDev;
        }

        public void setClientEmailDev(String clientEmailDev) {
            this.clientEmailDev = clientEmailDev;
        }

        public String getPrivateKeyDev() {
            return privateKeyDev;
        }

        public void setPrivateKeyDev(String privateKeyDev) {
            this.privateKeyDev = privateKeyDev;
        }

        public String getProjectIdProd() {
            return projectIdProd;
        }

        public void setProjectIdProd(String projectIdProd) {
            this.projectIdProd = projectIdProd;
        }

        public String getClientEmailProd() {
            return clientEmailProd;
        }

        public void setClientEmailProd(String clientEmailProd) {
            this.clientEmailProd = clientEmailProd;
        }

        public String getPrivateKeyProd() {
            return privateKeyProd;
        }

        public void setPrivateKeyProd(String privateKeyProd) {
            this.privateKeyProd = privateKeyProd;
        }
    }
}
