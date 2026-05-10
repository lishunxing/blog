# HashMap

HashMap 是基于哈希表实现的 Map 接口的类，用于存储键值对（Key-Value）。它允许使用 null 作为键和值，并且不保证元素的顺序。

## 数据结构

*   Java 8 之前：数组 + 链表
*   Java 8 及之后：数组 + 链表 + 红黑树, 当链表长度超过阈值（默认 8）且数组长度 ≥ 64 时，链表转换为红黑树，提升查询效率从 O(n) 到 O(log n)

## 基础使用

```java
// 基本使用示例
HashMap<String, Integer> map = new HashMap<>();
map.put("苹果", 5);      // 添加元素
map.put("香蕉", 3);
map.put("橙子", 7);

int count = map.get("苹果");  // 获取值: 5
map.remove("香蕉");           // 删除元素

// 遍历
for (Map.Entry<String, Integer> entry : map.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue());
}
```

## 工作原理

1.  存储过程（put）：

    *   计算 key 的 `hashCode()`
    *   通过哈希算法确定在数组中的位置（索引）
    *   如果该位置为空，直接存储
    *   如果已有元素（哈希冲突），通过 `equals()` 比较 key

        *   相同则覆盖
        *   不同则添加到链表/红黑树中
2.  扩容机制：

    *   默认初始容量：16
    *   默认负载因子：0.75
    *   当元素数量 > 容量 × 负载因子时，容量翻倍（rehashing）

## 源码分析

1.  延迟初始化：数组在第一次 put 时才创建，节省内存
2.  容量是 2 的幂：通过 `tableSizeFor()` 保证，便于哈希计算和位运算
3.  threshold 的双重含义：

    *   初始化时：暂存初始容量（待创建数组用）
    *   初始化后：表示扩容阈值（capacity \* loadFactor）
4.  负载因子默认 0.75：时间和空间效率的平衡点
5.  容量上限：最大为 2^30，超过则使用 `Integer.MAX_VALUE` 作为阈值

```java
创建 HashMap 对象
    ↓
调用构造方法
    ↓
    ├─→ 无参构造：设置 loadFactor=0.75，threshold=0，table 为 null
    │
    ├─→ 有参构造：计算 threshold = tableSizeFor(initialCapacity)
    │
    └─→ 传入 Map：设置 loadFactor=0.75，调用 putMapEntries()
    
第一次 put()
    ↓
调用 putVal()
    ↓
判断 table 是否为 null 或长度为 0
    ↓
调用 resize()
    ↓
    ├─→ 无参构造：newCap=16, newThr=12，创建 Node[16]
    │
    ├─→ 有参构造：newCap=threshold，newThr=计算得出，创建 Node[capacity]
    │
    └─→ 传入 Map：可能一次性扩容到合适大小

// 1. 无参构造
public HashMap() {
    this.loadFactor = DEFAULT_LOAD_FACTOR; // 0.75f
}

// 2. 指定初始容量
public HashMap(int initialCapacity) {
    this(initialCapacity, DEFAULT_LOAD_FACTOR);
}

// 3. 指定初始容量和负载因子
public HashMap(int initialCapacity, float loadFactor) {
    if (initialCapacity < 0)
        throw new IllegalArgumentException("Illegal initial capacity: " + initialCapacity);
    if (initialCapacity > MAXIMUM_CAPACITY)
        initialCapacity = MAXIMUM_CAPACITY;
    if (loadFactor <= 0 || Float.isNaN(loadFactor))
        throw new IllegalArgumentException("Illegal load factor: " + loadFactor);
    this.loadFactor = loadFactor;
    this.threshold = tableSizeFor(initialCapacity);
}

// 4. 传入 Map 集合
public HashMap(Map<? extends K, ? extends V> m) {
    this.loadFactor = DEFAULT_LOAD_FACTOR;
    putMapEntries(m, false);
}
```

### 核心方法：tableSizeFor()

这是初始化中最关键的方法，用于将指定容量转换为 2 的幂次方：

```java
static final int tableSizeFor(int cap) {
    int n = cap - 1;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    return (n < 0) ? 1 : (n >= MAXIMUM_CAPACITY) ? MAXIMUM_CAPACITY : n + 1;
}

// 以 cap = 10 为例
int n = cap - 1;        // n = 9 (二进制 1001)
n |= n >>> 1;           // 1001 | 0100 = 1101 (13)
n |= n >>> 2;           // 1101 | 0011 = 1111 (15)
n |= n >>> 4;           // 1111 | 0000 = 1111 (15)
n |= n >>> 8;           // 1111 | 0000 = 1111 (15)
n |= n >>> 16;          // 1111 | 0000 = 1111 (15)
return n + 1;           // 15 + 1 = 16	
```

通过不断右移并或运算，将 n 的二进制低位全部变为 1，最后 +1 得到 2 的幂次方。

*   cap = 10 → 返回 16
*   cap = 17 → 返回 32
*   cap = 16 → 返回 16

#### 2 的幂次方的核心优势

*   位运算替代取模 hash & (n-1) 替代 hash % n  

    *   位运算（&）是 CPU 直接支持的指令，耗时约 1 个时钟周期
    *   取模运算（%）需要除法指令，耗时约 20-30 个时钟周期
    *   性能提升20-30倍
*   均匀分布 所有数组位置都能被使用 基于上面的位运算 减少冲突 50%+
*   扩容优化 只需检查一个 bit 位 因为每次扩容都是 \* 2  HashMap 利用容量是 2 的幂这一特性，发现了更巧妙的规律

    *   当容量从 2^n 扩容到 2^(n+1) 时：元素要么留在原位置, 要么移动到"原位置 + 旧容量"
    *   关键代码：(e.hash & oldCap) == 0  如果为0保留原位  为1就+新容量即可

