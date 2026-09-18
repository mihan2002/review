package com.sampleproject.diary.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT settings; values come from the environment (see .env.example), never from source.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, long expiration, String issuer) {
}
