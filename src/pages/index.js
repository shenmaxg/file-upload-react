import React, { useRef, useState } from 'react';
import { Button, Progress, Card, Tooltip } from 'antd';
import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import styles from './index.less';
import { UPLOAD_SINGLE_FILE_API, UPLOAD_CHUNK_FILE_API } from '../api.js';
import { postFile } from '../request.js';
import Uploader from '../uploader';

const singleUploader = new Uploader(UPLOAD_SINGLE_FILE_API, {
  showProgress: true,
});

const sliceUploader = new Uploader(UPLOAD_CHUNK_FILE_API, {
  showProgress: true,
  enableSlice: true,
});

export default () => {
  const uploadBtnRef = useRef();
  // 普通上传进度
  const [singleFilePercent, setSingleFilePercent] = useState(0);
  // 普通上传时间
  const [singleUploadTime, setSingleUploadTime] = useState(null);
  // 切片上传总体进度
  const [sliceFilePercent, setSliceFilePercent] = useState(0);
  // 切片上传时间
  const [sliceUsedTime, setSliceUsedTime] = useState(null);
  // 切片上传进度详情
  const [sliceProgressDetail, setSliceProgressDetail] = useState([]);
  const [mode, setMode] = useState('NORMAL');

  const clickUploadBtn = mode => {
    setMode(mode);
    uploadBtnRef.current.click();
  };

  // 普通上传
  const uploadNormalFile = e => {
    const originFile = e.nativeEvent.target.files[0];

    singleUploader
      .upload(originFile)
      .onProgress(({ percentage }) => {
        setSingleFilePercent(percentage);
      })
      .onComplete(({ uploadTime }) => {
        setSingleUploadTime(uploadTime);
      });
  };

  // 切片上传
  const uploadSliceFile = e => {
    const originFile = e.nativeEvent.target.files[0];

    sliceUploader
      .upload(originFile)
      .onProgress(({ percentage, progressDetail }) => {
        setSliceFilePercent(percentage);
        setSliceProgressDetail(progressDetail);
      })
      .onComplete(({ uploadTime, hashTime }) => {
        setSliceUsedTime({
          uploadTime,
          hashTime,
        });
      });
  };

  const uploadFile = e => {
    switch (mode) {
      case 'NORMAL':
        uploadNormalFile(e);
        break;
      case 'SLICE':
        uploadSliceFile(e);
        break;
    }
    e.value = '';
  };

  // 暂停上传
  const pause = () => {
    sliceUploader.pause();
  };

  // 继续上传
  const proceed = () => {
    sliceUploader.proceed();
  };

  return (
    <div className={styles.layout}>
      <input
        type="file"
        style={{ display: 'none' }}
        ref={uploadBtnRef}
        onChange={uploadFile}
      ></input>

      <Card
        className={styles.card}
        title={
          <Button onClick={() => clickUploadBtn('NORMAL')}>普通上传</Button>
        }
      >
        <Progress percent={singleFilePercent} />
        {singleUploadTime && (
          <div style={{ marginTop: '12px' }}>
            <span> 上传时间 </span>
            {singleUploadTime}
            <span> 秒 </span>
          </div>
        )}
      </Card>

      <Card
        className={styles.card}
        title={
          <>
            <Button onClick={() => clickUploadBtn('SLICE')}>切片上传</Button>
            <Tooltip title="继续">
              <Button
                className={styles.btn}
                icon={<CaretRightOutlined />}
                onClick={() => proceed()}
              />
            </Tooltip>

            <Tooltip title="停止">
              <Button
                className={styles.btn}
                icon={<PauseOutlined />}
                onClick={() => pause()}
              />
            </Tooltip>
          </>
        }
      >
        <Progress percent={sliceFilePercent} />
        {sliceUsedTime && (
          <div style={{ marginTop: '12px' }}>
            <span> Hash 用时 </span>
            {sliceUsedTime.hashTime}
            <span> 秒 &nbsp;&nbsp; </span>

            <span> 上传时间 </span>
            {sliceUsedTime.uploadTime}
            <span> 秒 </span>
          </div>
        )}

        {/* 每个小方块代表一个切片 */}
        <div className={styles.cubeContainer}>
          {sliceProgressDetail.map(({ progress, status }, index) => {
            const height =
              progress && progress.percentage > 0
                ? `${progress?.percentage}%`
                : 0;

            return (
              <div
                className={classNames(
                  styles.cube,
                  styles[`${status.toLowerCase()}Border`],
                )}
                key={index}
              >
                <div
                  className={classNames(
                    styles.cubeInner,
                    styles[`${status.toLowerCase()}`],
                  )}
                  style={{ height: height }}
                ></div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
