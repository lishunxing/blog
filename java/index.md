# Java 技术栈

Java 后端技术学习笔记，涵盖 Spring、Spring Boot、Spring Cloud、JUC、数据库、缓存、消息队列等核心技术。

[[toc]]

## 技术分类

### Spring

轻量级 Java 开发框架，提供 IoC 和 AOP 核心特性。

- [IoC 容器](./spring/IoC) - 控制反转与依赖注入
- [AOP 面向切面编程](./spring/AOP) - 切面、代理、通知
- [Spring 事务](./spring/事务) - 事务传播行为与隔离级别
- [循环依赖与三级缓存](./spring/循环依赖) - Spring Bean 生命周期

### Spring Boot

简化 Spring 应用的创建和开发流程。

- [自动装配和启动流程](./spring%20boot/自动装配和启动流程) - 自动配置原理与启动机制

### Spring Cloud

微服务架构解决方案。

- [Gateway](./spring%20cloud/Gateway) - API 网关与路由配置
- [LoadBalancer](./spring%20cloud/LoadBalancer) - 负载均衡策略
- [Nacos 注册中心](./spring%20cloud/Nacos注册中心) - 服务发现与注册
- [Nacos 配置中心](./spring%20cloud/Nacos配置中心) - 统一配置管理
- [Seata](./spring%20cloud/Seata) - 分布式事务解决方案
- [Sentinel](./spring%20cloud/Sentinel) - 流量控制与熔断降级

### JUC 并发编程

Java 并发编程核心包，涵盖线程、锁、集合等。

- [并发编程基础](./juc/并发编程基础) - 线程创建、状态与同步机制
- [ThreadLocal](./juc/ThreadLocal) - 线程本地变量
- [线程池与阻塞队列](./juc/线程池与阻塞队列) - Executor 框架
- [HashMap & ConcurrentHashMap](./juc/HashMap%20&%20ConcurrentHashMap) - 并发安全集合
- [ReentrantLock](./juc/ReentrantLock) - 可重入锁与条件队列

### MySQL

关系型数据库，存储与管理业务数据。

- [数据库架构](./mysql/架构) - MySQL 体系结构
- [索引原理](./mysql/索引) - B+树、索引类型与优化
- [事务机制](./mysql/事务) - ACID、隔离级别与MVCC

### Redis

高性能 Key-Value 存储，支持多种数据结构。

- [常用数据类型](./redis/常用数据类型) - String、List、Set、Hash、Zset
- [过期淘汰策略](./redis/过期淘汰策略) - TTL与淘汰机制
- [Redis 持久化和集群配置](./redis/Redis持久化和集群配置) - RDB、AOF与集群模式
- [RedissionLock](./redis/RedissionLock) - 分布式锁实现
- [面试题](./redis/面试题) - Redis 高频面试题

### MQ 消息队列

异步通信与解耦的核心组件。

- [RabbitMQ](./mq/RabbitMQ) - 消息队列的安装与使用
