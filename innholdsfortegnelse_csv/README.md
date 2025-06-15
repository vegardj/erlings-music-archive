# CSV export of `Innholdsfortegnelse.xlsx`

This folder contains one UTF‑8 encoded CSV for **each worksheet** in the original Norwegian Excel file.

File name pattern: `<worksheet_name>.csv` (spaces and special chars replaced by underscore).

Example:

* `Eldre_popul_rmusikk.csv`
* `Eldre_klassisk.csv`
* …

## How to use with lovable.dev

1. Push the entire `innholdsfortegnelse_csv` folder (or the ZIP) to your GitHub repo.
2. From your migration/ETL script, load each CSV with `COPY` or `pandas.read_csv`.
3. Map the raw columns to the target tables (`work`, `person`, …) per the schema spec.

All files are UTF‑8 and have header rows exactly as found in Excel.

Enjoy!