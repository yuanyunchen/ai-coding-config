# 甘特图 Gantt

> 适用于：项目排期、里程碑计划、版本规划、任务时间线。

## 语法要点

```
gantt
    title 项目标题
    dateFormat YYYY-MM-DD
    axisFormat %m/%d

    section 阶段名
    任务名 :a1, 2025-01-01, 7d
    任务名 :a2, after a1, 5d
    里程碑 :milestone, a3, 2025-01-20, 0d
```

- `dateFormat` 日期格式
- `axisFormat` 轴显示格式
- `section` 分组
- `after ID` 依赖前置任务
- `0d` 表示里程碑
- 状态：`active` / `done` / `crit`（关键路径）

## 示例：项目排期

```mermaid
gantt
    title 产品发布计划
    dateFormat YYYY-MM-DD
    axisFormat %m/%d

    section 需求
    需求分析       :req, 2025-07-01, 5d
    需求评审       :milestone, req_review, 2025-07-06, 0d

    section 开发
    前端开发       :fe, after req, 10d
    后端开发       :be, after req, 12d
    联调           :int, after fe, 3d

    section 测试
    功能测试       :test, after int, 5d
    性能测试       :perf, after int, 3d
    上线评审       :milestone, go_review, after test, 0d

    section 发布
    灰度发布       :gray, after go_review, 2d
    全量发布       :milestone, release, after gray, 0d
```

## 常见错误

| 错误 | 正确 |
|------|------|
| 日期格式不一致 | 统一用 `YYYY-MM-DD` |
| 里程碑用非零天数 | 里程碑 `0d` |
| 缺少 `dateFormat` | 必须声明 |
