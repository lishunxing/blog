# Thread Local

## 简介

ThreadLocal 核心目的是实现线程级别的变量隔离，让同一个变量在不同线程中拥有独立的副本，互不干扰。

## 主要方法

| 方法                    | 说明                  |
| :---------------------- | :-------------------- |
| `set(T value)`          | 为当前线程设置值      |
| `get()`                 | 获取当前线程的值      |
| `remove()`              | 移除当前线程的值      |
| `withInitial(Supplier)` | 设置初始值（Java 8+） |

```java
// 每个线程都有自己的变量副本
ThreadLocal<String> threadLocal = new ThreadLocal<>();
threadLocal.set("thread1-value");  // 仅当前线程可访问
String value = threadLocal.get();   // 获取当前线程的值

// JDK8+ 可以直接使用withInitial方法 初始化
private static ThreadLocal<SimpleDateFormat> dateFormat = ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));
```

## 典型应用

### Web 请求上下文：传递请求信息

在 Web 环境中，Controller、Service 层可能需要获取当前的 `HttpServletRequest`、`HttpSession` 或用户身份信息。`RequestContextHolder` 就是为此服务的。

*   解决问题：在非 Controller 层（如 Service 或工具类）方便地获取请求对象，而无需通过方法参数层层传递。
*   使用方式：通过 `RequestContextHolder` 的静态方法获取。

```java
// 在 Service 层获取当前请求的 Request 对象
ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
HttpServletRequest request = attributes.getRequest();
String token = request.getHeader("Authorization");
```

*   注意事项：`RequestContextHolder` 默认使用普通的 `ThreadLocal`，这会导致在 `@Async` 异步线程中无法获取到请求对象。此时需要通过配置将 `threadContextInheritable` 设置为 `true`，使其使用 `InheritableThreadLocal`，才能让子线程继承父线程的上下文。

### 事务管理：持有资源连接

这是 ThreadLocal 在 Spring 中最经典的应用。为了保证一个 `@Transactional` 注解的方法内部，所有数据库操作都在同一个连接（Connection）中完成，Spring 需要跨方法传递这个连接。

解决问题：避免将 Connection 作为参数在各层 DAO 方法间显式传递，解耦业务代码和事务代码。

实现原理：Spring 使用 TransactionSynchronizationManager 类，其内部通过 ThreadLocal 存储当前线程绑定的数据库连接（Connection）、事务信息等资源。

```java
// TransactionSynchronizationManager 核心源码逻辑示意
public abstract class TransactionSynchronizationManager {
// 使用 ThreadLocal 存储当前线程的数据库连接
private static final ThreadLocal<Map<Object, Object>> resources = new NamedThreadLocal<>("Transactional resources");

}

public static void bindResource(Object key, Object value) {
    Map<Object, Object> map = resources.get();
    // ... 将 Connection 绑定到当前线程
}

public static Object getResource(Object key) {
    Map<Object, Object> map = resources.get();
    // ... 获取当前线程绑定的 Connection
    return map.get(key);
}
```

### Mybatis PageHelper 自动分页查询

PageHelper 的核心设计思路很简单：用 ThreadLocal 暂存分页参数，用 MyBatis 拦截器在 SQL 执行前动态改写 SQL。二者配合，实现了“一行代码自动分页”的效果。

#### 第一步：设置分页参数——存入 ThreadLocal

当你调用 PageHelper.startPage(1, 10) 时，PageHelper 并没有立即去修改 SQL，而只是将分页参数（页码、每页条数等）封装成一个 Page 对象，并放进了当前线程的 ThreadLocal 变量中

```java
// PageHelper 源码核心逻辑（简化）
public static <E> Page<E> startPage(int pageNum, int pageSize) {
    Page<E> page = new Page<>(pageNum, pageSize);
    // 将 page 对象存入当前线程的 ThreadLocal 
    setLocalPage(page); // 此方法最终调用的是 PageMethod 的 setLocalPage
    return page;
}

// 实际存储的地方，是一个静态的 ThreadLocal 变量 在 PageMethod 中, PageHelper extend PageMethod 
protected static final ThreadLocal<Page> LOCAL_PAGE = new ThreadLocal<>();
```

*   线程隔离：`ThreadLocal` 确保了不同 HTTP 请求（通常由不同线程处理）的分页参数互不干扰。
*   解耦：分页参数不再需要通过方法参数层层传递，任何地方只要在同一个线程内，都能获取到这个分页信息。

#### 第二步：拦截并改写 SQL——取出 ThreadLocal

`PageHelper` 实现了 MyBatis 的 `Interceptor` 接口。在 MyBatis 执行 SQL 之前，它会拦截 `Executor.query()` 方法。

