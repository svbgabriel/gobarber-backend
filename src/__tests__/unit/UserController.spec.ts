import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import UserController from '../../app/controllers/UserController';
import { db } from '../../database/db';

vi.mock('../../database/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

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

      // @ts-ignore Just to mock the database connection
      (db.select().from().where as any).mockResolvedValue([]);
      // @ts-ignore Just to mock the database connection
      (db.insert().values().returning as any).mockResolvedValue([{
        id: 1,
        name: userData.name,
        email: userData.email,
        provider: false,
      }]);

      // Act
      await UserController.store(req as Request, res as Response);

      // Assert
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

      // @ts-ignore Just to mock the database connection
      (db.select().from().where as any).mockResolvedValue([{ id: 1, email: userData.email }]);

      // Act
      await UserController.store(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User already exists.' });
    });
  });
});
