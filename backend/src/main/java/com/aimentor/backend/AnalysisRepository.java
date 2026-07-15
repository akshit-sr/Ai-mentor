package com.aimentor.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AnalysisRepository extends JpaRepository<Analysis, Long> {
    List<Analysis> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Analysis> findByIdAndUserId(Long id, Long userId);
}
