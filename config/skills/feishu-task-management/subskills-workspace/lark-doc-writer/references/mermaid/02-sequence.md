# 时序图 Sequence Diagram

> 适用于：服务交互、API 调用链、用户操作流程、协议交互。

## 语法要点

```
sequenceDiagram
    participant A as 显示名
    A->>B: 同步消息
    B-->>A: 返回消息
    A-)B: 异步消息
```

- `->>` 实线箭头（同步请求）
- `-->>` 虚线箭头（返回/响应）
- `-)` 开放箭头（异步）
- `--x` 失败/拒绝
- `Note over A,B: 说明文字`
- `alt` / `opt` / `loop` / `par` 控制块

## 示例 1：API 调用链

```mermaid
sequenceDiagram
    participant U as 用户
    participant GW as API 网关
    participant AUTH as 认证服务
    participant SVC as 业务服务
    participant DB as 数据库

    U->>GW: POST /api/order
    GW->>AUTH: 校验 Token
    AUTH-->>GW: Token 有效
    GW->>SVC: 创建订单
    SVC->>DB: INSERT order
    DB-->>SVC: 写入成功
    SVC-->>GW: 订单创建成功
    GW-->>U: 200 OK
```

## 示例 2：条件分支

```mermaid
sequenceDiagram
    participant U as 用户
    participant SVC as 订单服务
    participant PAY as 支付服务
    participant DB as 数据库

    U->>SVC: 提交订单
    SVC->>DB: 创建订单记录
    
    alt 库存充足
        SVC->>PAY: 发起支付
        PAY-->>SVC: 支付成功
        SVC-->>U: 订单确认
    else 库存不足
        SVC-->>U: 库存不足，请稍后重试
    end
```

## 示例 3：循环 + 并行

```mermaid
sequenceDiagram
    participant PROD as 生产者
    participant MQ as 消息队列
    participant C1 as 消费者A
    participant C2 as 消费者B

    loop 每 100ms
        PROD->>MQ: 发送消息
    end
    
    par 并行消费
        MQ->>C1: 消费消息
        C1-->>MQ: ACK
    and
        MQ->>C2: 消费消息
        C2-->>MQ: ACK
    end
```

## 配色技巧

时序图不支持 `classDef`，但可通过 `autonumber` 和 `Note` 增强可读性：

```mermaid
sequenceDiagram
    autonumber
    participant C as 客户端
    participant S as 服务端
    C->>S: 请求
    Note over C,S: TLS 加密传输
    S-->>C: 响应
```

## 常见错误

| 错误 | 正确 |
|------|------|
| `A->B:` 缺少 `>` | `A->>B:` |
| 中文冒号 `A->>B：消息` | 英文冒号 `A->>B: 消息` |
| participant 名含空格 | 用 `as` 别名：`participant SVC as 业务服务` |
