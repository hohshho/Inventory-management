/*
 * Decompiled with CFR 0.152.
 */
package org.springframework.boot.loader.launch;

import java.net.URL;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Set;
import java.util.jar.Manifest;
import org.springframework.boot.loader.launch.Archive;
import org.springframework.boot.loader.launch.Launcher;

public abstract class ExecutableArchiveLauncher
extends Launcher {
    private static final String START_CLASS_ATTRIBUTE = "Start-Class";
    private final Archive archive;

    public ExecutableArchiveLauncher() throws Exception {
        this(Archive.create(Launcher.class));
    }

    protected ExecutableArchiveLauncher(Archive archive) throws Exception {
        this.archive = archive;
        this.classPathIndex = this.getClassPathIndex(this.archive);
    }

    @Override
    protected ClassLoader createClassLoader(Collection<URL> urls) throws Exception {
        if (this.classPathIndex != null) {
            urls = new ArrayList<URL>(urls);
            urls.addAll(this.classPathIndex.getUrls());
        }
        return super.createClassLoader(urls);
    }

    @Override
    protected final Archive getArchive() {
        return this.archive;
    }

    @Override
    protected String getMainClass() throws Exception {
        String mainClass;
        Manifest manifest = this.archive.getManifest();
        String string = mainClass = manifest != null ? manifest.getMainAttributes().getValue(START_CLASS_ATTRIBUTE) : null;
        if (mainClass == null) {
            throw new IllegalStateException("No 'Start-Class' manifest entry specified in " + this);
        }
        return mainClass;
    }

    @Override
    protected Set<URL> getClassPathUrls() throws Exception {
        return this.archive.getClassPathUrls(this::isIncludedOnClassPathAndNotIndexed, this::isSearchedDirectory);
    }

    protected boolean isSearchedDirectory(Archive.Entry entry) {
        return (this.getEntryPathPrefix() == null || entry.name().startsWith(this.getEntryPathPrefix())) && !this.isIncludedOnClassPath(entry);
    }
}

