const bcrypt = require('bcryptjs');
const User = require('../models/user');

class UserService {
  static async getAllUsers(options) {
    return await User.findAll(options);
  }

  static async getUserById(id) {
    return await User.findById(id);
  }

  static async createUser(userData) {
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    console.log(`[${timeStr}] [SERVICE] Создание пользователя: ${userData.email}`);
    console.log(`[${timeStr}] [SERVICE] Проверка уникальности email`);

    const existing = await User.findByEmail(userData.email);
    if (existing) {
      console.log(`[${timeStr}] [SERVICE] Email уже существует`);
      const error = new Error("Email already exists");
      error.status = 409;
      throw error;
    }

    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    const newUser = await User.create(userData);

    // Имитация отправки email-уведомления
    console.log(`[${timeStr}] [SERVICE] Email отправлен: ${userData.email}`);

    // Не возвращаем пароль в ответе
    const { password, ...safeUser } = newUser;
    return safeUser;
  }

  static async updateUser(id, updateData) {
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }
    return await User.update(id, updateData);
  }

  static async deleteUser(id) {
    return await User.delete(id);
  }

  static async getStats() {
    return await User.getStats();
  }

  static async exportToCSV() {
    const { data } = await User.findAll({ limit: 1000 });
    const headers = "_id,name,email,group_name,age,course,created_at\n";
    const rows = data.map(u => `"${u._id}","${u.name}","${u.email}","${u.group_name}",${u.age},${u.course},"${u.created_at}"`).join("\n");
    return headers + rows;
  }
}

module.exports = UserService;
