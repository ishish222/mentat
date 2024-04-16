import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ExplanationNodeProvider implements vscode.TreeDataProvider<ExplanationNode> {
  private tree: ExplanationNode[] = [];
  private _onDidChangeTreeData: vscode.EventEmitter<ExplanationNode | undefined | null | void> = new vscode.EventEmitter<ExplanationNode | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ExplanationNode | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  constructor(
    private context: vscode.ExtensionContext, 
    private workspaceRoot: string
  ) {}

  getTreeItem(element: ExplanationNode): vscode.TreeItem {
    element.command = { 
      command: 'node.select', 
      title: 'Show Explanation', 
      arguments: [element]
    };
    if(element.explained) {
      element.iconPath = {
        light: this.context.asAbsolutePath(path.join('resources', 'light', 'explained-icon.svg')),
        dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'explained-icon.svg'))
      };
    }
    else {
      element.iconPath = {
        light: this.context.asAbsolutePath(path.join('resources', 'light', 'unexplained-icon.svg')),
        dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'unexplained-icon.svg'))
      };
    }
    return element;
  }

  getChildren(element?: ExplanationNode): Thenable<ExplanationNode[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No ExplanationNode in empty workspace');
      return Promise.resolve([]);
    }

    if (element) {
      let children = element.children;

      if (children.length > 0) {
        return Promise.resolve(children);
      }
    } else {
      return Promise.resolve(this.tree);
    }
  }

  clearExplanationNodes() {
    this.tree = [];
  }

  loadExplanationNodes(components: any): void {
    // first loop -> listing all components
    for (const [key, value] of Object.entries(components.components)) {      
      let node: ExplanationNode = new ExplanationNode(
        key,
        vscode.TreeItemCollapsibleState.Collapsed,
        [],
        [],
        '',
        false
      );

      value.needs.forEach((dep: string) => {
        node.children.push(new ExplanationNode(
          dep,
          vscode.TreeItemCollapsibleState.None,
          [],
          [],
          '',
          false
        ));
      });

      this.tree.push(node);
    }
    // second loop -> linking needed components

    for (let node of this.tree) { 
      //console.log('Updating needs of node:', node.label);
      for (let need of node.children) {
        //console.log('Checking need:', need.label);
        let needed_node = this.tree.find((element) => element.label === need.label);
        if(needed_node) {
          //console.log('Found needed node:', needed_node.label);
            const index = node.children.indexOf(need);
            if (index !== -1) {
            node.children[index] = needed_node;
            }
        }
      }
    }

    // third loop -> collapsible or not
    for (let node of this.tree) { 
      //console.log('Updating collapsible state of node:', node.label);
      if (node.children.length > 0) {
        node.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      } else {
        node.collapsibleState = vscode.TreeItemCollapsibleState.None;
      }
      //console.log('Updating icon of node:', node.label);
      node.iconPath = {
        light: this.context.asAbsolutePath(path.join('resources', 'light', 'unexplained-icon.svg')),
        dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'unexplained-icon.svg'))
      };
      //console.log('Updated icon:', this.context.asAbsolutePath(path.join('resources', 'dark', 'ExplanationNode.svg')));
    }
  }
}


export class ExplanationNode extends vscode.TreeItem {
  constructor(
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public children: ExplanationNode[] = [],
    public needed: Array<string> = [],
    public explanation: string,
    public explained: boolean = false
  ) {
    super(label, collapsibleState);
    this.contextValue = 'explanationNode';
  }
}

