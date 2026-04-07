package com.inventory.management.api.repository;

import com.inventory.management.api.model.UserProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfileEntity, String> {}
