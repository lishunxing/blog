简介

官网地址: https://sentinelguard.io/

核心概念就是资源及规则. 

围绕**资源**的实时状态设定的**规则**，可以包括流量控制规则、熔断降级规则以及系统保护规则。所有规则可以动态实时调整。

**设计理念**

在限制的手段上，Sentinel 和 Hystrix 采取了完全不一样的方法。

Hystrix 通过[线程池](https://github.com/Netflix/Hystrix/wiki/How-it-Works#benefits-of-thread-pools)的方式，来对依赖(在我们的概念中对应资源)进行了隔离。这样做的好处是资源和资源之间做到了最彻底的隔离。缺点是除了增加了线程切换的成本，还需要预先给各个资源做线程池大小的分配。

Sentinel 对这个问题采取了两种手段:

- 通过并发线程数进行限制

和资源池隔离的方法不同，Sentinel 通过限制资源并发线程的数量，来减少不稳定资源对其它资源的影响。这样不但没有线程切换的损耗，也不需要您预先分配线程池的大小。当某个资源出现不稳定的情况下，例如响应时间变长，对资源的直接影响就是会造成线程数的逐步堆积。当线程数在特定资源上堆积到一定的数量之后，对该资源的新请求就会被拒绝。堆积的线程完成任务后才开始继续接收请求。

- 通过响应时间对资源进行降级

除了对并发线程数进行控制以外，Sentinel 还可以通过响应时间来快速降级不稳定的资源。当依赖的资源出现响应时间过长后，所有对该资源的访问都会被直接拒绝，直到过了指定的时间窗口之后才重新恢复。

**与Hystrix对比**

| **功能**       | **Sentinel**                                               | **Hystrix**             |
| -------------- | ---------------------------------------------------------- | ----------------------- |
| 隔离策略       | 信号量隔离（并发线程数限流）                               | 线程池隔离/信号量隔离   |
| 熔断降级策略   | 基于响应时间、异常比率、异常数                             | 基于异常比率            |
| 实时统计实现   | 滑动窗口（LeapArray）                                      | 滑动窗口（基于 RxJava） |
| 动态规则配置   | 支持多种数据源                                             | 支持多种数据源          |
| 扩展性         | 多个扩展点                                                 | 插件的形式              |
| 基于注解的支持 | 支持                                                       | 支持                    |
| 限流           | 基于 QPS，支持基于调用关系的限流                           | 有限的支持              |
| 流量整形       | 支持预热模式、匀速器模式、预热排队模式(流量规则处可配置)   | 不支持                  |
| 系统自适应保护 | 支持                                                       | 不支持                  |
| 控制台         | 提供开箱即用的控制台，可配置规则、查看秒级监控、机器发现等 | 简单的监控查看          |

**工作流程**

![image-20260510143246326](http://file.lishunxing.cn/typora-images/image-20260510143246326.png)

**应用场景**

![image-20260510143251829](http://file.lishunxing.cn/typora-images/image-20260510143251829.png)

**集成Spring Cloud**

添加maven依赖

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
```



修改启动类 初始化限流参数

```java
public static void initSentinelRule(){
    List<FlowRule> ruleList = new ArrayList<>();
    FlowRule flowRule = new FlowRule();
    flowRule.setCount(2);// 设置请求最大并发数量
    flowRule.setResource("testService");// 设置需要限流的服务资源名称
    flowRule.setGrade(RuleConstant.FLOW_GRADE_QPS);// 使用请求进行限流
    ruleList.add(flowRule);
    FlowRuleManager.loadRules(ruleList);
}

public static void main(String[] args) {
    initSentinelRule();// 加载Sentinel配置规则
    SpringApplication.run(NacosDemoApplication.class, args);
}
```

创建需要限流的类

```java
@DubboService
public class TestServiceImpl implements TestService {

    private AtomicInteger i = new AtomicInteger(10);

    // fallback为发生异常时需要执行的方法  blockBack为限流时执行的方法
    @SentinelResource(value = "testService",blockHandler = "blockBack",fallback = "fallBack")
    public String getValue() {
        System.out.println("收到请求 getValue" + i.get());
        if (i.getAndIncrement() % 5 == 0) {
            throw new RuntimeException("触发fallBack");
        }
        return "哈哈哈";
    }
    // 创建限流方法 需要方法参数与返回值与限流方法一致  并且最后一个参数会传递进来一个BlockException 一定要配置 还可以配置错误返回页面
    public String blockBack(BlockException blockException){
        System.out.println("触发服务限流");
        return "触发服务限流";
    }
    // 限流资源保存时触发的方法 如果没有配置blockHandler 那么也会进入此方法中
    public String fallBack(){
        System.out.println("请求异常, 触发FallBack");
        return "请求异常, 触发FallBack";
    }

}
```

Sentinel默认提供一个监控端口可以简单的查看对应的资源限流情况 比如查看testService的限流情况 访问连接如下:

http://localhost:8719/cnode?id=testService

返回如下:

![image-20260510143422479](http://file.lishunxing.cn/typora-images/image-20260510143422479.png)

**Sentinel 基于JAVA的 SPI**

初始化方法可以自定义在启动类的main里面 也可以通过SPI去加载 Sentinel提供了一个接口InitFunc来实现

```java
public class SentinelFunc implements InitFunc {
    @Override
    public void init() {
        List<FlowRule> ruleList = new ArrayList<>();
        FlowRule flowRule = new FlowRule();
        flowRule.setCount(2);// 设置请求最大并发数量
        flowRule.setResource("testService");// 设置需要限流的服务资源名称
        flowRule.setGrade(RuleConstant.FLOW_GRADE_QPS);// 使用请求进行限流
        //flowRule.setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_RATE_LIMITER); 控制流量策略
        ruleList.add(flowRule);
        FlowRuleManager.loadRules(ruleList);
    }
}
```

扩展此SPI即可

![image-20260510143443090](http://file.lishunxing.cn/typora-images/image-20260510143443090.png)

**Sentinel控制台**

Sentinel控制台是一个jar文件, 下载地址: https://github.com/alibaba/Sentinel/releases

启动命令: 账号密码都为sentinel

```bash         
nohup java -Dserver.port=8849 -Dcsp.sentinel.dashboard.server=localhost:8849 -Dproject.name=sentinel-dashboard-1.8.2 -jar sentinel-dashboard-1.8.2.jar &     
```



启动之后页面如下:

![image-20260510143614217](http://file.lishunxing.cn/typora-images/image-20260510143614217.png)

在项目配置文件添加dashboard配置

```properties
# 配置sentinel dashboard监控
spring.cloud.sentinel.transport.dashboard=192.168.70.128:8849
# 直接初始化Sentinel控制台 默认为false 会在第一次请求之后初始化
spring.cloud.sentinel.eager=true
```



然后我们可以在后台看到项目中的配置 还可以事实调控 比如我们配置的testService 限流是2 用Jmeter测试一下查看实时监控如下:

![image-20260510143644116](http://file.lishunxing.cn/typora-images/image-20260510143644116.png)

然后如果需要修改这里可以手动在流控规则中修改 

![image-20260510143656755](http://file.lishunxing.cn/typora-images/image-20260510143656755.png)

效果如下:

![image-20260510143701233](http://file.lishunxing.cn/typora-images/image-20260510143701233.png)

**流控效果**

Sentinel 的流控效果，定义了当流量超过我们设定的阈值时，系统具体要如何应对。它提供了三种策略，可以应对从瞬时冲高到冷启动扩容等不同的场景。

| 特性         | **快速失败**                                               | **Warm Up (预热/冷启动)**                                    | **排队等待**                                                 |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **核心机制** | 超过 QPS 阈值，**立即**拒绝并抛出异常。                    | 阈值从 阈值/3**缓慢增长**，一段时间后才达到设定阈值。        | 请求**匀速**通过，超出的请求排队，等待超过设定时长则拒绝。   |
| **适用场景** | 对响应时间有严格要求的**普通应用**，知道系统明确的水位线。 | **冷启动**系统，或需要**预热缓存**、数据库连接池的场景，防止瞬间流量压垮刚启动的服务。 | **削峰填谷**，处理**突发性、不均衡**的流量，如消息队列、定时任务等。 |
| **核心参数** | count (阈值)                                               | count (最大阈值)warmUpPeriodSec (预热时长，秒)               | count (QPS阈值)maxQueueingTimeMs (最大排队等待时长，毫秒)    |

**用快递站例子来实战**

设定：快递站的能力是 **1 QPS (60个/分钟)**，现在瞬时来了 **100个包裹**。

**1. 快速失败 (Fast Fail)**

这是默认模式，快递小哥会直接告诉你："**这会儿忙不过来，后面的40个包裹我们不收了，您请回吧！**"

- **结果**：60个包裹被处理，40个被立即拒绝并抛出 FlowException 异常。
- **本质**：这是一种**硬性限流**，牺牲掉一部分请求，来确保大部分请求和系统自身的稳定。算法实现通常是**令牌桶**或**滑动窗口**计数器。

**2. Warm Up (预热)**

为了保护刚开门（系统重启）时还不太“灵光”的员工，快递站会先放出告示："**前5分钟，咱们先慢慢来，只收20个。5分钟后再恢复正常速度。**"

- **效果**：前几分钟可能只处理了20个，但5分钟后，处理能力平滑上升到60个。虽然前5分钟也拒绝了40个，但保护了系统平稳度过启动期。
- **参数**：默认的“冷加载因子 (coldFactor)”是 **3**，所以初始阈值是 60 / 3 = 20。你需要配置的就是最后达到的60这个**最大阈值**和预热需要的时长（如5分钟）。
- **本质**：令牌桶算法的“冷启动”版本。

**3. 排队等待 (Rate Limiter)**

这是最人性化的做法。快递站会拉上围栏，让大家排队："**大伙儿别急，一个个来，最慢1分钟处理一个。如果预测到您的等待时间会超过1小时，那您就别排了。**"

- **如何工作**：根据 QPS 阈值 1，可以算出单个请求的处理间隔是 1000ms / 1 = 1000ms = 1秒。100个请求进来，Sentinel 会让它们以**匀速**（每个请求间隔1秒）的方式被处理。
- **排队机制**：发送请求的客户端需要等待。如果按这种速度，处理第100个请求需要等待100秒。你可以设置一个**最大超时时间**（比如10秒），等待超过10秒的请求会被直接拒绝。
- **本质**：这是一种**漏桶算法**的实现，能很好地起到**削峰填谷**的作用，让流量曲线变得非常平滑。
- **注意**：此模式要求 grade 阈值类型必须是 **QPS**，且暂不支持 QPS > 1000 的场景（因为内部通过 Thread.sleep 实现，超过1000时无法精准控制等待时长）。

**令牌桶算法 (Token Bucket)**

**核心思想**

想象一个桶：

- **以固定速率** 往桶里添加令牌（token）
- 每个请求需要 **获取一个令牌** 才能被处理
- 桶有 **容量上限**，令牌满了就不再添加
- 桶中令牌足够时，**允许瞬间取走大量令牌**，即允许突发流量

这正好符合 **Warm Up（冷启动）** 的需求：系统刚启动时桶几乎为空，令牌生成速率较慢；随着时间推移，桶中令牌逐渐增多，可支撑的请求速率也随之上升。

**经典实现（单机）**

```java   
public class TokenBucket {
    private final int capacity;          // 桶容量
    private final double rate;           // 令牌生成速率（每秒多少个）
    private int tokens;                  // 当前令牌数
    private long lastRefillTimestamp;    // 上次填充时间
    
    public TokenBucket(int capacity, double rate) {
        this.capacity = capacity;
        this.rate = rate;
        this.tokens = capacity;
        this.lastRefillTimestamp = System.currentTimeMillis();
    }
    
    // 刷新令牌数（每次请求前调用）
    private void refill() {
        long now = System.currentTimeMillis();
        // 计算从 lastRefillTimestamp 到现在应生成的令牌数
        double tokensToAdd = (now - lastRefillTimestamp) * rate / 1000;
        if (tokensToAdd > 0) {
            tokens = Math.min(capacity, tokens + (int) tokensToAdd);
            lastRefillTimestamp = now;
        }
    }
    
    // 尝试获取令牌
    public synchronized boolean tryAcquire(int permits) {
        refill();
        if (tokens >= permits) {
            tokens -= permits;
            return true;
        }
        return false;  // 令牌不足，拒绝请求
    }
}
```



**关键点**：

- 生成令牌的时间点不是主动触发，而是 **延迟计算**（在请求到来时反算）
- 使用 `synchronized` 或 `AtomicLong` 保证线程安全

**Sentinel 的 WarmUpController（简化逻辑）**

Sentinel 的预热令牌桶加入了 **冷启动因子（coldFactor，默认3）**，使初始生成速率降低为 rate/3，然后逐渐爬升到 rate。

```java   
// Sentinel WarmUpController 简化原理  
protected boolean canPass(long currentTime, int acquireCount) {
    long passQps = (currentTime - lastFilledTime) * 1000; // 当前通过的 QPS
    long restToken = storedTokens.get();  // 当前剩余令牌数
    
    if (restToken >= acquireCount) {
        // 令牌足够，直接通过
        storedTokens.addAndGet(-acquireCount);
        return true;
    }
    // 令牌不足，需要计算当前能产生的令牌是否足够
    long newToken = computeNewToken(currentTime);
    return newToken >= acquireCount;
}
```



本质上还是基于令牌桶的延迟计算思想，但增加了动态生成速率的逻辑。

**集成Nacos配置中心使用动态配置**

这里如果项目的配置都要手动编写过于编码 因为Nacos可以实现持久化 这里可以配合Nacos对于配置进行存储

官方文档地址: https://sentinelguard.io/zh-cn/docs/dynamic-rule-configuration.html

添加Nacos集成依赖 如果使用的数据源是zookeeper 那就是sentinel-datasource-zookeeper 这里为nacos

```xml         
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-datasource-nacos</artifactId>
</dependency>
```



修改application.properties

```properties
# 设置Sentinel配置中心地址 ds1是key 这里可以设置多配置中心
spring.cloud.sentinel.datasource.ds1.nacos.server-addr=192.168.70.128:8848
spring.cloud.sentinel.datasource.ds1.nacos.namespace=c02c26a4-6c06-4cfc-bdc7-699daf537351
spring.cloud.sentinel.datasource.ds1.nacos.data-id=sentinel-conf
spring.cloud.sentinel.datasource.ds1.nacos.group-id=test
spring.cloud.sentinel.datasource.ds1.nacos.username=nacos
spring.cloud.sentinel.datasource.ds1.nacos.password=nacos
spring.cloud.sentinel.datasource.ds1.nacos.data-type=json
spring.cloud.sentinel.datasource.ds1.nacos.rule-type=flow
```



这样就可以使用配置中心的数据源了 需要注意的是**修改配置中心的数据源会同步修改Sentinel 而修改Sentinel配置不会同步到配置中心**

**熔断降级**

熔断是在对于服务正常限流之后  服务请求异常过多进行降级 也是保护服务的一种方式

官方文档: https://sentinelguard.io/zh-cn/docs/circuit-breaking.html

**支持3种熔断方式**

1. 慢调用比例 (SLOW_REQUEST_RATIO)：选择以慢调用比例作为阈值，需要设置允许的慢调用 RT（即最大的响应时间），请求的响应时间大于该值则统计为慢调用。当单位统计时长（statIntervalMs 默认1秒）内请求数目大于设置的最小请求数目，并且慢调用的比例大于阈值，则接下来的熔断时长内请求会自动被熔断。经过熔断时长后熔断器会进入探测恢复状态（HALF-OPEN 状态），若接下来的一个请求响应时间小于设置的慢调用 RT 则结束熔断，若大于设置的慢调用 RT 则会再次被熔断。
2. 异常比例 (ERROR_RATIO)：当单位统计时长（statIntervalMs 默认1秒）内请求数目大于设置的最小请求数目，并且异常的比例大于阈值，则接下来的熔断时长内请求会自动被熔断。经过熔断时长后熔断器会进入探测恢复状态（HALF-OPEN 状态），若接下来的一个请求成功完成（没有错误）则结束熔断，否则会再次被熔断。异常比率的阈值范围是 [0.0, 1.0]，代表 0% - 100%。
3. 异常数 (ERROR_COUNT)：当单位统计时长内的异常数目超过阈值之后会自动进行熔断。经过熔断时长后熔断器会进入探测恢复状态（HALF-OPEN 状态），若接下来的一个请求成功完成（没有错误）则结束熔断，否则会再次被熔断。

**配置与限流规则相同 可以都写在InitFunc实现下 或者配置中心中 示例如下:**

```java  
// 设置服务熔断
List<DegradeRule> degradeRuleList = new ArrayList<>();
DegradeRule degradeRule = new DegradeRule();
degradeRule.setResource("com.lishunxing.nacosdemo.service.TestService");// 指定需要监控熔断的接口路径
degradeRule.setGrade(RuleConstant.DEGRADE_GRADE_EXCEPTION_COUNT);// 设置策略为异常数
degradeRule.setCount(3);// 异常数
degradeRule.setTimeWindow(3);// 熔断时长 单位秒
degradeRule.setStatIntervalMs(1000);// 默认就是100毫秒
degradeRuleList.add(degradeRule);
DegradeRuleManager.loadRules(degradeRuleList);
```

