# JVM参数命令

官网地址: <https://www.oracle.com/java/technologies/javase/vmoptions-jsp.html>

## jps 查找当前java进程

jps 是 JDK 自带的 Java Virtual Machine Process Status Tool（JVM 进程状态工具），用于列出当前系统中所有正在运行的 Java 进程及其主类信息。

### 基本用法

```bash
jps [options] [hostid]
```

### 常用选项

| 选项 | 说明                                   |
| :--- | :------------------------------------- |
| `-q` | 只显示进程 ID，不显示类名              |
| `-m` | 显示传递给 main 方法的参数             |
| `-l` | 显示完整的主类名或 JAR 文件路径        |
| `-v` | 显示传递给 JVM 的参数（如 -Xms, -Xmx） |
| `-V` | 显示通过 flags 文件传递的参数          |

```bash
# 基础用法 - 显示 PID 和主类名
$ jps
12345 Jps
12346 Main
12347 org.apache.catalina.startup.Bootstrap

# 显示完整包名
$ jps -l
12345 sun.tools.jps.Jps
12346 com.example.Main
12347 org.apache.catalina.startup.Bootstrap

# 显示 JVM 参数
$ jps -v
12346 Main -Xms512m -Xmx1024m -XX:MetaspaceSize=128m

# 显示 main 方法参数
$ jps -m
12346 Main arg1 arg2
```

### 注意事项

1.  需要 JDK（不是 JRE），`jps` 位于 `$JAVA_HOME/bin/` 目录下
2.  权限问题：在 Linux 上可能需要 root 或同用户才能看到其他用户的 Java 进程
3.  局限性：只能看到当前用户的 Java 进程（默认），使用 `hostid` 可查看远程
4.  进程消失：如果 Java 进程异常退出，可能仍在列表中出现，但实际已不可用

### 与其他命令对比

*   `jps`：快速查看 Java 进程（推荐日常使用）
*   `ps -ef \| grep java`：系统级查看，包含所有进程
*   `jcmd`：功能更强大，可获取更多诊断信息

## jinfo 查看修改参数

`jinfo` 是 JDK 自带的 Java Configuration Info 工具，用于查看和动态修改运行中的 Java 进程的 JVM 配置参数、系统属性。

### 基本用法

```bash
# pid 可以通过 jps -l 查看
jinfo [options] pid
```

### 常用选项

| 选项                   | 说明                                             |
| :--------------------- | :----------------------------------------------- |
| `-flags`               | 查看 JVM 启动参数（包括默认值）                  |
| `-sysprops`            | 查看 `System.getProperties()` 系统属性           |
| `-flag <name>`         | 查看指定 JVM 标志的值                            |
| `-flag [+/-]<name>`    | **动态开启/关闭**布尔标志（如 `PrintGCDetails`） |
| `-flag <name>=<value>` | **动态设置**数值标志（如 `MaxHeapFreeRatio=30`） |
| `-h` / `-help`         | 打印帮助信息                                     |

### 使用示例

```bash
# 查看所有 JVM 标志
jinfo -flags 12345

# 输出示例：
Attaching to process ID 12345, please wait...
Non-default VM flags: -XX:CICompilerCount=2 -XX:InitialHeapSize=536870912 -XX:MaxHeapSize=1073741824 -XX:+UseParallelGC
Command line:  -Xms512m -Xmx1024m -XX:+UseParallelGC

# 查看系统属性
jinfo -sysprops 12345

# 输出示例：
java.vendor = Oracle Corporation
java.version = 1.8.0_202
user.dir = /home/app
...

# 查看单个 JVM 标志
# 查看布尔标志
jinfo -flag PrintGCDetails 12345
# 输出：-XX:-PrintGCDetails（关闭状态）

# 查看数值标志
jinfo -flag MaxHeapFreeRatio 12345
# 输出：-XX:MaxHeapFreeRatio=70

# 查看堆大小
jinfo -flag MaxHeapSize 12345
# 输出：-XX:MaxHeapSize=1073741824（=1GB）

# 动态修改 JVM 参数（无需重启）
# 开启 GC 详细日志 生产环境未开启 GC 日志，但怀疑有 GC 问题
jinfo -flag +PrintGCDetails 12345

# 开启 GC 时间戳
jinfo -flag +PrintGCTimeStamps 12345

# 修改 GC 后空闲堆比例
jinfo -flag MaxHeapFreeRatio=40 12345

# 关闭某个标志
jinfo -flag -PrintGCDetails 12345
```

### 注意事项

1.  权限要求：需要与目标进程相同用户或 `root` 权限
2.  JDK 版本匹配：`jinfo` 版本应与目标 JVM 版本一致
3.  受限支持：某些 JVM 参数不能动态修改（如 `Xmx`），需重启
4.  Java 9+ 变更：从 Java 9 开始，部分功能移入 `jcmd`，建议改用：

## jstack 监测Java线程死锁

jstack 是 JDK 自带的 Java Stack Trace 工具，用于打印指定 Java 进程的线程堆栈信息。它是诊断线程死锁、应用卡顿、高 CPU 等问题的重要工具。

### 基本用法

```bash
jstack [options] pid
```

### 常用选项

| 选项           | 说明                                                         |
| :------------- | :----------------------------------------------------------- |
| `-l`           | **长列表**，打印锁的附加信息（如 `java.util.concurrent` 中的 `ownable synchronizers`） |
| `-F`           | **强制**输出堆栈，当 `jstack pid` 无响应时使用（仅 Linux/Solaris） |
| `-m`           | **混合模式**，打印 Java 和 C/C++ 帧（native 堆栈）           |
| `-h` / `-help` | 打印帮助信息                                                 |

