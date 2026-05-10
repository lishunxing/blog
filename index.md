---
layout: home

hero:
  name: "Lishunxing Blog"
  text: "Java 技术随笔"
  tagline: "Greatness In Simplicity"
  image:
    src: https://file.lishunxing.cn/img/%E6%9D%BF%E6%A0%97.svg
    alt: Logo
  actions:
    - theme: brand
      text: Java 技术栈
      link: /java/index
    - theme: alt
      text: 数据结构与算法
      link: /algorithm
    - theme: alt
      text: 软件工具
      link: /software

features:
  - icon: 🌱
    title: Spring 生态
    details: Spring Framework、Spring Boot、Spring Cloud 微服务解决方案
  - icon: ⚡
    title: JUC 并发编程
    details: Java 并发编程核心包，线程池、锁机制、并发集合
  - icon: 🗄️
    title: 数据库
    details: MySQL 索引、事务、锁机制，Redis 数据结构与持久化
  - icon: 📨
    title: 消息队列
    details: RabbitMQ 消息中间件，异步通信与解耦
  - icon: 🛠️
    title: 软件部署
    details: Jenkins 自动化部署，Canal 数据同步
  - icon: 📝
    title: 算法笔记
    details: LeetCode 刷题笔记，递归、数组、链表

footer: |
  <p>基于 MIT 许可发布 · 版权所有 © 2024 lishunxing</p>
---
<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);

  --vp-home-hero-image-background-image: linear-gradient(-45deg, #bd34fe 50%, #47caff 50%);
  --vp-home-hero-image-filter: blur(44px);
}

@media (min-width: 640px) {
  :root {
    --vp-home-hero-image-filter: blur(56px);
  }
}

@media (min-width: 960px) {
  :root {
    --vp-home-hero-image-filter: blur(68px);
  }
}

.VPHomeHero .text {
  font-size: 2.5rem;
  font-family: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif;
}

</style>