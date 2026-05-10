# ReentrantLock

`ReentrantLock`（可重入锁）原理与实现

## 简介

`ReentrantLock` 是Java java.util.concurrent.locks 包中提供的一个可重入的互斥锁，它实现了Lock接口，提供了比 `synchronized` 关键字更灵活的锁机制, 用于解决并发环境下的原子性, 可见性和有序性。

`ReentrantLock` 是 `synchronized` 的增强版，它在高并发场景下特别有用，但使用起来也更复杂，需要开发者特别注意在finally块中释放锁，避免造成死锁。在简单的同步需求下，优先使用 `synchronized` ；在需要高级锁功能时，选择 `ReentrantLock`。

> "可重入"的含义：同一个线程可以多次获取同一把锁而不会造成死锁。每次获取锁，锁的计数器加1；每次释放，计数器减1；当计数器为0时，锁被完全释放。

## 基本加锁与解锁

```java
public class ReentrantLockDemo {
    private final ReentrantLock lock = new ReentrantLock();
    private int count = 0;
    
    public void increment() {
        lock.lock();  // 获取锁
        try {
            count++;  // 临界区代码
        } finally {
            lock.unlock();  // 必须在finally中释放锁
        }
    }
}
```

#### 可重入特性

```java
public class ReentrantExample {
    private final ReentrantLock lock = new ReentrantLock();
    
    public void outerMethod() {
        lock.lock();
        try {
            System.out.println("外层方法获得锁");
            innerMethod();  // 同一个线程可以再次获取同一把锁
        } finally {
            lock.unlock();
        }
    }
    
    public void innerMethod() {
        lock.lock();  // 可重入：同一个线程再次获取锁
        try {
            System.out.println("内层方法也获得锁");
        } finally {
            lock.unlock();
        }
    }
}
```

#### 尝试获取锁（非阻塞）

```java
public class TryLockExample {
    private final ReentrantLock lock = new ReentrantLock();
    
    public boolean tryDoSomething() {
        // 尝试获取锁，立即返回，不阻塞
        if (lock.tryLock()) {
            try {
                // 成功获取锁，执行业务逻辑
                System.out.println("获得锁，执行任务");
                return true;
            } finally {
                lock.unlock();
            }
        } else {
            // 获取锁失败，执行其他逻辑
            System.out.println("锁被占用，执行备选方案");
            return false;
        }
    }
    
    // 带超时时间的尝试
    public boolean tryDoSomethingWithTimeout() throws InterruptedException {
        // 等待3秒，如果3秒内获取不到锁就放弃
        if (lock.tryLock(3, TimeUnit.SECONDS)) {
            try {
                // 执行任务
                return true;
            } finally {
                lock.unlock();
            }
        }
        return false;
    }
}
```

#### 可中断的锁获取 interrupt 可以和 sleep 一样抛出异常进行捕获处理

```java
// lock() - 不可中断
lock.lock();  // 如果拿不到锁，会一直阻塞，即使被中断也不会响应
try {
    // 业务逻辑
} finally {
    lock.unlock();
}

// lockInterruptibly() - 可中断
try {
    lock.lockInterruptibly();  // 等待锁的过程中可以被中断
    try {
        // 业务逻辑
    } finally {
        lock.unlock();
    }
} catch (InterruptedException e) {
    // 在等待锁的过程中被中断，进入这里
    // 可以做一些清理工作
    Thread.currentThread().interrupt();  // 恢复中断状态
}		
```

#### 实现逻辑

ReentrantLock的实现基于AQS (AbstractQueuedSynchronizer 抽象队列同步器)，整体架构如下：

```java
ReentrantLock
    └── Sync (抽象内部类，继承AQS)
        ├── NonfairSync (非公平锁)
        └── FairSync (公平锁)



// ReentrantLock核心结构
public class ReentrantLock implements Lock, java.io.Serializable {
    private final Sync sync;
    
    // 同步控制基础类
    abstract static class Sync extends AbstractQueuedSynchronizer {
        abstract void lock();
        // ...
    }
    
    // 非公平锁实现
    static final class NonfairSync extends Sync {
        final void lock() { /* ... */ }
    }
    
    // 公平锁实现
    static final class FairSync extends Sync {
        final void lock() { /* ... */ }
    }
}
```

