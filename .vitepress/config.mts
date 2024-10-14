import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Lishunxing Blog",
  description: "每一个不曾起舞的日子，都是对生命的辜负",
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '软件工具', link: '/software/jenkins/部署Vue项目.md'},
      { text: '数据结构与算法', link: '/algorithm' },
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
          text: '递归',
          items: [
            {text: '爬楼梯',link: '/algorithm/recursion/climbing-stairs'},
            {text: '斐波那契数',link: '/algorithm/recursion/fibonacci-number'}
          ]
        },
        {
          text: '数组',
          items: [
            {text: '两数之和',link: '/algorithm/array/two-sum'},
            {text: '合并两个有序数组',link: '/algorithm/array/merge-sorted-array'},
            {text: '移动零',link: '/algorithm/array/move-zeroes'}
          ]
        }
      ],
      '/software/': [
         {
          text: 'Jenkins',
          items: [
            { text: '安装', link: '/software/jenkins/安装' },
            { text: '部署Vue项目', link: '/software/jenkins/部署Vue项目' }
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
