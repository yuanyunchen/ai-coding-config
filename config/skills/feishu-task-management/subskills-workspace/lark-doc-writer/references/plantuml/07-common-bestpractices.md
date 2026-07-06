## 8. 通用语法与限制

### 8.1 画板通用支持

| 功能 | 语法 | 状态 |
|------|------|------|
| 标题 | `title 标题文本` | ✅ 支持 |
| 文本换行 | `\n` | ✅ 支持 |
| 别名 | `as 别名` | ✅ 支持 |
| 注释 | `note left/right/top/bottom of` | ✅ 支持 |
| 浮动注释 | `note "text" as N1` | ✅ 支持 |
| 方向控制 | `left to right direction` | ✅ 支持 |
| 填充色 | `#颜色` | ✅ 支持 |
| JSON 数据 | `json JSON { ... }` | ✅ 支持 |
| `allowmixing` | 混合图类型 | ✅ 支持 |
| `hide/show/remove` | 元素显隐 | ✅ 支持 |

### 8.2 画板全局不支持的语法

| 功能 | 状态 |
|------|------|
| Creole 文本格式 | ❌ 降级处理 |
| HTML 内嵌标签 | ❌ 降级处理 |
| `skinparam` 外观参数（大部分） | ❌ 不支持 |
| `skinparam ArrowHeadColor none` | ✅ 例外支持 |
| `skinparam componentStyle` | ✅ 例外支持 |
| 页眉/页脚 | ❌ 不支持 |
| `newpage` 分页 | ❌ 不支持 |
| 自定义颜色/字体等样式 | ❌ 不支持（可生成后手动调节） |

### 8.3 经典样式模式

画板支持选择渲染为 PlantUML 经典（官方）样式，此模式：
- 支持 `include C4 Model` 插件
- 输出为图片模式，**不支持生成后直接编辑图形**

---

## 9. 最佳实践与常见陷阱

### 9.1 最佳实践

1. **优先使用别名**：复杂名称使用 `as` 定义别名，后续引用更简洁
2. **合理使用方向控制**：`left to right direction` 适合宽度优先的图表
3. **泳道处理复杂流程**：跨角色协作的流程优先使用管道符 `|角色名|` 定义泳道
4. **分组提升可读性**：使用 `package`、`group`、`box` 对元素分组
5. **保持代码简洁**：画板不支持大部分样式参数，不需要写 skinparam
6. **充分利用注释**：`note` 语法为关键节点添加说明

### 9.2 常见陷阱

| 陷阱 | 解决方案 |
|------|---------|
| 写了大量 skinparam 样式 | 删除所有不支持的 skinparam，生成后手动调节 |
| 使用 Creole/HTML 格式化文本 | 使用纯文本 + `\n` 换行 |
| 状态图箭头方向缩写 `-d->` | 必须写完整 `-down->` |
| 类图分隔符 `-- .. == __` 期望有分隔线 | 会降级处理，不会显示分隔线 |
| 用 journey/quadrantChart/gitGraph | 这些是 Mermaid 专属，PlantUML 不支持 |
| 期望 `note on link` 显示在箭头上 | 状态图中会降级为浮动注释 |
| 参与者形状区分 | 画板统一样式，形状差异可能不明显 |

### 9.3 图表类型选择决策树

```
用户需求是什么？
├── 系统交互/API 调用/消息传递 → 时序图 (Sequence)
├── 业务流程/审批/决策 → 流程图/活动图 (Activity)
│   └── 涉及跨角色协作 → 活动图 + 泳道 (Swimlane)
├── 数据模型/类结构 → 类图 (Class)
├── 实体关系/对象结构 → ER图/对象图 (Object)
│   └── 展示 JSON 数据 → 对象图 + json 语法
├── 状态机/生命周期 → 状态图 (State)
│   └── 并发状态 → 状态图 + 并发分隔符 (--/||)
├── 需求分析/用户故事 → 用例图 (UseCase)
├── 系统架构/模块依赖 → 组件图 (Component)
│   └── 复杂架构 → 组件图 + 嵌套 package/node/cloud
└── 头脑风暴/知识结构 → 思维导图 (MindMap)
```