```java
public class ResizeOptimizationDemo {
    public static void main(String[] args) {
        int oldCap = 16;  // 旧容量 10000 (二进制)
        int newCap = 32;  // 新容量 100000
        
        System.out.println("===== 扩容优化演示 =====\n");
        
        // 模拟不同的 hash 值
        int[] hashValues = {5, 21, 37, 53, 69};
        
        for (int hash : hashValues) {
            // 旧索引
            int oldIndex = hash & (oldCap - 1);
            
            // 新索引（传统方式）
            int newIndexTraditional = hash & (newCap - 1);
            
            // 判断新增位（第5位）是0还是1
            int newBit = (hash & oldCap) == 0 ? 0 : 1;
            
            // 新索引（优化方式）
            int newIndexOptimized = newBit == 0 ? oldIndex : oldIndex + oldCap;
            
            System.out.printf("hash值: %3d (%s)%n", hash, 
                String.format("%8s", Integer.toBinaryString(hash)).replace(' ', '0'));
            System.out.printf("  二进制: 第5位=%d, 低4位=%s%n", 
                (hash >> 4) & 1,
                String.format("%4s", Integer.toBinaryString(hash & 15)).replace(' ', '0'));
            System.out.printf("  旧索引: %2d (hash & 15)%n", oldIndex);
            System.out.printf("  新索引: %2d (优化计算: %s)%n", 
                newIndexOptimized,
                newBit == 0 ? "原位置" : "原位置 + 16");
            System.out.printf("  传统计算: %2d (hash & 31)%n%n", newIndexTraditional);
        }
    }
}

// 传统方式：需要计算所有位
hash & 31  // 需要处理5个位
// 例如: 10101 & 11111
// 计算每个位: 
// 位4: 1 & 1 = 1
// 位3: 0 & 1 = 0
// 位2: 1 & 1 = 1
// 位1: 0 & 1 = 0
// 位0: 1 & 1 = 1
// 需要5次位运算

// 优化方式：只需要计算1位
hash & 16  // 只需要处理1个位
// 例如: 10101 & 10000
// 只需要计算第4位:
// 位4: 1 & 1 = 1
// 其他位直接为0（因为oldCap其他位都是0）

===== 扩容优化演示 =====

hash值:   5 (00000101)
  二进制: 第5位=0, 低4位=0101
  旧索引:  5 (hash & 15)
  新索引:  5 (优化计算: 原位置)
  传统计算:  5

hash值:  21 (00010101)
  二进制: 第5位=1, 低4位=0101
  旧索引:  5 (hash & 15)
  新索引: 21 (优化计算: 原位置 + 16)
  传统计算: 21

hash值:  37 (00100101)
  二进制: 第5位=0, 低4位=0101
  旧索引:  5 (hash & 15)
  新索引:  5 (优化计算: 原位置)
  传统计算:  5

hash值:  53 (00110101)
  二进制: 第5位=1, 低4位=0101
  旧索引:  5 (hash & 15)
  新索引: 21 (优化计算: 原位置 + 16)
  传统计算: 21

hash值:  69 (01000101)
  二进制: 第5位=0, 低4位=0101
  旧索引:  5 (hash & 15)
  新索引:  5 (优化计算: 原位置)
  传统计算:  5
```

*   哈希碰撞减少 用空间换时间：虽然会浪费一些内存（容量总是2的幂，可能略大于实际需要）但换来了极致的性能：位运算、快速扩容、均匀分布

### 关键源码解析

```java
// 成员变量
transient Node<K,V>[] table;  // 存储元素的数组

// 计算哈希值（扰动函数）
static final int hash(Object key) {
    int h;
    // 如果 key 为 null，返回 0（允许 null 键）
    // 否则：hashCode 的高16位与低16位异或，混合高位和低位
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

// 添加元素
public V put(K key, V value) {
    return putVal(hash(key), key, value, false, true);
}

// 实际添加元素的方法
final V putVal(int hash, K key, V value, boolean onlyIfAbsent, boolean evict) {
    Node<K,V>[] tab;      // 当前哈希表
    Node<K,V> p;          // 目标位置的节点
    int n, i;             // n: 数组长度, i: 计算出的索引
    
    // 步骤1: 如果 table 为空或长度为0，进行扩容（初始化）
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;
    
    // 步骤2: 计算索引 i = (n - 1) & hash
    // 这是整个 HashMap 性能的关键点！
    if ((p = tab[i = (n - 1) & hash]) == null) {
        // 如果该位置没有元素，直接插入
        tab[i] = newNode(hash, key, value, null);
    } else {
        // 如果有元素，处理哈希冲突
        Node<K,V> e;
        K k;
        
        // 检查第一个节点是否匹配
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;
        // 如果是红黑树节点
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        // 如果是链表节点
        else {
            for (int binCount = 0; ; ++binCount) {
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    // 链表长度超过阈值，转为红黑树
                    if (binCount >= TREEIFY_THRESHOLD - 1)
                        treeifyBin(tab, hash);
                    break;
                }
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }
        
        // 如果找到存在的key，替换值
        if (e != null) {
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            afterNodeAccess(e);
            return oldValue;
        }
    }
    
    // 修改计数
    ++modCount;
    // 检查是否需要扩容
    if (++size > threshold)
        resize();
    afterNodeInsertion(evict);
    return null;
}

// 获取元素
public V get(Object key) {
    Node<K,V> e;
    // 计算哈希值，然后调用 getNode
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}

// 实际获取元素的方法
final Node<K,V> getNode(int hash, Object key) {
    Node<K,V>[] tab;
    Node<K,V> first, e;
    int n;
    K k;
    
    if ((tab = table) != null && (n = tab.length) > 0 &&
        // ⭐ 同样使用 (n - 1) & hash 计算索引
        (first = tab[(n - 1) & hash]) != null) {
        
        // 检查第一个节点
        if (first.hash == hash &&
            ((k = first.key) == key || (key != null && key.equals(k))))
            return first;
        
        // 继续查找后续节点
        if ((e = first.next) != null) {
            // 红黑树查找
            if (first instanceof TreeNode)
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);
            // 链表查找
            do {
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null);
        }
    }
    return null;
}
```

