# 状态图 State Diagram

> 适用于：订单状态流转、工单生命周期、审批流程、有限状态机。

## 语法要点

```
stateDiagram-v2
    [*] --> State1
    State1 --> State2 : 事件/条件
    State2 --> [*]
```

- `[*]` 表示开始/结束
- `: 事件` 标注转换条件
- `state "显示名" as ID` 使用别名
- `note left of / right of` 添加注释

## 示例 1：订单状态机

```mermaid
stateDiagram-v2
    [*] --> Pending: 创建订单
    Pending --> Paid: 支付成功
    Pending --> Cancelled: 超时未付
    Paid --> Shipped: 发货
    Paid --> Refunding: 申请退款
    Shipped --> Completed: 确认收货
    Shipped --> Refunding: 申请退款
    Refunding --> Refunded: 退款成功
    Refunded --> [*]
    Completed --> [*]
    Cancelled --> [*]
```

## 示例 2：带子状态

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Review: 提交审核
    state Review {
        [*] --> InReview
        InReview --> Approved: 审核通过
        InReview --> Rejected: 审核驳回
        Rejected --> InReview: 重新提交
    }
    Review --> Published: 发布
    Published --> Archived: 归档
    Archived --> [*]
```

## 常见错误

| 错误 | 正确 |
|------|------|
| `stateDiagram` 旧语法 | `stateDiagram-v2` 新语法 |
| 状态名含空格 | `state "审核中" as InReview` |
| 忘记 `[*]` 起止 | 必须有开始和结束 |
