# Spring

Spring 是一个轻量级的开源框架，旨在简化 Java 开发。

## 核心特性

| 特性 | 说明 |
| :--- | :--- |
| **IoC/DI** | 控制反转与依赖注入，实现对象解耦 |
| **AOP** | 面向切面编程，分离横切关注点 |
| **事务管理** | 声明式事务，简化数据库事务处理 |

## 文档索引

### [IoC 容器](./IoC)

- IoC/DI 核心概念与注入方式
- ApplicationContext 接口继承链
- Spring Bean 完整生命周期
- 实例化 → 依赖注入 → Aware 回调 → 初始化 → 销毁

### [AOP 面向切面编程](./AOP)

- 切面、连接点、切点、通知概念
- JDK 动态代理与 CGLIB 代理原理
- Spring Boot 2.x 默认使用 CGLIB
- 多切面优先级配置

### [Spring 事务](./事务)

- ACID 特性与传播行为
- @Transactional 属性详解
- 事务隔离级别（脏读、不可重复读、幻读）
- 常见失效场景：同类调用、非 public 方法、多线程

### [循环依赖与三级缓存](./循环依赖)

- 三级缓存机制：singletonObjects → earlySingletonObjects → singletonFactories
- 构造器注入循环依赖为何无法解决
- @Async 与 @Transactional 循环依赖差异
- getEarlyBeanReference 与 AOP 代理时机