### AQS 抽象队列同步器

AQS（AbstractQueuedSynchronizer，抽象队列同步器）是Java并发包（`java.util.concurrent`）的核心基础框架，它提供了一个用于实现阻塞锁和相关同步器的框架。

AQS的核心思想是：如果共享资源空闲，则当前线程可以获取资源；如果资源被占用，则进入一个CLH队列中等待。

AQS被设计为大多数同步器的基类，如：

*   `ReentrantLock`
*   `ReentrantReadWriteLock`
*   `Semaphore`
*   `CountDownLatch`
*   `CyclicBarrier`
*   `ThreadPoolExecutor`（内部使用）

AQS主要有2种模式

独占模式（Exclusive）同一时刻只能有一个线程获取同步状态，如`ReentrantLock`。需要重写如下方法:

```java
// 独占模式需要重写的方法
protected boolean tryAcquire(int arg)      // 尝试获取锁
protected boolean tryRelease(int arg)      // 尝试释放锁
protected boolean isHeldExclusively()      // 判断是否独占
```

共享模式（Shared）同一时刻可以有多个线程获取同步状态，如`Semaphore`、`CountDownLatch`。需要重写如下方法:

```java
// 共享模式需要重写的方法
protected int tryAcquireShared(int arg)    // 尝试获取锁（返回剩余资源数）
protected boolean tryReleaseShared(int arg) // 尝试释放锁
```

核心代码如下:

```java
public abstract class AbstractQueuedSynchronizer 
    extends AbstractOwnableSynchronizer {
    
    // 1. 同步状态（volatile保证可见性） 用于记录锁的重入次数
    private volatile int state;
    
    // 2. CLH队列的头节点
    private transient volatile Node head;
    
    // 3. CLH队列的尾节点
    private transient volatile Node tail;
    
    // 4. 当前持有锁的线程（继承自AbstractOwnableSynchronizer）
    private transient Thread exclusiveOwnerThread;
}

                    ┌─────────────────────────────────┐
                    │            AQS                  │
                    ├─────────────────────────────────┤
                    │  state (volatile int)           │
                    │  head (volatile Node)           │
                    │  tail (volatile Node)           │
                    │  exclusiveOwnerThread           │
                    └───────────┬─────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────────────┐
                    │         CLH Queue               │
                    ├─────────────────────────────────┤
                    │  ┌─────┐  ┌─────┐  ┌─────┐     │
                    │  │Node │─→│Node │─→│Node │     │
                    │  │(head)│←─│     │←─│(tail)│     │
                    │  └─────┘  └─────┘  └─────┘     │
                    └─────────────────────────────────┘
```

####  CLH队列

CLH 队列（Craig, Landin, and Hagersten queue）是一种 自旋锁（spin lock）队列算法，用于实现高性能、可扩展的 公平自旋锁，常用于多线程并发环境中，如 Java 的 java.util.concurrent.locks.AbstractQueuedSynchronizer（AQS）底层实现。

CLH 是一种 基于链表的自旋锁队列，每个线程在等待锁时，会自旋地等待它的前驱节点释放锁。其核心思想是：每个线程只监视前一个线程的状态，而不是竞争共享变量。

*   CLH 是 FIFO 队列，保证锁的先来先服务（公平性）。 
*   它是 非阻塞的：线程不会休眠或挂起，而是使用自旋等待, 通过CAS操作保证并发安全。 
*   自旋发生在本地变量上，有更好的缓存局部性，适合高并发环境。
*   虚拟双向链表：每个节点代表一个等待线程

#### AQS中的Node节点

```java
static final class Node {
    // 节点状态
    volatile int waitStatus;
    static final int CANCELLED =  1;  // 节点已取消
    static final int SIGNAL    = -1;  // 后继节点需要被唤醒
    static final int CONDITION = -2;  // 节点在条件队列中等待
    static final int PROPAGATE = -3;  // 共享模式下传播
    
    // 前驱节点
    volatile Node prev;
    
    // 后继节点
    volatile Node next;
    
    // 当前节点持有的线程
    volatile Thread thread;
    
    // 等待条件（用于Condition）
    Node nextWaiter;
    
    Node() {}  // 用于头节点
    
    Node(Thread thread, Node mode) {
        this.thread = thread;
        this.nextWaiter = mode;
    }
}
```

