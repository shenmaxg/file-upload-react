import { CHUNK_SIZE } from './config';
import Worker from './hash.worker.js';

// 切片
class FileChunk {
  constructor(chunk, fileName, start, end, total) {
    this.chunk = chunk;
    this.fileName = fileName;
    // 切片起始位置
    this.start = start;
    // 切片结束位置
    this.end = end;
    // 文件总大小
    this.total = total;
    // 切片 Hash 值
    this.chunkName = '';
    this.fileHash = '';
    // 索引
    this.index = 0;
    // 文件切片数
    this.chunkNum = 0;
    // 文件状态 'READY', 'UPLOADING', 'SUCCESS', 'ERROR'
    this.status = 'READY';
  }

  toFormData() {
    const formData = new FormData();
    formData.append('chunk', this.chunk);
    formData.append('fileHash', this.fileHash);
    formData.append('chunkName', this.chunkName);
    formData.append('chunkNum', this.chunkNum);
    formData.append('start', this.start);
    formData.append('end', this.end);
    formData.append('total', this.total);
    formData.append('index', this.index);
    formData.append('fileName', this.fileName);

    return formData;
  }
}

// 生成文件 hash（web-worker）
function calculateFileHash(fileChunkList) {
  return new Promise(resolve => {
    const worker = new Worker();

    worker.postMessage({ fileChunkList, type: 'HASH' });
    worker.onmessage = e => {
      const { hash } = e.data;
      if (hash) {
        resolve(hash);
      }
    };
  });
}

// 生成文件切片
function createFileChunk(file, blockSize = CHUNK_SIZE) {
  const fileChunkList = [];
  const { name, size } = file;
  let cur = 0;

  while (cur < size) {
    let end = cur + blockSize;

    if (end > size) {
      end = size;
    }

    fileChunkList.push(
      new FileChunk(file.slice(cur, end), name, cur, end, size),
    );

    cur += blockSize;
  }

  const chunkNum = fileChunkList.length;

  fileChunkList.forEach((chunkFile, index) => {
    // 这里不生成 Hash 值，会严重阻塞进程
    chunkFile.index = index;
    chunkFile.chunkNum = chunkNum;
    chunkFile.chunkName = chunkFile.fileName + '_' + index;
  });

  return fileChunkList;
}

export { FileChunk, createFileChunk, calculateFileHash };
