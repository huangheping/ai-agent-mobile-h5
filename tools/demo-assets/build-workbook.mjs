import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";
const root = new URL("../../", import.meta.url);
const data = JSON.parse(
  await fs.readFile(new URL("content.json", import.meta.url), "utf8"),
);
const wb = Workbook.create();
for (const item of data.sheets) {
  const sheet = wb.worksheets.add(item.name);
  sheet.showGridLines = false;
  sheet.getRange("A1").values = [[item.name]];
  sheet.getRange("A2").values = [["演示数据，不对应真实客户或产品"]];
  const last = String.fromCharCode(64 + item.columns.length);
  const end = item.rows.length + 4;
  sheet.getRange(`A4:${last}${end}`).values = [item.columns, ...item.rows];
  const range = sheet.getRange(`A1:${last}${end}`);
  range.format.font = { name: "Arial", size: 11, color: "#2F3640" };
  range.format.columnWidthPx = 210;
  range.format.rowHeight = 36;
  range.format.wrapText = true;
  range.format.verticalAlignment = "center";
  sheet.getRange(`A4:${last}4`).format = {
    fill: "#2F3640",
    font: { bold: true, color: "#FFFFFF" },
    rowHeight: 30,
  };
  sheet.getRange("A1").format.font = { size: 16, bold: true };
  sheet.getRange("A2").format.font = { size: 10, color: "#727880" };
  sheet.getRange("A2").format.wrapText = false;
  for (let row = 5; row <= end; row++) {
    sheet.getRange(`A${row}:${last}${row}`).format.rowHeight = 58;
    if (row % 2)
      sheet.getRange(`A${row}:${last}${row}`).format.fill = "#F5F6F8";
  }
  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(1);
  console.log(
    (
      await wb.inspect({
        kind: "table",
        range: `'${item.name}'!A4:${last}6`,
        include: "values",
        tableMaxRows: 3,
        tableMaxCols: 6,
        maxChars: 800,
      })
    ).ndjson,
  );
  const png = await wb.render({
    sheetName: item.name,
    range: `A1:${last}${end}`,
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    new URL(
      `docs/screenshots/demo-files/sheet-${data.sheets.indexOf(item)}.png`,
      root,
    ),
    new Uint8Array(await png.arrayBuffer()),
  );
}
console.log(
  (
    await wb.inspect({
      kind: "match",
      searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!",
      options: { useRegex: true, maxResults: 10 },
      maxChars: 500,
    })
  ).ndjson,
);
await (
  await SpreadsheetFile.exportXlsx(wb)
).save(fileURLToPath(new URL("demo-files/plan-comparison.xlsx", root)));
await fs.writeFile(
  new URL("demo-files/excel-preview.json", root),
  JSON.stringify(data.sheets),
);
