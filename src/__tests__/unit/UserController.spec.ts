import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import UserController from '../../app/controllers/UserController';
import User from '../../app/models/User';

vi.mock('../../app/models/User');

describe('UserController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('store', () => {
    it('should create a new user', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      req = {
        body: userData,
      };

      (User.findOne as any).mockResolvedValue(null);
      (User.create as any).mockResolvedValue({
        id: 1,
        name: userData.name,
        email: userData.email,
        provider: false,
      });

      // Act
      await UserController.store(req as Request, res as Response);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        name: userData.name,
        email: userData.email,
        provider: false,
      });
    });

    it('should not create a user if validation fails', async () => {
      // Arrange
      req = {
        body: {
          name: 'John Doe',
          // email missing
          password: '123', // too short
        },
      };

      // Act
      await UserController.store(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Validation fails' });
    });

    it('should not create a user if email is already in use', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      req = {
        body: userData,
      };

      (User.findOne as any).mockResolvedValue({ id: 1, email: userData.email });

      // Act
      await UserController.store(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User already exists.' });
    });
  });
});
