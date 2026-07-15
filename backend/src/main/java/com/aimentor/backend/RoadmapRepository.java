package com.aimentor.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RoadmapRepository extends JpaRepository<Roadmap, Long> {
    List<Roadmap> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Roadmap> findByIdAndUserId(Long id, Long userId);
}
