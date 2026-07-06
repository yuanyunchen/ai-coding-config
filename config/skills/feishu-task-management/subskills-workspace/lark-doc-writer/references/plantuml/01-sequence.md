## 2. 时序图（Sequence Diagram）

### 2.1 基础消息连线

```plantuml
@startuml
Alice -> Bob: 认证请求
Bob --> Alice: 认证响应

Alice -> Bob: 另一个请求
Alice <-- Bob: 另一个响应
@enduml
```

**箭头规则**：
| 语法 | 含义 |
|------|------|
| `->` | 实线，向右箭头 |
| `-->` | 虚线，向右箭头 |
| `<-` | 实线，向左箭头 |
| `<--` | 虚线，向左箭头 |

### 2.2 声明参与者

```plantuml
@startuml
participant "用户服务" as UserSvc
actor 用户 as User
database "数据库" as DB
entity "缓存" as Cache
queue "消息队列" as MQ

User -> UserSvc : 登录请求
UserSvc -> DB : 查询用户
UserSvc -> Cache : 写入缓存
UserSvc -> MQ : 发送事件
@enduml
```

**支持的参与者类型**：`participant`、`actor`、`boundary`、`control`、`entity`、`database`、`collections`、`queue`

**注意**：
- 支持 `as` 别名：`actor "显示名称" as 别名`
- 支持 `order` 关键词控制显示顺序
- 参与者名含非字母字符时需要双引号
- 参与者形状自定义暂不支持（画板统一展示）

### 2.3 箭头样式

```plantuml
@startuml
Bob -> Alice : 实线箭头
Bob ->> Alice : 实线开放箭头
Bob ->o Alice : 实线圆圈箭头
Bob -x Alice : 实线叉号箭头
Bob <-> Alice : 双向箭头
Bob <<->> Alice : 双向开放箭头
@enduml
```

### 2.4 消息序列编号

```plantuml
@startuml
autonumber
Bob -> Alice : 请求1
Bob <- Alice : 响应1

autonumber 15
Bob -> Alice : 请求2
Bob <- Alice : 响应2

autonumber 40 10
Bob -> Alice : 请求3
Bob <- Alice : 响应3
@enduml
```

**语法**：
- `autonumber` — 从 1 开始，步长 1
- `autonumber N` — 从 N 开始，步长 1
- `autonumber N M` — 从 N 开始，步长 M

### 2.5 组合消息（片段）

```plantuml
@startuml
Alice -> Bob: 认证请求

alt 成功情况
    Bob -> Alice: 认证接受
else 某种失败情况
    Bob -> Alice: 认证失败
    group 我自己的标签
        Alice -> Log : 开始记录攻击日志
        loop 1000次
            Alice -> Bob: DNS 攻击
        end
        Alice -> Log : 结束记录攻击日志
    end
else 另一种失败
    Bob -> Alice: 请重复
end
@enduml
```

**支持的片段关键词**：`alt/else`、`opt`、`loop`、`par`、`break`、`critical`、`group`

**限制**：不支持次级分组标签（`group 标签 [次级标签]` 中次级标签会被降级忽略）

### 2.6 注释

```plantuml
@startuml
Alice -> Bob : hello
note left: 这是左侧注释

Bob -> Alice : ok
note right: 这是右侧注释

Bob -> Bob : 我在思考
note left
    注释可以
    写成多行
end note

note right of Alice: 显示在 Alice 右侧
note over Alice: 显示在 Alice 上方
note over Alice, Bob: 横跨多个参与者的注释
@enduml
```

### 2.7 分割符与延迟

```plantuml
@startuml
== 初始化阶段 ==

Alice -> Bob: 认证请求
Bob --> Alice: 认证响应

== 业务处理阶段 ==

Alice -> Bob: 另一个请求
...
Bob --> Alice: 响应
...5分钟后...
Bob --> Alice: 再见！
@enduml
```

### 2.8 生命线激活与撤销

```plantuml
@startuml
participant User
participant "服务A" as A
participant "服务B" as B
participant "服务C" as C

User -> A: DoWork
activate A

A -> B: 创建请求
activate B

B -> C: DoWork
activate C
C --> B: WorkDone
destroy C

B --> A: RequestCreated
deactivate B

A -> User: Done
deactivate A
@enduml
```

**快捷语法**：
- `++` 激活
- `--` 撤销
- `**` 创建
- `!!` 销毁

```plantuml
@startuml
alice -> bob ++ : hello
bob -> bob ++ : self call
bob -> bib ++ : hello
bob -> george ** : create
return done
return rc
bob -> george !! : delete
return success
@enduml
```

**自动激活**：

```plantuml
@startuml
autoactivate on
alice -> bob : hello
bob -> bob : self call
bill -> bob : hello from thread 2
bob -> george ** : create
return done in thread 2
return rc
bob -> george !! : delete
return success
@enduml
```

### 2.9 引用

```plantuml
@startuml
participant Alice
actor Bob

ref over Alice, Bob : init

Alice -> Bob : hello

ref over Bob
    This can be on
    several lines
end ref
@enduml
```

### 2.10 包裹参与者

```plantuml
@startuml
box "内部服务" #LightBlue
    participant Bob
    participant Alice
end box
participant Other

Bob -> Alice : hello
Alice -> Other : hello
@enduml
```

### 2.11 进入/发出消息

```plantuml
@startuml
participant Alice
participant Bob

[-> Bob : 外部发入消息
Bob ->] : 发出外部消息
[<- Bob : 发出左侧消息
Bob <-] : 接收右侧消息
@enduml
```

### 2.12 自身消息与换行

```plantuml
@startuml
Alice -> Alice: 这是一个自身消息\n它也展示了\n多行文本
@enduml
```

### 2.13 空间控制

```plantuml
@startuml
Alice -> Bob: message 1
Bob --> Alice: ok
|||
Alice -> Bob: message 2
Bob --> Alice: ok
||45||
Alice -> Bob: message 3
Bob --> Alice: ok
@enduml
```

### 2.14 标题

```plantuml
@startuml
title 用户认证流程
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml
```

### ⚠️ 时序图不支持的语法

| 语法 | 状态 |
|------|------|
| 页眉/页脚 (header/footer) | ❌ 不支持 |
| `newpage` 分割 | ❌ 不支持 |
| Creole/HTML 格式 | ❌ 降级处理 |
| 构造类型 `<<>>` 显示 | ❌ 降级处理 |
| `teoz` 锚点/持续时间 | ❌ 降级处理 |
| 外观样式参数 (skinparam) | ❌ 不支持（可手动调节） |
| `?` 缩短箭头 | ❌ 不支持 |

---

