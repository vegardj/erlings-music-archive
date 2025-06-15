# CSV export of `Innholdsfortegnelse.xlsx` (with hyperlinks)

This directory contains one UTF‑8 CSV for **each worksheet** in the original Excel workbook.

**Hyperlink handling**

If a cell in the original sheet had an Excel hyperlink, the export keeps the visible text in the original column and
adds a new sibling column named `<column>_link` that stores the underlying URL.

Example:

| title      | title_link                     |
|------------|--------------------------------|
| Gavotte    | https://example.com/score.pdf  |

Blank cells indicate there was no hyperlink.

---