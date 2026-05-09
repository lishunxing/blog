# AOP 面向切面编程

## 简介

AOP（Aspect Oriented Programming，面向切面编程）的核心作用是将横切关注点（如日志、事务、安全等）从业务逻辑中分离出来，实现关注点分离和代码复用。

### 主要作用

- 减少代码重复：横切逻辑只需写一次
- 提高可维护性：业务代码更纯净，只关注核心逻辑
- 增强功能而不修改源码：通过动态代理织入增强代码

### 常见使用场景

| 场景 | 说明 |
| :--- | :--- |
| 事务管理 | 最经典的应用 |
| 日志记录 | 统一日志输出 |
| 权限控制 | 认证与授权 |
| 性能监控 | 方法耗时统计 |
| 缓存管理 | 缓存命中与更新 |
| 异常处理 | 统一异常捕获 |
| 参数校验与数据脱敏 | 参数验证与敏感数据处理 |

### 简单示例

```java
@Aspect
@Component
public class LogAspect {

    @Around("@annotation(com.example.LogMonitor)")
    public Object monitor(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        long cost = System.currentTimeMillis() - start;
        System.out.println(joinPoint.getSignature() + " 耗时: " + cost + "ms");
        return result;
    }
}
```

---

## 核心概念

| 名词 | 英文 | 作用 |
| :--- | :--- | :--- |
| **切面** | Aspect | 横切关注点的模块化 |
| **连接点** | Join Point | 可被增强的点 |
| **切点** | Pointcut | 匹配连接点的规则 |
| **通知** | Advice | 增强的具体动作 |
| **目标对象** | Target | 被增强的原始对象 |
| **代理对象** | Proxy | 增强后的代理对象 |
| **织入** | Weaving | 将通知应用到目标的过程 |

### 切面（Aspect）

定义：将横切关注点（如日志、事务）封装成的类，包含切点和通知。

```java
@Aspect  // 标记为切面
@Component
public class LogAspect {
    // 切点 + 通知
}
```

### 连接点（Join Point）

定义：程序执行过程中可以插入增强的点，如方法调用、构造器调用、异常抛出等。

> Spring AOP 中仅支持方法级别的连接点（AspectJ 支持更多）。

```java
// 以下每个方法都是潜在连接点
public void saveUser() { }    // ✅ 连接点
public void deleteUser() { }  // ✅ 连接点
private void helper() { }     // ❌ private 方法不是连接点
```

### 切点（Pointcut）

定义：通过表达式匹配一组连接点的规则，决定通知应用到哪些方法。

```java
@Pointcut("execution(* com.example.service.*.*(..))")
public void serviceLayer() { }  // 匹配 service 包下所有方法

@Before("serviceLayer()")  // 引用切点
public void logBefore() { }
```

#### 常见切点表达式

| 表达式 | 说明 | 示例 |
| :--- | :--- | :--- |
| execution | 匹配方法执行 | execution(* com..UserService.*(..)) |
| within | 匹配包或类 | within(com.example.service..*) |
| @annotation | 匹配有指定注解的方法 | @annotation(com.example.Log) |
| bean | 匹配 Spring Bean 名称 | bean(userService) |

### 通知（Advice）

定义：切点在特定连接点上执行的具体增强代码，有 5 种类型。

| 类型 | 注解 | 执行时机 |
| :--- | :--- | :--- |
| **前置通知** | @Before | 目标方法执行前 |
| **后置通知** | @AfterReturning | 目标方法正常返回后 |
| **异常通知** | @AfterThrowing | 目标方法抛出异常后 |
| **最终通知** | @After | 目标方法执行后（无论是否异常） |
| **环绕通知** | @Around | 包裹整个方法执行（最强大） |

```java
@Aspect
@Component
public class AdviceDemo {

    @Before("execution(* save*(..))")
    public void before() { System.out.println("1. 前置"); }

    @AfterReturning("execution(* save*(..))")
    public void afterReturning() { System.out.println("3. 后置（正常返回）"); }

    @AfterThrowing("execution(* save*(..))")
    public void afterThrowing() { System.out.println("异常通知"); }

    @After("execution(* save*(..))")
    public void after() { System.out.println("最终通知（finally）"); }

    @Around("execution(* save*(..))")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        System.out.println("环绕前");
        Object result = pjp.proceed();  // 调用目标方法
        System.out.println("环绕后");
        return result;
    }
}
```

### 织入（Weaving）

定义：将切面应用到目标对象，创建代理对象的过程。

| 织入时机 | 说明 |
| :--- | :--- |
| 编译期 | AspectJ 支持 |
| 类加载期 | AspectJ 支持 |
| **运行期** | Spring AOP 采用（通过动态代理） |

---

## 动态代理实现原理

Spring AOP 底层通过动态代理在运行时生成代理对象，将增强逻辑织入到目标方法调用中。

