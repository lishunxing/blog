// .vitepress/theme/index.ts
// 1. 引入默认主题
import DefaultTheme from 'vitepress/theme'
import 'viewerjs/dist/viewer.min.css'
import './custom.css'
import imageViewer from 'vitepress-plugin-image-viewer'
import vImageViewer from 'vitepress-plugin-image-viewer/lib/vImageViewer.vue'
import { useRoute } from 'vitepress'

// 3. 导出配置
export default {
    // 扩展默认主题，确保原有样式和功能不丢失
    extends: DefaultTheme,
    enhanceApp(ctx) {
        DefaultTheme.enhanceApp(ctx)
        ctx.app.component('vImageViewer', vImageViewer)
    },
    setup() {
        imageViewer(useRoute())
    }
}