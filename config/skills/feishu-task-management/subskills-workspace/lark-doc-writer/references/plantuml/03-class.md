## 4. 类图（Class Diagram）

### 4.1 元素声明

```plantuml
@startuml
abstract        abstract
abstract class  "abstract class"
annotation      annotation
class           class
entity          entity
enum            enum
exception       exception
interface       interface
metaclass       metaclass
protocol        protocol
stereotype      stereotype
struct          struct
@enduml
```

### 4.2 类关系

```plantuml
@startuml
Class01 <|-- Class02 : 继承
Class03 *-- Class04 : 组合
Class05 o-- Class06 : 聚合
Class07 .. Class08 : 虚线
Class09 -- Class10 : 实线

Class11 <|.. Class12 : 实现
Class13 --> Class14 : 依赖
Class15 ..> Class16 : 虚线依赖
@enduml
```

**关系符号速查**：

| 符号 | 含义 |
|------|------|
| `<\|--` | 继承（Extension） |
| `*--` | 组合（Composition） |
| `o--` | 聚合（Aggregation） |
| `-->` | 关联箭头 |
| `--` | 关联 |
| `..>` | 依赖（虚线箭头） |
| `<\|..` | 实现（虚线三角） |
| `..\|>` | 实现（虚线三角，反向写法） |
| `}--` | 映射 |
| `+--` | 嵌套 |
| `^--` | 定义 |

**注意**：用 `..` 代替 `--` 会显示虚线。

### 4.3 关系标签与基数

```plantuml
@startuml
类01 "1" *-- "many" 类02 : 包含
类03 o-- 类04 : 聚合
类05 --> "1" 类06
@enduml
```

### 4.4 添加属性和方法

```plantuml
@startuml
class Dummy {
    String data
    void methods()
}

class Flight {
    flightNumber : Integer
    departureTime : Date
}

class Object
Object : equals()

class ArrayList
ArrayList : Object[] elementData
ArrayList : size()
@enduml
```

**强制字段/方法**：

```plantuml
@startuml
class Dummy {
    {field} A field (despite parentheses)
    {method} Some method
}
@enduml
```

### 4.5 可见性修饰

| 符号 | 含义 |
|------|------|
| `-` | private |
| `+` | public |
| `#` | protected |
| `~` | package private |

```plantuml
@startuml
class Dummy {
    -field1
    #field2
    ~method1()
    +method2()
}
@enduml
```

### 4.6 抽象与静态

```plantuml
@startuml
class Dummy {
    {static} String id
    {abstract} void methods()
}
@enduml
```

### 4.7 泛型

```plantuml
@startuml
class Foo<? extends Element> {
    int size()
}
Foo *- Element
@enduml
```

### 4.8 包（Package）

```plantuml
@startuml
package "Classic Collections" #DDDDDD {
    Object <|-- ArrayList
}

package net.sourceforge.plantuml {
    Object <|-- Demo1
    Demo1 *- Demo2
}
@enduml
```

**包样式**：

```plantuml
@startuml
package foo1 <<Node>> {
    class Class1
}
package foo2 <<Rectangle>> {
    class Class2
}
package foo3 <<Folder>> {
    class Class3
}
package foo4 <<Frame>> {
    class Class4
}
package foo5 <<Cloud>> {
    class Class5
}
package foo6 <<Database>> {
    class Class6
}
@enduml
```

### 4.9 备注

```plantuml
@startuml
class Object << general >>
Object <|--- ArrayList

note top of Object : In java, every class\nextends this one.

note "This is a floating note" as N1
note "This note is connected\nto several objects." as N2
Object .. N2
N2 .. ArrayList

class Foo
note left: On last defined class
@enduml
```

### 4.10 隐藏与显示控制

```plantuml
@startuml
class Dummy1 {
    +myMethods()
}

class Dummy2 {
    +hiddenMethod()
}

class Dummy3 <<Serializable>> {
    String name
}

hide members
hide <<Serializable>> circle
show Dummy1 methods
show <<Serializable>> fields
@enduml
```

### 4.11 改变箭头方向

```plantuml
@startuml
foo -left-> dummyLeft
foo -right-> dummyRight
foo -up-> dummyUp
foo -down-> dummyDown
@enduml
```

**规则**：
- 单破折号 `-` 水平方向
- 双破折号 `--` 垂直方向
- `left`, `right`, `up`, `down` 关键词强制方向

### 4.12 线样式

```plantuml
@startuml
class foo类
class bar类1
class bar类2
class bar类3

foo类 -[bold]-> bar类1
foo类 -[dashed]-> bar类2
foo类 -[dotted]-> bar类3
@enduml
```

**支持的线样式**：`bold`、`dashed`、`dotted`、`hidden`、`plain`

### ⚠️ 类图不支持的语法

| 语法 | 状态 |
|------|------|
| 分隔符 `-- .. == __` | ❌ 降级处理 |
| 属性注释（注释到属性上） | ❌ 降级为类注释 |
| 棒棒糖接口 | ❌ 不支持 |
| 关系类 | ❌ 不支持 |
| 指定标记（Spot） | ❌ 不支持 |
| 线粗细调整 | ❌ 不支持 |
| 外观样式参数 | ❌ 不支持 |

---

