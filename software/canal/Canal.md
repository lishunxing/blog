# Canal

Canal 是阿里巴巴开源的 MySQL 增量日志订阅和消费组件，通过模拟 MySQL slave 节点来解析 binlog。以下是在 Docker 中部署 Canal 的完整流程。

## 一、环境准备

#### 1.1 MySQL 开启 binlog

Canal 正常工作需要 MySQL 开启 binlog 并设置为 ROW 格式。

在 MySQL 配置文件（my.cnf 或 my.ini）的 `[mysqld]` 段添加：

```ini
[mysqld]
server-id = 1 # 配置MySQL Id 不要和 Canal 的 slaveId重复
log-bin = mysql-bin # 开启binlog
binlog-format = ROW # 选择ROW模式
binlog_row_image = FULL # 选择FULL模式同步
```

直接替换Docker内MySQL 配置文件

```bash
# 1. 在宿主机创建正确的配置文件
cat > /tmp/mysql_correct.cnf << 'EOF'
[mysqld]
pid-file	= /var/run/mysqld/mysqld.pid
socket		= /var/run/mysqld/mysqld.sock
datadir		= /var/lib/mysql
#log-error	= /var/log/mysql/error.log
# By default we only accept connections from localhost
#bind-address	= 127.0.0.1
# Disabling symbolic-links is recommended to prevent assorted security risks
symbolic-links=0

# Binlog 配置
server-id = 1
log-bin = mysql-bin
binlog-format = ROW
binlog_row_image = FULL

# 慢查询配置
slow_query_log = ON
slow_query_log_file = /var/lib/mysql/slow-query.log
long_query_time = 1
log_queries_not_using_indexes = ON
log_slow_admin_statements = ON
EOF

# 2. 覆盖容器内的配置文件（容器即使停止状态也能操作）
docker cp /tmp/mysql_correct.cnf mysql:/etc/mysql/mysql.conf.d/mysqld.cnf

# 3. 重启容器
docker restart mysql

# 4. 查看日志确认启动成功
docker logs mysql --tail 20
```



重启 MySQL 后验证配置：

```sql
SHOW VARIABLES LIKE 'log_bin';        -- 应为 ON
SHOW VARIABLES LIKE 'binlog_format%'; -- 应为 ROW
```



#### 1.2 创建 Canal 专用数据库用户

```sql
CREATE USER 'canal'@'%' IDENTIFIED BY 'canal';
GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'canal'@'%';
FLUSH PRIVILEGES;
```



#### 1.3 拉取 Canal 镜像

```bash
# 拉取最新稳定版（v1.1.8）
docker pull canal/canal-server:v1.1.8

# 或拉取最新版（不推荐生产环境）
docker pull canal/canal-server:latest
```

#### 1.4 一键创建并启动 Canal 容器

```bash
# 1. 创建配置目录
mkdir -p /data/docker/canal/{conf,logs}

# 2. 生成默认配置文件（从临时容器复制）
docker run --rm canal/canal-server:v1.1.8 cat /home/admin/canal-server/conf/canal.properties > /data/docker/canal/conf/canal.properties
docker run --rm canal/canal-server:v1.1.8 cat /home/admin/canal-server/conf/example/instance.properties > /data/docker/canal/conf/instance.properties

# 3. 启动 Canal 容器（挂载配置和日志）
docker run -d \
  --name canal \
  --restart unless-stopped \
  -p 11111:11111 \
  -v /data/docker/canal/conf/canal.properties:/home/admin/canal-server/conf/canal.properties \
  -v /data/docker/canal/conf/instance.properties:/home/admin/canal-server/conf/example/instance.properties \
  -v /data/docker/canal/logs:/home/admin/canal-server/logs \
  -e canal.instance.master.address=192.168.1.31:3306 \
  -e canal.instance.dbUsername=canal \
  -e canal.instance.dbPassword=canal \
  -e canal.destinations=example \
  canal/canal-server:v1.1.8
```



## 二、集成Spring Boot

这里Spring Boot版本是 2.3.12.RELEASE, 新建了canal-service进行监听信息

### 1. 引入项目依赖

