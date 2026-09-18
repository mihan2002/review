package com.sampleproject.diary.exception;

/** Thrown when no authenticated identity is available. */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