#### AQS在Reentry Lock中的应用

##### 锁的获取流程

```java
/*
lock() 获取锁的完整流程：

线程调用 lock()
    │
    ├─ 非公平锁：尝试CAS获取锁 (state 0→1)
    │   ├─ 成功 → 获得锁，设置独占线程
    │   └─ 失败 → 进入acquire流程
    │
    └─ 公平锁：直接进入acquire流程

acquire(1)
    │
    ├─ tryAcquire(1)  // ReentrantLock实现
    │   ├─ state == 0 且 (公平锁需检查队列)
    │   │   ├─ CAS获取锁成功 → 返回true
    │   │   └─ 失败 → 返回false
    │   └─ 当前线程已持有锁 → 重入，state++ → 返回true
    │
    └─ tryAcquire失败 → 进入队列
        │
        ├─ addWaiter() → 创建Node节点，加入CLH队列
        │
        └─ acquireQueued()
            │
            └─ 自旋
                ├─ 前驱是head且tryAcquire成功
                │   └─ setHead() → 当前节点成为head
                │       └─ 获得锁成功
                │
                └─ 否则 → shouldParkAfterFailedAcquire()
                    └─ parkAndCheckInterrupt() → 线程阻塞
*/

```

##### 公平锁代码实现

```java
// 公平锁的构造方法
public ReentrantLock(boolean fair) {
    sync = fair ? new FairSync() : new NonfairSync();
}	

// 步骤1：调用公平锁的lock方法
public void lock() {
    sync.acquire(1);  // sync是FairSync实例
}

// 步骤2：AQS的acquire模板方法
public final void acquire(int arg) {
    if (!tryAcquire(arg) &&           // 尝试获取锁
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))  // 获取不到则加入队列等待
        selfInterrupt();               // 自我中断
}
```

##### 尝试获取锁 tryAcquire()

```java
// 公平锁的tryAcquire实现
protected final boolean tryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();  // 获取当前锁状态
    
    if (c == 0) {  // 锁未被占用
        // 公平锁的核心：检查队列中是否有等待的线程
        if (!hasQueuedPredecessors() && 
            compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;  // 获取锁成功
        }
    }
    else if (current == getExclusiveOwnerThread()) {  // 重入
        int nextc = c + acquires;
        if (nextc < 0)
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;  // 重入成功
    }
    return false;  // 获取锁失败
}

// 检查队列中是否有等待线程
public final boolean hasQueuedPredecessors() {
    Node t = tail;  // 队列尾节点
    Node h = head;  // 队列头节点（哨兵节点）
    Node s;
    // 条件说明：
    // 1. h != t：队列不为空
    // 2. (s = h.next) == null：头节点的下一个节点为空（正在初始化）
    // 3. s.thread != Thread.currentThread()：下一个节点的线程不是当前线程
    return h != t &&
        ((s = h.next) == null || s.thread != Thread.currentThread());
}
```

获取锁失败, 加入等待队列 addWaiter()

```java
// 当tryAcquire失败时，将当前线程加入等待队列
private Node addWaiter(Node mode) {
    Node node = new Node(Thread.currentThread(), mode);
    Node pred = tail;
    
    // 快速尝试：如果队列不为空，直接CAS添加到尾部
    if (pred != null) {
        node.prev = pred;
        if (compareAndSetTail(pred, node)) {
            pred.next = node;
            return node;  // 快速入队成功
        }
    }
    
    // 快速失败则使用完整入队逻辑（初始化队列或处理竞争）
    enq(node);
    return node;
}

// 完整的入队逻辑（自旋+CAS）
private Node enq(final Node node) {
    for (;;) {
        Node t = tail;
        if (t == null) {
            // 队列未初始化，创建哨兵节点
            if (compareAndSetHead(new Node()))
                tail = head;
        } else {
            // 队列已存在，CAS添加到尾部
            node.prev = t;
            if (compareAndSetTail(t, node)) {
                t.next = node;
                return t;
            }
        }
    }
}
```

自旋获取锁 acquireQueued()

