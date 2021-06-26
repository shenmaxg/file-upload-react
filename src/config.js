// 切片大小
const CHUNK_SIZE = 10 * 1024 * 1024;
// 请求并发数
const MAX_REQUEST_NUM = 6;
// 请求失败重试次数
const MAX_RETRY_NUM = 3;

export { CHUNK_SIZE, MAX_REQUEST_NUM, MAX_RETRY_NUM };