### 扰动函数

```java
// 计算哈希值（扰动函数）
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

// 计算数组索引
index = (table.length - 1) & hash(key)
```

关键限制：数组长度通常远小于 2^32（哈希值的范围）, 所以这里通过让hashCode 右移 16位让高位也参与运算

如果直接使用原始 hashCode，由于 (capacity - 1) 的二进制位有限，只有 hashCode 的低位参与索引计算，高位完全被忽略。

```java
// 假设 HashMap 容量为 16（默认初始容量）
int capacity = 16;
int indexMask = capacity - 1;  // 15 (二进制: 0000 1111)

// 两个不同的 hashCode
int hash1 = 0b0000_0000_0000_0000_0000_0000_0000_1010;  // 10
int hash2 = 0b0000_0000_0000_0000_0001_0000_0000_1010;  // 65546

// 计算索引
index1 = hash1 & 15 = 10
index2 = hash2 & 15 = 10  // 冲突！高位不同但低位相同

// 以 "你好" 为例
int hashCode = 652743;  // 二进制：0000 0000 0000 1001 1111 0110 0100 0111

// 右移16位
int highBits = hashCode >>> 16;  // 0000 0000 0000 0000 0000 0000 0000 1001 = 9

// 异或运算：高位与低位结合
int finalHash = hashCode ^ highBits;  // 652743 ^ 9 = 652734

// 原始低位: 0100 0111 (71)
// 最终低位: 0100 1110 (78)  // 被高位影响，改变了！
```

扰动函数让高位参与运算的核心原因：

1.  充分利用 hashCode：避免高位信息浪费
2.  减少哈希冲突：让索引分布更均匀
3.  提高性能：尤其在容量较小时效果显著
4.  简单高效：一次异或 + 一次右移，开销极小
5.  不使用扰动函数的后果

    *   哈希碰撞激增	多个 key 映射到同一位置&#x9;
    *   时间复杂度退化	O(1) → O(n)	在极端情况下低位都相同的数据会存储在一个node上
    *   Hash DoS 攻击风险	恶意构造 key 拖垮服务&#x9;
    *   内存浪费	链表/红黑树节点额外开销
    *    扩容开销增加	频繁 rehash&#x9;
    *    缓存命中率下降	数据不连续存储&#x9;

### 延迟初始化（Lazy Initialization）

HashMap 在构造时不会立即创建数组 Node\<K,V>\[] table，而是在第一次 put() 时通过 resize() 方法创建。

```java
// 无参构造后，table 为 null
HashMap<String, String> map = new HashMap<>();  // table = null, threshold = 0

// 第一次 put 时才会初始化
map.put("key", "value");  // 触发 resize()
```

### 扩容方法：resize()

resize() 既是初始化方法也是扩容方法：

```java
final Node<K,V>[] resize() {
    Node<K,V>[] oldTab = table;
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    int oldThr = threshold;
    int newCap, newThr = 0;
    
    if (oldCap > 0) {
        // 原有容量大于 0，说明是扩容
        if (oldCap >= MAXIMUM_CAPACITY) {
            threshold = Integer.MAX_VALUE;
            return oldTab;
        }
        else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY &&
                 oldCap >= DEFAULT_INITIAL_CAPACITY)
            newThr = oldThr << 1; // 新阈值为旧阈值的两倍
    }
    else if (oldThr > 0) {
        // 初始容量被设置（使用了带参构造）
        newCap = oldThr;
    }
    else {
        // 无参构造，使用默认值
        newCap = DEFAULT_INITIAL_CAPACITY;  // 16
        newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY); // 12
    }
    
    if (newThr == 0) {
        float ft = (float)newCap * loadFactor;
        newThr = (newCap < MAXIMUM_CAPACITY && ft < (float)MAXIMUM_CAPACITY ?
                  (int)ft : Integer.MAX_VALUE);
    }
    threshold = newThr;
    
    // 创建新数组
    @SuppressWarnings({"rawtypes","unchecked"})
    Node<K,V>[] newTab = (Node<K,V>[])new Node[newCap];
    table = newTab;
    
    // 如果是扩容，需要将旧数组元素迁移到新数组
    if (oldTab != null) {
        // ... 元素迁移逻辑
    }
    return newTab;
}

创建 HashMap 对象
    ↓
调用构造方法
    ↓
    ├─→ 无参构造：设置 loadFactor=0.75，threshold=0，table 为 null
    │
    ├─→ 有参构造：计算 threshold = tableSizeFor(initialCapacity)
    │
    └─→ 传入 Map：设置 loadFactor=0.75，调用 putMapEntries()
    
第一次 put()
    ↓
调用 putVal()
    ↓
判断 table 是否为 null 或长度为 0
    ↓
调用 resize()
    ↓
    ├─→ 无参构造：newCap=16, newThr=12，创建 Node[16]
    │
    ├─→ 有参构造：newCap=threshold，newThr=计算得出，创建 Node[capacity]
    │
    └─→ 传入 Map：可能一次性扩容到合适大小
```

## HashMap解决冲突的方法

HashMap 使用链地址法（Separate Chaining）来解决哈希冲突，并在 JDK 1.8 中引入了红黑树进行优化。

> JDK 1.7 及之前：数组 + 链表 JDK 1.8 及之后：数组 + 链表 + 红黑树

### 链地址法（拉链法）

当多个 key 映射到同一个数组索引时，将这些元素以链表形式存储。

