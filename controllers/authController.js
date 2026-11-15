const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const UserService = require('../services/userService');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_bbmo_01_23';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_bbmo_01_23';

class AuthController {
  static async register(ctx) {
    const { name, email, password, role, group_name, age } = ctx.request.body || {};
    if (!email || !password) {
      ctx.status = 400;
      ctx.body = { error: "Validation failed", message: "email и password обязательны" };
      return;
    }

    const user = await UserService.createUser({
      name: name || "Студент",
      email,
      password,
      role: role || 'user',
      group_name: group_name || 'ББМО-01-23',
      age: age || 20
    });

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    ctx.status = 201;
    ctx.body = {
      data: {
        userId: user._id,
        email: user.email
      },
      accessToken,
      refreshToken
    };
  }

  static async login(ctx) {
    const { email, password } = ctx.request.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      ctx.status = 401;
      ctx.body = { error: "Invalid credentials", status: 401 };
      return;
    }
    const user = await User.findByEmail(email);

    if (!user || !user.password) {
      ctx.status = 401;
      ctx.body = { error: "Invalid credentials", status: 401 };
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      ctx.status = 401;
      ctx.body = { error: "Invalid credentials", status: 401 };
      return;
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    ctx.body = {
      accessToken,
      refreshToken,
      expiresIn: 900
    };
  }

  static async refresh(ctx) {
    const { refreshToken } = ctx.request.body || {};
    if (!refreshToken) {
      ctx.status = 400;
      ctx.body = { error: "Refresh token is required" };
      return;
    }

    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      const user = await User.findById(payload.userId);
      if (!user) {
        ctx.status = 401;
        ctx.body = { error: "User not found" };
        return;
      }

      const newAccessToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role || 'user' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      ctx.body = {
        accessToken: newAccessToken,
        expiresIn: 900
      };
    } catch (err) {
      ctx.status = 401;
      ctx.body = { error: "Invalid refresh token", status: 401 };
    }
  }

  static async logout(ctx) {
    ctx.body = { message: "Logged out successfully" };
  }
}

module.exports = AuthController;