### 两种代理机制

| 机制 | 技术基础 | 适用条件 | 性能 |
| :--- | :--- | :--- | :--- |
| **JDK 动态代理** | Java 反射 Proxy | 目标类**实现了接口** | 较高（Java 8+ 优化后） |
| **CGLIB 动态代理** | 字节码生成（ASM） | 目标类**没有实现接口** | 略低（需生成子类） |

> Spring 默认策略：有接口 → 优先使用 JDK 动态代理；无接口 → 自动切换到 CGLIB

### JDK 动态代理

```java
// 目标接口
public interface UserService {
    void saveUser(String name);
}

// 目标实现类
public class UserServiceImpl implements UserService {
    public void saveUser(String name) {
        System.out.println("保存用户: " + name);
    }
}

// AOP 增强处理器
public class AopInvocationHandler implements InvocationHandler {
    private Object target;

    public AopInvocationHandler(Object target) {
        this.target = target;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 前置增强
        System.out.println("【Before】开启事务");

        // 调用目标方法（反射）
        Object result = method.invoke(target, args);

        // 后置增强
        System.out.println("【After】提交事务");
        return result;
    }
}

// 使用
UserService proxy = (UserService) Proxy.newProxyInstance(
    target.getClass().getClassLoader(),
    target.getClass().getInterfaces(),
    new AopInvocationHandler(target)
);
proxy.saveUser("张三");
```

> 局限性：只能代理接口方法，无法代理类中非接口方法

### CGLIB 动态代理

通过字节码技术动态生成目标类的子类，重写所有非 final 方法。

```java
// 目标类（无需接口）
public class UserService {
    public void saveUser(String name) {
        System.out.println("保存用户: " + name);
    }
}

// CGLIB 方法拦截器
public class AopMethodInterceptor implements MethodInterceptor {
    private Object target;

    @Override
    public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable {
        // 前置增强
        System.out.println("【Before】开启事务");

        // 调用父类方法（比反射快）
        Object result = proxy.invokeSuper(obj, args);

        // 后置增强
        System.out.println("【After】提交事务");
        return result;
    }
}

// 使用
Enhancer enhancer = new Enhancer();
enhancer.setSuperclass(UserService.class);
enhancer.setCallback(new AopMethodInterceptor(new UserService()));
UserService proxy = (UserService) enhancer.create();
```

> 限制：无法代理 final 类、final 方法和 private 方法

### Spring 如何选择代理方式

```java
public Object createProxy(Class<?> targetClass, ...) {
    if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
        return buildJdkProxy();  // 目标是接口
    }

    if (Boolean.TRUE.equals(proxyTargetClass) || !hasInterfaces(targetClass)) {
        return buildCglibProxy();  // 强制CGLIB 或 无接口
    }

    return buildJdkProxy();  // 有接口但未强制CGLIB
}
```

### 两种方式对比

| 对比维度 | JDK 动态代理 | CGLIB |
| :--- | :--- | :--- |
| **依赖** | JDK 自带，无需额外包 | 需要 cglib 或 Spring Core 包含 |
| **代理方式** | 实现接口 | 生成子类 |
| **目标要求** | 必须有接口 | 不能是 final 类 |
| **性能（方法调用）** | 反射调用，较慢 | 通过 FastClass 机制，较快 |
| **创建性能** | 较快 | 较慢（需生成字节码） |

### Spring Boot 2.x 后的变化

> 默认行为改变：Spring Boot 2.0 开始，默认使用 CGLIB 代理（proxyTargetClass=true）

---

## 切面优先级配置

当多个切面作用于同一个连接点时，需要通过优先级控制它们的执行顺序。

### @Order 注解（推荐）

```java
@Aspect
@Component
@Order(1)  // 数字越小，优先级越高
public class LogAspect { }

@Aspect
@Component
@Order(2)
public class TransactionAspect { }
```

### 实现 Ordered 接口

```java
@Aspect
@Component
public class SecurityAspect implements Ordered {

    @Override
    public int getOrder() {
        return 1;
    }
}
```

### 优先级与执行顺序

| 优先级数字 | 切面类型 | 说明 |
| :--- | :--- | :--- |
| 1-100 | 监控/性能 | 最先记录开始时间 |
| 101-200 | 安全/权限 | 权限检查越早越好 |
| 201-300 | 事务管理 | 在业务逻辑前开启 |
| 301-400 | 日志记录 | 日志相对宽松 |
| 401-500 | 缓存处理 | 最后检查缓存 |

### 执行顺序示意

```
进入方向（前置通知）          退出方向（后置通知）
    ↓                              ↑
A1.before ────────────────→ A1.after
    ↓                              ↑
A2.before ────────────────→ A2.after
    ↓                              ↑
    └────→ 目标方法执行 ←───────────┘
```
