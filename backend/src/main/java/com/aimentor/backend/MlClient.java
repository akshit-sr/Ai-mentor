package com.aimentor.backend;

import tools.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.http.HttpClient;

@Component
public class MlClient {
    private final RestClient client;

    public MlClient(@Value("${ml.service.url}") String baseUrl) {
        // Pin HTTP/1.1: the default JDK client sends an h2c upgrade that uvicorn rejects, dropping the body.
        HttpClient http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
        this.client = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(new JdkClientHttpRequestFactory(http))
                .build();
    }

    public JsonNode roles() {
        return client.get().uri("/roles").retrieve().body(JsonNode.class);
    }

    public JsonNode roadmap(JsonNode body) {
        return client.post().uri("/roadmap")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode analyzeText(String resumeText, String targetRole) {
        return client.post().uri("/analyze_text")
                .contentType(MediaType.APPLICATION_JSON)
                .body(java.util.Map.of("text", resumeText, "target_role", targetRole))
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode analyze(MultipartFile file, String targetRole) throws IOException {
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume.txt";
        return client.post()
                .uri(b -> b.path("/analyze").queryParam("target_role", targetRole).queryParam("filename", name).build())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file.getBytes())
                .retrieve()
                .body(JsonNode.class);
    }
}
