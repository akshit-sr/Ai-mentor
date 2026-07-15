package com.aimentor.backend;

import tools.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api")
public class AnalysisController {

    private final MlClient ml;
    private final AnalysisRepository repo;
    private final RoadmapRepository roadmaps;
    private final Auth auth;

    public AnalysisController(MlClient ml, AnalysisRepository repo, RoadmapRepository roadmaps, Auth auth) {
        this.ml = ml;
        this.repo = repo;
        this.roadmaps = roadmaps;
        this.auth = auth;
    }

    @GetMapping("/roles")
    public JsonNode roles() {
        return ml.roles();
    }

    @PostMapping("/roadmap")
    public JsonNode roadmap(@RequestBody JsonNode body,
                            @RequestHeader(value = "Authorization", required = false) String header) {
        User user = auth.require(header);
        JsonNode r = ml.roadmap(body);
        roadmaps.save(new Roadmap(
                user.getId(),
                body.path("role").asString(""),
                body.path("situation").asString("working"),
                body.path("hours").asInt(0),
                r.toString()
        ));
        return r;
    }

    @GetMapping("/analyses")
    public List<Analysis> history(@RequestHeader(value = "Authorization", required = false) String header) {
        return repo.findTop50ByUserIdOrderByCreatedAtDesc(auth.require(header).getId());
    }

    @GetMapping("/roadmaps")
    public List<Roadmap> roadmapHistory(@RequestHeader(value = "Authorization", required = false) String header) {
        return roadmaps.findTop50ByUserIdOrderByCreatedAtDesc(auth.require(header).getId());
    }

    @PostMapping("/analyze")
    public ResponseEntity<JsonNode> analyze(@RequestParam("file") MultipartFile file,
                                            @RequestParam("target_role") String targetRole,
                                            @RequestHeader(value = "Authorization", required = false) String header) throws IOException {
        User user = auth.require(header);
        return ResponseEntity.ok(persist(ml.analyze(file, targetRole), user.getId(), file.getOriginalFilename(), targetRole));
    }

    // Re-grade a saved resume against a different role, without re-uploading the file.
    @PostMapping("/reassess")
    public JsonNode reassess(@RequestBody JsonNode body,
                             @RequestHeader(value = "Authorization", required = false) String header) {
        User user = auth.require(header);
        Analysis src = repo.findByIdAndUserId(body.path("analysisId").asLong(-1), user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assessment not found."));
        if (src.getResumeText() == null || src.getResumeText().isBlank())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This assessment predates resume-text storage — re-upload the file.");
        String role = body.path("role").asString("").trim();
        return persist(ml.analyzeText(src.getResumeText(), role), user.getId(), src.getFileName(), role);
    }

    private JsonNode persist(JsonNode r, Long userId, String fileName, String role) {
        repo.save(new Analysis(
                userId,
                fileName,
                role,
                r.at("/grade/score").asInt(),
                r.at("/grade/grade").asString(),
                r.at("/gap/match_pct").asDouble(),
                r.toString(),
                r.at("/resume_text").asString("")
        ));
        return r;
    }

    @DeleteMapping("/analyses/{id}")
    public void deleteAnalysis(@PathVariable Long id,
                               @RequestHeader(value = "Authorization", required = false) String header) {
        User user = auth.require(header);
        repo.findByIdAndUserId(id, user.getId()).ifPresent(repo::delete);
    }

    @DeleteMapping("/roadmaps/{id}")
    public void deleteRoadmap(@PathVariable Long id,
                              @RequestHeader(value = "Authorization", required = false) String header) {
        User user = auth.require(header);
        roadmaps.findByIdAndUserId(id, user.getId()).ifPresent(roadmaps::delete);
    }

    // Persist which roadmap phases the user has checked off.
    @PatchMapping("/roadmaps/{id}/progress")
    public void progress(@PathVariable Long id, @RequestBody JsonNode body,
                         @RequestHeader(value = "Authorization", required = false) String header) {
        User user = auth.require(header);
        Roadmap rm = roadmaps.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap not found."));
        rm.setCompletedPhases(body.path("completed").toString()); // array of indices
        roadmaps.save(rm);
    }
}