### 核心应用场景

#### 检测死锁

jstack 能自动检测 Java 级别的死锁，并在输出末尾明确标注

```bash
jstack -l 12345 > deadlock.log
```

输出示例:

```text
Found one Java-level deadlock:
=============================
"Thread-1":
  waiting to lock monitor 0x00007f8a1200e888 (object 0x000000076b6a4f80, a java.lang.Object),
  which is held by "Thread-0"
"Thread-0":
  waiting to lock monitor 0x00007f8a12011c88 (object 0x000000076b6a4f90, a java.lang.Object),
  which is held by "Thread-1"
```

#### 分析应用卡顿/无响应

当应用出现"假死"时，通过 `jstack` 查看所有线程都在做什么：

```text
# 连续多次抓取，间隔 3-5 秒，对比线程状态变化
jstack -l 12345 > dump1.txt
sleep 3
jstack -l 12345 > dump2.txt
```

如果发现大量线程处于 BLOCKED 或 WAITING 状态，可能是锁竞争或死锁问题

#### 定位高 CPU 问题

1.  用 `top -H -p <pid>` 找到 CPU 占用高的线程 ID（十进制）
2.  转换为十六进制（如 `12345` → `0x3039`）
3.  在 `jstack` 输出中搜索该十六进制 `nid`

#### 分析线程状态分布

jstack 输出中的线程状态，RUNNABLE 并不总是表示正在执行，可能只是就绪等待 CPU 调度

| 状态            | 含义                                        |
| :-------------- | :------------------------------------------ |
| `RUNNABLE`      | 正在执行或已就绪                            |
| `BLOCKED`       | 等待获取监视器锁（`synchronized`）          |
| `WAITING`       | 等待 `notify()`/`notifyAll()`               |
| `TIMED_WAITING` | 带超时的等待（如 `sleep`、`wait(timeout)`） |
| `TERMINATED`    | 已终止                                      |

## jmap 打印堆内存

`jmap` 是 JDK 自带的 Java Memory Map 工具，用于打印 Java 进程的堆内存详细信息、生成堆转储文件（heap dump）、查看对象统计等。它是分析和排查内存泄漏、优化内存使用的核心工具。

### 基本用法

```bash
jmap [options] pid
```

### 常用选项

| 选项                   | 说明                                                         |
| :--------------------- | :----------------------------------------------------------- |
| `-heap`                | 打印堆内存详细信息（GC 算法、各代空间大小、使用情况）        |
| `-histo[:live]`        | 打印堆中对象的统计信息（类名、实例数、内存占用）；`:live` 只统计存活对象（会触发 Full GC） |
| `-dump:<dump-options>` | 生成堆转储文件（.hprof）                                     |
| `-clstats`             | 打印类加载器统计信息                                         |
| `-finalizerinfo`       | 打印等待 finalize 执行的对象                                 |
| `-F`                   | 强制 dump（当进程无响应时使用，需谨慎）                      |

### 核心应用场景

#### 查看堆内存整体情况（快速诊断）

```bash
jmap -heap 12345

# 输出关键信息示例：
Heap Configuration:
   MinHeapFreeRatio         = 40
   MaxHeapFreeRatio         = 70
   MaxHeapSize              = 1073741824 (1024.0MB)
   NewSize                  = 357564416 (341.0MB)
   
Heap Usage:
New Generation (Eden + 1 Survivor Space):
   capacity = 322961408 (308.0MB)
   used     = 245678432 (234.3MB, 76.1%)
   
Eden Space:
   capacity = 287309824 (274.0MB)
   used     = 223456789 (213.1MB, 77.8%)
   
Old Generation:
   capacity = 716177408 (683.0MB)
   used     = 598765432 (571.0MB, 83.6%)   # 老年代使用率过高
```

#### 分析对象分布（定位内存泄漏）

```bash
# 查看所有对象统计（按内存大小排序）
jmap -histo 12345 | head -20

# 只统计存活对象（会触发 Full GC，谨慎使用）
jmap -histo:live 12345 | head -20

# 输出示例：
 num     #instances         #bytes  class name
----------------------------------------------
   1:       1234567       98765432  [C
   2:       1234567       78901234  java.lang.String
   3:        234567       56789012  com.example.LargeObject   # 疑似泄漏
   4:        345678       45678901  java.util.HashMap$Node
```

#### 生成堆转储文件（离线分析）

```bash
# 方式1：自动生成带时间戳的文件
jmap -dump:live,format=b,file=heap_$(date +%Y%m%d_%H%M%S).hprof 12345

# 方式2：不触发 GC 的 dump（包含不可达对象）
jmap -dump:format=b,file=heap_full.hprof 12345

# 输出：
Heap dump file created
```

> 可以在java启动命令设置 `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/path/to/dump/directory`  来开启 OOM 时自动 dump 功能
>
> 生成MAT可分析的文件 `java -XX:+HeapDumpOnOutOfMemoryError  -XX:HeapDumpPath=/data/logs/heapdump/oom_$(date +%Y%m%d_%H%M%S).hprof  -jar app.jar`

### 堆转储文件分析工具

| 工具            | 说明                                                |
| :-------------- | :-------------------------------------------------- |
| **Eclipse MAT** | 最流行，自动分析泄漏疑点                            |
| **VisualVM**    | JDK 自带，加载 .hprof 查看                          |
| **JProfiler**   | 商业工具，功能强大                                  |
| **YourKit**     | 商业工具，性能优异                                  |
| **HeapHero**    | 商业工具，性能优异                                  |
| **jhat**        | JDK 自带的一个堆转储文件分析工具, 但是JDK9 已经废弃 |