```java
// 在队列中自旋尝试获取锁
final boolean acquireQueued(final Node node, int arg) {
    boolean failed = true;
    try {
        boolean interrupted = false;
        for (;;) {  // 自旋
            final Node p = node.predecessor();  // 获取前驱节点
            
            // 关键：只有前驱是头节点时才能尝试获取锁
            if (p == head && tryAcquire(arg)) {
                setHead(node);  // 当前节点成为新的头节点
                p.next = null;  // 帮助GC
                failed = false;
                return interrupted;  // 返回中断状态
            }
            
            // 获取锁失败，判断是否应该阻塞
            if (shouldParkAfterFailedAcquire(p, node) &&
                parkAndCheckInterrupt())
                interrupted = true;  // 记录中断状态
        }
    } finally {
        if (failed)
            cancelAcquire(node);  // 取消获取锁
    }
}

// 设置当前节点为头节点（线程清空）
private void setHead(Node node) {
    head = node;
    node.thread = null;  // 头节点不关联线程
    node.prev = null;
}
```

##### shouldParkAfterFailedAcquire() - 判断是否需要阻塞

```java
// 检查是否应该阻塞当前线程
private static boolean shouldParkAfterFailedAcquire(Node pred, Node node) {
    int ws = pred.waitStatus;  // 前驱节点的等待状态
    
    if (ws == Node.SIGNAL)
        // 前驱节点状态为SIGNAL，表示它会唤醒后继节点
        // 当前节点可以安全阻塞
        return true;
    
    if (ws > 0) {
        // 前驱节点已取消，跳过这些节点
        do {
            node.prev = pred = pred.prev;
        } while (pred.waitStatus > 0);
        pred.next = node;
    } else {
        // 将前驱节点状态设置为SIGNAL
        // 确保前驱节点释放锁时会唤醒当前节点
        compareAndSetWaitStatus(pred, ws, Node.SIGNAL);
    }
    return false;  // 暂不阻塞，再次自旋
}

// 阻塞当前线程
private final boolean parkAndCheckInterrupt() {
    LockSupport.park(this);  // 线程阻塞在这里
    return Thread.interrupted();  // 返回中断状态并清除中断标记
}
```

##### 公平锁状态转换图

```code
初始状态：state = 0, queue = empty

【线程A调用lock()】
    │
    ├─ tryAcquire()
    │   ├─ state == 0
    │   ├─ hasQueuedPredecessors() → false (队列为空)
    │   ├─ CAS(0→1) 成功
    │   └─ 设置 exclusiveOwnerThread = A
    │
    └─ 获得锁成功

状态：state = 1, owner = A, queue = empty

【线程B调用lock()】
    │
    ├─ tryAcquire()
    │   ├─ state == 1 (被占用)
    │   ├─ owner != B
    │   └─ 返回 false (获取失败)
    │
    ├─ addWaiter()
    │   └─ 创建节点B，加入队列
    │
    └─ acquireQueued()
        ├─ 前驱是head吗？是
        ├─ tryAcquire() → 失败（A还持有锁）
        ├─ shouldParkAfterFailedAcquire()
        │   └─ 设置head.waitStatus = SIGNAL
        └─ parkAndCheckInterrupt() → 线程B阻塞

状态：state = 1, owner = A, queue = head(哨兵) → Node(B)

【线程C调用lock()】
    │
    ├─ tryAcquire() → 失败
    ├─ addWaiter() → 节点C加入队列尾部
    └─ acquireQueued()
        ├─ 前驱是B（不是head）→ 直接阻塞
        └─ parkAndCheckInterrupt() → 线程C阻塞

状态：state = 1, owner = A, queue = head → Node(B) → Node(C)

【线程A释放锁】
    │
    ├─ tryRelease()
    │   ├─ state = 0
    │   ├─ exclusiveOwnerThread = null
    │   └─ 返回 true
    │
    ├─ unparkSuccessor(head)
    │   └─ 唤醒head.next (线程B)
    │
    └─ 线程B被唤醒
        │
        ├─ acquireQueued() 自旋继续
        ├─ 前驱是head
        ├─ tryAcquire() → 成功
        │   ├─ state == 0
        │   ├─ hasQueuedPredecessors() → false? 
        │   │   └─ 注意：队列中有C，但检查的是当前线程B
        │   │       队列：head(B的节点) → Node(C)
        │   │       h != t 为true
        │   │       h.next != null 且 h.next.thread != B?
        │   │       此时h.next就是B的节点，线程匹配，返回false
        │   └─ CAS(0→1) 成功
        │
        ├─ setHead() → B成为新head
        └─ 获得锁

状态：state = 1, owner = B, queue = head(B节点) → Node(C)

【线程B释放锁】
    │
    ├─ tryRelease() → state = 0
    ├─ unparkSuccessor(head)
    │   └─ 唤醒head.next (线程C)
    │
    └─ 线程C获得锁
```

