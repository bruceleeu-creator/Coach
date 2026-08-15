import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  css: {
    preprocessorOptions: {
      scss: {
        // vite 5.2（uni-app 锁定版本）仅支持 legacy JS API，该弃用无法通过配置消除，
        // 只能显式静音；升级到 vite >= 5.4 后可改用 api: 'modern-compiler' 并移除此项。
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
})
