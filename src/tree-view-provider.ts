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
  
  constructor(private workspaceRoot: string) {}

  getTreeItem(element: ExplanationNode): vscode.TreeItem {
    element.command = { 
      command: 'node.select', 
      title: 'Show Explanation', 
      arguments: [element]
    };
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
      let explanation_node = new ExplanationNode(
        'explanation ->',
        vscode.TreeItemCollapsibleState.None,
        [],
      );

      let needs_nodes : ExplanationNode[] = [];

      value.needs.forEach((dep: string) => {
        needs_nodes.push(new ExplanationNode(
          dep,
          vscode.TreeItemCollapsibleState.None,
          [],
        ));
      });

      let needs_node = new ExplanationNode(
        'needs ->',
        needs_nodes.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        needs_nodes,
      );

      let node: ExplanationNodeEntry = new ExplanationNodeEntry(
        key,
        vscode.TreeItemCollapsibleState.Collapsed,
        [needs_node, explanation_node],
        [],
        '',
        false
      );
      node
      this.tree.push(node);
    }
    // second loop -> linking needed components
    for (let node of this.tree) { 
      console.log('Updating needs of node:', node.label);
      let needs_node = node.children.find((element) => element.label === 'needs ->');
      if(!needs_node) {
        console.log('Could not find needs node for:', node.label);
        continue;
      }
      for (let need of needs_node.children) {
        console.log('Checking need:', need.label);
        let needed_node = this.tree.find((element) => element.label === need.label);
        if(needed_node) {
          console.log('Found needed node:', needed_node.label);
            const index = needs_node.children.indexOf(need);
            if (index !== -1) {
            needs_node.children[index] = needed_node;
            }
        }
      }
    }
  }
}

class ExplanationNode extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children: ExplanationNode[] = [],
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
    //this.description = this.explanation;
  }

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'ExplanationNode.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'ExplanationNode.svg')
  };
}

class ExplanationNodeEntry extends ExplanationNode {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children: ExplanationNode[] = [],
    public needed: Array<string> = [],
    public explanation: string,
    public explained: boolean = false
  ) {
    super(label, collapsibleState);
  }
}

