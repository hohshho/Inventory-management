/*
 * Decompiled with CFR 0.152.
 */
package org.springframework.boot.loader.jar;

import java.io.Closeable;
import java.io.DataInputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.jar.JarEntry;
import java.util.jar.JarInputStream;
import java.util.zip.Inflater;
import org.springframework.boot.loader.jar.ZipInflaterInputStream;

class JarEntriesStream
implements Closeable {
    private static final int BUFFER_SIZE = 4096;
    private final JarInputStream in;
    private final byte[] inBuffer = new byte[4096];
    private final byte[] compareBuffer = new byte[4096];
    private final Inflater inflater = new Inflater(true);
    private JarEntry entry;

    JarEntriesStream(InputStream in) throws IOException {
        this.in = new JarInputStream(in);
    }

    JarEntry getNextEntry() throws IOException {
        this.entry = this.in.getNextJarEntry();
        this.inflater.reset();
        return this.entry;
    }

    boolean matches(boolean directory, int size, int compressionMethod, InputStreamSupplier streamSupplier) throws IOException {
        if (this.entry.isDirectory() != directory) {
            this.fail("directory");
        }
        if (this.entry.getMethod() != compressionMethod) {
            this.fail("compression method");
        }
        if (this.entry.isDirectory()) {
            this.in.closeEntry();
            return true;
        }
        try (DataInputStream expected = new DataInputStream(this.getInputStream(size, streamSupplier));){
            this.assertSameContent(expected);
        }
        return true;
    }

    private InputStream getInputStream(int size, InputStreamSupplier streamSupplier) throws IOException {
        InputStream inputStream = streamSupplier.get();
        return this.entry.getMethod() != 8 ? inputStream : new ZipInflaterInputStream(inputStream, this.inflater, size);
    }

    private void assertSameContent(DataInputStream expected) throws IOException {
        int len;
        while ((len = this.in.read(this.inBuffer)) > 0) {
            try {
                expected.readFully(this.compareBuffer, 0, len);
                if (Arrays.equals(this.inBuffer, 0, len, this.compareBuffer, 0, len)) {
                    continue;
                }
            }
            catch (EOFException eOFException) {
                // empty catch block
            }
            this.fail("content");
        }
        if (expected.read() != -1) {
            this.fail("content");
        }
    }

    private void fail(String check) {
        throw new IllegalStateException("Content mismatch when reading security info for entry '%s' (%s check)".formatted(this.entry.getName(), check));
    }

    @Override
    public void close() throws IOException {
        this.inflater.end();
        this.in.close();
    }

    @FunctionalInterface
    static interface InputStreamSupplier {
        public InputStream get() throws IOException;
    }
}

