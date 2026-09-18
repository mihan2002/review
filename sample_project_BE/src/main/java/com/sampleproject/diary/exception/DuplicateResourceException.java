package com.sampleproject.diary.exception;

/** Thrown when a username or email is already registered. */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
