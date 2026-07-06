## 5. ER图 / 对象图（Object Diagram）

### 5.1 对象定义

```plantuml
@startuml
object 对象1
object "第 2 个对象" as o2
@enduml
```

### 5.2 对象关系

```plantuml
@startuml
object Object01
object Object02
object Object03
object Object04

Object01 <|-- Object02
Object03 *-- Object04
Object03 o-- "4" Object04
Object01 .. Object02 : some labels
@enduml
```

### 5.3 添加属性

```plantuml
@startuml
object user
user : name = "Dummy"
user : id = 123

object user2 {
    name = "Dummy"
    id = 123
}
@enduml
```

### 5.4 关联对象（Diamond）

```plantuml
@startuml
object o1
object o2
diamond dia
object o3

o1 --> dia
o2 --> dia
dia --> o3
@enduml
```

### 5.5 Map 表格

```plantuml
@startuml
object London

map CapitalCity {
    China *-> Beijing
    UK => London
    USA => Washington
    Germany => Berlin
}
@enduml
```

### 5.6 Package 嵌套

```plantuml
@startuml
package foo {
    object baz
}

package bar {
    map A {
        b *-> foo.baz
        c =>
    }
}

A::c --> foo
@enduml
```

### 5.7 JSON 数据格式

```plantuml
@startuml
json JSON {
    "fruit": "Apple",
    "size": "Large",
    "color": ["Red", "Green"]
}
@enduml
```

---

