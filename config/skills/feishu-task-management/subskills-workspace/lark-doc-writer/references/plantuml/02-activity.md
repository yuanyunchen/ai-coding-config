## 3. 流程图 / 活动图（Activity Diagram）

### 3.1 基础活动

```plantuml
@startuml
start
:Hello world;
:这是一个定义在
多行的活动;
stop
@enduml
```

**格式**：`:活动描述;` — 冒号开始，分号结束。

### 3.2 条件判断

**if...then...else**：

```plantuml
@startuml
start

if (Graphviz installed?) then (yes)
    :process all\ndiagrams;
else (no)
    :process only
    __sequence__ and __activity__ diagrams;
endif

stop
@enduml
```

**if...is...then**：

```plantuml
@startuml
if (color?) is (red) then
    :print red;
else
    :print not red;
@enduml
```

**if...equals...then**：

```plantuml
@startuml
if (counter?) equals (5) then
    :print 5;
else
    :print not 5;
@enduml
```

### 3.3 Switch 判断

```plantuml
@startuml
start
switch (测试?)
case ( 条件 A )
    :Text 1;
case ( 条件 B )
    :Text 2;
case ( 条件 C )
    :Text 3;
case ( 条件 D )
    :Text 4;
endswitch
stop
@enduml
```

### 3.4 条件终止

```plantuml
@startuml
if (条件?) then
    :错误;
    stop
endif
:正常行为;
@enduml
```

支持 `kill` 和 `detach` 关键词：

```plantuml
@startuml
if (条件?) then
    :错误;
    kill
endif
:正常行为;
@enduml
```

### 3.5 循环

**repeat...repeat while**：

```plantuml
@startuml
start

repeat
    :读取数据;
    :生成图片;
repeat while (更多数据?)

stop
@enduml
```

**repeat 带 backward**：

```plantuml
@startuml
start

repeat :foo作为开始标注;
    :读取数据;
    :生成图片;
backward:这是一个后撤行为;
repeat while (更多数据?)

stop
@enduml
```

**while...endwhile**：

```plantuml
@startuml
start

while (data available?)
    :read data;
    :generate diagrams;
endwhile

stop
@enduml
```

**while 带标注**：

```plantuml
@startuml
while (check filesize ?) is (not empty)
    :read file;
endwhile (empty)
:close file;
@enduml
```

**break 打断循环**：

```plantuml
@startuml
start
repeat
    :测试某事;
    if (发生错误?) then (没有)
        :好的;
        break
    endif
    ->not ok;
    :弹窗错误;
repeat while (某事发生?) is (是的) not (不是)
:合并步骤;
:成功！;
stop
@enduml
```

### 3.6 并行处理

```plantuml
@startuml
start
fork
    :行为 1;
fork again
    :行为 2;
fork again
    :行为 3;
fork again
    :行为 4;
end merge
stop
@enduml
```

**end fork（带条件）**：

```plantuml
@startuml
start
fork
    :行为 A;
fork again
    :行为 B;
end fork {或}
stop
@enduml
```

### 3.7 分割处理

```plantuml
@startuml
start
split
    :A;
split again
    :B;
split again
    :C;
split again
    :a;
    :b;
end split
:D;
end
@enduml
```

### 3.8 泳道（Swimlane）⭐

```plantuml
@startuml
|Swimlane1|
start
:foo1;
|#AntiqueWhite|Swimlane2|
:foo2;
:foo3;
|Swimlane1|
:foo4;
|Swimlane2|
:foo5;
stop
@enduml
```

**泳道+条件判断**：

```plantuml
@startuml
|#pink|Actor_For_red|
start
if (color?) is (red) then
    #pink:**action red**;
    :foo1;
else (not red)
    |#lightgray|Actor_For_no_red|
    #lightgray:**action not red**;
    :foo2;
endif
|Next_Actor|
#lightblue:foo3;
:foo4;
|Final_Actor|
#palegreen:foo5;
stop
@enduml
```

### 3.9 分组 (Group/Partition)

```plantuml
@startuml
start
group 初始化分组
    :read config file;
    :init internal variable;
end group
group 运行分组
    :wait for user interaction;
    :print information;
end group
stop
@enduml
```

### 3.10 注释

```plantuml
@startuml
start
:foo1;
floating note left: 这是一个注释
:foo2;
note right
    这个注释是
    多行的
end note
stop
@enduml
```

### 3.11 箭头样式

```plantuml
@startuml
:foo1;
-> 箭头上的文字;
if (test) then
    -[#blue]->
    :foo2;
    -[#green,dashed]-> 虚线绿色箭头;
    :foo3;
else
    -[#black,dotted]->
    :foo4;
endif
-[#gray,bold]->
:foo5;
@enduml
```

**支持的箭头样式**：`dotted`（点状）、`dashed`（虚线）、`bold`（加粗）

### 3.12 无箭头连接线

```plantuml
@startuml
skinparam ArrowHeadColor none
start
:Hello world;
:This is on defined on
several lines;
stop
@enduml
```

### 3.13 SDL 规范描述语言（部分支持）

```plantuml
@startuml
:Ready;
:next(o)|
:Receiving;
split
    :nak(i)<
    :ack(o)>
split again
    :ack(i)<
    :next(o)
    on several lines|
    :i := i + 1]
    :ack(o)>
split again
    :err(i)<
    :nak(o)>
split again
    :foo/
split again
    :bar\\
split again
    :i > 5}
stop
end split
:finish;
@enduml
```

**注意**：不支持的 SDL 符号会降级为圆角矩形。

### ⚠️ 流程图不支持的语法

| 语法 | 状态 |
|------|------|
| `!pragma useVerticalIf on` 垂直/水平模式 | ❌ 不支持 |
| Creole 文本样式 | ❌ 降级处理 |
| 外观样式参数 (skinparam) | ❌ 不支持（可手动调节） |

---

