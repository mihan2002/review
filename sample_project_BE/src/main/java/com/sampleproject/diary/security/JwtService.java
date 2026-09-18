package com.sampleproject.diary.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final String CLAIM_USER_ID = "uid";

    private final SecretKey signingKey;
    private final JwtProperties properties;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.signingKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UUID userId, String username) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(username)
                .claim(CLAIM_USER_ID, userId.toString())
                .issuer(properties.issuer())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(properties.expiration())))
                .signWith(signingKey)
                .compact();
    }

    /**
     * @throws io.jsonwebtoken.JwtException when the token is malformed, tampered with or expired
     */
    public JwtPrincipal parseToken(String token) throws JwtException {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new JwtPrincipal(UUID.fromString(claims.get(CLAIM_USER_ID, String.class)), claims.getSubject());
    }

    public long getExpirationSeconds() {
        return properties.expiration();
    }
}
