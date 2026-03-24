# Roadmap

## Known Limitations

- Comment lines beginning with `#` are ignored globally during parsing.
- Because of that rule, an `@table` row whose full trimmed text starts with `#` will currently be treated as a comment instead of data.
- Plot validation currently only sees declared table columns. It does not yet account for future computed columns from `@compute`.

## Follow-up Work

- Refine comment handling for `@table` so comment support does not conflict with string data that begins with `#`.
- Add a syntax analyzer layer on top of the current file interface.
- Reintroduce compiler and adapter layers after the file interface stabilizes.
