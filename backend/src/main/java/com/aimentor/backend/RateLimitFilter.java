package com.aimentor.backend;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

// Fixed-window per-IP limiter on the expensive/abusable endpoints.
// ponytail: in-memory, single-instance; swap for bucket4j+Redis if we scale out.
@Component
@Order(1)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int WINDOW_MS = 60_000;
    private static final int MAX_AUTH = 10;      // login/signup attempts per minute per IP
    private static final int MAX_ANALYZE = 20;   // analyze/reassess/roadmap per minute per IP

    private record Window(long start, AtomicInteger count) {}
    private final Map<String, Window> hits = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        int limit = limitFor(req.getRequestURI());
        if (limit > 0 && exceeded(req.getRemoteAddr() + ":" + limit, limit)) {
            res.setStatus(429);
            res.setContentType("application/json");
            res.getWriter().write("{\"message\":\"Too many requests — slow down and try again in a minute.\"}");
            return;
        }
        chain.doFilter(req, res);
    }

    private int limitFor(String uri) {
        if (uri.startsWith("/api/auth/")) return MAX_AUTH;
        if (uri.startsWith("/api/analyze") || uri.equals("/api/reassess") || uri.equals("/api/roadmap")) return MAX_ANALYZE;
        return 0;
    }

    private boolean exceeded(String key, int limit) {
        long now = System.currentTimeMillis();
        Window w = hits.compute(key, (k, cur) ->
                (cur == null || now - cur.start() > WINDOW_MS) ? new Window(now, new AtomicInteger(0)) : cur);
        return w.count().incrementAndGet() > limit;
    }
}