### 9.4 完整示例：微服务架构图

```plantuml
@startuml
left to right direction

package "前端" {
    [Web App]
    [Mobile App]
}

cloud "API 网关" {
    [Kong Gateway]
}

package "微服务集群" {
    [用户服务]
    [订单服务]
    [支付服务]
    [通知服务]
}

database "数据层" {
    [MySQL]
    [Redis]
    [MongoDB]
}

queue "消息队列" {
    [Kafka]
}

[Web App] --> [Kong Gateway]
[Mobile App] --> [Kong Gateway]

[Kong Gateway] --> [用户服务]
[Kong Gateway] --> [订单服务]
[Kong Gateway] --> [支付服务]

[用户服务] --> [MySQL]
[用户服务] --> [Redis]
[订单服务] --> [MySQL]
[订单服务] --> [Kafka]
[支付服务] --> [MySQL]
[支付服务] --> [Kafka]

[Kafka] --> [通知服务]
[通知服务] --> [MongoDB]
@enduml
```

### 9.5 完整示例：审批流程（泳道）

```plantuml
@startuml
|申请人|
start
:提交申请;

|#AntiqueWhite|直属主管|
:审核申请;

if (是否批准?) then (批准)
    |#LightBlue|财务部|
    :审核预算;
    if (预算充足?) then (是)
        :拨付资金;
    else (否)
        |申请人|
        :修改申请金额;
        stop
    endif
else (拒绝)
    |申请人|
    :收到拒绝通知;
    stop
endif

|#LightGreen|HR部门|
:归档记录;

|申请人|
:收到批准通知;
stop
@enduml
```

### 9.6 完整示例：订单状态机

```plantuml
@startuml
[*] --> Created : 用户下单

state Created {
    [*] --> WaitingPayment
    WaitingPayment --> PaymentReceived : 支付成功
    WaitingPayment --> [*] : 支付超时
}

state Processing {
    [*] --> Picking
    Picking --> Packing : 拣货完成
    Packing --> ReadyToShip : 打包完成
}

state Shipping {
    [*] --> InTransit
    InTransit --> OutForDelivery : 到达目的城市
    OutForDelivery --> Delivered : 签收
}

Created --> Processing : 支付确认
Processing --> Shipping : 发货
Shipping --> Completed : 确认收货

state Completed
Completed --> [*]

Created --> Cancelled : 取消订单
Processing --> Refunding : 申请退款
Shipping --> Refunding : 拒收
Refunding --> Refunded : 退款完成
Refunded --> [*]
Cancelled --> [*]
@enduml
```

### 9.7 完整示例：类图（电商领域模型）

```plantuml
@startuml
package "用户域" {
    class User {
        -userId: Long
        -username: String
        -email: String
        +login()
        +register()
    }

    class Address {
        -addressId: Long
        -street: String
        -city: String
        -zipCode: String
    }

    User "1" *-- "many" Address : 拥有
}

package "订单域" {
    class Order {
        -orderId: Long
        -status: OrderStatus
        -totalAmount: BigDecimal
        +create()
        +cancel()
        +pay()
    }

    class OrderItem {
        -quantity: Integer
        -unitPrice: BigDecimal
    }

    enum OrderStatus {
        CREATED
        PAID
        SHIPPED
        COMPLETED
        CANCELLED
    }

    Order "1" *-- "many" OrderItem : 包含
    Order --> OrderStatus
}

package "商品域" {
    class Product {
        -productId: Long
        -name: String
        -price: BigDecimal
        -stock: Integer
    }

    class Category {
        -categoryId: Long
        -name: String
    }

    Product "many" --> "1" Category : 属于
}

User "1" --> "many" Order : 下单
OrderItem "many" --> "1" Product : 关联
@enduml
```

---

> **文档来源**：基于飞书画板 PlantUML 官方语法支持说明文档整理，涵盖时序图、流程图、类图、ER图、状态图、用例图、组件图全部已支持语法。
