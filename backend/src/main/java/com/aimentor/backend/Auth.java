package com.aimentor.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

// Tiny token->user resolver with absolute expiry.
// ponytail: no Spring Security filter chain, no refresh tokens; add if we need roles/OAuth/sliding sessions.
@Component
class Auth {
    private final UserRepository users;
    private final long ttlDays;

    Auth(UserRepository users, @Value("${app.token.ttl-days}") long ttlDays) {
        this.users = users;
        this.ttlDays = ttlDays;
    }

    Optional<User> optionalUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return Optional.empty();
        return users.findByToken(authHeader.substring(7).trim()).filter(this::fresh);
    }

    User require(String authHeader) {
        return optionalUser(authHeader)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in."));
    }

    private boolean fresh(User u) {
        Instant created = u.getTokenCreatedAt();
        return created != null && Duration.between(created, Instant.now()).toDays() < ttlDays;
    }
}
