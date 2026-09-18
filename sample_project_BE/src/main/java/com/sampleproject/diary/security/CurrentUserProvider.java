package com.sampleproject.diary.security;

import com.sampleproject.diary.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Single source of truth for "who is calling"; the client never supplies a user id. */
@Component
public class CurrentUserProvider {

    public UUID requireCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new UnauthorizedException("Authentication required");
        }
        return user.getId();
    }
}
