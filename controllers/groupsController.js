async function getGroups(ctx) {
  const [rows] = await ctx.db.query("SELECT * FROM groups ORDER BY id ASC");
  ctx.body = rows;
}

async function createGroup(ctx) {
  const { group_name, faculty } = ctx.request.body || {};
  if (!group_name) {
    ctx.status = 400;
    ctx.body = { error: "Bad Request", message: "group_name обязателен" };
    return;
  }

  const [result] = await ctx.db.query(
    "INSERT INTO groups (group_name, faculty) VALUES (?, ?)",
    [group_name, faculty || 'ИБ']
  );

  ctx.status = 201;
  ctx.body = { id: result.insertId, group_name, faculty: faculty || 'ИБ' };
}

async function getGroupStudents(ctx) {
  const groupId = Number(ctx.params.id);
  const [groupRows] = await ctx.db.query("SELECT * FROM groups WHERE id = ?", [groupId]);
  if (groupRows.length === 0) {
    ctx.status = 404;
    ctx.body = { error: "Not Found", message: "Группа не найдена" };
    return;
  }

  const groupName = groupRows[0].group_name;
  const [students] = await ctx.db.query("SELECT * FROM students WHERE group_name = ?", [groupName]);
  ctx.body = {
    group: groupRows[0],
    students
  };
}

module.exports = {
  getGroups,
  createGroup,
  getGroupStudents
};