#### 非公平锁与公平锁关键代码对比

```java
// 非公平锁的tryAcquire
final boolean nonfairTryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        // 非公平：不检查队列，直接CAS尝试
        if (compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;
        }
    }
    else if (current == getExclusiveOwnerThread()) {
        int nextc = c + acquires;
        if (nextc < 0)
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;
    }
    return false;
}

// 公平锁的tryAcquire
protected final boolean tryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        // 公平：必须检查队列
        if (!hasQueuedPredecessors() && 
            compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;
        }
    }
    else if (current == getExclusiveOwnerThread()) {
        int nextc = c + acquires;
        if (nextc < 0)
            throw new Error("Maximum lock count exceeded");
        setState(nextc);
        return true;
    }
    return false;
}

// 非公平锁的lock方法
final void lock() {
    // 非公平：先尝试CAS插队
    if (compareAndSetState(0, 1))
        setExclusiveOwnerThread(Thread.currentThread());
    else
        acquire(1);
}

// 公平锁的lock方法
final void lock() {
    // 公平：直接进入acquire，不尝试插队
    acquire(1);
}
```

##### 锁的释放流程

```code
/*
unlock() 释放锁的完整流程：

unlock()
    │
    └─ release(1)
        │
        ├─ tryRelease(1)  // ReentrantLock实现
        │   ├─ state - 1
        │   ├─ 如果state == 0
        │   │   ├─ 设置独占线程为null
        │   │   └─ 返回true (完全释放)
        │   └─ 否则 → 返回false (还有重入)
        │
        └─ 如果tryRelease返回true
            │
            └─ unparkSuccessor(head)
                │
                └─ 唤醒head的后继节点
                    └─ 被唤醒的线程继续在acquireQueued中自旋
                        └─ 尝试获取锁
*/
```

调用 unlock()

```java
// ReentrantLock.unlock()
public void unlock() {
    sync.release(1);  // 调用AQS的release方法，参数1表示释放一次重入
}
```

调用AQS的释放锁方法

```java
// AbstractQueuedSynchronizer.release()
public final boolean release(int arg) {
    // 第一步：尝试释放锁（由ReentrantLock的Sync实现）
    if (tryRelease(arg)) {
        // 第二步：释放成功，唤醒后继线程
        Node h = head;
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h);  // 唤醒头节点的后继节点
        return true;
    }
    return false;
}
```

进行实际锁的释放 tryRelease()

```java
// ReentrantLock.Sync.tryRelease()
protected final boolean tryRelease(int releases) {
    // 计算释放后的state值
    int c = getState() - releases;
    
    // 检查当前线程是否持有锁
    if (Thread.currentThread() != getExclusiveOwnerThread())
        throw new IllegalMonitorStateException();
    
    boolean free = false;
    if (c == 0) {
        // 完全释放锁（没有重入了）
        free = true;
        setExclusiveOwnerThread(null);  // 清空锁持有线程
    }
    // 更新state（如果是重入，只减少计数，不清空owner）
    setState(c);
    return free;
}
```

唤醒队列中的下一个线程 unparkSuccessor()

```java
// AbstractQueuedSynchronizer.unparkSuccessor()
private void unparkSuccessor(Node node) {
    // node 通常是头节点（head）
    int ws = node.waitStatus;
    
    // 如果头节点状态小于0（SIGNAL或CONDITION等）
    if (ws < 0)
        // 将头节点状态设置为0，表示即将唤醒后继节点
        compareAndSetWaitStatus(node, ws, 0);
    
    // 获取头节点的后继节点
    Node s = node.next;
    
    // 如果后继节点为空或者已被取消
    if (s == null || s.waitStatus > 0) {
        s = null;
        // 从尾部向前查找第一个有效的节点
        // 为什么从尾部开始？因为next指针可能不可靠，但prev指针是可靠的
        for (Node t = tail; t != null && t != node; t = t.prev)
            if (t.waitStatus <= 0)  // 找到有效节点
                s = t;
    }
    
    // 如果找到有效节点，唤醒其线程
    if (s != null)
        LockSupport.unpark(s.thread);  // 唤醒线程
}
```

