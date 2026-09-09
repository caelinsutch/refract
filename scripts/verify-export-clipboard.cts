import { app } from "electron";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
app.whenReady().then(async () => {
  try {
    const directory = path.resolve("work/export-clipboard");
    await fs.mkdir(directory, { recursive: true });
    const { copyExportFile } = await import(
      pathToFileURL(path.resolve("dist-electron/desktop/export-clipboard.cjs"))
        .href
    );
    const file = path.join(directory, "Test video ü #1.mp4");
    await fs.writeFile(file, "fixture");
    let payload = "";
    await copyExportFile(file, {
      write: async (items: Electron.ClipboardItem[]) => {
        assert.equal(items.length, 1);
        const type =
          'electron application/osclipboard;format="public.file-url"';
        assert.deepEqual(items[0].types, [type]);
        const blob = await items[0].getType(type);
        payload = await (blob as Blob).text();
      },
    });
    assert.equal(payload, pathToFileURL(file).href);
    await assert.rejects(
      copyExportFile(file, {
        write: async () => {
          throw Error("Clipboard unavailable");
        },
      }),
      /Clipboard unavailable/,
    );
    const swift = path.join(directory, "verify.swift");
    await fs.writeFile(
      swift,
      `import AppKit
let board = NSPasteboard(name: NSPasteboard.Name("refract-test-" + UUID().uuidString))
defer { board.releaseGlobally() }
let payload = CommandLine.arguments[1]
board.clearContents()
guard board.setData(Data(payload.utf8), forType: .fileURL),
      let urls = board.readObjects(forClasses: [NSURL.self], options: nil) as? [URL],
      urls.count == 1, urls[0].absoluteString == payload else { fatalError("File URL not readable by AppKit") }
print("AppKit file URL verified")
`,
    );
    const result = execFileSync("swift", [swift, payload], {
      encoding: "utf8",
    });
    assert.match(result, /AppKit file URL verified/);
    console.log(
      JSON.stringify({
        fileURL: true,
        unicodeAndSpaces: true,
        rejectedWrite: true,
        appKitNamedPasteboard: true,
        generalClipboardUntouched: true,
      }),
    );
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
