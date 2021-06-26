function ajax4Upload({
  method = 'POST',
  url,
  data,
  headers = {},
  onProgress = e => e,
  requestList,
}) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();

    xhr.upload.onprogress = onProgress;
    xhr.onload = () => {
      // 将请求成功的 xhr 从列表中删除
      if (requestList) {
        const xhrIndex = requestList.findIndex(item => item === xhr);
        requestList.splice(xhrIndex, 1);
      }

      if (xhr.status === 200) {
        const response = xhr.response;

        // 特殊逻辑，和后端配合
        if (response === 'true') {
          resolve(response);
        } else {
          reject(response);
        }
      } else {
        reject({ status: xhr.status, res: xhr.response });
      }
    };

    // 用户取消
    xhr.onabort = () => {
      reject('Cancel');
    };

    // 网络错误
    xhr.onerror = err => {
      reject(err);
    };

    xhr.open(method, url, true);

    Object.keys(headers).forEach(key =>
      xhr.setRequestHeader(key, headers[key]),
    );

    xhr.send(data);

    requestList?.push(xhr);
  });
}

function ajax({ method = 'POST', url, data, headers = {} }) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = xhr.response;

        resolve(response);
      } else {
        reject({ status: xhr.status, res: xhr.response });
      }
    };

    // 网络错误
    xhr.onerror = err => {
      reject(err);
    };

    xhr.open(method, url, true);

    Object.keys(headers).forEach(key =>
      xhr.setRequestHeader(key, headers[key]),
    );

    xhr.send(data);
  });
}

export { ajax4Upload, ajax };