```java
public class ChainingDemo {
    public static void main(String[] args) {
        HashMap<String, String> map = new HashMap<>();
        
        // 假设这些 key 都映射到同一个索引
        map.put("Aa", "value1");    // hashCode: 2112
        map.put("BB", "value2");    // hashCode: 2112
        map.put("Cc", "value3");    // hashCode: 2112
        
        // 在同一个桶中形成链表
        // table[index] -> Node("Aa") -> Node("BB") -> Node("Cc")
        
        // 查找过程：
        // 1. 计算索引
        // 2. 遍历链表，使用 equals() 比较 key
        // 3. 找到匹配的返回
    }
}

数组索引    链表
[0]        null
[1]        null
[2]        Node("Aa") → Node("BB") → Node("Cc") → null
[3]        null
...
```

### 红黑树优化（JDK 1.8+）

当链表长度过长时，转换为红黑树，提高查询效率。

```java
// HashMap 中的树化阈值
static final int TREEIFY_THRESHOLD = 8;      // 链表转红黑树的阈值
static final int UNTREEIFY_THRESHOLD = 6;    // 红黑树转链表的阈值
static final int MIN_TREEIFY_CAPACITY = 64;  // 最小树化容量

final V putVal(int hash, K key, V value, boolean onlyIfAbsent, boolean evict) {
    // ... 省略部分代码
    
    for (int binCount = 0; ; ++binCount) {
        if ((e = p.next) == null) {
            p.next = newNode(hash, key, value, null);
            
            // 关键：链表长度达到阈值，转换为红黑树
            if (binCount >= TREEIFY_THRESHOLD - 1)  // -1 for 1st
                treeifyBin(tab, hash);
            break;
        }
        // ...
    }
}
```

### 树化与反树化机制

```java
final void treeifyBin(Node<K,V>[] tab, int hash) {
    int n, index;
    Node<K,V> e;
    
    // 条件1: 数组为空或长度小于最小树化容量
    if (tab == null || (n = tab.length) < MIN_TREEIFY_CAPACITY)
        resize();  // 优先扩容，而不是树化
    // 条件2: 链表长度 >= TREEIFY_THRESHOLD (8)
    else if ((e = tab[index = (n - 1) & hash]) != null) {
        // 转换为红黑树
        TreeNode<K,V> hd = null, tl = null;
        do {
            TreeNode<K,V> p = replacementTreeNode(e, null);
            if (tl == null)
                hd = p;
            else {
                p.prev = tl;
                tl.next = p;
            }
            tl = p;
        } while ((e = e.next) != null);
        
        if ((tab[index] = hd) != null)
            hd.treeify(tab);  // 构建红黑树
    }
}
```

树化条件总结：

*   链表长度 ≥ 8
*   数组长度 ≥ 64
*   如果数组长度 < 64，优先扩容（扩容后元素重新分布，可能不再冲突）

### 反树化条件

```java
// 在 remove 或 resize 时，如果红黑树节点过少，会转换回链表
final void untreeify(HashMap<K,V> map) {
    Node<K,V> hd = null, tl = null;
    for (Node<K,V> q = this; q != null; q = q.next) {
        Node<K,V> p = map.replacementNode(q, null);
        if (tl == null)
            hd = p;
        else
            tl.next = p;
        tl = p;
    }
    // 当红黑树节点数 <= UNTREEIFY_THRESHOLD (6) 时，转换为链表
}
```

### 红黑树

红黑树（Red-Black Tree）是一种自平衡的二叉查找树，它在每个节点上增加一个存储位表示节点的颜色（红或黑），通过对任何一条从根到叶子的路径上节点颜色的约束，确保树的高度始终保持在 O(log n)。他比avl树的修改操作要快一些, 查询性能慢一些, 因为avl树旋转次数要多一些

```java
// HashMap 中的红黑树相关常量
static final int TREEIFY_THRESHOLD = 8;      // 链表转红黑树的阈值
static final int UNTREEIFY_THRESHOLD = 6;    // 红黑树转链表的阈值
static final int MIN_TREEIFY_CAPACITY = 64;  // 最小树化容量

/**
 * 为什么选择这些值？
 * 
 * 1. TREEIFY_THRESHOLD = 8：
 *    - 根据泊松分布，链表长度达到8的概率极低（0.00000006） 正常使用中几乎不可能发生链表转红黑树的情况
 *    - 8是时间和空间的平衡点
 * 
 * 2. UNTREEIFY_THRESHOLD = 6：
 *    - 避免频繁的树化和反树化（阈值差为2）
 *    - 如果长度在6-8之间波动，不会频繁转换
 * 
 * 3. MIN_TREEIFY_CAPACITY = 64：
 *    - 数组较小时，优先扩容而不是树化
 *    - 扩容后元素重新分布，可能解决冲突
 */
```

# Map选择指南

```java
public class MapSelectionGuide {
    public static void main(String[] args) {
        System.out.println("=== Map 选择指南 ===\n");
        
        // 场景1：只需要快速存取，不需要顺序
        System.out.println("1. 快速存取，不需要顺序 → HashMap");
        HashMap<String, String> hashMap = new HashMap<>();
        
        // 场景2：需要保持插入顺序
        System.out.println("2. 需要保持插入顺序 → LinkedHashMap");
        LinkedHashMap<String, String> linkedMap = new LinkedHashMap<>();
        
        // 场景3：需要排序或范围查询
        System.out.println("3. 需要排序或范围查询 → TreeMap");
        TreeMap<String, String> treeMap = new TreeMap<>();
        
        // 场景4：需要并发访问
        System.out.println("4. 需要并发访问 → ConcurrentHashMap");
        ConcurrentHashMap<String, String> concurrentMap = new ConcurrentHashMap<>();
        
        // 场景5：需要排序且并发访问
        System.out.println("5. 需要排序且并发访问 → ConcurrentSkipListMap");
        ConcurrentSkipListMap<String, String> skipListMap = new ConcurrentSkipListMap<>();
    }
}
```



