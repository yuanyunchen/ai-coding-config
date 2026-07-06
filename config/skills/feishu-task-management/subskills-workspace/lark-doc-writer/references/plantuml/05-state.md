## 6. 状态图（State Diagram）

### 6.1 基础状态

```plantuml
@startuml
[*] --> State1
State1 --> [*]
State1 : this is a string
State1 : this is another string

State1 -> State2
State2 --> [*]
@enduml
```

**关键**：`[*]` 表示起点和终点。

### 6.2 复杂（嵌套）状态

```plantuml
@startuml
[*] --> NotShooting

state NotShooting {
    [*] --> Idle
    Idle --> Configuring : EvConfig
    Configuring --> Idle : EvConfig
}

state Configuring {
    [*] --> NewValueSelection
    NewValueSelection --> NewValuePreview : EvNewValue
    NewValuePreview --> NewValueSelection : EvNewValueRejected

    state NewValuePreview {
        State1 -> State2
    }
}
@enduml
```

### 6.3 子状态间连接

```plantuml
@startuml
state A {
    state X {
    }
    state Y {
    }
}

state B {
    state Z {
    }
}

X --> Z
Z --> Y
@enduml
```

### 6.4 长状态名

```plantuml
@startuml
[*] -> State1
State1 --> State2 : Succeeded
State1 --> [*] : Aborted
State2 --> State3 : Succeeded

state State3 {
    state "Accumulate Enough Data\nLong State Name" as long1
    long1 : Just a test
    [*] --> long1
    long1 --> long1 : New Data
    long1 --> ProcessData : Enough Data
}

State3 --> State3 : Failed
State3 --> [*] : Succeeded / Save Result
@enduml
```

### 6.5 历史状态

```plantuml
@startuml
[*] -> State1
State1 --> State2 : Succeeded

state State3 {
    state "Accumulate Enough Data" as long1
    [*] --> long1
    long1 --> ProcessData : Enough Data
    State2 --> [H]: Resume
}

State3 --> State2 : Pause
State2 --> State3[H*]: DeepResume
State3 --> [*] : Succeeded
@enduml
```

- `[H]` 浅层历史状态
- `[H*]` 深层历史状态

### 6.6 分支状态（Fork/Join）

```plantuml
@startuml
state fork_state <<fork>>
[*] --> fork_state
fork_state --> State2
fork_state --> State3

state join_state <<join>>
State2 --> join_state
State3 --> join_state
join_state --> State4
State4 --> [*]
@enduml
```

### 6.7 并发状态

**水平分割**（`--`）：

```plantuml
@startuml
[*] --> Active

state Active {
    [*] -> NumLockOff
    NumLockOff --> NumLockOn : EvNumLockPressed
    NumLockOn --> NumLockOff : EvNumLockPressed
    --
    [*] -> CapsLockOff
    CapsLockOff --> CapsLockOn : EvCapsLockPressed
    CapsLockOn --> CapsLockOff : EvCapsLockPressed
    --
    [*] -> ScrollLockOff
    ScrollLockOff --> ScrollLockOn : EvScrollLockPressed
    ScrollLockOn --> ScrollLockOff : EvScrollLockPressed
}
@enduml
```

**竖直分割**（`||`）：

```plantuml
@startuml
[*] --> Active

state Active {
    [*] -> NumLockOff
    NumLockOff --> NumLockOn : EvNumLockPressed
    NumLockOn --> NumLockOff : EvNumLockPressed
    ||
    [*] -> CapsLockOff
    CapsLockOff --> CapsLockOn : EvCapsLockPressed
    CapsLockOn --> CapsLockOff : EvCapsLockPressed
}
@enduml
```

### 6.8 选择结点

```plantuml
@startuml
state "Req(Id)" as ReqId <<sdlreceive>>
state "Minor(Id)" as MinorId
state "Major(Id)" as MajorId

state c <<choice>>

Idle --> ReqId
ReqId --> c
c --> MinorId : [Id <= 10]
c --> MajorId : [Id > 10]
@enduml
```

### 6.9 入口/出口结点

```plantuml
@startuml
state Somp {
    state entry1 <<entryPoint>>
    state entry2 <<entryPoint>>
    state sin
    entry1 --> sin
    entry2 -> sin
    sin -> sin2
    sin2 --> exitA <<exitPoint>>
}

[*] --> entry1
exitA --> Foo
Foo1 -> entry2
@enduml
```

### 6.10 引脚结点

```plantuml
@startuml
state Somp {
    state entry1 <<inputPin>>
    state entry2 <<inputPin>>
    state sin
    entry1 --> sin
    entry2 -> sin
    sin -> sin2
    sin2 --> exitA <<outputPin>>
}

[*] --> entry1
exitA --> Foo
Foo1 -> entry2
@enduml
```

### 6.11 扩展结点

```plantuml
@startuml
state Somp {
    state entry1 <<expansionInput>>
    state entry2 <<expansionInput>>
    state sin
    entry1 --> sin
    entry2 -> sin
    sin -> sin2
    sin2 --> exitA <<expansionOutput>>
}

[*] --> entry1
exitA --> Foo
Foo1 -> entry2
@enduml
```

### 6.12 完整版型示例

```plantuml
@startuml
state start1  <<start>>
state choice1 <<choice>>
state fork1   <<fork>>
state join2   <<join>>
state end3    <<end>>

[*]     --> choice1 : from start\nto choice
start1  --> choice1 : from start stereo\nto choice

choice1 --> fork1   : from choice\nto fork
choice1 --> join2   : from choice\nto join
choice1 --> end3    : from choice\nto end stereo

fork1   ---> State1 : from fork\nto state
fork1   --> State2  : from fork\nto state

State2  --> join2   : from state\nto join
State1  --> [*]     : from state\nto end

join2   --> [*]     : from join\nto end
@enduml
```

### 6.13 箭头方向

```plantuml
@startuml
[*] -up-> First
First -right-> Second
Second --> Third
Third -left-> Last
@enduml
```

**注意**：不支持缩写形式（如 `-d-`、`-do-`），必须写完整 `-down->`。

### 6.14 注释

```plantuml
@startuml
[*] --> Active
Active --> Inactive

note left of Active : this is a short\nnote

note right of Inactive
    A note can also
    be defined on
    several lines
end note
@enduml
```

**浮动注释**：

```plantuml
@startuml
state foo
note "This is a floating note" as N1
@enduml
```

**嵌套状态注释**：

```plantuml
@startuml
[*] --> NotShooting

state "Not Shooting State" as NotShooting {
    state "Idle mode" as Idle
    state "Configuring mode" as Configuring
    [*] --> Idle
    Idle --> Configuring : EvConfig
    Configuring --> Idle : EvConfig
}

note right of NotShooting : This is a note on a composite state
@enduml
```

### ⚠️ 状态图不支持的语法

| 语法 | 状态 |
|------|------|
| `hide empty description` | ❌ 不支持 |
| `note on link` 箭头注释 | ❌ 降级为浮动注释 |
| 箭头颜色/风格 | ❌ 开发中 |
| 箭头方向缩写 (`-d-`) | ❌ 必须写完整 |
| 外观样式参数 | ❌ 不支持 |

---

