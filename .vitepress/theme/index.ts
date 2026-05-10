// .vitepress/theme/index.ts
// 1. 引入默认主题
import DefaultTheme from 'vitepress/theme'

// 3. 导出配置
export default {
    // 扩展默认主题，确保原有样式和功能不丢失
    extends: DefaultTheme,
}