在拦截器中，它会做下面几件事：

1.  获取参数：通过 `PageHelper.getLocalPage()` 从当前线程的 `ThreadLocal` 中取出之前存放的 `Page` 对象。
2.  改写 SQL：如果取到了分页参数，就根据目标数据库的方言（如 MySQL），在原 SQL 语句后面动态拼接上 `LIMIT ... OFFSET ...` 这样的分页语句。
3.  执行 COUNT：在查询列表数据前，它还会自动执行一个 `COUNT` 查询，用于获取总记录数，并存放到 `Page` 对象中。

```java
// 在 PageHelperAutoConfiguration 中添加 分页拦截器
    @PostConstruct
    public void addPageInterceptor() {
        PageInterceptor interceptor = new PageInterceptor();
        Properties properties = new Properties();
        //先把一般方式配置的属性放进去
        properties.putAll(pageHelperProperties());
        //在把特殊配置放进去，由于close-conn 利用上面方式时，属性名就是 close-conn 而不是 closeConn，所以需要额外的一步
        properties.putAll(this.properties.getProperties());
        interceptor.setProperties(properties);
        for (SqlSessionFactory sqlSessionFactory : sqlSessionFactoryList) {
            sqlSessionFactory.getConfiguration().addInterceptor(interceptor);
        }
    }

// 在拦截器方法中调用 com.github.pagehelper.util.ExecutorUtil#pageQuery 进行分页查询
public Object processParameterObject(MappedStatement ms, Object parameterObject, BoundSql boundSql, CacheKey pageKey) {
   // 获取当前线程的Page处理参数
   Page page = getLocalPage();
   //如果只是 order by 就不必处理参数
   if (page.isOrderByOnly()) {
       return parameterObject;
   }
   ...
}
```

#### 第三步：执行查询与清理——移除 ThreadLocal

改写后的 SQL 被 MyBatis 拿去执行，返回的结果会被封装到 Page 对象中。至此，一次完整的分页查询就完成了。

但是，最重要的一步来了：清理。为了防止内存泄漏，尤其是在使用线程池（如 Tomcat 处理请求的线程）的场景下，PageHelper 在 finally 代码块中会自动调用 clearPage() 方法，移除 ThreadLocal 中的 Page 对象。

```java
    // com.github.pagehelper.PageInterceptor#intercept 的 finally 块中 会调用 com.github.pagehelper.Dialect#afterAll 方法
    public void afterAll() {
        //这个方法即使不分页也会被执行，所以要判断 null
        AbstractHelperDialect delegate = autoDialect.getDelegate();
        if (delegate != null) {
            delegate.afterAll();
            autoDialect.clearDelegate();
        }
        clearPage();
    }

    // 最终调用clearPage() 清楚当前线程的变量
    public static void clearPage() {
        LOCAL_PAGE.remove();
    }
```

#### 为什么 startPage 必须紧跟 Mapper 方法？

正确使用

```java
// 1. 存入 ThreadLocal
PageHelper.startPage(1, 10); 
// 2. 拦截器取出并消费参数，然后立即清理
List<User> users = userMapper.selectAll(); 
```

错误使用

```java
@Service
public class OrderService {
    public void process() {
        // 1. 设置分页
        PageHelper.startPage(1, 10); 
        
        // 2. 调用另一个方法，但该方法内部也调用了 startPage（或者内部有 Mapper 查询且触发了拦截器清理）
        helperMethod(); 
        
        // 3. 执行原计划的分页查询
        // 问题：此时 ThreadLocal 已经被 helperMethod 清空了，这个查询不会分页
        List<Order> orders = orderMapper.selectList(); 
    }
    
    private void helperMethod() {
        // 情况A：这里又调用了一次 startPage，覆盖了外层的参数
        // PageHelper.startPage(2, 5); 
        
        // 情况B：这里执行了一个分页查询，执行完毕后 PageHelper 自动清理了 ThreadLocal
        // userMapper.selectAll(); 
    }
}
```

##### 线程池复用导致的数据错乱

这是使用 Tomcat、Jetty 或自定义线程池时最容易出现的问题。

*   场景：Tomcat 处理请求使用线程池。请求 A 执行了 `startPage`，但查询执行完毕后，由于代码异常或疏忽，没有执行清理（正常情况 PageHelper 会自动清理，但若代码跳过了拦截器则可能残留）。请求 A 的线程被回收回线程池。随后请求 B 拿到了这个线程，没有调用 `startPage`，直接执行 Mapper。
*   后果：请求 B 莫名其妙地自动加上了分页，或者因为请求 A 的分页参数是 `Page` 对象，而请求 B 查询的是另一个表，导致类型转换或 SQL 报错。
*   原理：线程被复用，但 `ThreadLocal` 里还残留着上一个请求的数据。

