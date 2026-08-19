# MultiReplace

MultiReplace applies a configurable list of literal search and replacement pairs to the active document.

1. Run **MultiReplace: Open Settings** from the Command Palette.
2. Add search and replacement rows and select **Save**.
3. Run **MultiReplace in Current Document** from the Command Palette or editor context menu.

Pairs are case-sensitive and applied in table order. Empty search values are ignored.

## Import and export

Use **MultiReplace: Import Entries from JSON** to append entries from a JSON file, or **MultiReplace: Export Entries to JSON** to save all configured entries. Both commands are available from the Command Palette and the MultiReplace editor context submenu.

Files use an array of search and replacement objects:

```json
[
	{
		"search": "old text",
		"replace": "new text"
	}
]
```

Exact duplicate pairs are removed while preserving the first occurrence and table order.