注意: **jhat** (JVM Heap Analysis Tool) 是 JDK 自带的一个堆转储文件分析工具，用于分析由 jmap 或其他方式生成的 .hprof 文件

它的核心特点是开箱即用，解析 dump 文件后会启动一个内置的 Web 服务器（默认端口 7000），让开发者通过浏览器直观地查看堆内存中的对象信息、引用关系，并支持对象查询语言（OQL）

\*\*JDK 9 开始，它就被正式标记为废弃，并从 JDK 中移除了, \*\*强烈推荐在生产环境或处理复杂内存问题时，优先使用更强大的替代品，如 Eclipse MAT (Memory Analyzer Tool) 或 VisualVM

### 实战场景

#### 频繁 Full GC，怀疑内存泄漏

```bash
# 1. 先查看堆总体情况
jmap -heap 12345

# 2. 观察对象分布
jmap -histo 12345 | head -30

# 3. 如果发现某个类的实例数异常多，生成 dump 深入分析
jmap -dump:live,format=b,file=before_gc.hprof 12345
```

#### 比较 GC 前后的对象变化

```bash
# GC 前
jmap -histo 12345 > before.txt

# 手动触发 GC（jcmd 或 jconsole）
jcmd 12345 GC.run

# GC 后
jmap -histo 12345 > after.txt

# 对比差异
diff before.txt after.txt
```

#### 定位大对象

```bash
jmap -histo 12345 | grep -E '\[B|\[C|\[I' | head -10
# [B 是 byte[]，常见于缓冲区、IO 操作
# [C 是 char[]，常见于 String 内部
```

### 注意事项

| 注意点           | 说明                                                         |
| :--------------- | :----------------------------------------------------------- |
| **性能影响**     | `-histo:live` 和 `-dump:live` 会触发 **Full GC**，生产环境谨慎使用 |
| **暂停时间**     | dump 大堆（10GB+）可能导致应用暂停数秒至数分钟               |
| **文件大小**     | dump 文件 ≈ 堆内存大小，确保磁盘空间充足                     |
| **权限要求**     | 需要与目标进程**相同用户**或 `root` 权限                     |
| **Java 9+ 变更** | `jmap -heap` 已被移除，改用 `jhsdb jmap --heap --pid <pid>`  |
| **实验性工具**   | 官方标注为 experimental，未来版本可能变化                    |

## jstat 垃圾回收/JIT监控

`jstat` 是 JDK 自带的 JVM Statistics Monitoring Tool（JVM 统计监控工具），用于监控 JVM 的运行时统计信息，特别是垃圾回收 (GC)、类加载、JIT 编译等。它是纯命令行工具，非常适合在服务器上实时观察或定时采集 JVM 的运行数据，且性能开销很小。

### 基本用法

```bash
jstat -<option> [-t] [-h<lines>] <pid> [<interval> [<count>]]
```

*   `<option>`：要监控的内容，如 `-gc`、`-class`、`-compiler`。
*   `-t`：在每行输出前打印自 JVM 启动以来的时间戳（秒）。
*   `-h<lines>`：指定每隔多少行输出一次列头，便于阅读。
*   `<pid>`：目标 Java 进程的 ID。
*   `<interval>`：采样间隔，单位可以是 `ms`（毫秒）或 `s`（秒），默认为毫秒。
*   `<count>`：总共采样的次数。

### 最常用 Option：-gc (垃圾回收统计)

这是排查性能问题时最核心的选项，它能展示各代内存的使用情况和 GC 耗时。

```bash
# 每1秒打印一次，共打印5次，并显示时间戳
jstat -gc -t 12345 1s 5
```

### 开启JVM GC 日志打印, 通过以下 JVM 参数开启：

```bash
# 此参数可以通过jinfo动态开启
-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:/path/to/gc.log
```

### 主流GC日志分析工具对比

| 工具              | 类型           | 特点                                                         | 适用场景               |
| :---------------- | :------------- | :----------------------------------------------------------- | :--------------------- |
| **GCeasy**        | 在线/本地Web   | 智能诊断+优化建议，交互图表丰富                              | 快速分析、团队协作     |
| **GCViewer**      | 桌面端（开源） | 轻量级，可视化图表，支持多种JVM格式                          | 本地离线分析、深度调优 |
| **JXRay**         | 桌面端（商业） | 支持Heap Dump分析，识别JVM配置错误                           | 深度内存分析           |
| **yCrash GC API** | REST API       | 可集成CI/CD流水线，自动化分析                                | DevOps自动化场景       |
| **GC Plot**       | Docker部署     | 展示JVM信息、GC暂停时间、内存变化等核心指标，并以Tab页形式分类呈现 | 不如GCeasy             |

### GCeasy（强烈推荐）

GCeasy 是一款功能强大的 GC 日志分析平台，支持在线和本地部署两种方式

#### 核心功能：

*   智能诊断：自动识别 GC 问题并给出优化建议
*   可视化报表：生成交互式图表，直观展示堆内存变化、GC 停顿时间等
*   JVM 参数推荐：根据分析结果提供 JVM 调优参数建议（部分功能收费）
*   报告分享：可导出 HTML 报告，方便团队协作

#### 使用方法：

1.  访问官网：<https://gceasy.io/> 
2.  上传 GC 日志文件（.log）
3.  等待分析完成，查看报告

#### 输出示例：

*   关键性能指标：平均/最大停顿时间、吞吐量
*   交互图表：GC 前后堆内存变化、GC 持续时间分布
*   内存泄漏检测：识别异常增长的对象

### GCViewer

GCViewer 是一款开源的桌面端 GC 日志分析工具，轻量且功能实用

#### 核心功能：

