/*
 * Decompiled with CFR 0.152.
 */
package org.springframework.boot.loader.launch;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.lang.reflect.Method;
import java.net.URL;
import java.util.Collection;
import java.util.Set;
import java.util.jar.Attributes;
import java.util.jar.Manifest;
import org.springframework.boot.loader.launch.Archive;
import org.springframework.boot.loader.launch.ClassPathIndexFile;
import org.springframework.boot.loader.launch.JarModeRunner;
import org.springframework.boot.loader.launch.LaunchedClassLoader;
import org.springframework.boot.loader.net.protocol.Handlers;

public abstract class Launcher {
    private static final String JAR_MODE_RUNNER_CLASS_NAME = JarModeRunner.class.getName();
    protected static final String BOOT_CLASSPATH_INDEX_ATTRIBUTE = "Spring-Boot-Classpath-Index";
    protected static final String DEFAULT_CLASSPATH_INDEX_FILE_NAME = "classpath.idx";
    protected ClassPathIndexFile classPathIndex;

    protected void launch(String[] args) throws Exception {
        if (!this.isExploded()) {
            Handlers.register();
        }
        try {
            ClassLoader classLoader = this.createClassLoader(this.getClassPathUrls());
            String jarMode = System.getProperty("jarmode");
            String mainClassName = this.hasLength(jarMode) ? JAR_MODE_RUNNER_CLASS_NAME : this.getMainClass();
            this.launch(classLoader, mainClassName, args);
        }
        catch (UncheckedIOException ex) {
            throw ex.getCause();
        }
    }

    private boolean hasLength(String jarMode) {
        return jarMode != null && !jarMode.isEmpty();
    }

    protected ClassLoader createClassLoader(Collection<URL> urls) throws Exception {
        return this.createClassLoader(urls.toArray(new URL[0]));
    }

    private ClassLoader createClassLoader(URL[] urls) {
        ClassLoader parent = this.getClass().getClassLoader();
        return new LaunchedClassLoader(this.isExploded(), this.getArchive(), urls, parent);
    }

    protected void launch(ClassLoader classLoader, String mainClassName, String[] args) throws Exception {
        Thread.currentThread().setContextClassLoader(classLoader);
        Class<?> mainClass = Class.forName(mainClassName, false, classLoader);
        Method mainMethod = mainClass.getDeclaredMethod("main", String[].class);
        mainMethod.setAccessible(true);
        mainMethod.invoke(null, new Object[]{args});
    }

    protected boolean isExploded() {
        Archive archive = this.getArchive();
        return archive != null && archive.isExploded();
    }

    ClassPathIndexFile getClassPathIndex(Archive archive) throws IOException {
        if (!archive.isExploded()) {
            return null;
        }
        String location = this.getClassPathIndexFileLocation(archive);
        return ClassPathIndexFile.loadIfPossible(archive.getRootDirectory(), location);
    }

    private String getClassPathIndexFileLocation(Archive archive) throws IOException {
        Manifest manifest = archive.getManifest();
        Attributes attributes = manifest != null ? manifest.getMainAttributes() : null;
        String location = attributes != null ? attributes.getValue(BOOT_CLASSPATH_INDEX_ATTRIBUTE) : null;
        return location != null ? location : this.getEntryPathPrefix() + DEFAULT_CLASSPATH_INDEX_FILE_NAME;
    }

    protected abstract Archive getArchive();

    protected abstract String getMainClass() throws Exception;

    protected abstract Set<URL> getClassPathUrls() throws Exception;

    protected String getEntryPathPrefix() {
        return "BOOT-INF/";
    }

    protected boolean isIncludedOnClassPath(Archive.Entry entry) {
        return this.isLibraryFileOrClassesDirectory(entry);
    }

    protected boolean isLibraryFileOrClassesDirectory(Archive.Entry entry) {
        String name = entry.name();
        if (entry.isDirectory()) {
            return name.equals("BOOT-INF/classes/");
        }
        return name.startsWith("BOOT-INF/lib/");
    }

    protected boolean isIncludedOnClassPathAndNotIndexed(Archive.Entry entry) {
        if (!this.isIncludedOnClassPath(entry)) {
            return false;
        }
        return this.classPathIndex == null || !this.classPathIndex.containsEntry(entry.name());
    }
}

