import { MAX_REQUEST_NUM, MAX_RETRY_NUM } from './config';
import { VERIFY_FILE_API } from './api';
import { ajax4Upload, ajax } from './request';
import { createFileChunk, calculateFileHash } from './util';

export default class Uploader {
  constructor(url, options) {
    // 上传地址
    this.uploadUrl = url;

    // 显示进度条
    this.showProgress = options?.showProgress;
    // 自定义进度处理函数
    this.customProgressHandler = null;

    // 文件切片
    this.enableSlice = options?.enableSlice || false;

    // 文件大小
    this.length = 0;

    // 切片请求,用于断点续传
    this.requestList = [];

    // 切片详情
    this.chunkList = [];

    this.customCompleteHandler = null;

    // 上传耗时
    this.uploadTime = null;

    // 计算 Hash 耗时
    this.calHashTime = null;
  }

  // 设置进度的自定义处理函数
  onProgress = fn => {
    this.customProgressHandler = fn;

    return this;
  };

  // 请求结束自定义处理函数
  onComplete = fn => {
    this.customCompleteHandler = fn;

    return this;
  };

  calcProcessInSliceMode = () => {
    // 计算一个总的百分比
    let loadedSum = 0;
    this.chunkList.forEach(({ progress = null }) => {
      if (progress) {
        loadedSum += progress.loaded;
      }
    });

    // 触发用户自定义程序
    if (this.customProgressHandler) {
      this.customProgressHandler({
        percentage: parseInt(String((loadedSum / this.length) * 100)),
        loaded: loadedSum,
        total: this.length,
        // 进度详情
        progressDetail: this.chunkList,
      });
    }
  };

  // 计算上传的百分比
  onProgressHandler = (chunkFile, e) => {
    if (this.showProgress && this.customProgressHandler) {
      // 百分比先绑定到单独的一个文件上
      chunkFile.progress = {
        percentage: parseInt(String((e.loaded / e.total) * 100)),
        loaded: e.loaded,
        total: e.total,
      };

      if (this.enableSlice) {
        this.calcProcessInSliceMode();
      } else {
        this.customProgressHandler(chunkFile.progress);
      }
    }
  };

  verifyHash(fileSize, contentHash) {
    const formData = new FormData();
    formData.append('fileSize', fileSize);
    formData.append('contentHash', contentHash);

    return ajax({
      url: VERIFY_FILE_API,
      data: formData,
    });
  }

  // 取消并清空所有正在上传的切片
  pause = () => {
    this.requestList.forEach(xhr => xhr?.abort());
    this.requestList = [];
  };

  // 标记为上传完成
  markAsSuccess = fileChunk => {
    fileChunk.status = 'SUCCESS';
    const chunkSize = fileChunk.chunk.size;

    fileChunk.progress = {
      percentage: 100,
      loaded: chunkSize,
      total: chunkSize,
    };
  };

  markAsReady = fileChunk => {
    fileChunk.status = 'READY';

    if (fileChunk.progress) {
      fileChunk.progress.loaded = 0;
      fileChunk.progress.percentage = 0;
    }
  };

  // 秒传
  secondUpload = file => {
    const { size } = file;

    // 修改进度条
    if (this.showProgress && this.customProgressHandler) {
      this.chunkList.forEach(fileChunk => {
        this.markAsSuccess(fileChunk);
      });

      this.customProgressHandler({
        percentage: 100,
        loaded: size,
        total: size,
        progressDetail: this.chunkList,
      });
    }

    // 触发结束回调
    if (this.customCompleteHandler) {
      this.customCompleteHandler({
        uploadTime: 0,
        hashTime: this.calHashTime,
      });
    }
  };

