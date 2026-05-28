import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import SessionController from '../../app/controllers/SessionController';
import { db } from '../../database/db';

vi.mock('../../database/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('jsonwebtoken');
vi.mock('bcryptjs');

describe('SessionController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('should authenticate a user and return a token', async () => {
    // Arrange
    const credentials = {
      email: 'john@example.com',
      password: 'password123',
    };

    req = {
      body: credentials,
    };

    const userMock = {
      id: 1,
      name: 'John Doe',
      email: credentials.email,
      provider: false,
      avatar: null,
      password_hash: 'hashed_password',
    };

    (db.query.users.findFirst as any).mockResolvedValue(userMock);
    (bcrypt.compare as any).mockResolvedValue(true);
    (jwt.sign as any).mockReturnValue('mocked_token');

    // Act
    await SessionController.store(req as Request, res as Response);

    // Assert
    expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, 'hashed_password');
    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: 1,
        name: 'John Doe',
        email: credentials.email,
        provider: false,
        avatar: null,
      },
      token: 'mocked_token',
    });
  });

  it('should not authenticate if validation fails', async () => {
    // Arrange
    req = {
      body: {
        email: 'invalid-email',
      },
    };

    // Act
    await SessionController.store(req as Request, res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation fails' });
  });

  it('should not authenticate if user is not found', async () => {
    // Arrange
    req = {
      body: {
        email: 'nonexistent@example.com',
        password: 'password123',
      },
    };

    (db.query.users.findFirst as any).mockResolvedValue(null);

    // Act
    await SessionController.store(req as Request, res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('should not authenticate if password does not match', async () => {
    // Arrange
    const credentials = {
      email: 'john@example.com',
      password: 'wrong_password',
    };

    req = {
      body: credentials,
    };

    const userMock = {
      password_hash: 'hashed_password',
    };

    (db.query.users.findFirst as any).mockResolvedValue(userMock);
    (bcrypt.compare as any).mockResolvedValue(false);

    // Act
    await SessionController.store(req as Request, res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Password does not match' });
  });
});
