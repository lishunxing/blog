# 简介

Spring Cloud LoadBalancer 是 Spring Cloud 官方提供的**客户端负载均衡器**，用于替代已进入维护模式的 Netflix Ribbon。它在 Spring Cloud Commons 项目中提供，从 2020.0.0 版本开始成为 Spring Cloud 默认的负载均衡实现。

> 官网地址: <https://docs.spring.io/spring-cloud-commons/reference/spring-cloud-commons/loadbalancer.html>    

## 核心概念：

客户端负载均衡与服务端负载均衡（如 Nginx）的本质区别在于负载均衡逻辑的位置

| 类型               | 代表                              | 工作方式                                                     | 特点                                 |
| :----------------- | :-------------------------------- | :----------------------------------------------------------- | :----------------------------------- |
| **服务端负载均衡** | Nginx、F5                         | 所有请求先到达负载均衡器，由其转发到后端服务                 | 集中式，需要额外部署和维护           |
| **客户端负载均衡** | Spring Cloud LoadBalancer、Ribbon | 调用方从注册中心获取服务列表，**在本地**通过算法选择一个实例直接调用 | 去中心化，与客户端集成，无需额外组件 |

Spring Cloud LoadBalancer 的工作流程如下：

1.  从服务注册中心（如 Nacos、Eureka）获取目标服务的实例列表
2.  将列表缓存到本地 JVM
3.  每次发起调用时，根据配置的负载均衡算法从列表中选择一个实例
4.  直接向该实例发起请求

## 核心架构与组件

Spring Cloud LoadBalancer 的核心抽象是 ReactiveLoadBalancer 接口，提供了响应式和非响应式两种使用方式。

| 组件                          | 说明                                                         |
| :---------------------------- | :----------------------------------------------------------- |
| `ReactiveLoadBalancer`        | 响应式负载均衡器接口，核心方法 `choose()` 返回 `Mono<Response<T>>` |
| `ServiceInstanceListSupplier` | 服务实例列表供应商，负责获取和缓存实例列表                   |
| `LoadBalancerClientFactory`   | 为每个服务 ID 创建独立的 LoadBalancer 上下文                 |
| `BlockingLoadBalancerClient`  | 阻塞式客户端，可与 `RestTemplate` 配合使用                   |

## 负载均衡策略

Spring Cloud LoadBalancer 提供了两种内置的负载均衡策略

| 策略     | 类名                     | 说明                         | 配置方式             |
| :------- | :----------------------- | :--------------------------- | :------------------- |
| **轮询** | `RoundRobinLoadBalancer` | 默认策略，按顺序轮流选择实例 | 无需配置             |
| **随机** | `RandomLoadBalancer`     | 随机选择一个实例             | 需通过自定义配置切换 |

### 轮询策略

这是 LoadBalancer 的默认策略，无需额外配置。其核心算法原理如下：

*   维护一个原子计数器（从 0 开始），每次请求时计数器加 1
*   将 `计数器 % 实例总数` 作为选中的实例下标
*   服务重启后计数器重置

适用场景：集群中各服务器性能相近，且请求处理时间差异不大时使用。

### 随机策略

需要显式配置才能切换，配置示例如下

```java
public class CustomLoadBalancerConfiguration {
    
    @Bean
    public ReactorLoadBalancer<ServiceInstance> randomLoadBalancer(
            Environment environment,
            LoadBalancerClientFactory loadBalancerClientFactory) {
        
        String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
        return new RandomLoadBalancer(
            loadBalancerClientFactory.getLazyProvider(name, ServiceInstanceListSupplier.class),
            name
        );
    }
}
```

适用场景：对负载均衡精度要求不高，或需要简单快速地分配请求时使用。

### 高级扩展策略（通过 ServiceInstanceListSupplier）

Spring Cloud LoadBalancer 的真正强大之处在于 `ServiceInstanceListSupplier` 的组合机制。你可以像“搭积木”一样，将不同的 Supplier 层层包装，实现复合策略。

    flowchart LR
        A[DiscoveryClient<br>从注册中心获取实例] --> B[Weighted<br>加权处理]
        B --> C[ZonePreference<br>区域过滤]
        C --> D[Caching<br>结果缓存]
        D --> E[LoadBalancer<br>最终选择]

#### 加权策略 (WeightedServiceInstanceListSupplier)

根据实例的权重值调整被选中的概率，权重越高被选中的概率越大

*   权重来源：默认从实例元数据的 `weight` 键读取，未配置时默认为 1
*   配置方式：

```yaml
# 服务提供者配置
spring:
  cloud:
    nacos:
      discovery:
        metadata:
          weight: "3"    # 权重值，默认为 1
```

```java
// 客户端启用加权策略
public class CustomLoadBalancerConfiguration {
    @Bean
    public ServiceInstanceListSupplier discoveryClientServiceInstanceListSupplier(
            ConfigurableApplicationContext context) {
        return ServiceInstanceListSupplier.builder()
                    .withDiscoveryClient()
                    .withWeighted()      // 启用加权
                    .withCaching()
                    .build(context);
    }
}
```

适用场景：集群中存在性能差异（如不同规格的服务器），需要为高性能机器分配更多流量。

#### 区域优先策略 (ZonePreferenceServiceInstanceListSupplier)

优先选择与调用方处于同一区域的实例，如果同区域无可用实例，则回退到所有实例

*   区域配置：通过 `spring.cloud.loadbalancer.zone` 指定
*   实例区域识别：从实例元数据的 `zone` 键读取

```yaml
# 客户端配置
spring:
  cloud:
    loadbalancer:
      zone: "east-1"    # 指定客户端所在区域
```

适用场景：多机房部署时，优先调用同机房实例以降低延迟和带宽成本。

