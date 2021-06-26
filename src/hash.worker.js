self.importScripts('spark-md5.min.js'); // 导入脚本

// 全量 Hash
postHashMsg = fileChunkList => {
  const spark = new self.SparkMD5.ArrayBuffer();
  let count = 0;

  const loadNext = index => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(fileChunkList[index].chunk);

    reader.onload = e => {
      count++;
      spark.append(e.target.result);
      if (count === fileChunkList.length) {
        self.postMessage({
          hash: spark.end(),
        });
        self.close();
      } else {
        // 递归计算下一个切片
        loadNext(count);
      }
    };
  };
  loadNext(0);
};

self.onmessage = e => {
  const { fileChunkList, type } = e.data;

  if (type === 'HASH') {
    postHashMsg(fileChunkList);
  }
};
