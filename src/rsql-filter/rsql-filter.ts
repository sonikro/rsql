import { deepFindProperty } from '../helpers/deep-find-property';
import {
  RsqlAstBasicExpressionNode,
  RsqlAstBasicListExpressionNode,
  RsqlAstCompositeExpressionNode,
  RsqlAstNode,
  RsqlAstRootNode,
} from '../rsql-parser/entities/rsql-ast-node';
import { RsqlAstNodeType } from '../rsql-parser/entities/rsql-ast-node-type';
import { RsqlParser } from '../rsql-parser/rsql-parser';
import { RsqlTokenType } from '../rsql-tokenizer/entities/rsql-token-type';
import { RsqlTokenizer } from '../rsql-tokenizer/rsql-tokenizer';
import { Token } from '../tokenizer/entities/token';

export class RsqlFilter {
  private static instance: RsqlFilter;

  static getInstance(): RsqlFilter {
    if (!this.instance) {
      this.instance = new this();
    }

    return this.instance;
  }

  private tokenizer: RsqlTokenizer;

  private parser: RsqlParser;

  private constructor() {
    this.tokenizer = RsqlTokenizer.getInstance();
    this.parser = RsqlParser.getInstance();
  }

  filter<T>(rsql: string, list: T[]): T[] {
    const tokens: Token<RsqlTokenType>[] = this.tokenizer.tokenize(rsql);
    const ast: RsqlAstRootNode = this.parser.parse(tokens);
    return list.filter((item: T) => this.traverse<T>(ast, item));
  }

  private traverse<T>(node: RsqlAstNode, listItem: T): boolean {
    switch (node.type) {
      case RsqlAstNodeType.Root:
        return this.traverse<T>(node.value, listItem);
      case RsqlAstNodeType.CompositeExpression:
        return this.evalCompositeExpression(
          node.operator,
          node.value.map(
            (
              item:
                | RsqlAstCompositeExpressionNode
                | RsqlAstBasicExpressionNode
                | RsqlAstBasicListExpressionNode,
            ) => this.traverse<T>(item, listItem),
          ),
        );
      case RsqlAstNodeType.BasicExpression:
        return this.evalBasicExpression(node, listItem);
      default:
        throw new TypeError(node);
    }
  }

  private evalCompositeExpression(
    operator: RsqlTokenType.CompositeAndOperator | RsqlTokenType.CompositeOrOperator,
    value: boolean[],
  ): boolean {
    switch (operator) {
      case RsqlTokenType.CompositeAndOperator:
        return value.every(Boolean);
      case RsqlTokenType.CompositeOrOperator:
        return value.some(Boolean);
      default:
        throw new TypeError(operator);
    }
  }

  private evalBasicExpression(
    node: RsqlAstBasicExpressionNode | RsqlAstBasicListExpressionNode,
    listItem: any,
  ): boolean {
    const data = deepFindProperty<any>(listItem, node.field);
    const stringData = `${data}`;
    const numberData = Number(data);
    const numberValue = Number(node.value);

    switch (node.operator) {
      case RsqlTokenType.BasicEqualOperator:
        return node.value === stringData;
      case RsqlTokenType.BasicNotEqualOperator:
        return node.value !== stringData;
      case RsqlTokenType.BasicGreaterOperator:
        return Number.isNaN(numberData) || Number.isNaN(numberValue)
          ? false
          : numberData > numberValue;
      case RsqlTokenType.BasicGreaterOrEqualOperator:
        return Number.isNaN(numberData) || Number.isNaN(numberValue)
          ? false
          : numberData >= numberValue;
      case RsqlTokenType.BasicLessOperator:
        return Number.isNaN(numberData) || Number.isNaN(numberValue)
          ? false
          : numberData < numberValue;
      case RsqlTokenType.BasicLessOrEqualOperator:
        return Number.isNaN(numberData) || Number.isNaN(numberValue)
          ? false
          : numberData <= numberValue;
      case RsqlTokenType.BasicInOperator:
        return node.value.includes(stringData);
      case RsqlTokenType.BasicNotInOperator:
        return !node.value.includes(stringData);
      default:
        throw new TypeError(node);
    }
  }
}