#### 健康检查策略 (HealthCheckServiceInstanceListSupplier)

定期对实例进行健康探测，只返回健康的实例

*   适用场景：当使用静态服务列表（`SimpleDiscoveryClient`）时特别有用
*   注意：如果已使用服务注册中心（如 Nacos），注册中心本身已提供健康实例，通常不需要额外开启此策略，以避免双重过滤

```yaml
spring:
  cloud:
    loadbalancer:
      health-check:
        interval: 30s                      # 检查间隔
        path:
          default: /actuator/health       # 健康检查端点
```

#### 其他策略

*   同实例优先策略 (SameInstancePreferenceServiceInstanceListSupplier) : 需要会话保持（Sticky Session），或实例本地缓存有性能优势的场景。
*   请求会话保持策略 (RequestBasedStickySessionServiceInstanceListSupplier): 需要跨请求保持会话状态，且希望由 LoadBalancer 自动管理会话保持。
*   基于 Hint 的策略 (HintBasedServiceInstanceListSupplier): 灰度发布、金丝雀发布，需要根据请求特征（如用户类型、版本号）路由到指定实例组。

### 策略组合示例

以下配置同时启用了加权、缓存和区域优先

```java
@Bean
public ServiceInstanceListSupplier discoveryClientServiceInstanceListSupplier(
        ConfigurableApplicationContext context) {
    return ServiceInstanceListSupplier.builder()
                .withDiscoveryClient()      // 从注册中心获取
                .withWeighted()             // 加权
                .withZonePreference()       // 区域优先
                .withCaching()              // 缓存（生产环境强烈建议）
                .build(context);
}
```

### 缓存机制说明

为了提高性能，强烈建议在生产环境中启用缓存，避免每次选择实例都调用注册中心 API

| 缓存项   | 默认值 | 说明         |
| :------- | :----- | :----------- |
| TTL      | 35 秒  | 缓存过期时间 |
| 初始容量 | 256    | 缓存初始大小 |

```yaml
spring:
  cloud:
    loadbalancer:
      cache:
        ttl: 30s          # 缓存过期时间
        capacity: 256     # 初始容量
        enabled: true     # 是否启用缓存 如果整合了注册中心这里应该禁用 避免双重缓存
```

> 注意：如果注册中心客户端（如 Eureka, Nacos）已自带缓存，应**禁用** LoadBalancer 的缓存以避免双重缓存。

# 使用

引入jar包

```xml
        <!--loadBalancer-->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-loadbalancer</artifactId>
        </dependency>  
```

## 在 RestTemplate 上使用

### 为 RestTemplate 添加 @LoadBalanced 注解

这是启用客户端负载均衡的关键，让 RestTemplate 能够识别服务名（如 [http://user-service/api](http://user-service/api）并进行负载均衡。)）并进行负载均衡。

```java
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    @Bean
    @LoadBalanced   // 必须添加，启用负载均衡能力
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

### 绑定自定义配置

使用 `@LoadBalancerClient` 注解，将你写好的 `CustomLoadBalancerConfiguration` 与特定的 `RestTemplate` 调用目标绑定在一起。

```java
import org.springframework.cloud.loadbalancer.annotation.LoadBalancerClient;
import org.springframework.context.annotation.Configuration;

@Configuration
// 为名为 "user-service" 的服务指定自定义的负载均衡配置
@LoadBalancerClient(value = "user-service", configuration = CustomLoadBalancerConfiguration.class)
public class RestTemplateConfig {
    // ... restTemplate Bean 定义同上
}

// 设置全局默认配置，对所有服务生效
@Configuration
@LoadBalancerClients(defaultConfiguration = CustomLoadBalancerConfiguration.class)
public class RestTemplateConfig {
    // ...
}
```

### 使用 RestTemplate 调用

在代码中直接使用配置好的 `RestTemplate`，并用服务名代替具体的 IP 地址和端口

```java
@Service
public class UserService {

    @Autowired
    private RestTemplate restTemplate;

    public String getUserInfo() {
        // 直接使用服务名 "user-service" 进行调用
        String url = "http://user-service/api/user/info";
        return restTemplate.getForObject(url, String.class);
    }
}
```

> 注意：如果没有使用 @LoadBalanced 注解，RestTemplate 将无法解析服务名，会直接抛出 java.net.UnknownHostException 异常。

## 在 OpenFeign 上使用

### 绑定自定义配置

在 `@FeignClient` 注解中，直接通过 configuration 属性指定你的 `CustomLoadBalancerConfiguration` 类。

```java
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

// 通过 configuration 属性绑定自定义的负载均衡配置
@FeignClient(value = "user-service", configuration = CustomLoadBalancerConfiguration.class)
public interface UserServiceClient {

    @GetMapping("/api/user/info")
    String getUserInfo();
}
```

### 在启动类启用 Feign 客户端

确保你的 Spring Boot 启动类上添加了 `@EnableFeignClients` 注解，以激活 OpenFeign 功能

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients   // 必须添加，启用 Feign 客户端
public class YourApplication {

    public static void main(String[] args) {
        SpringApplication.run(YourApplication.class, args);
    }
}
```

### 注入并使用 Feign 客户端

在其他组件中直接注入并使用这个客户端接口，Feign 会基于你的自定义配置进行负载均衡调用

```java
@RestController
public class UserController {

    @Autowired
    private UserServiceClient userServiceClient;

    @GetMapping("/user-info")
    public String getUserInfo() {
        // 调用 Feign 客户端方法，它会自动使用绑定的负载均衡配置
        return userServiceClient.getUserInfo();
    }
}
```

> 说明：与 RestTemplate 不同，OpenFeign 一旦正确配置了 @FeignClient 的 configuration 属性，其内部就已经集成了负载均衡能力，无需额外的 @LoadBalanced 注解。