# ConcurrentHashMap

ConcurrentHashMap 是 Java 并发包中的线程安全 HashMap，通过分段锁（JDK 1.7）和CAS + synchronized（JDK 1.8）等技术实现高效的并发控制。

## 与HashMap对比

| 特性              | HashMap       | ConcurrentHashMap              |
| :---------------- | :------------ | :----------------------------- |
| **线程安全**      | ❌ 不安全      | ✅ 安全                         |
| **null key**      | ✅ 允许（1个） | ❌ 不允许                       |
| **null value**    | ✅ 允许        | ❌ 不允许                       |
| **并发度**        | 1（单线程）   | 数组长度（理论最大值）         |
| **锁机制**        | 无锁          | CAS + synchronized（桶锁）     |
| **迭代器**        | fail-fast     | 弱一致性                       |
| **size() 准确性** | 准确          | 近似值                         |
| **原子操作**      | ❌ 无          | ✅ 有（putIfAbsent、replace等） |
| **初始化时机**    | 首次 put      | 首次 put                       |
| **扩容机制**      | 单线程扩容    | 多线程协同扩容                 |

## 锁粒度对比

```text
Hashtable（全表锁）:
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │         整个Map加锁              │ │
│ │         🔒 LOCK                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

JDK 1.7 ConcurrentHashMap（分段锁）:
┌─────────────────────────────────────┐
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │Seg 0 │ │Seg 1 │ │Seg 2 │ │Seg 3 │ │
│ │ 🔒   │ │ 🔒   │ │ 🔒   │ │ 🔒   │ │
│ └──────┘ └──────┘ └──────┘ └──────┘ │
└─────────────────────────────────────┘

JDK 1.8 ConcurrentHashMap（桶锁）:
┌─────────────────────────────────────┐
│ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐   │
│ │0│ │1│ │2│ │3│ │4│ │5│ │6│ │7│   │
│ │🔒│ │🔒│ │🔒│ │🔒│ │🔒│ │🔒│ │🔒│ │🔒│   │
│ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘   │
│  各桶独立加锁，并发度=数组长度       │
└─────────────────────────────────────┘
```

