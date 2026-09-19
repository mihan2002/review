package com.sampleproject.diary.config;

import com.sampleproject.diary.security.JwtProperties;
import com.sampleproject.diary.security.PasswordResetProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({JwtProperties.class, PasswordResetProperties.class})
public class JwtConfig {
}