# ThreadLocal 源码分析

## 核心结构

```java
// ThreadLocal 核心结构
public class ThreadLocal<T> {
    // 1. 每个 ThreadLocal 实例有一个唯一的 threadLocalHashCode
    private final int threadLocalHashCode = nextHashCode();
    
    // 2. 原子计数器，用于生成 hash code
    private static AtomicInteger nextHashCode = new AtomicInteger();
    
    // 3. 魔数：黄金分割数 * 2^32，用于散列
    private static final int HASH_INCREMENT = 0x61c88647;
    
    // 4. 核心方法：获取当前线程的 Map
    public T get() { ... }
    public void set(T value) { ... }
    public void remove() { ... }
    
    // 5. 内部类：ThreadLocalMap（真正的存储容器）
    static class ThreadLocalMap { ... }
}
```

## 数据存储在 Thread 中

关键设计：数据不是存在 ThreadLocal 里，而是存在当前线程 Thread 对象中。

```java
// Thread 类中的关键字段
public class Thread {
    // 每个线程都有自己的 ThreadLocalMap
    ThreadLocal.ThreadLocalMap threadLocals = null;
    
    // 可继承的 ThreadLocalMap（用于 InheritableThreadLocal）
    ThreadLocal.ThreadLocalMap inheritableThreadLocals = null;
}

// 结构图
线程1 (Thread)                   线程2 (Thread)
    │                                │
    └── threadLocals (Map)           └── threadLocals (Map)
         │                                │
         ├── Entry(key=TL1, value=A)      ├── Entry(key=TL1, value=C)
         └── Entry(key=TL2, value=B)      └── Entry(key=TL2, value=D)
```

## 核心方法源码分析

### set() 方法：存储数据

```java
public void set(T value) {
    // 1. 获取当前线程
    Thread t = Thread.currentThread();
    // 2. 获取当前线程的 ThreadLocalMap
    ThreadLocalMap map = getMap(t);
    // 3. 如果 map 存在，直接设置；否则创建
    if (map != null)
        map.set(this, value);  // this 就是 ThreadLocal 实例本身作为 key
    else
        createMap(t, value);
}

// 获取线程的 ThreadLocalMap
ThreadLocalMap getMap(Thread t) {
    return t.threadLocals;
}

// 创建新的 Map
void createMap(Thread t, T firstValue) {
    t.threadLocals = new ThreadLocalMap(this, firstValue);
}
```

### get() 方法：获取数据

```java
public T get() {
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    if (map != null) {
        // 以当前 ThreadLocal 实例为 key 查找 Entry
        ThreadLocalMap.Entry e = map.getEntry(this);
        if (e != null) {
            @SuppressWarnings("unchecked")
            T result = (T)e.value;
            return result;
        }
    }
    // 没有找到，设置初始值
    return setInitialValue();
}

private T setInitialValue() {
    // 调用 initialValue() 获取初始值（默认 null，可重写）
    T value = initialValue();
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    if (map != null)
        map.set(this, value);
    else
        createMap(t, value);
    return value;
}

// 可重写的方法
protected T initialValue() {
    return null;
}
```

### remove() 方法：清理数据

```java
public void remove() {
    ThreadLocalMap m = getMap(Thread.currentThread());
    if (m != null)
        m.remove(this);  // 从 Map 中删除当前 ThreadLocal 对应的 Entry
}
```

### ThreadLocalMap 源码分析

ThreadLocalMap 是一个自定义的哈希表，不使用 Java 的 HashMap，原因：

*   只需要处理 key 为 ThreadLocal 的场景
*   需要特殊的内存管理（弱引用）
*   性能优化

#### Entry 内部类：弱引用的关键

```java
static class ThreadLocalMap {
    // Entry 继承 WeakReference，key 是弱引用
    static class Entry extends WeakReference<ThreadLocal<?>> {
        Object value;  // value 是强引用
        
        Entry(ThreadLocal<?> k, Object v) {
            super(k);  // key 被包装成弱引用
            value = v;
        }
    }
    
    private Entry[] table;  // 数组实现，不是链表
    private int size;
    private int threshold;  // 扩容阈值
    
    // 常量：最大容量
    private static final int INITIAL_CAPACITY = 16;
}
```

关键点：

*   key（ThreadLocal）是弱引用：GC 时可以被回收
*   value 是强引用：key 被回收后，value 无法被访问，导致内存泄漏

