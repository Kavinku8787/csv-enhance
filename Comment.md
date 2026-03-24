## 意见

### 一、项目架构相关

现在项目架构有一些乱，代码都集中在index与xlsx中。 建议的架构是一个文件接口 + 一个语法静态分析器 + 一个编译器 +
一个xlsx适配器（可以使用第三方库） + 若干shared工具类，如此采用分层的结构

与此同时，项目中可以积极使用设计模式，避免一个文件/类型中包含所有代码，尽量将代码分散到不同的文件中，明确文件职责，通过依赖注入的方式使用其他文件中的类型，保持每个文件的职责单一，增强代码的可维护性和可扩展性。

先不要写其他的东西，先把文件接口做好，后续再写编译器和语法静态分析器，适配器等...。

#### 1.文件接口 File Interface：负责定义如何读取和解析输入文件。

职责：负责读取文件并将其转换为统一的内部表示形式。在这一层可以使用自顶向下，面向对象的方式设计，并提供相应的元数据来标记这些元素。

##### a.Block层

```typescript
export type SheetBlock = MetaBlock | PluginBlock | TableBlock | ComputeBlock | PlotBlock;
```

###### TableBlock层

例如以下代码负责TableBlock中的cell的值，可以抽象成以下形式：

```typescript

export type CellValue = string | number | boolean | null;

export type ScalarValue = string | number | boolean | null;

export type ValueType = "string" | "number" | "boolean" | "null";

```

可以抽象成

```typescript
//type名称可以改
export type DataCellValueType =
    { type: "string"; value: string; }
    | { type: "number"; value: number; }
    | { type: "boolean"; value: boolean; }
    | { type: "null"; value: null; }

```

除此之外，也没有必要过度封装

例如

```typescript
{
    type: "number";
    value: number;
}
```

没有必要抽象成

```typescript
class NumberCell {
    type: "number";
    value: number;
    decimalPlaces: number;
}
```

所有数据均忠实于原始文件即可，原始文件 3.1415=> { type: "number"; value: 3.1415; }，不需要``decimalPlaces``来表示保留位数。


