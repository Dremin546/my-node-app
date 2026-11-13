const { ObjectId } = require('mongodb');
const { getDB } = require('../db');

class User {
  static get collection() {
    return getDB().collection('users');
  }

  static validate(data, isUpdate = false) {
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        throw new Error("минимум 2 символа");
      }
    }

    if (!isUpdate || data.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!data.email || !emailRegex.test(data.email)) {
        throw new Error("неверный формат email");
      }
    }

    if (!isUpdate || data.group_name !== undefined) {
      const groupRegex = /^ББМО-\d{2}-\d{2}$/;
      if (!data.group_name || !groupRegex.test(data.group_name)) {
        throw new Error("формат группы должен быть ББМО-XX-XX");
      }
    }

    if (!isUpdate || data.age !== undefined) {
      const age = Number(data.age);
      if (isNaN(age) || age < 16 || age > 100) {
        throw new Error("возраст должен быть от 16 до 100");
      }
    }
  }

  static async findAll(options = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (options.group_name) filter.group_name = options.group_name;
    if (options.course) filter.course = Number(options.course);
    if (options.age_min !== undefined || options.age_max !== undefined) {
      filter.age = {};
      if (options.age_min !== undefined) filter.age.$gte = Number(options.age_min);
      if (options.age_max !== undefined) filter.age.$lte = Number(options.age_max);
    }

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    const total = await this.collection.countDocuments(filter);

    let sort = { _id: 1 };
    if (options.sort) {
      const isDesc = options.sort.startsWith('-');
      const field = isDesc ? options.sort.substring(1) : options.sort;
      sort = { [field]: isDesc ? -1 : 1 };
    }

    const cursor = this.collection.find(filter).sort(sort).skip(skip).limit(limit);
    const users = await cursor.toArray();

    const pages = Math.ceil(total / limit) || 1;

    return {
      data: users.map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        group_name: u.group_name,
        age: u.age,
        course: u.course || 2,
        role: u.role || 'user',
        created_at: u.created_at
      })),
      pagination: {
        total,
        page,
        limit,
        pages
      }
    };
  }

  static async findById(id) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  static async findByEmail(email) {
    return await this.collection.findOne({ email });
  }

  static async create(data) {
    this.validate(data);
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timeStr}] [MODEL] insertOne`);

    const doc = {
      name: data.name,
      email: data.email,
      group_name: data.group_name || 'ББМО-01-23',
      age: Number(data.age) || 20,
      course: Number(data.course) || 2,
      role: data.role || 'user',
      password: data.password || null,
      created_at: new Date()
    };

    const result = await this.collection.insertOne(doc);
    return { _id: result.insertedId, ...doc };
  }

  static async update(id, data) {
    if (!ObjectId.isValid(id)) return null;
    this.validate(data, true);

    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.email !== undefined) updateFields.email = data.email;
    if (data.group_name !== undefined) updateFields.group_name = data.group_name;
    if (data.age !== undefined) updateFields.age = Number(data.age);
    if (data.course !== undefined) updateFields.course = Number(data.course);
    if (data.role !== undefined) updateFields.role = data.role;

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    return result ? result.value || result : null;
  }

  static async delete(id) {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  static async getStats() {
    const summary = await this.collection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageAge: { $avg: "$age" }
        }
      }
    ]).toArray();

    const byGroupRows = await this.collection.aggregate([
      { $group: { _id: "$group_name", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    const byCourseRows = await this.collection.aggregate([
      { $group: { _id: "$course", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    const byGroup = {};
    for (const r of byGroupRows) {
      if (r._id) byGroup[r._id] = r.count;
    }

    const byCourse = {};
    for (const r of byCourseRows) {
      if (r._id) byCourse[String(r._id)] = r.count;
    }

    return {
      total: summary.length > 0 ? summary[0].total : 0,
      averageAge: summary.length > 0 ? Number(summary[0].averageAge.toFixed(1)) : 0,
      byGroup,
      byCourse
    };
  }
}

module.exports = User;
