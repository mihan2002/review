package com.sampleproject.diary.service;

import com.sampleproject.diary.dto.AuthResponse;
import com.sampleproject.diary.dto.LoginRequest;
import com.sampleproject.diary.dto.RegisterRequest;
import com.sampleproject.diary.dto.UserResponse;
import com.sampleproject.diary.entity.User;
import com.sampleproject.diary.exception.DuplicateResourceException;
import com.sampleproject.diary.repository.UserRepository;
import com.sampleproject.diary.security.AuthenticatedUser;
import com.sampleproject.diary.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new DuplicateResourceException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email is already registered");
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .build();

        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Delegates credential checking to Spring Security; a wrong username and a wrong
     * password fail identically so the response cannot be used to enumerate accounts.
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        AuthenticatedUser user = (AuthenticatedUser) authentication.getPrincipal();
        String token = jwtService.generateToken(user.getId(), user.getUsername());
        return AuthResponse.bearer(token, jwtService.getExpirationSeconds());
    }
}
