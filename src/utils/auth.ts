import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '@prisma/client';

// JWT secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: number;
  email: string;
  provider: string;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export interface SafeUser {
  id: number;
  email: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
  provider: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Generate JWT token for user */
export function generateToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    provider: user.provider
  };

  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload as any, JWT_SECRET, options);
}

/** Verify JWT token */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/** Extract safe user data (without password) */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    provider: user.provider,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/** Create authentication response */
export function createAuthResponse(user: User): AuthResponse {
  return {
    user: toSafeUser(user),
    token: generateToken(user)
  };
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** Validate password strength */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

/** Validate username format */
export function isValidUsername(username: string): { valid: boolean; message?: string } {
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 20) {
    return { valid: false, message: 'Username must be less than 20 characters long' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { valid: true };
} 