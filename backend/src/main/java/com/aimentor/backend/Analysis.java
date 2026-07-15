package com.aimentor.backend;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Analysis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant createdAt = Instant.now();
    private Long userId;
    private String fileName;
    private String targetRole;
    private int score;
    private String grade;
    private double matchPct;

    @Column(columnDefinition = "text")
    private String resultJson; // full ML response, kept verbatim

    @Column(columnDefinition = "text")
    private String resumeText; // extracted resume text, so we can re-assess for a new role without re-upload

    protected Analysis() {}

    public Analysis(Long userId, String fileName, String targetRole, int score, String grade, double matchPct, String resultJson, String resumeText) {
        this.userId = userId;
        this.fileName = fileName;
        this.targetRole = targetRole;
        this.score = score;
        this.grade = grade;
        this.matchPct = matchPct;
        this.resultJson = resultJson;
        this.resumeText = resumeText;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Instant getCreatedAt() { return createdAt; }
    public String getFileName() { return fileName; }
    public String getTargetRole() { return targetRole; }
    public int getScore() { return score; }
    public String getGrade() { return grade; }
    public double getMatchPct() { return matchPct; }
    public String getResultJson() { return resultJson; }
    public String getResumeText() { return resumeText; }
}
