package com.sampleproject.diary.service;

import com.sampleproject.diary.entity.User;
import com.sampleproject.diary.repository.UserRepository;
import com.sampleproject.diary.security.AuthenticatedUser;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiaryUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public DiaryUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AuthenticatedUser loadUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return new AuthenticatedUser(user.getId(), user.getUsername(), user.getPasswordHash());
    }
}
