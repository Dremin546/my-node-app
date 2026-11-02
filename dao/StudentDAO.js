const { ObjectId } = require('mongodb');

class StudentDAO {
  constructor(db, client) {
    this.db = db;
    this.client = client;
    this.collection = db.collection('students');
  }

  validate(data, isUpdate = false) {
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        throw new Error("name слишком короткое (мин. 2 символа)");
      }
    }

    if (!isUpdate || data.group_name !== undefined) {
      const groupRegex = /^ББМО-\d{2}-\d{2}$/;
      if (!data.group_name || !groupRegex.test(data.group_name)) {
        throw new Error("group_name не соответствует формату ББМО-XX-XX");
      }
    }

    if (!isUpdate || data.course !== undefined) {
      const course = Number(data.course);
      if (!Number.isInteger(course) || course < 1 || course > 4) {
        throw new Error("course должен быть целым числом от 1 до 4");
      }
    }

    if (data.grade !== undefined && data.grade !== null) {
      const grade = Number(data.grade);
      if (isNaN(grade) || grade < 0 || grade > 5) {
        throw new Error("grade должен быть в диапазоне от 0 до 5");
      }
    }
  }

  async create(data) {
    this.validate(data);
    const doc = {
      name: data.name,
      email: data.email || `student_${Date.now()}@bbmo.ru`,
      group_name: data.group_name,
      course: Number(data.course) || 1,
      grade: data.grade !== undefined ? Number(data.grade) : null,
      created_at: new Date()
    };
    const result = await this.collection.insertOne(doc);
    return { _id: result.insertedId, ...doc };
  }

  async findById(id) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findAll(options = {}) {
    const limit = Math.max(1, Number(options.limit) || 10);
    const offset = Math.max(0, Number(options.offset) || 0);

    const filter = {};
    if (options.group_name) {
      filter.group_name = options.group_name;
    }
    if (options.course) {
      filter.course = Number(options.course);
    }
    if (options.grade_min !== undefined || options.grade_max !== undefined) {
      filter.grade = {};
      if (options.grade_min !== undefined) filter.grade.$gte = Number(options.grade_min);
      if (options.grade_max !== undefined) filter.grade.$lte = Number(options.grade_max);
    }

    const total = await this.collection.countDocuments(filter);

    let sort = { _id: 1 };
    if (options.sortBy === 'name') sort = { name: options.order === 'desc' ? -1 : 1 };
    if (options.sortBy === 'grade') sort = { grade: options.order === 'desc' ? -1 : 1 };

    const cursor = this.collection.find(filter).sort(sort).skip(offset).limit(limit);
    const data = await cursor.toArray();

    return {
      data,
      pagination: {
        total,
        limit,
        offset
      }
    };
  }

  async update(id, data) {
    if (!ObjectId.isValid(id)) return null;
    this.validate(data, true);

    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.group_name !== undefined) updateFields.group_name = data.group_name;
    if (data.course !== undefined) updateFields.course = Number(data.course);
    if (data.grade !== undefined) updateFields.grade = Number(data.grade);

    const result = await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    return result.matchedCount > 0;
  }

  async delete(id) {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async search(query) {
    const cursor = this.collection.find(
      { $text: { $search: query } },
      { projection: { score: { $meta: "textScore" }, name: 1, group_name: 1, grade: 1 } }
    ).sort({ score: { $meta: "textScore" } });

    return await cursor.toArray();
  }

  async getStats() {
    const summary = await this.collection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageGrade: { $avg: "$grade" }
        }
      }
    ]).toArray();

    const byGroupRows = await this.collection.aggregate([
      {
        $group: {
          _id: "$group_name",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const byGroup = {};
    for (const r of byGroupRows) {
      if (r._id) byGroup[r._id] = r.count;
    }

    return {
      total: summary.length > 0 ? summary[0].total : 0,
      averageGrade: summary.length > 0 ? Number(summary[0].averageGrade.toFixed(2)) : 0,
      byGroup
    };
  }

  async batchCreate(students) {
    const session = this.client.startSession();
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    try {
      console.log(`[${timeStr}] [ББМО-01-23] BEGIN TRANSACTION`);
      session.startTransaction();

      const docs = students.map((s, idx) => {
        if (s.fail_test) throw new Error("Симуляция ошибки транзакции");
        return {
          name: s.name,
          email: s.email || `student_${Date.now()}_${idx}@bbmo.ru`,
          group_name: s.group_name || 'ББМО-01-23',
          course: Number(s.course) || 1,
          grade: s.grade !== undefined ? Number(s.grade) : null,
          created_at: new Date()
        };
      });

      const result = await this.collection.insertMany(docs, { session });
      console.log(`[${timeStr}] [ББМО-01-23] insertMany (${docs.length} docs)`);

      await session.commitTransaction();
      console.log(`[${timeStr}] [ББМО-01-23] COMMIT`);

      return {
        inserted: result.insertedCount,
        transaction: "committed"
      };
    } catch (err) {
      await session.abortTransaction();
      console.log(`[${timeStr}] [ББМО-01-23] ROLLBACK (изменения отменены)`);
      throw err;
    } finally {
      await session.endSession();
    }
  }
}

module.exports = StudentDAO;
