import { describe, it, expect, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import User from '../../app/models/User';

vi.mock('bcryptjs');

describe('User Model', () => {
  describe('checkPassword', () => {
    it('should return true if password matches hash', async () => {
      // Arrange
      const user = Object.create(User.prototype);
      user.password_hash = 'hashed_password';
      const password = 'plain_password';

      (bcrypt.compare as any).mockResolvedValue(true);

      // Act
      const result = await user.checkPassword(password);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashed_password');
      expect(result).toBe(true);
    });

    it('should return false if password does not match hash', async () => {
      // Arrange
      const user = Object.create(User.prototype);
      user.password_hash = 'hashed_password';
      const password = 'wrong_password';

      (bcrypt.compare as any).mockResolvedValue(false);

      // Act
      const result = await user.checkPassword(password);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashed_password');
      expect(result).toBe(false);
    });
  });
});
