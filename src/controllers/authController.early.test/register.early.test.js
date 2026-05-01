


const { register } = require('../authController');
const crypto = require("crypto");
const User = require("../../models/User");
const {
  sendVerificationEmail,
} = require("../../utils");
const { StatusCodes } = require("http-status-codes");
const { registerValidator } = require("../../validator/validate");
// Mock dependencies
jest.mock("crypto");
jest.mock("../../models/User");
jest.mock("../../utils", () => ({
  sendVerificationEmail: jest.fn(),
}));
jest.mock("../../validator/validate", () => ({
  registerValidator: jest.fn(),
}));

describe('register() register method', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        address: '123 Test St',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    crypto.randomBytes.mockReturnValue({ toString: () => 'randomToken' });
  });

  describe('Happy paths', () => {
    it('should create a new user and send a verification email', async () => {
      // Arrange
      registerValidator.mockReturnValue({ error: null });
      User.findOne.mockResolvedValue(null);
      User.countDocuments.mockResolvedValue(0);
      User.create.mockResolvedValue({
        name: 'Test User',
        email: 'test@example.com',
        verificationToken: 'randomToken',
      });

      // Act
      await register(req, res);

      // Assert
      expect(User.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        geoAddress: { address: '123 Test St' },
        password: 'password123',
        verificationToken: 'randomToken',
      });
      expect(sendVerificationEmail).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        verificationToken: 'randomToken',
        origin: 'http://localhost:3000',
      });
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        msg: 'Account created. Check your email for a verification code.',
      });
    });
  });

  describe('Edge cases', () => {
    it('should return a validation error if input is invalid', async () => {
      // Arrange
      registerValidator.mockReturnValue({
        error: { details: [{ message: 'Invalid input' }] },
      });

      // Act
      await register(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        msg: ['Invalid input'],
      });
    });

    it('should throw an error if the user already exists', async () => {
      // Arrange
      registerValidator.mockReturnValue({ error: null });
      User.findOne.mockResolvedValue({ email: 'test@example.com' });

      // Act & Assert
      await expect(register(req, res)).rejects.toThrow(
        'You already have an account here, try logging in.'
      );
    });

    it('should handle errors when sending verification email fails', async () => {
      // Arrange
      registerValidator.mockReturnValue({ error: null });
      User.findOne.mockResolvedValue(null);
      User.countDocuments.mockResolvedValue(0);
      User.create.mockResolvedValue({
        name: 'Test User',
        email: 'test@example.com',
        verificationToken: 'randomToken',
      });
      sendVerificationEmail.mockRejectedValue(new Error('Email send failed'));

      // Act
      await register(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        msg: 'Account created. Check your email for a verification code.',
      });
    });
  });
});