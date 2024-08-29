import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Lishunxing Blog",
  description: "每一个不曾起舞的日子，都是对生命的辜负",
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '示例', link: '/example/markdown-examples' },
      { text: '数据结构与算法', link: '/algorithm/first' },
    ],

    logo: { src: 'https://file.lishunxing.cn/img/%E6%9D%BF%E6%A0%97.svg', width: 24, height: 24 },

    // sidebar: [
    //   {
    //     text: 'Examples',
    //     items: [
    //       { text: 'Markdown Examples', link: '/markdown-examples' },
    //       { text: 'Runtime API Examples', link: '/api-examples' }
    //     ]
    //   }
    // ],
    sidebar : {
      // /algothm/表示对这个文件夹下的所有md文件做侧边栏配置
      '/algorithm/': [
        {
          text: '链表',
          items: [
            {
              text: '第一篇文章',
              link: '/algorithm/first'
            },
            {
              text: '第二篇文章',
              link: '/algorithm/second'
            }
          ]
        },
        {
          text: '栈',
          items: [
            {
              text: '第三篇文章',
              link: '/algorithm/third'
            },
            {
              text: '第四篇文章',
              link: '/algorithm/fourth'
            }
          ]
        }
      ],
      '/example/': [
         {
          text: 'Examples',
          items: [
            { text: 'Markdown Examples', link: '/example/markdown-examples' },
            { text: 'Runtime API Examples', link: '/example/api-examples' }
          ]
         }
      ]
    } ,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lishunxing/blog' }
    ],

    
    footer: {
      message: '基于 MIT 许可发布',
      copyright: '版权所有 © 2024 lishunxing',
    },
  }
})
