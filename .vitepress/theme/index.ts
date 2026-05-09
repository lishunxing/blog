// .vitepress/theme/index.ts
// 1. 引入默认主题
import DefaultTheme from 'vitepress/theme'

// 2. 引入增强插件的核心方法和样式
import { useMermaidPanZoom } from 'vitepress-plugin-mermaid-pan-zoom'
import 'vitepress-plugin-mermaid-pan-zoom/dist/style.css'

// 3. 导出配置
export default {
    // 扩展默认主题，确保原有样式和功能不丢失
    extends: DefaultTheme,
    // 使用 setup 钩子来初始化插件
    setup() {
        // 初始化 Mermaid 的平移和缩放功能
        useMermaidPanZoom()
    }
}