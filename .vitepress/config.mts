import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Lishunxing Blog",
  description: "每一个不曾起舞的日子，都是对生命的辜负",
  themeConfig: {
    search:{provider : 'local'},
    nav: [
      { text: '首页', link: '/' },
      { text: '软件工具', link: '/software'},
      { text: '数据结构与算法', link: '/algorithm' },
    ],

    logo: { src: 'https://file.lishunxing.cn/img/%E6%9D%BF%E6%A0%97.svg', width: 24, height: 24 },
    sidebar : {
      '/java/': [
        {
          text: 'Spring',
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
            {text: '移动零',link: '/algorithm/array/move-zeroes'},
            {text: '找到所有数组中消失的数字',link: '/algorithm/array/find-all-numbers-disappeared-in-an-array'}
          ]
        }
      ],
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
            {text: '移动零',link: '/algorithm/array/move-zeroes'},
            {text: '找到所有数组中消失的数字',link: '/algorithm/array/find-all-numbers-disappeared-in-an-array'}
          ]
        },
        {
          text: '链表',
          items: [
            {text: '合并两个有序链表',link: 'algorithm/linkedlist/merge-two-sorted-lists'}
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
