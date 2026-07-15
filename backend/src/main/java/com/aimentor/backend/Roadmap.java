package com.aimentor.backend;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Roadmap {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant createdAt = Instant.now();
    private Long userId;
    private String role;
    private String situation;
    private int hours;

    @Column(columnDefinition = "text")
    private String roadmapJson; // full ML response {summary, phases}

    @Column(columnDefinition = "text")
    private String completedPhases = "[]"; // JSON array of completed phase indices

    protected Roadmap() {}

    public Roadmap(Long userId, String role, String situation, int hours, String roadmapJson) {
        this.userId = userId;
        this.role = role;
        this.situation = situation;
        this.hours = hours;
        this.roadmapJson = roadmapJson;
    }

    public Long getId() { return id; }
    public Instant getCreatedAt() { return createdAt; }
    public Long getUserId() { return userId; }
    public String getRole() { return role; }
    public String getSituation() { return situation; }
    public int getHours() { return hours; }
    public String getRoadmapJson() { return roadmapJson; }
    public String getCompletedPhases() { return completedPhases; }
    public void setCompletedPhases(String completedPhases) { this.completedPhases = completedPhases; }
}
