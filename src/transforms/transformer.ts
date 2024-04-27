import path from "path";
import * as ts from "typescript";
import { RojoResolver } from "@roblox-ts/rojo-resolver";
import fs from "fs";
import assert from "assert";

interface CommandLine {
  tsconfigPath: string;
  project: string;
}


function findAncestorDir(dirs: Array<string>) {
	dirs = dirs.map(path.normalize).map((v) => (v.endsWith(path.sep) ? v : v + path.sep));
	let currentDir = dirs[0];
	while (!dirs.every((v) => v.startsWith(currentDir))) {
		currentDir = path.join(currentDir, "..");
	}
	return currentDir;
}

function getRootDirs(compilerOptions: ts.CompilerOptions) {
	const rootDirs = compilerOptions.rootDir ? [compilerOptions.rootDir] : compilerOptions.rootDirs;
	if (!rootDirs) assert(false, "rootDir or rootDirs must be specified");

	return rootDirs;
}

export function createPathTranslator(program: ts.Program) {
	const compilerOptions = program.getCompilerOptions();
	const rootDir = findAncestorDir([program.getCurrentDirectory(), ...getRootDirs(compilerOptions)]);
	const outDir = compilerOptions.outDir!;
}

function findTsConfigPath(projectPath: string) {
  let tsConfigPath: string | undefined = path.resolve(projectPath);
  if (!fs.existsSync(tsConfigPath) || !fs.statSync(tsConfigPath).isFile()) {
    tsConfigPath = ts.findConfigFile(tsConfigPath, ts.sys.fileExists);
    if (tsConfigPath === undefined) {
      throw new Error("Unable to find tsconfig.json!");
    }
  }
  return path.resolve(process.cwd(), tsConfigPath);
}

function parseCommandLine(): CommandLine {
  const options = {} as CommandLine;

  const projectIndex = process.argv.findIndex(
    (x) => x === "-p" || x === "--project"
  );
  if (projectIndex !== -1) {
    options.tsconfigPath = findTsConfigPath(process.argv[projectIndex + 1]);
  } else {
    options.tsconfigPath = findTsConfigPath(".");
  }

  options.project = path.dirname(options.tsconfigPath);
  return options;
}

function setupRojo() {
  const rojoArgvIndex = process.argv.findIndex((v) => v === "--rojo");
  const rojoArg =
    rojoArgvIndex !== -1 ? process.argv[rojoArgvIndex + 1] : undefined;
  let rojoConfig: string | undefined;
  if (rojoArg && rojoArg !== "") {
    rojoConfig = path.resolve(rojoArg);
  } else {
    rojoConfig = RojoResolver.findRojoConfigFilePath(commandLine.project).path;
  }
  assert(rojoConfig, "Unable to find Rojo configuration file.");
  return RojoResolver.fromPath(rojoConfig);
}


function visitCallExpression(node: ts.CallExpression) {
  const expression = node.expression;
  if (
    ts.isPropertyAccessExpression(expression) &&
    expression.expression.getText() === "Yeagar" &&
    expression.name.getText() === "addPath"
  ) {

  }
};


const commandLine = parseCommandLine();
const rojoResolver = setupRojo();