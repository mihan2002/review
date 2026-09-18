package com.sampleproject.diary.security;

import java.util.UUID;

/** Identity carried by a validated JWT. */
public record JwtPrincipal(UUID userId, String username) {
}
