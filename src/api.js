// 验证文件是否存在
const VERIFY_FILE_API = 'http://localhost:8080/file/prepare';
// 普通上传接口
const UPLOAD_SINGLE_FILE_API = 'http://localhost:8080/file/uploadSingle';
// 切片上传接口
const UPLOAD_CHUNK_FILE_API = 'http://localhost:8080/file/uploadChunk';

export { VERIFY_FILE_API, UPLOAD_SINGLE_FILE_API, UPLOAD_CHUNK_FILE_API };
