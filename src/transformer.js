"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformContext = exports.createPathTranslator = void 0;
var path_1 = __importDefault(require("path"));
var ts = __importStar(require("typescript"));
var rojo_resolver_1 = require("@roblox-ts/rojo-resolver");
var fs_1 = __importDefault(require("fs"));
var assert_1 = __importDefault(require("assert"));
function findAncestorDir(dirs) {
    dirs = dirs
        .map(path_1.default.normalize)
        .map(function (v) { return (v.endsWith(path_1.default.sep) ? v : v + path_1.default.sep); });
    var currentDir = dirs[0];
    while (!dirs.every(function (v) { return v.startsWith(currentDir); })) {
        currentDir = path_1.default.join(currentDir, "..");
    }
    return currentDir;
}
function getRootDirs(compilerOptions) {
    var rootDirs = compilerOptions.rootDir
        ? [compilerOptions.rootDir]
        : compilerOptions.rootDirs;
    if (!rootDirs)
        (0, assert_1.default)(false, "rootDir or rootDirs must be specified");
    return rootDirs;
}
function createPathTranslator(program) {
    var compilerOptions = program.getCompilerOptions();
    var rootDir = findAncestorDir(__spreadArray([
        program.getCurrentDirectory()
    ], getRootDirs(compilerOptions), true));
    var outDir = compilerOptions.outDir;
}
exports.createPathTranslator = createPathTranslator;
function findTsConfigPath(projectPath) {
    var tsConfigPath = path_1.default.resolve(projectPath);
    if (!fs_1.default.existsSync(tsConfigPath) || !fs_1.default.statSync(tsConfigPath).isFile()) {
        tsConfigPath = ts.findConfigFile(tsConfigPath, ts.sys.fileExists);
        if (tsConfigPath === undefined) {
            throw new Error("Unable to find tsconfig.json!");
        }
    }
    return path_1.default.resolve(process.cwd(), tsConfigPath);
}
function parseCommandLine() {
    var options = {};
    var projectIndex = process.argv.findIndex(function (x) { return x === "-p" || x === "--project"; });
    if (projectIndex !== -1) {
        options.tsconfigPath = findTsConfigPath(process.argv[projectIndex + 1]);
    }
    else {
        options.tsconfigPath = findTsConfigPath(".");
    }
    options.project = path_1.default.dirname(options.tsconfigPath);
    return options;
}
function setupRojo() {
    var rojoArgvIndex = process.argv.findIndex(function (v) { return v === "--rojo"; });
    var rojoArg = rojoArgvIndex !== -1 ? process.argv[rojoArgvIndex + 1] : undefined;
    var rojoConfig;
    if (rojoArg && rojoArg !== "") {
        rojoConfig = path_1.default.resolve(rojoArg);
    }
    else {
        rojoConfig = rojo_resolver_1.RojoResolver.findRojoConfigFilePath(commandLine.project).path;
    }
    (0, assert_1.default)(rojoConfig, "Unable to find Rojo configuration file.");
    return rojo_resolver_1.RojoResolver.fromPath(rojoConfig);
}
function visitCallExpression(context, node) {
    var expression = node.expression;
    if (ts.isPropertyAccessExpression(expression) &&
        expression.expression.getText() === "Yeagar" &&
        expression.name.getText() === "addPath") {
        var path_2 = rojoResolver.getRbxPathFromFilePath(node.arguments[0].getText());
        var updatedExpression = ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier("Yeagar"), ts.factory.createIdentifier("_addPath"));
        if (!path_2)
            throw new Error("Unable to find path for file.");
        var expressions = path_2 === null || path_2 === void 0 ? void 0 : path_2.map(function (v) { return ts.factory.createStringLiteral(v); });
        var updateArgument = ts.factory.createArrayLiteralExpression(expressions, false);
        return ts.factory.createCallExpression(updatedExpression, undefined, [
            updateArgument,
        ]);
    }
    return context.transform(node);
}
/**
 * This is a utility object to pass around your dependencies.
 *
 * You can also use this object to store state, e.g prereqs.
 */
var TransformContext = /** @class */ (function () {
    function TransformContext(program, context, config) {
        this.program = program;
        this.context = context;
        this.config = config;
        this.factory = context.factory;
    }
    /**
     * Transforms the children of the specified node.
     */
    TransformContext.prototype.transform = function (node) {
        var _this = this;
        return ts.visitEachChild(node, function (node) { return visitNode(_this, node); }, this.context);
    };
    return TransformContext;
}());
exports.TransformContext = TransformContext;
function visitExpression(context, node) {
    // This can be used to transform expressions
    // For example, a call expression for macros.
    return context.transform(node);
}
function visitNode(context, node) {
    if (ts.isCallExpression(node)) {
        return visitCallExpression(context, node);
    }
    else if (ts.isExpression(node)) {
        return visitExpression(context, node);
    }
    // We encountered a node that we don't handle above,
    // but we should keep iterating the AST in case we find something we want to transform.
    return context.transform(node);
}
var commandLine = parseCommandLine();
var rojoResolver = setupRojo();
