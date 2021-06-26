import { defineConfig } from 'umi';
export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  workerLoader: {
    worker: 'Worker',
    esModule: true,
  },
});
//# sourceMappingURL=.umirc.js.map
