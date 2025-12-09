import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_please_change_this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (error) {
        throw new Error(`Error hashing password: ${error.message}`);
    }
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export const comparePassword = async (password, hash) => {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        throw new Error(`Error comparing password: ${error.message}`);
    }
};

/**
 * Generate JWT token
 * @param {string} userId - User ID (uid)
 * @param {string} email - User email
 * @param {string} role - User role
 * @returns {string} JWT token
 */
export const generateToken = (userId, email, role) => {
    try {
        const payload = {
            id: userId,
            email: email,
            role: role
        };

        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });

        return token;
    } catch (error) {
        throw new Error(`Error generating token: ${error.message}`);
    }
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw new Error(`Error verifying token: ${error.message}`);
    }
};
