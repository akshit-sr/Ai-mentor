package com.aimentor.backend;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final Auth auth;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository users, Auth auth) {
        this.users = users;
        this.auth = auth;
    }

    public record Credentials(String email, String name, String password) {}

    @PostMapping("/signup")
    public Map<String, String> signup(@RequestBody Credentials c) {
        String email = c.email() == null ? "" : c.email().trim().toLowerCase();
        if (email.isEmpty() || c.password() == null || c.password().length() < 6)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and a 6+ character password are required.");
        if (users.findByEmail(email).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with that email already exists.");
        User u = new User(email, c.name() == null ? "" : c.name().trim(), encoder.encode(c.password()));
        return issue(u);
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Credentials c) {
        String email = c.email() == null ? "" : c.email().trim().toLowerCase();
        User u = users.findByEmail(email)
                .filter(x -> c.password() != null && encoder.matches(c.password(), x.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong email or password."));
        return issue(u);
    }

    @PostMapping("/logout")
    public void logout(@RequestHeader(value = "Authorization", required = false) String header) {
        auth.optionalUser(header).ifPresent(u -> { u.setToken(null); users.save(u); });
    }

    private Map<String, String> issue(User u) {
        u.setToken(UUID.randomUUID().toString());
        u.setTokenCreatedAt(java.time.Instant.now());
        users.save(u);
        return Map.of("token", u.getToken(), "email", u.getEmail(), "name", u.getName() == null ? "" : u.getName());
    }
}
