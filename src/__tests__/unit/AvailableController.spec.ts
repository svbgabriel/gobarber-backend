import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import AvailableController from '../../app/controllers/AvailableController';
import Appointment from '../../app/models/Appointment';

vi.mock('../../app/models/Appointment');

describe('AvailableController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    // Fix current time to 2026-05-26 10:00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 26, 10, 0, 0)); // Note: month is 0-indexed, so 4 is May
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should list available schedules', async () => {
    // Arrange
    const searchDate = new Date(2026, 4, 26).getTime();
    req = {
      query: { date: String(searchDate) },
      params: { providerId: '1' },
    };

    (Appointment.findAll as any).mockResolvedValue([
      { date: new Date(2026, 4, 26, 14, 0, 0) },
    ]);

    // Act
    await AvailableController.index(req as Request, res as Response);

    // Assert
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ time: '08:00', available: false }), // Past time
        expect.objectContaining({ time: '11:00', available: true }), // Future and free
        expect.objectContaining({ time: '14:00', available: false }), // Already booked
      ])
    );
  });

  it('should return 400 if date is missing', async () => {
    // Arrange
    req = {
      query: {},
      params: { providerId: '1' },
    };

    // Act
    await AvailableController.index(req as Request, res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid date' });
  });
});