![image-20260510121908683](http://file.lishunxing.cn/typora-images/image-20260510121908683.png)



在JDK 1.7中 讲CHM的Hash表分段拆成了16个数组 叫做segment来保存  每个Segment中都存到了一个HashTable 

当有2个相同Hash(Key)的请求进来的时候  对于落在对应下标区域的Segment进行加锁 这个操作叫做**分段加锁** 来提升性能 (HashTable是直接锁Hash表)

然后每个HashTable中保存了一个可以无限扩容的单向链表  指向下一个值的地址

![image-20260510121936013](http://file.lishunxing.cn/typora-images/image-20260510121936013.png)



相比较于删除了Segment 采用Node节点 初始16个 当出现Hash(key)冲突时 进行node加锁  然后对链表进行遍历 进行替换或者头部写入  如果链表长度超过8  则转换为红黑树, 因为红黑树的时间复杂度是O(logn) 会比链表O(n)速度快



## 加锁方式

```java
// JDK 1.7 ConcurrentHashMap 结构
public class ConcurrentHashMap<K, V> {
    // 分段锁数组
    final Segment<K,V>[] segments;
    
    // Segment 继承 ReentrantLock
    static final class Segment<K,V> extends ReentrantLock {
        transient volatile HashEntry<K,V>[] table;
        transient int count;
        
        // 每个 Segment 独立加锁
        V put(K key, int hash, V value, boolean onlyIfAbsent) {
            lock();  // 获取 Segment 锁
            try {
                // 操作当前 Segment 的 HashEntry 数组
                // ...
            } finally {
                unlock();  // 释放锁
            }
        }
    }
}

// JDK 1.8 实现：CAS + synchronized
public class ConcurrentHashMap<K,V> {
    // 核心数据结构
    transient volatile Node<K,V>[] table;
    
    // 插入操作
    final V putVal(K key, V value, boolean onlyIfAbsent) {
        if (key == null || value == null) throw new NullPointerException();
        int hash = spread(key.hashCode());
        int binCount = 0;
        
        for (Node<K,V>[] tab = table;;) {
            Node<K,V> f;
            int n, i, fh;
            
            if (tab == null || (n = tab.length) == 0)
                tab = initTable();  // 初始化（CAS）
            
            // 情况1: 桶为空，使用 CAS 插入
            else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
                if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value, null)))
                    break;  // CAS 成功，跳出循环
            }
            
            // 情况2: 正在扩容，帮助扩容
            else if ((fh = f.hash) == MOVED)
                tab = helpTransfer(tab, f);
            
            // 情况3: 桶不为空，使用 synchronized 锁住桶的头节点
            else {
                V oldVal = null;
                synchronized (f) {  // 只锁当前桶的头节点
                    if (tabAt(tab, i) == f) {
                        if (fh >= 0) {
                            // 链表操作
                            binCount = 1;
                            for (Node<K,V> e = f;; ++binCount) {
                                K ek;
                                if (e.hash == hash &&
                                    ((ek = e.key) == key ||
                                     (ek != null && key.equals(ek)))) {
                                    oldVal = e.val;
                                    if (!onlyIfAbsent)
                                        e.val = value;
                                    break;
                                }
                                Node<K,V> pred = e;
                                if ((e = e.next) == null) {
                                    pred.next = new Node<K,V>(hash, key, value, null);
                                    break;
                                }
                            }
                        } else if (f instanceof TreeBin) {
                            // 红黑树操作
                            Node<K,V> p;
                            binCount = 2;
                            if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key, value)) != null) {
                                oldVal = p.val;
                                if (!onlyIfAbsent)
                                    p.val = value;
                            }
                        }
                    }
                }
                
                // 检查是否需要树化
                if (binCount != 0) {
                    if (binCount >= TREEIFY_THRESHOLD)
                        treeifyBin(tab, i);
                    if (oldVal != null)
                        return oldVal;
                    break;
                }
            }
        }
        addCount(1L, binCount);
        return null;
    }
}
```



## 迭代器对比

```java
HashMap (fail-fast):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  迭代器创建 ──→ 遍历元素 ──→ 检测到修改 ──→ 立即抛异常         │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│  记录modCount   每次next检查   modCount变化    ConcurrentMod   │
│  = 3           modCount      (变成4)        ificationException│
│                                                                 │
│  特点: 一旦检测到修改，立即失败                                  │
└─────────────────────────────────────────────────────────────────┘

public class HashMapFailFast {
    public static void main(String[] args) {
        Map<String, String> map = new HashMap<>();
        map.put("1", "one");
        map.put("2", "two");
        map.put("3", "three");
        
        System.out.println("=== HashMap fail-fast 演示 ===\n");
        
        // 获取迭代器
        Iterator<String> iterator = map.keySet().iterator();
        
        // 在遍历过程中修改集合
        while (iterator.hasNext()) {
            String key = iterator.next();
            System.out.println("读取: " + key);
            
            if (key.equals("2")) {
                System.out.println("  → 尝试添加新元素");
                map.put("4", "four");  // 修改集合结构
                // 立即抛出 ConcurrentModificationException
            }
        }
    }
}

ConcurrentHashMap (弱一致性):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  迭代器创建 ──→ 遍历快照 ──→ 继续遍历 ──→ 正常完成             │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│  基于当前数组   不检查修改     看不到新元素    不抛异常         │
│  创建快照       继续原计划     也不抛异常                       │
│                                                                 │
│  特点: 基于快照遍历，不关心后续修改                              │
└─────────────────────────────────────────────────────────────────┘

public class ConcurrentHashMapWeakConsistency {
    public static void main(String[] args) throws InterruptedException {
        ConcurrentHashMap<String, String> map = new ConcurrentHashMap<>();
        map.put("1", "one");
        map.put("2", "two");
        map.put("3", "three");
        
        System.out.println("=== ConcurrentHashMap 弱一致性演示 ===\n");
        
        // 创建迭代器
        Iterator<String> iterator = map.keySet().iterator();
        
        System.out.println("创建迭代器时的快照视图: [1, 2, 3]");
        
        // 在遍历过程中修改集合
        System.out.println("\n开始遍历:");
        while (iterator.hasNext()) {
            String key = iterator.next();
            System.out.println("  读取: " + key);
            
            if (key.equals("2")) {
                System.out.println("  → 添加新元素 D");
                map.put("4", "four");  // 安全修改，不抛异常
                System.out.println("  → 删除元素 1");
                map.remove("1");
            }
        }
        
        System.out.println("\n遍历完成，没有异常！");
        
        System.out.println("\n最终 map 内容: " + map.keySet());
        System.out.println("迭代器遍历的是旧视图，没有看到修改");
    }
}

运行结果：

text
=== ConcurrentHashMap 弱一致性演示 ===

创建迭代器时的快照视图: [1, 2, 3]

开始遍历:
  读取: 1
  读取: 2
  → 添加新元素 D
  → 删除元素 1
  读取: 3

遍历完成，没有异常！

最终 map 内容: [2, 3, 4]
迭代器遍历的是旧视图，没有看到修改
```

## ConcurrentHashMap Java 8 重要改进及缓存应用

### JDK 1.8 vs JDK 1.7 重要改进对比

#### 核心改进对比表

| 改进项       | JDK 1.7             | JDK 1.8                    | 优势                   |
| :----------- | :------------------ | :------------------------- | :--------------------- |
| **锁机制**   | 分段锁（Segment）   | CAS + synchronized（桶锁） | 锁粒度更细，并发度更高 |
| **数据结构** | 数组 + 链表         | 数组 + 链表 + 红黑树       | 解决链表过长性能问题   |
| **并发度**   | 固定16（默认）      | 数组长度（动态）           | 并发度随容量提升       |
| **扩容机制** | 单线程扩容          | 多线程协同扩容             | 扩容效率大幅提升       |
| **迭代器**   | 弱一致性            | 弱一致性（优化）           | 遍历性能更好           |
| **内存占用** | 较高（Segment数组） | 较低                       | 减少内存开销           |

#### 结构对比图

```text
JDK 1.7 ConcurrentHashMap:
┌─────────────────────────────────────────────────────────────┐
│ ConcurrentHashMap                                          │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Segment[0] (锁)  │ Segment[1] (锁)  │ Segment[2] (锁) ││
│ │ ┌─────────────┐  │ ┌─────────────┐  │ ┌─────────────┐  ││
│ │ │ HashEntry[] │  │ │ HashEntry[] │  │ │ HashEntry[] │  ││
│ │ │ 链表        │  │ │ 链表        │  │ │ 链表        │  ││
│ │ └─────────────┘  │ └─────────────┘  │ └─────────────┘  ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

JDK 1.8 ConcurrentHashMap:
┌─────────────────────────────────────────────────────────────┐
│ ConcurrentHashMap                                          │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Node[] table                                            ││
│ │ ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐            ││
│ │ │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │...│ n │            ││
│ │ └─┬─┴─┬─┴─┬─┴─┬─┴─┬─┴─┬─┴─┬─┴─┬─┴─┬─┴─┬─┘            ││
│ │   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓               ││
│ │ 链表 链表 链表 链表 链表 链表 红黑树 链表 链表 链表      ││
│ └─────────────────────────────────────────────────────────┘│
│ 锁粒度：每个桶独立锁（synchronized）                         │
└─────────────────────────────────────────────────────────────┘
```

### 基于 ConcurrentHashMap 实现本地缓存

### 带过期时间的缓存实现

```java
public class ExpiringCache<K, V> {
    // 存储实际值
    private final ConcurrentHashMap<K, V> cache = new ConcurrentHashMap<>();
    // 存储过期时间
    private final ConcurrentHashMap<K, Long> expireMap = new ConcurrentHashMap<>();
    // 默认过期时间（毫秒）
    private final long defaultTTL;
    // 清理线程
    private final ScheduledExecutorService cleaner;
    
    public ExpiringCache(long defaultTTL) {
        this.defaultTTL = defaultTTL;
        this.cleaner = Executors.newSingleThreadScheduledExecutor();
        
        // 启动定期清理任务（每分钟执行一次）
        cleaner.scheduleAtFixedRate(this::cleanExpired, 1, 1, TimeUnit.MINUTES);
    }
    
    public V put(K key, V value) {
        return put(key, value, defaultTTL);
    }
    
    public V put(K key, V value, long ttl) {
        long expireTime = System.currentTimeMillis() + ttl;
        expireMap.put(key, expireTime);
        return cache.put(key, value);
    }
    
    public V get(K key) {
        if (isExpired(key)) {
            remove(key);
            return null;
        }
        return cache.get(key);
    }
    
    private boolean isExpired(K key) {
        Long expireTime = expireMap.get(key);
        return expireTime != null && System.currentTimeMillis() > expireTime;
    }
    
    public V remove(K key) {
        expireMap.remove(key);
        return cache.remove(key);
    }
    
    private void cleanExpired() {
        expireMap.entrySet().removeIf(entry -> {
            boolean expired = System.currentTimeMillis() > entry.getValue();
            if (expired) {
                cache.remove(entry.getKey());
            }
            return expired;
        });
    }
    
    public void shutdown() {
        cleaner.shutdown();
        try {
            if (!cleaner.awaitTermination(5, TimeUnit.SECONDS)) {
                cleaner.shutdownNow();
            }
        } catch (InterruptedException e) {
            cleaner.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
```

###  基于LRU实现缓存

```java
import java.util.concurrent.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 带容量限制和驱逐策略的本地缓存
 * 
 * 特性：
 * 1. 容量限制 - 最多存储指定数量的元素
 * 2. LRU驱逐 - 当容量满时，淘汰最久未访问的元素
 * 3. 线程安全 - 基于 ConcurrentHashMap 实现
 * 4. 访问记录 - 自动记录每个元素的最后访问时间
 * 
 * @param <K> 键的类型
 * @param <V> 值的类型
 */
public class SimpleLRUCache<K, V> {
    
    // ==================== 内部数据结构 ====================
    
    /**
     * 缓存条目，包含实际值和最后访问时间
     */
    private static class CacheEntry<V> {
        private final V value;           // 实际缓存的值
        private volatile long lastAccess; // 最后访问时间（毫秒）
        
        CacheEntry(V value) {
            this.value = value;
            this.lastAccess = System.currentTimeMillis();
        }
        
        V getValue() {
            return value;
        }
        
        long getLastAccess() {
            return lastAccess;
        }
        
        void updateAccessTime() {
            this.lastAccess = System.currentTimeMillis();
        }
    }
    
    // ==================== 核心字段 ====================
    
    /**
     * 实际存储数据的 ConcurrentHashMap
     * - Key: 缓存的键
     * - Value: 缓存条目（包含值和访问时间）
     */
    private final ConcurrentHashMap<K, CacheEntry<V>> cache;
    
    /**
     * 最大容量（最多存储多少个元素）
     */
    private final int maxSize;
    
    /**
     * 统计信息：缓存命中次数
     */
    private final AtomicLong hitCount;
    
    /**
     * 统计信息：缓存未命中次数
     */
    private final AtomicLong missCount;
    
    /**
     * 统计信息：被驱逐的元素数量
     */
    private final AtomicLong evictionCount;
    
    // ==================== 构造方法 ====================
    
    /**
     * 创建 LRU 缓存
     * 
     * @param maxSize 最大容量（必须大于0）
     * @throws IllegalArgumentException 如果 maxSize <= 0
     */
    public SimpleLRUCache(int maxSize) {
        if (maxSize <= 0) {
            throw new IllegalArgumentException("maxSize 必须大于0，当前值: " + maxSize);
        }
        
        this.maxSize = maxSize;
        this.cache = new ConcurrentHashMap<>();
        this.hitCount = new AtomicLong(0);
        this.missCount = new AtomicLong(0);
        this.evictionCount = new AtomicLong(0);
    }
    
    // ==================== 核心方法 ====================
    
    /**
     * 放入缓存
     * 
     * 如果 key 已存在，则覆盖旧值，并更新访问时间
     * 如果 key 不存在且缓存已满，则淘汰最久未访问的元素后再添加
     * 
     * @param key   键（不能为 null）
     * @param value 值（可以为 null，但不建议）
     * @return 如果 key 之前存在，返回旧值；否则返回 null
     */
    public V put(K key, V value) {
        if (key == null) {
            throw new NullPointerException("key 不能为 null");
        }
        
        // 创建新的缓存条目
        CacheEntry<V> newEntry = new CacheEntry<>(value);
        
        while (true) {
            // 1. 尝试直接插入
            CacheEntry<V> oldEntry = cache.putIfAbsent(key, newEntry);
            
            if (oldEntry != null) {
                // key 已存在，直接覆盖
                // 注意：putIfAbsent 返回旧值，我们直接使用 put 覆盖
                oldEntry = cache.put(key, newEntry);
                return oldEntry != null ? oldEntry.getValue() : null;
            }
            
            // 2. key 不存在，成功插入后检查容量
            if (cache.size() <= maxSize) {
                // 容量未超限，直接返回
                return null;
            }
            
            // 3. 容量超限，需要驱逐一个元素
            // 注意：可能存在多个线程同时发现超限，只有一个能成功驱逐
            boolean evicted = evictOne();
            
            if (evicted) {
                // 成功驱逐，返回（新元素已在缓存中）
                return null;
            }
            
            // 驱逐失败（可能被其他线程抢先了），重新检查容量
            // 如果容量仍然超限，继续尝试驱逐
        }
    }

    public V get(K key) {
        if (key == null) {
            return null;
        }
        
        CacheEntry<V> entry = cache.get(key);
        
        if (entry == null) {
            // 未命中
            missCount.incrementAndGet();
            return null;
        }
        
        // 命中，更新访问时间
        entry.updateAccessTime();
        hitCount.incrementAndGet();
        return entry.getValue();
    }
    
    public V remove(K key) {
        if (key == null) {
            return null;
        }
        
        CacheEntry<V> entry = cache.remove(key);
        return entry != null ? entry.getValue() : null;
    }
    
    /**
     * 清空所有缓存
     */
    public void clear() {
        cache.clear();
        // 注意：不清空统计信息
    }
    
    /**
     * 检查 key 是否存在
     * 
     * @param key 键
     * @return true 表示存在
     */
    public boolean containsKey(K key) {
        return cache.containsKey(key);
    }
    
    /**
     * 获取当前缓存大小
     * 
     * @return 缓存中元素数量
     */
    public int size() {
        return cache.size();
    }
    
    /**
     * 检查缓存是否为空
     */
    public boolean isEmpty() {
        return cache.isEmpty();
    }
    
    // ==================== 驱逐策略 ====================
    
    /**
     * 淘汰一个最久未访问的元素
     * 
     * 实现原理：
     * 1. 遍历所有缓存条目
     * 2. 找出最后访问时间最小的元素（最老的）
     * 3. 尝试删除该元素
     * 
     * @return true 表示成功淘汰了一个元素，false 表示无需淘汰或淘汰失败
     */
    private boolean evictOne() {
        // 如果缓存未满，不需要淘汰
        if (cache.size() <= maxSize) {
            return false;
        }
        
        // 找出最久未访问的 key
        K oldestKey = null;
        long oldestTime = Long.MAX_VALUE;
        
        // 遍历所有条目，找出访问时间最小的
        for (Map.Entry<K, CacheEntry<V>> entry : cache.entrySet()) {
            long lastAccess = entry.getValue().getLastAccess();
            if (lastAccess < oldestTime) {
                oldestTime = lastAccess;
                oldestKey = entry.getKey();
            }
        }
        
        // 如果找到了最老的 key，尝试删除
        if (oldestKey != null) {
            CacheEntry<V> removed = cache.remove(oldestKey);
            if (removed != null) {
                evictionCount.incrementAndGet();
                return true;
            }
        }
        
        return false;
    }
    
    // ==================== 统计信息 ====================
    
    /**
     * 获取命中次数
     */
    public long getHitCount() {
        return hitCount.get();
    }
    
    /**
     * 获取未命中次数
     */
    public long getMissCount() {
        return missCount.get();
    }
    
    /**
     * 获取驱逐次数
     */
    public long getEvictionCount() {
        return evictionCount.get();
    }
    
    /**
     * 获取命中率
     * 
     * @return 命中率（0.0 ~ 1.0）
     */
    public double getHitRate() {
        long hits = hitCount.get();
        long misses = missCount.get();
        long total = hits + misses;
        
        if (total == 0) {
            return 0.0;
        }
        
        return (double) hits / total;
    }
    
    /**
     * 重置统计信息
     */
    public void resetStats() {
        hitCount.set(0);
        missCount.set(0);
        evictionCount.set(0);
    }
    
    // ==================== 辅助方法 ====================
    
    /**
     * 获取缓存中所有 key（快照）
     * 
     * @return 所有 key 的集合（副本）
     */
    public Set<K> keySet() {
        return new HashSet<>(cache.keySet());
    }
    
    /**
     * 获取缓存中所有值（快照）
     * 
     * @return 所有值的集合（副本）
     */
    public Collection<V> values() {
        List<V> values = new ArrayList<>();
        for (CacheEntry<V> entry : cache.values()) {
            values.add(entry.getValue());
        }
        return values;
    }
    
    /**
     * 打印缓存状态（调试用）
     */
    public void printStats() {
        System.out.println("========== 缓存统计 ==========");
        System.out.println("当前大小: " + size() + " / " + maxSize);
        System.out.println("命中次数: " + getHitCount());
        System.out.println("未命中次数: " + getMissCount());
        System.out.println("驱逐次数: " + getEvictionCount());
        System.out.printf("命中率: %.2f%%\n", getHitRate() * 100);
        System.out.println("===============================");
    }
}
```

## ConcurrentHashMap 可能出现数据一致性问题的场景

| 方面             | 说明           | 解决方案                |
| :--------------- | :------------- | :---------------------- |
| **单个操作**     | ✅ 线程安全     | 直接使用                |
| **复合操作**     | ❌ 非原子性     | 使用原子方法或加锁      |
| **先检查后执行** | ❌ 可能重复执行 | computeIfAbsent         |
| **迭代遍历**     | ⚠️ 弱一致性     | 接受或使用快照          |
| **size()**       | ⚠️ 近似值       | 使用 LongAdder 精确计数 |
| **批量操作**     | ❌ 非原子       | 使用锁或事务            |

1.  ConcurrentHashMap 是线程安全的，但仅限于单个操作
2.  复合操作需要额外同步，使用原子方法或锁, 比如先get然后put
3.  弱一致性是设计选择，为了性能牺牲强一致性
4.  理解业务场景，选择合适的并发策略
5.  使用提供的原子方法，避免自己实现