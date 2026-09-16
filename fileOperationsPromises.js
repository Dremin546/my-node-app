const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

class FileManagerPromises {
  constructor(baseDir = './data-promises') {
    this.baseDir = baseDir;
    this.initDir();
  }

  initDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      console.log(`Создана директория: ${this.baseDir}`);
    }
  }
  async createFile(filename, content) {
    const filePath = path.join(this.baseDir, filename);
    await writeFile(filePath, content, 'utf8');
    return filePath;
  }

  async readFile(filename) {
    const filePath = path.join(this.baseDir, filename);
    return await readFile(filePath, 'utf8');
  }

  async getFileStats(filename) {
    const filePath = path.join(this.baseDir, filename);
    const stats = await stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile()
    };
  }

  async deleteFile(filename) {
    const filePath = path.join(this.baseDir, filename);
    await unlink(filePath);
  }

  async listFiles() {
    const files = await readdir(this.baseDir);
    return files;
  }

  async createMultipleFiles(files) {
    const promises = files.map(({ filename, content }) =>
      this.createFile(filename, content)
    );
    return await Promise.all(promises);
  }
}

module.exports = FileManagerPromises;