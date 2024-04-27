import * as ts from 'typescript';


function visitCallExpression(node: ts.CallExpression) {
    // 
    const expression = node.expression;
    if (ts.isPropertyAccessExpression(expression) && expression.expression.getText() === "Yeagar" && expression.name.getText() === "addPath") {
        
    }
}