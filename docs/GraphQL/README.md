# GraphQL

一種相較於傳統RESTful API的新的前後端溝通模式，使用類似於json的一種新式語法來獲取資源。

(功能實驗中)


## Scalar Type
* Int: 32位有號整數
* Float: 單精度浮點數
* String: UTF-8字串
* Boolean: true/false

## Object Type
```
type Article {
  id: ID
  text: String
}
```

## Operation
* query
* mutation
* subscription

## ref
[GraphQL](https://graphql.org/learn/)  
[How To GraphQL](https://www.howtographql.com/)  
https://wehavefaces.net/graphql-shorthand-notation-cheatsheet-17cd715861b6