*   可视化堆内存使用曲线（蓝色：已用内存，红色：总堆大小）
*   显示 GC 事件类型和持续时间（灰色：Minor GC，黑色：Full GC）
*   支持多种 GC 日志格式（Sun、IBM、HP 等 JVM

#### 使用方法：

```bash
# 下载 GCViewer jar 包后执行
java -jar gcviewer_1.3.4.jar gc.log

# 同时导出 CSV 和图表
java -jar gcviewer_1.3.4.jar gc.log summary.csv chart.png
```

图表解读：

*   蓝色线（已用内存）呈锯齿状：正常，说明 GC 正常工作
*   锯齿低点逐渐抬高：可能存在内存泄漏
*   黑色竖线（Full GC）：应尽可能减少其频率和持续时间

### 分析要点

无论使用哪种工具，建议重点关注以下指标：

1.  Full GC 频率：每小时不应超过 1-2 次，过高说明老年代压力大
2.  GC 停顿时间：单次 GC 建议 < 100ms（Minor GC）或 < 1s（Full GC）
3.  堆内存趋势：GC 后内存低点是否逐渐抬高（判断内存泄漏）
4.  吞吐量：应用实际运行时间占比，建议 > 99%

### WEB服务G1收集器调优

*   延迟敏感型（如交易系统、实时API）：目标是低延迟，要求GC暂停时间短（如P99 < 100ms），宁可牺牲部分吞吐量。
*   吞吐量优先型（如批处理、报表服务）：目标是高吞吐量，GC停顿可以稍长，但要确保单位时间内处理的任务更多。

#### 四大关键分析指标

分析GC日志时，重点关注以下四个方面，这能帮你快速定位问题。

##### **停顿时间：Web服务的生命线**

G1的核心优势是通过`-XX:MaxGCPauseMillis`参数控制最大暂停时间，默认200毫秒。你需要重点分析：

*   达标情况：实际停顿时间是否达到设定的目标？注意，这是一个软目标，G1会努力逼近但不保证100%达标。
*   分布情况：特别关注P99、P999等尾部延迟。偶尔的长停顿比平均停顿对用户体验影响更大。
*   GC类型：区分Young GC（通常更短）和Mixed GC（可能稍长）的停顿时间。

> 分析要点：如果 `MaxGCPauseMillis` 设得过低（如50ms），G1会频繁GC来尝试达标，反而导致吞吐量急剧下降（可能达30%-50%）。建议根据业务容忍度设置，通常100-200ms是个不错的起点。

##### **GC频率与堆内存变化**

GC频率和堆内存的变化模式能直观反映系统健康状况。

*   Young GC频率：如果频率过高，说明Eden区可能偏小，导致对象快速晋升。
*   晋升速率：观察从年轻代晋升到老年代的对象大小。速率突然升高，常预示着流量突增或潜在的内存泄漏。
*   堆内存趋势：在GCViewer等工具中，观察每次GC后的“堆内存低点”。如果这条基线持续缓慢上升，是内存泄漏的典型信号。

##### **并发标记周期：Mixed GC的前奏**

G1的并发标记周期是决定何时开始回收老年代的关键，相关参数`-XX:InitiatingHeapOccupancyPercent`默认值为45。

*   触发频率：标记周期是否过于频繁？这表明老年代增长过快。
*   Mixed GC效果：标记结束后，G1会执行一系列的Mixed GC来回收老年代。你需要分析：

    *   一次标记周期后，执行了几次Mixed GC？理想情况是能完成大部分回收。
    *   老年代占用率在经过Mixed GC后，是否有显著下降？

##### **晋升失败与Full GC：系统的“红灯”**

这是最需要警惕的指标。当Mixed GC的回收速度跟不上晋升速度，找不到可用空间来存放存活对象时，就会发生晋升失败，并最终触发单次Full GC。

*   严重后果：Full GC通常会停止所有应用线程，导致服务长时间无响应，是Web服务的大忌。
*   原因分析：晋升失败可能源于：`MaxGCPauseMillis`设得太短，导致每次Mixed GC回收不彻底；或`G1ReservePercent`保留空间不足（默认10%）；也可能是应用本身存在内存泄漏。
*   通常是内存泄漏或GC参数严重不合理。立即分析堆内存（使用`jmap`），检查是否有大量无法回收的对象。

## 总结

*   JVM调优是一个持续的过程, 需要结合理论知识、工具使用和实践经验。
*   现在服务一般都是用zabbix开启jmx监控在网页分析, 基本不会用jmap jstack这些命令行来监控了

# JVM性能优化

JVM 调优主要从编码实践和JVM 参数配置两个层面进行。以下是代码层面的调优建议：

## 代码维度

### 对象创建与复用

#### 避免在循环中创建对象

```java
// ❌ 错误：每次循环都创建新对象
for (int i = 0; i < 1000000; i++) {
    String s = new String("hello");
}

// ✅ 正确：复用对象
String s = "hello";
for (int i = 0; i < 1000000; i++) {
    // 使用 s
}
```

#### 使用线程池

```java
// 连接池、线程池等
ExecutorService executor = Executors.newFixedThreadPool(10);
// 使用完毕后归还
```

#### 合理使用 String

```java
// ❌ String 拼接：创建 10000 个中间对象
String result = "";
for (int i = 0; i < 10000; i++) {
    result += i;  // 每次创建新的 String 对象
}

// ✅ StringBuilder：只用一个可变缓冲区 预估容量
StringBuilder sb = new StringBuilder(10000);
for (int i = 0; i < 10000; i++) {
    sb.append(i);  // 在原有缓冲区操作，不创建新对象
}
String result = sb.toString();  // 最后只创建一次
```

性能差异实测：