为什么 unparkSuccessor 要从尾部向前查找有效节点？

考虑以下场景：

1.  线程A持有锁
2.  线程B、C、D在队列中等待
3.  线程C被取消（waitStatus = CANCELLED）
4.  线程A释放锁，需要唤醒后继节点

队列结构： head (哨兵) → Node(B, SIGNAL) → Node(C, CANCELLED) → Node(D, SIGNAL) → tail

问题：如果只通过next指针向后查找：

*   head.next = Node(B)，有效
*   B.next = Node(C)，但C已取消
*   C.next = Node(D)，但C被取消后，它的next可能还没更新
*   可能无法正确找到Node(D)

解决方案：从尾部向前查找

*   tail = Node(D)
*   D.prev = Node(C)
*   C.prev = Node(B)
*   B.prev = head
*   找到第一个有效节点Node(D)

这种方式的优点：

1.  prev指针在节点取消时不会被修改（更可靠）
2.  保证能找到队列中最后一个有效节点
3.  避免遍历已取消的节点链

### synchronized vs ReentrantLock

| 维度           | synchronized                | ReentrantLock             |
| :------------- | :-------------------------- | :------------------------ |
| **锁实现**     | JVM层面，关键字             | JDK层面，类               |
| **锁获取方式** | 隐式（自动）                | 显式（lock/unlock）       |
| **锁释放**     | 自动释放（异常/代码块结束） | 必须手动在finally中释放   |
| **可重入性**   | ✅ 支持                      | ✅ 支持                    |
| **公平性**     | 非公平锁                    | 可选公平/非公平           |
| **锁中断**     | ❌ 不支持                    | ✅ lockInterruptibly()支持 |
| **超时获取**   | ❌ 不支持                    | ✅ tryLock(timeout)支持    |
| **尝试获取**   | ❌ 不支持                    | ✅ tryLock()支持           |
| **条件变量**   | 只有一个wait/notify         | 多个Condition             |
| **锁状态查询** | 有限                        | 丰富（isLocked等）        |
| **性能**       | 优化后差距缩小              | 高竞争下性能更好          |
| **编程复杂度** | 简单                        | 复杂，易出错              |

#### 选择原则

1.  默认使用 synchronized

    *   代码更简洁，不易出错
    *   JVM会自动优化
    *   满足大多数场景
2.  必须使用 ReentrantLock 的情况

    *   需要可中断的锁获取
    *   需要超时获取锁
    *   需要公平锁
    *   需要多个条件变量
    *   需要尝试获取锁（tryLock）
    *   需要锁状态监控
3.  性能考虑

    *   JDK 1.6+ 后，两者性能差距不大
    *   低竞争场景：synchronized 略优
    *   高竞争场景：ReentrantLock 略优
    *   优先考虑代码清晰度，而非微优化
4.  团队规范

    *   建立统一的同步机制规范
    *   复杂场景必须注释说明选择理由
    *   Code Review 重点关注锁的正确使用
    *   除非有明确需求，否则优先使用 synchronized。当需要 synchronized 无法提供的高级特性时，再选择 ReentrantLock，并确保正确的手动锁管理

```code
开始
  │
  ▼
是否需要高级特性？ ────NO──→ 使用 synchronized
  │ (中断/超时/公平/多条件)
  │
  YES
  │
  ▼
是否需要公平锁？ ────YES──→ 使用 ReentrantLock(true)
  │
  NO
  │
  ▼
是否需要可中断？ ────YES──→ 使用 lockInterruptibly()
  │
  NO
  │
  ▼
是否需要超时？ ────YES──→ 使用 tryLock(timeout)
  │
  NO
  │
  ▼
是否需要多条件？ ────YES──→ 使用多个 Condition
  │
  NO
  │
  ▼
高竞争场景？ ────YES──→ 使用 ReentrantLock(false)
  │
  NO
  │
  ▼
使用 synchronized (简单优先)
```