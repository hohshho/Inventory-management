/*
 * Decompiled with CFR 0.152.
 */
package org.springframework.boot.loader.jar;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.security.CodeSigner;
import java.security.cert.Certificate;
import java.util.jar.JarEntry;
import org.springframework.boot.loader.jar.JarEntriesStream;
import org.springframework.boot.loader.zip.ZipContent;

final class SecurityInfo {
    static final SecurityInfo NONE = new SecurityInfo(null, null);
    private final Certificate[][] certificateLookups;
    private final CodeSigner[][] codeSignerLookups;

    private SecurityInfo(Certificate[][] entryCertificates, CodeSigner[][] entryCodeSigners) {
        this.certificateLookups = entryCertificates;
        this.codeSignerLookups = entryCodeSigners;
    }

    Certificate[] getCertificates(ZipContent.Entry contentEntry) {
        return this.certificateLookups != null ? this.clone(this.certificateLookups[contentEntry.getLookupIndex()]) : null;
    }

    CodeSigner[] getCodeSigners(ZipContent.Entry contentEntry) {
        return this.codeSignerLookups != null ? this.clone(this.codeSignerLookups[contentEntry.getLookupIndex()]) : null;
    }

    private <T> T[] clone(T[] array) {
        return array != null ? (Object[])array.clone() : null;
    }

    static SecurityInfo get(ZipContent content) {
        if (!content.hasJarSignatureFile()) {
            return NONE;
        }
        try {
            return SecurityInfo.load(content);
        }
        catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static SecurityInfo load(ZipContent content) throws IOException {
        int size = content.size();
        boolean hasSecurityInfo = false;
        Certificate[][] entryCertificates = new Certificate[size][];
        CodeSigner[][] entryCodeSigners = new CodeSigner[size][];
        try (JarEntriesStream entries = new JarEntriesStream(content.openRawZipData().asInputStream());){
            JarEntry entry = entries.getNextEntry();
            while (entry != null) {
                ZipContent.Entry relatedEntry = content.getEntry(entry.getName());
                if (relatedEntry != null && entries.matches(relatedEntry.isDirectory(), relatedEntry.getUncompressedSize(), relatedEntry.getCompressionMethod(), () -> relatedEntry.openContent().asInputStream())) {
                    Certificate[] certificates = entry.getCertificates();
                    CodeSigner[] codeSigners = entry.getCodeSigners();
                    if (certificates != null || codeSigners != null) {
                        hasSecurityInfo = true;
                        entryCertificates[relatedEntry.getLookupIndex()] = certificates;
                        entryCodeSigners[relatedEntry.getLookupIndex()] = codeSigners;
                    }
                }
                entry = entries.getNextEntry();
            }
        }
        return !hasSecurityInfo ? NONE : new SecurityInfo(entryCertificates, entryCodeSigners);
    }
}