*   String 拼接 10000 次：约 100-500ms
*   StringBuilder 拼接 10000 次：约 1-5ms

##### StringBuilder vs StringBuffer 区别

```java
// StringBuffer - 有同步锁 性能比builder低 5%-10% 左右
public synchronized StringBuffer append(String str) {
    toStringCache = null;
    super.append(str);
    return this;
}

// StringBuilder - 无同步锁
public StringBuilder append(String str) {
    super.append(str);
    return this;
}
```

##### String 不可变性的实现

```java
public final class String {
    private final char[] value;  // final 修饰，不可变
    private int hash;            // 缓存 hashCode
    
    // 每次修改都创建新对象
    public String concat(String str) {
        // 创建新数组
        char[] buf = new char[count + str.count];
        // 复制内容
        // 返回新 String
    }
}
```

##### StringBuilder 可变性实现

```java
public final class StringBuilder {
    char[] value;     // 非 final，可以修改
    int count;        // 当前长度
    
    // 在原有数组上操作
    public StringBuilder append(String str) {
        // 检查容量，需要时扩容 扩容公式：旧容量 * 2 + 2  (+2是为了避免容量为0的时候扩容, 因为0 * 2 = 0)
        ensureCapacityInternal(count + len);
        // 直接复制到原数组
        str.getChars(0, len, value, count);
        count += len;
        return this;  // 返回自身，支持链式调用
    }
}
```

### 集合优化

#### 指定初始容量

```java
// ❌ 默认容量10，需要多次扩容
List<String> list = new ArrayList<>();
for (int i = 0; i < 1000; i++) {
    list.add(data[i]);
}

// ✅ 预估容量，避免扩容
List<String> list = new ArrayList<>(1000);
```

#### 合理选择集合类型

```java
// 需要快速查找：HashMap
// 需要排序：TreeMap
// 需要线程安全：ConcurrentHashMap（非 synchronizedMap）
// 需要 FIFO：ArrayDeque（优于 LinkedList）
```

#### 及时清理集合

```java
// 使用完毕后清空，帮助GC
list.clear();
list = null;  // 大集合可以置null
```

### 内存管理

#### 软引用/弱引用使用

```java
// 缓存使用软引用，内存不足时自动回收 比如图片本地缓存, 文档本地缓存. 如果被回收了重新加载即可.
private Map<String, SoftReference<Object>> cache = new HashMap<>();

// ThreadLocal 使用弱引用
private static ThreadLocal<SimpleDateFormat> dateFormat = 
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));
```

#### 大对象处理

```java
// 大对象直接分配到老年代，需谨慎处理
byte[] hugeArray = new byte[1024 * 1024 * 100]; // 100MB
// 考虑使用流式处理或分批处理
```

### 异常处理

#### 避免频繁异常

```java
// ❌ 异常消耗性能
try {
    return Integer.parseInt(str);
} catch (NumberFormatException e) {
    return defaultValue;
}

// ✅ 提前判断
if (str != null && str.matches("\\d+")) {
    return Integer.parseInt(str);
}
return defaultValue;
```

#### 异常不用于流程控制

```java
// ❌ 不要用异常控制业务流程
try {
    while(true) {
        // ...
    }
} catch (Exception e) { }

// ✅ 正常条件判断
while(isRunning) { }
```

## 参数维度

### 堆内存配置

不合理的堆内存配置是导致频繁GC和性能抖动的首要原因。核心原则是：设置初始堆（-Xms）等于最大堆（-Xmx），避免运行时动态扩容带来的性能开销

| 参数                          | 推荐配置                                                     | 说明与最佳实践                                           |
| :---------------------------- | :----------------------------------------------------------- | :------------------------------------------------------- |
| **`-Xms` 与 `-Xmx`**          | 设置为相同值，通常为**物理内存的 70%-80%**。                 | 核心是避免堆扩容引发的 `Full GC`。例如 `-Xms4g -Xmx4g`。 |
| **`-XX:MaxMetaspaceSize`**    | 根据应用需求设置，如 `-XX:MaxMetaspaceSize=512m`。           | 限制元空间大小，防止因类加载泄漏导致的内存溢出。         |
| **`-XX:MaxDirectMemorySize`** | 若使用 **NIO (Non-blocking I/O)** 框架（如Netty），需显式设置，如 `-XX:MaxDirectMemorySize=1g`。 | 限制堆外内存大小，避免直接内存溢出。                     |

### 选择合适的垃圾收集器

GC 是 JVM 调优的核心，根据应用场景选择合适的收集器是重中之重。一项针对Web应用性能的实证分析显示，通过定制JVM配置，在高请求负载下可使CPU效率提升20%，内存使用减少15%；在I/O密集型场景下，响应时间最多可降低30%，CPU使用率降低25%

| GC算法                          | 启用参数                  | 适用场景与调优建议                                           |
| :------------------------------ | :------------------------ | :----------------------------------------------------------- |
| **G1 (Garbage First)** (推荐)   | `-XX:+UseG1GC`            | **通用默认选择**，尤其适合**大堆内存（>4GB）** 的Web服务。旨在平衡高吞吐量与低延迟。 • **调优关键**：`-XX:MaxGCPauseMillis=200` (目标停顿时间，非硬性指标)。 |
| **ParallelGC**                  | `-XX:+UseParallelGC`      | **吞吐量优先**。适合后台批处理、离线计算等对交互延迟不敏感的任务。 |
| **ZGC / Shenandoah**            | `-XX:+UseZGC` (JDK 11+)   | **超低延迟**场景（如金融交易、实时交互）。可将GC停顿控制在**10ms以内**，但会略微降低吞吐量。 |
| **CMS (Concurrent Mark Sweep)** | `-XX:+UseConcMarkSweepGC` | **已废弃**（Deprecated）。作为G1普及前的选择，不推荐在新项目中使用。 |

