/** Extract `cva(base, { variants, defaultVariants })` models from a TSX source. */
import ts from 'typescript';
import type { VariantModel, VariantGroup } from '../ir.js';
import { parseSource, stringValue, getProp, propName, readStringRecord } from './ast.js';

export function extractCvaModels(source: string): VariantModel[] {
  const sf = parseSource(source);
  const models: VariantModel[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      isCvaCall(node.initializer) &&
      ts.isIdentifier(node.name)
    ) {
      models.push(buildModel(node.name.text, node.initializer));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return models;
}

function isCvaCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'cva'
  );
}

function buildModel(name: string, call: ts.CallExpression): VariantModel {
  const [baseArg, configArg] = call.arguments;
  const base = baseArg ? stringValue(baseArg) ?? '' : '';
  const groups: VariantGroup[] = [];

  if (configArg && ts.isObjectLiteralExpression(configArg)) {
    const variants = getProp(configArg, 'variants');
    const defaultsExpr = getProp(configArg, 'defaultVariants');
    const defaults =
      defaultsExpr && ts.isObjectLiteralExpression(defaultsExpr)
        ? readStringRecord(defaultsExpr)
        : {};

    if (variants && ts.isObjectLiteralExpression(variants)) {
      for (const prop of variants.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isObjectLiteralExpression(prop.initializer)) {
          continue;
        }
        const groupName = propName(prop);
        if (!groupName) continue;
        groups.push({
          name: groupName,
          options: readStringRecord(prop.initializer),
          default: defaults[groupName],
        });
      }
    }
  }

  return { name, base, groups };
}
