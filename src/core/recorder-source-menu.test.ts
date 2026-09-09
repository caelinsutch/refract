import assert from "node:assert/strict";
import { test } from "node:test";
import { recorderSourceItems } from "../../desktop/recorder-source-menu.cts";
import type { CaptureSources } from "./recorder";
const sources: CaptureSources = {
  permission: "granted",
  cameras: [],
  microphones: [],
  displays: [
    { id: 1, name: "Built-in Retina Display", width: 3024, height: 1964 },
  ],
  windows: [
    {
      id: 2,
      name: "First document",
      app: "Notes",
      appPath: "/Applications/Notes.app",
      width: 800,
      height: 600,
    },
    {
      id: 3,
      name: "Second document",
      app: "Notes",
      appPath: "/Applications/Notes.app",
      width: 800,
      height: 600,
    },
    {
      id: 4,
      name: "Project",
      app: "Editor",
      appPath: "/Applications/Editor.app",
      width: 900,
      height: 700,
    },
    {
      id: 5,
      name: "Separate edition",
      app: "Notes",
      appPath: "/Applications/OtherNotes.app",
      width: 800,
      height: 600,
    },
  ],
};
test("window source menus group by app identity and retain checked targets", () => {
  let selected: number | undefined;
  const menu = recorderSourceItems(
    { kind: "window", selected: 3, x: 0, y: 0 },
    sources,
    (source) => (selected = source.id),
  );
  assert.deepEqual(
    menu.map((item) => item.label),
    ["Notes", "Editor", "Notes"],
  );
  const children = menu[0].submenu as Array<{
    label: string;
    checked: boolean;
    click: () => void;
  }>;
  assert.deepEqual(
    children.map((item) => [item.label, item.checked]),
    [
      ["First document", false],
      ["Second document", true],
    ],
  );
  assert.equal(selected, undefined);
  children[1].click();
  assert.equal(selected, 3);
  assert.equal(menu[1].label, "Editor");
});
test("display menus use real display names and permission denial reveals no window titles", () => {
  const menu = recorderSourceItems(
    { kind: "display", x: 0, y: 0 },
    sources,
    () => {},
  );
  assert.equal(menu[0].label, "Built-in Retina Display");
  const denied = recorderSourceItems(
    { kind: "window", x: 0, y: 0 },
    { ...sources, permission: "required" },
    () => {},
  );
  assert.equal(denied.length, 1);
  assert.equal(denied[0].enabled, false);
  const empty = recorderSourceItems(
    { kind: "window", x: 0, y: 0 },
    { ...sources, windows: [] },
    () => {},
  );
  assert.equal(empty[0].enabled, false);
});