### 核心辅助参数

在设置好堆内存和GC算法后，可以通过以下参数对内存进行精细化管理。

*   控制对象晋升

    *   `-XX:MaxTenuringThreshold`：设置对象晋升到老年代前需要经过的GC次数（最大15）。降低此值（如设为1）可以让对象快速晋升，减少Survivor区的复制开销，适合大部分对象生命周期短的Web应用。
    *   `-XX:+PrintTenuringDistribution`：打印对象年龄分布信息，用于辅助决策 `MaxTenuringThreshold` 的设置。
*   调整分代比例

    *   `-XX:NewRatio`：新生代与老年代的比例。默认2表示新生代:老年代=1:2。若应用产生大量临时对象，可增大新生代比例（如 `-XX:NewRatio=1`）。
    *   `-XX:SurvivorRatio`：Eden区与Survivor区的比例。默认8表示Eden\:Survivor=8:1:1。
*   其他关键参数

    *   `-XX:+DisableExplicitGC`：强烈建议开启。防止代码中的 `System.gc()` 触发危险的 `Full GC`。
    *   `-XX:-UseBiasedLocking`：关闭偏向锁。对于高并发Web服务，可减少因锁竞争导致的 STW (Stop-The-World) 停顿。
    *   `-Xss`：设置线程栈大小，如 `-Xss256k`。在高并发场景下，减小该值可以显著降低内存占用。

### 监控与诊断

必须在应用启动时开启GC日志，以便事后分析和定位问题。

| 目的             | JDK 8 及以前                                 | JDK 9+                           |
| :--------------- | :------------------------------------------- | :------------------------------- |
| **基础GC日志**   | `-XX:+PrintGCDetails -XX:+PrintGCDateStamps` | `-Xlog:gc*`                      |
| **GC停顿时间**   | `-XX:+PrintGCApplicationStoppedTime`         | 包含在 `-Xlog:gc*` 中            |
| **对象年龄信息** | `-XX:+PrintTenuringDistribution`             | `-Xlog:gc+age=trace`             |
| **输出到文件**   | `-Xloggc:/path/to/gc.log`                    | `-Xlog:gc*:file=/path/to/gc.log` |

### 容器化环境特别注意事项

当Java应用运行在Docker等容器内时，需要确保JVM能感知到容器资源限制，而非宿主机的资源。

*   使用 `-XX:+UseContainerSupport` (JDK 8u191+)：此参数默认开启，使JVM能正确识别容器的CPU和内存限制。
*   设置内存限制：建议同时设置 `-Xmx` 和 `-XX:MaxRAMPercentage`。`-XX:MaxRAMPercentage=70.0` 表示JVM最大堆内存为容器可用内存的70%，这种方式比直接写死 `-Xmx` 更灵活。

### 实战案例参考

一个高并发Web服务（QPS > 1500）的调优案例可供参考

1.  问题：YGC非常频繁（每秒1-2次），GC吞吐量（应用运行时间占比）仅为95%。
2.  分析：通过 `jstat` 和GC日志分析，发现年轻代过小。
3.  调整：

    *   将堆内存从 `8GB` 提升至 `12GB`，年轻代相应增大。
    *   将 `-XX:MaxTenuringThreshold` 从 `15` 降低为 `4`，让对象更快晋升。
    *   添加 `-XX:-UseBiasedLocking` 关闭偏向锁。
4.  结果：YGC频率减半，GC吞吐量提升至 97.75%，服务整体性能提升了 15%。

#### 为什么要关闭偏向锁

偏向锁在单线程重复获取锁的场景下性能很好，但在多线程竞争的场景下，偏向锁的撤销（revoke）过程成本很高。

```java
// 高并发 Web 服务场景
public class Controller {
    private static final Object LOCK = new Object();
    
    public void handleRequest() {
        synchronized (LOCK) {  // 多线程竞争同一把锁
            // 业务逻辑
        }
    }
}

// 偏向锁的工作流程（多线程竞争）：
// 1. 线程 A 获取锁 → 获得偏向锁（偏向 A）
// 2. 线程 B 尝试获取锁 → 发现偏向锁不属于自己
// 3. 触发偏向锁撤销（需要在全局安全点执行，STW）
// 4. 升级为轻量级锁或重量级锁
// 5. 线程 B 获取锁
```

偏向锁撤销成本：

*   需要在全局安全点（Safepoint）执行
*   需要暂停所有线程（STW）
*   需要遍历栈帧、修改锁记录
*   性能开销可达数十毫秒甚至上百毫秒

高并发 Web 服务的特点:

*   大量短生命周期的请求线程（使用线程池）
*   锁通常被不同的线程竞争
*   偏向锁的假设（锁始终由同一线程获得）不成立
*   偏向锁不仅没有优化，反而增加了撤销开销

> 现代 Web 服务对延迟极其敏感（如要求 P99 < 100ms），而偏向锁撤销导致的 STW 会严重影响延迟。

#### 性能对比测试

