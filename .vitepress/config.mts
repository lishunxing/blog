import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid({
  title: "Lishunxing Blog",
  description: "每一个不曾起舞的日子，都是对生命的辜负",
  ignoreDeadLinks: true,
  themeConfig: {
    search:{provider : 'local'},
    nav: [
      { text: '首页', link: '/' },
      { text: 'Java', link: '/java/spring/index' },
      { text: '软件工具', link: '/software'},
      { text: '数据结构与算法', link: '/algorithm' },
    ],

    logo: { src: 'https://file.lishunxing.cn/img/%E6%9D%BF%E6%A0%97.svg', width: 24, height: 24 },
    sidebar : {
      '/java/': [
        {
          text: 'Spring',
          items: [
            {text: '概述', link: '/java/spring/index'},
            {text: 'IoC', link: '/java/spring/IoC'},
            {text: 'AOP', link: '/java/spring/AOP'},
            {text: '循环依赖', link: '/java/spring/循环依赖'},
            {text: '事务', link: '/java/spring/事务'}
          ]
        },
        {
          text: 'Spring Boot',
          items: [
            {text: '自动装配和启动流程', link: '/java/spring boot/自动装配和启动流程'}
          ]
        },
        {
          text: 'Spring Cloud',
          items: [
            {text: 'Gateway', link: '/java/spring cloud/Gateway'},
            {text: 'LoadBalancer', link: '/java/spring cloud/LoadBalancer'},
            {text: 'Nacos注册中心', link: '/java/spring cloud/Nacos注册中心'},
            {text: 'Nacos配置中心', link: '/java/spring cloud/Nacos配置中心'},
            {text: 'Seata', link: '/java/spring cloud/Seata'},
            {text: 'Sentinel', link: '/java/spring cloud/Sentinel'}
          ]
        },
        {
          text: 'JUC',
          items: [
            {text: '并发编程基础', link: '/java/juc/并发编程基础'},
            {text: 'ThreadLocal', link: '/java/juc/ThreadLocal'},
            {text: '线程池与阻塞队列', link: '/java/juc/线程池与阻塞队列'},
            {text: 'HashMap & ConcurrentHashMap', link: '/java/juc/HashMap & ConcurrentHashMap'},
            {text: 'ReentrantLock', link: '/java/juc/ReentrantLock'}
          ]
        },
        {
          text: 'MySQL',
          items: [
            {text: '架构', link: '/java/mysql/架构'},
            {text: '索引', link: '/java/mysql/索引'},
            {text: '事务', link: '/java/mysql/事务'}
          ]
        },
        {
          text: 'Redis',
          items: [
            {text: '常用数据类型', link: '/java/redis/常用数据类型'},
            {text: '过期淘汰策略', link: '/java/redis/过期淘汰策略'},
            {text: 'Redis持久化和集群配置', link: '/java/redis/Redis持久化和集群配置'},
            {text: 'RedissionLock', link: '/java/redis/RedissionLock'},
            {text: '面试题', link: '/java/redis/面试题'}
          ]
        },
        {
          text: 'MQ',
          items: [
            {text: 'RabbitMQ', link: '/java/mq/RabbitMQ'}
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
            {text: '合并两个有序链表',link: '/algorithm/linkedlist/merge-two-sorted-lists'}
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
         },
         {
          text: 'Canal',
          items: [
            { text: 'Canal', link: '/software/canal/Canal' }
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
    outline: {
      level: [1, 2, 3],
      label: '目录'
    },
  }
})
