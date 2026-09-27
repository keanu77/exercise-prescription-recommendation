import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, readdir, rm, symlink, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

async function createFixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), "exercise-rx-build-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const subdir of ["scripts", "src", "dist", "temp", "assets", "assets/fonts"]) {
    await mkdir(path.join(dir, subdir));
  }
  await copyFile(path.join(ROOT, "scripts/build-pages.sh"), path.join(dir, "scripts/build-pages.sh"));
  await copyFile(path.join(ROOT, "tailwind.config.js"), path.join(dir, "tailwind.config.js"));
  await symlink(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "dir");
  await writeFile(path.join(dir, "package.json"), '{"type":"module"}\n');
  await writeFile(path.join(dir, "src/input.css"), "@tailwind utilities;\n");
  await writeFile(path.join(dir, "index.html"), '<div class="text-blue-700">Fixture</div>\n');
  await writeFile(path.join(dir, "parq-form.html"), '<div class="text-green-700">PAR-Q fixture</div>\n');
  for (const file of ["script.js", "prescription-rules.js", "ai-ui.js", "multi-step-form.js", "parq-script.js", "pdf-loader.js", "pdf-report.js"]) {
    await writeFile(path.join(dir, file), "// Fixture script\n");
  }
  for (const file of ["favicon.ico", "favicon.svg", "apple-touch-icon.png", "og-image.png", "_headers", "assets/sports-paper-720.webp", "assets/sports-paper-1440.webp", "assets/fonts/ExerciseReportSans-Regular.ttf", "assets/fonts/OFL.txt"]) {
    await writeFile(path.join(dir, file), "fixture\n");
  }
  const compiled = spawnSync(path.join(dir, "node_modules/.bin/tailwindcss"), [
    "--config", "./tailwind.config.js", "--input", "./src/input.css", "--output", "./tailwind.css", "--minify",
  ], { cwd: dir, encoding: "utf8" });
  assert.equal(compiled.status, 0, compiled.stderr);
  return dir;
}

function build(dir) {
  return spawnSync("bash", [path.join(dir, "scripts/build-pages.sh")], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, TMPDIR: path.join(dir, "temp") },
  });
}

test("build:pages accepts identical CSS despite newer checkout timestamps", async (t) => {
  const dir = await createFixture(t);
  for (const file of ["src/input.css", "tailwind.config.js", "index.html", "script.js"]) {
    await utimes(path.join(dir, file), new Date("2030-01-01"), new Date("2030-01-01"));
  }
  await utimes(path.join(dir, "tailwind.css"), new Date("2000-01-01"), new Date("2000-01-01"));
  const result = build(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(path.join(dir, "dist/tailwind.css"), "utf8"), await readFile(path.join(dir, "tailwind.css"), "utf8"));
  assert.deepEqual(await readdir(path.join(dir, "temp")), []);
});

test("build:pages rejects new HTML/JS classes and preserves existing dist", async (t) => {
  const dir = await createFixture(t);
  const marker = path.join(dir, "dist/existing-output.txt");
  await writeFile(marker, "keep existing output\n");

  for (const [file, addition] of [
    ["index.html", '<div class="h-[543px]">New utility</div>\n'],
    ["script.js", 'const template = \'<div class="w-[543px]"></div>\';\n'],
  ]) {
    const source = path.join(dir, file);
    const original = await readFile(source, "utf8");
    await writeFile(source, original + addition);
    // Class changes must be detected even when timestamps appear older than CSS.
    await utimes(source, new Date("2000-01-01"), new Date("2000-01-01"));
    const result = build(dir);
    assert.notEqual(result.status, 0, `${file}: stale CSS was accepted`);
    assert.match(result.stderr, /npm run build:css/, `${file}: missing actionable failure`);
    assert.equal(await readFile(marker, "utf8"), "keep existing output\n");
    assert.deepEqual(await readdir(path.join(dir, "dist")), ["existing-output.txt"]);
    assert.deepEqual(await readdir(path.join(dir, "temp")), []);
    await writeFile(source, original);
  }
});