#### set() 方法：线性探测解决哈希冲突

```java
private void set(ThreadLocal<?> key, Object value) {
    Entry[] tab = table;
    int len = tab.length;
    // 计算索引位置（使用黄金分割数散列）
    int i = key.threadLocalHashCode & (len-1);
    
    // 线性探测：从 i 开始，找到空位或相同 key
    for (Entry e = tab[i];
         e != null;
         e = tab[i = nextIndex(i, len)]) {
        ThreadLocal<?> k = e.get();
        
        if (k == key) {
            // 找到了相同的 key，替换 value
            e.value = value;
            return;
        }
        
        if (k == null) {
            // 发现过期的 Entry（key 已被 GC 回收）
            // 替换过期数据
            replaceStaleEntry(key, value, i);
            return;
        }
    }
    
    // 找到空位置，创建新 Entry
    tab[i] = new Entry(key, value);
    int sz = ++size;
    // 清理过期数据，如果没有清理且超过阈值，则扩容
    if (!cleanSomeSlots(i, sz) && sz >= threshold)
        rehash();
}
```

##### 关键点一：哈希冲突处理 - 线性探测

```java
// 开放地址法中的线性探测
private static int nextIndex(int i, int len) {
    return ((i + 1 < len) ? i + 1 : 0);  // 循环探测
}
```

特点：

*   使用线性探测而非链表（与 HashMap 不同）
*   探测到数组末尾时绕回开头（环形数组）
*   原因：Entry 数量有限，线性探测更节省空间

##### 关键点二：stale entry 的清理 replaceStaleEntry

发现k为null的数据 替换并且清理

```java
private void replaceStaleEntry(ThreadLocal<?> key, Object value, int staleSlot) {
    Entry[] tab = table;
    int len = tab.length;
    Entry e;
    
    // 向前查找为null的 stale entry 找到了就停止 记录位置
    int slotToExpunge = staleSlot;
    for (int i = prevIndex(staleSlot, len); (e = tab[i]) != null; i = prevIndex(i, len)) {
        if (e.get() == null)
            slotToExpunge = i;  // 记录更早的脏数据位置
    }
    
    // 向后查找相同的 key
    for (int i = nextIndex(staleSlot, len);(e = tab[i]) != null;i = nextIndex(i, len)) {
        ThreadLocal<?> k = e.get();
        
        if (k == key) {
            // 找到相同 key，交换并清理
            e.value = value;
            tab[i] = tab[staleSlot];
            tab[staleSlot] = e;
            
            if (slotToExpunge == staleSlot)
                slotToExpunge = i;
            cleanSomeSlots(expungeStaleEntry(slotToExpunge), len);
            return;
        }
        
        if (k == null && slotToExpunge == staleSlot)
            slotToExpunge = i;
    }
    
    // 没找到相同 key，直接放在 stale slot
    tab[staleSlot].value = null;
    tab[staleSlot] = new Entry(key, value);
    
    // 清理其他 stale entries
    if (slotToExpunge != staleSlot)
        cleanSomeSlots(expungeStaleEntry(slotToExpunge), len);
}

private static int prevIndex(int i, int len) {
    return ((i - 1 >= 0) ? i - 1 : len - 1);
}
```

关键设计：

*   遇到 stale entry（key=null）时，不是简单覆盖
*   会向前和向后查找，尽量复用和清理
*   体现了 ThreadLocalMap 的主动清理机制

#### getEntry() 方法：查找数据

```java
private Entry getEntry(ThreadLocal<?> key) {
    int i = key.threadLocalHashCode & (table.length - 1);
    Entry e = table[i];
    
    // 直接命中
    if (e != null && e.get() == key)
        return e;
    else
        // 未命中，继续线性探测查找
        return getEntryAfterMiss(key, i, e);
}

private Entry getEntryAfterMiss(ThreadLocal<?> key, int i, Entry e) {
    Entry[] tab = table;
    int len = tab.length;
    
    while (e != null) {
        ThreadLocal<?> k = e.get();
        if (k == key)
            return e;  // 找到了
        if (k == null)
            expungeStaleEntry(i);  // 清理过期 Entry
        else
            i = nextIndex(i, len);  // 继续线性探测
        e = tab[i];
    }
    return null;
}
```

#### 过期 Entry 清理机制（防止内存泄漏的核心）

