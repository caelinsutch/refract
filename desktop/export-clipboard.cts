import { clipboard, ClipboardItem } from "electron";
import { pathToFileURL } from "node:url";

/** Publish a completed local video as a macOS file, ready to paste into apps. */
export async function copyExportFile(
  file: string,
  target: Pick<Electron.Clipboard, "write"> = clipboard,
) {
  await target.write([
    new ClipboardItem({
      'electron application/osclipboard;format="public.file-url"': new Blob([
        pathToFileURL(file).href,
      ]),
    }),
  ]);
}
