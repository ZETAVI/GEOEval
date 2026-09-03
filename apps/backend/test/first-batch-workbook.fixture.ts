import { createHash } from "node:crypto";

import { strToU8, zipSync } from "fflate";

import type { FirstBatchWorkbookProfile } from "../src/media-supply/import/first-batch-workbook.js";

const HEADERS = [
  "层级",
  "Logo",
  "媒体平台",
  "平台别名",
  "平台分类",
  "国内/海外",
  "官方主页",
  "平台简介",
  "目录状态",
  "客户积分价",
  "Logo核验",
  "Logo来源",
  "当前供给来源（供应商）",
  "供给来源状态",
  "资源名称",
  "具体账号/频道（可空）",
  "发布方式",
  "资源状态",
  "客户展示方式",
  "内部质量档次",
  "案例链接",
  "采购价（内部）",
  "发文备注（内部）",
  "源表定位",
  "管理员状态",
];

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

export interface FirstBatchFixture {
  bytes: Uint8Array;
  profile: FirstBatchWorkbookProfile;
}

export function buildFirstBatchFixture(
  options: {
    duplicateResource?: boolean;
    formulaInResource?: boolean;
    invalidCost?: boolean;
  } = {},
): FirstBatchFixture {
  const rows = [
    rowXml(
      16,
      HEADERS.map((value, index) => textCell(index, 16, value)),
    ),
    rowXml(17, [textCell(0, 17, "海外｜1 个平台｜1 条发文资源")]),
    rowXml(18, [
      textCell(0, 18, "媒体平台"),
      textCell(2, 18, "Reuters"),
      textCell(3, 18, "路透"),
      textCell(4, 18, "海外；综合资讯；财经"),
      textCell(5, 18, "海外"),
      textCell(7, 18, "测试（平台）Ａ"),
    ]),
    rowXml(19, [
      textCell(0, 19, "当前供给来源"),
      textCell(2, 19, "Reuters"),
      textCell(12, 19, "测试供应商"),
    ]),
    resourceRow(20, 123, options.formulaInResource ?? false),
    ...(options.duplicateResource ? [resourceRow(21, 456, false)] : []),
  ];
  if (options.invalidCost) {
    rows[4] = resourceRow(20, 12.5, false);
  }

  const archive = zipSync({
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0"?><x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheets><x:sheet name="媒体平台维护台账" sheetId="1" r:id="rIdSheet" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></x:sheets></x:workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSheet" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData>${rows.join("")}</x:sheetData></x:worksheet>`,
    ),
    "xl/drawings/drawing1.xml": strToU8(
      `<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>17</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="1" cy="1"/><xdr:pic><xdr:nvPicPr/><xdr:blipFill><a:blip r:embed="rIdLogo"/></xdr:blipFill><xdr:spPr/></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`,
    ),
    "xl/drawings/_rels/drawing1.xml.rels": strToU8(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image.png"/></Relationships>`,
    ),
    "xl/media/image.png": PNG,
  });
  return {
    bytes: archive,
    profile: {
      expectedHash: sha256(archive),
      expectedLogoCount: 1,
      expectedPlatformCount: 1,
      expectedResourceCount: options.duplicateResource ? 2 : 1,
      expectedSheetName: "媒体平台维护台账",
      expectedSupplierCount: 1,
      expectedSupplierGroupCount: 1,
    },
  };
}

function resourceRow(row: number, cost: number, formula: boolean): string {
  return rowXml(row, [
    textCell(0, row, "发文资源"),
    textCell(2, row, "Reuters"),
    textCell(12, row, "测试供应商"),
    textCell(14, row, "测试资源"),
    textCell(15, row, "测试频道"),
    textCell(16, row, "首发"),
    textCell(17, row, "可用"),
    textCell(18, row, "脱敏展示"),
    textCell(19, row, "常规"),
    textCell(20, row, "非链接案例说明"),
    numberCell(21, row, cost, formula),
    textCell(22, row, `测试（内部）Ａ-${row}`),
  ]);
}

function rowXml(row: number, cells: string[]): string {
  return `<x:row r="${row}">${cells.join("")}</x:row>`;
}

function textCell(column: number, row: number, value: string): string {
  return `<x:c r="${columnName(column)}${row}" t="str"><x:v>${escapeXml(value)}</x:v></x:c>`;
}

function numberCell(
  column: number,
  row: number,
  value: number,
  formula: boolean,
): string {
  return `<x:c r="${columnName(column)}${row}" t="n">${formula ? "<x:f>1+1</x:f>" : ""}<x:v>${value}</x:v></x:c>`;
}

function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
