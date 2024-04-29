import path from "path";
import * as ts from "typescript";
import { RojoResolver } from "@roblox-ts/rojo-resolver";
import fs from "fs";
import assert from "assert";
import creator from "ts-creator";

interface CommandLine {
  tsconfigPath: string;
  project: string;
}

function findAncestorDir(dirs: Array<string>) {
  dirs = dirs
    .map(path.normalize)
    .map((v) => (v.endsWith(path.sep) ? v : v + path.sep));
  let currentDir = dirs[0];
  while (!dirs.every((v) => v.startsWith(currentDir))) {
    currentDir = path.join(currentDir, "..");
  }
  return currentDir;
}

function getRootDirs(compilerOptions: ts.CompilerOptions) {
  const rootDirs = compilerOptions.rootDir
    ? [compilerOptions.rootDir]
    : compilerOptions.rootDirs;
  if (!rootDirs) assert(false, "rootDir or rootDirs must be specified");

  return rootDirs;
}

export function createPathTranslator(program: ts.Program) {
  const compilerOptions = program.getCompilerOptions();
  const rootDir = findAncestorDir([
    program.getCurrentDirectory(),
    ...getRootDirs(compilerOptions),
  ]);
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

function visitCallExpression(
  context: TransformContext,
  node: ts.CallExpression
) {
  const expression = node.expression;
  if (
    ts.isPropertyAccessExpression(expression) &&
    context.yeagarName.includes(expression.expression.getText()) &&
    expression.name.getText() === "addPath"
  ) {
    const p = (node.arguments[0] as ts.StringLiteral).text;
    const expressionText = expression.expression.getText();
    // Replace src with out
    const updatedPath = p.replace("src", "out");
    const path = rojoResolver.getRbxPathFromFilePath(updatedPath);
    const updatedExpression = ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier("Yeagar"),
      ts.factory.createIdentifier("_addPath")
    );
    if (!path) throw new Error("Unable to find path for file.");
    const expressions = path?.map((v) => ts.factory.createStringLiteral(v));
    const updateArgument = ts.factory.createArrayLiteralExpression(
      expressions,
      false
    );
    return ts.factory.createCallExpression(updatedExpression, undefined, [
      updateArgument,
    ]);
  }

  return context.transform(node);
}

/**
 * This is the transformer's configuration, the values are passed from the tsconfig.
 */
export interface TransformerConfig {
  _: void;
}

/**
 * This is a utility object to pass around your dependencies.
 *
 * You can also use this object to store state, e.g prereqs.
 */
export class TransformContext {
  public factory: ts.NodeFactory;
  public yeagarName: string[] = [];

  constructor(
    public program: ts.Program,
    public context: ts.TransformationContext,
    public config: TransformerConfig
  ) {
    this.factory = context.factory;
  }

  /**
   * Transforms the children of the specified node.
   */
  transform<T extends ts.Node>(node: T): T {
    return ts.visitEachChild(
      node,
      (node) => visitNode(this, node),
      this.context
    );
  }
}

function visitImportDeclaration(
  context: TransformContext,
  node: ts.ImportDeclaration
) {
  const importIdentifier = node.importClause?.name;
  if (!importIdentifier) return context.transform(node);
  const importName = importIdentifier.text;
  const iP = (node.moduleSpecifier as ts.StringLiteral).text;
  if (iP !== importPath) return context.transform(node);
  context.yeagarName.push(importName);
  return context.transform(node);
}

function visitNode(
  context: TransformContext,
  node: ts.Node
): ts.Node | ts.Node[] {
  if (ts.isCallExpression(node)) {
    return visitCallExpression(context, node);
  } else if (ts.isImportDeclaration(node)) {
    return visitImportDeclaration(context, node);
  }

  // We encountered a node that we don't handle above,
  // but we should keep iterating the AST in case we find something we want to transform.
  return context.transform(node);
}

const importPath = "rbxts-transformer-yeagar"
const commandLine = parseCommandLine();
const rojoResolver = setupRojo();
