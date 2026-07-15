package com.aimentor.backend;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "app_user")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;
    private String name;
    private String passwordHash;
    private String token; // current session token, null when logged out
    private Instant tokenCreatedAt;
    private Instant createdAt = Instant.now();

    protected User() {}

    public User(String email, String name, String passwordHash) {
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public String getPasswordHash() { return passwordHash; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Instant getTokenCreatedAt() { return tokenCreatedAt; }
    public void setTokenCreatedAt(Instant t) { this.tokenCreatedAt = t; }
}
