package com.inventory.management.api.repository;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QuerySnapshot;
import com.inventory.management.api.web.ApiException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

abstract class FirestoreRepositorySupport<E> {
    private final Firestore firestore;
    private final Class<E> entityType;
    private final String collectionName;

    protected FirestoreRepositorySupport(Firestore firestore, Class<E> entityType, String collectionName) {
        this.firestore = firestore;
        this.entityType = entityType;
        this.collectionName = collectionName;
    }

    protected Optional<E> findByIdInternal(Object id) {
        if (id == null) {
            return Optional.empty();
        }

        DocumentSnapshot snapshot = get(document(String.valueOf(id)).get());
        if (!snapshot.exists()) {
            return Optional.empty();
        }

        return Optional.of(map(snapshot));
    }

    protected List<E> findAllInternal() {
        return map(get(collection().get()));
    }

    protected E saveInternal(Object entity) {
        @SuppressWarnings("unchecked")
        E typedEntity = (E) entity;
        String id = readId(typedEntity);
        if (id == null || id.isBlank()) {
            throw new ApiException(500, "repository entity id is required");
        }

        get(document(id).set(serialize(typedEntity)));
        return typedEntity;
    }

    protected List<E> list(Query query) {
        return map(get(query.get()));
    }

    protected Optional<E> first(Query query) {
        List<E> rows = list(query.limit(1));
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    protected long count(Query query) {
        return list(query).size();
    }

    protected Query baseQuery() {
        return collection();
    }

    protected CollectionReference collection() {
        return firestore.collection(collectionName);
    }

    private com.google.cloud.firestore.DocumentReference document(String id) {
        return collection().document(id);
    }

    private List<E> map(QuerySnapshot snapshot) {
        List<E> rows = new ArrayList<>();
        for (DocumentSnapshot doc : snapshot.getDocuments()) {
            if (doc.exists()) {
                rows.add(map(doc));
            }
        }
        return rows;
    }

    private E map(DocumentSnapshot snapshot) {
        try {
            E entity = entityType.getDeclaredConstructor().newInstance();
            for (Field field : entityType.getFields()) {
                if (Modifier.isStatic(field.getModifiers())) {
                    continue;
                }

                if ("id".equals(field.getName())) {
                    field.set(entity, snapshot.getId());
                    continue;
                }

                Object value = snapshot.get(field.getName());
                if (value == null) {
                    continue;
                }

                field.set(entity, convertValue(value, field.getType()));
            }
            return entity;
        } catch (ReflectiveOperationException exception) {
            throw new ApiException(500, "repository mapping failed");
        }
    }

    private Map<String, Object> serialize(E entity) {
        Map<String, Object> map = new HashMap<>();
        try {
            for (Field field : entityType.getFields()) {
                if (Modifier.isStatic(field.getModifiers()) || "id".equals(field.getName())) {
                    continue;
                }

                Object value = field.get(entity);
                map.put(field.getName(), convertForWrite(value));
            }
            return map;
        } catch (IllegalAccessException exception) {
            throw new ApiException(500, "repository serialization failed");
        }
    }

    private String readId(E entity) {
        try {
            Field field = entityType.getField("id");
            Object value = field.get(entity);
            return value == null ? null : String.valueOf(value);
        } catch (ReflectiveOperationException exception) {
            throw new ApiException(500, "repository entity id access failed");
        }
    }

    private Object convertValue(Object value, Class<?> targetType) {
        if (targetType == Instant.class) {
            if (value instanceof Timestamp timestamp) {
                return Instant.ofEpochSecond(timestamp.getSeconds(), timestamp.getNanos());
            }
            if (value instanceof Date date) {
                return date.toInstant();
            }
        }

        if ((targetType == Integer.class || targetType == int.class) && value instanceof Number number) {
            return number.intValue();
        }

        if ((targetType == Long.class || targetType == long.class) && value instanceof Number number) {
            return number.longValue();
        }

        if ((targetType == Boolean.class || targetType == boolean.class) && value instanceof Boolean bool) {
            return bool;
        }

        if (targetType == String.class) {
            return Objects.toString(value, null);
        }

        return value;
    }

    private Object convertForWrite(Object value) {
        if (value instanceof Instant instant) {
            return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
        }
        return value;
    }

    private <T> T get(ApiFuture<T> future) {
        try {
            return future.get();
        } catch (Exception exception) {
            throw new ApiException(500, "firestore repository request failed");
        }
    }
}
