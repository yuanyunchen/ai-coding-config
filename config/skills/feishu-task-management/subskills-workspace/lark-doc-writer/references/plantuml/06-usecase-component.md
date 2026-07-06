## 7. 用例图 / 组件图（UseCase / Component Diagram）

> **重要**：用例图和组件图的图形和语法可以混用。

### 7.1 用例

```plantuml
@startuml
(First usecase)
(Another usecase) as (UC2)
usecase UC3
usecase (Last\nusecase) as UC4
@enduml
```

### 7.2 角色

```plantuml
@startuml
:First Actor:
:Another\nactor: as Man2
actor Woman3
actor :Last actor: as Person1
@enduml
```

### 7.3 组件

```plantuml
@startuml
[First component]
[Another component] as Comp2
component Comp3
component [Last\ncomponent] as Comp4
@enduml
```

### 7.4 接口

```plantuml
@startuml
component A
() "First Interface"
() "Another interface" as Interf2
interface Interf3
interface "Last\ninterface" as Interf4
@enduml
```

### 7.5 声明元素类型大全

```plantuml
@startuml
actor actor
agent agent
artifact artifact
boundary boundary
card card
cloud cloud
component component
control control
database database
entity entity
file file
folder folder
frame frame
interface "interface"
node node
package package
queue queue
stack stack
rectangle rectangle
storage storage
usecase usecase
@enduml
```

### 7.6 包和嵌套元素

```plantuml
@startuml
package "Some Group" {
    HTTP - [First Component]
    [Another Component]
}

node "Other Groups" {
    FTP - [Second Component]
    [First Component] --> FTP
}

cloud {
    [Example 1]
}

database "MySql" {
    folder "This is my folder" {
        [Folder 3]
    }
    frame "Foo" {
        [Frame 4]
    }
}

[Another Component] --> [Example 1]
[Example 1] --> [Folder 3]
[Folder 3] --> [Frame 4]
@enduml
```

### 7.7 基础连接

```plantuml
@startuml
DataAccess - [First Component]
[First Component] ..> HTTP : use
@enduml
```

**连接规则**：
- `--` 实线
- `..` 虚线
- `-->` 箭头
- 横杠越多箭头越长

### 7.8 注释

```plantuml
@startuml
interface "Data Access" as DA
DA - [First Component]
[First Component] ..> HTTP : use

note left of HTTP : Web Service only
note right of [First Component]
    A note can also
    be on several lines
end note
@enduml
```

### 7.9 改变方向

```plantuml
@startuml
[Component] -left-> left
[Component] -right-> right
[Component] -up-> up
[Component] -down-> down
@enduml
```

**从左向右构图**：

```plantuml
@startuml
left to right direction
[component A] --> (Usecase 1)
[component B] --> (Usecase 2)
@enduml
```

### 7.10 端口

```plantuml
@startuml
[i]
component C {
    port p1
    portin p2
    portin p3
    portout po1
    portout po2
    portout po3
    component c1
}
[o]

i --> p1
i --> p2
i --> p3
p1 --> c1
p2 --> c1
po1 --> o
po2 --> o
po3 --> o
c1 --> po1
@enduml
```

### 7.11 UML1 / 矩形标记符

```plantuml
@startuml
skinparam componentStyle uml1

interface "Data Access" as DA
DA - [First Component]
[First Component] ..> HTTP : use
@enduml
```

```plantuml
@startuml
skinparam componentStyle rectangle

interface "Data Access" as DA
DA - [First Component]
[First Component] ..> HTTP : use
@enduml
```

### 7.12 隐藏/删除控制

```plantuml
@startuml
component C1
component C2
component C3
C1 -- C2

hide @unlinked
@enduml
```

### 7.13 JSON 数据展示

```plantuml
@startuml
allowmixing

actor     Actor
usecase   Usecase
component Component
()        Interface

json JSON {
    "fruit": "Apple",
    "size": "Large",
    "color": ["Red", "Green"]
}
@enduml
```

---