```java
// 清理指定位置的过期 Entry，并重新整理后续元素
private int expungeStaleEntry(int staleSlot) {
    Entry[] tab = table;
    int len = tab.length;
    
    // 1. 清空过期位置
    tab[staleSlot].value = null;
    tab[staleSlot] = null;
    size--;
    
    // 2. 重新整理后续元素（Rehash 直到遇到 null）
    Entry e;
    int i;
    for (i = nextIndex(staleSlot, len);
         (e = tab[i]) != null;
         i = nextIndex(i, len)) {
        ThreadLocal<?> k = e.get();
        if (k == null) {
            // 发现另一个过期 Entry，也清掉
            e.value = null;
            tab[i] = null;
            size--;
        } else {
            // 有效 Entry，重新计算位置（可能往前移动）
            int h = k.threadLocalHashCode & (len - 1);
            if (h != i) {
                tab[i] = null;
                while (tab[h] != null)
                    h = nextIndex(h, len);
                tab[h] = e;
            }
        }
    }
    return i;
}
```

### ThreadLocal 内存泄露的原因

ThreadLocal 本身不会直接泄漏，但 ThreadLocalMap 里的 Entry 设计 + 线程复用，会导致 “key 是弱引用、value 是强引用”，从而出现：key 被回收了、value 还活着 → 内存泄漏。

```java
// 每个 Thread 内部有
ThreadLocalMap threadLocals;

// 它的 Entry 长这样
static class Entry extends WeakReference<ThreadLocal<?>> {
    Object value; // 强引用！
    Entry(ThreadLocal<?> k, Object v) {
        super(k);
        value = v;
    }
}
```

*   key（ThreadLocal 对象）是弱引用：当外部对 ThreadLocal 的强引用被清除后，GC 时 key 会被回收，变成 `null`
*   value 是强引用：即使 key 被回收，value 仍然存在，被 Entry 持有

```code
1. 线程存活（如线程池中的核心线程）
   └── Thread → ThreadLocalMap → Entry[key=null, value=对象]
                                    ↑
                                 强引用，无法回收

2. 外部不再使用 ThreadLocal，但线程一直运行
   → 无法访问到 value，但 value 被 Entry 强引用
   → 内存泄漏！
```

#### 泄露场景代码

```java
// 线程池中的线程复用
public class ThreadLocalLeak {
    private static final ExecutorService executor = Executors.newFixedThreadPool(10);
    
    public void leak() {
        executor.submit(() -> {
            ThreadLocal<byte[]> threadLocal = new ThreadLocal<>();
            threadLocal.set(new byte[1024 * 1024]); // 1MB 数据
            // 方法结束，threadLocal 局部变量被回收（key 弱引用被清除）
            // 但线程池线程继续存在，Entry 中 value 未被清理
        });
    }
}
```

#### 为什么 value 是强引用

```java
// 假设 value 是弱引用
Object value = new Object();
threadLocal.set(value);
// 如果 value 只有这里的引用，GC 时会立即回收，程序无法正常工作
```

#### 为什么key是弱引用

```java
// 如果 key 是强引用
ThreadLocal<String> local = new ThreadLocal<>();
local.set("value");
local = null;  // 外部引用清除
// 但 Entry 中 key 仍是强引用，ThreadLocal 对象无法被回收
// 导致整个 Entry 都无法清理
```

#### 解决方案

##### 方法一：显式调用 remove()

```java
try {
    threadLocal.set(value);
    // 业务逻辑
} finally {
    threadLocal.remove();  // 关键：必须清理
}
```

##### 方法二：使用 try-with-resources 封装

```java
public class SafeThreadLocal<T> implements AutoCloseable {
    private ThreadLocal<T> threadLocal = new ThreadLocal<>();
    
    public void set(T value) {
        threadLocal.set(value);
    }
    
    @Override
    public void close() {
        threadLocal.remove();
    }
}

// 使用
try (SafeThreadLocal<String> safe = new SafeThreadLocal<>()) {
    safe.set("value");
    // 自动清理
}
```

ThreadLocal 用完即删，不删等线程结束，线程池里永不结束，内存泄漏在所难免。

## 清理时机

清理的核心原则：

1.  懒惰清理：平时不主动清理，只在访问时清理遇到的 stale entry
2.  启发式清理：使用对数扫描，平衡性能和内存
3.  批量清理：扩容时进行全量清理，为扩容做准备
4.  主动清理：remove() 时立即清理，防止内存泄漏

为什么这样设计：

*   性能优先：避免频繁的全表扫描
*   内存可控：通过多次局部清理，防止 stale entry 大量堆积
*   时机合理：在关键操作（扩容）时彻底清理，保证数据结构健康

最佳实践：

*   不要依赖 ThreadLocalMap 的自动清理
*   使用 `try-finally` 确保调用 `remove()`
*   在线程池环境中尤其要注意清理