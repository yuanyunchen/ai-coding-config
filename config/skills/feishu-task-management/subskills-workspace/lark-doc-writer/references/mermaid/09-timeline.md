# 时间线 Timeline

> 适用于：项目里程碑、版本历史、发展历程、事件回顾、路线图。

## 语法要点

```
timeline
    title 标题
    section 阶段1
        事件1 : 描述1
        事件2 : 描述2
    section 阶段2
        事件3 : 描述3
```

- `title` 可选标题
- `section` 阶段分组（年份/季度/阶段名）
- 每行事件用 ` : ` 分隔（事件名 : 描述）
- 同一 section 下可多行
- 不支持 `classDef` 配色
- 不支持连线/箭头

## 示例 1：产品发展历程

```mermaid
timeline
    title 产品发展历程
    section 2023
        Q1 : 需求调研 : 原型设计
        Q2 : MVP 开发 : 内测上线
    section 2024
        Q1 : 公测发布 : 用户破万
        Q2 : 功能迭代 : 付费上线
    section 2025
        Q1 : 国际化 : 多语言支持
```

## 示例 2：项目里程碑

```mermaid
timeline
    title 项目关键里程碑
    section 启动阶段
        项目立项 : 确定目标和范围
        团队组建 : 招聘核心成员
    section 研发阶段
        Alpha 版本 : 核心功能完成
        Beta 版本 : 公测反馈收集
    section 发布阶段
        RC 版本 : 回归测试通过
        正式发布 : v1.0 上线
```

## 示例 3：技术演进

```mermaid
timeline
    title 技术架构演进
    section 单体架构
        2020 : Spring Boot 单体 : MySQL 主从
    section 微服务化
        2021 : 服务拆分 : 引入 Kafka
        2022 : 容器化部署 : K8s 集群
    section 云原生
        2023 : Service Mesh : 可观测性建设
        2024 : Serverless : 边缘计算
```

## 常见错误

| 错误 | 正确 |
|------|------|
| 事件描述用中文冒号 `：` | 英文冒号 ` : ` |
| section 后无空行 | section 下直接写事件 |
| 试图用 classDef 配色 | 时间线不支持自定义配色 |
| 多个事件用逗号分隔 | 每个事件独立一行 |
| 缺少 `title` | 建议始终添加标题 |