在 `pom.xml` 文件中，添加 `canal-spring-boot-starter` 依赖。它会自动引入所需的官方 Canal 客户端库。

```xml
<dependency>
    <groupId>top.javatool</groupId>
    <artifactId>canal-spring-boot-starter</artifactId>
    <version>1.2.1-RELEASE</version>
</dependency>

<!-- 关键：引入 JPA 注解，用于字段映射 （Spring Boot 2.x 使用 javax 包）-->
<dependency>
    <groupId>javax.persistence</groupId>
    <artifactId>javax.persistence-api</artifactId>
    <version>2.2</version>
</dependency>
```

### 2. 配置 Canal 连接信息

在 `application.yml` 配置文件中，添加 Canal 客户端的基本配置。`destination` 通常是你之前在 Canal Server 端配置的实例名称（例如 `example`）。

```yaml
server:
  port: 8082
spring:
  application:
    name: canal-service
  cloud:
    nacos:
      config:
        server-addr: 192.168.1.xx:8848
        file-extension: yaml
        username: nacos
        password: xxx
      discovery:
        server-addr: 192.168.1.xx:8848
        username: nacos
        password: xxx

canal:
  server: 192.168.1.xx:11111
  destination: example
  username:                           # 如有认证可填，通常为空
  password:                           # 如有认证可填，通常为空
```

### 3. 定义实体类并完成字段映射

创建一个实体类，并通过 JPA 注解明确告诉 `top.javatool` 数据库字段和 Java 属性之间的对应关系。

```java
import lombok.Data;
import javax.persistence.Column;
import javax.persistence.Id;

@Data
public class AdItems {
    // 使用 @Id 注解标记主键，框架需要通过主键来确定数据
    @Id
    private Long id;
    
    private String name;
    private String type;
    
    // ★★★ 关键修改：通过 @Column 注解明确指定数据库字段名 ★★★
    @Column(name = "sku_id")
    private String skuId;
    
    private Integer sort;
    
    // 假设数据库有 create_time 字段，也可以这样映射
    // @Column(name = "create_time")
    // private Date createTime;
}
```

### 4. 编写数据监听器

定义一个 Spring Bean，并实现 `EntryHandler<T>` 接口。泛型 `T` 就是你上面定义的实体类。框架会自动将 Canal 捕获的变更数据解析为你的实体对象。

```java
package cn.lishunxing.mall.canal.listener;

import cn.lishunxing.mall.goods.api.entity.AdItems;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import top.javatool.canal.client.annotation.CanalTable;
import top.javatool.canal.client.handler.EntryHandler;

@Slf4j
@Component
@CanalTable(value = "ad_items")
public class AdItemsCanalListener implements EntryHandler<AdItems> {

    @Override
    public void insert(AdItems adItems) {
        log.info("=== Canal监听 INSERT - ad_items表 ===");
        log.info("主键ID: {}, 广告名称: {}, 类型: {}, SKU: {}, 排序: {}",
                adItems.getId(), adItems.getName(), adItems.getType(),
                adItems.getSkuId(), adItems.getSort());
    }

    @Override
    public void update(AdItems before, AdItems after) {
        log.info("=== Canal监听 UPDATE - ad_items表 ===");
        log.info("变更前: 主键ID: {}, 广告名称: {}, 类型: {}, SKU: {}, 排序: {}",
                before.getId(), before.getName(), before.getType(),
                before.getSkuId(), before.getSort());
        log.info("变更后: 主键ID: {}, 广告名称: {}, 类型: {}, SKU: {}, 排序: {}",
                after.getId(), after.getName(), after.getType(),
                after.getSkuId(), after.getSort());
    }

    @Override
    public void delete(AdItems adItems) {
        log.info("=== Canal监听 DELETE - ad_items表 ===");
        log.info("主键ID: {}, 广告名称: {}, 类型: {}, SKU: {}, 排序: {}",
                adItems.getId(), adItems.getName(), adItems.getType(),
                adItems.getSkuId(), adItems.getSort());
    }
}
```

### 5.启动项目

项目启动后, 修改adItems表, 输出如下

![image-20260509185645447](http://file.lishunxing.cn/typora-images/image-20260509185645447.png)

