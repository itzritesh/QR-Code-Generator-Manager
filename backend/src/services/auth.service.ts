import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { emailService } from './email.service.js';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export const sanitizeUser = (user: {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const generateToken = (user: { id: string; email: string; role: string }): string => {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
  };
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    options
  );
};

export const authService = {
  /**
   * Register a new user
   */
  register: async (name: string, email: string, password: string):Promise<{ user: UserResponse; token: string }> => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    const token = generateToken(user);
    return { user: sanitizeUser(user), token };
  },

  /**
   * Authenticate a user and issue a JWT
   */
  login: async (email: string, password: string): Promise<{ user: UserResponse; token: string }> => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken(user);
    return { user: sanitizeUser(user), token };
  },

  /**
   * Fetch current user profile
   */
  getCurrentUser: async (userId: string): Promise<UserResponse> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found.', 404);
    }
    return sanitizeUser(user);
  },

  /**
   * Update profile information
   */
  updateProfile: async (
    userId: string,
    data: { name?: string; avatar?: string | null }
  ): Promise<UserResponse> => {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
    });
    return sanitizeUser(user);
  },

  /**
   * Change user password after verifying current password
   */
  changePassword: async (
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password updated successfully.' };
  },

  /**
   * Initiate forgot password flow
   */
  forgotPassword: async (
    email: string,
    clientOrigin: string
  ): Promise<{ message: string; devResetUrl?: string }> => {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return safe confirmation message to prevent user enumeration
    if (!user) {
      return {
        message: 'If an account exists with that email address, password recovery instructions have been sent.',
      };
    }

    // Generate secure 32-byte hex token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    const resetUrl = `${clientOrigin}/reset-password?token=${resetToken}`;

    const { isDevFallback } = await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken,
      resetUrl,
    });

    return {
      message: 'If an account exists with that email address, password recovery instructions have been sent.',
      ...(isDevFallback && env.NODE_ENV !== 'production' && { devResetUrl: resetUrl, devToken: resetToken }),
    };
  },

  /**
   * Reset user password with token
   */
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new AppError('Password reset token is invalid or has expired. Please request a new one.', 400);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Password has been reset successfully. You can now log in.' };
  },

  /**
   * Permanently delete user account and cascade delete all associated QR assets
   */
  deleteAccount: async (userId: string): Promise<{ message: string }> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    await prisma.user.delete({ where: { id: userId } });
    return { message: 'Your account and all associated QR codes have been permanently deleted.' };
  },

  /**
   * Authenticate or register user using Google ID token credential
   */
  googleLogin: async (credential: string): Promise<{ user: UserResponse; token: string }> => {
    if (!credential) {
      throw new AppError('Google authentication credential is required.', 400);
    }

    // Verify token with Google's public tokeninfo endpoint
    let payload: any;
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!response.ok) {
        throw new Error('Google token verification failed');
      }
      payload = await response.json();
    } catch (err: any) {
      throw new AppError('Invalid or expired Google authentication credential.', 401);
    }

    const { email, name, picture, email_verified, aud } = payload;

    if (!email) {
      throw new AppError('Google account does not contain a valid email address.', 400);
    }

    // Verify that Google confirmed the email address
    if (email_verified !== true && email_verified !== 'true') {
      throw new AppError('Google email address has not been verified by Google.', 401);
    }

    // If GOOGLE_CLIENT_ID is configured in environment, verify audience matches
    if (env.GOOGLE_CLIENT_ID && aud !== env.GOOGLE_CLIENT_ID) {
      throw new AppError('Google client authentication ID mismatch.', 401);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      // Update avatar if not already set and Google provides one
      if (!user.avatar && picture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatar: picture },
        });
      }
    } else {
      // Create new user account automatically for Google login
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomSecret, 10);

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name || normalizedEmail.split('@')[0],
          avatar: picture || null,
          passwordHash,
          role: 'user',
        },
      });
    }

    const token = generateToken(user);
    return {
      user: sanitizeUser(user),
      token,
    };
  },
};