```java
// 测试代码
public class BiasedLockTest {
    private static final Object LOCK = new Object();
    private static final int THREAD_COUNT = 16;
    private static final int LOOP_COUNT = 1000000;
    
    public static void main(String[] args) throws Exception {
        // 测试1：启用偏向锁（默认）
        // -XX:+UseBiasedLocking
        long time1 = test();
        
        // 测试2：关闭偏向锁
        // -XX:-UseBiasedLocking
        long time2 = test();
        
        System.out.println("启用偏向锁: " + time1 + "ms");
        System.out.println("关闭偏向锁: " + time2 + "ms");
        // 结果示例：
        // 启用偏向锁: 2850ms
        // 关闭偏向锁: 1230ms  (快 2.3 倍)
    }
    
    private static long test() throws Exception {
        CountDownLatch latch = new CountDownLatch(THREAD_COUNT);
        long start = System.currentTimeMillis();
        
        for (int i = 0; i < THREAD_COUNT; i++) {
            new Thread(() -> {
                for (int j = 0; j < LOOP_COUNT; j++) {
                    synchronized (LOCK) {
                        // 模拟业务
                        Math.random();
                    }
                }
                latch.countDown();
            }).start();
        }
        
        latch.await();
        return System.currentTimeMillis() - start;
    }
}
```

*   JDK 版本注意：`-XX:-UseBiasedLocking` 参数主要用于 JDK 8 到 JDK 14。从 JDK 15 开始，此参数已默认禁用且被标记为废弃；到 JDK 21 时，该参数已被彻底移除，设置将不再生效。
*   偏向锁启动延迟：在默认开启偏向锁的 JDK 8 中，JVM 启动后约 4 秒内并不会立即使用偏向锁。若希望参数立即生效，可额外添加 `-XX:BiasedLockingStartupDelay=0`。当然，直接使用 `-XX:-UseBiasedLocking` 关闭该功能，则完全不受此延迟影响。

JVM调优是一个持续观察和调整的过程。请从 “设置合理的堆内存（-Xms/-Xmx）” 和 “选择G1垃圾回收器（-XX:+UseG1GC）” 这两个最稳妥的步骤开始，然后通过分析GC日志，逐步调整 MaxGCPauseMillis、NewRatio 等参数，以适配你特定的业务负载。

# 线上监控 Arthas

Arthas 是一款线上监控诊断产品，通过全局视角实时查看应用 load、内存、gc、线程的状态信息，并能在不修改应用代码的情况下，对业务问题进行诊断，包括查看方法调用的出入参、异常，监测方法执行耗时，类加载信息等，大大提升线上问题排查效率。

> 官网地址 : <https://arthas.aliyun.com/>

## Arthas 能解决什么问题

| 问题场景                               | Arthas 解决方案                                   |
| :------------------------------------- | :------------------------------------------------ |
| 线上CPU飙高，不知道哪个线程/方法导致的 | `thread -n` 查看最忙的线程，`profiler` 生成火焰图 |
| 接口突然变慢，想定位慢在哪             | `trace` 追踪方法调用链，看每个子方法耗时          |
| 代码已经发布，但不确认是否执行到新逻辑 | `jad` 反编译确认线上代码，`watch` 观察方法入参    |
| 某个方法频繁报错，但日志信息不够       | `watch` 监控方法，捕获异常信息和入参              |
| 想查看JVM内存、GC情况                  | `dashboard`、`jvm`、`memory` 实时查看             |
| 线上紧急修复，来不及重新发布           | `retransform` 热更新代码                          |

## 快速上手：安装与启动

```bash
# 下载 arthas-boot.jar
curl -O https://arthas.aliyun.com/arthas-boot.jar

# 启动，会列出当前所有Java进程
java -jar arthas-boot.jar

# 输入进程前的序号，即可 attach 到目标进程
[INFO] Found existing java process, please choose one and input the serial number:
* [1]: 12345 com.example.demo.Application
  [2]: 67890 org.apache.catalina.startup.Bootstrap
输入: 1

# 退出与关闭
# 仅退出当前会话（Arthas 仍在后台运行，端口保持开放）
quit  或  exit

# 完全关闭 Arthas 服务 一般直接用stop停止全部 防止漏关闭
stop
```

## 核心命令详解

### dashboard —— 全局监控仪表盘

作用：实时查看JVM运行状态，包括线程、内存、GC、运行时信息

```bash
# 进入 dashboard 面板（按 Ctrl+C 退出）
dashboard

# 指定采样间隔（默认5秒）
dashboard -i 5000
```

面板包含：

*   线程部分：ID、名称、状态、CPU占用率、运行总时间
*   内存部分：堆内存（Eden、Survivor、Old）、非堆内存（Metaspace）
*   运行时信息：操作系统、JVM版本、负载情况

典型场景：快速定位哪个线程消耗CPU最高，判断是否有内存异常增长。

### thread —— 线程排查

作用：查看线程堆栈，定位死锁、高CPU线程

```bash
# 查看所有线程
thread

# 查看CPU占用前3的线程（最常用！）
thread -n 3

# 查看指定线程的详细堆栈
thread 15   # 15是线程ID

# 查看是否有死锁线程
thread -b

# 按状态筛选
thread --state WAITING
```

典型场景：CPU飙高时，`thread -n 10` 快速找到"元凶"线程，再通过 thread \<id> 看具体堆栈定位代码行

### watch —— 方法观测

作用：观察方法的入参、返回值、异常信息，无需加日志，无需重启

```bash
# 基本用法：观察方法返回值
watch com.example.UserService getUser returnObj

# 观察入参和返回值（-x 指定展开深度）
watch com.example.UserService getUser "{params,returnObj}" -x 2

# 观察异常信息（捕获抛出异常的方法）
watch com.example.UserService getUser throwExp

# 条件过滤：当参数id为100时触发
watch com.example.UserService getUser "{params,returnObj}" "params[0]==100"

# 在方法执行前就计算表达式（用于观测入参）
watch com.example.UserService getUser params -b
```

输出字段说明：

*   `params`：方法入参数组
*   `returnObj`：方法返回值
*   `throwExp`：方法抛出的异常
*   `target`：当前对象实例

