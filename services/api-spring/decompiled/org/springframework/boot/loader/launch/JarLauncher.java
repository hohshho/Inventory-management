/*
 * Decompiled with CFR 0.152.
 */
package org.springframework.boot.loader.launch;

import org.springframework.boot.loader.launch.Archive;
import org.springframework.boot.loader.launch.ExecutableArchiveLauncher;

public class JarLauncher
extends ExecutableArchiveLauncher {
    public JarLauncher() throws Exception {
    }

    protected JarLauncher(Archive archive) throws Exception {
        super(archive);
    }

    public static void main(String[] args) throws Exception {
        new JarLauncher().launch(args);
    }
}

