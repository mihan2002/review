package com.sampleproject.diary.exception;

/**
 * Thrown when a password-reset PIN is wrong, expired, already used, or has run
 * out of attempts. The message is deliberately the same in every case.
 */
public class InvalidResetPinException extends RuntimeException {

    public InvalidResetPinException(String message) {
        super(message);
    }
}