典型场景：线上某个方法偶尔报错，用 watch 捕获异常时的入参，快速定位"脏数据"。

### trace —— 方法调用路径追踪

作用：分析方法内部调用链，找出耗时瓶颈

```bash
# 追踪方法调用链，显示每个子方法的耗时
trace com.example.OrderService createOrder

# 只追踪耗时超过100ms的调用
trace com.example.OrderService createOrder '#cost > 100'

# 展开调用深度（默认4层）
trace com.example.OrderService createOrder -n 5
```

典型场景：接口响应变慢，用 trace 看是哪个子方法（数据库查询、远程调用、计算逻辑）耗时最长

### monitor —— 方法执行统计

作用：统计方法的调用次数、成功率、平均耗时等性能指标

```bash
# 每5秒输出一次统计
monitor -c 5 com.example.UserService getUser

# 输出示例：
# timestamp            class          method    total  success  fail  avg-rt(ms)  fail-rate
# 2025-01-15 10:30:00  UserService    getUser    1250    1248     2       15.32      0.16%
```

统计维度：总调用次数、成功次数、失败次数、平均响应时间、失败率。

典型场景：实时观察接口的成功率和耗时变化，辅助性能分析和告警。

### jad —— 反编译查看源码

作用：查看线上正在运行的代码是否与你预期一致（确认部署是否生效）

```bash
# 反编译指定类
jad com.example.UserService

# 输出到文件（便于编辑，用于热更新）
jad com.example.UserService > /tmp/UserService.java
```

典型场景：怀疑代码没部署上去，或者想确认线上某个逻辑的具体实现。

### profiler —— 火焰图（性能分析）

作用：生成火焰图，直观展示CPU/内存热点

```bash
# 启动采样（默认CPU采样）
profiler start

# 采样30秒后停止并生成火焰图
profiler stop --format svg

# 指定采样类型
profiler start --event cpu      # CPU采样
profiler start --event alloc    # 内存分配采样
profiler start --event lock     # 锁竞争采样
```

## 常用命令速查表

| 命令          | 用途                     | 示例                                             |
| :------------ | :----------------------- | :----------------------------------------------- |
| `dashboard`   | 实时监控面板             | `dashboard -i 5000`                              |
| `thread`      | 线程堆栈/CPU分析         | `thread -n 3`、`thread -b`                       |
| `watch`       | 观测方法入参/返回值/异常 | `watch UserService getUser "{params,returnObj}"` |
| `trace`       | 方法调用链耗时           | `trace OrderService createOrder '#cost>100'`     |
| `monitor`     | 方法调用统计             | `monitor -c 5 UserService getUser`               |
| `jad`         | 反编译查看源码           | `jad com.example.UserService`                    |
| `profiler`    | 火焰图生成               | `profiler start` → `profiler stop`               |
| `retransform` | 热更新代码               | `retransform /path/to/Class.class`               |
| `jvm`         | JVM信息                  | `jvm`                                            |
| `memory`      | 内存使用详情             | `memory`                                         |
| `sc`          | 查找已加载的类           | `sc com.example.*`                               |
| `sm`          | 查看类的方法             | `sm com.example.UserService`                     |
| `quit/exit`   | 退出当前会话             | `quit`                                           |
| `stop`        | 完全关闭Arthas           | `stop`                                           |

## 实战场景速览

### CPU飙高，定位问题代码

```bash
# 1. 全局看板，找到CPU最高的线程
dashboard

# 2. 查看该线程的详细堆栈
thread 15

# 3. 如果堆栈在正则或循环上，进一步watch观测入参
watch com.example.LogAspect cutMethod params -x 2
```

### 接口响应慢，找性能瓶颈

这里分布式项目可以配合SkyWalking一起使用

```bash
# 追踪调用链，看每个方法耗时
trace com.example.OrderController createOrder

# 发现某子方法耗时高，再单独trace它
trace com.example.OrderService validateOrder '#cost > 50'
```

### 线上代码确认 + 热修复

正常不会这样干, 只会发hotfix

```bash
# 1. 确认线上代码
jad com.example.BugService > /tmp/BugService.java

# 2. 修改 /tmp/BugService.java

# 3. 编译 + 热加载
mc -c <classloader_hash> /tmp/BugService.java -d /tmp
retransform /tmp/com/example/BugService.class
```

## 注意事项

1.  性能影响：Arthas 通过字节码增强实现观测，会带来轻微性能开销，建议排查问题时开启，用完及时关闭（`stop`）。
2.  reset 清理：观测完成后，执行 `reset` 可以清除增强过的类，恢复原始性能。
3.  安全考虑：生产环境使用 Arthas 需要权限控制，阿里云 ARMS 提供了集成版本，可直接在控制台操作。
4.  与 SkyWalking 不兼容：如果应用已挂载 SkyWalking 探针，Arthas 可能无法正常工作。在skywalking应用启动时，为JVM添加两个额外的参数即可。

```bash
java -javaagent:/path/to/skywalking-agent.jar \
     -Dskywalking.agent.is_cache_enhanced_class=true \
     -Dskywalking.agent.class_cache_mode=MEMORY \
     -jar your-app.jar
```

这两个参数的作用是：

*   `is_cache_enhanced_class=true`：告诉SkyWalking探针，把已经增强过的类的字节码“缓存”起来。
*   `class_cache_mode=MEMORY`：指定将缓存存放在内存中（也可选择`FILE`存到磁盘），以便快速读取。

开启后的原理：

当Arthas第二次请求增强同一个类时，SkyWalking探针会从缓存中找到上一次增强后的字节码，直接返回。这避免了为同一个类生成两套不一致的代码，Arthas的修改就能在此基础上顺利进行，从而解决了冲突。