  // 限制请求并发数
  requestWithLimit = (
    fileChunkList,
    max = MAX_REQUEST_NUM,
    retry = MAX_RETRY_NUM,
  ) => {
    return new Promise((resolve, reject) => {
      const requestNum = fileChunkList.filter(fileChunk => {
        return fileChunk.status === 'ERROR' || fileChunk.status === 'READY';
      }).length;

      // 请求成功数量
      let counter = 0;

      // 记录文件上传失败的次数
      const retryArr = [];
      const request = () => {
        // max 限制了最大并发数
        while (counter < requestNum && max > 0) {
          max--;

          // 等待或者error
          const fileChunk = fileChunkList.find(chunk => {
            return chunk.status === 'ERROR' || chunk.status === 'READY';
          });

          if (!fileChunk) {
            return;
          }

          const formData = fileChunk.toFormData();
          fileChunk.status = 'UPLOADING';

          ajax4Upload({
            method: 'POST',
            url: this.uploadUrl,
            data: formData,
            onProgress: this.onProgressHandler.bind(this, fileChunk),
            requestList: this.requestList,
          })
            .then(() => {
              fileChunk.status = 'SUCCESS';

              // 释放通道
              max++;
              counter++;
              if (counter === requestNum) {
                resolve();
              } else {
                request();
              }
            })
            .catch(e => {
              if (e === 'Cancel') {
                this.markAsReady(fileChunk);
                this.calcProcessInSliceMode();
              } else {
                fileChunk.status = 'ERROR';
                // 触发重试机制
                if (typeof retryArr[fileChunk.index] !== 'number') {
                  retryArr[fileChunk.index] = 0;
                }

                // 次数累加
                retryArr[fileChunk.index]++;

                // 一个请求报错超过最大重试次数
                if (retryArr[fileChunk.index] >= retry) {
                  return reject();
                }

                // 清空进度条
                fileChunk.progress = {};
                // 释放当前占用的通道，但是counter不累加
                max++;

                request();
              }
            });
        }
      };

      request();
    });
  };

  // 上传文件
  uploadFile = file => {
    const formData = new FormData();
    const startTime = new Date().getTime();

    formData.append('file', file);
    ajax4Upload({
      method: 'POST',
      url: this.uploadUrl,
      data: formData,
      onProgress: this.onProgressHandler.bind(this, file),
    }).then(() => {
      const endTime = new Date().getTime();
      this.uploadTime = parseInt(String((endTime - startTime) / 10)) / 100;

      if (this.customCompleteHandler) {
        this.customCompleteHandler({
          uploadTime: this.uploadTime,
          hashTime: this.calHashTime,
        });
      }
    });
  };

  // 上传切片
  uploadChunks = fileChunkList => {
    const startTime = new Date().getTime();

    // 限制 request 数量
    this.requestWithLimit(fileChunkList)
      .then(() => {
        const endTime = new Date().getTime();
        this.uploadTime = parseInt(String((endTime - startTime) / 10)) / 100;

        if (this.customCompleteHandler) {
          this.customCompleteHandler({
            uploadTime: this.uploadTime,
            hashTime: this.calHashTime,
          });
        }
      })
      .catch(() => {
        // 有部分请求失败，将请求停掉
        this.pause();
      });
  };

  // 继续上传
  proceed = () => {
    this.uploadChunks(this.chunkList);
    this.calcProcessInSliceMode();
  };

  upload = file => {
    this.length = file.size;
    if (this.enableSlice) {
      // 文件切片
      const chunkList = createFileChunk(file);
      this.chunkList = chunkList;

      const hashStartTime = new Date().getTime();
      // 文件生成 Hash
      calculateFileHash(chunkList).then(hash => {
        // 记录 Hash 计算时间
        const hashEndTime = new Date().getTime();
        this.calHashTime =
          parseInt(String((hashEndTime - hashStartTime) / 10)) / 100;

        // 判断后端是或已经存在该文件
        this.verifyHash(file.size, hash).then(res => {
          const response = JSON.parse(res);
          const { uploaded, uploadedChunkList } = response;

          if (uploaded) {
            // 秒传
            this.secondUpload(file);
          } else {
            // 标记已经完成上传的
            this.chunkList.forEach(chunk => {
              chunk.fileHash = hash;
              uploadedChunkList.forEach(uploadedChunk => {
                if (uploadedChunk.chunkName === chunk.chunkName) {
                  this.markAsSuccess(chunk);
                }
              });
            });

            // 上传切片
            this.uploadChunks(chunkList);
          }
        });
      });
    } else {
      this.uploadFile(file);
    }

    return this;
  };
}
