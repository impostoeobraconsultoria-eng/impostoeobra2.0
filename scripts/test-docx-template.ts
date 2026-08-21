import assert from "node:assert/strict";
import PizZip from "pizzip";

import {
  TEMPLATE_REQUIRED_FIELDS,
  validateDocxTemplate,
} from "../src/lib/docx-template-validation.ts";

function docx(fields: readonly string[]) {
  const zip = new PizZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip
    .folder("_rels")!
    .file(
      ".rels",
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    );
  const paragraphs = fields
    .map((field) => `<w:p><w:r><w:t>{{${field}}}</w:t></w:r></w:p>`)
    .join("");
  zip
    .folder("word")!
    .file(
      "document.xml",
      `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`,
    );
  return zip.generate({ type: "arraybuffer" });
}

for (const [key, fields] of Object.entries(TEMPLATE_REQUIRED_FIELDS)) {
  const valid = validateDocxTemplate(
    docx(fields),
    key as keyof typeof TEMPLATE_REQUIRED_FIELDS,
  );
  assert.deepEqual(valid, { ok: true, missing: [] });
  const missing = validateDocxTemplate(
    docx(fields.slice(1)),
    key as keyof typeof TEMPLATE_REQUIRED_FIELDS,
  );
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missing, [fields[0]]);
}
const invalid = validateDocxTemplate(new ArrayBuffer(12), "template_proposta");
assert.equal(invalid.invalid, true);
console.log("Templates DOCX: proposta e 2 contratos validados.");
