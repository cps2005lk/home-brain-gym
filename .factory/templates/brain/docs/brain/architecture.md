# Architecture

## Parts

```mermaid
flowchart LR
  user[User] --> app[App] --> store[(Storage)]
```

<One line per part: what it does and where its code is.>

## Data flow

<Where data comes in, where it is stored, where it goes out.>

## Data model

```mermaid
erDiagram
  PARENT ||--o{ CHILD : has
```

<Rules the diagram can't show, such as who may read what.>
